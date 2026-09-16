# RUNGEN — app de suivi sportif open source

App mobile gratuite pour loguer ses activités, suivre sa forme et relever des challenges entre amis. Portée par l'association RUNGEN (loi 1901).

## Où en est le projet

V1 découpée en 6 blocs. **Bloc 1 (Fondations)** : base de données et règles de sécurité faites et testées, app mobile à construire.

- Conception : `docs/specs/2026-09-10-bloc1-fondations-design.md`
- Plan de travail : `docs/plans/2026-09-10-bloc1-fondations.md`

## Lancer les tests

Logique d'âge (Node 22+) :

    node --experimental-strip-types --test src/lib/age.test.ts

Règles de la base (Postgres 15+ local) :

    PGHOST=localhost PGPORT=5432 PGUSER=postgres bash supabase/tests/run.sh

Le script crée une base jetable `rungen_test` pour chaque fichier de test, simule Supabase, applique les migrations puis lance les tests. Il affiche `OK` ou `FAIL` par fichier et renvoie un code d'erreur en cas d'échec.
