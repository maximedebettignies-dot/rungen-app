#!/usr/bin/env bash
# Lance les tests SQL sur une base Postgres locale jetable.
# Usage : PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
shopt -s nullglob
cd "$(dirname "$0")/.."
DB=rungen_test
psql -q -c "drop database if exists $DB" -c "create database $DB" postgres
psql -q -v ON_ERROR_STOP=1 -d $DB -f tests/00_supabase_mock.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d $DB -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d $DB -f tests/bloc1_test.sql
