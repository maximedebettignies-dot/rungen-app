# Bloc 1 — Fondations : spec de conception

Statut : validée le 10/09/2026, révisée le 11/09/2026 (espaces, rôles, codes RUNGEN, support)

## Contexte

App mobile open source de suivi sportif grand public ("Strava premium gratuit"), portée par l'association RUNGEN (loi 1901). La V1 est découpée en 6 blocs livrés dans l'ordre :

1. Fondations (ce document)
2. Log d'activité manuel + historique
3. Stats, forme et prédictions
4. Social (amis, fil, kudos)
5. Clubs et challenges (dont sponsorisés)
6. Partage (image de fin d'activité)

Hors V1 : GPS live et import GPX (V1.1), coach IA payant, pubs.

## Décisions validées

| Sujet | Décision |
|---|---|
| Plateformes | iOS + Android dès la V1 |
| Stack app | Expo + Expo Router + TypeScript, interface en français |
| Backend | Supabase, région UE |
| Connexion | Google (iOS + Android) et Apple (iOS), via jeton natif (`signInWithIdToken`), pour tous les espaces |
| Identifiant stores | `fr.rungen.app` |
| Sports | Catalogue commun par familles (`distance`, `duree`) + sports perso créés par l'utilisateur |
| Espaces | `public` (tout le monde) et `rungen` (jeunes recrutés lors des interventions en établissement) |
| Âge minimum | 15 ans dans l'espace public, 11 ans dans l'espace RUNGEN |
| Accès RUNGEN | Code individuel imprimé sur l'autorisation parentale, activé par l'admin au retour du papier signé |
| Mineurs | Profil privé verrouillé jusqu'à 18 ans, aucun ciblage |
| Visibilité adultes | `amis` par défaut, modifiable (`public`, `amis`, `prive`) |
| Encadrement RUNGEN | Admin (Maxime) + profs d'EPS limités à leur établissement, double authentification obligatoire |
| Challenges sponsorisés | Accessibles aux jeunes RUNGEN, avec garde-fous (voir bloc 5) |
| Support | Messagerie utilisateur → admin, messages définitifs |

## Rôles

- **Admin** : crée les établissements, génère et active les codes, valide les profs, répond au support, désactive ou supprime un compte. Pouvoirs actifs uniquement avec double authentification (`aal2`). Le premier admin est créé en SQL, jamais depuis l'app.
- **Prof d'EPS** : compte dédié créé avec un code `prof_eps` généré par l'admin, obligatoirement majeur. Voit uniquement les élèves et les codes de son établissement, avec double authentification. Aucun accès au support ni aux autres établissements.
- **Membre public** : inscription classique, 15 ans minimum.
- **Membre RUNGEN** : inscription via code, 11 ans minimum.

## Parcours d'inscription

### Espace public

1. Connexion Google ou Apple.
2. Date de naissance → refus si < 15 ans.
3. Pseudo unique (3 à 20 caractères, lettres, chiffres, `_` et `.`) + photo optionnelle.
4. Sports favoris : catalogue, ou création d'un sport perso (avec suggestion d'un sport existant proche).

### Espace RUNGEN

Avant l'intervention : accord du chef d'établissement (y compris sur les challenges partenaires), analyse d'impact RGPD validée, lot de codes généré par classe et imprimé sur les autorisations (PDF).

1. L'élève rapporte l'autorisation signée ; l'admin touche « Autorisation reçue » → code actif. Le nom de l'élève reste sur le papier, jamais dans l'app.
2. Dans l'app : « J'ai un code RUNGEN » → vérification (`invalide`, `en_attente`, `utilise`, `ok`) avec message adapté.
3. Date de naissance → refus si < 11 ans.
4. Écran « Ce que fait l'app avec tes données », rédigé pour son âge, que l'élève accepte (consentement conjoint avec le parent).
5. Connexion Google ou Apple (accord parental possible si compte supervisé).
6. Pseudo (jamais le vrai nom) puis sports favoris.
7. Compte créé dans l'espace RUNGEN, rattaché à l'établissement et à la classe ; le code est consommé définitivement.

Retrait de l'accord : l'admin retrouve le code via le papier et supprime le compte. Code perdu : l'admin désactive l'ancien code (s'il n'est pas utilisé) et en génère un nouveau.

Ce parcours s'applique à tous les membres RUNGEN, lycéens compris.

## Modèle de données

- `profiles` : `id`, `pseudo`, `avatar_url`, `birth_date`, `visibility`, `space`, `disabled_at`, dates.
- `sports`, `custom_sports`, `favorite_sports` : inchangés.
- `establishments` : `id`, `name`, `city`.
- `staff_roles` : `user_id`, `role` (`admin` | `prof_eps`), `establishment_id` (obligatoire pour un prof, vide pour l'admin).
- `invite_codes` : `code` (10 caractères sans 0/O/1/I), `kind` (`eleve` | `prof_eps`), `establishment_id`, `class_label`, `status` (`cree` → `actif` → `utilise`, ou `desactive`), `used_by`, dates.
- `rungen_memberships` : `user_id`, `establishment_id`, `class_label`, `invite_code_id`, `child_consent_at`.
- `support_threads` : `user_id`, `category` (`probleme` | `idee` | `autre`), `subject`, `status` (`nouveau` | `en_cours` | `resolu`).
- `support_messages` : `thread_id`, `author_id`, `body`, `attachment_path`.

## Règles métier (appliquées en base, pas seulement dans l'app)

- **Âge** : minimum selon l'espace ; date dans le futur refusée ; date de naissance non modifiable.
- **Espace** : un utilisateur ne crée lui-même qu'un profil public ; l'espace RUNGEN passe uniquement par un code actif ; l'espace ne change jamais.
- **Mineur** : âge < 18 ans à la date du jour, calculé à la lecture ; visibilité forcée à `prive`.
- **Date de naissance** : lisible uniquement par son propriétaire.
- **Qui voit la carte de profil (pseudo + photo)** :
  - un adulte public en visibilité `public` : tous les utilisateurs connectés (en V1, `amis` se comporte comme `prive` tant que le bloc 4 n'existe pas) ;
  - un membre RUNGEN : les autres membres RUNGEN, les profs de son établissement, l'admin — **jamais le public** ;
  - un encadrant : les membres RUNGEN ;
  - un compte désactivé : personne.
- **Classes et établissements** : un jeune ne voit que sa propre adhésion ; un prof celles de son établissement.
- **Support** : chacun n'ouvre une conversation que pour lui-même ; seul l'admin répond aux conversations des autres et change leur statut ; aucun message n'est modifiable ni supprimable ; à la suppression d'un compte, la conversation est conservée anonymisée (durée de conservation à fixer dans l'analyse d'impact).
- **Sports perso** : visibles et modifiables uniquement par leur créateur ; nom filtré par une liste de mots interdits.
- **Suppression de compte** : par l'utilisateur ou par l'admin (retrait d'accord parental), en cascade.

## Garde-fous challenges sponsorisés (implémentés au bloc 5)

Catégories de sponsors exclues pour les challenges visibles des jeunes (alcool, jeux d'argent, boissons énergisantes, malbouffe) ; interrupteur « Visible par les jeunes RUNGEN » par challenge ; mention « Partenaire » toujours visible ; aucun ciblage ; reporting sponsor uniquement agrégé. Dans les classements publics, un jeune RUNGEN apparaît en « Athlète RUNGEN » anonyme, sans interaction avec le public.

## Gestion des erreurs

- Connexion annulée ou échouée : message en français, retour à l'écran de connexion.
- Pseudo déjà pris / interdit : message dédié.
- Âge insuffisant : écran explicatif, aucune donnée conservée.
- Code : message adapté à chaque statut (`code_en_attente`, `code_utilise`, `code_invalide`).
- Hors ligne : « Connexion internet requise ».

## Points ouverts

- Devenir d'un membre RUNGEN à 18 ans ou à la fin de sa scolarité (par défaut : il reste dans l'espace RUNGEN).
- Limitation du nombre de vérifications de code par appareil (anti-essais en série).
- Durée de conservation des conversations de support anonymisées.

## Tests

- Logique d'âge (TypeScript) : tests unitaires, y compris anniversaires, 29 février et minimum par espace.
- Règles SQL : deux fichiers de tests exécutés chacun sur une base neuve, plus tests de mutation sur les règles critiques.
