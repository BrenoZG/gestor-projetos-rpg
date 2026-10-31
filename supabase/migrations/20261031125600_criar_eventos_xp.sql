-- Ledger de XP (M3, ADR-0002, ADR-0003, ADR-0011, modelo-de-dados.md §2).
-- Grão: 1 linha por evento de XP de um item (Projeto ou Atualização).
-- - O valor do XP vem do domínio em TypeScript; as funções gravam o item e o
--   evento na mesma transação.
-- - A revogação do XP de criação (RN-06c) é um trigger AFTER DELETE: vale na
--   exclusão direta e na cascata Projeto → Atualizações (RN-04).
-- - O RLS só deixa apagar evento de criação de item já excluído: a conclusão
--   é permanente (RN-06b) por qualquer caminho.
--
-- Etapa EXPANDIR (docs/operacao.md §4): a salvar_missao_v3 continua existindo
-- para o app que está no ar durante o deploy; a etapa CONTRAIR a remove.
--
-- Reversão:
--   drop function public.resumo_xp();
--   drop function public.mudar_status_atualizacao(uuid, text, integer, text);
--   drop function public.mudar_status_missao(uuid, text, integer, text);
--   drop function public.criar_atualizacao(uuid, text, text, integer);
--   drop function public.salvar_missao_v4(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb, integer);
--   drop trigger revogar_xp_de_criacao on public.atualizacoes;
--   drop trigger revogar_xp_de_criacao on public.projetos;
--   drop function public.revogar_xp_de_criacao();
--   drop table public.eventos_xp;
--   drop function public.trilha_do_tipo(text);

create table public.eventos_xp (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null
    constraint eventos_xp_tipo_valido
      check (tipo in ('criacao_projeto', 'criacao_atualizacao', 'conclusao_projeto', 'conclusao_atualizacao')),
  trilha text not null
    constraint eventos_xp_trilha_valida check (trilha in ('desenvolvedor', 'produtividade')),
  -- Sem FK: o evento sobrevive à exclusão do item (RN-06b).
  referencia_id uuid not null,
  xp integer not null constraint eventos_xp_positivo check (xp > 0),
  nome_snapshot text not null
    constraint eventos_xp_nome_tamanho check (char_length(nome_snapshot) between 1 and 120),
  rank_snapshot text
    constraint eventos_xp_rank_valido check (rank_snapshot in ('E', 'D', 'C', 'B', 'A', 'S')),
  stacks_snapshot text[] not null default '{}'
    constraint eventos_xp_stacks_tamanho check (cardinality(stacks_snapshot) <= 20),
  criado_em timestamptz not null default now(),
  -- O dono entra na chave: sem ele, um usuário ocuparia o par (item, tipo) de
  -- outro e bloquearia o XP dele.
  constraint eventos_xp_unico unique (user_id, referencia_id, tipo),
  constraint eventos_xp_rank_so_desenvolvedor check (trilha = 'desenvolvedor' or rank_snapshot is null),
  constraint eventos_xp_stacks_so_conclusao_projeto check (tipo = 'conclusao_projeto' or stacks_snapshot = '{}')
);

comment on table public.eventos_xp is 'Ledger de XP (append-only): o XP total é a soma; a única remoção é a revogação do XP de criação (RN-06c).';
comment on column public.eventos_xp.rank_snapshot is 'Rank do Projeto no momento do evento; nulo na trilha Produtividade e nos eventos de criação.';
comment on column public.eventos_xp.stacks_snapshot is 'Stacks ou ferramentas normalizadas na conclusão do Projeto: base da Maestria e do Domínio (RN-10, RN-18).';

-- Soma por trilha do HUD em varredura só do índice.
create index eventos_xp_user_id_trilha_idx on public.eventos_xp (user_id, trilha) include (xp);

alter table public.eventos_xp enable row level security;

create policy "eventos_xp: dono lê"
  on public.eventos_xp for select to authenticated
  using ((select auth.uid()) = user_id);
-- Só para item próprio: o tipo diz se a referência é Projeto ou Atualização.
create policy "eventos_xp: dono registra para item próprio"
  on public.eventos_xp for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and case
      when tipo in ('criacao_projeto', 'conclusao_projeto') then exists (
        select 1 from public.projetos p where p.id = referencia_id and p.user_id = (select auth.uid()))
      else exists (
        select 1 from public.atualizacoes a where a.id = referencia_id and a.user_id = (select auth.uid()))
    end
  );
-- Só a criação de item que já foi excluído; conclusão nunca (RN-06b). Quem
-- confere "sem conclusão" é o trigger: uma policy que consultasse a própria
-- eventos_xp entraria em recursão infinita no Postgres.
create policy "eventos_xp: dono revoga criação de item excluído"
  on public.eventos_xp for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and case tipo
      when 'criacao_projeto' then not exists (select 1 from public.projetos p where p.id = referencia_id)
      when 'criacao_atualizacao' then not exists (select 1 from public.atualizacoes a where a.id = referencia_id)
      else false
    end
  );

-- Sem UPDATE. O dono vem do default auth.uid(), nunca do cliente.
revoke all on table public.eventos_xp from anon, authenticated;
grant select, delete on table public.eventos_xp to authenticated;
grant insert (tipo, trilha, referencia_id, xp, nome_snapshot, rank_snapshot, stacks_snapshot)
  on table public.eventos_xp to authenticated;

-- Trilha em que o evento nasce, pelo tipo do Projeto (RN-18).
create function public.trilha_do_tipo(p_tipo text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_tipo when 'dev' then 'desenvolvedor' when 'geral' then 'produtividade' end;
$$;

revoke execute on function public.trilha_do_tipo(text) from public, anon;
grant execute on function public.trilha_do_tipo(text) to authenticated;

-- RN-06c: excluir o item revoga o XP de criação, se ele não tem conclusão. Na
-- cascata, roda uma vez por Atualização excluída junto com o Projeto.
create function public.revogar_xp_de_criacao()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tipo text := case tg_table_name when 'projetos' then 'criacao_projeto' else 'criacao_atualizacao' end;
begin
  delete from public.eventos_xp e
  where e.user_id = old.user_id
    and e.referencia_id = old.id
    and e.tipo = v_tipo
    and not exists (
      select 1 from public.eventos_xp c
      where c.user_id = e.user_id
        and c.referencia_id = e.referencia_id
        and c.tipo = replace(v_tipo, 'criacao_', 'conclusao_'));
  return null;
end;
$$;

revoke execute on function public.revogar_xp_de_criacao() from public, anon, authenticated;

create trigger revogar_xp_de_criacao
  after delete on public.projetos
  for each row execute function public.revogar_xp_de_criacao();
create trigger revogar_xp_de_criacao
  after delete on public.atualizacoes
  for each row execute function public.revogar_xp_de_criacao();

-- Em relação à v3: recebe o XP de criação, calculado pelo domínio, e o grava
-- no ledger na mesma transação. Mesmos erros da v3.
create function public.salvar_missao_v4(
  p_id uuid,
  p_tipo text,
  p_nome text,
  p_descricao text,
  p_arquitetura text,
  p_estilo text,
  p_capacidades text[],
  p_status text,
  p_stacks text[],
  p_tags text[],
  p_links jsonb,
  p_xp_criacao integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_stacks text[];
  v_tags text[];
  v_capacidades text[] := '{}';
  v_arquitetura text;
  v_estilo text;
  v_minimo_stacks integer := 0;
  v_links jsonb := coalesce(p_links, '[]'::jsonb);
begin
  -- Na Missão Geral os campos técnicos enviados são descartados (RN-16: trocar
  -- de Desenvolvimento para Geral os apaga). Tipo desconhecido cai aqui e o
  -- CHECK projetos_tipo_valido o recusa.
  if p_tipo = 'dev' then
    if p_arquitetura is null or btrim(p_arquitetura) = '' then
      raise exception 'A estrutura e arquitetura é obrigatória' using errcode = '22023';
    end if;
    v_arquitetura := p_arquitetura;
    v_estilo := p_estilo;
    v_minimo_stacks := 1;
    select coalesce(array_agg(distinct c order by c), '{}')
    into v_capacidades
    from unnest(coalesce(p_capacidades, '{}')) as c;
  end if;

  -- Sem espaços nas pontas, sem vazias e sem repetição; vence a primeira grafia.
  select coalesce(array_agg(d.nome order by d.ordem), '{}')
  into v_stacks
  from (
    select distinct on (lower(btrim(s.nome))) btrim(s.nome) as nome, s.ordem
    from unnest(coalesce(p_stacks, '{}')) with ordinality as s(nome, ordem)
    where btrim(s.nome) <> ''
    order by lower(btrim(s.nome)), s.ordem
  ) as d;

  if cardinality(v_stacks) not between v_minimo_stacks and 20 then
    raise exception 'A Missão aceita de % a 20 stacks; recebeu %', v_minimo_stacks, cardinality(v_stacks)
      using errcode = '22023';
  end if;

  select coalesce(array_agg(d.nome order by d.ordem), '{}')
  into v_tags
  from (
    select distinct on (lower(btrim(t.nome))) btrim(t.nome) as nome, t.ordem
    from unnest(coalesce(p_tags, '{}')) with ordinality as t(nome, ordem)
    where btrim(t.nome) <> ''
    order by lower(btrim(t.nome)), t.ordem
  ) as d;

  if cardinality(v_tags) > 10 then
    raise exception 'A Missão aceita até 10 tags; recebeu %', cardinality(v_tags) using errcode = '22023';
  end if;

  if jsonb_typeof(v_links) <> 'array' or jsonb_array_length(v_links) > 20 then
    raise exception 'Os links precisam ser uma lista de até 20 itens' using errcode = '22023';
  end if;

  if p_id is null then
    if p_status is null then
      raise exception 'O status inicial é obrigatório' using errcode = '22023';
    end if;
    insert into public.projetos (tipo, nome, descricao, arquitetura, estilo_arquitetural, capacidades, status)
    values (p_tipo, btrim(p_nome), p_descricao, v_arquitetura, v_estilo, v_capacidades, p_status)
    returning id into v_id;

    -- XP de criação (RN-06): o valor vem do domínio (ADR-0003); a trilha sai do tipo.
    if p_xp_criacao is not null then
      insert into public.eventos_xp (tipo, trilha, referencia_id, xp, nome_snapshot)
      values ('criacao_projeto', public.trilha_do_tipo(p_tipo), v_id, p_xp_criacao, btrim(p_nome));
    end if;
  else
    update public.projetos
    set tipo = p_tipo,
        nome = btrim(p_nome),
        descricao = p_descricao,
        arquitetura = v_arquitetura,
        estilo_arquitetural = v_estilo,
        capacidades = v_capacidades
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

  insert into public.tags (nome)
  select unnest(v_tags)
  on conflict (user_id, nome_normalizado) do nothing;

  delete from public.projeto_tags where projeto_id = v_id;
  insert into public.projeto_tags (projeto_id, tag_id)
  select v_id, t.id
  from public.tags t
  where t.user_id = (select auth.uid())
    and t.nome_normalizado in (select lower(n) from unnest(v_tags) as n);

  -- Os links são trocados inteiros: a ordem sai da posição na lista (0, 1, …).
  delete from public.projeto_links where projeto_id = v_id;
  insert into public.projeto_links (projeto_id, url, titulo, ordem)
  select v_id, l.item ->> 'url', nullif(btrim(l.item ->> 'titulo'), ''), (l.posicao - 1)::smallint
  from jsonb_array_elements(v_links) with ordinality as l(item, posicao);

  return v_id;
end;
$$;

comment on function public.salvar_missao_v4(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb, integer) is
  'Como a v3 e, na criação, grava o XP de criação no ledger na mesma transação (RN-06). Devolve o id.';

revoke execute on function public.salvar_missao_v4(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb, integer) from public, anon;
grant execute on function public.salvar_missao_v4(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb, integer) to authenticated;

-- Cria a Atualização (status Backlog, padrão da tabela) e grava o XP de
-- criação na mesma transação. A trilha sai do tipo do Projeto vinculado.
-- Erros: os da tabela (23514 campo fora da regra) e 42501 se o Projeto não é
-- do usuário (policy de insert, RN-01).
create function public.criar_atualizacao(
  p_projeto_id uuid,
  p_titulo text,
  p_descricao text,
  p_xp_criacao integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.atualizacoes (projeto_id, titulo, descricao)
  values (p_projeto_id, p_titulo, p_descricao)
  returning id into v_id;

  if p_xp_criacao is not null then
    insert into public.eventos_xp (tipo, trilha, referencia_id, xp, nome_snapshot)
    select 'criacao_atualizacao', public.trilha_do_tipo(p.tipo), v_id, p_xp_criacao, p_titulo
    from public.projetos p
    where p.id = p_projeto_id;
  end if;

  return v_id;
end;
$$;

comment on function public.criar_atualizacao(uuid, text, text, integer) is
  'Cria uma Atualização e grava o XP de criação no ledger numa transação (RN-06). Devolve o id.';

revoke execute on function public.criar_atualizacao(uuid, text, text, integer) from public, anon;
grant execute on function public.criar_atualizacao(uuid, text, text, integer) to authenticated;

-- Muda o status do Projeto e, ao concluir com XP (o domínio já conferiu a
-- trava de 24 h, RN-06d), grava o evento com os snapshots, na mesma transação.
-- Mover para o status atual não grava nada (idempotente). O evento repetido é
-- ignorado (RN-06a): xp_ganho nulo diz que não houve XP novo.
-- Situação: movida · sem_mudanca · inexistente (ou de outro usuário).
create function public.mudar_status_missao(
  p_id uuid,
  p_status text,
  p_xp integer,
  p_rank text
)
returns table (situacao text, xp_ganho integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tipo text;
  v_nome text;
  v_xp integer;
begin
  update public.projetos
  set status = p_status
  where id = p_id and status <> p_status
  returning tipo, nome into v_tipo, v_nome;

  if v_tipo is null then
    return query
      select case when exists (select 1 from public.projetos where id = p_id)
        then 'sem_mudanca' else 'inexistente' end, null::integer;
    return;
  end if;

  if p_status = 'concluido' and p_xp is not null then
    insert into public.eventos_xp (tipo, trilha, referencia_id, xp, nome_snapshot, rank_snapshot, stacks_snapshot)
    select 'conclusao_projeto', public.trilha_do_tipo(v_tipo), p_id, p_xp, v_nome,
      case when v_tipo = 'dev' then p_rank end,
      coalesce(array_agg(s.nome_normalizado order by s.nome_normalizado), '{}')
    from public.projeto_stacks ps
    join public.stacks s on s.id = ps.stack_id
    where ps.projeto_id = p_id
    on conflict (user_id, referencia_id, tipo) do nothing
    returning xp into v_xp;
  end if;

  return query select 'movida'::text, v_xp;
end;
$$;

comment on function public.mudar_status_missao(uuid, text, integer, text) is
  'Muda o status do Projeto e, ao concluir com XP, grava o evento de conclusão com os snapshots, numa transação (RN-06).';

revoke execute on function public.mudar_status_missao(uuid, text, integer, text) from public, anon;
grant execute on function public.mudar_status_missao(uuid, text, integer, text) to authenticated;

-- Como mudar_status_missao, para a Atualização: o Rank e a trilha são os do
-- Projeto vinculado no momento da conclusão.
create function public.mudar_status_atualizacao(
  p_id uuid,
  p_status text,
  p_xp integer,
  p_rank text
)
returns table (situacao text, xp_ganho integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_projeto_id uuid;
  v_titulo text;
  v_xp integer;
begin
  update public.atualizacoes
  set status = p_status
  where id = p_id and status <> p_status
  returning projeto_id, titulo into v_projeto_id, v_titulo;

  if v_projeto_id is null then
    return query
      select case when exists (select 1 from public.atualizacoes where id = p_id)
        then 'sem_mudanca' else 'inexistente' end, null::integer;
    return;
  end if;

  if p_status = 'concluido' and p_xp is not null then
    insert into public.eventos_xp (tipo, trilha, referencia_id, xp, nome_snapshot, rank_snapshot)
    select 'conclusao_atualizacao', public.trilha_do_tipo(p.tipo), p_id, p_xp, v_titulo,
      case when p.tipo = 'dev' then p_rank end
    from public.projetos p
    where p.id = v_projeto_id
    on conflict (user_id, referencia_id, tipo) do nothing
    returning xp into v_xp;
  end if;

  return query select 'movida'::text, v_xp;
end;
$$;

comment on function public.mudar_status_atualizacao(uuid, text, integer, text) is
  'Muda o status da Atualização e, ao concluir com XP, grava o evento de conclusão, numa transação (RN-06).';

revoke execute on function public.mudar_status_atualizacao(uuid, text, integer, text) from public, anon;
grant execute on function public.mudar_status_atualizacao(uuid, text, integer, text) to authenticated;

-- XP total por trilha do usuário logado, para o HUD (a Data API não soma).
create function public.resumo_xp()
returns table (trilha text, xp_total integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.trilha, sum(e.xp)::integer
  from public.eventos_xp e
  where e.user_id = (select auth.uid())
  group by e.trilha;
$$;

comment on function public.resumo_xp() is 'XP total por trilha do usuário logado (HUD, RF-12).';

revoke execute on function public.resumo_xp() from public, anon;
grant execute on function public.resumo_xp() to authenticated;
