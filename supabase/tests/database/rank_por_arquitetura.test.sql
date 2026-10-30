-- Testes da RN-14 no banco (pgTAP): colunas estilo_arquitetural e capacidades,
-- arquitetura obrigatória (função salvar_missao_v3 e CHECK por tipo) e o estado
-- depois das etapas contrair (sem dificuldade, sem a salvar_missao antiga, sem
-- a salvar_missao_v2 e sem o padrão do estilo).
-- Usuários fictícios: A é o dono testado, B é o "outro usuário".
begin;
select plan(21);

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

-- Estrutura e privilégios
select col_is_null('public', 'projetos', 'estilo_arquitetural',
  'estilo_arquitetural aceita nulo: o CHECK por tipo o exige só em dev (RN-15)');
select col_hasnt_default('public', 'projetos', 'estilo_arquitetural',
  'estilo_arquitetural não tem padrão: a Missão DEV informa o estilo (contrair)');
select col_not_null('public', 'projetos', 'capacidades', 'capacidades é obrigatório (lista vazia vale)');
select hasnt_column('public', 'projetos', 'dificuldade', 'a dificuldade declarada saiu (contrair)');
select hasnt_function('public', 'salvar_missao', array['uuid', 'text', 'text', 'text', 'smallint', 'text', 'text[]'],
  'a função antiga saiu (contrair)');
select col_is_null('public', 'projetos', 'arquitetura',
  'a arquitetura aceita nulo: o CHECK por tipo a exige só em dev (RN-15)');
select ok(
  has_column_privilege('authenticated', 'public.projetos', 'estilo_arquitetural', 'insert, update')
  and has_column_privilege('authenticated', 'public.projetos', 'capacidades', 'insert, update'),
  'o usuário grava estilo e capacidades'
);
select hasnt_function('public', 'salvar_missao_v2',
  array['uuid', 'text', 'text', 'text', 'text', 'text[]', 'text', 'text[]'],
  'a salvar_missao_v2 saiu (contrair dos tipos)');

-- B cadastra uma Missão; o id dela fica guardado para o teste de isolamento.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select public.salvar_missao_v3(null, 'dev', 'Missão de B', 'Descrição de B', 'Um script.', 'script', '{}', 'backlog',
                               array['Python'], '{}', '[]');
reset role;
select set_config('teste.id_b', (select id::text from public.projetos where nome = 'Missão de B'), true);

-- A partir daqui, as consultas rodam como o usuário A logado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select isnt(
  public.salvar_missao_v3(null, 'dev', 'Gestor', 'Gestor de projetos', 'Next.js com Supabase.', 'monolito',
                          array['ci_cd', 'autenticacao', 'ci_cd'], 'backlog', array['Next.js', 'Supabase'], '{}', '[]'),
  null,
  'A cadastra uma Missão pela função e recebe o id'
);
select results_eq(
  $$ select estilo_arquitetural, capacidades, arquitetura from public.projetos where nome = 'Gestor' $$,
  $$ values ('monolito'::text, array['autenticacao', 'ci_cd']::text[], 'Next.js com Supabase.'::text) $$,
  'grava estilo, capacidades sem repetição e em ordem, e a arquitetura'
);
select results_eq(
  $$ select count(*)::int from public.projeto_stacks ps join public.projetos p on p.id = ps.projeto_id
     where p.nome = 'Gestor' $$,
  $$ values (2) $$,
  'liga as stacks da Missão'
);

select public.salvar_missao_v3(id, 'dev', 'Gestor', 'Gestor de projetos', 'Hexagonal agora.', 'hexagonal',
                               array['ia'], null, array['Next.js'], '{}', '[]')
from public.projetos where nome = 'Gestor';
select results_eq(
  $$ select estilo_arquitetural, capacidades, status from public.projetos where nome = 'Gestor' $$,
  $$ values ('hexagonal'::text, array['ia']::text[], 'backlog'::text) $$,
  'edita estilo e capacidades; a edição não muda o status'
);

-- Arquitetura obrigatória (RN-14)
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Sem arquitetura', 'x', '   ', 'monolito', '{}', 'backlog',
       array['Go'], '{}', '[]') $$,
  '22023', null,
  'arquitetura só com espaços é recusada'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Sem arquitetura', 'x', null, 'monolito', '{}', 'backlog',
       array['Go'], '{}', '[]') $$,
  '22023', null,
  'arquitetura nula é recusada'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Sem stacks', 'x', 'y', 'monolito', '{}', 'backlog',
       array['  '], '{}', '[]') $$,
  '22023', null,
  'continua exigindo de 1 a 20 stacks'
);

-- Valores fora da lista: o CHECK barra mesmo quem grava direto na tabela.
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Estilo ruim', 'x', 'y', 'monolitico', '{}', 'backlog',
       array['Go'], '{}', '[]') $$,
  '23514', null,
  'estilo fora da lista é recusado'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Capacidade ruim', 'x', 'y', 'monolito', array['blockchain'],
       'backlog', array['Go'], '{}', '[]') $$,
  '23514', null,
  'capacidade fora da lista é recusada'
);
select throws_ok(
  $$ update public.projetos set capacidades = array['ia', 'blockchain'] where nome = 'Gestor' $$,
  '23514', null,
  'o CHECK vale também para o update direto na tabela'
);

-- Isolamento: A não altera a Missão de B pela função.
select throws_ok(
  format($$ select public.salvar_missao_v3(%L::uuid, 'dev', 'Tomada', 'x', 'y', 'script', '{}', null,
              array['Go'], '{}', '[]') $$,
         current_setting('teste.id_b')),
  'P0002', null,
  'A não altera a Missão de B'
);

-- O CHECK cobra a arquitetura também de quem grava direto na tabela.
select throws_ok(
  $$ update public.projetos set arquitetura = '   ' where nome = 'Gestor' $$,
  '23514', null,
  'arquitetura só com espaços é recusada também no update direto'
);

reset role;
select results_eq(
  $$ select nome from public.projetos where id = current_setting('teste.id_b')::uuid $$,
  $$ values ('Missão de B'::text) $$,
  'a Missão de B continua intacta'
);

select * from finish();
rollback;
