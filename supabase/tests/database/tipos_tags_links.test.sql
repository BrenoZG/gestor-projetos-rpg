-- Testes dos tipos de projeto (RN-15), das tags (RF-24) e dos links (RF-26,
-- RN-17) no banco (pgTAP): colunas e CHECKs, tabelas novas, RLS, privilégios
-- e a função salvar_missao_v3, inclusive a compatibilidade da etapa expandir.
-- Usuários fictícios: A é o dono testado, B é o "outro usuário".
begin;
select plan(35);

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000000a'),
  ('00000000-0000-4000-8000-00000000000b');

-- Estrutura e privilégios
select has_column('public', 'projetos', 'tipo', 'projetos tem a coluna tipo');
select col_default_is('public', 'projetos', 'tipo', 'dev', 'Missões existentes e o app antigo ficam Desenvolvimento');
select has_table('public', 'tags', 'a tabela tags existe');
select has_table('public', 'projeto_tags', 'a tabela projeto_tags existe');
select has_table('public', 'projeto_links', 'a tabela projeto_links existe');
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.tags'::regclass, 'public.projeto_tags'::regclass, 'public.projeto_links'::regclass)),
  'RLS está habilitado nas três tabelas novas'
);
select ok(
  not has_table_privilege('anon', 'public.tags', 'select, insert, update, delete')
  and not has_table_privilege('anon', 'public.projeto_tags', 'select, insert, update, delete')
  and not has_table_privilege('anon', 'public.projeto_links', 'select, insert, update, delete'),
  'anon não tem nenhum privilégio nas tabelas novas'
);
select ok(
  not has_function_privilege('anon', 'public.salvar_missao_v3(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.salvar_missao_v3(uuid, text, text, text, text, text, text[], text, text[], text[], jsonb)', 'execute'),
  'só o usuário logado executa salvar_missao_v3'
);
select ok(
  has_column_privilege('authenticated', 'public.projetos', 'tipo', 'insert, update'),
  'o usuário grava o tipo'
);
select ok(
  not has_column_privilege('authenticated', 'public.tags', 'user_id', 'insert'),
  'o dono da tag vem da sessão, nunca do cliente'
);

-- B cadastra uma Missão com uma tag e um link; os ids ficam guardados.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select public.salvar_missao_v3(null, 'dev', 'Missão de B', 'x', 'y', 'script', '{}', 'backlog', array['Go'],
  array['Secreta'], '[{"url":"https://exemplo.com/b","titulo":"Link de B"}]');
reset role;
select set_config('teste.missao_b', (select id::text from public.projetos where nome = 'Missão de B'), true);

-- A partir daqui, as consultas rodam como o usuário A logado.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

select lives_ok(
  $$ select public.salvar_missao_v3(null, 'geral', 'Revenda', 'Revender acessórios', null, null, null, 'backlog',
       '{}', array['IA', 'ia'],
       '[{"url":"https://exemplo.com/a","titulo":"A"},{"url":"https://youtu.be/x","titulo":null}]') $$,
  'A cria uma Missão Geral sem ferramentas, sem estilo e sem arquitetura'
);
select results_eq(
  $$ select tipo, estilo_arquitetural is null, arquitetura is null, capacidades = '{}'
     from public.projetos where nome = 'Revenda' $$,
  $$ values ('geral'::text, true, true, true) $$,
  'a Missão Geral fica sem os campos técnicos'
);
select results_eq(
  $$ select t.nome from public.projeto_tags pt join public.tags t on t.id = pt.tag_id
     join public.projetos p on p.id = pt.projeto_id where p.nome = 'Revenda' $$,
  $$ values ('IA'::text) $$,
  'tags repetidas viram uma só, com a primeira grafia (RN-05)'
);
select results_eq(
  $$ select l.ordem::int, l.url, l.titulo from public.projeto_links l
     join public.projetos p on p.id = l.projeto_id where p.nome = 'Revenda' order by l.ordem $$,
  $$ values (0, 'https://exemplo.com/a'::text, 'A'::text), (1, 'https://youtu.be/x'::text, null::text) $$,
  'os links ficam na ordem enviada, com título opcional'
);

-- Regras do tipo (RN-15)
select throws_ok(
  $$ update public.projetos set estilo_arquitetural = 'monolito' where nome = 'Revenda' $$,
  '23514', null, 'Missão Geral não aceita estilo arquitetural'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Sem arquitetura', 'x', '   ', 'monolito', '{}', 'backlog',
       array['Go'], '{}', '[]') $$,
  '22023', null, 'Desenvolvimento continua exigindo a arquitetura (RN-14)'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'dev', 'Sem stacks', 'x', 'y', 'monolito', '{}', 'backlog',
       '{}', '{}', '[]') $$,
  '22023', null, 'Desenvolvimento continua exigindo de 1 a 20 stacks'
);
select throws_ok(
  format($$ select public.salvar_missao_v3(null, 'geral', 'Muitas ferramentas', 'x', null, null, null, 'backlog',
       %L::text[], '{}', '[]') $$, (select array_agg('f' || i) from generate_series(1, 21) as i)),
  '22023', null, 'Missão Geral aceita no máximo 20 ferramentas'
);
select throws_ok(
  format($$ select public.salvar_missao_v3(null, 'geral', 'Muitas tags', 'x', null, null, null, 'backlog',
       '{}', %L::text[], '[]') $$, (select array_agg('t' || i) from generate_series(1, 11) as i)),
  '22023', null, 'uma Missão aceita no máximo 10 tags'
);
select throws_ok(
  format($$ select public.salvar_missao_v3(null, 'geral', 'Muitos links', 'x', null, null, null, 'backlog',
       '{}', '{}', %L::jsonb) $$,
    (select jsonb_agg(jsonb_build_object('url', 'https://exemplo.com/' || i)) from generate_series(1, 21) as i)),
  '22023', null, 'uma Missão aceita no máximo 20 links'
);
select throws_ok(
  $$ select public.salvar_missao_v3(null, 'geral', 'Sem status', 'x', null, null, null, null, '{}', '{}', '[]') $$,
  '22023', null, 'o cadastro exige o status inicial'
);

-- Edição: troca de tipo (RN-16) e status intocado
select public.salvar_missao_v3(null, 'dev', 'Painel', 'x', 'Camadas.', 'monolito', array['ia'], 'backlog',
  array['Python'], '{}', '[]');
select public.salvar_missao_v3((select id from public.projetos where nome = 'Painel'), 'geral', 'Painel', 'x',
  'sobra', 'monolito', array['ia'], 'concluido', array['Python'], '{}', '[]');
select results_eq(
  $$ select tipo, estilo_arquitetural is null, arquitetura is null, capacidades = '{}'
     from public.projetos where nome = 'Painel' $$,
  $$ values ('geral'::text, true, true, true) $$,
  'trocar para Geral apaga estilo, capacidades e arquitetura'
);
select results_eq(
  $$ select s.nome from public.projeto_stacks ps join public.stacks s on s.id = ps.stack_id
     join public.projetos p on p.id = ps.projeto_id where p.nome = 'Painel' $$,
  $$ values ('Python'::text) $$,
  'as stacks continuam como ferramentas'
);
select results_eq(
  $$ select status, concluido_em is null from public.projetos where nome = 'Painel' $$,
  $$ values ('backlog'::text, true) $$,
  'a edição não muda o status, mesmo recebendo outro'
);

-- Remover o link do meio renumera a ordem sem buraco
select public.salvar_missao_v3((select id from public.projetos where nome = 'Revenda'), 'geral', 'Revenda', 'x',
  null, null, null, null, '{}', array['IA'],
  '[{"url":"https://exemplo.com/1"},{"url":"https://exemplo.com/2"},{"url":"https://exemplo.com/3"}]');
select public.salvar_missao_v3((select id from public.projetos where nome = 'Revenda'), 'geral', 'Revenda', 'x',
  null, null, null, null, '{}', array['IA'],
  '[{"url":"https://exemplo.com/1"},{"url":"https://exemplo.com/3"}]');
select results_eq(
  $$ select l.ordem::int, l.url from public.projeto_links l
     join public.projetos p on p.id = l.projeto_id where p.nome = 'Revenda' order by l.ordem $$,
  $$ values (0, 'https://exemplo.com/1'::text), (1, 'https://exemplo.com/3'::text) $$,
  'os links restantes ficam com a ordem 0 e 1'
);

-- Segunda barreira dos links (RN-17)
select throws_ok(
  $$ insert into public.projeto_links (projeto_id, url, ordem)
     select id, 'javascript:alert(1)', 5 from public.projetos where nome = 'Revenda' $$,
  '23514', null, 'o banco recusa link que não é https'
);
select throws_ok(
  $$ insert into public.projeto_links (projeto_id, url, ordem)
     select id, 'https://u:s@exemplo.com/', 5 from public.projetos where nome = 'Revenda' $$,
  '23514', null, 'o banco recusa link com usuário e senha'
);
select throws_ok(
  $$ insert into public.projeto_links (projeto_id, url, titulo, ordem)
     select id, 'https://exemplo.com/', '   ', 5 from public.projetos where nome = 'Revenda' $$,
  '23514', null, 'o banco recusa título só com espaços'
);

-- Tag existente é reaproveitada com a grafia gravada
select public.salvar_missao_v3(null, 'geral', 'Vídeos', 'x', null, null, null, 'backlog', '{}', array[' ia '], '[]');
select results_eq(
  $$ select count(*)::int, min(nome) from public.tags $$,
  $$ values (1, 'IA'::text) $$,
  'a tag " ia " reaproveita a tag IA, sem duplicar'
);

-- Isolamento entre usuários
select is_empty(
  $$ select 1 from public.tags where nome = 'Secreta' $$,
  'A não vê as tags de B'
);
select is_empty(
  $$ select 1 from public.projeto_links where url = 'https://exemplo.com/b' $$,
  'A não vê os links de B'
);
select throws_ok(
  format($$ insert into public.projeto_links (projeto_id, url, ordem) values (%L, 'https://exemplo.com/x', 1) $$,
    current_setting('teste.missao_b')),
  '42501', null, 'A não pendura link na Missão de B'
);
select throws_ok(
  format($$ insert into public.projeto_tags (projeto_id, tag_id) select %L, id from public.tags where nome = 'IA' $$,
    current_setting('teste.missao_b')),
  '42501', null, 'A não pendura tag na Missão de B'
);
select throws_ok(
  format($$ select public.salvar_missao_v3(%L, 'dev', 'Tomada', 'x', 'y', 'script', '{}', null, array['Go'],
       '{}', '[]') $$, current_setting('teste.missao_b')),
  'P0002', null, 'A não edita a Missão de B pela v3'
);

-- Compatibilidade da etapa expandir: o app antigo ainda grava pela v2
select lives_ok(
  $$ select public.salvar_missao_v2(null, 'Pela v2', 'x', 'y', 'script', '{}', 'backlog', array['Go']) $$,
  'a salvar_missao_v2 continua criando Missões'
);

select * from finish();
rollback;
