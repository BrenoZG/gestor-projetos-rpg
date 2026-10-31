-- Testes da função `registrar_nivel_maximo` (M4, RN-08): o maior nível já
-- alcançado só sobe e só no personagem de quem chama.
-- Usuários fictícios: A é o dono testado, B é o "outro usuário".
begin;
select plan(12);

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');
insert into public.personagem (user_id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

-- Estrutura e permissões
select has_function('public', 'registrar_nivel_maximo', array['integer'], 'a função existe');
select ok(
  (select prosecdef from pg_proc where oid = 'public.registrar_nivel_maximo(integer)'::regprocedure),
  'é security definer: grava uma coluna fora do GRANT de UPDATE'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.registrar_nivel_maximo(integer)'::regprocedure),
  'fixa o search_path vazio (sem sequestro de nome)'
);
select ok(
  not has_function_privilege('anon', 'public.registrar_nivel_maximo(integer)', 'execute'),
  'anon não executa'
);
select ok(
  not has_function_privilege('public', 'public.registrar_nivel_maximo(integer)', 'execute'),
  'public não executa'
);

-- A partir daqui, as consultas rodam como o usuário A logado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select is(public.registrar_nivel_maximo(23), 23::smallint, 'A registra o nível 23');
select is(
  (select nivel_maximo from public.personagem),
  23::smallint,
  'o nível 23 foi gravado no personagem de A'
);
select is(public.registrar_nivel_maximo(9), 23::smallint, 'um nível menor não baixa o máximo');
select is(public.registrar_nivel_maximo(31), 31::smallint, 'um nível maior sobe o máximo');
select throws_ok(
  $$ select public.registrar_nivel_maximo(101) $$,
  '22023',
  null,
  'recusa nível fora de 1..100'
);
select throws_ok(
  $$ update public.personagem set nivel_maximo = 1 $$,
  '42501',
  null,
  'A continua sem poder alterar a coluna direto (nem para baixar)'
);

reset role;
select is(
  (select nivel_maximo from public.personagem where user_id = '00000000-0000-4000-8000-00000000000b'),
  1::smallint,
  'o personagem de B não mudou'
);

select * from finish();
rollback;
