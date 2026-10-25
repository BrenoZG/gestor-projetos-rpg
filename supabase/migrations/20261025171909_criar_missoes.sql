-- Missões (Projetos), stacks e o vínculo entre eles (modelo-de-dados.md §2).
-- - projetos: grão 1 linha por Missão.
-- - stacks: grão 1 linha por stack distinta do usuário (primeira grafia, RN-05).
-- - projeto_stacks: grão 1 linha por par (Missão, stack).
-- O Rank de Missão não é coluna: o domínio o deriva da dificuldade e das stacks.
--
-- Reversão:
--   drop function public.salvar_missao(uuid, text, text, text, smallint, text, text[]);
--   drop table public.projeto_stacks;
--   drop table public.stacks;
--   drop table public.projetos;
--   drop function public.registrar_datas_da_missao();

create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null
    constraint projetos_nome_tamanho check (char_length(nome) between 3 and 80 and nome = btrim(nome)),
  nome_normalizado text not null generated always as (lower(btrim(nome))) stored,
  descricao text not null
    constraint projetos_descricao_tamanho check (char_length(descricao) <= 2000 and btrim(descricao) <> ''),
  arquitetura text
    constraint projetos_arquitetura_tamanho check (char_length(arquitetura) <= 20000),
  dificuldade smallint not null
    constraint projetos_dificuldade_faixa check (dificuldade between 1 and 5),
  status text not null default 'backlog'
    constraint projetos_status_valido check (status in ('backlog', 'desenvolvimento', 'concluido')),
  inicio_desenvolvimento_em timestamptz,
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint projetos_conclusao_coerente check ((status = 'concluido') = (concluido_em is not null)),
  constraint projetos_nome_unico unique (user_id, nome_normalizado)
);

comment on table public.projetos is 'Missões (Projetos) do usuário.';
comment on column public.projetos.nome_normalizado is 'lower(btrim(nome)): nome único por usuário sem diferenciar maiúscula e espaços nas pontas.';
comment on column public.projetos.inicio_desenvolvimento_em is 'Ingresso mais recente em Desenvolvimento (RN-02); base da trava de 24 h (RN-06d). Gravado só pelo trigger.';
comment on column public.projetos.concluido_em is 'Preenchido só em Concluído (RN-02). Gravado só pelo trigger.';

-- O Quadro lista as Missões do usuário agrupadas por status.
create index projetos_user_id_status_idx on public.projetos (user_id, status);

create table public.stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null
    constraint stacks_nome_tamanho check (char_length(nome) between 1 and 40 and nome = btrim(nome)),
  nome_normalizado text not null generated always as (lower(btrim(nome))) stored,
  criado_em timestamptz not null default now(),
  constraint stacks_nome_unico unique (user_id, nome_normalizado)
);

comment on table public.stacks is 'Stacks do usuário; a primeira grafia cadastrada é a exibida (RN-05).';

create table public.projeto_stacks (
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  stack_id uuid not null references public.stacks (id) on delete cascade,
  primary key (projeto_id, stack_id)
);

comment on table public.projeto_stacks is 'Stacks usadas por cada Missão (1 a 20, validado em salvar_missao).';

-- A PK cobre buscas por projeto_id; esta cobre as por stack (e a cascata).
create index projeto_stacks_stack_id_idx on public.projeto_stacks (stack_id);

-- Datas de status (RN-02), gravadas só aqui: as colunas ficam fora dos GRANTs
-- de escrita, e nenhum caminho (app, função ou SQL manual) as deixa incoerentes.
create function public.registrar_datas_da_missao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status = 'desenvolvimento' then
      new.inicio_desenvolvimento_em := now();
    end if;
    new.concluido_em := case when new.status = 'concluido' then now() end;
  end if;
  if tg_op = 'UPDATE' then
    new.atualizado_em := now();
  end if;
  return new;
end;
$$;

create trigger projetos_registrar_datas
  before insert or update on public.projetos
  for each row execute function public.registrar_datas_da_missao();

alter table public.projetos enable row level security;
alter table public.stacks enable row level security;
alter table public.projeto_stacks enable row level security;

create policy "projetos: dono lê"
  on public.projetos for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "projetos: dono cria"
  on public.projetos for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "projetos: dono altera"
  on public.projetos for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "projetos: dono exclui"
  on public.projetos for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "stacks: dono lê"
  on public.stacks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "stacks: dono cria"
  on public.stacks for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- O vínculo pertence a quem é dono da Missão; ao criar, a stack também
-- precisa ser do mesmo usuário.
create policy "projeto_stacks: dono da Missão lê"
  on public.projeto_stacks for select to authenticated
  using (exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid())));
create policy "projeto_stacks: dono liga as próprias stacks"
  on public.projeto_stacks for insert to authenticated
  with check (
    exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.stacks s where s.id = stack_id and s.user_id = (select auth.uid()))
  );
create policy "projeto_stacks: dono da Missão desliga"
  on public.projeto_stacks for delete to authenticated
  using (exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid())));

-- Privilégios explícitos e mínimos. user_id vem do default (a sessão), nunca
-- do cliente; as datas de status só o trigger grava. Nada para anon.
revoke all on table public.projetos, public.stacks, public.projeto_stacks from anon, authenticated;
grant select, delete on table public.projetos to authenticated;
grant insert (nome, descricao, arquitetura, dificuldade, status) on table public.projetos to authenticated;
grant update (nome, descricao, arquitetura, dificuldade, status) on table public.projetos to authenticated;
grant select on table public.stacks to authenticated;
grant insert (nome) on table public.stacks to authenticated;
grant select, insert, delete on table public.projeto_stacks to authenticated;

-- Grava a Missão, as stacks novas e os vínculos numa transação só (ADR-0003).
-- SECURITY INVOKER: roda com a sessão de quem chama, sob o RLS acima.
-- Recebe as stacks como digitadas; a deduplicação aqui repete a do domínio
-- (normalizacao.ts) para que o banco não dependa do app.
-- Erros: 23505 nome repetido · 23514 campo fora da regra · 22023 quantidade de
-- stacks fora de 1 a 20 · P0002 Missão inexistente ou de outro usuário.
create function public.salvar_missao(
  p_id uuid,
  p_nome text,
  p_descricao text,
  p_arquitetura text,
  p_dificuldade smallint,
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
begin
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

  if p_id is null then
    insert into public.projetos (nome, descricao, arquitetura, dificuldade, status)
    values (btrim(p_nome), p_descricao, nullif(p_arquitetura, ''), p_dificuldade, p_status)
    returning id into v_id;
  else
    update public.projetos
    set nome = btrim(p_nome),
        descricao = p_descricao,
        arquitetura = nullif(p_arquitetura, ''),
        dificuldade = p_dificuldade,
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

comment on function public.salvar_missao(uuid, text, text, text, smallint, text, text[]) is
  'Cria (p_id nulo) ou altera uma Missão com as stacks, numa transação. Devolve o id.';

revoke execute on function public.salvar_missao(uuid, text, text, text, smallint, text, text[]) from public, anon;
grant execute on function public.salvar_missao(uuid, text, text, text, smallint, text, text[]) to authenticated;
revoke execute on function public.registrar_datas_da_missao() from public, anon, authenticated;
