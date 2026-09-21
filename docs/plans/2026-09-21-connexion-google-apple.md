# Connexion Google et Apple : marche à suivre

Tâche 5 du bloc 1. Ces étapes demandent tes comptes : personne d'autre ne peut les faire
à ta place. Compte 1 h 30 la première fois, dont 20 minutes d'attente de build.

**Projet Supabase** : `rungen` (`bnfobyzpoeqabseupien`)
**URL de rappel** : `https://bnfobyzpoeqabseupien.supabase.co/auth/v1/callback`
**Identifiant de l'app** : `fr.rungen.app` (iOS et Android)

---

## L'ordre compte

L'identifiant OAuth Android exige l'**empreinte SHA-1** du certificat qui signe l'app.
Cette empreinte n'existe qu'une fois le projet EAS créé et un premier build lancé. D'où
cet ordre, qui peut surprendre : **le premier build ne sert qu'à obtenir l'empreinte**.
Il ne permettra pas encore de se connecter, c'est normal.

---

## Étape 1 — Projet EAS et première empreinte

```bash
npm install -g eas-cli        # si ce n'est pas déjà fait
eas login                     # compte Expo, gratuit
eas init                      # crée le projet EAS et écrit son identifiant dans app.json
eas build --profile development --platform android
```

`eas.json` est déjà dans le dépôt, tu n'as rien à configurer.

Pendant le build, EAS propose de **générer un keystore** : accepte, il le gardera pour
toi. Une fois le build terminé :

```bash
eas credentials --platform android
```

Choisis le profil `development`, puis lis la ligne **SHA-1 Fingerprint**. Garde-la : elle
ressemble à `AB:CD:12:34:…`, 20 paires de caractères.

> Tu auras une **seconde empreinte** le jour de la mise en production, différente de
> celle-ci. Il faudra l'ajouter aussi — les deux cohabitent sans problème.

---

## Étape 2 — Projet Google Cloud

1. Va sur [console.cloud.google.com](https://console.cloud.google.com) et crée un projet,
   par exemple `rungen`.
2. Ouvre **Google Auth Platform → Audience**. Choisis **Externe**, puisque les élèves
   n'ont pas de compte de ton organisation.
3. Renseigne **Branding** : nom de l'application (`RUNGEN`), adresse de contact, lien vers
   ta politique de confidentialité. Ce nom est celui que verront tes élèves sur l'écran de
   connexion Google — mets `RUNGEN`, pas le nom du projet technique.
4. **Data Access (Scopes)** : garde uniquement `email`, `profile` et `openid`. N'en ajoute
   aucun autre, sinon Google exigera une procédure de vérification longue.

---

## Étape 3 — Les trois identifiants OAuth

Dans **Google Auth Platform → Clients → Créer un client**, trois fois.

### 3a. Type « Application Web » — c'est celui que Supabase vérifie

- **Origines JavaScript autorisées** : rien à mettre, l'app est mobile.
- **URI de redirection autorisés** : `https://bnfobyzpoeqabseupien.supabase.co/auth/v1/callback`
- Récupère l'**ID client** *et* le **secret**.

### 3b. Type « Android »

- **Nom du package** : `fr.rungen.app`
- **Empreinte SHA-1** : celle de l'étape 1.
- Récupère l'**ID client** (il n'y a pas de secret pour ce type).

### 3c. Type « iOS »

- **ID de bundle** : `fr.rungen.app`
- Laisse App Store ID et Team ID vides tant que l'app n'est pas publiée.
- Récupère l'**ID client**, puis construis le **schéma inversé** : un ID
  `123456-abc.apps.googleusercontent.com` devient
  `com.googleusercontent.apps.123456-abc`.

---

## Étape 4 — Déclarer tout ça dans Supabase

**Authentication → Providers → Google** :

- Active le fournisseur.
- **Client ID** : colle les **trois** identifiants, séparés par des virgules — le Web, le
  Android et le iOS. C'est l'erreur la plus fréquente : n'en mettre qu'un fait échouer la
  connexion native sans message clair.
- **Client Secret** : celui du client Web uniquement.
- Coche **Skip nonce check**. Le jeton renvoyé par l'écran système d'iOS ne porte pas de
  nonce vérifiable par Supabase ; sans cette option, la connexion échoue sur iPhone.

**Authentication → Providers → Apple** : à faire quand le compte développeur RUNGEN sera
actif. L'identifiant à déclarer est `fr.rungen.app`.

---

## Étape 5 — Brancher les valeurs dans l'app

Dans `.env`, en local :

```
EXPO_PUBLIC_SUPABASE_URL=https://bnfobyzpoeqabseupien.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=…          # Project Settings → API
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=…       # étape 3a
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=…       # étape 3c
```

Dans `app.json`, remplace `com.googleusercontent.apps.REMPLACER_PAR_ID_CLIENT_IOS_INVERSE`
par le schéma inversé de l'étape 3c.

**Le build EAS n'emporte pas ton `.env`** : il est ignoré par git, donc absent de ce
qu'EAS reçoit. Sans ces variables déclarées côté EAS, l'app buildée plante au démarrage.
Déclare-les une fois (ajoute `--visibility plaintext` : ces valeurs sont publiques par
conception, et EAS les demande sinon) :

```bash
eas env:set --environment development --name EXPO_PUBLIC_SUPABASE_URL --value "https://bnfobyzpoeqabseupien.supabase.co"
eas env:set --environment development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "…"
eas env:set --environment development --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "…"
eas env:set --environment development --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "…"
```

---

## Étape 6 — Rebuild et test

```bash
eas build --profile development --platform android
```

Installe l'APK sur ton téléphone, puis :

```bash
npx expo start --dev-client
```

À vérifier dans l'ordre :

- [ ] La connexion Google ouvre bien l'écran système, pas un navigateur
- [ ] Après connexion, l'app demande la date de naissance
- [ ] Une date de moins de 15 ans est refusée en parcours public
- [ ] Le pseudo puis les sports mènent à l'accueil
- [ ] Fermer et rouvrir l'app conserve la session
- [ ] Se déconnecter ramène à l'écran de bienvenue

Puis ton compte admin, une fois ton identifiant connu (Authentication → Users) :

```sql
insert into public.staff_roles (user_id, role) values ('<ton id>', 'admin');
```

---

## Étape 7 — Le test qui compte vraiment

**Teste avec un compte Google supervisé (Family Link)** avant la première intervention en
établissement. C'est le cas réel de tes élèves de 11 à 14 ans, et le seul qui peut
réserver une mauvaise surprise : selon les réglages parentaux, Google peut demander une
validation du parent, voire bloquer la connexion à une application tierce.

Si ça coince, mieux vaut le découvrir maintenant que devant une classe.

---

## Si ça ne marche pas

| Symptôme | Cause la plus probable |
|---|---|
| `DEVELOPER_ERROR` sur Android | Empreinte SHA-1 absente ou fausse dans le client Android, ou nom de package différent de `fr.rungen.app` |
| Connexion qui tourne puis échoue sans message | Les trois ID clients ne sont pas tous déclarés côté Supabase |
| Échec sur iPhone uniquement | « Skip nonce check » non coché |
| L'app plante au démarrage après un build | Variables `EXPO_PUBLIC_*` non déclarées côté EAS |
| Un navigateur s'ouvre au lieu de l'écran système | L'app tourne dans Expo Go : il faut le build de développement |
