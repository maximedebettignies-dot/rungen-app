-- Bloc 1 révisé — Espaces (public / RUNGEN), rôles d'encadrement, codes d'invitation, support.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.space as enum ('public', 'rungen');
create type public.staff_role as enum ('admin', 'prof_eps');
create type public.invite_kind as enum ('eleve', 'prof_eps');
create type public.invite_status as enum ('cree', 'actif', 'utilise', 'desactive');
create type public.support_category as enum ('probleme', 'idee', 'autre');
create type public.support_status as enum ('nouveau', 'en_cours', 'resolu');

-- ---------------------------------------------------------------------------
-- Profils : espace et désactivation
-- ---------------------------------------------------------------------------
alter table public.profiles add column space public.space not null default 'public';
alter table public.profiles add column disabled_at timestamptz;

create function public.min_registration_age(s public.space)
returns int language sql immutable set search_path = '' as $$
  select case s when 'rungen' then 11 else 15 end
$$;

create or replace function public.profiles_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.birth_date is distinct from old.birth_date then
      raise exception 'birth_date_immutable' using errcode = 'check_violation';
    end if;
    if new.space is distinct from old.space then
      raise exception 'space_immuable' using errcode = 'check_violation';
    end if;
    -- Seules les fonctions admin (security definer) peuvent désactiver un compte.
    if new.disabled_at is distinct from old.disabled_at and current_user in ('authenticated', 'anon') then
      raise exception 'action_reservee_admin' using errcode = 'insufficient_privilege';
    end if;
  end if;
  if new.birth_date > current_date then
    raise exception 'birth_date_in_future' using errcode = 'check_violation';
  end if;
  if public.age_on(new.birth_date) < public.min_registration_age(new.space) then
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

-- Un utilisateur ne crée lui-même qu'un profil public. L'espace RUNGEN passe obligatoirement par un code.
drop policy profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) and space = 'public' and disabled_at is null);

-- ---------------------------------------------------------------------------
-- Établissements, rôles, adhésions RUNGEN, codes
-- ---------------------------------------------------------------------------
create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  city text,
  created_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.staff_role not null,
  establishment_id uuid references public.establishments (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint staff_role_scope check (
    (role = 'admin' and establishment_id is null)
    or (role = 'prof_eps' and establishment_id is not null)
  )
);

create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{10}$'),
  kind public.invite_kind not null default 'eleve',
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  class_label text check (class_label is null or char_length(class_label) <= 30),
  status public.invite_status not null default 'cree',
  used_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  used_at timestamptz
);

create table public.rungen_memberships (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  establishment_id uuid not null references public.establishments (id) on delete restrict,
  class_label text,
  invite_code_id uuid references public.invite_codes (id) on delete set null,
  child_consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fonctions d'identité (security definer : lisent les rôles sans exposer la table)
-- Les pouvoirs admin et prof exigent la double authentification (aal2).
-- ---------------------------------------------------------------------------
create function public.has_mfa()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
$$;

create function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_mfa() and exists (
    select 1 from public.staff_roles r where r.user_id = auth.uid() and r.role = 'admin'
  )
$$;

create function public.is_staff(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles r where r.user_id = uid)
$$;

create function public.my_prof_establishment()
returns uuid language sql stable security definer set search_path = '' as $$
  select r.establishment_id
  from public.staff_roles r
  where r.user_id = auth.uid() and r.role = 'prof_eps' and public.has_mfa()
$$;

create function public.my_space()
returns public.space language sql stable security definer set search_path = '' as $$
  select p.space from public.profiles p where p.id = auth.uid()
$$;

-- Un encadrant doit être majeur.
create function public.staff_roles_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_minor((select p.birth_date from public.profiles p where p.id = new.user_id)) then
    raise exception 'majeur_requis' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger staff_roles_before_write
before insert or update on public.staff_roles
for each row execute function public.staff_roles_before_write();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.establishments enable row level security;
create policy establishments_select on public.establishments
  for select to authenticated
  using (public.is_admin() or id = public.my_prof_establishment());
create policy establishments_write_admin on public.establishments
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.staff_roles enable row level security;
create policy staff_roles_select on public.staff_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy staff_roles_insert_admin on public.staff_roles
  for insert to authenticated with check (public.is_admin());
create policy staff_roles_delete_admin on public.staff_roles
  for delete to authenticated using (public.is_admin());

alter table public.invite_codes enable row level security;
create policy invite_codes_select on public.invite_codes
  for select to authenticated
  using (public.is_admin() or establishment_id = public.my_prof_establishment());
-- Écriture uniquement via les fonctions ci-dessous.

alter table public.rungen_memberships enable row level security;
create policy rungen_memberships_select on public.rungen_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
    or establishment_id = public.my_prof_establishment()
  );
-- Écriture uniquement via les fonctions ci-dessous.

-- ---------------------------------------------------------------------------
-- Vue des profils visibles par les autres (remplace celle du bloc 1)
-- ---------------------------------------------------------------------------
create or replace view public.public_profiles with (security_barrier = true) as
select p.id, p.pseudo, p.avatar_url
from public.profiles p
where p.id = (select auth.uid())
   or (
     p.disabled_at is null
     and (
       -- Adultes publics : visibles de tous les utilisateurs connectés
       (p.space = 'public' and public.effective_visibility(p.visibility, p.birth_date) = 'public')
       -- Espace RUNGEN : jamais visible du public
       or (p.space = 'rungen' and (
            public.is_admin()
            or (public.my_space() = 'rungen' and not public.is_staff((select auth.uid())))
            or exists (
              select 1 from public.rungen_memberships m
              where m.user_id = p.id and m.establishment_id = public.my_prof_establishment()
            )
            or (public.is_staff(p.id) and public.my_space() = 'rungen')
          ))
       -- Encadrants de l'espace public (ex. l'admin) : visibles des jeunes RUNGEN
       or (p.space = 'public' and public.is_staff(p.id) and public.my_space() = 'rungen')
     )
   );

-- ---------------------------------------------------------------------------
-- Codes d'invitation
-- ---------------------------------------------------------------------------
create function public.generate_invite_codes(
  p_establishment uuid,
  p_class_label text,
  p_count int,
  p_kind public.invite_kind default 'eleve'
)
returns table (code text) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  -- Octets purement aléatoires d'un UUID v4 (on évite les octets de version et de variante).
  byte_positions constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9, 10, 11];
  v_code text;
  v_bytes bytea;
  pos int;
begin
  if not public.is_admin() then
    raise exception 'admin_requis' using errcode = 'insufficient_privilege';
  end if;
  if p_count is null or p_count < 1 or p_count > 60 then
    raise exception 'nombre_invalide' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.establishments e where e.id = p_establishment) then
    raise exception 'etablissement_inconnu' using errcode = 'foreign_key_violation';
  end if;

  for i in 1..p_count loop
    loop
      v_bytes := uuid_send(gen_random_uuid());
      v_code := '';
      foreach pos in array byte_positions loop
        v_code := v_code || substr(alphabet, (get_byte(v_bytes, pos) % 32) + 1, 1);
      end loop;
      begin
        insert into public.invite_codes (code, kind, establishment_id, class_label, status, activated_at)
        values (
          v_code, p_kind, p_establishment, p_class_label,
          case when p_kind = 'prof_eps' then 'actif'::public.invite_status else 'cree'::public.invite_status end,
          case when p_kind = 'prof_eps' then now() end
        );
        exit;
      exception when unique_violation then
        -- Collision très improbable : on tire un nouveau code.
      end;
    end loop;
    code := v_code;
    return next;
  end loop;
end $$;

create function public.activate_invite_code(p_code_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin_requis' using errcode = 'insufficient_privilege';
  end if;
  update public.invite_codes set status = 'actif', activated_at = now()
  where id = p_code_id and status = 'cree';
  if not found then
    raise exception 'code_non_activable' using errcode = 'check_violation';
  end if;
end $$;

create function public.deactivate_invite_code(p_code_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin_requis' using errcode = 'insufficient_privilege';
  end if;
  update public.invite_codes set status = 'desactive'
  where id = p_code_id and status in ('cree', 'actif');
  if not found then
    raise exception 'code_non_desactivable' using errcode = 'check_violation';
  end if;
end $$;

-- Utilisable avant connexion : ne renvoie qu'un statut.
create function public.check_invite_code(p_code text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_status public.invite_status;
begin
  select c.status into v_status from public.invite_codes c where c.code = upper(btrim(p_code));
  if v_status is null or v_status = 'desactive' then return 'invalide'; end if;
  if v_status = 'cree' then return 'en_attente'; end if;
  if v_status = 'utilise' then return 'utilise'; end if;
  return 'ok';
end $$;

create function public.create_rungen_profile(
  p_code text,
  p_pseudo text,
  p_birth_date date,
  p_child_consent boolean
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code public.invite_codes%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_code from public.invite_codes c
  where c.code = upper(btrim(p_code)) and c.kind = 'eleve'
  for update;
  if not found or v_code.status = 'desactive' then
    raise exception 'code_invalide' using errcode = 'check_violation';
  end if;
  if v_code.status = 'cree' then
    raise exception 'code_en_attente' using errcode = 'check_violation';
  end if;
  if v_code.status = 'utilise' then
    raise exception 'code_utilise' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'profil_existant' using errcode = 'unique_violation';
  end if;
  if not coalesce(p_child_consent, false) then
    raise exception 'consentement_requis' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, pseudo, birth_date, space)
  values (v_uid, p_pseudo, p_birth_date, 'rungen');
  insert into public.rungen_memberships (user_id, establishment_id, class_label, invite_code_id, child_consent_at)
  values (v_uid, v_code.establishment_id, v_code.class_label, v_code.id, now());
  update public.invite_codes set status = 'utilise', used_by = v_uid, used_at = now()
  where id = v_code.id;
end $$;

create function public.create_staff_profile(p_code text, p_pseudo text, p_birth_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code public.invite_codes%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into v_code from public.invite_codes c
  where c.code = upper(btrim(p_code)) and c.kind = 'prof_eps'
  for update;
  if not found or v_code.status in ('desactive', 'cree') then
    raise exception 'code_invalide' using errcode = 'check_violation';
  end if;
  if v_code.status = 'utilise' then
    raise exception 'code_utilise' using errcode = 'check_violation';
  end if;
  if public.is_minor(p_birth_date) then
    raise exception 'majeur_requis' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.profiles p where p.id = v_uid) then
    raise exception 'profil_existant' using errcode = 'unique_violation';
  end if;

  insert into public.profiles (id, pseudo, birth_date, space)
  values (v_uid, p_pseudo, p_birth_date, 'rungen');
  insert into public.staff_roles (user_id, role, establishment_id)
  values (v_uid, 'prof_eps', v_code.establishment_id);
  update public.invite_codes set status = 'utilise', used_by = v_uid, used_at = now()
  where id = v_code.id;
end $$;

-- ---------------------------------------------------------------------------
-- Actions admin sur les comptes
-- ---------------------------------------------------------------------------
create function public.admin_set_account_disabled(p_user uuid, p_disabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin_requis' using errcode = 'insufficient_privilege';
  end if;
  update public.profiles
  set disabled_at = case when p_disabled then now() end
  where id = p_user;
  update auth.users
  set banned_until = case when p_disabled then 'infinity'::timestamptz end
  where id = p_user;
end $$;

-- Retrait de l'accord parental : suppression complète du compte.
create function public.admin_delete_account(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admin_requis' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = p_user;
end $$;

-- ---------------------------------------------------------------------------
-- Support
-- ---------------------------------------------------------------------------
create table public.support_threads (
  id uuid primary key default gen_random_uuid(),
  -- Mis à null à la suppression du compte : la conversation est conservée anonymisée.
  user_id uuid references public.profiles (id) on delete set null,
  category public.support_category not null,
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  status public.support_status not null default 'nouveau',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads (id) on delete restrict,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  attachment_path text,
  created_at timestamptz not null default now()
);
create index support_messages_thread_idx on public.support_messages (thread_id, created_at);

create function public.support_threads_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'nouveau';
  else
    if new.category is distinct from old.category
       or new.subject is distinct from old.subject
       or (new.user_id is distinct from old.user_id and new.user_id is not null) then
      raise exception 'modification_interdite' using errcode = 'check_violation';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger support_threads_before_write
before insert or update on public.support_threads
for each row execute function public.support_threads_before_write();

create function public.support_messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.support_threads set updated_at = now() where id = new.thread_id;
  return null;
end $$;

create trigger support_messages_after_insert
after insert on public.support_messages
for each row execute function public.support_messages_after_insert();

alter table public.support_threads enable row level security;
create policy support_threads_select on public.support_threads
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
-- Chacun n'ouvre une conversation que pour lui-même : l'admin ne peut pas en initier une pour un autre.
create policy support_threads_insert_own on public.support_threads
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy support_threads_update_admin on public.support_threads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- Pas de policy delete.

alter table public.support_messages enable row level security;
create policy support_messages_select on public.support_messages
  for select to authenticated
  using (exists (select 1 from public.support_threads t where t.id = thread_id));
create policy support_messages_insert on public.support_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.support_threads t
      where t.id = thread_id and (t.user_id = (select auth.uid()) or public.is_admin())
    )
  );
-- Pas de policy update ni delete : les messages sont définitifs.

-- ---------------------------------------------------------------------------
-- Droits d'exécution
-- ---------------------------------------------------------------------------
revoke all on function public.generate_invite_codes(uuid, text, int, public.invite_kind) from public, anon;
revoke all on function public.activate_invite_code(uuid) from public, anon;
revoke all on function public.deactivate_invite_code(uuid) from public, anon;
revoke all on function public.create_rungen_profile(text, text, date, boolean) from public, anon;
revoke all on function public.create_staff_profile(text, text, date) from public, anon;
revoke all on function public.admin_set_account_disabled(uuid, boolean) from public, anon;
revoke all on function public.admin_delete_account(uuid) from public, anon;

grant execute on function public.generate_invite_codes(uuid, text, int, public.invite_kind) to authenticated;
grant execute on function public.activate_invite_code(uuid) to authenticated;
grant execute on function public.deactivate_invite_code(uuid) to authenticated;
grant execute on function public.create_rungen_profile(text, text, date, boolean) to authenticated;
grant execute on function public.create_staff_profile(text, text, date) to authenticated;
grant execute on function public.admin_set_account_disabled(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_account(uuid) to authenticated;
grant execute on function public.check_invite_code(text) to anon, authenticated;
