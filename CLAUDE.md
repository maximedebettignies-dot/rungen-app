# CLAUDE.md — contexte du projet

App mobile open source de suivi sportif grand public ("Strava premium gratuit"), portée par l'association RUNGEN (loi 1901). Interface et messages en français.

## Où lire avant de coder

- Spec du bloc en cours : `docs/specs/`
- Plan de travail (cases à cocher) : `docs/plans/`
- Toute nouvelle fonctionnalité passe par une spec validée avec Maxime avant le code.

## Stack

- App : Expo + Expo Router + TypeScript, iOS et Android. Identifiant stores : `fr.rungen.app`.
- Backend : Supabase (région UE). Connexion Google (iOS + Android) et Apple (iOS) via `signInWithIdToken`.

## Règles non négociables

- Les règles sensibles sont appliquées **en base** (triggers + RLS), l'app ne fait que les refléter.
- Âge minimum 15 ans ; mineurs (15–17) toujours en visibilité `prive` ; date de naissance jamais exposée aux autres et non modifiable.
- Visibilité par défaut des adultes : `amis`.
- Suppression de compte possible depuis l'app (Apple + RGPD).
- Pas de données de santé (poids, cardio) en V1.

## Méthode

- TDD : test écrit et vu en échec avant le code.
- Toute modification de la base = nouvelle migration dans `supabase/migrations/` (ne jamais modifier une migration déjà appliquée) + tests dans `supabase/tests/`.

## Commandes

- Tests logique d'âge : `node --experimental-strip-types --test src/lib/age.test.ts`
- Tests base (Postgres local) : `PGHOST=localhost PGPORT=5432 PGUSER=postgres bash supabase/tests/run.sh`

## Découpage V1

1. Fondations (en cours) · 2. Log d'activité manuel · 3. Stats, forme, prédictions · 4. Social · 5. Clubs et challenges · 6. Partage.
Hors V1 : GPS et import GPX (V1.1), coach IA payant, pubs.
