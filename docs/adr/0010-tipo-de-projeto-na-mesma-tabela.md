# ADR-0010: Tipo de projeto como coluna da tabela `projetos`

- **Status:** aceito
- **Data:** 2026-10-29

## Contexto
O Gestor passou a guardar também ideias e projetos que não são de programação (revenda, vídeos, marketing, serviços). Esses projetos têm nome, descrição, status, Atualizações, tags e links, mas não têm estilo arquitetural, capacidades, arquitetura nem Rank (RN-15). Tudo o que já existe para as Missões (Quadro, visão Lista, filtros, Atualizações, exclusão em cascata) deve valer para os dois tipos, e as Missões existentes não podem mudar.

## Decisão
Uma coluna `projetos.tipo` (`dev` ou `geral`, padrão `dev`) e um `CHECK` condicional: `dev` exige estilo e arquitetura; `geral` os exige nulos e as capacidades vazias. As ferramentas dos projetos Gerais usam as tabelas `stacks` e `projeto_stacks`, com quantidade cobrada pela `salvar_missao_v3` (1 a 20 em `dev`, 0 a 20 em `geral`). A mudança entrou em duas etapas (expandir e contrair, `docs/operacao.md` §4).

## Alternativas consideradas
- **Tabela separada para os projetos Gerais:** separação total, sem colunas nulas, mas as Atualizações apontam para `projetos`; seria preciso duplicá-las (ou uma chave estrangeira para duas tabelas) e duplicar Quadro, filtros e Lista.
- **Tabela base com extensão `detalhes_dev` (1:1):** modelo sem colunas nulas e Quadro compartilhado, mas exige mover os dados técnicos das Missões existentes em produção, acrescenta um JOIN a toda leitura de Missão de Desenvolvimento e complica a função de gravação, sem ganho visível para o usuário.

## Consequências
- Quadro, Lista, filtros, Atualizações e exclusão em cascata servem aos dois tipos sem código duplicado.
- Três colunas ficam nulas nos projetos Gerais; a regra que as controla vive num `CHECK` do banco, além da validação da aplicação.
- O tipo vira mais um ramo a testar em cada tela que mostra Rank ou parte técnica (cartão, ficha, Lista, formulário).
- No M3, o tipo decide a trilha de XP de cada evento (RN-18).

## Rever quando
Os tipos divergirem a ponto de cada um ter várias colunas exclusivas, ou surgir um terceiro tipo com regras próprias: aí a tabela de extensão passa a compensar.
