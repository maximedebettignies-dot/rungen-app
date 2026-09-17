-- Simule la situation d'un vrai projet Supabase au moment du `db push` :
--   * storage.objects appartient à supabase_storage_admin, pas à postgres ;
--   * les migrations sont appliquées par `postgres`, qui n'est PAS superutilisateur
--     mais est membre de supabase_storage_admin.
create schema if not exists extensions;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin; end if;
end $$;
create schema if not exists auth authorization supabase_auth_admin;
set role supabase_auth_admin;
create table if not exists auth.users (id uuid primary key, email text, banned_until timestamptz);
reset role;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then
    create role supabase_storage_admin nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'migrateur') then
    create role migrateur nologin; end if;
end $$;
grant usage on schema public, auth, extensions to anon, authenticated;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

create schema if not exists storage authorization supabase_storage_admin;
set role supabase_storage_admin;
create table storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  created_at timestamptz not null default now());
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text not null references storage.buckets (id),
  name text not null, owner uuid, created_at timestamptz not null default now(),
  unique (bucket_id, name));
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant all on storage.objects to anon, authenticated;
grant select, insert on storage.buckets to anon, authenticated;
reset role;

-- `postgres` du projet : membre de supabase_storage_admin, sans superutilisateur.
grant supabase_storage_admin, supabase_auth_admin to migrateur;
grant anon, authenticated to migrateur;
grant create, usage on schema public, extensions to migrateur;
alter schema public owner to migrateur;
