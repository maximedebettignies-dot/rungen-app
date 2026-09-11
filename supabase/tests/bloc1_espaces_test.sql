-- Tests du bloc 1 révisé : espaces public/RUNGEN, rôles, codes, support.
\set ON_ERROR_STOP on
\ir 01_helpers.sql

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'admin@rungen.fr'),
  ('10000000-0000-0000-0000-000000000002', 'prof@college-a.fr'),
  ('10000000-0000-0000-0000-000000000003', 'eleve-a@test.fr'),
  ('10000000-0000-0000-0000-000000000004', 'eleve-b@test.fr'),
  ('10000000-0000-0000-0000-000000000005', 'public@test.fr'),
  ('10000000-0000-0000-0000-000000000006', 'petit@test.fr'),
  ('10000000-0000-0000-0000-000000000007', 'intrus@test.fr'),
  ('10000000-0000-0000-0000-000000000008', 'prof-mineur@test.fr');

-- Profils publics de départ : l'admin (toi) et un adulte public
select pg_temp.as_user('10000000-0000-0000-0000-000000000001');
insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Maxime', '1999-01-01');
select pg_temp.as_user('10000000-0000-0000-0000-000000000005');
insert into public.profiles (id, pseudo, birth_date, visibility) values (auth.uid(), 'Coureur_public', '1990-01-01', 'public');

-- Amorçage du premier admin : uniquement en SQL, jamais depuis l'app
select pg_temp.as_admin();
insert into public.staff_roles (user_id, role) values ('10000000-0000-0000-0000-000000000001', 'admin');

-- 1. Sans double authentification, l'admin n'a aucun pouvoir
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal1');
select pg_temp.expect_error($$select public.generate_invite_codes(gen_random_uuid(), '6e B', 3)$$, 'admin_requis');
select pg_temp.expect_error($$insert into public.establishments (name, city) values ('Collège test', 'Domont')$$, 'row-level security');

-- 2. Avec double authentification, il crée deux collèges et un lot de 3 codes élèves
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal2');
insert into public.establishments (name, city) values ('Collège A', 'Domont'), ('Collège B', 'Domont');
create temp table ids as
  select (select id from public.establishments where name = 'Collège A') as etab_a,
         (select id from public.establishments where name = 'Collège B') as etab_b;
grant select on ids to authenticated, anon;
create temp table codes_a as select code from public.generate_invite_codes((select etab_a from ids), '6e B', 3);
grant select on codes_a to authenticated, anon;
do $$ begin
  if (select count(*) from codes_a) <> 3 then raise exception 'ÉCHEC 2a : 3 codes attendus'; end if;
  if exists (select 1 from codes_a where code !~ '^[A-HJ-NP-Z2-9]{10}$') then raise exception 'ÉCHEC 2b : format de code invalide'; end if;
  if exists (select 1 from public.invite_codes where status <> 'cree') then raise exception 'ÉCHEC 2c : un code élève doit démarrer au statut cree'; end if;
end $$;

-- 3. Nombre de codes borné
select pg_temp.expect_error($$select public.generate_invite_codes((select etab_a from ids), '6e B', 0)$$, 'nombre_invalide');
select pg_temp.expect_error($$select public.generate_invite_codes((select etab_a from ids), '6e B', 61)$$, 'nombre_invalide');

-- 4. Un non-admin ne génère pas de codes et ne crée pas d'établissement
select pg_temp.as_user('10000000-0000-0000-0000-000000000005', 'aal2');
select pg_temp.expect_error($$select public.generate_invite_codes((select etab_a from ids), '6e B', 3)$$, 'admin_requis');
select pg_temp.expect_error($$insert into public.establishments (name, city) values ('Faux', 'X')$$, 'row-level security');

-- 5. Vérification d'un code avant connexion : en attente tant que l'autorisation n'est pas reçue
select pg_temp.as_anon();
do $$ begin
  if public.check_invite_code((select min(code) from codes_a)) <> 'en_attente' then raise exception 'ÉCHEC 5a'; end if;
  if public.check_invite_code('ZZZZZZZZZZ') <> 'invalide' then raise exception 'ÉCHEC 5b'; end if;
  if public.check_invite_code(lower((select min(code) from codes_a))) <> 'en_attente' then raise exception 'ÉCHEC 5c : la casse ne doit pas compter'; end if;
end $$;

select pg_temp.expect_error($$select public.create_rungen_profile((select min(code) from codes_a), 'anon', '2014-01-01', true)$$, 'permission denied');

-- 6. Code non activé : inscription refusée
select pg_temp.as_user('10000000-0000-0000-0000-000000000003');
select pg_temp.expect_error($$select public.create_rungen_profile((select min(code) from codes_a), 'eleveA', (current_date - interval '12 years')::date, true)$$, 'code_en_attente');

-- 7. L'admin enregistre l'autorisation reçue, le code devient utilisable
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal2');
select public.activate_invite_code((select id from public.invite_codes where code = (select min(code) from codes_a)));
select pg_temp.as_anon();
do $$ begin
  if public.check_invite_code((select min(code) from codes_a)) <> 'ok' then raise exception 'ÉCHEC 7'; end if;
end $$;

-- 8. Moins de 11 ans refusé, même avec un code actif
select pg_temp.as_user('10000000-0000-0000-0000-000000000006');
select pg_temp.expect_error($$select public.create_rungen_profile((select min(code) from codes_a), 'petit', (current_date - interval '10 years')::date, true)$$, 'age_minimum');

-- 9. Sans accord de l'élève sur l'écran d'information : refusé
select pg_temp.as_user('10000000-0000-0000-0000-000000000003');
select pg_temp.expect_error($$select public.create_rungen_profile((select min(code) from codes_a), 'eleveA', (current_date - interval '12 years')::date, false)$$, 'consentement_requis');

-- 10. Élève de 12 ans : compte créé dans l'espace RUNGEN, privé, rattaché à sa classe, code consommé
select public.create_rungen_profile((select min(code) from codes_a), 'eleveA', (current_date - interval '12 years')::date, true);
do $$ begin
  if (select space from public.profiles where id = auth.uid()) <> 'rungen' then raise exception 'ÉCHEC 10a : espace rungen attendu'; end if;
  if (select visibility from public.profiles where id = auth.uid()) <> 'prive' then raise exception 'ÉCHEC 10b : privé attendu'; end if;
  if (select class_label from public.rungen_memberships where user_id = auth.uid()) <> '6e B' then raise exception 'ÉCHEC 10c : classe attendue'; end if;
end $$;
select pg_temp.as_admin();
do $$ begin
  if (select status from public.invite_codes where code = (select min(code) from codes_a)) <> 'utilise' then raise exception 'ÉCHEC 10d : code utilise attendu'; end if;
end $$;

-- 11. Un code ne sert qu'une fois
select pg_temp.as_user('10000000-0000-0000-0000-000000000004');
select pg_temp.expect_error($$select public.create_rungen_profile((select min(code) from codes_a), 'eleveB', (current_date - interval '13 years')::date, true)$$, 'code_utilise');

-- 12. Impossible de se déclarer RUNGEN sans code, et impossible de changer d'espace
select pg_temp.as_user('10000000-0000-0000-0000-000000000007');
select pg_temp.expect_error($$insert into public.profiles (id, pseudo, birth_date, space) values (auth.uid(), 'intrus', '1990-01-01', 'rungen')$$, 'row-level security');
select pg_temp.as_user('10000000-0000-0000-0000-000000000003');
select pg_temp.expect_error($$update public.profiles set space = 'public' where id = auth.uid()$$, 'space_immuable');
select pg_temp.as_user('10000000-0000-0000-0000-000000000005');
select pg_temp.expect_error($$update public.profiles set space = 'rungen' where id = auth.uid()$$, 'space_immuable');

-- 13. Élève B dans un autre collège (13 ans)
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal2');
create temp table codes_b as select code from public.generate_invite_codes((select etab_b from ids), '5e A', 1);
grant select on codes_b to authenticated;
select public.activate_invite_code((select id from public.invite_codes where code = (select code from codes_b)));
select pg_temp.as_user('10000000-0000-0000-0000-000000000004');
select public.create_rungen_profile((select code from codes_b), 'eleveB', (current_date - interval '13 years')::date, true);

-- 14. Étanchéité : le public ne voit aucun jeune RUNGEN
select pg_temp.as_user('10000000-0000-0000-0000-000000000005');
do $$ begin
  if exists (select 1 from public.public_profiles where pseudo in ('eleveA', 'eleveB')) then raise exception 'ÉCHEC 14a : jeune visible du public'; end if;
  if exists (select 1 from public.rungen_memberships) then raise exception 'ÉCHEC 14b : adhésions visibles du public'; end if;
end $$;

-- 15. Les jeunes RUNGEN se voient entre eux et voient les profils publics d'adultes
select pg_temp.as_user('10000000-0000-0000-0000-000000000004');
do $$ begin
  if not exists (select 1 from public.public_profiles where pseudo = 'eleveA') then raise exception 'ÉCHEC 15a : les jeunes RUNGEN doivent se voir'; end if;
  if not exists (select 1 from public.public_profiles where pseudo = 'Coureur_public') then raise exception 'ÉCHEC 15b : profil public adulte attendu'; end if;
  if exists (select 1 from public.rungen_memberships where user_id <> auth.uid()) then raise exception 'ÉCHEC 15c : un jeune ne voit pas la classe des autres'; end if;
end $$;

-- 16. Prof d'EPS : un prof mineur est refusé, un prof adulte obtient son rôle limité au collège A
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal2');
create temp table code_prof as select code from public.generate_invite_codes((select etab_a from ids), null, 1, 'prof_eps');
grant select on code_prof to authenticated;
select pg_temp.as_user('10000000-0000-0000-0000-000000000008');
select pg_temp.expect_error($$select public.create_staff_profile((select code from code_prof), 'profmineur', (current_date - interval '17 years')::date)$$, 'majeur_requis');
select pg_temp.as_user('10000000-0000-0000-0000-000000000002');
select public.create_staff_profile((select code from code_prof), 'Prof_EPS_A', '1985-06-01');

-- 17. Le prof, avec double authentification, ne voit que les élèves de son collège
select pg_temp.as_user('10000000-0000-0000-0000-000000000002', 'aal2');
do $$ begin
  if (select count(*) from public.rungen_memberships) <> 1 then raise exception 'ÉCHEC 17a : le prof doit voir uniquement son collège'; end if;
  if exists (select 1 from public.invite_codes where establishment_id = (select etab_b from ids)) then raise exception 'ÉCHEC 17b : codes d''un autre collège visibles'; end if;
end $$;
do $$ begin
  if not exists (select 1 from public.public_profiles where pseudo = 'eleveA') then raise exception 'ÉCHEC 17c : le prof doit voir ses élèves'; end if;
  if exists (select 1 from public.public_profiles where pseudo = 'eleveB') then raise exception 'ÉCHEC 17d : le prof ne doit pas voir les élèves d''un autre collège'; end if;
end $$;
select pg_temp.expect_error($$select public.activate_invite_code((select id from public.invite_codes limit 1))$$, 'admin_requis');

-- 18. Sans double authentification, le prof ne voit rien
select pg_temp.as_user('10000000-0000-0000-0000-000000000002', 'aal1');
do $$ begin
  if exists (select 1 from public.rungen_memberships) then raise exception 'ÉCHEC 18 : aal2 requis pour le prof'; end if;
  if exists (select 1 from public.public_profiles where pseudo in ('eleveA', 'eleveB')) then raise exception 'ÉCHEC 18b : sans aal2, le prof ne voit aucun élève'; end if;
end $$;

-- 19. Les jeunes voient leur encadrant, le public non
select pg_temp.as_user('10000000-0000-0000-0000-000000000003');
do $$ begin
  if not exists (select 1 from public.public_profiles where pseudo = 'Prof_EPS_A') then raise exception 'ÉCHEC 19a : encadrant invisible des jeunes'; end if;
end $$;
select pg_temp.as_user('10000000-0000-0000-0000-000000000005');
do $$ begin
  if exists (select 1 from public.public_profiles where pseudo = 'Prof_EPS_A') then raise exception 'ÉCHEC 19b : encadrant visible du public'; end if;
end $$;

-- 20. Un utilisateur adulte ne peut pas s'attribuer un rôle (un mineur est de toute façon refusé avant)
select pg_temp.as_user('10000000-0000-0000-0000-000000000005', 'aal2');
select pg_temp.expect_error($$insert into public.staff_roles (user_id, role) values (auth.uid(), 'admin')$$, 'row-level security');

-- 21. Support : l'élève ouvre une conversation, l'admin répond, le prof et le public ne voient rien
select pg_temp.as_user('10000000-0000-0000-0000-000000000003');
insert into public.support_threads (user_id, category, subject) values (auth.uid(), 'probleme', 'Bug classement');
insert into public.support_messages (thread_id, author_id, body)
  values ((select id from public.support_threads limit 1), auth.uid(), 'Mon classement ne bouge pas');
select pg_temp.as_admin();
create temp table thread as select id from public.support_threads limit 1;
grant select on thread to authenticated;
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal2');
insert into public.support_messages (thread_id, author_id, body) values ((select id from thread), auth.uid(), 'Merci, je regarde');
update public.support_threads set status = 'en_cours' where id = (select id from thread);
select pg_temp.as_user('10000000-0000-0000-0000-000000000002', 'aal2');
do $$ begin
  if exists (select 1 from public.support_threads) then raise exception 'ÉCHEC 21a : le prof ne doit pas voir le support'; end if;
end $$;
select pg_temp.as_user('10000000-0000-0000-0000-000000000005');
do $$ begin
  if exists (select 1 from public.support_messages) then raise exception 'ÉCHEC 21b : messages visibles par un tiers'; end if;
end $$;

-- 22. L'admin ne peut pas ouvrir une conversation au nom d'un élève
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal2');
select pg_temp.expect_error($$insert into public.support_threads (user_id, category, subject) values ('10000000-0000-0000-0000-000000000004', 'autre', 'Coucou')$$, 'row-level security');

-- 23. Messages ni modifiables ni supprimables, par personne
delete from public.support_messages;
update public.support_messages set body = 'modifié';
select pg_temp.as_user('10000000-0000-0000-0000-000000000003');
delete from public.support_messages;
update public.support_messages set body = 'modifié';
select pg_temp.as_admin();
do $$ begin
  if (select count(*) from public.support_messages) <> 2 then raise exception 'ÉCHEC 23a : messages supprimés'; end if;
  if exists (select 1 from public.support_messages where body = 'modifié') then raise exception 'ÉCHEC 23b : message modifié'; end if;
end $$;

-- 24. L'élève ne peut pas changer le statut de sa conversation
select pg_temp.as_user('10000000-0000-0000-0000-000000000003');
update public.support_threads set status = 'resolu';
select pg_temp.as_admin();
do $$ begin
  if (select status from public.support_threads limit 1) <> 'en_cours' then raise exception 'ÉCHEC 24'; end if;
end $$;

-- 25. Désactivation d'un compte par l'admin : banni et masqué
select pg_temp.as_user('10000000-0000-0000-0000-000000000005', 'aal2');
select pg_temp.expect_error($$select public.admin_set_account_disabled('10000000-0000-0000-0000-000000000003', true)$$, 'admin_requis');
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal2');
select public.admin_set_account_disabled('10000000-0000-0000-0000-000000000003', true);
select pg_temp.as_user('10000000-0000-0000-0000-000000000004');
do $$ begin
  if exists (select 1 from public.public_profiles where pseudo = 'eleveA') then raise exception 'ÉCHEC 25a : compte désactivé encore visible'; end if;
end $$;
select pg_temp.as_admin();
do $$ begin
  if (select banned_until from auth.users where id = '10000000-0000-0000-0000-000000000003') is null then raise exception 'ÉCHEC 25b : banned_until attendu'; end if;
end $$;

select pg_temp.as_user('10000000-0000-0000-0000-000000000005', 'aal2');
select pg_temp.expect_error($$select public.admin_delete_account('10000000-0000-0000-0000-000000000004')$$, 'admin_requis');

-- 26. Retrait de l'accord parental : l'admin supprime le compte, le support est conservé anonymisé
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal2');
select public.admin_delete_account('10000000-0000-0000-0000-000000000003');
select pg_temp.as_admin();
do $$ begin
  if exists (select 1 from auth.users where id = '10000000-0000-0000-0000-000000000003') then raise exception 'ÉCHEC 26a : utilisateur non supprimé'; end if;
  if exists (select 1 from public.rungen_memberships where user_id = '10000000-0000-0000-0000-000000000003') then raise exception 'ÉCHEC 26b : adhésion non supprimée'; end if;
  if (select count(*) from public.support_messages) <> 2 then raise exception 'ÉCHEC 26c : messages de support perdus'; end if;
  if (select user_id from public.support_threads limit 1) is not null then raise exception 'ÉCHEC 26d : conversation non anonymisée'; end if;
end $$;

-- 27. Code perdu : l'admin désactive un code non utilisé
select pg_temp.as_user('10000000-0000-0000-0000-000000000001', 'aal2');
select public.deactivate_invite_code((select id from public.invite_codes where code = (select max(code) from codes_a)));
select pg_temp.as_anon();
do $$ begin
  if public.check_invite_code((select max(code) from codes_a)) <> 'invalide' then raise exception 'ÉCHEC 27'; end if;
end $$;

select pg_temp.as_admin();
\echo 'TOUS LES TESTS DES ESPACES SONT PASSÉS'
