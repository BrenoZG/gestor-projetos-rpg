-- Testes de segurança e integridade das Atualizações (pgTAP): tabela
-- atualizacoes, RLS (inclusive a Missão vinculada), trigger de datas e as
-- regras RN-01, RN-03 e RN-04.
-- Usuários fictícios: A é o dono testado, B é o "outro usuário".
begin;
select plan(25);

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

-- Estrutura e privilégios
select has_table('public', 'atualizacoes', 'a tabela atualizacoes existe');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.atualizacoes'::regclass),
  'RLS está habilitado'
);
select ok(
  not has_table_privilege('anon', 'public.atualizacoes', 'select, insert, update, delete'),
  'anon não tem nenhum privilégio'
);
select ok(
  not has_column_privilege('authenticated', 'public.atualizacoes', 'concluido_em', 'update')
  and not has_column_privilege('authenticated', 'public.atualizacoes', 'criado_em', 'update')
  and not has_column_privilege('authenticated', 'public.atualizacoes', 'atualizado_em', 'update'),
  'as datas só são gravadas pelo trigger'
);
select ok(
  not has_column_privilege('authenticated', 'public.atualizacoes', 'user_id', 'insert')
  and not has_column_privilege('authenticated', 'public.atualizacoes', 'user_id', 'update'),
  'o dono da Atualização vem da sessão, nunca do cliente'
);

-- B cadastra uma Missão com uma Atualização; os ids ficam guardados.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select public.salvar_missao_v4(null, 'dev', 'Missão de B', 'x', 'y', 'script', '{}', 'backlog', array['Go'], '{}', '[]', null);
insert into public.atualizacoes (projeto_id, titulo, descricao)
select id, 'Atualização de B', 'Feita por B' from public.projetos where nome = 'Missão de B';
reset role;
select set_config('teste.missao_b', (select id::text from public.projetos where nome = 'Missão de B'), true);
select set_config('teste.atualizacao_b', (select id::text from public.atualizacoes where titulo = 'Atualização de B'), true);

-- A partir daqui, as consultas rodam como o usuário A logado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select public.salvar_missao_v4(null, 'dev', 'Gestor', 'x', 'y', 'monolito', '{}', 'backlog', array['Next.js'], '{}', '[]', null);
select public.salvar_missao_v4(null, 'dev', 'Agenda', 'x', 'y', 'script', '{}', 'concluido', array['Python'], '{}', '[]', null);

select lives_ok(
  $$ insert into public.atualizacoes (projeto_id, titulo, descricao)
     select id, 'Corrige o login', 'Detalhes da correção' from public.projetos where nome = 'Gestor' $$,
  'A cria uma Atualização na própria Missão'
);
select results_eq(
  $$ select status, concluido_em is null, user_id = (select auth.uid())
     from public.atualizacoes where titulo = 'Corrige o login' $$,
  $$ values ('backlog'::text, true, true) $$,
  'nasce em Backlog, sem conclusão e com o dono da sessão'
);

-- Campos fora da regra
select throws_ok(
  $$ insert into public.atualizacoes (projeto_id, titulo, descricao)
     select id, 'Ab', 'x' from public.projetos where nome = 'Gestor' $$,
  '23514', null,
  'título com menos de 3 caracteres é recusado'
);
select throws_ok(
  $$ insert into public.atualizacoes (projeto_id, titulo, descricao)
     select id, repeat('t', 121), 'x' from public.projetos where nome = 'Gestor' $$,
  '23514', null,
  'título com mais de 120 caracteres é recusado'
);
select throws_ok(
  $$ insert into public.atualizacoes (projeto_id, titulo, descricao)
     select id, 'Descrição vazia', '   ' from public.projetos where nome = 'Gestor' $$,
  '23514', null,
  'descrição só com espaços é recusada'
);
select throws_ok(
  $$ insert into public.atualizacoes (projeto_id, titulo, descricao)
     select id, 'Descrição longa', repeat('d', 5001) from public.projetos where nome = 'Gestor' $$,
  '23514', null,
  'descrição com mais de 5.000 caracteres é recusada'
);
select throws_ok(
  $$ insert into public.atualizacoes (projeto_id, titulo, descricao, status)
     select id, 'Status estranho', 'x', 'arquivado' from public.projetos where nome = 'Gestor' $$,
  '23514', null,
  'status desconhecido é recusado'
);

-- Isolamento entre usuários
select throws_ok(
  format($$ insert into public.atualizacoes (projeto_id, titulo, descricao) values (%L::uuid, 'Intrusa', 'x') $$,
         current_setting('teste.missao_b')),
  '42501', null,
  'A não cria Atualização na Missão de B'
);
select is(
  (select count(*)::int from public.atualizacoes where titulo = 'Atualização de B'),
  0,
  'A não vê as Atualizações de B'
);
select is_empty(
  format($$ update public.atualizacoes set titulo = 'Tomada' where id = %L::uuid returning id $$,
         current_setting('teste.atualizacao_b')),
  'A não altera a Atualização de B'
);
select is_empty(
  format($$ delete from public.atualizacoes where id = %L::uuid returning id $$,
         current_setting('teste.atualizacao_b')),
  'A não exclui a Atualização de B'
);
select throws_ok(
  format($$ update public.atualizacoes set projeto_id = %L::uuid where titulo = 'Corrige o login' $$,
         current_setting('teste.missao_b')),
  '42501', null,
  'A não move a própria Atualização para a Missão de B'
);

-- RN-01: o vínculo muda para outra Missão do mesmo usuário.
update public.atualizacoes
set projeto_id = (select id from public.projetos where nome = 'Agenda')
where titulo = 'Corrige o login';
select results_eq(
  $$ select p.nome from public.atualizacoes a join public.projetos p on p.id = a.projeto_id
     where a.titulo = 'Corrige o login' $$,
  $$ values ('Agenda'::text) $$,
  'A move a Atualização para outra Missão dela (RN-01)'
);

-- Datas: o trigger grava a conclusão e a última edição.
reset role;
update public.atualizacoes
set criado_em = now() - interval '1 day', atualizado_em = now() - interval '1 day'
where titulo = 'Corrige o login';
set local role authenticated;
update public.atualizacoes set status = 'concluido' where titulo = 'Corrige o login';
select results_eq(
  $$ select concluido_em is not null, atualizado_em > criado_em from public.atualizacoes
     where titulo = 'Corrige o login' $$,
  $$ values (true, true) $$,
  'concluir grava a data de conclusão e a última edição'
);
update public.atualizacoes set status = 'desenvolvimento' where titulo = 'Corrige o login';
select results_eq(
  $$ select concluido_em is null from public.atualizacoes where titulo = 'Corrige o login' $$,
  $$ values (true) $$,
  'sair de Concluído apaga a data de conclusão'
);
select results_eq(
  $$ select criado_em < now() - interval '23 hours' from public.atualizacoes where titulo = 'Corrige o login' $$,
  $$ values (true) $$,
  'a data de criação não muda com as edições'
);
select throws_ok(
  $$ update public.atualizacoes set concluido_em = now() where titulo = 'Corrige o login' $$,
  '42501', null,
  'o usuário não grava a data de conclusão direto'
);

-- RN-03: Missão concluída aceita Atualização nova e continua concluída.
insert into public.atualizacoes (projeto_id, titulo, descricao)
select id, 'Depois de concluída', 'x' from public.projetos where nome = 'Agenda';
select results_eq(
  $$ select status from public.projetos where nome = 'Agenda' $$,
  $$ values ('concluido'::text) $$,
  'a Missão concluída não é reaberta por uma Atualização nova (RN-03)'
);

-- RN-04: excluir a Missão exclui as Atualizações dela.
delete from public.projetos where nome = 'Agenda';
select is(
  (select count(*)::int from public.atualizacoes where titulo in ('Corrige o login', 'Depois de concluída')),
  0,
  'excluir a Missão exclui as Atualizações dela (RN-04)'
);

reset role;
select is(
  (select count(*)::int from public.atualizacoes where id = current_setting('teste.atualizacao_b')::uuid),
  1,
  'a Atualização de B continua intacta'
);

select * from finish();
rollback;
