-- Tests du bloc 2 : log d'activité manuel.
\set ON_ERROR_STOP on
\ir 01_helpers.sql

insert into auth.users (id, email) values
  ('50000000-0000-0000-0000-000000000001', 'adulte@test.fr'),
  ('50000000-0000-0000-0000-000000000002', 'autre@test.fr');

select pg_temp.as_user('50000000-0000-0000-0000-000000000001');
insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Coureur_1', '1990-01-01');
select pg_temp.as_user('50000000-0000-0000-0000-000000000002');
insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Coureur_2', '1990-01-01');

-- Repères : un sport de distance, un sport de durée, un sport perso par utilisateur.
create temp table refs as
  select (select id from public.sports where slug = 'course') as course,
         (select id from public.sports where slug = 'musculation') as muscu;
grant select on refs to authenticated, anon;

select pg_temp.as_user('50000000-0000-0000-0000-000000000001');
insert into public.custom_sports (owner_id, name, family) values (auth.uid(), 'Ultimate', 'duree');
select pg_temp.as_user('50000000-0000-0000-0000-000000000002');
insert into public.custom_sports (owner_id, name, family) values (auth.uid(), 'Bike-polo', 'distance');

-- Hors RLS pour lire les deux sports perso : chacun n'est visible que de son
-- propriétaire, c'est précisément ce que le bloc 1 garantit.
select pg_temp.as_admin();
create temp table persos as
  select (select id from public.custom_sports where name = 'Ultimate') as ultimate,
         (select id from public.custom_sports where name = 'Bike-polo') as polo;
grant select on persos to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 1. Une séance valide de chaque famille
-- ---------------------------------------------------------------------------
select pg_temp.as_user('50000000-0000-0000-0000-000000000001');
insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m, effort, note)
values (auth.uid(), (select course from refs), current_date, 2530, 8200, 'correct', 'Sortie tranquille');

insert into public.activities (user_id, sport_id, performed_on, duration_s)
values (auth.uid(), (select muscu from refs), current_date - 3, 3600);

insert into public.activities (user_id, custom_sport_id, performed_on, duration_s)
values (auth.uid(), (select ultimate from persos), current_date - 1, 5400);

do $$ begin
  if (select count(*) from public.activities) <> 3 then
    raise exception 'ÉCHEC 1 : 3 séances attendues';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Dates : ni futur, ni au-delà de 30 jours
-- ---------------------------------------------------------------------------
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m)
    values (auth.uid(), (select course from refs), current_date + 1, 1800, 5000)$$,
  'date_future');

select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m)
    values (auth.uid(), (select course from refs), current_date - 31, 1800, 5000)$$,
  'date_trop_ancienne');

-- La borne exacte à 30 jours passe.
insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m)
values (auth.uid(), (select course from refs), current_date - 30, 1800, 5000);

-- ---------------------------------------------------------------------------
-- 3. Distance et famille du sport
-- ---------------------------------------------------------------------------
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s)
    values (auth.uid(), (select course from refs), current_date, 1800)$$,
  'distance_requise');

select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m)
    values (auth.uid(), (select muscu from refs), current_date, 1800, 4000)$$,
  'distance_interdite');

-- Même règle pour un sport perso : Ultimate est de famille durée.
select pg_temp.expect_error(
  $$insert into public.activities (user_id, custom_sport_id, performed_on, duration_s, distance_m)
    values (auth.uid(), (select ultimate from persos), current_date, 1800, 4000)$$,
  'distance_interdite');

-- ---------------------------------------------------------------------------
-- 4. Durée hors bornes
-- ---------------------------------------------------------------------------
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m)
    values (auth.uid(), (select course from refs), current_date, 30, 5000)$$,
  'duree_invalide');

select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m)
    values (auth.uid(), (select course from refs), current_date, 90000, 5000)$$,
  'duree_invalide');

-- ---------------------------------------------------------------------------
-- 5. Note filtrée par la liste de mots interdits
-- ---------------------------------------------------------------------------
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m, note)
    values (auth.uid(), (select course from refs), current_date, 1800, 5000, 'quelle salope de cote')$$,
  'contenu_interdit');

-- ---------------------------------------------------------------------------
-- 6. Exactement un sport, et jamais celui d'un autre
-- ---------------------------------------------------------------------------
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, custom_sport_id, performed_on, duration_s)
    values (auth.uid(), (select muscu from refs), (select ultimate from persos), current_date, 1800)$$,
  'activity_one_sport');

select pg_temp.expect_error(
  $$insert into public.activities (user_id, performed_on, duration_s)
    values (auth.uid(), current_date, 1800)$$,
  'activity_one_sport');

-- Bike-polo appartient à l'autre utilisateur.
select pg_temp.expect_error(
  $$insert into public.activities (user_id, custom_sport_id, performed_on, duration_s, distance_m)
    values (auth.uid(), (select polo from persos), current_date, 1800, 5000)$$,
  'row-level security');

-- ---------------------------------------------------------------------------
-- 7. RÈGLE CRITIQUE : chacun ne voit que ses propres séances
-- ---------------------------------------------------------------------------
select pg_temp.as_user('50000000-0000-0000-0000-000000000002');
do $$ begin
  if exists (select 1 from public.activities) then
    raise exception 'ÉCHEC 7a : les séances d''un autre utilisateur sont visibles';
  end if;
end $$;

insert into public.activities (user_id, custom_sport_id, performed_on, duration_s, distance_m)
values (auth.uid(), (select polo from persos), current_date, 2400, 12000);

do $$ begin
  if (select count(*) from public.activities) <> 1 then
    raise exception 'ÉCHEC 7b : chacun ne doit voir que la sienne';
  end if;
end $$;

-- Et on n'écrit pas pour le compte d'un autre.
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m)
    values ('50000000-0000-0000-0000-000000000001', (select course from refs), current_date, 1800, 5000)$$,
  'row-level security');

-- ---------------------------------------------------------------------------
-- 8. Modification et suppression : libres tant que la séance n'est pas verrouillée
-- ---------------------------------------------------------------------------
select pg_temp.as_user('50000000-0000-0000-0000-000000000001');
update public.activities set duration_s = 2700
where sport_id = (select course from refs) and performed_on = current_date;

-- Le verrouillage est posé par le bloc 5, hors du rôle authenticated.
select pg_temp.as_admin();
update public.activities set locked_at = now()
where user_id = '50000000-0000-0000-0000-000000000001'
  and sport_id = (select course from refs) and performed_on = current_date;

select pg_temp.as_user('50000000-0000-0000-0000-000000000001');
select pg_temp.expect_error(
  $$update public.activities set duration_s = 3000
    where sport_id = (select course from refs) and performed_on = current_date$$,
  'activite_verrouillee');

select pg_temp.expect_error(
  $$delete from public.activities
    where sport_id = (select course from refs) and performed_on = current_date$$,
  'activite_verrouillee');

-- Une séance non verrouillée se supprime.
delete from public.activities where sport_id = (select muscu from refs);
do $$ begin
  if exists (select 1 from public.activities where sport_id = (select muscu from refs)) then
    raise exception 'ÉCHEC 8 : la séance aurait dû être supprimée';
  end if;
end $$;

-- L'utilisateur ne peut pas verrouiller ni déverrouiller lui-même.
select pg_temp.expect_error(
  $$update public.activities set locked_at = null
    where sport_id = (select course from refs) and performed_on = current_date$$,
  'activite_verrouillee');

-- ---------------------------------------------------------------------------
-- 9. Un sport perso encore utilisé ne peut pas être supprimé
-- ---------------------------------------------------------------------------
select pg_temp.expect_error(
  $$delete from public.custom_sports where id = (select ultimate from persos)$$,
  'violates foreign key constraint');

select pg_temp.as_admin();
\echo 'Tests bloc 2 : OK'
