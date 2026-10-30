-- Testes de segurança e integridade das Missões (pgTAP): tabelas projetos,
-- stacks e projeto_stacks, trigger de datas (RN-02) e função salvar_missao_v3.
-- Usuários fictícios: A é o dono testado, B é o "outro usuário".
begin;
select plan(38);

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

-- Estrutura e privilégios
select has_table('public', 'projetos', 'a tabela projetos existe');
select has_table('public', 'stacks', 'a tabela stacks existe');
select has_table('public', 'projeto_stacks', 'a tabela projeto_stacks existe');
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.projetos'::regclass, 'public.stacks'::regclass, 'public.projeto_stacks'::regclass)),
  'RLS está habilitado nas 3 tabelas'
);
select ok(
  not has_table_privilege('anon', 'public.projetos', 'select, insert, update, delete')
  and not has_table_privilege('anon', 'public.stacks', 'select, insert, update, delete')
  and not has_table_privilege('anon', 'public.projeto_stacks', 'select, insert, update, delete'),
  'anon não tem nenhum privilégio nas 3 tabelas'
);
select ok(
  not has_function_privilege('anon', 'public.salvar_missao_v3(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb)', 'execute'),
  'anon não executa salvar_missao_v3'
);
select ok(
  not has_column_privilege('authenticated', 'public.projetos', 'concluido_em', 'update')
  and not has_column_privilege('authenticated', 'public.projetos', 'inicio_desenvolvimento_em', 'update')
  and not has_column_privilege('authenticated', 'public.projetos', 'atualizado_em', 'update'),
  'as datas de status só são gravadas pelo trigger'
);
select ok(
  not has_column_privilege('authenticated', 'public.projetos', 'user_id', 'insert')
  and not has_column_privilege('authenticated', 'public.projetos', 'user_id', 'update'),
  'o dono da Missão vem da sessão, nunca do cliente'
);

-- B cadastra uma Missão; o id dela fica guardado para os testes de isolamento.
-- Como postgres o RLS não filtra: toda consulta fora do papel authenticated
-- filtra pelo user_id, para o teste não colidir com dados que já estão no banco.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select public.salvar_missao_v3(null, 'dev', 'Missão de B', 'Descrição de B', 'Arquitetura.', 'monolito', '{}', 'backlog',
                               array['Python'], '{}', '[]');
reset role;
select set_config('teste.id_b', (select id::text from public.projetos where nome = 'Missão de B' and user_id = '00000000-0000-4000-8000-00000000000b'), true);
select set_config('teste.stack_b', (select id::text from public.stacks where nome = 'Python' and user_id = '00000000-0000-4000-8000-00000000000b'), true);

-- A partir daqui, as consultas rodam como o usuário A logado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select isnt(
  public.salvar_missao_v3(null, 'dev', 'Gestor', 'Gestor de projetos', 'Arquitetura.', 'monolito', '{}', 'backlog',
                          array['Next.js', ' next.js ', 'Supabase'], '{}', '[]'),
  null,
  'A cadastra uma Missão e recebe o id'
);
select results_eq(
  $$ select nome from public.projetos $$,
  $$ values ('Gestor') $$,
  'A enxerga só a própria Missão'
);
select results_eq(
  $$ select nome from public.stacks order by nome $$,
  $$ values ('Next.js'), ('Supabase') $$,
  'stacks repetidas viram uma só, com a primeira grafia (RN-05)'
);
select is(
  (select count(*)::int from public.projeto_stacks),
  2,
  'a Missão fica ligada às 2 stacks distintas'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', '  GESTOR ', 'Outra', 'Arquitetura.', 'monolito', '{}', 'backlog',
       array['Go'], '{}', '[]') $$,
  '23505',
  null,
  'nome repetido, sem diferenciar maiúscula e espaços nas pontas, é recusado'
);

-- Isolamento entre usuários
select is_empty(
  $$ select 1 from public.projetos where nome = 'Missão de B' $$,
  'A não enxerga a Missão de B'
);
select is_empty(
  $$ select 1 from public.stacks where nome = 'Python' $$,
  'A não enxerga as stacks de B'
);
select throws_ok(
  format($$ select public.salvar_missao_v3(%L::uuid, 'dev', 'Tomada', 'x', 'Arquitetura.', 'monolito', '{}', null,
              array['Go'], '{}', '[]') $$,
         current_setting('teste.id_b')),
  'P0002',
  null,
  'A não altera a Missão de B pela função'
);
select is_empty(
  format($$ update public.projetos set descricao = 'x' where id = %L returning 1 $$, current_setting('teste.id_b')),
  'A não altera a Missão de B direto na tabela'
);
select is_empty(
  format($$ delete from public.projetos where id = %L returning 1 $$, current_setting('teste.id_b')),
  'A não apaga a Missão de B'
);
select throws_ok(
  format($$ insert into public.projeto_stacks (projeto_id, stack_id)
            select id, %L::uuid from public.projetos where nome = 'Gestor' $$,
         current_setting('teste.stack_b')),
  '42501',
  null,
  'A não liga a própria Missão a uma stack de B'
);
select throws_ok(
  $$ insert into public.projetos (user_id, nome, descricao, arquitetura)
     values ('00000000-0000-4000-8000-00000000000b', 'Intrusa', 'x', 'y') $$,
  '42501',
  null,
  'A não cria Missão em nome de B'
);

-- Datas por status (RN-02). O status muda direto na tabela, como no Quadro e
-- na ficha (RF-20): a salvar_missao_v3 não altera o status na edição.
select results_eq(
  $$ select inicio_desenvolvimento_em is null, concluido_em is null from public.projetos where nome = 'Gestor' $$,
  $$ values (true, true) $$,
  'Missão nova em Backlog não tem datas de início nem de conclusão'
);
update public.projetos set status = 'desenvolvimento' where nome = 'Gestor';
select results_eq(
  $$ select inicio_desenvolvimento_em is not null, concluido_em is null from public.projetos where nome = 'Gestor' $$,
  $$ values (true, true) $$,
  'entrar em Desenvolvimento grava o início'
);
update public.projetos set status = 'concluido' where nome = 'Gestor';
select results_eq(
  $$ select inicio_desenvolvimento_em is not null, concluido_em is not null from public.projetos where nome = 'Gestor' $$,
  $$ values (true, true) $$,
  'entrar em Concluído grava a conclusão e mantém o início'
);
update public.projetos set status = 'backlog' where nome = 'Gestor';
select results_eq(
  $$ select concluido_em is null from public.projetos where nome = 'Gestor' $$,
  $$ values (true) $$,
  'sair de Concluído apaga a conclusão'
);

-- Datas antigas plantadas com o trigger desligado (só nesta transação), para
-- provar o que ele preserva e o que ele atualiza.
reset role;
alter table public.projetos disable trigger user;
update public.projetos
set status = 'desenvolvimento', inicio_desenvolvimento_em = '2020-01-01', atualizado_em = '2020-01-01'
where nome = 'Gestor' and user_id = '00000000-0000-4000-8000-00000000000a';
alter table public.projetos enable trigger user;
set local role authenticated;
select public.salvar_missao_v3(id, 'dev', 'Gestor', 'Descrição nova', 'Arquitetura.', 'monolito', '{}', null,
                               array['Next.js', 'Supabase'], '{}', '[]')
from public.projetos where nome = 'Gestor';
select is(
  (select inicio_desenvolvimento_em from public.projetos where nome = 'Gestor'),
  '2020-01-01'::timestamptz,
  'editar sem mudar o status não sobrescreve o início em Desenvolvimento'
);
select ok(
  (select atualizado_em > '2020-01-01'::timestamptz from public.projetos where nome = 'Gestor'),
  'toda edição atualiza a data de última edição'
);
select throws_ok(
  $$ update public.projetos set concluido_em = now() where nome = 'Gestor' $$,
  '42501',
  null,
  'o cliente não grava a data de conclusão direto'
);
reset role;
update public.projetos set status = 'concluido', concluido_em = null where nome = 'Gestor' and user_id = '00000000-0000-4000-8000-00000000000a';
select results_eq(
  $$ select concluido_em is not null from public.projetos where nome = 'Gestor' and user_id = '00000000-0000-4000-8000-00000000000a' $$,
  $$ values (true) $$,
  'nem o dono do banco deixa Concluído sem data: o trigger a grava'
);
update public.projetos set status = 'backlog' where nome = 'Gestor' and user_id = '00000000-0000-4000-8000-00000000000a';
select throws_ok(
  $$ update public.projetos set concluido_em = now() where nome = 'Gestor' and user_id = '00000000-0000-4000-8000-00000000000a' $$,
  '23514',
  null,
  'CHECK de coerência: só Concluído tem data de conclusão'
);
set local role authenticated;

-- Atomicidade e validação na função
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Atômica', 'x', 'Arquitetura.', 'monolito', '{}', 'backlog',
                                    array['Válida', repeat('x', 41)], '{}', '[]') $$,
  '23514',
  null,
  'stack com mais de 40 caracteres é recusada'
);
select is_empty(
  $$ select 1 from public.projetos where nome = 'Atômica'
     union all select 1 from public.stacks where nome = 'Válida' $$,
  'a recusa não deixa Missão nem stack pela metade (atomicidade)'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Sem stacks', 'x', 'Arquitetura.', 'monolito', '{}', 'backlog',
       array['  ', ''], '{}', '[]') $$,
  '22023',
  null,
  'Missão sem nenhuma stack válida é recusada'
);
select throws_ok(
  format($$ select public.salvar_missao_v3(null, 'dev', 'Muitas', 'x', 'Arquitetura.', 'monolito', '{}', 'backlog',
              %L::text[], '{}', '[]') $$,
         (select array_agg('s' || n) from generate_series(1, 21) n)),
  '22023',
  null,
  'Missão com 21 stacks é recusada'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Ab', 'x', 'Arquitetura.', 'monolito', '{}', 'backlog',
       array['Go'], '{}', '[]') $$,
  '23514',
  null,
  'nome com menos de 3 caracteres é recusado'
);
select throws_ok(
  format($$ select public.salvar_missao_v3(null, 'dev', 'Longa', 'x', %L, 'monolito', '{}', 'backlog',
              array['Go'], '{}', '[]') $$,
         repeat('a', 20001)),
  '23514',
  null,
  'arquitetura acima de 20.000 caracteres é recusada'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Status estranho', 'x', 'Arquitetura.', 'monolito', '{}', 'arquivado',
       array['Go'], '{}', '[]') $$,
  '23514',
  null,
  'status desconhecido é recusado'
);

-- Exclusão
delete from public.projetos where nome = 'Gestor';
select is(
  (select count(*)::int from public.projeto_stacks),
  0,
  'excluir a Missão remove os vínculos com as stacks'
);
select is(
  (select count(*)::int from public.stacks),
  2,
  'as stacks continuam disponíveis para o autocompletar'
);

select * from finish();
rollback;
