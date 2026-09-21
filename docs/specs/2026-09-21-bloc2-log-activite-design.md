# Bloc 2 — Log d'activité manuel : spec de conception

Statut : validée le 21/09/2026, à partir des décisions de
`docs/plans/2026-09-21-decisions-blocs-2-6.md` (points 2.1 à 2.5).

## Objectif

Permettre à un membre de consigner une séance de sport à la main, et de relire son
historique. C'est le geste central de l'app : sans séances, ni stats (bloc 3), ni
défis (bloc 5), ni partage (bloc 6).

Hors périmètre : suivi GPS en direct et import GPX (V1.1), séance à plusieurs sports
(décision 2.4), données de santé (règle du bloc 1).

## Décisions retenues

| Sujet | Décision |
|---|---|
| Contenu d'une séance | Date, sport, durée toujours ; distance si le sport est de famille `distance` ; ressenti et note optionnels |
| Allure | **Calculée**, jamais saisie |
| Note | 280 caractères, filtrée par la liste de mots interdits, comme les pseudos |
| Saisie rétroactive | 30 jours en arrière, rien dans le futur |
| Modification et suppression | Libres tant que la séance n'est pas verrouillée par un défi clos (bloc 5) |
| Sports par séance | Un seul |
| Unités affichées | Kilomètres et minutes, sans réglage |

## Modèle de données

Nouvelle table `activities` :

- `id`, `user_id`
- `sport_id` **ou** `custom_sport_id` — exactement un des deux, comme `favorite_sports`
- `performed_on` (`date`) — le jour de la séance, pas l'horodatage : un élève loge le soir
  une séance du matin, et l'heure exacte n'apporte rien tout en étant une donnée de plus
- `duration_s` (`int`) — entre 1 minute et 24 heures
- `distance_m` (`int`, nullable) — obligatoire si famille `distance`, interdite sinon
- `effort` (`facile` | `correct` | `dur`, nullable)
- `note` (`text`, nullable, 280 caractères)
- `locked_at` (`timestamptz`, nullable) — posé par le bloc 5 à la clôture d'un défi
- `created_at`, `updated_at`

Le stockage est en unités SI (mètres, secondes) ; la conversion en kilomètres et minutes
est faite à l'affichage. Cela évite d'avoir à migrer si un jour une autre unité apparaît.

### Pourquoi `on delete restrict` sur les sports

Un sport perso supprimé ne doit pas emporter les séances qui le référencent : ce serait
une perte de données silencieuse. La suppression d'un sport perso encore utilisé est donc
refusée par la base, et l'app l'explique.

## Règles métier (appliquées en base)

- **Date** : `performed_on` ne peut être ni dans le futur, ni antérieure à 30 jours.
- **Distance et famille** : présente si et seulement si le sport est de famille `distance`.
  La famille est lue en base, depuis `sports` ou `custom_sports` — l'app ne la fournit pas.
- **Durée** : entre 60 secondes et 86 400 secondes.
- **Note** : filtrée par `contains_banned_word`, comme les pseudos et les sports perso.
- **Sport d'autrui** : impossible de rattacher une séance à un sport perso qu'on ne possède
  pas.
- **Verrouillage** : une séance verrouillée n'est ni modifiable ni supprimable.
- **Visibilité** : en V1, chacun ne voit que ses propres séances. L'ouverture aux amis vient
  au bloc 4 et modifiera la policy de lecture, pas la table.

## Calculs dans l'app

`src/lib/activite.ts`, testé, miroir d'aucune fonction SQL (ces calculs ne sont
qu'affichage) :

- Allure selon `pace_unit` du sport : `min_per_km`, `km_per_h`, `min_per_100m`, ou aucune.
- Formatage d'une durée (`42 min`, `1 h 30`) et d'une distance (`8,2 km`).
- Lecture d'une saisie française : virgule décimale acceptée pour la distance.
- Fenêtre de saisie : quelles dates sont proposées et acceptées.

## Écrans

- **Onglet Activité** — formulaire de saisie : sport parmi ses favoris, date (aujourd'hui
  par défaut, jusqu'à 30 jours en arrière), durée, distance si la famille l'exige, ressenti,
  note. Après enregistrement, un écran de confirmation.
- **Historique** — les séances par date décroissante, avec le total du mois. Une séance
  s'ouvre en détail, où elle peut être modifiée ou supprimée si elle n'est pas verrouillée.
- **Accueil** — les trois dernières séances, en remplacement du bloc d'attente actuel.

## Gestion des erreurs

| Code SQL | Message |
|---|---|
| `date_future` | « Cette séance est dans le futur. » |
| `date_trop_ancienne` | « On ne peut loguer que les 30 derniers jours. » |
| `distance_requise` | « Ce sport se mesure en distance : indique combien de kilomètres. » |
| `distance_interdite` | « Ce sport se mesure en durée : la distance ne s'applique pas. » |
| `duree_invalide` | « La durée doit être comprise entre 1 minute et 24 heures. » |
| `contenu_interdit` | Message existant du bloc 1 |
| `activite_verrouillee` | « Cette séance compte dans un défi terminé : elle ne peut plus être modifiée. » |
| `sport_inconnu` | « Ce sport n'existe pas ou ne t'appartient pas. » |

## Tests

- **SQL** : date future, date au-delà de 30 jours, distance manquante ou en trop selon la
  famille, durée hors bornes, note interdite, sport perso d'un autre utilisateur, séance
  verrouillée, lecture limitée à son propriétaire, suppression d'un sport perso encore
  utilisé.
- **TypeScript** : allure par unité, formatage, lecture de saisie française, fenêtre de
  saisie (dont le passage de mois et les années bissextiles).

## Points ouverts

- Faut-il un rappel quotidien pour loguer sa séance ? Les notifications ne sont pas au
  périmètre de la V1 et demanderaient leur propre passage dans l'analyse d'impact.
- Faut-il autoriser une durée sans distance pour un sport de famille `distance` (une sortie
  vélo sans compteur) ? Retenu comme **non** en V1, par cohérence avec la règle ci-dessus ;
  à rouvrir si les premiers retours le demandent.
