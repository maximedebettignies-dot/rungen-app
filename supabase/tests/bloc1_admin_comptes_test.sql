-- Tests de la recherche de compte par code (retrait d'accord parental).
\set ON_ERROR_STOP on
\ir 01_helpers.sql

insert into auth.users (id, email) values
  ('30000000-0000-0000-0000-000000000001', 'admin@rungen.fr'),
  ('30000000-0000-0000-0000-000000000002', 'prof-a@test.fr'),
  ('30000000-0000-0000-0000-000000000003', 'eleve-a@test.fr'),
  ('30000000-0000-0000-0000-000000000004', 'prof-b@test.fr'),
  ('30000000-0000-0000-0000-000000000005', 'public@test.fr');

select pg_temp.as_user('30000000-0000-0000-0000-000000000001');
insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Maxime', '1999-01-01');
select pg_temp.as_user('30000000-0000-0000-0000-000000000005');
insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Public_1', '1990-01-01');

select pg_temp.as_admin();
insert into public.staff_roles (user_id, role) values ('30000000-0000-0000-0000-000000000001', 'admin');

select pg_temp.as_user('30000000-0000-0000-0000-000000000001', 'aal2');
insert into public.establishments (name, city) values ('Collège A', 'Domont'), ('Collège B', 'Domont');
create temp table etabs as
  select (select id from public.establishments where name = 'Collège A') as a,
         (select id from public.establishments where name = 'Collège B') as b;
grant select on etabs to authenticated, anon;

create temp table code_eleve as
  select code from public.generate_invite_codes((select a from etabs), '6e B', 1);
grant select on code_eleve to authenticated, anon;
select public.activate_invite_code((select id from public.invite_codes where code = (select code from code_eleve)));

create temp table code_prof_a as
  select code from public.generate_invite_codes((select a from etabs), null, 1, 'prof_eps');
grant select on code_prof_a to authenticated, anon;
create temp table code_prof_b as
  select code from public.generate_invite_codes((select b from etabs), null, 1, 'prof_eps');
grant select on code_prof_b to authenticated, anon;

-- Les profs et l'élève créent leur compte
select pg_temp.as_user('30000000-0000-0000-0000-000000000002');
select public.create_staff_profile((select code from code_prof_a), 'Prof_A', '1985-01-01');
select pg_temp.as_user('30000000-0000-0000-0000-000000000004');
select public.create_staff_profile((select code from code_prof_b), 'Prof_B', '1985-01-01');
select pg_temp.as_user('30000000-0000-0000-0000-000000000003');
select public.create_rungen_profile((select code from code_eleve), 'Eleve_A', '2012-04-01', true);

-- ---------------------------------------------------------------------------
-- 1. L'admin en double authentification retrouve le compte derrière un code
-- ---------------------------------------------------------------------------
select pg_temp.as_user('30000000-0000-0000-0000-000000000001', 'aal2');
do $$
declare r record;
begin
  select * into r from public.find_account_by_code((select code from code_eleve));
  if r.user_id <> '30000000-0000-0000-0000-000000000003' then
    raise exception 'ÉCHEC 1a : mauvais compte retrouvé';
  end if;
  if r.pseudo <> 'Eleve_A' or r.space <> 'rungen' then
    raise exception 'ÉCHEC 1b : pseudo ou espace incorrect (% / %)', r.pseudo, r.space;
  end if;
  if r.establishment_name <> 'Collège A' or r.class_label <> '6e B' then
    raise exception 'ÉCHEC 1c : établissement ou classe incorrects';
  end if;
  if r.disabled_at is not null then raise exception 'ÉCHEC 1d : compte actif attendu'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. La désactivation est visible dans le résultat
-- ---------------------------------------------------------------------------
select public.admin_set_account_disabled('30000000-0000-0000-0000-000000000003', true);
do $$
declare r record;
begin
  select * into r from public.find_account_by_code((select code from code_eleve));
  if r.disabled_at is null then raise exception 'ÉCHEC 2a : désactivation non reflétée'; end if;
end $$;
select public.admin_set_account_disabled('30000000-0000-0000-0000-000000000003', false);
do $$
declare r record;
begin
  select * into r from public.find_account_by_code((select code from code_eleve));
  if r.disabled_at is not null then raise exception 'ÉCHEC 2b : réactivation non reflétée'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Un code inconnu ou pas encore utilisé ne renvoie rien
-- ---------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from public.find_account_by_code('ZZZZZZZZZZ')) then
    raise exception 'ÉCHEC 3a : un code inconnu renvoie un compte';
  end if;
  if exists (select 1 from public.find_account_by_code((select code from code_prof_b))
             where user_id is null) then
    raise exception 'ÉCHEC 3b : résultat incohérent';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Sans double authentification, l'admin n'a rien
-- ---------------------------------------------------------------------------
select pg_temp.as_user('30000000-0000-0000-0000-000000000001', 'aal1');
select pg_temp.expect_error(
  $$select * from public.find_account_by_code((select code from code_eleve))$$,
  'encadrant_requis');

-- ---------------------------------------------------------------------------
-- 5. Un prof ne voit que les comptes de son établissement
-- ---------------------------------------------------------------------------
select pg_temp.as_user('30000000-0000-0000-0000-000000000002', 'aal2');
do $$
declare r record;
begin
  select * into r from public.find_account_by_code((select code from code_eleve));
  if r.user_id <> '30000000-0000-0000-0000-000000000003' then
    raise exception 'ÉCHEC 5a : le prof du Collège A devrait voir son élève';
  end if;
end $$;
select pg_temp.as_user('30000000-0000-0000-0000-000000000004', 'aal2');
do $$ begin
  if exists (select 1 from public.find_account_by_code((select code from code_eleve))) then
    raise exception 'ÉCHEC 5b : un prof voit un élève d''un autre établissement';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. RÈGLE CRITIQUE : un membre du public n'a aucun accès
-- ---------------------------------------------------------------------------
select pg_temp.as_user('30000000-0000-0000-0000-000000000005', 'aal2');
select pg_temp.expect_error(
  $$select * from public.find_account_by_code((select code from code_eleve))$$,
  'encadrant_requis');
select pg_temp.expect_error(
  $$select public.admin_set_account_disabled('30000000-0000-0000-0000-000000000003', true)$$,
  'admin_requis');

-- ---------------------------------------------------------------------------
-- 7. Seul l'admin supprime un compte ; le prof ne peut pas
-- ---------------------------------------------------------------------------
select pg_temp.as_user('30000000-0000-0000-0000-000000000002', 'aal2');
select pg_temp.expect_error(
  $$select public.admin_delete_account('30000000-0000-0000-0000-000000000003')$$,
  'admin_requis');
select pg_temp.as_user('30000000-0000-0000-0000-000000000001', 'aal2');
select public.admin_delete_account('30000000-0000-0000-0000-000000000003');
-- La vérification lit auth.users : hors RLS, donc en dehors du rôle authenticated.
select pg_temp.as_admin();
do $$ begin
  if exists (select 1 from auth.users where id = '30000000-0000-0000-0000-000000000003') then
    raise exception 'ÉCHEC 7 : le compte n''a pas été supprimé';
  end if;
end $$;

select pg_temp.as_admin();
\echo 'Tests comptes admin : OK'
