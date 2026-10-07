-- Tests du chronomètre et du mode hors-ligne, côté base.
--
-- Deux changements seulement : la distance devient facultative, et une séance
-- dit comment elle a été produite. Tout le reste du bloc 2 est inchangé, et ces
-- tests le vérifient aussi — un assouplissement est l'occasion habituelle d'en
-- relâcher d'autres sans le vouloir.
\set ON_ERROR_STOP on
\ir 01_helpers.sql

insert into auth.users (id, email) values ('60000000-0000-0000-0000-000000000001', 'coureur@test.fr');
select pg_temp.as_user('60000000-0000-0000-0000-000000000001');
insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Chrono_1', '1990-01-01');

select pg_temp.as_admin();
create temp table refs as
  select (select id from public.sports where slug = 'course') as course,
         (select id from public.sports where slug = 'musculation') as muscu;
grant select on refs to authenticated, anon;
select pg_temp.as_user('60000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------------------
-- 1. La distance devient facultative sur un sport de famille `distance`
-- ---------------------------------------------------------------------------
insert into public.activities (user_id, sport_id, performed_on, duration_s)
values (auth.uid(), (select course from refs), current_date, 1800);

do $$ begin
  if (select distance_m from public.activities where duration_s = 1800) is not null then
    raise exception 'ÉCHEC : la distance aurait dû rester nulle';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Ce qui ne change pas : une distance sur un sport de durée reste refusée
-- ---------------------------------------------------------------------------
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m)
    values (auth.uid(), (select muscu from refs), current_date, 1800, 4000)$$,
  'distance_interdite');

-- Et une distance absurde reste refusée quand elle est fournie.
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, distance_m)
    values (auth.uid(), (select course from refs), current_date, 1800, 0)$$,
  'distance_invalide');

-- ---------------------------------------------------------------------------
-- 3. Origine de la séance
-- ---------------------------------------------------------------------------
do $$ begin
  if (select source from public.activities where duration_s = 1800) <> 'saisie' then
    raise exception 'ÉCHEC : une séance doit être « saisie » par défaut';
  end if;
end $$;

insert into public.activities (user_id, sport_id, performed_on, duration_s, source)
values (auth.uid(), (select course from refs), current_date, 2400, 'chrono');

-- Une origine inventée n'existe pas : c'est une énumération, pas du texte libre.
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, source)
    values (auth.uid(), (select course from refs), current_date, 3000, 'importe')$$,
  'invalid input value for enum');

-- ---------------------------------------------------------------------------
-- 4. File hors-ligne : un envoi rejoué ne crée pas de doublon
--
-- C'est l'écueil habituel d'une file d'attente. L'identifiant vient de l'app,
-- donc le second envoi se heurte à la clé primaire au lieu de passer.
-- ---------------------------------------------------------------------------
insert into public.activities (id, user_id, sport_id, performed_on, duration_s, source)
values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), (select course from refs), current_date, 3600, 'chrono');

select pg_temp.expect_error(
  $$insert into public.activities (id, user_id, sport_id, performed_on, duration_s, source)
    values ('aaaaaaaa-0000-0000-0000-000000000001', auth.uid(), (select course from refs), current_date, 3600, 'chrono')$$,
  'duplicate key value');

do $$ begin
  if (select count(*) from public.activities where id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 1 then
    raise exception 'ÉCHEC : le rejeu a créé un doublon';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Ce qui ne change pas non plus : la fenêtre de saisie et les bornes de durée
-- ---------------------------------------------------------------------------
select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, source)
    values (auth.uid(), (select course from refs), current_date + 1, 1800, 'chrono')$$,
  'date_future');

select pg_temp.expect_error(
  $$insert into public.activities (user_id, sport_id, performed_on, duration_s, source)
    values (auth.uid(), (select course from refs), current_date, 30, 'chrono')$$,
  'duree_invalide');
