-- Tests du bloc 1 : chaque bloc DO lève une exception si une règle n'est pas respectée.
\set ON_ERROR_STOP on

\ir 01_helpers.sql

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'adulte@test.fr'),
  ('00000000-0000-0000-0000-00000000000b', 'autre@test.fr'),
  ('00000000-0000-0000-0000-00000000000c', 'mineur@test.fr'),
  ('00000000-0000-0000-0000-00000000000d', 'jeune@test.fr');

-- 1. Un adulte crée son profil, visibilité "amis" par défaut
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.profiles (id, pseudo, birth_date) values ('00000000-0000-0000-0000-00000000000a', 'Maxime_run', '1998-05-01');
do $$ begin
  if (select visibility from public.profiles where id = auth.uid()) <> 'amis' then
    raise exception 'ÉCHEC 1 : visibilité par défaut attendue amis';
  end if;
end $$;

-- 2. Impossible de créer le profil d'un autre utilisateur
select pg_temp.expect_error($$insert into public.profiles (id, pseudo, birth_date) values ('00000000-0000-0000-0000-00000000000b', 'usurpateur', '1990-01-01')$$, 'row-level security');

-- 3. Moins de 15 ans refusé
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_error(format($$insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'trop_jeune', %L)$$, current_date - interval '14 years'), 'age_minimum');

-- 4. Date de naissance dans le futur refusée
select pg_temp.expect_error(format($$insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'futur', %L)$$, current_date + 1), 'birth_date_in_future');

-- 5. Un mineur qui demande "public" est enregistré en "prive"
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, pseudo, birth_date, visibility) values (auth.uid(), 'lyceen16', current_date - interval '16 years', 'public');
do $$ begin
  if (select visibility from public.profiles where id = auth.uid()) <> 'prive' then
    raise exception 'ÉCHEC 5 : un mineur doit être privé';
  end if;
end $$;

-- 6. Un mineur ne peut pas repasser en public
update public.profiles set visibility = 'public' where id = auth.uid();
do $$ begin
  if (select visibility from public.profiles where id = auth.uid()) <> 'prive' then
    raise exception 'ÉCHEC 6 : un mineur ne doit pas pouvoir passer en public';
  end if;
end $$;

-- 7. La date de naissance ne peut plus être modifiée
select pg_temp.expect_error($$update public.profiles set birth_date = '1990-01-01' where id = auth.uid()$$, 'birth_date_immutable');

-- 8. Un utilisateur ne lit pas la table profiles des autres
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Voisin', '1985-03-03');
do $$ begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'ÉCHEC 8 : B ne doit voir que son propre profil';
  end if;
end $$;

-- 9. Vue publique : profil "amis" invisible, "public" visible, jamais de date de naissance
do $$ begin
  if exists (select 1 from public.public_profiles where pseudo = 'Maxime_run') then
    raise exception 'ÉCHEC 9a : un profil amis ne doit pas être visible en V1';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'public_profiles' and column_name = 'birth_date') then
    raise exception 'ÉCHEC 9b : la vue publique ne doit pas exposer la date de naissance';
  end if;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.profiles set visibility = 'public' where id = auth.uid();
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if not exists (select 1 from public.public_profiles where pseudo = 'Maxime_run') then
    raise exception 'ÉCHEC 9c : un profil public adulte doit être visible';
  end if;
  if exists (select 1 from public.public_profiles where pseudo = 'lyceen16') then
    raise exception 'ÉCHEC 9d : un mineur ne doit jamais être visible';
  end if;
end $$;

-- 9e. Défense en profondeur : même si un mineur avait "public" en base (import, bug), la vue le masque
select pg_temp.as_admin();
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000e', 'import@test.fr');
alter table public.profiles disable trigger profiles_before_write;
insert into public.profiles (id, pseudo, birth_date, visibility) values ('00000000-0000-0000-0000-00000000000e', 'mineur_importe', current_date - interval '16 years', 'public');
alter table public.profiles enable trigger profiles_before_write;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if exists (select 1 from public.public_profiles where pseudo = 'mineur_importe') then
    raise exception 'ÉCHEC 9e : un mineur ne doit jamais apparaître dans la vue publique';
  end if;
end $$;

-- 10. Pseudo unique sans tenir compte de la casse
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_error($$insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'maxime_RUN', '1990-01-01')$$, 'profiles_pseudo_unique');

-- 11. Pseudo au mauvais format refusé
select pg_temp.expect_error($$insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'a b', '1990-01-01')$$, 'pseudo_format');

-- 12. Mot interdit refusé dans un pseudo, même déguisé avec accents, casse ou underscore
select pg_temp.expect_error($$insert into public.profiles (id, pseudo, birth_date) values (auth.uid(), 'Sale_PUTE', '1990-01-01')$$, 'contenu_interdit');

-- 13. Catalogue des sports lisible et rangé par familles
do $$ begin
  if (select count(*) from public.sports where family = 'distance') = 0 or (select count(*) from public.sports where family = 'duree') = 0 then
    raise exception 'ÉCHEC 13 : le catalogue doit contenir les deux familles';
  end if;
end $$;

-- 14. Catalogue non modifiable par un utilisateur
select pg_temp.expect_error($$insert into public.sports (slug, name, family, pace_unit) values ('hack', 'Hack', 'duree', 'none')$$, 'row-level security');

-- 15. Sport perso : créé par A, invisible pour B
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.custom_sports (owner_id, name, family) values (auth.uid(), 'Tennis ballon', 'duree');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if exists (select 1 from public.custom_sports) then
    raise exception 'ÉCHEC 15 : B ne doit pas voir les sports perso de A';
  end if;
end $$;

-- 16. Mot interdit refusé dans un sport perso, mais pas de faux positif sur un mot qui le contient
select pg_temp.expect_error($$insert into public.custom_sports (owner_id, name, family) values (auth.uid(), 'Connard ball', 'duree')$$, 'contenu_interdit');
insert into public.custom_sports (owner_id, name, family) values (auth.uid(), 'Sport de contact', 'duree');

-- 17. Nom de sport perso unique par propriétaire, sans tenir compte de la casse
select pg_temp.expect_error($$insert into public.custom_sports (owner_id, name, family) values (auth.uid(), 'SPORT DE CONTACT', 'duree')$$, 'custom_sports_owner_name_unique');

-- 18. Favoris : B ne peut pas mettre en favori le sport perso de A
select pg_temp.as_admin();
create temp table sport_a as select id from public.custom_sports where name = 'Tennis ballon';
grant select on sport_a to authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$insert into public.favorite_sports (user_id, custom_sport_id) values (auth.uid(), (select id from sport_a))$$, 'row-level security');

-- 19. Favoris : exactement un sport par ligne
select pg_temp.expect_error($$insert into public.favorite_sports (user_id) values (auth.uid())$$, 'favorite_one_sport');

-- 20. Favoris : B ajoute un sport du catalogue
insert into public.favorite_sports (user_id, sport_id) values (auth.uid(), (select id from public.sports where slug = 'course'));

-- 21. Suppression de compte : supprime l'utilisateur et tout en cascade
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.delete_my_account();
select pg_temp.as_admin();
do $$ begin
  if exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.custom_sports where owner_id = '00000000-0000-0000-0000-00000000000a') then
    raise exception 'ÉCHEC 21 : le compte et ses données doivent être supprimés';
  end if;
end $$;

-- 22. Suppression impossible sans être connecté
select pg_temp.as_user(null);
select pg_temp.expect_error($$select public.delete_my_account()$$, 'not_authenticated');

select pg_temp.as_admin();
\echo 'TOUS LES TESTS DU BLOC 1 SONT PASSÉS'
