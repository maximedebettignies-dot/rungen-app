#!/usr/bin/env bash
# Vérifie que les migrations passent dans les conditions d'un VRAI projet Supabase,
# avant tout `supabase db push`. Ce que les tests de `supabase/tests/` ne couvrent pas :
#   * les migrations sont appliquées par `postgres`, qui n'est pas superutilisateur ;
#   * `storage.objects` appartient à `supabase_storage_admin` ;
#   * `auth.users` appartient à `supabase_auth_admin`.
# Les policies et clés étrangères ne passent que par l'appartenance à ces rôles :
# c'est précisément ce qu'on veut voir échouer ici plutôt qu'en production.
#
# Usage : PGHOST=localhost PGPORT=5432 PGUSER=postgres bash supabase/preflight/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=rungen_preflight

psql -q -c "drop database if exists $DB" postgres 2>/dev/null || true
psql -q -c "create database $DB" postgres
psql -q -v ON_ERROR_STOP=1 -d $DB -f supabase/preflight/00_projet_supabase.sql 2>&1 | grep -vE "NOTICE|^$" || true
# Sur Supabase, `postgres` a le droit de créer une extension : on la pose en amont
# pour que le `create extension if not exists` des migrations soit un no-op.
psql -q -v ON_ERROR_STOP=1 -d $DB -c "create extension if not exists unaccent with schema extensions"

statut=0
for f in supabase/migrations/*.sql; do
  if sortie=$(psql -v ON_ERROR_STOP=1 -d $DB -c "set role migrateur" -f "$f" 2>&1); then
    echo "OK    $(basename "$f")"
  else
    echo "FAIL  $(basename "$f")"
    echo "$sortie" | grep -E "ERROR|FATAL" | head -3
    statut=1
  fi
done
exit $statut
