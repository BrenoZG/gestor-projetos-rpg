-- M5: cinemática de level up uma vez por nível (RF-16, RN-08) e Maestria por
-- stack ou ferramenta (RN-10, RN-18).
-- - `nivel_visto`: último nível cuja cinemática já tocou. Só expande (coluna com
--   default e funções novas): o código anterior ignora tudo isto.
-- - Linhas existentes começam com o nível já alcançado como visto, para não
--   tocar de uma vez a festa dos níveis antigos (decisão do dono no M5).
-- - `marcar_conquista_vista` é SECURITY DEFINER pelo mesmo motivo da
--   `registrar_nivel_maximo`: com GRANT UPDATE na coluna, o usuário também
--   baixaria o valor. O corpo só toca a linha de auth.uid(), nunca passa do
--   `nivel_maximo` e o search_path é vazio (nomes sempre qualificados).
-- - `maestria()` é SECURITY INVOKER: soma no banco, sob o RLS de quem chama.
--
-- Reversão:
--   drop function public.maestria();
--   drop function public.marcar_conquista_vista(integer);
--   alter table public.personagem drop column nivel_visto;

alter table public.personagem
  add column nivel_visto smallint not null default 1
    constraint personagem_nivel_visto_faixa check (nivel_visto between 1 and 100);

comment on column public.personagem.nivel_visto is
  'Último nível cuja cinemática de conquista já foi exibida; só aumenta e não passa do nivel_maximo (RN-08).';

update public.personagem
set nivel_visto = nivel_maximo,
    medalha_vista = greatest(medalha_vista, (nivel_maximo / 10)::smallint);

create function public.marcar_conquista_vista(p_nivel integer)
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

  -- No SET, `nivel_visto` à direita é o valor antigo: as duas colunas usam a mesma conta.
  update public.personagem
  set nivel_visto = greatest(nivel_visto, least(p_nivel, nivel_maximo))::smallint,
      medalha_vista = greatest(
        medalha_vista,
        (greatest(nivel_visto, least(p_nivel, nivel_maximo)) / 10)::smallint
      )
  where user_id = (select auth.uid())
  returning nivel_visto into v_nivel;

  return v_nivel;
end;
$$;

comment on function public.marcar_conquista_vista(integer) is
  'Marca a cinemática até o nível dado como vista, sem passar do nivel_maximo; nunca diminui. Devolve o valor gravado, ou nulo sem personagem.';

revoke execute on function public.marcar_conquista_vista(integer) from public, anon;
grant execute on function public.marcar_conquista_vista(integer) to authenticated;

-- Grão: 1 linha por (trilha, stack). O XP de um Projeto conta inteiro para
-- cada stack dele (gamificacao.md §5); o `distinct` no unnest impede que uma
-- stack repetida no mesmo snapshot conte duas vezes. O join com `stacks` é
-- 1:1 (unique user_id + nome_normalizado) e só traz a grafia exibida (RN-05).
create function public.maestria()
returns table (trilha text, nome text, xp integer, projetos integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.trilha,
    coalesce(s.nome, item.stack),
    sum(e.xp)::integer,
    count(distinct e.referencia_id)::integer
  from public.eventos_xp e
  cross join lateral (select distinct unnest(e.stacks_snapshot)) as item (stack)
  left join public.stacks s
    on s.user_id = e.user_id and s.nome_normalizado = item.stack
  where e.user_id = (select auth.uid())
    and e.tipo = 'conclusao_projeto'
  group by e.trilha, item.stack, s.nome
  order by e.trilha, sum(e.xp) desc, coalesce(s.nome, item.stack);
$$;

comment on function public.maestria() is
  'XP de conclusão de Projetos por trilha e stack (ou ferramenta) do usuário logado: base da Maestria e do Domínio (RN-10, RN-18).';

revoke execute on function public.maestria() from public, anon;
grant execute on function public.maestria() to authenticated;
