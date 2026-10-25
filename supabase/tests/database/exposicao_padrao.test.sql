-- Objetos novos no schema public nascem sem acesso pela Data API (pgTAP).
-- Rodam com `npm run db:test`. Cada migration concede o que precisa, explicitamente.
begin;
select plan(10);

create table public.teste_exposicao (id bigint generated always as identity primary key);
create function public.teste_exposicao_funcao() returns int language sql as $$ select 1; $$;

select table_privs_are('public', 'teste_exposicao', 'anon', array[]::text[], 'tabela nova: anon sem privilégio');
select table_privs_are('public', 'teste_exposicao', 'authenticated', array[]::text[], 'tabela nova: authenticated sem privilégio');
select table_privs_are('public', 'teste_exposicao', 'service_role', array[]::text[], 'tabela nova: service_role sem privilégio');

select sequence_privs_are('public', 'teste_exposicao_id_seq', 'anon', array[]::text[], 'sequência nova: anon sem privilégio');
select sequence_privs_are('public', 'teste_exposicao_id_seq', 'authenticated', array[]::text[], 'sequência nova: authenticated sem privilégio');

select ok(not has_function_privilege('anon', 'public.teste_exposicao_funcao()', 'execute'), 'função nova: anon não executa');
select ok(not has_function_privilege('authenticated', 'public.teste_exposicao_funcao()', 'execute'), 'função nova: authenticated não executa');
select ok(not has_function_privilege('service_role', 'public.teste_exposicao_funcao()', 'execute'), 'função nova: service_role não executa');
select ok(
  not exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'teste_exposicao_funcao' and grantee = 'PUBLIC'
  ),
  'função nova: PUBLIC sem EXECUTE'
);

-- Os objetos que já existiam continuam com os GRANTs explícitos das suas migrations.
select ok(has_function_privilege('anon', 'public.verificar_saude()', 'execute'), 'verificar_saude continua executável por anon');

select * from finish();
rollback;
