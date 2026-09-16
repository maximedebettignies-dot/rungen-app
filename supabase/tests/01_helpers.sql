-- Utilitaires partagés par les fichiers de test (fonctions temporaires de session).
\set ON_ERROR_STOP on

-- Se mettre dans la peau d'un utilisateur connecté. aal = 'aal2' simule la double authentification validée.
create or replace function pg_temp.as_user(uid uuid, aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), false);
  perform set_config('request.jwt.claims',
    case when uid is null then '' else json_build_object('sub', uid, 'aal', aal)::text end, false);
  execute 'set role authenticated';
end $$;

-- Visiteur non connecté (clé anon).
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claims', '', false);
  execute 'set role anon';
end $$;

create or replace function pg_temp.as_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claims', '', false);
end $$;

create or replace function pg_temp.expect_error(stmt text, expected text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'ÉCHEC : aucune erreur pour [%], attendu [%]', stmt, expected;
exception when others then
  if sqlerrm like 'ÉCHEC%' then raise; end if;
  if position(expected in sqlerrm) = 0 then
    raise exception 'ÉCHEC : erreur inattendue pour [%] : % (attendu %)', stmt, sqlerrm, expected;
  end if;
end $$;
