-- Testes do ledger de XP (M3, RN-06, RN-18, ADR-0011) no banco (pgTAP):
-- privilégios, RLS, funções atômicas e o trigger de revogação.
-- Usuários fictícios: A é o dono testado, B é o "outro usuário".
begin;
select plan(34);

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

-- Estrutura e privilégios
select has_table('public', 'eventos_xp', 'a tabela eventos_xp existe');
select col_is_unique('public', 'eventos_xp', array['user_id', 'referencia_id', 'tipo'],
  'um evento por (dono, item, tipo): um usuário não ocupa o par de outro');
select ok(
  not has_table_privilege('anon', 'public.eventos_xp', 'select, insert, update, delete'),
  'anon não tem nenhum privilégio no ledger'
);
select ok(
  not has_table_privilege('authenticated', 'public.eventos_xp', 'update'),
  'ninguém altera um evento (append-only)'
);
select ok(
  not has_column_privilege('authenticated', 'public.eventos_xp', 'user_id', 'insert')
  and not has_column_privilege('authenticated', 'public.eventos_xp', 'criado_em', 'insert'),
  'o dono e a data vêm dos defaults, nunca do cliente'
);
select ok(
  not has_function_privilege('anon', 'public.salvar_missao_v4(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb, integer)', 'execute')
  and not has_function_privilege('anon', 'public.criar_atualizacao(uuid, text, text, integer)', 'execute')
  and not has_function_privilege('anon', 'public.mudar_status_missao(uuid, text, integer, text)', 'execute')
  and not has_function_privilege('anon', 'public.mudar_status_atualizacao(uuid, text, integer, text)', 'execute')
  and not has_function_privilege('anon', 'public.resumo_xp()', 'execute')
  and has_function_privilege('authenticated', 'public.salvar_missao_v4(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb, integer)', 'execute')
  and has_function_privilege('authenticated', 'public.criar_atualizacao(uuid, text, text, integer)', 'execute')
  and has_function_privilege('authenticated', 'public.mudar_status_missao(uuid, text, integer, text)', 'execute')
  and has_function_privilege('authenticated', 'public.mudar_status_atualizacao(uuid, text, integer, text)', 'execute')
  and has_function_privilege('authenticated', 'public.resumo_xp()', 'execute'),
  'só o usuário logado executa as funções de XP'
);

-- B tem um Projeto; o id fica guardado para os casos de abuso.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select set_config('teste.projeto_b', public.salvar_missao_v4(null, 'geral', 'Projeto de B', 'x', null, null, null,
  'backlog', '{}', '{}', '[]', 10)::text, true);
reset role;

-- A partir daqui, as consultas rodam como o usuário A logado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

-- Criação (RN-06) e trilha pelo tipo (RN-18)
select set_config('teste.dev', public.salvar_missao_v4(null, 'dev', 'API de pedidos', 'x', 'Camadas.', 'microsservicos',
  array['autenticacao'], 'backlog', array['React', ' TypeScript', 'react'], '{}', '[]', 10)::text, true);
select set_config('teste.geral', public.salvar_missao_v4(null, 'geral', 'Canal de vídeos', 'x', null, null, null,
  'backlog', array['Câmera'], '{}', '[]', 10)::text, true);
select results_eq(
  format($$ select tipo, trilha, xp, nome_snapshot from public.eventos_xp where referencia_id = %L $$,
    current_setting('teste.dev')),
  $$ values ('criacao_projeto'::text, 'desenvolvedor'::text, 10, 'API de pedidos'::text) $$,
  'criar Projeto de Desenvolvimento grava 10 XP na trilha Desenvolvedor, na mesma transação'
);
select results_eq(
  format($$ select trilha from public.eventos_xp where referencia_id = %L $$, current_setting('teste.geral')),
  $$ values ('produtividade'::text) $$,
  'criar Projeto Geral grava o XP na trilha Produtividade'
);
select public.salvar_missao_v4(current_setting('teste.dev')::uuid, 'dev', 'API de pedidos', 'x', 'Camadas.',
  'microsservicos', array['autenticacao'], null, array['React', 'TypeScript'], '{}', '[]', 10);
select is(
  (select count(*)::integer from public.eventos_xp where referencia_id::text = current_setting('teste.dev')),
  1,
  'editar o Projeto não grava outro evento de criação'
);
select set_config('teste.sem_xp', public.salvar_missao_v4(null, 'geral', 'Sem XP', 'x', null, null, null,
  'backlog', '{}', '{}', '[]', null)::text, true);
select is_empty(
  format($$ select 1 from public.eventos_xp where referencia_id = %L $$, current_setting('teste.sem_xp')),
  'sem XP informado, a criação não grava evento'
);

select set_config('teste.atu_dev', public.criar_atualizacao(current_setting('teste.dev')::uuid, 'Login', 'x', 5)::text, true);
select set_config('teste.atu_geral', public.criar_atualizacao(current_setting('teste.geral')::uuid, 'Roteiro', 'x', 5)::text, true);
select results_eq(
  format($$ select tipo, trilha, xp, nome_snapshot from public.eventos_xp where referencia_id = %L $$,
    current_setting('teste.atu_dev')),
  $$ values ('criacao_atualizacao'::text, 'desenvolvedor'::text, 5, 'Login'::text) $$,
  'criar Atualização grava 5 XP na trilha do Projeto vinculado'
);
select throws_ok(
  format($$ select public.criar_atualizacao(%L, 'Invasão', 'x', 5) $$, current_setting('teste.projeto_b')),
  '42501', null,
  'não cria Atualização (nem XP) no Projeto de outro usuário'
);

-- Mudança de status do Projeto
select results_eq(
  format($$ select situacao, xp_ganho from public.mudar_status_missao(%L, 'desenvolvimento', null, null) $$,
    current_setting('teste.dev')),
  $$ values ('movida'::text, null::integer) $$,
  'mover sem concluir devolve movida, sem XP'
);
select results_eq(
  format($$ select situacao, xp_ganho from public.mudar_status_missao(%L, 'desenvolvimento', null, null) $$,
    current_setting('teste.dev')),
  $$ values ('sem_mudanca'::text, null::integer) $$,
  'mover para o status atual não grava nada'
);
select results_eq(
  format($$ select situacao from public.mudar_status_missao(%L, 'concluido', 40, 'E') $$, current_setting('teste.projeto_b')),
  $$ values ('inexistente'::text) $$,
  'o Projeto de outro usuário é inexistente para A'
);
select results_eq(
  format($$ select situacao, xp_ganho from public.mudar_status_missao(%L, 'concluido', 157, 'B') $$,
    current_setting('teste.dev')),
  $$ values ('movida'::text, 157) $$,
  'concluir com XP grava a conclusão e devolve o XP ganho'
);
select results_eq(
  format($$ select trilha, rank_snapshot, stacks_snapshot, nome_snapshot from public.eventos_xp
     where referencia_id = %L and tipo = 'conclusao_projeto' $$, current_setting('teste.dev')),
  $$ values ('desenvolvedor'::text, 'B'::text, array['react', 'typescript'], 'API de pedidos'::text) $$,
  'a conclusão guarda o Rank e as stacks normalizadas do momento (snapshot da Maestria)'
);
select public.mudar_status_missao(current_setting('teste.dev')::uuid, 'desenvolvimento', null, null);
select results_eq(
  format($$ select situacao, xp_ganho from public.mudar_status_missao(%L, 'concluido', 157, 'B') $$,
    current_setting('teste.dev')),
  $$ values ('movida'::text, null::integer) $$,
  'reconcluir não duplica o XP (RN-06a): xp_ganho nulo'
);

select results_eq(
  format($$ select xp_ganho from public.mudar_status_missao(%L, 'concluido', 69, 'S') $$, current_setting('teste.geral')),
  $$ values (69) $$,
  'concluir Projeto Geral grava o XP informado'
);
select results_eq(
  format($$ select trilha, rank_snapshot, stacks_snapshot from public.eventos_xp
     where referencia_id = %L and tipo = 'conclusao_projeto' $$, current_setting('teste.geral')),
  $$ values ('produtividade'::text, null::text, array['câmera']) $$,
  'na Produtividade o Rank é descartado e as ferramentas viram o snapshot do Domínio'
);

-- Mudança de status da Atualização
select results_eq(
  format($$ select situacao, xp_ganho from public.mudar_status_atualizacao(%L, 'concluido', 30, 'B') $$,
    current_setting('teste.atu_dev')),
  $$ values ('movida'::text, 30) $$,
  'concluir Atualização com XP devolve o XP ganho'
);
select results_eq(
  format($$ select trilha, rank_snapshot from public.eventos_xp
     where referencia_id = %L and tipo = 'conclusao_atualizacao' $$, current_setting('teste.atu_dev')),
  $$ values ('desenvolvedor'::text, 'B'::text) $$,
  'a conclusão da Atualização guarda a trilha e o Rank do Projeto'
);
select results_eq(
  format($$ select situacao from public.mudar_status_atualizacao(%L, 'concluido', 30, 'B') $$,
    current_setting('teste.atu_dev')),
  $$ values ('sem_mudanca'::text) $$,
  'mover a Atualização para o status atual não grava nada'
);

-- Troca de tipo: o XP fica na trilha em que nasceu (RN-16)
select public.salvar_missao_v4(current_setting('teste.geral')::uuid, 'dev', 'Canal de vídeos', 'x', 'Camadas.', 'monolito',
  '{}', null, array['Câmera'], '{}', '[]', null);
select results_eq(
  format($$ select distinct trilha from public.eventos_xp where referencia_id = %L $$, current_setting('teste.geral')),
  $$ values ('produtividade'::text) $$,
  'trocar o tipo não move o XP já concedido'
);

select results_eq(
  $$ select trilha, xp_total from public.resumo_xp() order by trilha $$,
  $$ values ('desenvolvedor'::text, 10 + 5 + 157 + 30), ('produtividade'::text, 10 + 5 + 69) $$,
  'resumo_xp soma o XP de A por trilha'
);

-- Permanência (RN-06b) e append-only
select is_empty(
  format($$ delete from public.eventos_xp where referencia_id = %L and tipo = 'conclusao_projeto' returning 1 $$,
    current_setting('teste.dev')),
  'ninguém apaga um evento de conclusão'
);
select is_empty(
  format($$ delete from public.eventos_xp where referencia_id = %L and tipo = 'criacao_projeto' returning 1 $$,
    current_setting('teste.dev')),
  'nem a criação de um item que já tem conclusão'
);
select throws_ok(
  $$ update public.eventos_xp set xp = 9999 $$,
  '42501', null,
  'ninguém altera o XP de um evento'
);
select throws_ok(
  $$ insert into public.eventos_xp (tipo, trilha, referencia_id, xp, nome_snapshot)
     values ('criacao_projeto', 'desenvolvedor', gen_random_uuid(), 10, 'Inventado') $$,
  '42501', null,
  'não registra XP para item que não existe'
);

-- Revogação por trigger (RN-06c)
select set_config('teste.backlog', public.salvar_missao_v4(null, 'dev', 'Rascunho', 'x', 'Camadas.', 'script',
  '{}', 'backlog', array['Bash'], '{}', '[]', 10)::text, true);
select set_config('teste.atu_solta', public.criar_atualizacao(current_setting('teste.backlog')::uuid, 'Ideia', 'x', 5)::text, true);
select set_config('teste.atu_feita', public.criar_atualizacao(current_setting('teste.backlog')::uuid, 'Feita', 'x', 5)::text, true);
select public.mudar_status_atualizacao(current_setting('teste.atu_feita')::uuid, 'concluido', 15, 'E');
delete from public.projetos where id = current_setting('teste.backlog')::uuid;
select results_eq(
  format($$ select referencia_id::text, tipo from public.eventos_xp where referencia_id in (%L, %L, %L) order by tipo $$,
    current_setting('teste.backlog'), current_setting('teste.atu_solta'), current_setting('teste.atu_feita')),
  format($$ values (%L, 'conclusao_atualizacao'::text), (%L, 'criacao_atualizacao'::text) $$,
    current_setting('teste.atu_feita'), current_setting('teste.atu_feita')),
  'excluir o Projeto revoga a criação dele e das Atualizações sem conclusão que saem na cascata'
);
delete from public.projetos where id = current_setting('teste.dev')::uuid;
select is(
  (select count(*)::integer from public.eventos_xp where referencia_id::text = current_setting('teste.dev')),
  2,
  'excluir Projeto concluído preserva a criação e a conclusão (RN-06b)'
);

-- Isolamento entre usuários
select throws_ok(
  format($$ insert into public.eventos_xp (tipo, trilha, referencia_id, xp, nome_snapshot)
     values ('criacao_projeto', 'produtividade', %L, 10, 'Bloqueio') $$, current_setting('teste.projeto_b')),
  '42501', null,
  'A não registra evento com o id de um Projeto de B'
);
select is_empty(
  format($$ delete from public.eventos_xp where referencia_id = %L returning 1 $$, current_setting('teste.projeto_b')),
  'A não revoga o XP de B'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select results_eq(
  $$ select trilha, xp_total from public.resumo_xp() $$,
  $$ values ('produtividade'::text, 10) $$,
  'B vê só o próprio XP'
);
reset role;

select * from finish();
rollback;
