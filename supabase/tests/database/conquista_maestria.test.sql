-- Testes do M5: `nivel_visto` + `marcar_conquista_vista` (RF-16, RN-08: a
-- cinemática toca uma vez) e `maestria()` (RN-10, RN-18: XP de conclusão por
-- stack ou ferramenta). Usuários fictícios: A é o dono testado, B é o "outro".
begin;
select plan(24);

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');
insert into public.personagem (user_id, nivel_maximo) values
  ('00000000-0000-4000-8000-00000000000a', 23),
  ('00000000-0000-4000-8000-00000000000b', 40);
insert into public.stacks (user_id, nome) values
  ('00000000-0000-4000-8000-00000000000a', 'Python'),
  ('00000000-0000-4000-8000-00000000000a', 'PostgreSQL');

-- Eventos de A: 2 conclusões de Desenvolvimento, 1 de Produtividade e 1 criação (não conta).
-- 'canva' não tem linha em stacks: a função cai na grafia do snapshot.
insert into public.eventos_xp (user_id, tipo, trilha, referencia_id, xp, nome_snapshot, stacks_snapshot) values
  ('00000000-0000-4000-8000-00000000000a', 'conclusao_projeto', 'desenvolvedor',
   '10000000-0000-4000-8000-000000000001', 150, 'Painel', array['python', 'postgresql']),
  ('00000000-0000-4000-8000-00000000000a', 'conclusao_projeto', 'desenvolvedor',
   '10000000-0000-4000-8000-000000000002', 40, 'Script', array['python']),
  ('00000000-0000-4000-8000-00000000000a', 'conclusao_projeto', 'produtividade',
   '10000000-0000-4000-8000-000000000003', 60, 'Vídeo', array['canva']),
  ('00000000-0000-4000-8000-00000000000a', 'criacao_projeto', 'desenvolvedor',
   '10000000-0000-4000-8000-000000000004', 10, 'Outro', '{}'),
  ('00000000-0000-4000-8000-00000000000b', 'conclusao_projeto', 'desenvolvedor',
   '10000000-0000-4000-8000-000000000005', 999, 'De B', array['python']);

-- Estrutura e permissões
select has_column('public', 'personagem', 'nivel_visto', 'a coluna nivel_visto existe');
select col_default_is('public', 'personagem', 'nivel_visto', '1', 'nivel_visto começa em 1');
select has_function('public', 'marcar_conquista_vista', array['integer'], 'a função de marcar existe');
select ok(
  (select prosecdef from pg_proc where oid = 'public.marcar_conquista_vista(integer)'::regprocedure),
  'marcar é security definer: grava uma coluna fora do GRANT de UPDATE'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.marcar_conquista_vista(integer)'::regprocedure),
  'marcar fixa o search_path vazio'
);
select ok(
  not has_function_privilege('anon', 'public.marcar_conquista_vista(integer)', 'execute'),
  'anon não executa marcar'
);
select ok(
  not has_column_privilege('authenticated', 'public.personagem', 'nivel_visto', 'update'),
  'authenticated não altera nivel_visto direto'
);
select has_function('public', 'maestria', '{}'::name[], 'a função maestria existe');
select ok(
  not (select prosecdef from pg_proc where oid = 'public.maestria()'::regprocedure),
  'maestria é security invoker: roda sob o RLS de quem chama'
);
select ok(
  not has_function_privilege('anon', 'public.maestria()', 'execute'),
  'anon não executa maestria'
);

-- A partir daqui, como o usuário A logado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select is(public.marcar_conquista_vista(12), 12::smallint, 'A marca o nível 12 como visto');
select is(
  (select medalha_vista from public.personagem),
  1::smallint,
  'medalha_vista acompanha: nível 12 = medalha I'
);
select is(public.marcar_conquista_vista(5), 12::smallint, 'um nível menor não baixa o visto');
select is(public.marcar_conquista_vista(80), 23::smallint, 'o visto não passa do nivel_maximo (23)');
select is((select medalha_vista from public.personagem), 2::smallint, 'nível 23 = medalha II');
select throws_ok(
  $$ select public.marcar_conquista_vista(0) $$,
  '22023',
  null,
  'recusa nível fora de 1..100'
);
select throws_ok(
  $$ update public.personagem set nivel_visto = 1 $$,
  '42501',
  null,
  'A não altera nivel_visto direto (nem para baixar)'
);

select results_eq(
  $$ select trilha, nome, xp, projetos from public.maestria() $$,
  $$ values ('desenvolvedor'::text, 'Python'::text, 190, 2),
            ('desenvolvedor', 'PostgreSQL', 150, 1),
            ('produtividade', 'canva', 60, 1) $$,
  'maestria soma só conclusões de Projeto de A, por trilha e stack, do maior XP ao menor'
);
select is(
  (select count(*)::integer from public.maestria() where xp = 999 or xp = 1189),
  0,
  'o evento de B não entra na Maestria de A'
);

-- B logado: só os próprios dados.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select results_eq(
  $$ select nome, xp from public.maestria() $$,
  $$ values ('python'::text, 999) $$,
  'B vê só a própria Maestria (sem a grafia de A)'
);
select is(public.marcar_conquista_vista(30), 30::smallint, 'B marca o próprio visto');

reset role;
select is(
  (select nivel_visto from public.personagem where user_id = '00000000-0000-4000-8000-00000000000a'),
  23::smallint,
  'marcar como B não mexeu no personagem de A'
);

-- Sem sessão: a função não toca nenhuma linha.
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select is(public.marcar_conquista_vista(10), null::smallint, 'sem sub, devolve nulo e não grava');
reset role;
select is(
  (select count(*)::integer from public.personagem where nivel_visto = 10),
  0,
  'nenhum personagem ficou com o visto 10'
);

select * from finish();
rollback;
