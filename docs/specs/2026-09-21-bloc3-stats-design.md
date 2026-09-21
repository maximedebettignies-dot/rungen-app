# Bloc 3 — Stats et charge d'entraînement : spec de conception

Statut : validée le 21/09/2026, à partir des décisions de
`docs/plans/2026-09-21-decisions-blocs-2-6.md` (points 3.1 à 3.4).

## Objectif

Rendre lisible ce que l'utilisateur a fait : volumes par période, records personnels,
charge d'entraînement, et une estimation de temps de course. Tout se dérive des séances
du bloc 2 — **aucune nouvelle table**.

## Le mot « forme » est écarté

Décision 3.1. Une courbe de forme se calcule normalement à partir d'une charge
d'entraînement pondérée par l'intensité — fréquence cardiaque ou puissance. Ces données
sont exclues du projet, et le resteront.

Ce que l'app affiche s'appelle donc **charge d'entraînement**, pas forme. La distinction
n'est pas cosmétique :

- un indicateur de bien-être ferait basculer l'app dans la catégorie santé des stores,
  avec les obligations qui vont avec ;
- il alourdirait l'analyse d'impact RGPD ;
- et il serait malhonnête, faute des données qui le rendraient fiable.

**Interdits explicites** : score de forme, conseil de repos, alerte de surentraînement,
recommandation d'intensité. L'app montre des chiffres et dit d'où ils viennent ; elle
ne prescrit rien.

## Calculs

### Charge d'entraînement

Charge d'une séance = durée en minutes × un coefficient de ressenti :

| Ressenti | Coefficient |
|---|---|
| Facile | 1 |
| Correct | 2 |
| Dur | 3 |
| Non renseigné | 2 |

C'est la méthode dite RPE × durée, la plus simple qui tienne debout sans capteur. Le
ressenti étant déclaratif, le résultat est une **tendance**, pas une mesure — l'écran le
dit en toutes lettres.

Deux moyennes glissantes :

- **charge récente** : moyenne quotidienne sur 7 jours ;
- **charge de fond** : moyenne quotidienne sur 28 jours.

Leur rapport situe la semaine par rapport au mois. L'app le formule en français simple
(« tu en fais plus que d'habitude ce mois-ci »), sans chiffre magique ni seuil d'alerte.

### Périodes

Semaine (du lundi) et mois, chacune comparée à la période précédente. Pas d'année : le
projet n'a pas assez d'ancienneté pour que ce soit parlant.

### Records personnels

Par sport, sur tout l'historique : plus longue distance, plus longue durée, meilleure
allure. Uniquement personnels — aucun classement entre utilisateurs, celui-ci relève des
défis du bloc 5.

La meilleure allure n'est retenue que sur une distance significative (1 km minimum),
pour qu'un aller-retour de 200 mètres ne devienne pas un record.

### Estimation de temps

Formule de Riegel : `t₂ = t₁ × (d₂ / d₁)^1,06`. Simple, ancienne, vérifiable.

Conditions d'affichage, cumulatives :

- sport de famille `distance` avec une allure en `min_per_km` ;
- une séance d'au moins 3 km dans les 90 derniers jours ;
- distance cible au plus 3 fois la distance de référence — au-delà, Riegel décroche.

Présentée comme une **estimation**, jamais comme un objectif. Pour un mineur, l'écran
ajoute que cela ne remplace pas l'avis de son professeur d'EPS.

## Où ça vit

Tout dans `src/lib/stats.ts`, sans appel réseau supplémentaire : les écrans réutilisent
les séances déjà chargées par `src/lib/seances.ts`. Pas de table d'agrégats tant que les
volumes restent ceux d'une association.

## Écrans

- **Stats** (nouvel onglet) — totaux de la période avec comparaison, graphique des
  7 derniers jours, charge d'entraînement, estimations, records par sport.
- **Accueil** — inchangé pour l'essentiel, plus un lien vers les stats.

## Tests

`src/lib/stats.test.ts` : bornes de semaine ISO (dont le passage d'année), cumuls par
période, comparaison à la période précédente, charge glissante, records (dont l'exclusion
des allures sur trop courte distance), Riegel, et les conditions qui masquent une
estimation.

## Points ouverts

- Faut-il afficher la charge d'entraînement à un élève de 6e ? Elle est juste mais
  abstraite. Retenu **oui** en V1, avec une formulation en français simple ; à revoir
  selon les retours des profs.
- Une estimation sur 5 km et 10 km suffit-elle, ou faut-il le semi et le marathon ? V1 :
  5 et 10 km seulement — au-delà, Riegel perd en fiabilité et la distance n'a guère de
  sens pour des collégiens.
