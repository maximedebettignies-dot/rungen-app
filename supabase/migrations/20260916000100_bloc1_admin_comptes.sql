-- ---------------------------------------------------------------------------
-- Bloc 1 — Retrouver un compte à partir de son code d'invitation.
--
-- L'admin ne peut pas parcourir les profils : la RLS de `profiles` limite la
-- lecture à son propre profil, et c'est voulu. Le parcours prévu par la spec
-- part du papier : « l'admin retrouve le code via le papier et supprime le
-- compte ». Cette fonction est donc la seule porte d'entrée, code en main.
--
-- Un prof d'EPS y a accès pour son seul établissement ; le public jamais.
-- Comme tous les pouvoirs d'encadrement, elle exige la double authentification.
-- ---------------------------------------------------------------------------
create function public.find_account_by_code(p_code text)
returns table (
  user_id uuid,
  pseudo text,
  space public.space,
  disabled_at timestamptz,
  establishment_name text,
  class_label text,
  code_status public.invite_status
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_etab_prof uuid := public.my_prof_establishment();
begin
  if not public.is_admin() and v_etab_prof is null then
    raise exception 'encadrant_requis' using errcode = 'insufficient_privilege';
  end if;

  return query
  select p.id, p.pseudo, p.space, p.disabled_at, e.name, c.class_label, c.status
  from public.invite_codes c
  join public.establishments e on e.id = c.establishment_id
  join public.profiles p on p.id = c.used_by
  where c.code = upper(btrim(p_code))
    -- Un prof reste borné à son établissement.
    and (public.is_admin() or c.establishment_id = v_etab_prof);
end $$;

revoke all on function public.find_account_by_code(text) from public;
grant execute on function public.find_account_by_code(text) to authenticated;
