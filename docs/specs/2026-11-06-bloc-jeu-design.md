# Bloc jeu — quêtes, expérience, rang et boutique : spec de conception

Statut : **à valider avec Maxime**. Écrite le 06/11/2026, à partir des décisions de
`docs/plans/2026-11-06-decisions-restructure-rpg.md`, toutes tranchées :

- récompenses internes uniquement, monnaie fictive, aucun achat en argent réel ;
- expérience quotidienne plafonnée à la recommandation de l'OMS ;
- aucun mécanisme punitif ;
- le rang gouverne les récompenses, le niveau ne sert qu'à la progression ;
- personnage et objets **dessinés dans l'app**, sans illustration achetée ;
- classement **de classe à classe**, jamais de palmarès nominatif entre élèves.

## Le principe qui commande le reste

**Rien de ce qui a de la valeur n'est calculé par l'app.** L'expérience, les pièces, le
niveau et le rang se dérivent en base, à partir des séances. L'app les lit, ne les écrit
jamais.

Ce n'est pas de la rigueur de principe : c'est la faille classique de ce genre de
système. Une app qui enverrait son propre total d'expérience se contourne en dix
minutes, et la restructuration vers des récompenses rend la triche rentable — ce qui
invalide l'arbitrage pris en septembre, quand rien n'était en jeu.

## L'objectif du jour

| Public | Objectif | Source |
|---|---|---|
| Moins de 18 ans | **60 minutes** | OMS 2020, 5-17 ans |
| 18 ans et plus | **30 minutes** | Bas de la fourchette OMS adulte (150 min/semaine) |

Une fonction `objectif_quotidien_minutes(birth_date)` le calcule en base, comme
`is_minor` et `min_registration_age` le font déjà pour l'âge. L'app ne décide pas de
l'objectif de quelqu'un.

Au-delà de l'objectif, **la séance compte toujours** dans l'historique, les stats et les
records — mais elle ne rapporte plus. Le jeu s'aligne sur la santé publique au lieu de
pousser au-delà.

## Les quêtes

**Trois par jour**, tirées d'un catalogue par une fonction déterministe de
l'identifiant du compte et de la date. Aucune tâche planifiée, aucune ligne écrite tant
qu'une quête n'est pas accomplie : c'est ce qui permet de tenir sur l'hébergement d'une
association.

Quatre familles, suffisantes pour varier sans devenir illisibles :

| Famille | Exemple | Vérifiée sur |
|---|---|---|
| `objectif_jour` | Atteindre tes 60 minutes | Durée cumulée du jour |
| `duree_sport` | 10 minutes de méditation | Une séance du sport visé |
| `famille_distance` | Une séance qui se mesure en distance | La famille du sport |
| `nouveau_sport` | Un sport que tu n'as pas fait depuis 7 jours | L'historique |

Une quête se **vérifie sur des séances**, jamais ne se déclare. La méditation entre donc
au catalogue des sports, en famille `duree` — c'est une activité, pas un état de santé.

## Niveau et rang

| | **Niveau** | **Rang** |
|---|---|---|
| Mesure | Expérience cumulée | Jours actifs sur les 28 derniers |
| Évolution | Ne redescend **jamais** | Monte et descend |
| Rôle | Le sentiment de progresser | **Multiplie les pièces gagnées** |

L'expérience n'est jamais multipliée : le niveau reflète ce qui a réellement été fait.
Seules les **pièces** dépendent du rang, pour que la régularité paie sans que la
progression se perde.

Le rang compte les **jours actifs**, pas le volume. Six fois trente minutes vaut mieux,
pour la santé comme pour le jeu, que trois heures le dimanche.

## Modèle de données

- `quest_templates` — le catalogue : famille, libellé, cible, expérience, pièces.
- `xp_events` — ce qui a été gagné : compte, jour, origine, expérience, pièces.
  Unicité sur (compte, jour, origine) : **une quête ne paie qu'une fois**.
- `players` — agrégat tenu par déclencheur : expérience totale, pièces disponibles.
- `shop_items` — objets : code, catégorie, prix, rang minimum.
- `inventory` — ce que le compte possède.

Aucune modification de `activities` : la source reste la même.

### Le recalcul, et pourquoi il est entier

Un déclencheur sur `activities` (insertion, modification **et suppression**) recalcule
**toute la journée** concernée, au lieu d'ajouter au fil de l'eau.

C'est plus coûteux et c'est volontaire : un élève qui corrige ou supprime une séance ne
doit pas conserver l'expérience qu'elle avait rapportée. Un compteur incrémental se
désynchronise à la première correction, et la dérive est invisible jusqu'au jour où elle
ne l'est plus.

### Droits

`xp_events` et `players` sont **en lecture seule** pour `authenticated`, et limités à son
propre compte. Aucune policy d'écriture : seules les fonctions `security definer`
appelées par le déclencheur écrivent. L'app ne peut pas s'attribuer d'expérience, même
en forgeant ses requêtes.

## Bornes de plausibilité

Reportées depuis le bloc 5, elles deviennent nécessaires : dès qu'une récompense a de la
valeur, la triche grossière devient rentable.

Un déclencheur refuse une séance physiquement improbable — allure de course sous un
certain seuil, vitesse à vélo, durée cumulée sur une journée. Les seuils tiennent compte
de l'âge et restent larges : ils visent l'absurde, pas la performance.

Le plafond quotidien fait le reste du travail. On ne triche pas longtemps pour un gain
borné à soixante minutes par jour.

## Classement

**De classe à classe**, au sein d'un établissement. Un total de classe, jamais un
palmarès d'élèves. Chaque élève voit sa propre contribution, pour lui seul.

La cloison s'applique : un classement ne révèle jamais un membre RUNGEN au public, et
une classe n'existe que dans son établissement.

## Écrans

- **Accueil** — réécrit autour du jeu : objectif du jour, les trois quêtes, niveau, rang.
- **Personnage** — l'avatar et l'inventaire.
- **Boutique** — objets achetables en pièces, ceux que le rang ne permet pas encore
  étant visibles mais verrouillés.
- **Activité, Stats, Historique** — inchangés. Loguer reste le geste central.

Le personnage est **dessiné en code**, comme le graphique des stats et le QR code : pas
d'illustration achetée, pas de droits à gérer, pas de module natif, et une retouche
coûte une minute.

## Tests

- **SQL** : plafond atteint puis dépassé ; suppression d'une séance qui retire
  l'expérience ; une quête ne paie qu'une fois ; tirage déterministe pour un compte et
  une date donnés ; un compte ne peut pas s'écrire d'expérience ; achat refusé sans
  pièces ou sans le rang ; bornes de plausibilité ; cloison sur le classement.
- **TypeScript** : courbe de niveau, seuils de rang, formatage.

## Ce que cela déplace

Le bloc 4 social se réduit, mais **le signalement et le blocage restent obligatoires** :
dès qu'un pseudo ou un personnage est visible d'autrui, Apple refuse sans. Le bloc 5
fusionne ici : un défi de classe est une quête collective.

**L'AIPD s'écrit avant ce bloc**, pas après. Niveau, rang et historique de quêtes
constituent un profil, et il porte sur des mineurs.

## Points ouverts

- **La courbe de niveau** : combien d'expérience pour le niveau 2, le 10, le 50 ?
  À régler une fois les premiers usages observés, pas avant.
- **Les paliers de rang** : combien de jours actifs sur 28 pour chaque rang ?
- **Que devient une classe quand l'année scolaire change ?** Question à poser aux
  professeurs avant de figer le classement.
