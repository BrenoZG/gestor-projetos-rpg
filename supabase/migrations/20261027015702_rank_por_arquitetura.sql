-- RN-14: o Rank de Missão passa a ser calculado pelo estilo arquitetural,
-- pelas capacidades e pelas stacks; a dificuldade declarada sai e a
-- estrutura/arquitetura vira obrigatória.
--
-- Etapa EXPANDIR (docs/operacao.md §4): o código anterior continua no ar
-- durante o deploy e ainda grava pela salvar_missao com dificuldade. Por isso:
-- - as colunas novas nascem com padrão (Missões existentes ficam "monolito",
--   sem capacidades, e o dono ajusta na edição);
-- - dificuldade passa a aceitar nulo, mas continua existindo;
-- - a arquitetura obrigatória é cobrada pela função nova, salvar_missao_v2.
-- A etapa CONTRAIR (deploy seguinte) remove dificuldade e salvar_missao e
-- torna arquitetura not null.
--
-- Reversão:
--   drop function public.salvar_missao_v2(uuid, text, text, text, text, text[], text, text[]);
--   update public.projetos set dificuldade = 1 where dificuldade is null;
--   alter table public.projetos alter column dificuldade set not null;
--   alter table public.projetos drop column capacidades, drop column estilo_arquitetural;

alter table public.projetos
  add column estilo_arquitetural text not null default 'monolito'
    constraint projetos_estilo_valido check (estilo_arquitetural in (
      'script', 'monolito', 'monolito_modular', 'hexagonal', 'serverless', 'eventos', 'microsservicos'
    )),
  -- Sem subconsulta em CHECK, a repetição não é barrada aqui: a função grava
  -- sem repetir e o domínio conta capacidades distintas (rank.ts).
  add column capacidades text[] not null default '{}'
    constraint projetos_capacidades_validas check (
      capacidades <@ array[
        'autenticacao', 'banco_de_dados', 'api_externa', 'tempo_real', 'filas', 'ia', 'ci_cd', 'mobile'
      ]::text[]
      and cardinality(capacidades) <= 8
    ),
  alter column dificuldade drop not null;

comment on column public.projetos.estilo_arquitetural is 'Estilo arquitetural da Missão (RN-14), base do Rank.';
comment on column public.projetos.capacidades is 'Capacidades da Missão (RN-14), cada uma soma pontos ao Rank.';
comment on column public.projetos.dificuldade is 'Obsoleta (RN-14): sai na etapa contrair.';

grant insert (estilo_arquitetural, capacidades) on table public.projetos to authenticated;
grant update (estilo_arquitetural, capacidades) on table public.projetos to authenticated;

-- Igual à salvar_missao, trocando a dificuldade por estilo e capacidades e
-- exigindo a arquitetura. SECURITY INVOKER: roda sob o RLS de quem chama.
-- Erros: 23505 nome repetido · 23514 campo fora da regra · 22023 arquitetura
-- vazia ou quantidade de stacks fora de 1 a 20 · P0002 Missão inexistente ou
-- de outro usuário.
create function public.salvar_missao_v2(
  p_id uuid,
  p_nome text,
  p_descricao text,
  p_arquitetura text,
  p_estilo text,
  p_capacidades text[],
  p_status text,
  p_stacks text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_stacks text[];
  v_capacidades text[];
begin
  if p_arquitetura is null or btrim(p_arquitetura) = '' then
    raise exception 'A estrutura e arquitetura é obrigatória' using errcode = '22023';
  end if;

  -- Sem espaços nas pontas, sem vazias e sem repetição; vence a primeira grafia.
  select coalesce(array_agg(d.nome order by d.ordem), '{}')
  into v_stacks
  from (
    select distinct on (lower(btrim(s.nome))) btrim(s.nome) as nome, s.ordem
    from unnest(p_stacks) with ordinality as s(nome, ordem)
    where btrim(s.nome) <> ''
    order by lower(btrim(s.nome)), s.ordem
  ) as d;

  if cardinality(v_stacks) not between 1 and 20 then
    raise exception 'A Missão precisa de 1 a 20 stacks; recebeu %', cardinality(v_stacks) using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct c order by c), '{}')
  into v_capacidades
  from unnest(coalesce(p_capacidades, '{}')) as c;

  if p_id is null then
    insert into public.projetos (nome, descricao, arquitetura, estilo_arquitetural, capacidades, status)
    values (btrim(p_nome), p_descricao, p_arquitetura, p_estilo, v_capacidades, p_status)
    returning id into v_id;
  else
    update public.projetos
    set nome = btrim(p_nome),
        descricao = p_descricao,
        arquitetura = p_arquitetura,
        estilo_arquitetural = p_estilo,
        capacidades = v_capacidades,
        status = p_status
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Missão não encontrada' using errcode = 'P0002';
    end if;
  end if;

  insert into public.stacks (nome)
  select unnest(v_stacks)
  on conflict (user_id, nome_normalizado) do nothing;

  delete from public.projeto_stacks where projeto_id = v_id;
  insert into public.projeto_stacks (projeto_id, stack_id)
  select v_id, s.id
  from public.stacks s
  where s.user_id = (select auth.uid())
    and s.nome_normalizado in (select lower(n) from unnest(v_stacks) as n);

  return v_id;
end;
$$;

comment on function public.salvar_missao_v2(uuid, text, text, text, text, text[], text, text[]) is
  'Cria (p_id nulo) ou altera uma Missão com estilo, capacidades e stacks, numa transação (RN-14). Devolve o id.';

revoke execute on function public.salvar_missao_v2(uuid, text, text, text, text, text[], text, text[]) from public, anon;
grant execute on function public.salvar_missao_v2(uuid, text, text, text, text, text[], text, text[]) to authenticated;
