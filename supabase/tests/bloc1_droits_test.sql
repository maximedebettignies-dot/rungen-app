-- Surface exposée à l'API : qui a le droit d'appeler quoi.
-- Supabase accorde par défaut l'exécution de toute fonction de `public` à `anon`
-- et `authenticated`. Seule la vérification d'un code doit rester ouverte aux
-- visiteurs non connectés (elle précède la connexion dans le parcours RUNGEN) ;
-- tout le reste doit être fermé.
\set ON_ERROR_STOP on
\ir 01_helpers.sql

-- ---------------------------------------------------------------------------
-- 1. `anon` n'appelle que check_invite_code
-- ---------------------------------------------------------------------------
do $$
declare
  v_fuite text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_fuite
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname <> 'check_invite_code'
    and has_function_privilege('anon', p.oid, 'execute');

  if v_fuite is not null then
    raise exception 'ÉCHEC 1 : appelables sans connexion : %', v_fuite;
  end if;
end $$;

do $$ begin
  if not has_function_privilege('anon', 'public.check_invite_code(text)', 'execute') then
    raise exception 'ÉCHEC 1b : la vérification de code doit rester ouverte avant connexion';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Les fonctions de trigger ne sont pas des points d'entrée de l'API
-- ---------------------------------------------------------------------------
do $$
declare
  v_fuite text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_fuite
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prorettype = 'trigger'::regtype
    and (has_function_privilege('anon', p.oid, 'execute')
         or has_function_privilege('authenticated', p.oid, 'execute'));

  if v_fuite is not null then
    raise exception 'ÉCHEC 2 : fonctions de trigger exposées : %', v_fuite;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Les triggers continuent de s'appliquer malgré le retrait des droits
--    (c'est la raison d'être du test : vérifier qu'on n'a pas cassé les règles)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('40000000-0000-0000-0000-000000000001', 'adulte@test.fr'),
  ('40000000-0000-0000-0000-000000000002', 'jeune@test.fr');

select pg_temp.as_user('40000000-0000-0000-0000-000000000001');
insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Adulte_1', '1990-01-01');

-- Le trigger de modération tourne toujours
select pg_temp.expect_error(
  $$insert into public.custom_sports (owner_id, family, name)
    values (auth.uid(), 'duree', 'salope')$$,
  'contenu_interdit');

-- Le trigger d'âge tourne toujours
select pg_temp.as_user('40000000-0000-0000-0000-000000000002');
select pg_temp.expect_error(
  $$insert into public.profiles (id, pseudo, birth_date)
    values (auth.uid(), 'Trop_jeune', '2015-01-01')$$,
  'age_minimum');

-- Le trigger de visibilité forcée tourne toujours
insert into public.profiles (id, pseudo, birth_date, visibility)
values (auth.uid(), 'Mineur_1', '2010-01-01', 'public');
do $$ begin
  if (select visibility from public.profiles where id = auth.uid()) <> 'prive' then
    raise exception 'ÉCHEC 3 : un mineur doit rester en visibilité privée';
  end if;
end $$;

select pg_temp.as_admin();
\echo 'Tests droits : OK'
