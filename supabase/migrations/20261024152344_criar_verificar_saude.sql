-- Função de saúde: prova que a Data API alcança o Postgres, sem tocar em dado
-- nenhum. Usada pelo /api/saude (smoke test do deploy) e, no M6, pelo keepalive.
--
-- Reversão: drop function public.verificar_saude();

create function public.verificar_saude()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

comment on function public.verificar_saude() is 'Health check: retorna true se o banco responde. Não lê nenhuma tabela.';

-- Por padrão o Postgres dá EXECUTE a PUBLIC em toda função nova. Aqui, só o
-- papel anon (requisição sem login, como a do health check) pode chamar.
revoke execute on function public.verificar_saude() from public;
grant execute on function public.verificar_saude() to anon;
