-- ---------------------------------------------------------------------------
-- Bloc 1 — Réduction de la surface exposée à l'API REST.
--
-- Supabase accorde par défaut l'exécution de toute fonction de `public` à
-- `anon` et `authenticated` : chacune devient un point d'entrée
-- `/rest/v1/rpc/<nom>`. Les avis de sécurité du projet l'ont relevé, dont un
-- oubli côté `find_account_by_code` (le `revoke ... from public` d'origine ne
-- retirait pas le droit accordé directement à `anon`).
--
-- Règle retenue :
--   * `anon` n'appelle que `check_invite_code` — la vérification d'un code
--     précède la connexion dans le parcours RUNGEN ;
--   * les fonctions de trigger ne sont appelables par personne : Postgres les
--     déclenche sans passer par le droit d'exécution de l'appelant ;
--   * `authenticated` garde le reste, nécessaire aux policies RLS, qui
--     s'évaluent avec les droits de l'utilisateur courant.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from public;

-- Seule porte ouverte avant connexion.
grant execute on function public.check_invite_code(text) to anon;

-- Fonctions de trigger : jamais des points d'entrée de l'API.
revoke execute on function public.profiles_before_write() from authenticated;
revoke execute on function public.custom_sports_before_write() from authenticated;
revoke execute on function public.staff_roles_before_write() from authenticated;
revoke execute on function public.support_threads_before_write() from authenticated;
revoke execute on function public.support_messages_after_insert() from authenticated;
