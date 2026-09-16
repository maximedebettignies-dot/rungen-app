-- ---------------------------------------------------------------------------
-- Bloc 1 — Stockage : photo de profil et pièces jointes du support.
-- Deux buckets privés. Les chemins portent la règle d'accès :
--   avatars : {user_id}/avatar.jpg
--   support : {user_id}/{nom du fichier}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false), ('support', 'support', false)
on conflict (id) do nothing;

-- Propriétaire du fichier d'après son chemin (premier dossier), sans dépendre
-- de storage.foldername() pour rester testable sur un Postgres nu.
create function public.storage_owner(chemin text)
returns uuid language plpgsql immutable set search_path = '' as $$
declare
  v_premier text := split_part(chemin, '/', 1);
begin
  -- Un chemin sans dossier, ou dont le dossier n'est pas un UUID, n'appartient à personne.
  return v_premier::uuid;
exception when invalid_text_representation then
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- Photos de profil
-- Lecture : exactement les mêmes personnes que celles qui voient la carte de
-- profil, en réutilisant la vue public_profiles (donc jamais le public pour un
-- membre RUNGEN, et personne pour un compte désactivé).
-- ---------------------------------------------------------------------------
create policy avatars_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1 from public.public_profiles v
      where v.id = public.storage_owner(name)
    )
  );

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.storage_owner(name) = (select auth.uid()));

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.storage_owner(name) = (select auth.uid()))
  with check (bucket_id = 'avatars' and public.storage_owner(name) = (select auth.uid()));

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.storage_owner(name) = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Pièces jointes du support (captures d'écran)
-- Lisibles par leur auteur et par l'admin ; jamais par un autre utilisateur.
-- Comme les messages, elles ne sont ni modifiables ni supprimables.
-- ---------------------------------------------------------------------------
create policy support_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support'
    and (public.storage_owner(name) = (select auth.uid()) or public.is_admin())
  );

create policy support_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'support' and public.storage_owner(name) = (select auth.uid()));
-- Pas de policy update ni delete : une pièce jointe est définitive.
