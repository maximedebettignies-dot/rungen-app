# Chronomètre et mode hors-ligne : spec de conception

Statut : **à valider avec Maxime**. Écrite le 07/10/2026, en réponse à deux manques
constatés à l'usage : on ne peut que saisir une séance après coup, et une saisie sans
réseau est perdue.

## Objectif

Permettre de **lancer une séance en direct** depuis l'app, et faire qu'**aucune saisie ne
se perde** quand le réseau manque.

## Ce que ce n'est pas

Pas de GPS, pas de carte, pas de distance mesurée automatiquement. Ces sujets restent en
V1.1, avec leur propre spec : ils demandent un module natif, une déclaration de
localisation en arrière-plan chez Google et Apple, et une extension de l'analyse d'impact
RGPD à la géolocalisation continue de mineurs.

Le chronomètre mesure **le temps**. Rien d'autre.

## Pourquoi c'est faisable sans reconstruire l'app

`expo-file-system` et `expo-keep-awake` sont déjà présents dans le build. Le chronomètre
et la file hors-ligne n'utilisent qu'eux. Les élèves qui ont déjà l'app la reçoivent par
simple mise à jour JavaScript.

C'est la contrainte qui a déjà façonné le graphique des stats et le QR code : aucun
module natif ajouté après coup.

## Le chronomètre

### Il ne compte pas, il date

Un compteur qui s'incrémente toutes les secondes est faux dès que l'app passe en
arrière-plan : le système suspend le JavaScript, l'écran s'éteint, l'élève range son
téléphone dans sa poche.

On enregistre donc un **instant de départ**, et la durée est toujours recalculée :

```
duree = maintenant − depart − pauses cumulées
```

Cette approche est juste quelle que soit la façon dont l'app a été interrompue, y compris
si le système l'a tuée. Elle ne demande aucune tâche de fond, donc aucune permission.

### Reprise après fermeture

La séance en cours est écrite dans un fichier dès le démarrage et à chaque pause. Si
l'app rouvre et trouve ce fichier, elle propose de **reprendre la séance** plutôt que
d'en perdre la trace.

### Garde-fous

- **Oubli** : un chronomètre lancé et oublié produirait une séance de 9 heures. Au-delà
  de 6 heures sans interaction, l'app propose de clore la séance à la dernière pause
  connue. La base refuse de toute façon au-delà de 24 heures.
- **Durée minimale** : la base impose 60 secondes. L'app le dit avant d'enregistrer.
- **Écran** : `expo-keep-awake` empêche la mise en veille pendant l'enregistrement, et
  l'app le relâche à l'arrêt — sinon la batterie se vide dans le sac.

### Ce que l'élève fait à l'arrêt

L'écran de fin reprend le formulaire existant, avec la durée déjà remplie et non
modifiable. Restent à renseigner la distance (si le sport se mesure en distance), le
ressenti et la note.

## La file hors-ligne

### Le défaut actuel

`src/lib/seances.ts` écrit directement dans Supabase. Sans réseau, l'élève voit une
erreur et **sa saisie est perdue**. Or les lieux de sport — gymnase, stade, piscine,
sous-sol — sont précisément ceux où le réseau manque.

### Conception

À l'enregistrement, l'app tente l'écriture. En cas d'échec réseau, la séance part dans
une **file sur disque**. La file est vidée au démarrage de l'app, au retour au premier
plan, et après chaque écriture réussie.

Pas de détection de connectivité : cela demanderait un module natif. On réessaie aux
moments où l'app reprend la main, ce qui suffit et ne coûte rien.

### Doublons

Chaque séance porte un **identifiant produit par l'app**, pas par la base. La colonne
`activities.id` est déjà un `uuid` : l'app le fournit, et un envoi rejoué se heurte à la
clé primaire au lieu de créer une séance en double.

C'est le point sur lequel une file d'attente échoue le plus souvent, et il est réglé par
ce qui existe déjà.

### La date reste celle de la séance

`performed_on` est une date fournie par l'app, distincte de l'horodatage d'écriture. Une
séance faite le mardi et synchronisée le jeudi reste datée du mardi. Aucune migration
n'est nécessaire pour cela.

### Les règles restent en base

Une séance synchronisée passe par les mêmes déclencheurs que les autres : fenêtre de
saisie, distance selon la famille du sport, bornes de durée, filtrage de la note. Si la
base la refuse, l'app le dit et garde la séance modifiable plutôt que de la jeter.

## Points à trancher

**1. Distance d'une séance chronométrée.** Le chronomètre donne la durée, pas la
distance. Pour un sport de famille `distance`, l'élève devra donc saisir une distance
qu'il ne connaît pas forcément. La spec du bloc 2 avait tranché « distance obligatoire »
(point ouvert 2.5). Le chronomètre rouvre la question.

> **Recommandation** : autoriser une séance chronométrée **sans distance** pour les sports
> de famille `distance`. L'allure ne s'affiche alors pas, et la séance ne compte pas dans
> les records de distance — mais elle compte dans le volume horaire et la charge. Mieux
> vaut une séance incomplète qu'une distance inventée. Cela demande une migration, la
> règle étant appliquée en base.

**2. Distinguer une séance chronométrée d'une séance saisie.** Une colonne `source`
(`saisie` | `chrono`) permettrait au professeur de voir lesquelles ont été mesurées dans
l'app.

> **Recommandation** : oui. Cela ne prouve rien — un chronomètre se lance et s'oublie —
> mais c'est une information honnête, affichée telle quelle, sans prétendre à une
> vérification. Migration courte.

**3. Pause.**

> **Recommandation** : oui, avec reprise. Un feu rouge, un lacet, une pause boisson. Sans
> pause, l'élève arrête et relance, et se retrouve avec deux séances.

## Tests

- **TypeScript** : calcul de la durée avec pauses, reprise après fermeture, détection de
  l'oubli, sérialisation de la file, idempotence d'un envoi rejoué, ordre de vidage.
- **SQL** : si les points 1 et 2 sont retenus, la nullité de la distance selon la source,
  et le fait qu'une séance sans distance n'entre pas dans les records d'allure.

## Ce que ça ne règle pas

Ce n'est pas une parade à la falsification. Un chronomètre se lance en marchant. Les
mesures qui tiennent debout contre la triche sont ailleurs : bornes de plausibilité en
base, visibilité du professeur sur sa classe, verrouillage à la clôture d'un défi.
À traiter avec le bloc 5.
