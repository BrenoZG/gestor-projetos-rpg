# ADR-0011: Privilégios do ledger de XP e revogação por trigger

- **Status:** aceito
- **Data:** 2026-10-31
- **Complementa:** [ADR-0002](0002-xp-em-ledger.md) e [ADR-0003](0003-regras-ts-sql-atomico.md)

## Contexto
O M3 grava XP em `eventos_xp`. As funções do projeto são `SECURITY INVOKER`: rodam sob o RLS de quem chama. Para gravar no ledger por elas, o papel `authenticated` precisa de `INSERT` e `DELETE` na tabela, e isso também libera esses comandos pela API. Faltava definir quanto o banco protege o ledger e onde fica a revogação do XP de criação (RN-06c), que também precisa valer quando as Atualizações saem em cascata com o Projeto (RN-04).

## Decisão
- **RLS do ledger:** o usuário lê e insere só os próprios eventos, e só para um Projeto ou Atualização dele. Apaga **só** evento de criação de item que já foi excluído; conclusão, nunca. Não há `UPDATE`. A policy não consulta a própria `eventos_xp` (o Postgres recusa com recursão infinita): quem confere "sem conclusão" é o trigger. A permanência da conclusão (RN-06b) e a unicidade (RN-06a, `UNIQUE (user_id, referencia_id, tipo)`) passam a ser garantidas pelo banco, por qualquer caminho.
- **Revogação por trigger `AFTER DELETE`** em `projetos` e `atualizacoes`, sem nenhum valor de XP: só apaga o evento de criação que não tem conclusão. Vale na exclusão direta e na cascata.
- **Concessão continua como na ADR-0003:** o TypeScript calcula o XP, e as funções `salvar_missao_v4`, `criar_atualizacao`, `mudar_status_missao` e `mudar_status_atualizacao` gravam o item e o evento na mesma transação.

## Alternativas consideradas
- **Funções `SECURITY DEFINER` e ledger sem `INSERT`/`DELETE` para `authenticated`:** fecharia o XP forjado pela API, mas cria funções que ignoram o RLS, uma superfície de escalada de privilégio que o projeto não tem. Rejeitada: num app de um usuário só, o ganho não paga o risco.
- **Funções `excluir_missao` e `excluir_atualizacao` com a revogação:** o `DELETE` direto continuaria liberado (as funções `INVOKER` precisam dele) e pularia a revogação, e "criar e excluir" viraria fonte de XP. Rejeitada.
- **Fórmulas de XP em trigger:** rejeitada na ADR-0003.

## Consequências
- **Risco aceito (o mesmo da ADR-0003):** o dono pode inserir pela API um evento com XP forjado para um item seu, uma vez por tipo e item. O `UPDATE` direto de status continua liberado e, por esse caminho, ele só deixa de ganhar XP.
- A revogação não depende do código da aplicação. Um caminho novo de exclusão já nasce correto.
- As restrições do banco e as regras em TS precisam ficar coerentes: o pgTAP cobre as policies e o trigger, e o Vitest cobre os valores.
