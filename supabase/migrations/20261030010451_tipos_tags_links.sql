-- Tipos de projeto (RN-15), tags (RF-24) e links de referência (RF-26, RN-17).
-- - projetos.tipo: 'dev' tem a parte técnica e o Rank; 'geral', não.
-- - tags: grão 1 linha por tag distinta do usuário (primeira grafia, RN-05).
-- - projeto_tags: grão 1 linha por par (Missão, tag).
-- - projeto_links: grão 1 linha por link de uma Missão, na ordem da tela.
-- As ferramentas das Missões Gerais usam stacks e projeto_stacks.
--
-- Etapa EXPANDIR (docs/operacao.md §4): o código anterior continua no ar
-- durante o deploy e ainda grava pela salvar_missao_v2. Por isso:
-- - tipo nasce com padrão 'dev' (Missões existentes e as do app antigo);
-- - estilo_arquitetural mantém o padrão 'monolito' até a etapa contrair;
-- - a salvar_missao_v2 continua existindo; a v3 grava tipo, tags e links.
-- A etapa CONTRAIR (deploy seguinte) remove a v2 e o padrão do estilo.
--
-- Reversão (só antes de existir Missão Geral; com elas, o NOT NULL falha):
--   drop function public.salvar_missao_v3(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb);
--   drop table public.projeto_links;
--   drop table public.projeto_tags;
--   drop table public.tags;
--   alter table public.projetos drop constraint projetos_campos_por_tipo,
--     drop constraint projetos_arquitetura_tamanho,
--     add constraint projetos_arquitetura_tamanho
--       check (char_length(arquitetura) <= 20000 and btrim(arquitetura) <> ''),
--     alter column arquitetura set not null,
--     alter column estilo_arquitetural set not null,
--     drop column tipo;

alter table public.projetos
  add column tipo text not null default 'dev'
    constraint projetos_tipo_valido check (tipo in ('dev', 'geral')),
  alter column estilo_arquitetural drop not null,
  alter column arquitetura drop not null,
  drop constraint projetos_arquitetura_tamanho,
  add constraint projetos_arquitetura_tamanho
    check (arquitetura is null or (char_length(arquitetura) <= 20000 and btrim(arquitetura) <> '')),
  -- RN-15: Desenvolvimento exige a parte técnica; Geral não tem nenhuma.
  add constraint projetos_campos_por_tipo check (
    (tipo = 'dev' and estilo_arquitetural is not null and arquitetura is not null)
    or (tipo = 'geral' and estilo_arquitetural is null and arquitetura is null and capacidades = '{}')
  );

comment on column public.projetos.tipo is 'Tipo da Missão (RN-15): dev tem estilo, arquitetura e Rank; geral, não.';
comment on column public.projetos.arquitetura is 'Estrutura e arquitetura em Markdown: obrigatória em dev (RN-14), nula em geral.';
comment on column public.projetos.estilo_arquitetural is 'Estilo arquitetural (RN-14), base do Rank: obrigatório em dev, nulo em geral.';

grant insert (tipo), update (tipo) on table public.projetos to authenticated;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null
    constraint tags_nome_tamanho check (char_length(nome) between 1 and 30 and nome = btrim(nome)),
  nome_normalizado text not null generated always as (lower(btrim(nome))) stored,
  criado_em timestamptz not null default now(),
  constraint tags_nome_unico unique (user_id, nome_normalizado)
);

comment on table public.tags is 'Tags do usuário (RF-24); a primeira grafia cadastrada é a exibida (RN-05).';

create table public.projeto_tags (
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (projeto_id, tag_id)
);

comment on table public.projeto_tags is 'Tags de cada Missão (0 a 10, validado em salvar_missao_v3).';

-- A PK cobre buscas por projeto_id; esta cobre as por tag (filtro e cascata).
create index projeto_tags_tag_id_idx on public.projeto_tags (tag_id);

create table public.projeto_links (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  -- Segunda barreira da RN-17 (a primeira é a validação da aplicação): só
  -- https, sem usuário ou senha antes do domínio, sem espaços.
  url text not null
    constraint projeto_links_url_valida check (
      char_length(url) <= 2000 and url ~ '^https://[^/?#@[:space:]]+([/?#][^[:space:]]*)?$'
    ),
  titulo text
    constraint projeto_links_titulo_tamanho check (titulo is null or (char_length(titulo) <= 80 and btrim(titulo) <> '')),
  ordem smallint not null
    constraint projeto_links_ordem_faixa check (ordem between 0 and 19),
  criado_em timestamptz not null default now(),
  -- O índice desta restrição também cobre as buscas por projeto_id.
  constraint projeto_links_ordem_unica unique (projeto_id, ordem)
);

comment on table public.projeto_links is 'Links de referência de cada Missão (RF-26), na ordem da tela. O servidor nunca os abre.';

alter table public.tags enable row level security;
alter table public.projeto_tags enable row level security;
alter table public.projeto_links enable row level security;

create policy "tags: dono lê"
  on public.tags for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "tags: dono cria"
  on public.tags for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- O vínculo pertence a quem é dono da Missão; ao criar, a tag também precisa
-- ser do mesmo usuário (igual a projeto_stacks).
create policy "projeto_tags: dono da Missão lê"
  on public.projeto_tags for select to authenticated
  using (exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid())));
create policy "projeto_tags: dono liga as próprias tags"
  on public.projeto_tags for insert to authenticated
  with check (
    exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = (select auth.uid()))
  );
create policy "projeto_tags: dono da Missão desliga"
  on public.projeto_tags for delete to authenticated
  using (exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid())));

create policy "projeto_links: dono da Missão lê"
  on public.projeto_links for select to authenticated
  using (exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid())));
create policy "projeto_links: dono da Missão cria"
  on public.projeto_links for insert to authenticated
  with check (exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid())));
create policy "projeto_links: dono da Missão exclui"
  on public.projeto_links for delete to authenticated
  using (exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid())));

-- Privilégios explícitos e mínimos. user_id da tag vem do default (a sessão),
-- nunca do cliente; links não são alterados, só trocados. Nada para anon.
revoke all on table public.tags, public.projeto_tags, public.projeto_links from anon, authenticated;
grant select on table public.tags to authenticated;
grant insert (nome) on table public.tags to authenticated;
grant select, insert, delete on table public.projeto_tags to authenticated;
grant select, delete on table public.projeto_links to authenticated;
grant insert (projeto_id, url, titulo, ordem) on table public.projeto_links to authenticated;

-- Grava a Missão com stacks (ou ferramentas), tags e links numa transação.
-- Em relação à v2: recebe o tipo, as tags e os links e, na edição, não altera
-- o status (ele muda pelo Quadro e pela ficha). SECURITY INVOKER: roda sob o
-- RLS de quem chama.
-- Erros: 23505 nome repetido · 23514 campo fora da regra · 22023 arquitetura
-- vazia, status inicial ausente ou quantidade fora do limite (stacks 1 a 20
-- em dev e 0 a 20 em geral, tags 0 a 10, links 0 a 20) · P0002 Missão
-- inexistente ou de outro usuário.
create function public.salvar_missao_v3(
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
  p_links jsonb
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

comment on function public.salvar_missao_v3(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb) is
  'Cria (p_id nulo) ou altera uma Missão com tipo, stacks ou ferramentas, tags e links, numa transação (RN-15). Na edição, não altera o status. Devolve o id.';

revoke execute on function public.salvar_missao_v3(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb) from public, anon;
grant execute on function public.salvar_missao_v3(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb) to authenticated;
