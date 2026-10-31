-- Testes de renomear, juntar e excluir tags (RF-28, RF-29, RN-19) no banco
-- (pgTAP): privilégios, a função renomear_tag e a exclusão de tag sem uso.
-- Usuários fictícios: A é o dono testado, B é o "outro usuário".
begin;
select plan(23);

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

-- Estrutura e privilégios
select has_function('public', 'renomear_tag', array['uuid', 'text', 'boolean'], 'a função renomear_tag existe');
select ok(
  not has_function_privilege('anon', 'public.renomear_tag(uuid, text, boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.renomear_tag(uuid, text, boolean)', 'execute'),
  'só o usuário logado executa renomear_tag'
);
select ok(
  has_column_privilege('authenticated', 'public.tags', 'nome', 'update')
  and not has_column_privilege('authenticated', 'public.tags', 'user_id', 'update'),
  'o usuário altera só o nome da tag, nunca o dono'
);
select ok(
  has_table_privilege('authenticated', 'public.tags', 'delete'),
  'o usuário pode excluir tags (a policy limita às suas, sem uso)'
);
select ok(
  not has_table_privilege('anon', 'public.tags', 'select, insert, update, delete'),
  'anon continua sem nenhum privilégio em tags'
);

-- B tem uma Missão com a tag "Secreta"; o id fica guardado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select public.salvar_missao_v4(null, 'geral', 'Missão de B', 'x', null, null, null, 'backlog', '{}',
  array['Secreta'], '[]', null);
reset role;
select set_config('teste.tag_b', (select id::text from public.tags
  where nome = 'Secreta' and user_id = '00000000-0000-4000-8000-00000000000b'), true);

-- A partir daqui, as consultas rodam como o usuário A logado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select public.salvar_missao_v4(null, 'geral', 'Missão M1', 'x', null, null, null, 'backlog', '{}', array['Revnda'], '[]', null);
select public.salvar_missao_v4(null, 'geral', 'Missão M2', 'x', null, null, null, 'backlog', '{}',
  array['Revnda', 'Revenda'], '[]', null);
select public.salvar_missao_v4(null, 'geral', 'Missão M3', 'x', null, null, null, 'backlog', '{}', array['Vidos'], '[]', null);
select public.salvar_missao_v4(null, 'geral', 'Missão M4', 'x', null, null, null, 'backlog', '{}', array['Sobra'], '[]', null);
delete from public.projetos where nome = 'Missão M4';
select set_config('teste.revnda', (select id::text from public.tags where nome = 'Revnda'), true);
select set_config('teste.revenda', (select id::text from public.tags where nome = 'Revenda'), true);
select set_config('teste.vidos', (select id::text from public.tags where nome = 'Vidos'), true);

-- Renomear para um nome livre
select results_eq(
  format($$ select resultado, projetos, destino from public.renomear_tag(%L, 'Vídeos', false) $$,
    current_setting('teste.vidos')),
  $$ values ('renomeada'::text, 1, 'Vídeos'::text) $$,
  'renomear para um nome livre devolve renomeada, a quantidade de Missões e a grafia nova'
);
select results_eq(
  $$ select t.nome from public.projeto_tags pt join public.tags t on t.id = pt.tag_id
     join public.projetos p on p.id = pt.projeto_id where p.nome = 'Missão M3' $$,
  $$ values ('Vídeos'::text) $$,
  'a Missão passa a mostrar o nome novo'
);
select results_eq(
  format($$ select resultado, projetos, destino from public.renomear_tag(%L, 'vídeos', false) $$,
    current_setting('teste.vidos')),
  $$ values ('renomeada'::text, 1, 'vídeos'::text) $$,
  'trocar só a caixa é renomear a mesma tag, não juntar'
);
select results_eq(
  $$ select count(*)::int from public.tags where nome_normalizado = 'vídeos' $$,
  $$ values (1) $$,
  'trocar só a caixa não cria outra tag'
);

-- Nome que já existe: primeiro o conflito, sem mudar nada
select results_eq(
  format($$ select resultado, projetos, destino from public.renomear_tag(%L, '  revenda ', false) $$,
    current_setting('teste.revnda')),
  $$ values ('conflito'::text, 2, 'Revenda'::text) $$,
  'nome existente (com espaços e outra caixa) devolve conflito com a grafia da tag existente'
);
select results_eq(
  $$ select count(*)::int from public.projeto_tags pt join public.tags t on t.id = pt.tag_id
     where t.nome in ('Revnda', 'Revenda') $$,
  $$ values (3) $$,
  'o conflito não muda nenhuma tag nem vínculo'
);

-- Juntar
select results_eq(
  format($$ select resultado, projetos, destino from public.renomear_tag(%L, 'revenda', true) $$,
    current_setting('teste.revnda')),
  $$ values ('juntada'::text, 2, 'revenda'::text) $$,
  'juntar devolve juntada, as Missões movidas e a grafia digitada'
);
select is_empty(
  format($$ select 1 from public.tags where id = %L $$, current_setting('teste.revnda')),
  'a tag renomeada deixa de existir'
);
select results_eq(
  format($$ select nome from public.tags where id = %L $$, current_setting('teste.revenda')),
  $$ values ('revenda'::text) $$,
  'a tag existente fica, com o mesmo id e a grafia digitada (RN-19)'
);
select results_eq(
  format($$ select p.nome, count(*)::int from public.projeto_tags pt join public.projetos p on p.id = pt.projeto_id
     where pt.tag_id = %L group by p.nome order by p.nome $$, current_setting('teste.revenda')),
  $$ values ('Missão M1'::text, 1), ('Missão M2'::text, 1) $$,
  'as duas Missões ficam na tag existente; a que tinha as duas fica com um vínculo só'
);

-- Nome fora da regra (segunda barreira; a primeira é a validação da aplicação)
select throws_ok(
  format($$ select * from public.renomear_tag(%L, %L, false) $$, current_setting('teste.vidos'), repeat('x', 31)),
  '23514', null, 'nome com 31 caracteres é recusado'
);
select throws_ok(
  format($$ select * from public.renomear_tag(%L, '   ', false) $$, current_setting('teste.vidos')),
  '23514', null, 'nome só com espaços é recusado'
);

-- Isolamento entre usuários
select throws_ok(
  format($$ select * from public.renomear_tag(%L, 'Tomada', false) $$, current_setting('teste.tag_b')),
  'P0002', null, 'A não renomeia a tag de B'
);
select is_empty(
  format($$ delete from public.tags where id = %L returning id $$, current_setting('teste.tag_b')),
  'A não exclui a tag de B'
);

-- Excluir
select results_eq(
  $$ delete from public.tags where nome = 'Sobra' returning nome $$,
  $$ values ('Sobra'::text) $$,
  'A exclui uma tag sem uso'
);
select is_empty(
  format($$ delete from public.tags where id = %L returning id $$, current_setting('teste.revenda')),
  'o banco recusa excluir uma tag em uso, mesmo que a tela falhe'
);
select results_eq(
  format($$ select count(*)::int from public.projeto_tags where tag_id = %L $$, current_setting('teste.revenda')),
  $$ values (2) $$,
  'a tag em uso continua nas Missões'
);

reset role;
select results_eq(
  format($$ select nome from public.tags where id = %L $$, current_setting('teste.tag_b')),
  $$ values ('Secreta'::text) $$,
  'a tag de B continua intacta'
);

select * from finish();
rollback;
