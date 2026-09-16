-- Tests du stockage : photos de profil et pièces jointes du support.
\set ON_ERROR_STOP on
\ir 01_helpers.sql

insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-000000000001', 'admin@rungen.fr'),
  ('20000000-0000-0000-0000-000000000002', 'prof@college-a.fr'),
  ('20000000-0000-0000-0000-000000000003', 'eleve-a@test.fr'),
  ('20000000-0000-0000-0000-000000000004', 'eleve-b@test.fr'),
  ('20000000-0000-0000-0000-000000000005', 'public-visible@test.fr'),
  ('20000000-0000-0000-0000-000000000006', 'public-curieux@test.fr'),
  ('20000000-0000-0000-0000-000000000007', 'public-desactive@test.fr');

-- Profils publics : un admin, un adulte visible, un curieux, un futur désactivé
select pg_temp.as_user('20000000-0000-0000-0000-000000000001');
insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Maxime', '1999-01-01');
select pg_temp.as_user('20000000-0000-0000-0000-000000000005');
insert into public.profiles (id, pseudo, birth_date, visibility) values (auth.uid(), 'Visible', '1990-01-01', 'public');
select pg_temp.as_user('20000000-0000-0000-0000-000000000006');
insert into public.profiles (id, pseudo, birth_date, visibility) values (auth.uid(), 'Curieux', '1990-01-01', 'public');
select pg_temp.as_user('20000000-0000-0000-0000-000000000007');
insert into public.profiles (id, pseudo, birth_date, visibility) values (auth.uid(), 'Desactive', '1990-01-01', 'public');

select pg_temp.as_admin();
insert into public.staff_roles (user_id, role) values ('20000000-0000-0000-0000-000000000001', 'admin');

-- Un collège, un code prof et deux codes élèves activés
select pg_temp.as_user('20000000-0000-0000-0000-000000000001', 'aal2');
insert into public.establishments (name, city) values ('Collège A', 'Domont');
create temp table etab as select id from public.establishments where name = 'Collège A';
grant select on etab to authenticated, anon;
create temp table code_prof as
  select code from public.generate_invite_codes((select id from etab), null, 1, 'prof_eps');
grant select on code_prof to authenticated, anon;
create temp table codes_eleves as
  select code, row_number() over () as rang
  from public.generate_invite_codes((select id from etab), '6e B', 2);
grant select on codes_eleves to authenticated, anon;
do $$
declare c text;
begin
  for c in select code from codes_eleves loop
    perform public.activate_invite_code((select id from public.invite_codes where code = c));
  end loop;
end $$;

-- Le prof et les deux élèves créent leur compte
select pg_temp.as_user('20000000-0000-0000-0000-000000000002');
select public.create_staff_profile((select code from code_prof), 'Prof_A', '1985-05-05');
select pg_temp.as_user('20000000-0000-0000-0000-000000000003');
select public.create_rungen_profile((select code from codes_eleves where rang = 1), 'Eleve_A', '2012-04-01', true);
select pg_temp.as_user('20000000-0000-0000-0000-000000000004');
select public.create_rungen_profile((select code from codes_eleves where rang = 2), 'Eleve_B', '2012-06-01', true);

-- ---------------------------------------------------------------------------
-- 1. Chacun dépose sa propre photo
-- ---------------------------------------------------------------------------
select pg_temp.as_user('20000000-0000-0000-0000-000000000005');
insert into storage.objects (bucket_id, name, owner)
values ('avatars', '20000000-0000-0000-0000-000000000005/avatar.jpg', auth.uid());
select pg_temp.as_user('20000000-0000-0000-0000-000000000003');
insert into storage.objects (bucket_id, name, owner)
values ('avatars', '20000000-0000-0000-0000-000000000003/avatar.jpg', auth.uid());
select pg_temp.as_user('20000000-0000-0000-0000-000000000007');
insert into storage.objects (bucket_id, name, owner)
values ('avatars', '20000000-0000-0000-0000-000000000007/avatar.jpg', auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Personne ne dépose de photo dans le dossier d'un autre
-- ---------------------------------------------------------------------------
select pg_temp.as_user('20000000-0000-0000-0000-000000000006');
select pg_temp.expect_error(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('avatars', '20000000-0000-0000-0000-000000000005/avatar.jpg', auth.uid())$$,
  'row-level security');
-- Un chemin sans dossier n'appartient à personne : refusé aussi
select pg_temp.expect_error(
  $$insert into storage.objects (bucket_id, name, owner) values ('avatars', 'avatar.jpg', auth.uid())$$,
  'row-level security');

-- ---------------------------------------------------------------------------
-- 3. Un adulte public en visibilité « public » a sa photo visible des connectés
-- ---------------------------------------------------------------------------
do $$ begin
  if (select count(*) from storage.objects
      where name = '20000000-0000-0000-0000-000000000005/avatar.jpg') <> 1 then
    raise exception 'ÉCHEC 3 : la photo d''un adulte public devrait être visible';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. RÈGLE CRITIQUE : le public ne voit jamais la photo d'un membre RUNGEN
-- ---------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from storage.objects
             where name = '20000000-0000-0000-0000-000000000003/avatar.jpg') then
    raise exception 'ÉCHEC 4 : un membre public voit la photo d''un élève RUNGEN';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Entre membres RUNGEN, et pour le prof de l'établissement, la photo est visible
-- ---------------------------------------------------------------------------
select pg_temp.as_user('20000000-0000-0000-0000-000000000004');
do $$ begin
  if not exists (select 1 from storage.objects
                 where name = '20000000-0000-0000-0000-000000000003/avatar.jpg') then
    raise exception 'ÉCHEC 5a : un élève RUNGEN devrait voir la photo d''un autre élève';
  end if;
end $$;
select pg_temp.as_user('20000000-0000-0000-0000-000000000002', 'aal2');
do $$ begin
  if not exists (select 1 from storage.objects
                 where name = '20000000-0000-0000-0000-000000000003/avatar.jpg') then
    raise exception 'ÉCHEC 5b : le prof devrait voir la photo d''un élève de son établissement';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. La photo d'un compte désactivé n'est plus visible de personne
-- ---------------------------------------------------------------------------
select pg_temp.as_user('20000000-0000-0000-0000-000000000001', 'aal2');
select public.admin_set_account_disabled('20000000-0000-0000-0000-000000000007', true);
select pg_temp.as_user('20000000-0000-0000-0000-000000000006');
do $$ begin
  if exists (select 1 from storage.objects
             where name = '20000000-0000-0000-0000-000000000007/avatar.jpg') then
    raise exception 'ÉCHEC 6 : la photo d''un compte désactivé reste visible';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Chacun remplace et supprime sa propre photo, jamais celle d'un autre
-- ---------------------------------------------------------------------------
select pg_temp.as_user('20000000-0000-0000-0000-000000000005');
update storage.objects set created_at = now()
where name = '20000000-0000-0000-0000-000000000005/avatar.jpg';
select pg_temp.as_user('20000000-0000-0000-0000-000000000006');
do $$ begin
  -- La photo est visible mais la suppression ne porte sur aucune ligne.
  delete from storage.objects where name = '20000000-0000-0000-0000-000000000005/avatar.jpg';
  if not exists (select 1 from storage.objects
                 where name = '20000000-0000-0000-0000-000000000005/avatar.jpg') then
    raise exception 'ÉCHEC 7 : un tiers a supprimé la photo d''un autre';
  end if;
end $$;
select pg_temp.as_user('20000000-0000-0000-0000-000000000005');
delete from storage.objects where name = '20000000-0000-0000-0000-000000000005/avatar.jpg';

-- ---------------------------------------------------------------------------
-- 8. Pièces jointes du support : privées, définitives, lisibles par l'admin
-- ---------------------------------------------------------------------------
select pg_temp.as_user('20000000-0000-0000-0000-000000000003');
insert into storage.objects (bucket_id, name, owner)
values ('support', '20000000-0000-0000-0000-000000000003/capture.jpg', auth.uid());

-- Un autre utilisateur ne la voit pas, même dans l'espace RUNGEN
select pg_temp.as_user('20000000-0000-0000-0000-000000000004');
do $$ begin
  if exists (select 1 from storage.objects where bucket_id = 'support') then
    raise exception 'ÉCHEC 8a : une pièce jointe de support est visible d''un autre utilisateur';
  end if;
end $$;

-- L'admin en double authentification la lit
select pg_temp.as_user('20000000-0000-0000-0000-000000000001', 'aal2');
do $$ begin
  if not exists (select 1 from storage.objects
                 where name = '20000000-0000-0000-0000-000000000003/capture.jpg') then
    raise exception 'ÉCHEC 8b : l''admin devrait lire la pièce jointe';
  end if;
end $$;

-- Sans double authentification, l'admin ne la lit pas
select pg_temp.as_user('20000000-0000-0000-0000-000000000001', 'aal1');
do $$ begin
  if exists (select 1 from storage.objects where bucket_id = 'support') then
    raise exception 'ÉCHEC 8c : l''admin lit le support sans double authentification';
  end if;
end $$;

-- Même son auteur ne peut ni la modifier ni la supprimer
select pg_temp.as_user('20000000-0000-0000-0000-000000000003');
do $$ begin
  delete from storage.objects where name = '20000000-0000-0000-0000-000000000003/capture.jpg';
  if not exists (select 1 from storage.objects
                 where name = '20000000-0000-0000-0000-000000000003/capture.jpg') then
    raise exception 'ÉCHEC 8d : une pièce jointe de support a pu être supprimée';
  end if;
end $$;

select pg_temp.as_admin();
\echo 'Tests stockage : OK'
