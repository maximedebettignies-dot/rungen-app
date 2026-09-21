-- ---------------------------------------------------------------------------
-- Bloc 2 — Log d'activité manuel.
--
-- Une séance = un sport, un jour, une durée, et une distance seulement si le
-- sport se mesure en distance. Les unités sont stockées en SI (mètres,
-- secondes) ; kilomètres et minutes ne sont qu'un affichage.
-- ---------------------------------------------------------------------------

create type public.effort as enum ('facile', 'correct', 'dur');

-- Fenêtre de saisie rétroactive, en jours (décision 2.2).
create function public.jours_saisie_retroactive()
returns int language sql immutable set search_path = '' as $$ select 30 $$;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- `restrict` : supprimer un sport encore utilisé effacerait des séances en silence.
  sport_id int references public.sports (id) on delete restrict,
  custom_sport_id uuid references public.custom_sports (id) on delete restrict,
  performed_on date not null,
  duration_s int not null,
  distance_m int,
  effort public.effort,
  note text,
  -- Posé par le bloc 5 à la clôture d'un défi : la séance se fige.
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_one_sport check (num_nonnulls(sport_id, custom_sport_id) = 1)
);

create index activities_user_date_idx on public.activities (user_id, performed_on desc);

-- Famille du sport d'une séance, quelle que soit son origine.
create function public.famille_sport(p_sport int, p_custom uuid)
returns public.sport_family language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.family from public.sports s where s.id = p_sport),
    (select c.family from public.custom_sports c where c.id = p_custom)
  )
$$;

create function public.activities_before_write()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_famille public.sport_family;
begin
  -- Une séance verrouillée ne bouge plus, y compris son propre verrou.
  if tg_op = 'UPDATE' and old.locked_at is not null
     and current_user in ('authenticated', 'anon') then
    raise exception 'activite_verrouillee' using errcode = 'check_violation';
  end if;

  if new.performed_on > current_date then
    raise exception 'date_future' using errcode = 'check_violation';
  end if;
  if new.performed_on < current_date - public.jours_saisie_retroactive() then
    raise exception 'date_trop_ancienne' using errcode = 'check_violation';
  end if;

  if new.duration_s < 60 or new.duration_s > 86400 then
    raise exception 'duree_invalide' using errcode = 'check_violation';
  end if;

  -- Zéro ou deux sports : on laisse parler la contrainte `activity_one_sport`,
  -- qui nomme le problème plus précisément que ne le ferait ce trigger.
  if num_nonnulls(new.sport_id, new.custom_sport_id) = 1 then
    v_famille := public.famille_sport(new.sport_id, new.custom_sport_id);
    if v_famille is null then
      raise exception 'sport_inconnu' using errcode = 'foreign_key_violation';
    end if;

    if v_famille = 'distance' then
      if new.distance_m is null then
        raise exception 'distance_requise' using errcode = 'check_violation';
      end if;
      if new.distance_m <= 0 or new.distance_m > 1000000 then
        raise exception 'distance_invalide' using errcode = 'check_violation';
      end if;
    elsif new.distance_m is not null then
      raise exception 'distance_interdite' using errcode = 'check_violation';
    end if;
  end if;

  if new.note is not null then
    new.note := btrim(new.note);
    if new.note = '' then
      new.note := null;
    elsif char_length(new.note) > 280 then
      raise exception 'note_trop_longue' using errcode = 'check_violation';
    elsif public.contains_banned_word(new.note) then
      raise exception 'contenu_interdit' using errcode = 'check_violation';
    end if;
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger activities_before_write
before insert or update on public.activities
for each row execute function public.activities_before_write();

-- La suppression d'une séance verrouillée est refusée au même titre que sa modification.
create function public.activities_before_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.locked_at is not null and current_user in ('authenticated', 'anon') then
    raise exception 'activite_verrouillee' using errcode = 'check_violation';
  end if;
  return old;
end $$;

create trigger activities_before_delete
before delete on public.activities
for each row execute function public.activities_before_delete();

-- ---------------------------------------------------------------------------
-- RLS : en V1, chacun ne voit que ses propres séances.
-- L'ouverture aux amis viendra au bloc 4 et remplacera la policy de lecture.
-- ---------------------------------------------------------------------------
alter table public.activities enable row level security;

create policy activities_select_own on public.activities
  for select to authenticated using (user_id = (select auth.uid()));

create policy activities_insert_own on public.activities
  for insert to authenticated
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

create policy activities_update_own on public.activities
  for update to authenticated
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

create policy activities_delete_own on public.activities
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Droits : mêmes règles que le bloc 1 — rien d'appelable sans connexion,
-- et les fonctions de trigger ne sont pas des points d'entrée de l'API.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from public;
grant execute on function public.check_invite_code(text) to anon;

revoke execute on function public.activities_before_write() from authenticated;
revoke execute on function public.activities_before_delete() from authenticated;
