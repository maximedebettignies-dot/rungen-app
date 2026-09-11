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
| `supabase/tests/run.sh` | Lance chaque fichier de test sur une base neuve |
| `src/lib/supabase.ts` | Client Supabase avec session chiffrée (tâche 4) |
| `src/lib/auth.ts` | Connexion Google/Apple → Supabase (tâche 5) |
| `src/lib/errors.ts` | Traduction des codes d'erreur SQL en messages français (tâche 7) |
| `src/app/_layout.tsx` | Aiguillage connexion / onboarding / app (tâche 6) |
| `src/app/bienvenue.tsx` | Choix « Je m'inscris » / « J'ai un code RUNGEN » (tâche 6) |
| `src/app/onboarding/*.tsx` | Code, naissance, info données, pseudo, sports (tâche 7) |
| `src/app/(app)/reglages.tsx` | Visibilité + suppression de compte (tâche 8) |
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

### Tâche 3 : créer le projet Expo et y intégrer les fichiers existants

- [ ] `npx create-expo-app@latest rungen --template default`
- [ ] Copier `docs/`, `supabase/`, `src/lib/`, `CLAUDE.md` et `README.md` dans `rungen/`
- [ ] `app.json` : `"name": "RUNGEN"`, `"slug": "rungen"`, `"scheme": "rungen"`, `ios.bundleIdentifier` et `android.package` = `fr.rungen.app`, `ios.usesAppleSignIn: true`
- [ ] `npx expo install @supabase/supabase-js expo-secure-store @react-native-google-signin/google-signin expo-apple-authentication expo-dev-client expo-print expo-sharing`
- [ ] `app.json` > `plugins` : `"expo-apple-authentication"` et `["@react-native-google-signin/google-signin", { "iosUrlScheme": "<schéma inversé de l'ID client iOS, obtenu à la tâche 5>" }]`
- [ ] Vérifier : `npx expo start` démarre sans erreur
- [ ] Commit : `chore: projet Expo + fichiers du bloc 1`

### Tâche 4 : projet Supabase et client

- [ ] Créer le projet Supabase (région UE), récupérer l'URL et la clé `anon`
- [ ] `npx supabase link` puis `npx supabase db push` pour appliquer les deux migrations
- [ ] Authentication > Multi-Factor : activer TOTP
- [ ] SQL Editor : créer ton compte admin après ta première connexion dans l'app —
  `insert into public.staff_roles (user_id, role) values ('<ton id utilisateur>', 'admin');`
- [ ] Créer `.env` avec `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`.env` est déjà dans `.gitignore`)
- [ ] `src/lib/supabase.ts` : client avec stockage de session via `expo-secure-store`, `autoRefreshToken: true`, `detectSessionInUrl: false`
- [ ] Commit : `feat: client Supabase`

### Tâche 5 : connexion Google et Apple

- [ ] Google Cloud : projet + 3 identifiants OAuth (Web, Android avec l'empreinte SHA-1 du build EAS, iOS)
- [ ] Supabase > Authentication > Providers : activer Google (ID client Web + secret) et Apple (identifiant `fr.rungen.app`)
- [ ] `src/lib/auth.ts` : `signInWithGoogle()` et `signInWithApple()` → jeton natif → `supabase.auth.signInWithIdToken`
- [ ] Erreurs : annulation silencieuse, échec réseau, erreur inconnue
- [ ] Build de développement Android : `npx eas build --profile development --platform android`
- [ ] Vérifier sur Android puis sur iPhone (dès que le compte développeur RUNGEN est actif)
- [ ] Tester avec un **compte Google supervisé (Family Link)** avant la première intervention
- [ ] Commit : `feat: connexion Google et Apple`

### Tâche 6 : aiguillage

- [ ] `bienvenue.tsx` : deux boutons « Je m'inscris » (public) et « J'ai un code RUNGEN »
- [ ] `_layout.tsx` : pas de session → `bienvenue` ; session sans profil → onboarding du parcours choisi ; profil complet → `(app)` ; onglet admin affiché si `staff_roles.role = 'admin'`
- [ ] Vérifier : déconnexion → bienvenue ; relance de l'app → session conservée
- [ ] Commit : `feat: aiguillage`

### Tâche 7 : onboarding (deux parcours)

- [ ] `src/lib/errors.ts` : `age_minimum`, `profiles_pseudo_unique`, `contenu_interdit`, `pseudo_format`, `code_en_attente`, `code_utilise`, `code_invalide`, `consentement_requis` → messages français
- [ ] Public : connexion → `naissance` (`canRegister(date, 'public')`) → `pseudo` (insert `profiles`) → `sports`
- [ ] RUNGEN : `code` (`rpc('check_invite_code')`, message par statut) → `naissance` (`canRegister(date, 'rungen')`) → `info-donnees` (texte adapté aux 11–14 ans, case « J'ai compris ») → connexion → `pseudo` (`rpc('create_rungen_profile', { p_code, p_pseudo, p_birth_date, p_child_consent: true })`) → `sports`
- [ ] `sports.tsx` : catalogue groupé par famille, recherche avec suggestion avant « Créer "xxx" », choix de la famille pour un sport perso
- [ ] Vérifier : parcours public adulte, refus < 15 ans ; parcours RUNGEN avec code actif, code en attente, code déjà utilisé, refus < 11 ans
- [ ] Commit : `feat: onboarding public et RUNGEN`

### Tâche 8 : réglages et suppression de compte

- [ ] Choix de la visibilité (désactivé avec explication si `isMinor()`)
- [ ] « Supprimer mon compte » avec double confirmation → suppression de la photo → `rpc('delete_my_account')` → déconnexion
- [ ] Commit : `feat: réglages et suppression de compte`

### Tâche 9 : photo de profil

- [ ] Nouvelle migration : bucket privé `avatars`, chemins `{user_id}/avatar.jpg`, lecture alignée sur les règles de `public_profiles`, écriture limitée au propriétaire
- [ ] Commit : `feat: photo de profil`

### Tâche 10 : support côté utilisateur

- [ ] Liste de mes conversations (statut, dernière activité) + bouton « Nouvelle conversation » (catégorie, sujet, premier message)
- [ ] Fil de messages avec envoi ; capture d'écran optionnelle (bucket privé `support`, nouvelle migration)
- [ ] Vérifier : un utilisateur ne voit que ses conversations ; aucun bouton de modification ou suppression
- [ ] Commit : `feat: support utilisateur`

### Tâche 11 : onglet admin

- [ ] Enrôlement de la double authentification (TOTP) au premier accès, puis vérification à chaque session (`aal2`)
- [ ] Établissements : liste + création
- [ ] Codes : générer un lot (établissement, classe, nombre) → PDF d'autorisations avec un code par page (`expo-print`) ; liste filtrable par statut ; boutons « Autorisation reçue » et « Désactiver »
- [ ] Profs : générer un code `prof_eps` pour un établissement
- [ ] Comptes : désactiver / réactiver, supprimer (retrait d'accord parental)
- [ ] Support : boîte de réception triée par statut, réponse, changement de statut
- [ ] Commit : `feat: onglet admin`
