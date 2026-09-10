# Bloc 1 — Fondations : spec de conception

Statut : validée le 10/09/2026

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
| Connexion | Google (iOS + Android) et Apple (iOS) dès le début, via jeton natif (`signInWithIdToken`) |
| Identifiant stores | `fr.rungen.app` |
| Sports | Catalogue commun par familles (`distance`, `duree`) + sports perso créés par l'utilisateur |
| Âge minimum | 15 ans (date de naissance déclarative, blocage en dessous) |
| Mineurs 15–17 ans | Profil privé verrouillé, pas de contenu sponsorisé ciblé |
| Visibilité adultes | `amis` par défaut, modifiable (`public`, `amis`, `prive`) |

## Parcours d'inscription

1. Connexion Google ou Apple.
2. Date de naissance → refus si < 15 ans.
3. Pseudo unique (3 à 20 caractères, lettres, chiffres, `_` et `.`) + photo optionnelle.
4. Sports favoris : catalogue, ou création d'un sport perso (avec suggestion d'un sport existant proche).

Un utilisateur qui n'a pas terminé les étapes 2 et 3 est renvoyé dans le parcours à chaque ouverture.

## Modèle de données

- `profiles` : `id` (= utilisateur Supabase Auth), `pseudo` (unique, insensible à la casse), `avatar_url`, `birth_date`, `visibility`, `created_at`, `updated_at`.
- `sports` : catalogue commun — `id`, `slug`, `name`, `family` (`distance` | `duree`), `pace_unit` (`min_per_km` | `km_per_h` | `min_per_100m` | `none`).
- `custom_sports` : `id`, `owner_id`, `name`, `family`, `created_at`. Nom unique par propriétaire (insensible à la casse).
- `favorite_sports` : `user_id` + exactement un de `sport_id` / `custom_sport_id`.

## Règles métier (appliquées en base, pas seulement dans l'app)

- **Âge** : impossible d'enregistrer une date de naissance donnant moins de 15 ans ; date dans le futur refusée.
- **Mineur** : âge < 18 ans à la date du jour. Calculé à la lecture, jamais stocké → le passage à 18 ans est automatique.
- **Visibilité effective** : `prive` si mineur, sinon la valeur choisie. Pour un mineur, la base force l'enregistrement à `prive`, quelle que soit la valeur envoyée.
- **Date de naissance** : lisible uniquement par son propriétaire, et non modifiable après l'inscription (empêche un mineur de se vieillir pour passer en public).
- **Profils des autres** : pseudo + avatar visibles si visibilité effective `public` (en V1, `amis` se comporte comme `prive` tant que le bloc 4 n'existe pas).
- **Sports perso** : visibles et modifiables uniquement par leur créateur ; nom filtré par une liste de mots interdits.
- **Suppression de compte** : depuis l'app, supprime l'utilisateur et toutes ses données en cascade (exigence Apple + RGPD).

## Gestion des erreurs

- Connexion annulée ou échouée : message en français, retour à l'écran de connexion.
- Pseudo déjà pris : message dédié (erreur d'unicité).
- Âge insuffisant : écran explicatif, aucune donnée de profil conservée.
- Hors ligne : message générique « Connexion internet requise » (le mode hors ligne arrive avec le log d'activité).

## Tests

- Logique d'âge (TypeScript) : tests unitaires, y compris anniversaires et 29 février.
- Règles de sécurité SQL : script de tests qui simule plusieurs utilisateurs et vérifie accès autorisés et refusés.
