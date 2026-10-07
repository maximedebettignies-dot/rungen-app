-- ---------------------------------------------------------------------------
-- Chronomètre et mode hors-ligne.
--
-- Deux changements, tous deux dictés par le cadrage du projet sur les
-- recommandations de l'OMS : ce qui compte d'abord, c'est le temps passé en
-- activité. La distance est un complément utile, pas une condition.
--
-- Spec : docs/specs/2026-10-07-chrono-et-hors-ligne-design.md
-- ---------------------------------------------------------------------------

-- Comment la séance a été produite. L'app l'affiche tel quel : une séance
-- chronométrée n'est pas une séance vérifiée — un chronomètre se lance en
-- marchant — mais l'information est honnête et utile au professeur.
create type public.activity_source as enum ('saisie', 'chrono');

alter table public.activities
  add column source public.activity_source not null default 'saisie';

-- La distance devient facultative (décision du 07/10/2026, rouvrant le point
-- ouvert 2.5 du bloc 2). Une séance chronométrée donne la durée, pas la
-- distance : exiger celle-ci pousserait à l'inventer. Sans distance, l'allure
-- ne s'affiche pas et la séance n'entre pas dans les records de distance, mais
-- elle compte dans le volume et dans la charge.
--
-- Ce qui reste refusé : une distance sur un sport qui se mesure en durée, et
-- une distance absurde quand elle est fournie.
create or replace function public.activities_before_write()
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
      if new.distance_m is not null and (new.distance_m <= 0 or new.distance_m > 1000000) then
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

-- `activities_before_write` est appelée par un trigger : seul le propriétaire
-- de la table doit pouvoir l'exécuter directement (bloc 1, migration 20260917).
revoke execute on function public.activities_before_write() from authenticated, anon, public;
