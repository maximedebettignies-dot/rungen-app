#!/usr/bin/env bash
# Lance chaque fichier de test SQL sur une base Postgres locale jetable et neuve.
# Usage : PGHOST=localhost PGPORT=5432 PGUSER=postgres bash supabase/tests/run.sh
set -euo pipefail
shopt -s nullglob
cd "$(dirname "$0")/.."
DB=rungen_test
status=0
for t in tests/*_test.sql; do
  psql -q -c "drop database if exists $DB" postgres 2>/dev/null
  psql -q -c "create database $DB" postgres
  psql -q -v ON_ERROR_STOP=1 -d $DB -f tests/00_supabase_mock.sql
  for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d $DB -f "$f"; done
  if out=$(cd tests && psql -q -v ON_ERROR_STOP=1 -d $DB -f "$(basename "$t")" 2>&1); then
    echo "OK   $t"
  else
    echo "FAIL $t"; echo "$out" | grep -E "ERROR|ÉCHEC" | head -3; status=1
  fi
done
exit $status
