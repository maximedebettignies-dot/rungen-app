-- Bloc 1 — Fondations
-- Profils, catalogue de sports, sports perso, favoris, règles d'âge et suppression de compte.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.visibility as enum ('public', 'amis', 'prive');
create type public.sport_family as enum ('distance', 'duree');
create type public.pace_unit as enum ('min_per_km', 'km_per_h', 'min_per_100m', 'none');

-- ---------------------------------------------------------------------------
-- Règles d'âge (miroir de src/lib/age.ts)
-- ---------------------------------------------------------------------------
create function public.age_on(birth date, ref date default current_date)
returns int language sql immutable set search_path = '' as $$
  select extract(year from age(ref, birth))::int
$$;

create function public.is_minor(birth date)
returns boolean language sql stable set search_path = '' as $$
  select public.age_on(birth, current_date) < 18
$$;

create function public.effective_visibility(chosen public.visibility, birth date)
returns public.visibility language sql stable set search_path = '' as $$
  select case when public.is_minor(birth) then 'prive'::public.visibility else chosen end
$$;

-- ---------------------------------------------------------------------------
-- Modération : mots interdits (pseudos, sports perso)
-- ---------------------------------------------------------------------------
create table public.banned_words (
  word text primary key check (word = lower(word))
);
alter table public.banned_words enable row level security;
-- Aucune policy : la liste n'est lisible par personne via l'API.

insert into public.banned_words (word) values
  ('connard'), ('connasse'), ('conne'), ('pute'), ('putain'), ('salope'),
  ('encule'), ('enculee'), ('batard'), ('fdp'), ('ntm'), ('nique'),
  ('pd'), ('negro'), ('bougnoule'), ('nazi'), ('hitler'), ('porn'), ('porno');

-- Security definer : les utilisateurs n'ont pas le droit de lire la table.
create function public.contains_banned_word(input text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.banned_words b
    where ' ' || regexp_replace(lower(extensions.unaccent(input)), '[^a-z]+', ' ', 'g') || ' '
          like '% ' || b.word || ' %'
  )
$$;

-- ---------------------------------------------------------------------------
-- Profils
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null constraint pseudo_format check (pseudo ~ '^[A-Za-z0-9_.]{3,20}$'),
  avatar_url text,
  birth_date date not null,
  visibility public.visibility not null default 'amis',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_pseudo_unique on public.profiles (lower(pseudo));

create function public.profiles_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.birth_date is distinct from old.birth_date then
    raise exception 'birth_date_immutable' using errcode = 'check_violation';
  end if;
  if new.birth_date > current_date then
    raise exception 'birth_date_in_future' using errcode = 'check_violation';
  end if;
  if public.age_on(new.birth_date) < 15 then
    raise exception 'age_minimum' using errcode = 'check_violation';
  end if;
  if public.contains_banned_word(new.pseudo) then
    raise exception 'contenu_interdit' using errcode = 'check_violation';
  end if;
  if public.is_minor(new.birth_date) then
    new.visibility := 'prive';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_before_write
before insert or update on public.profiles
for each row execute function public.profiles_before_write();

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Pas de policy delete : la suppression passe par delete_my_account().

-- Vue exposée aux autres utilisateurs : jamais la date de naissance.
-- En V1, seuls les profils publics d'adultes sont visibles (les amis arrivent au bloc 4).
create view public.public_profiles with (security_barrier = true) as
select p.id, p.pseudo, p.avatar_url
from public.profiles p
where p.id = (select auth.uid())
   or public.effective_visibility(p.visibility, p.birth_date) = 'public';

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Catalogue de sports
-- ---------------------------------------------------------------------------
create table public.sports (
  id int generated always as identity primary key,
  slug text not null unique,
  name text not null,
  family public.sport_family not null,
  pace_unit public.pace_unit not null default 'none'
);

alter table public.sports enable row level security;
create policy sports_read on public.sports
  for select to authenticated using (true);
-- Pas de policy d'écriture : catalogue géré uniquement par migration.

insert into public.sports (slug, name, family, pace_unit) values
  ('course', 'Course à pied', 'distance', 'min_per_km'),
  ('trail', 'Trail', 'distance', 'min_per_km'),
  ('marche', 'Marche', 'distance', 'min_per_km'),
  ('randonnee', 'Randonnée', 'distance', 'min_per_km'),
  ('velo_route', 'Vélo route', 'distance', 'km_per_h'),
  ('vtt', 'VTT', 'distance', 'km_per_h'),
  ('natation', 'Natation', 'distance', 'min_per_100m'),
  ('aviron', 'Aviron', 'distance', 'km_per_h'),
  ('kayak', 'Kayak', 'distance', 'km_per_h'),
  ('ski_fond', 'Ski de fond', 'distance', 'km_per_h'),
  ('roller', 'Roller', 'distance', 'km_per_h'),
  ('musculation', 'Musculation', 'duree', 'none'),
  ('fitness', 'Fitness', 'duree', 'none'),
  ('cross_training', 'Cross-training', 'duree', 'none'),
  ('yoga', 'Yoga', 'duree', 'none'),
  ('pilates', 'Pilates', 'duree', 'none'),
  ('football', 'Football', 'duree', 'none'),
  ('basketball', 'Basketball', 'duree', 'none'),
  ('handball', 'Handball', 'duree', 'none'),
  ('rugby', 'Rugby', 'duree', 'none'),
  ('volleyball', 'Volley-ball', 'duree', 'none'),
  ('tennis', 'Tennis', 'duree', 'none'),
  ('padel', 'Padel', 'duree', 'none'),
  ('badminton', 'Badminton', 'duree', 'none'),
  ('tennis_table', 'Tennis de table', 'duree', 'none'),
  ('boxe', 'Boxe', 'duree', 'none'),
  ('arts_martiaux', 'Arts martiaux', 'duree', 'none'),
  ('escalade', 'Escalade', 'duree', 'none'),
  ('danse', 'Danse', 'duree', 'none'),
  ('ski_alpin', 'Ski alpin', 'duree', 'none'),
  ('surf', 'Surf', 'duree', 'none');

-- ---------------------------------------------------------------------------
-- Sports perso
-- ---------------------------------------------------------------------------
create table public.custom_sports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  family public.sport_family not null,
  created_at timestamptz not null default now()
);
create unique index custom_sports_owner_name_unique
  on public.custom_sports (owner_id, lower(btrim(name)));

create function public.custom_sports_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.name := btrim(new.name);
  if public.contains_banned_word(new.name) then
    raise exception 'contenu_interdit' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger custom_sports_before_write
before insert or update on public.custom_sports
for each row execute function public.custom_sports_before_write();

alter table public.custom_sports enable row level security;
create policy custom_sports_all_own on public.custom_sports
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Sports favoris
-- ---------------------------------------------------------------------------
create table public.favorite_sports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport_id int references public.sports (id) on delete cascade,
  custom_sport_id uuid references public.custom_sports (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorite_one_sport check (num_nonnulls(sport_id, custom_sport_id) = 1)
);
create unique index favorite_sports_catalog_unique
  on public.favorite_sports (user_id, sport_id) where sport_id is not null;
create unique index favorite_sports_custom_unique
  on public.favorite_sports (user_id, custom_sport_id) where custom_sport_id is not null;

alter table public.favorite_sports enable row level security;
create policy favorite_sports_all_own on public.favorite_sports
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      custom_sport_id is null
      or exists (
        select 1 from public.custom_sports c
        where c.id = custom_sport_id and c.owner_id = (select auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Suppression de compte (exigence Apple + RGPD)
-- L'app supprime d'abord la photo de profil via l'API Storage, puis appelle cette fonction.
-- ---------------------------------------------------------------------------
create function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
