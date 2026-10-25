-- Objetos novos no schema public deixam de nascer acessíveis pela Data API.
--
-- Sem isto, toda tabela, sequência e função criada pelo papel postgres recebe
-- automaticamente privilégios para anon, authenticated e service_role, e só o
-- RLS separa os dados de quem chama a API. A partir daqui, cada migration
-- concede, explicitamente, só o que o objeto precisa (decisão D7).
-- Comandos da documentação do Supabase ("Securing your API").
--
-- Afeta só objetos criados depois desta migration: os GRANTs de personagem e
-- verificar_saude continuam como estão.
--
-- Reversão:
--   alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
--   alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
--   alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
--   alter default privileges for role postgres grant execute on functions to public;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;

-- Vale para funções que o postgres criar em qualquer schema: uma função
-- auxiliar chamada por uma policy de RLS precisa de GRANT EXECUTE explícito.
alter default privileges for role postgres revoke execute on functions from public;
