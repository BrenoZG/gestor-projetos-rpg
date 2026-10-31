-- Testes do M6: `exportar_dados()` (RF-14, export JSON). Usuários fictícios:
-- A é o dono testado, B é o "outro" e C não tem nada além da conta.
begin;
select plan(24);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@exemplo.com'),
  ('00000000-0000-4000-8000-00000000000b', 'b@exemplo.com'),
  ('00000000-0000-4000-8000-00000000000c', 'c@exemplo.com');
insert into public.personagem (user_id, classe, nivel_maximo) values
  ('00000000-0000-4000-8000-00000000000a', 'guerreiro_backend', 12),
  ('00000000-0000-4000-8000-00000000000b', 'arquimago_dados', 40);

-- 1.500 eventos de A: acima do teto de 1.000 linhas da Data API (max_rows).
insert into public.eventos_xp (user_id, tipo, trilha, referencia_id, xp, nome_snapshot)
select '00000000-0000-4000-8000-00000000000a', 'criacao_projeto', 'desenvolvedor', gen_random_uuid(), 10, 'Evento ' || n
from generate_series(1, 1500) as n;

-- Estrutura e permissões
select has_function('public', 'exportar_dados', '{}'::name[], 'a função exportar_dados existe');
select ok(
  not (select prosecdef from pg_proc where oid = 'public.exportar_dados()'::regprocedure),
  'exportar_dados é security invoker: roda sob o RLS de quem chama'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.exportar_dados()'::regprocedure),
  'exportar_dados fixa o search_path vazio'
);
select ok(
  not has_function_privilege('anon', 'public.exportar_dados()', 'execute'),
  'anon não executa exportar_dados'
);
select ok(
  has_function_privilege('authenticated', 'public.exportar_dados()', 'execute'),
  'authenticated executa exportar_dados'
);

-- B cadastra os próprios dados, que não podem aparecer no export de A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
select public.salvar_missao_v4(null, 'dev', 'Missão de B', 'x', 'y', 'script', '{}', 'backlog',
  array['Go'], array['Secreta'], '[{"url":"https://exemplo.com/b","titulo":"Link de B"}]', 10);
insert into public.atualizacoes (projeto_id, titulo, descricao)
select id, 'Atualização de B', 'x' from public.projetos;

-- A cadastra uma Missão completa e uma Atualização.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
select public.salvar_missao_v4(null, 'dev', 'Gestor', 'Descrição', 'Arquitetura', 'monolito', '{}', 'backlog',
  array['Next.js', 'PostgreSQL'], array['Pessoal'], '[{"url":"https://exemplo.com/a","titulo":"A"}]', null);
insert into public.atualizacoes (projeto_id, titulo, descricao)
select id, 'Corrige o login', 'x' from public.projetos;
create temporary table export_a on commit drop as select public.exportar_dados() as dados;

select is(
  (select array_agg(chave order by chave) from export_a, jsonb_object_keys(dados) as chave),
  array['atualizacoes', 'eventos_xp', 'personagem', 'projeto_links', 'projeto_stacks', 'projeto_tags',
        'projetos', 'stacks', 'tags'],
  'o export tem uma chave por tabela do usuário'
);

-- O conjunto de chaves de cada tabela fica preso aqui: coluna nova muda o
-- formato do arquivo (versao_formato) e precisa de decisão, não entra calada.
select is(
  (select array_agg(chave order by chave) from export_a, jsonb_object_keys(dados -> 'personagem') as chave),
  array['classe', 'criado_em', 'medalha_vista', 'nivel_maximo', 'nivel_visto'],
  'personagem sai sem user_id'
);
select is(
  (select array_agg(chave order by chave) from export_a, jsonb_object_keys(dados -> 'projetos' -> 0) as chave),
  array['arquitetura', 'atualizado_em', 'capacidades', 'concluido_em', 'criado_em', 'descricao',
        'estilo_arquitetural', 'id', 'inicio_desenvolvimento_em', 'nome', 'status', 'tipo'],
  'projetos saem sem user_id nem nome_normalizado'
);
select is(
  (select array_agg(chave order by chave) from export_a, jsonb_object_keys(dados -> 'stacks' -> 0) as chave),
  array['criado_em', 'id', 'nome'],
  'stacks saem sem user_id nem nome_normalizado'
);
select is(
  (select array_agg(chave order by chave) from export_a, jsonb_object_keys(dados -> 'tags' -> 0) as chave),
  array['criado_em', 'id', 'nome'],
  'tags saem sem user_id nem nome_normalizado'
);
select is(
  (select array_agg(chave order by chave) from export_a, jsonb_object_keys(dados -> 'projeto_links' -> 0) as chave),
  array['criado_em', 'id', 'ordem', 'projeto_id', 'titulo', 'url'],
  'projeto_links saem com todas as colunas'
);
select is(
  (select array_agg(chave order by chave) from export_a, jsonb_object_keys(dados -> 'atualizacoes' -> 0) as chave),
  array['atualizado_em', 'concluido_em', 'criado_em', 'descricao', 'id', 'projeto_id', 'status', 'titulo'],
  'atualizacoes saem sem user_id'
);
select is(
  (select array_agg(chave order by chave) from export_a, jsonb_object_keys(dados -> 'eventos_xp' -> 0) as chave),
  array['criado_em', 'id', 'nome_snapshot', 'rank_snapshot', 'referencia_id', 'stacks_snapshot', 'tipo',
        'trilha', 'xp'],
  'eventos_xp saem sem user_id'
);

-- Conteúdo de A
select is((select dados -> 'personagem' ->> 'classe' from export_a), 'guerreiro_backend', 'traz a Classe de A');
select is(
  (select jsonb_path_query_array(dados, '$.projetos[*].nome') from export_a),
  '["Gestor"]'::jsonb,
  'traz só a Missão de A'
);
select is(
  (select array_agg(nome order by nome) from export_a, jsonb_path_query(dados, '$.stacks[*].nome') as nome),
  array['"Next.js"'::jsonb, '"PostgreSQL"'::jsonb],
  'traz só as stacks de A'
);
select is(jsonb_array_length((select dados -> 'projeto_stacks' from export_a)), 2, 'traz os 2 vínculos de stack de A');
select is(
  (select jsonb_path_query_array(dados, '$.tags[*].nome') from export_a),
  '["Pessoal"]'::jsonb,
  'traz só a tag de A'
);
select is(jsonb_array_length((select dados -> 'projeto_tags' from export_a)), 1, 'traz o vínculo de tag de A');
select is(
  (select jsonb_path_query_array(dados, '$.projeto_links[*].url') from export_a),
  '["https://exemplo.com/a"]'::jsonb,
  'traz só o link de A'
);
select is(
  (select jsonb_path_query_array(dados, '$.atualizacoes[*].titulo') from export_a),
  '["Corrige o login"]'::jsonb,
  'traz só a Atualização de A'
);
select is(
  jsonb_array_length((select dados -> 'eventos_xp' from export_a)),
  1500,
  'traz os 1.500 eventos de A, acima do teto de linhas da API, e nenhum de B'
);
select ok(
  (select position('00000000-0000-4000-8000-00000000000a' in dados::text) = 0
     and position('@exemplo.com' in dados::text) = 0
   from export_a),
  'o arquivo não traz o id da conta nem o e-mail'
);

-- C não tem personagem nem dados: listas vazias, sem erro.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
select is(
  public.exportar_dados(),
  jsonb_build_object(
    'personagem', null, 'projetos', '[]'::jsonb, 'stacks', '[]'::jsonb, 'projeto_stacks', '[]'::jsonb,
    'tags', '[]'::jsonb, 'projeto_tags', '[]'::jsonb, 'projeto_links', '[]'::jsonb,
    'atualizacoes', '[]'::jsonb, 'eventos_xp', '[]'::jsonb
  ),
  'usuário sem dados recebe listas vazias'
);

select * from finish();
rollback;
