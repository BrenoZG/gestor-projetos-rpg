-- Atualizações das Missões (M2, modelo-de-dados.md §2).
-- Grão: 1 linha por Atualização. Pertence a exatamente uma Missão (RN-01) e
-- sai junto com ela (RN-04, ON DELETE CASCADE).
--
-- Reversão:
--   drop table public.atualizacoes;
--   drop function public.registrar_datas_da_atualizacao();

create table public.atualizacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  projeto_id uuid not null references public.projetos (id) on delete cascade,
  titulo text not null
    constraint atualizacoes_titulo_tamanho check (char_length(titulo) between 3 and 120 and titulo = btrim(titulo)),
  descricao text not null
    constraint atualizacoes_descricao_tamanho check (char_length(descricao) <= 5000 and btrim(descricao) <> ''),
  status text not null default 'backlog'
    constraint atualizacoes_status_valido check (status in ('backlog', 'desenvolvimento', 'concluido')),
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint atualizacoes_conclusao_coerente check ((status = 'concluido') = (concluido_em is not null))
);

comment on table public.atualizacoes is 'Atualizações (melhorias, correções, implementações) de uma Missão.';
comment on column public.atualizacoes.concluido_em is 'Preenchido só em Concluído. Gravado só pelo trigger.';

-- Histórico de uma Missão, da mais recente para a mais antiga (RF-09).
create index atualizacoes_projeto_id_criado_em_idx on public.atualizacoes (projeto_id, criado_em desc);
-- Página geral: as do usuário, com filtro de status, mais recentes primeiro (RF-10).
create index atualizacoes_user_id_status_criado_em_idx on public.atualizacoes (user_id, status, criado_em desc);

-- Datas gravadas só aqui: as colunas ficam fora dos GRANTs de escrita.
-- Diferente da Missão, não há data de ingresso em Desenvolvimento (sem trava de 24 h).
create function public.registrar_datas_da_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.concluido_em := case when new.status = 'concluido' then now() end;
  end if;
  if tg_op = 'UPDATE' then
    new.atualizado_em := now();
  end if;
  return new;
end;
$$;

create trigger atualizacoes_registrar_datas
  before insert or update on public.atualizacoes
  for each row execute function public.registrar_datas_da_atualizacao();

revoke execute on function public.registrar_datas_da_atualizacao() from public, anon, authenticated;

alter table public.atualizacoes enable row level security;

-- A Missão vinculada também precisa ser do usuário: sem isso, alguém poderia
-- pendurar uma Atualização na Missão de outro (RN-01).
create policy "atualizacoes: dono lê"
  on public.atualizacoes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "atualizacoes: dono cria na própria Missão"
  on public.atualizacoes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid()))
  );
create policy "atualizacoes: dono altera, mantendo a Missão própria"
  on public.atualizacoes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.projetos p where p.id = projeto_id and p.user_id = (select auth.uid()))
  );
create policy "atualizacoes: dono exclui"
  on public.atualizacoes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Privilégios explícitos e mínimos; nada para anon.
revoke all on table public.atualizacoes from anon, authenticated;
grant select, delete on table public.atualizacoes to authenticated;
grant insert (projeto_id, titulo, descricao, status) on table public.atualizacoes to authenticated;
grant update (projeto_id, titulo, descricao, status) on table public.atualizacoes to authenticated;
