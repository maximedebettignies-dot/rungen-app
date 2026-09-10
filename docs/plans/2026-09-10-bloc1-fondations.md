# Bloc 1 — Fondations : plan d'implémentation

**Objectif :** une app iOS/Android où l'on se connecte avec Google ou Apple, crée son profil (âge ≥ 15 ans), choisit ses sports favoris et peut supprimer son compte.

**Architecture :** app Expo (Expo Router, TypeScript) qui parle directement à Supabase. Toutes les règles sensibles (âge, visibilité, modération, accès aux données) sont appliquées par la base via triggers et RLS ; l'app ne fait que refléter ces règles pour l'expérience utilisateur.

**Stack :** Expo SDK (dernière version stable), Expo Router, `@supabase/supabase-js`, `expo-secure-store`, `@react-native-google-signin/google-signin`, `expo-apple-authentication`, EAS Build, Supabase (région UE).

Spec de référence : `docs/specs/2026-09-10-bloc1-fondations-design.md`

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/age.ts` | Règles d'âge côté app (miroir des fonctions SQL) |
| `src/lib/age.test.ts` | Tests de la logique d'âge |
| `supabase/migrations/20260910000000_bloc1_fondations.sql` | Schéma, règles, RLS, catalogue, suppression de compte |
| `supabase/tests/00_supabase_mock.sql` | Simulation minimale de Supabase pour tester en local |
| `supabase/tests/bloc1_test.sql` | 23 tests de règles métier et de sécurité |
| `supabase/tests/run.sh` | Lance les tests SQL sur un Postgres local |
| `src/lib/supabase.ts` | Client Supabase avec session chiffrée (tâche 4) |
| `src/lib/auth.ts` | Connexion Google/Apple → Supabase (tâche 5) |
| `src/app/_layout.tsx` | Aiguillage connexion / onboarding / app (tâche 6) |
| `src/app/connexion.tsx` | Écran de connexion (tâche 6) |
| `src/app/onboarding/*.tsx` | Date de naissance, pseudo, sports (tâche 7) |
| `src/app/(app)/reglages.tsx` | Visibilité + suppression de compte (tâche 8) |

---

### Tâche 1 : logique d'âge ✅ fait

- [x] Tests écrits et vus en échec (module absent)
- [x] Implémentation minimale, 7 tests passent
- Commande : `node --experimental-strip-types --test src/lib/age.test.ts`

### Tâche 2 : schéma Supabase et sécurité ✅ fait

- [x] Tests SQL écrits et vus en échec (tables absentes)
- [x] Migration écrite, tous les tests passent
- [x] Tests de mutation : chaque règle cassée volontairement fait échouer au moins un test
- Commande : `PGHOST=... PGPORT=... PGUSER=... bash supabase/tests/run.sh`

### Tâche 3 : créer le projet Expo et y intégrer les fichiers existants

- [ ] `npx create-expo-app@latest rungen --template default`
- [ ] Copier `docs/`, `supabase/` et `src/lib/` de ce dépôt dans `rungen/`
- [ ] Dans `app.json` : `"name": "RUNGEN"`, `"slug": "rungen"`, `"scheme": "rungen"`, `ios.bundleIdentifier` et `android.package` = `fr.rungen.app`, `ios.usesAppleSignIn: true`
- [ ] `npx expo install @supabase/supabase-js expo-secure-store @react-native-google-signin/google-signin expo-apple-authentication expo-dev-client`
- [ ] Dans `app.json` > `plugins` : ajouter `"expo-apple-authentication"` et `["@react-native-google-signin/google-signin", { "iosUrlScheme": "<schéma inversé de l'ID client iOS, obtenu à la tâche 5>" }]`
- [ ] Vérifier : `npx expo start` démarre sans erreur
- [ ] Commit : `chore: projet Expo + fichiers du bloc 1`

### Tâche 4 : projet Supabase et client

- [ ] Créer le projet Supabase (région UE), récupérer l'URL et la clé `anon`
- [ ] `npx supabase link` puis `npx supabase db push` pour appliquer la migration
- [ ] Créer `.env` avec `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ajouter `.env` au `.gitignore`)
- [ ] Écrire `src/lib/supabase.ts` : client avec stockage de session via `expo-secure-store`, `autoRefreshToken: true`, `detectSessionInUrl: false`
- [ ] Commit : `feat: client Supabase`

### Tâche 5 : connexion Google et Apple

- [ ] Google Cloud : créer un projet, 3 identifiants OAuth (Web, Android avec l'empreinte SHA-1 du build EAS, iOS)
- [ ] Supabase > Authentication > Providers : activer Google (ID client Web + secret) et Apple (identifiant `fr.rungen.app`)
- [ ] Écrire `src/lib/auth.ts` : `signInWithGoogle()` et `signInWithApple()` qui récupèrent le jeton natif puis appellent `supabase.auth.signInWithIdToken`
- [ ] Traduire les erreurs en messages français : annulation (silencieuse), échec réseau, erreur inconnue
- [ ] Build de développement Android : `npx eas build --profile development --platform android`
- [ ] Vérifier sur Android : connexion Google → session créée dans Supabase > Authentication
- [ ] iPhone : même vérification avec Apple dès que le compte développeur RUNGEN est actif
- [ ] Commit : `feat: connexion Google et Apple`

### Tâche 6 : aiguillage et écran de connexion

- [ ] `src/app/_layout.tsx` : écoute `onAuthStateChange` ; pas de session → `/connexion` ; session sans profil → `/onboarding/naissance` ; profil complet → `/(app)`
- [ ] `src/app/connexion.tsx` : bouton Google (toutes plateformes), bouton Apple (iOS uniquement, `Platform.OS === 'ios'`)
- [ ] Vérifier : se déconnecter ramène à la connexion ; relancer l'app garde la session
- [ ] Commit : `feat: aiguillage et écran de connexion`

### Tâche 7 : onboarding

- [ ] `naissance.tsx` : sélecteur de date ; `canRegister()` faux → écran « Tu dois avoir au moins 15 ans » + déconnexion, rien n'est enregistré
- [ ] `pseudo.tsx` : validation locale `^[A-Za-z0-9_.]{3,20}$` ; insertion dans `profiles` (id, pseudo, birth_date) ; erreurs `profiles_pseudo_unique` → « Ce pseudo est déjà pris », `contenu_interdit` → « Ce pseudo n'est pas autorisé »
- [ ] `sports.tsx` : liste du catalogue groupée par famille ; recherche avec suggestion du sport le plus proche avant de proposer « Créer "xxx" » ; choix de la famille pour un sport perso ; enregistrement dans `favorite_sports`
- [ ] Vérifier sur téléphone : parcours complet avec un compte adulte, puis refus avec une date < 15 ans
- [ ] Commit : `feat: onboarding`

### Tâche 8 : réglages et suppression de compte

- [ ] `reglages.tsx` : choix de la visibilité (désactivé avec explication si `isMinor()`)
- [ ] Bouton « Supprimer mon compte » avec double confirmation → `supabase.rpc('delete_my_account')` → déconnexion
- [ ] Vérifier dans Supabase que l'utilisateur, son profil, ses sports perso et ses favoris ont disparu
- [ ] Commit : `feat: réglages et suppression de compte`

### Tâche 9 : photo de profil (optionnelle au bloc 1)

- [ ] Nouvelle migration : bucket privé `avatars`, chemins `{user_id}/avatar.jpg`, policies lecture/écriture limitées au propriétaire
- [ ] Ajouter la photo à l'étape pseudo ; supprimer le fichier avant `delete_my_account`
- [ ] Commit : `feat: photo de profil`
