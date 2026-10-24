-- Testes da função de saúde do banco (pgTAP). Rodam com `npm run db:test`.
begin;
select plan(7);

select has_function('public', 'verificar_saude', array[]::text[], 'a função verificar_saude existe');
select function_returns('public', 'verificar_saude', array[]::text[], 'boolean', 'retorna boolean');
select ok(
  not (select prosecdef from pg_proc where oid = 'public.verificar_saude()'::regprocedure),
  'é SECURITY INVOKER (não ganha privilégios do dono)'
);
select ok(has_function_privilege('anon', 'public.verificar_saude()', 'execute'), 'anon pode executar (health check sem login)');
select ok(
  not exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'verificar_saude' and grantee = 'PUBLIC'
  ),
  'PUBLIC não tem EXECUTE (o padrão do Postgres foi revogado)'
);

set local role anon;
select is(public.verificar_saude(), true, 'como anon, responde true');
select is(
  (select count(*)::int from pg_proc where proname = 'verificar_saude'),
  1,
  'há uma única versão da função (sem sobrecarga)'
);

select * from finish();
rollback;
