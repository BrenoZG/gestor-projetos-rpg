-- Personagem: estado de jogo do usuário (grão: 1 linha por usuário).
-- Nome, e-mail e avatar do GitHub NÃO são copiados para cá: ficam só em
-- auth.users, gerenciado pelo Supabase (minimização, LGPD).
--
-- Reversão: drop table public.personagem;

create table public.personagem (
  user_id uuid primary key references auth.users (id) on delete cascade,
  classe text
    constraint personagem_classe_valida check (
      classe in (
        'arquimago_dados',
        'guerreiro_backend',
        'arqueiro_frontend',
        'lamina_arcana_fullstack',
        'paladino_devops',
        'sombra_seguranca',
        'invocador_ia',
        'bardo_experiencia'
      )
    ),
  nivel_maximo smallint not null default 1
    constraint personagem_nivel_maximo_faixa check (nivel_maximo between 1 and 100),
  medalha_vista smallint not null default 0
    constraint personagem_medalha_vista_faixa check (medalha_vista between 0 and 10),
  criado_em timestamptz not null default now()
);

comment on table public.personagem is 'Estado de jogo do usuário: classe, maior nível já alcançado e última medalha exibida.';
comment on column public.personagem.classe is 'Chave da classe escolhida (requisitos.md §6); nula até a primeira escolha.';
comment on column public.personagem.nivel_maximo is 'Maior nível já alcançado; nunca diminui (RN-08). Gravado só pela função de XP.';
comment on column public.personagem.medalha_vista is 'Última medalha cuja animação de conquista já foi exibida.';

alter table public.personagem enable row level security;

-- Cada política combina o papel (to authenticated) com a posse da linha.
-- `(select auth.uid())` é avaliado uma vez por consulta, não uma vez por linha.
create policy "personagem: dono lê"
  on public.personagem for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "personagem: dono cria o próprio"
  on public.personagem for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- `with check` impede que a linha seja transferida para outro user_id.
create policy "personagem: dono altera"
  on public.personagem for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sem política de delete: a linha só sai com o usuário (on delete cascade).

-- Privilégios explícitos e mínimos, por coluna. A Data API não expõe mais
-- tabelas novas sozinha, e o RLS só filtra linhas: quais colunas o usuário
-- pode gravar é decidido aqui.
-- - insert: só o user_id; o resto vem dos defaults.
-- - update: só o que o usuário escolhe. nivel_maximo fica com a função de XP (M3).
revoke all on table public.personagem from anon, authenticated;
grant select on table public.personagem to authenticated;
grant insert (user_id) on table public.personagem to authenticated;
grant update (classe, medalha_vista) on table public.personagem to authenticated;
