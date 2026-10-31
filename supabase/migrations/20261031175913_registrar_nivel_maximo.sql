-- Maior nível já alcançado (M4, RN-08): base das medalhas permanentes.
-- - O nível vem do domínio em TypeScript (ADR-0003); a função só guarda o
--   maior valor, então o máximo nunca desce, por qualquer caminho.
-- - SECURITY DEFINER porque `nivel_maximo` fica fora do GRANT de UPDATE:
--   abrir a coluna deixaria o usuário também baixar o valor. O corpo só toca a
--   linha de auth.uid() e o search_path é vazio (nomes sempre qualificados).
-- - Risco aceito (como o p_xp das funções do M3): o dono pode subir o próprio
--   nível chamando a função pela API. App de um usuário só, na allowlist.
--
-- Reversão:
--   drop function public.registrar_nivel_maximo(integer);

create function public.registrar_nivel_maximo(p_nivel integer)
returns smallint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nivel smallint;
begin
  if p_nivel is null or p_nivel not between 1 and 100 then
    raise exception 'nível fora de 1..100' using errcode = '22023';
  end if;

  update public.personagem
  set nivel_maximo = greatest(nivel_maximo, p_nivel::smallint)
  where user_id = (select auth.uid())
  returning nivel_maximo into v_nivel;

  return v_nivel;
end;
$$;

comment on function public.registrar_nivel_maximo(integer) is
  'Guarda o maior nível já alcançado pelo usuário logado; nunca diminui (RN-08). Devolve o valor gravado, ou nulo sem personagem.';

revoke execute on function public.registrar_nivel_maximo(integer) from public, anon;
grant execute on function public.registrar_nivel_maximo(integer) to authenticated;
