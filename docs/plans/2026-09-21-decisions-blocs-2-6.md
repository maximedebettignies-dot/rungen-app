# Blocs 2 à 6 — ce qu'il faut valider avant de coder

Statut : **validé par Maxime le 21/09/2026**. Toutes les recommandations sont retenues
telles quelles. Ce document fait foi pour les specs des blocs 2 à 6 ; il sera amendé si
les premiers retours terrain le demandent.

Ce document ne remplace pas les specs : chaque bloc aura la sienne, dans `docs/specs/`.
Il sert à trancher en amont les décisions qui engagent le modèle de données ou la
sécurité, pour ne pas les découvrir en cours de code.

Convention : chaque point porte une **recommandation**. Réponds par « ok » ou par ta
décision, et j'écris la spec du bloc correspondant.

Ce qui est déjà tranché dans la spec du bloc 1 n'est pas rediscuté ici : deux espaces,
âges minimums, mineurs toujours privés, pas de données de santé, garde-fous sponsors,
« Athlète RUNGEN » anonyme dans les classements publics.

---

## Avant tout : trois décisions transverses

Elles touchent plusieurs blocs, elles viennent donc en premier.

### T1. Signalement et blocage — **manquant dans la spec actuelle**

Le bloc 4 ouvre des fonctions sociales à des mineurs. Or il n'existe aujourd'hui
aucun moyen de signaler un contenu ou de bloquer quelqu'un.

Ce n'est pas seulement une bonne pratique : **Apple l'exige** pour toute app à contenu
généré par les utilisateurs (App Store Review Guidelines, section 1.2), et le refus au
review est systématique sur ce point. Google a une exigence équivalente pour les apps
accessibles aux mineurs.

À décider : où le signalement mène-t-il (le support existant, ou une file dédiée) et
sous quel délai tu t'engages à traiter.

> **Recommandation** : réutiliser `support_threads` avec une catégorie `signalement`,
> traitée en priorité dans la boîte de réception admin. Blocage mutuel et définitif :
> deux comptes bloqués ne se voient plus nulle part, y compris dans les classements.
> À implémenter **au bloc 4, pas après** — c'est bloquant pour la publication.

### T2. Les trois points ouverts du bloc 1

Ils sont listés dans la spec et non tranchés :

| Point | Recommandation |
|---|---|
| Devenir d'un membre RUNGEN à 18 ans | Il reste dans l'espace RUNGEN (défaut déjà écrit). À ses 18 ans il choisit sa visibilité, mais reste invisible du public — sinon la cloison devient poreuse avec le temps. |
| Limite de vérifications de code par appareil | 10 essais par heure et par appareil. Sans ça, les 10 caractères d'un code sont attaquables en série. |
| Conservation des conversations de support anonymisées | 3 ans après la clôture, puis suppression automatique. À inscrire dans l'analyse d'impact RGPD. |

### T3. L'analyse d'impact RGPD (AIPD)

La spec la mentionne comme prérequis à toute intervention, mais elle n'existe pas encore
dans le dépôt. Les blocs 3 à 6 ajoutent des traitements qu'elle doit couvrir : profilage
léger (forme, prédictions), classements, partage d'images.

> **Recommandation** : la rédiger **après validation de ce document** et avant le code du
> bloc 4, pour qu'elle couvre le périmètre réel de la V1 et non le seul bloc 1.

---

## Bloc 2 — Log d'activité manuel

Le geste central de l'app. Tout le reste en dépend : pas de stats sans séances.

### À valider

**2.1 — Ce qu'une séance enregistre.**
Les sports ont déjà deux familles (`distance`, `duree`) et une unité d'allure
(`min_per_km`, `km_per_h`, `min_per_100m`, `none`).

> **Recommandation** : date, sport, durée **toujours**, distance **si famille `distance`**,
> ressenti optionnel (facile / correct / dur), note libre optionnelle (280 caractères,
> filtrée par la liste de mots interdits comme les pseudos). L'allure est **calculée**,
> jamais saisie : une allure saisie et une distance saisie finissent toujours par se
> contredire.

**2.2 — Saisie rétroactive.** Jusqu'où peut-on loguer une séance passée ?

> **Recommandation** : 30 jours en arrière, rien dans le futur. Assez pour rattraper un
> oubli, trop court pour reconstruire un historique fictif avant un défi.

**2.3 — Modification et suppression.** Une séance est-elle modifiable ?

> **Recommandation** : modifiable et supprimable **tant qu'elle ne compte dans aucun
> défi clos**. Au-delà, elle se fige. Sinon un classement peut changer après coup.

**2.4 — Plusieurs sports dans une séance.** Un triathlon, un échauffement + match.

> **Recommandation** : hors V1. Une séance = un sport. Le cas est réel mais rare chez des
> collégiens, et il double la complexité du modèle.

**2.5 — Unités.** Kilomètres et minutes uniquement, ou miles ?

> **Recommandation** : kilomètres et minutes, sans réglage. L'app est en français et
> destinée à la France ; un sélecteur d'unités se paie sur chaque écran.

### À mettre en place

- Migration `activities` : `user_id`, `sport_id` ou `custom_sport_id`, `performed_at`,
  `duration_s`, `distance_m`, `effort`, `note`, dates. RLS : chacun ne voit et n'écrit
  que les siennes.
- Contrainte en base : distance obligatoire si la famille est `distance`, interdite sinon.
- Tests SQL : refus d'une date future, refus au-delà de 30 jours, distance incohérente
  avec la famille, note contenant un mot interdit.
- `src/lib/activite.ts` + tests : calcul d'allure par unité, formatage des durées.

---

## Bloc 3 — Stats, forme et prédictions

### À valider

**3.1 — Ce que « forme » veut dire.** C'est la décision la plus délicate du projet.

Une courbe de forme se calcule d'ordinaire à partir d'une charge d'entraînement
(volume × intensité, lissée sur deux fenêtres). Sans cardio ni puissance — exclus par la
spec — l'intensité ne peut venir que de la durée, de la distance et du ressenti déclaré.

Deux risques : une courbe peu fiable qui décrédibilise l'app, et une dérive vers un
indicateur de bien-être, qui **change la classification de l'app dans les stores** et
alourdit l'AIPD.

> **Recommandation** : appeler ça **« charge d'entraînement »**, pas « forme ». Calcul
> transparent et affiché (moyenne glissante 7 jours contre 28 jours), avec une phrase
> qui dit d'où vient le chiffre. Pas de score de bien-être, pas de conseil de repos,
> pas de « tu es en surentraînement » — ce dernier point ferait basculer l'app côté santé.

**3.2 — Les prédictions.** « Sur ce rythme, tu tiendrais un 10 km en 52:30 » — sur quoi ?

> **Recommandation** : uniquement pour les sports de famille `distance` avec une allure
> en `min_per_km`, à partir des meilleures performances récentes (formule de Riegel,
> simple et vérifiable). Affichée comme **estimation**, jamais comme objectif, et jamais
> à un mineur sans la mention que ça ne remplace pas son prof d'EPS.

**3.3 — Périodes.** Semaine, mois, année ? Comparaison à la période précédente ?

> **Recommandation** : semaine et mois en V1, avec comparaison à la période précédente.
> L'année n'a pas de sens la première année d'existence de l'app.

**3.4 — Records personnels.** Les afficher ?

> **Recommandation** : oui, par sport — distance la plus longue, durée la plus longue,
> meilleure allure. C'est le mécanisme de motivation le moins cher à coder et le plus
> lisible pour un élève. Pas de classement des records entre utilisateurs.

### À mettre en place

- Calcul **dans l'app**, pas en base, tant que les volumes sont faibles : les stats se
  dérivent des séances déjà chargées. Pas de table d'agrégats en V1.
- `src/lib/stats.ts` + tests : charge glissante, records, Riegel, semaines ISO.
- Décision à consigner dans l'AIPD : les prédictions sont un profilage au sens du RGPD,
  même léger.

---

## Bloc 4 — Social

**Le bloc le plus risqué du projet.** C'est lui qui peut casser la cloison entre les
deux espaces.

### À valider

**4.1 — Un élève RUNGEN peut-il devenir ami avec un adulte de l'espace public ?**
La règle actuelle dit que le public ne voit jamais un membre RUNGEN. Une demande d'ami
dans ce sens est donc impossible. Mais dans l'autre sens ?

> **Recommandation** : **non, dans les deux sens, sans exception**. Un membre RUNGEN n'est
> ami qu'avec des membres RUNGEN. Toute porte ouverte ici vide la garantie de son sens,
> et c'est la garantie sur laquelle tu engages les chefs d'établissement.

**4.2 — Amitié entre élèves de collèges différents.**

> **Recommandation** : autorisée. Tous deux sont dans l'espace RUNGEN, tous deux ont une
> autorisation parentale. L'interdire empêcherait les défis inter-établissements du bloc 5.

**4.3 — Comment on trouve quelqu'un.** Recherche par pseudo exact, ou suggestions ?

> **Recommandation** : **pseudo exact uniquement**, jamais de suggestion ni de recherche
> partielle. Une recherche partielle sur un espace de mineurs est un annuaire.

**4.4 — Ce que « amis » débloque.** Aujourd'hui `amis` se comporte comme `prive`.

> **Recommandation** : les amis voient tes séances (sport, durée, distance, date) et tes
> records. Jamais ta date de naissance, jamais ton établissement, jamais ta classe.

**4.5 — Kudos et commentaires.**

> **Recommandation** : kudos oui (un seul geste, rien à modérer). **Commentaires hors V1** :
> du texte libre entre mineurs demande une modération que l'association ne peut pas
> assurer aujourd'hui. C'est la décision qui te coûtera le moins cher plus tard.

### À mettre en place

- Migration `friendships` : demande, acceptation, refus, blocage. RLS stricte, avec
  vérification d'espace **en base** et non dans l'app.
- Migration `activity_kudos`.
- Révision de `public_profiles` et des règles de recherche.
- Signalement et blocage (T1).
- Tests SQL de mutation, dont : un compte public ne peut en aucun cas devenir ami d'un
  compte RUNGEN, même en forgeant la requête.

---

## Bloc 5 — Clubs et challenges

### À valider

**5.1 — Qui crée un club ?**

> **Recommandation** : en V1, **l'admin et les profs d'EPS uniquement**, pour leur
> établissement. Un club créé librement par un élève est un espace de discussion à
> modérer. Les clubs ouverts peuvent attendre la V1.1.

**5.2 — Le défi de classe.** C'est ton meilleur argument auprès d'un établissement.

> **Recommandation** : un prof crée un défi pour une de ses classes, sur une période, avec
> un objectif (km cumulés, nombre de séances, ou temps cumulé). Classement visible des
> seuls membres de la classe. C'est à développer **en premier** dans ce bloc.

**5.3 — Défis inter-établissements.**

> **Recommandation** : oui, mais réservés à l'admin — c'est lui qui a la vue sur plusieurs
> établissements, et c'est cohérent avec le modèle de rôles déjà en place.

**5.4 — Challenges sponsorisés.** Les garde-fous sont déjà écrits dans la spec. Ce qui
n'est pas tranché : **est-ce qu'il y en a en V1 ?**

> **Recommandation** : coder l'interrupteur « visible par les jeunes » et la mention
> « Partenaire », mais **ne lancer aucun challenge sponsorisé avant la V1.1**. Lancer une
> app pour mineurs avec du sponsoring dès le premier jour est un mauvais signal auprès des
> chefs d'établissement, et tu n'as pas encore de partenaire.

**5.5 — Un classement public peut-il contenir un mineur ?** La spec dit oui, sous
« Athlète RUNGEN ».

> **Recommandation** : confirmer, et ajouter que son rang n'est **pas cliquable** et que
> son pseudo n'apparaît **dans aucune infobulle ni aucun export**.

### À mettre en place

- Migrations `clubs`, `club_members`, `challenges`, `challenge_participants`.
- Calcul des classements en base (fonction `security definer`), pour que l'anonymisation
  ne dépende jamais de l'écran.
- Tests SQL : un membre du public qui lit un classement ne récupère jamais l'identifiant
  d'un jeune RUNGEN.

---

## Bloc 6 — Partage

### À valider

**6.1 — Ce que l'image contient.**

> **Recommandation** : sport, distance ou durée, allure, date, logo RUNGEN. **Jamais** :
> vrai nom, établissement, classe, tracé, horaire précis. Pour un mineur, **pas même le
> pseudo** — l'image sort de l'app et échappe à toutes tes règles.

**6.2 — Un mineur peut-il partager ?**

> **Recommandation** : oui, l'image ne l'identifie pas. Avec un écran d'avertissement au
> premier partage, expliquant que l'image quitte l'application.

**6.3 — Partage d'un classement ou d'un défi ?**

> **Recommandation** : hors V1. Un classement partagé contient d'autres personnes que soi.

### À mettre en place

- Génération d'image côté app (`react-native-view-shot` ou une vue rendue hors écran).
- Aucune migration : rien n'est stocké côté serveur.

---

## Ordre de travail recommandé

1. **Tâche 5 du bloc 1 en parallèle, sans attendre** — connexion Google et Apple. Tant
   qu'elle n'est pas faite, aucun bloc n'est testable sur un vrai téléphone.
2. **Bloc 2**, dont tout le reste dépend.
3. **Bloc 3**, qui ne demande aucune migration : rentable et rapide.
4. **Bloc 4 avec signalement et blocage**, le plus sensible, à faire reposé.
5. **Bloc 5**, en commençant par le défi de classe.
6. **Bloc 6**, le plus court.

L'AIPD s'écrit entre le 3 et le 4, quand le périmètre des traitements est stabilisé.

---

## Suivi

| Bloc | Spec | Implémentation |
|---|---|---|
| T1 · signalement et blocage | avec le bloc 4 | à faire |
| T2 · points ouverts du bloc 1 | ci-dessus | à reprendre dans les specs concernées |
| T3 · analyse d'impact RGPD | entre les blocs 3 et 4 | à faire |
| 2 · log d'activité | `docs/specs/2026-09-21-bloc2-log-activite-design.md` | **fait** (base, logique, écrans) |
| 3 · stats et charge | `docs/specs/2026-09-21-bloc3-stats-design.md` | **fait** |
| 4 · social | à écrire | à faire |
| 5 · clubs et défis | à écrire | à faire |
| 6 · partage | à écrire | à faire |
