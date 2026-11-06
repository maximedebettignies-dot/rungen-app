# Restructuration RPG : ce qu'il faut trancher avant de coder

Statut : **à valider avec Maxime**. Écrit le 06/11/2026, à partir de la direction
donnée : quêtes quotidiennes, expérience, niveaux, personnage, boutique et bons de
réduction partenaires.

L'idée est bonne et bien étayée : la gamification de l'activité physique des
adolescents est l'une des rares interventions dont l'effet est documenté. Ce document
ne discute pas le principe. Il isole **ce qui doit être décidé avant la première ligne
de code**, parce que trois points engagent le projet entier.

---

## Ce qui ne change pas

- **Les trois espaces.** Utilisateur, encadrement (prof d'EPS, borné à son
  établissement) et administration existent déjà, avec leurs rôles et leur double
  authentification. Aucune migration là-dessus.
- **La cloison.** Le public ne voit jamais un membre RUNGEN. Un classement, une
  boutique ou un profil de personnage n'y change rien et doit s'y plier.
- **Les séances.** `activities` reste la source unique. Une quête se **vérifie** sur
  des séances, elle ne se déclare pas.
- **Les règles en base.** L'expérience, les niveaux et les récompenses se calculent en
  base. L'app ne les envoie jamais — voir R3.

---

## Ce qui change

Une couche de jeu par-dessus les séances : quêtes du jour, expérience, niveau, rang,
monnaie, boutique cosmétique, et éventuellement bons partenaires. Les écrans Accueil et
Stats sont réécrits autour d'elle ; le log d'activité et le chronomètre restent le geste
central, mais cessent d'être l'écran d'arrivée.

---

## R1. Les bons de réduction partenaires — la décision la plus lourde

Des bons ayant une valeur réelle, gagnés par des enfants de 11 à 14 ans, ce n'est pas
une fonctionnalité de plus. C'est un changement de nature de l'application.

Trois conséquences, aucune négociable :

- **Les stores.** Une app orientée enfants est sévèrement encadrée par Apple comme par
  Google sur le commerce et la publicité de tiers. Un bon de réduction d'un commerce
  local, servi à un collégien, est de la publicité pour un tiers.
- **Le discours aux établissements.** Ton argumentaire repose sur la sobriété :
  association, gratuit, pas de pub, pas de données de santé. Un chef d'établissement qui
  découvre que l'app distribue des bons de commerçants à ses élèves se demandera qui
  paie, et pourquoi.
- **Le RGPD.** Un bon utilisable en boutique crée un lien entre un compte et un
  commerçant. C'est une communication à un tiers, à documenter dans l'AIPD.

> **Recommandation : les bons partenaires sont réservés à l'espace public (15 ans et
> plus). Jamais dans l'espace RUNGEN.** Les élèves gagnent de l'expérience, des niveaux,
> des objets cosmétiques et des défis de classe — ce qui motive à cet âge bien plus
> qu'un bon de 10 %. Tu gardes le levier commercial là où il ne coûte rien, et tu gardes
> ton argumentaire intact là où il compte.

> **Recommandation corollaire : aucun achat en argent réel, nulle part, en V1.** La
> boutique ne s'achète qu'avec la monnaie gagnée. Pas d'achat intégré, donc pas de
> gestion de paiement, pas de catégorie commerciale, pas de parent qui découvre un
> débit.

---

## R2. Le plafond quotidien — ce qui empêche le jeu de se retourner contre toi

« Plus tu en fais, plus tu gagnes » appliqué sans limite à des adolescents, avec des
récompenses à la clé, est exactement le mécanisme qui produit de la pratique
compulsive. Le projet s'interdit déjà d'alerter sur le surentraînement, faute des
données qui le permettraient. Il serait contradictoire d'ajouter un moteur qui l'encourage.

> **Recommandation : l'expérience quotidienne est plafonnée à la recommandation de
> l'OMS** — 60 minutes pour les moins de 18 ans, 30 pour les adultes. Au-delà, la séance
> est enregistrée, elle compte dans les stats et les records, mais elle ne rapporte plus.

Ce plafond n'est pas qu'une précaution. Il est **élégant** :

- il aligne le jeu sur l'objectif de santé publique au lieu de le dévoyer ;
- il se défend en une phrase devant un professeur, un parent ou un DPO ;
- il rend la triche peu rentable, ce qui règle une partie de R3 sans rien coder.

> **Recommandation : pas de punition de série pour les mineurs.** Une série qui se brise
> et fait tout perdre culpabilise un enfant malade ou en vacances. La série se met en
> pause, elle ne s'effondre pas.

---

## R3. La triche devient un vrai problème

En septembre, j'avais soutenu que la falsification était un problème social plutôt que
technique, parce que rien n'était en jeu. **Cette restructuration invalide cet
argument** : dès qu'une récompense a de la valeur, il y a un gain à tricher.

Trois mesures deviennent nécessaires, et non plus optionnelles :

1. **L'expérience est calculée en base, jamais envoyée par l'app.** Un déclencheur sur
   `activities` l'attribue. Une app qui enverrait son propre total serait triviale à
   contourner — c'est la faille classique de ce genre de système.
2. **Des bornes de plausibilité** en base : allure, vitesse, durée quotidienne cumulée.
   Elles étaient « à glisser dans le bloc 5 » ; elles passent devant.
3. **La visibilité du professeur** sur les séances de sa classe, qui reste le filet le
   plus efficace.

Le plafond de R2 fait le reste du travail : on ne triche pas longtemps pour un gain
borné à 60 minutes par jour.

---

## Le modèle proposé : niveau et rang sont deux choses différentes

C'est le cœur de la conception, et il répond directement à ton intention (« plus tu fais
du sport de façon régulière »).

| | **Niveau** | **Rang** |
|---|---|---|
| Mesure | Expérience cumulée depuis l'inscription | Régularité sur les 28 derniers jours |
| Évolution | Ne redescend **jamais** | Monte et descend |
| Rôle | Le sentiment de progresser | Le **multiplicateur** de récompenses |

Un niveau qui redescend décourage ; une récompense qui ne dépend que du cumul se farme
une fois puis se rente à vie. En séparant les deux, le joueur garde ses acquis mais doit
rester régulier pour gagner beaucoup — ce que tu décris exactement.

Le rang se calcule sur le **nombre de jours actifs** sur 28, pas sur le volume. Un élève
qui bouge 30 minutes six jours sur sept vaut mieux, pour la santé publique comme pour le
jeu, qu'un élève qui fait trois heures le dimanche.

---

## Les quêtes

- **Trois par jour**, tirées d'un catalogue.
- **Tirage déterministe** à partir de l'identifiant du compte et de la date : aucune
  tâche planifiée, aucune ligne écrite tant que la quête n'est pas accomplie. C'est ce
  qui permet de rester sur un hébergement d'association.
- **Vérifiées sur les séances**, jamais déclarées. Une quête « 10 minutes de
  méditation » suppose donc d'ajouter la méditation au catalogue des sports, en famille
  `duree` — ce qui ne crée aucune donnée de santé : c'est une activité, pas un état.
- Familles de quêtes : durée totale, un sport de distance, un sport que tu n'as pas fait
  cette semaine, loguer avant une certaine heure, trois jours d'affilée.

---

## Ce que ça déplace dans le plan V1

| Bloc | Devient |
|---|---|
| 4 · Social | **Réduit.** Un classement de classe et des quêtes couvrent une partie de ce que les amis apportaient. Le **signalement et le blocage restent obligatoires** dès qu'il y a du contenu entre utilisateurs — pseudo, personnage, classement. Apple refuse sans. |
| 5 · Clubs et défis | **Fusionne** avec la couche de jeu : un défi de classe est une quête collective. |
| 6 · Partage | Inchangé, et plus intéressant : on partage un niveau atteint. |
| **Nouveau** | Bloc jeu : quêtes, expérience, niveau, rang, monnaie, boutique. |

L'AIPD doit être écrite **avant** ce bloc, pas après : le profil de jeu (niveau, rang,
historique de quêtes) est du profilage, et les bons partenaires une communication à des
tiers.

---

## À trancher

1. **R1** — bons partenaires réservés aux adultes ? *(recommandé : oui)*
2. **R1 bis** — aucun achat en argent réel en V1 ? *(recommandé : oui)*
3. **R2** — plafond quotidien à la recommandation OMS ? *(recommandé : oui)*
4. **Le rang gouverne-t-il les récompenses**, le niveau ne servant qu'à la progression ?
   *(recommandé : oui)*
5. **La boutique cosmétique** : avatar dessiné dans l'app, ou illustrations ? La seconde
   demande un budget graphique et des droits d'usage.
6. **Le classement** : à l'échelle de la classe uniquement, ou aussi entre
   établissements ? Un classement nominatif entre mineurs mérite d'être discuté avant
   d'être codé.
