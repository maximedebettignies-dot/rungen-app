# Bloc 1 — Fondations : plan d'implémentation

**Objectif :** une app iOS/Android avec deux espaces (public et RUNGEN), connexion Google/Apple, onboarding, sports favoris, onglet admin, support et suppression de compte.

**Architecture :** app Expo (Expo Router, TypeScript) qui parle directement à Supabase. Toutes les règles sensibles (âge, espaces, rôles, codes, visibilité, modération, support) sont appliquées par la base via triggers, fonctions et RLS ; l'app ne fait que refléter ces règles.

**Stack :** Expo SDK (dernière version stable), Expo Router, `@supabase/supabase-js`, `expo-secure-store`, `@react-native-google-signin/google-signin`, `expo-apple-authentication`, `expo-print` (PDF des autorisations), EAS Build, Supabase (région UE).

Spec de référence : `docs/specs/2026-09-10-bloc1-fondations-design.md`

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/age.ts` (+ `.test.ts`) | Règles d'âge par espace, miroir des fonctions SQL |
| `supabase/migrations/20260910000000_bloc1_fondations.sql` | Profils, sports, favoris, mots interdits, suppression de compte |
| `supabase/migrations/20260910000100_bloc1_espaces_roles_support.sql` | Espaces, rôles, établissements, codes, adhésions, support, actions admin |
| `supabase/tests/00_supabase_mock.sql` | Simulation minimale de Supabase (auth.uid, auth.jwt, rôles) |
| `supabase/tests/01_helpers.sql` | Utilitaires de test (se connecter en tant que, attendre une erreur) |
| `supabase/tests/bloc1_test.sql` | Tests profils, sports, favoris |
| `supabase/tests/bloc1_espaces_test.sql` | Tests espaces, rôles, codes, support, actions admin |
| `supabase/migrations/20260916000000_bloc1_stockage.sql` | Buckets privés `avatars` et `support` (tâches 9 et 10) |
| `supabase/migrations/20260916000100_bloc1_admin_comptes.sql` | `find_account_by_code` : retrouver un compte depuis le papier (tâche 11) |
| `supabase/tests/bloc1_stockage_test.sql` | Tests d'accès aux fichiers |
| `supabase/tests/bloc1_admin_comptes_test.sql` | Tests de la recherche de compte et des actions admin |
| `supabase/tests/run.sh` | Lance chaque fichier de test sur une base neuve |
| `src/lib/supabase.ts` | Client Supabase avec session chiffrée (tâche 4) |
| `src/lib/database.ts` | Types de la base, miroir des migrations |
| `src/lib/auth.ts` | Connexion Google/Apple → Supabase (tâche 5) |
| `src/lib/session.tsx` | Session, profil et rôle courants |
| `src/lib/onboarding.tsx` | Ce qui est saisi avant que le profil n'existe |
| `src/lib/errors.ts` (+ `.test.ts`) | Traduction des codes d'erreur SQL en messages français (tâche 7) |
| `src/lib/date.ts` (+ `.test.ts`) | Saisie et formatage de dates |
| `src/lib/sports.ts` (+ `.test.ts`) | Recherche et suggestion de sports (tâche 7) |
| `src/lib/support.ts` (+ `.test.ts`) | Libellés et ancienneté des conversations (tâche 10) |
| `src/lib/autorisation.ts` (+ `.test.ts`) | HTML du PDF des autorisations parentales (tâche 11) |
| `src/ui/*` | Socle d'interface, choix des sports, photo, double authentification |
| `src/app/_layout.tsx` | Aiguillage connexion / onboarding / app (tâche 6) |
| `src/app/bienvenue.tsx` | Connexion publique / « J'ai un code RUNGEN » (tâche 6) |
| `src/app/onboarding/*.tsx` | Code, naissance, info données, connexion, pseudo, sports (tâche 7) |
| `src/app/(app)/reglages.tsx` | Photo, visibilité + suppression de compte (tâches 8 et 9) |
| `src/app/(app)/support/*.tsx` | Conversations utilisateur (tâche 10) |
| `src/app/(app)/admin/*.tsx` | Onglet admin (tâche 11) |

---

### Tâche 1 : logique d'âge ✅ fait

- [x] Tests écrits et vus en échec, puis implémentation (minimum 15 ans public, 11 ans RUNGEN)
- Commande : `node --experimental-strip-types --test src/lib/age.test.ts`

### Tâche 2 : schéma Supabase et sécurité ✅ fait

- [x] Migration profils/sports/favoris + tests
- [x] Migration espaces/rôles/codes/support + tests
- [x] Tests de mutation : chaque règle critique cassée volontairement est détectée
- Commande : `PGHOST=... PGPORT=... PGUSER=... bash supabase/tests/run.sh`

### Tâche 3 : créer le projet Expo et y intégrer les fichiers existants ✅ fait

- [x] Projet Expo SDK 57 créé **à la racine du dépôt** plutôt que dans un sous-dossier `rungen/` : le template place déjà le code dans `src/app`, donc `src/lib/`, `docs/` et `supabase/` sont restés en place
- [x] `app.json` : `"name": "RUNGEN"`, `"slug": "rungen"`, `"scheme": "rungen"`, `ios.bundleIdentifier` et `android.package` = `fr.rungen.app`, `ios.usesAppleSignIn: true`
- [x] Dépendances installées (`@supabase/supabase-js`, `expo-secure-store`, `@react-native-google-signin/google-signin`, `expo-apple-authentication`, `expo-dev-client`, `expo-print`, `expo-sharing`, `expo-image-picker`)
- [x] `app.json` > `plugins` : `expo-secure-store`, `expo-apple-authentication` et `@react-native-google-signin/google-signin`
- [x] Vérifié : `npx expo export --platform android` bundle sans erreur
- [ ] Renseigner `iosUrlScheme` dans `app.json` avec le schéma inversé de l'ID client iOS (obtenu à la tâche 5)

### Tâche 4 : projet Supabase et client

- [x] Projet Supabase créé (`rungen`, West EU / Irlande — conforme à l'exigence région UE)
- [x] CLI Supabase ajouté au dépôt + `supabase/config.toml` (TOTP activé, providers Google et Apple déclarés, secrets par variables d'environnement)
- [x] Préflight `npm run db:preflight` : rejoue les migrations dans les conditions d'un vrai projet (rôle non superutilisateur, `storage.objects` à `supabase_storage_admin`, `auth.users` à `supabase_auth_admin`). Les 4 migrations passent
- [ ] `npm run db:link` puis `npm run db:push` pour appliquer les 4 migrations
- [ ] **Vérifier que la MFA (TOTP) est disponible sur le plan Free** : le modèle de `config.toml` la annonce comme réservée au plan Pro. Sans elle, `aal2` est inatteignable et l'onglet admin reste verrouillé — c'est bloquant pour la tâche 11
- [ ] Authentication > Multi-Factor : activer TOTP
- [ ] SQL Editor : créer ton compte admin après ta première connexion dans l'app —
  `insert into public.staff_roles (user_id, role) values ('<ton id utilisateur>', 'admin');`
- [ ] Créer `.env` à partir de `.env.example` (`.env` est déjà dans `.gitignore`)
- [ ] `npm run types:gen` pour remplacer les types écrits à la main
- [x] `src/lib/supabase.ts` : client avec stockage de session via `expo-secure-store`, `autoRefreshToken: true`, `detectSessionInUrl: false`. La session est découpée en tranches de 1800 octets, SecureStore plafonnant chaque valeur à 2 Ko
- [x] `src/lib/database.ts` : types de la base écrits à la main, à régénérer avec `npx supabase gen types typescript` une fois le projet créé

### Tâche 5 : connexion Google et Apple

- [ ] Google Cloud : projet + 3 identifiants OAuth (Web, Android avec l'empreinte SHA-1 du build EAS, iOS)
- [ ] Supabase > Authentication > Providers : activer Google (ID client Web + secret) et Apple (identifiant `fr.rungen.app`)
- [x] `src/lib/auth.ts` : `signInWithGoogle()` et `signInWithApple()` → jeton natif → `supabase.auth.signInWithIdToken`
- [x] Erreurs : annulation silencieuse, échec réseau, erreur inconnue
- [ ] Build de développement Android : `npx eas build --profile development --platform android`
- [ ] Vérifier sur Android puis sur iPhone (dès que le compte développeur RUNGEN est actif)
- [ ] Tester avec un **compte Google supervisé (Family Link)** avant la première intervention
- [ ] Commit : `feat: connexion Google et Apple`

### Tâche 6 : aiguillage ✅ fait

- [x] `bienvenue.tsx` : connexion directe pour l'espace public, bouton « J'ai un code RUNGEN » pour l'autre parcours
- [x] `_layout.tsx` : pas de session → `bienvenue` ; session sans profil → onboarding du parcours choisi ; profil complet → `(app)` ; onglet admin affiché si un rôle d'encadrement existe
- [ ] Vérifier sur appareil : déconnexion → bienvenue ; relance de l'app → session conservée

### Tâche 7 : onboarding (deux parcours) ✅ fait

- [x] `src/lib/errors.ts` : toutes les exceptions levées par les migrations → messages français, avec tests
- [x] Public : connexion → `naissance` (`canRegister(date, 'public')`) → `pseudo` (insert `profiles`) → `sports`
- [x] RUNGEN : `code` (`rpc('check_invite_code')`, message par statut) → `naissance` (`canRegister(date, 'rungen')`) → `info-donnees` (texte adapté aux 11–14 ans, case « J'ai compris ») → `connexion` → `pseudo` (`rpc('create_rungen_profile', …)`) → `sports`
- [x] `sports.tsx` : catalogue groupé par famille, recherche avec suggestion avant « Créer "xxx" », choix de la famille pour un sport perso
- [ ] Vérifier sur appareil : parcours public adulte, refus < 15 ans ; parcours RUNGEN avec code actif, code en attente, code déjà utilisé, refus < 11 ans

### Tâche 8 : réglages et suppression de compte ✅ fait

- [x] Choix de la visibilité (désactivé avec explication si `isMinor()`)
- [x] « Supprimer mon compte » avec double confirmation → suppression de la photo → `rpc('delete_my_account')` → déconnexion

### Tâche 9 : photo de profil ✅ fait

- [x] Migration `20260916000000_bloc1_stockage.sql` : buckets privés `avatars` et `support`, chemins `{user_id}/…`, lecture des avatars alignée sur `public_profiles`, écriture limitée au propriétaire
- [x] Tests `supabase/tests/bloc1_stockage_test.sql`, dont la règle critique « le public ne voit jamais la photo d'un membre RUNGEN »
- [x] `src/ui/photo-profil.tsx` : choix, envoi et retrait, affichage par URL signée

### Tâche 10 : support côté utilisateur ✅ fait

- [x] Liste de mes conversations (statut, dernière activité) + « Nouvelle conversation » (catégorie, sujet, premier message)
- [x] Fil de messages avec envoi ; capture d'écran optionnelle (bucket privé `support`, créé à la tâche 9)
- [x] Vérifié en base : un utilisateur ne voit que ses conversations ; aucun bouton de modification ou suppression dans l'app

### Tâche 11 : onglet admin ✅ fait

- [x] Enrôlement de la double authentification (TOTP) au premier accès, puis vérification à chaque session (`aal2`)
- [x] Établissements : liste + création
- [x] Codes : générer un lot (établissement, classe, nombre) → PDF d'autorisations avec un code par page (`expo-print`) ; liste filtrable par statut ; boutons « Autorisation reçue » et « Désactiver »
- [x] Profs : générer un code `prof_eps` pour un établissement
- [x] Comptes : recherche **par code d'autorisation** puis désactiver / réactiver / supprimer. Les profils ne sont pas parcourables (la RLS limite `profiles` à son propre profil) : nouvelle fonction `find_account_by_code`, migration `20260916000100_bloc1_admin_comptes.sql` + tests
- [x] Support : boîte de réception triée par statut, réponse, changement de statut
- [ ] Vérifier sur appareil : enrôlement TOTP, impression du PDF
