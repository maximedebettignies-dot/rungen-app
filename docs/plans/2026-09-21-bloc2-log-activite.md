# Bloc 2 — Log d'activité : plan d'implémentation

Spec de référence : `docs/specs/2026-09-21-bloc2-log-activite-design.md`

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20260921000000_bloc2_activites.sql` | Table `activities`, règles en base, RLS |
| `supabase/tests/bloc2_activites_test.sql` | Tests des règles |
| `src/lib/activite.ts` (+ `.test.ts`) | Allure, formatage, lecture de saisie, fenêtre de saisie |
| `src/lib/seances.ts` | Chargement des séances avec leur sport, cumuls |
| `src/app/(app)/activite/index.tsx` | Formulaire de saisie |
| `src/app/(app)/activite/historique.tsx` | Historique et total du mois |
| `src/app/(app)/activite/[id].tsx` | Détail, correction, suppression |
| `src/app/(app)/index.tsx` | Accueil : totaux de la semaine et dernières séances |

### Tâche 1 : base de données ✅ fait

- [x] Tests écrits et vus en échec avant la migration
- [x] Migration : `activities`, enum `effort`, `famille_sport()`, triggers, RLS
- [x] Règles couvertes : date future, au-delà de 30 jours, distance selon la famille,
      durée hors bornes, note interdite, sport d'autrui, séance verrouillée, lecture
      limitée à son propriétaire, suppression d'un sport encore utilisé
- [x] Appliquée au projet Supabase, historique aligné sur le dépôt
- Commande : `PGHOST=... npm run test:db`

### Tâche 2 : logique d'affichage ✅ fait

- [x] `src/lib/activite.ts` + 15 tests : allure par unité, formatage, lecture de saisie
      française, fenêtre de saisie
- [x] Codes d'erreur du bloc 2 traduits dans `src/lib/errors.ts`, avec tests

### Tâche 3 : écrans ✅ fait

- [x] Onglet Activité : sport parmi ses favoris, date sur 8 jours, durée, distance si la
      famille l'exige, ressenti, note
- [x] Historique avec le total du mois
- [x] Détail d'une séance : correction de la durée, suppression, et explication si elle
      est verrouillée
- [x] Accueil : totaux de la semaine et trois dernières séances
- [x] Vérifié : `tsc --noEmit` et `expo export --platform android`

### Tâche 4 : à vérifier sur appareil

- [ ] Loguer une séance de course, vérifier l'allure affichée
- [ ] Loguer une séance de musculation, vérifier l'absence de champ distance
- [ ] Refus d'une date hors fenêtre
- [ ] Correction puis suppression d'une séance

Bloqué par la tâche 5 du bloc 1 : sans connexion Google ou Apple, aucun test sur
téléphone n'est possible.

## Reste à faire plus tard

- Ouverture de la lecture aux amis : au bloc 4, en remplaçant `activities_select_own`.
- Verrouillage des séances comptées dans un défi clos : au bloc 5, la colonne
  `locked_at` et sa règle sont déjà en place.
