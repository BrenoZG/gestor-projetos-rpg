-- Testes de segurança e integridade da tabela `personagem` (pgTAP).
-- Rodam com `npx supabase test db`, dentro de uma transação desfeita ao fim.
-- Usuários fictícios: A é o dono testado, B é o "outro usuário".
begin;
select plan(18);

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');
insert into public.personagem (user_id) values ('00000000-0000-4000-8000-00000000000b');

-- Estrutura e permissões
select has_table('public', 'personagem', 'a tabela personagem existe');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.personagem'::regclass),
  'RLS está habilitado'
);
select ok(
  not has_table_privilege('anon', 'public.personagem', 'select, insert, update, delete'),
  'anon não tem nenhum privilégio na tabela'
);
select ok(
  not has_table_privilege('authenticated', 'public.personagem', 'delete'),
  'authenticated não apaga: a linha só sai junto com o usuário'
);

-- A partir daqui, as consultas rodam como o usuário A logado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.personagem (user_id) values ('00000000-0000-4000-8000-00000000000a') $$,
  'A cria o próprio personagem'
);
select lives_ok(
  $$ insert into public.personagem (user_id) values ('00000000-0000-4000-8000-00000000000a')
     on conflict (user_id) do nothing $$,
  'criar de novo com on conflict do nothing não falha (1º acesso idempotente)'
);
select throws_ok(
  $$ insert into public.personagem (user_id) values ('00000000-0000-4000-8000-00000000000c') $$,
  '42501',
  null,
  'A não cria personagem em nome de outro usuário'
);
select results_eq(
  $$ select user_id::text from public.personagem $$,
  $$ values ('00000000-0000-4000-8000-00000000000a') $$,
  'A enxerga só o próprio personagem'
);
select results_eq(
  $$ select classe, nivel_maximo, medalha_vista from public.personagem $$,
  $$ values (null::text, 1::smallint, 0::smallint) $$,
  'personagem novo começa sem classe, no nível 1 e sem medalha vista'
);
select is_empty(
  $$ update public.personagem set classe = 'paladino_devops'
     where user_id = '00000000-0000-4000-8000-00000000000b' returning 1 $$,
  'A não altera o personagem de B'
);
select lives_ok(
  $$ update public.personagem set classe = 'sombra_seguranca', medalha_vista = 1 $$,
  'A escolhe a classe e registra a medalha vista'
);
select is(
  (select classe from public.personagem),
  'sombra_seguranca',
  'a classe escolhida foi gravada'
);
select throws_ok(
  $$ update public.personagem set nivel_maximo = 100 $$,
  '42501',
  null,
  'A não altera o nível máximo direto (só a função de XP, no M3)'
);
select throws_ok(
  $$ update public.personagem set user_id = '00000000-0000-4000-8000-00000000000b' $$,
  '42501',
  null,
  'A não transfere o personagem para outro usuário'
);
select throws_ok(
  $$ update public.personagem set classe = 'mago_inexistente' $$,
  '23514',
  null,
  'classe fora das 8 chaves é rejeitada'
);
select throws_ok(
  $$ update public.personagem set medalha_vista = 11 $$,
  '23514',
  null,
  'medalha vista acima de 10 é rejeitada'
);

-- Como anon (sem login), nada é visível.
reset role;
set local role anon;
select throws_ok(
  $$ select 1 from public.personagem $$,
  '42501',
  null,
  'anon não lê a tabela'
);

-- Excluir o usuário remove o personagem junto.
reset role;
delete from auth.users where id = '00000000-0000-4000-8000-00000000000b';
select is_empty(
  $$ select 1 from public.personagem where user_id = '00000000-0000-4000-8000-00000000000b' $$,
  'excluir o usuário remove o personagem (on delete cascade)'
);

select * from finish();
rollback;
