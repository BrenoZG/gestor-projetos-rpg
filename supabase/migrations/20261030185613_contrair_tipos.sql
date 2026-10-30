-- Tipos de projeto (RN-15), etapa CONTRAIR (docs/operacao.md §4). O código no
-- ar desde o deploy da migration tipos_tags_links grava só pela
-- salvar_missao_v3 e sempre informa o estilo das Missões DEV: a v2 sai, e o
-- estilo_arquitetural perde o padrão 'monolito' (uma Missão Geral gravada
-- direto na tabela não recebe mais um estilo que o CHECK por tipo recusaria).
--
-- Reversão:
--   alter table public.projetos alter column estilo_arquitetural set default 'monolito';
--   e recriar a salvar_missao_v2 (com o comment, o revoke e o grant) a partir
--   da migration rank_por_arquitetura; o padrão 'dev' de projetos.tipo
--   mantém válidas as Missões que ela grava.

drop function public.salvar_missao_v2(uuid, text, text, text, text, text[], text, text[]);

alter table public.projetos alter column estilo_arquitetural drop default;
