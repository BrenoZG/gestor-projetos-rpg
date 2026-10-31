# ADR-0003: Regras de XP em TypeScript, gravação em função SQL atômica

- **Status:** aceito
- **Data:** 2026-10-21
- **Complementada por:** [ADR-0011](0011-privilegios-do-ledger-e-revogacao-por-trigger.md) (implementação no M3: `UNIQUE (user_id, referencia_id, tipo)`, funções por operação e revogação por trigger)

## Contexto
Concluir uma missão exige duas escritas: mudar o status e gravar o XP. O cliente Supabase não abre transação; em duas chamadas, uma falha entre elas deixa a missão concluída sem XP (ou o contrário).

## Decisão
As regras (Rank, XP, trava de 24 h, nível, medalhas, Maestria) ficam em **TypeScript puro** em `src/dominio/`. A Server Action calcula o XP e chama a função Postgres `concluir_item(id, xp)`, que atualiza o status e insere no ledger **na mesma transação**. O banco garante as invariantes estruturais (unicidade, chaves, checks).

## Alternativas consideradas
- **Toda a regra em triggers PL/pgSQL:** integridade máxima independentemente do caminho de escrita, mas lógica de negócio numa linguagem mais difícil de ler, testar e evoluir.
- **Duas chamadas sem transação:** mais simples, mas inconsistência possível.

## Consequências
- Regras testáveis em milissegundos com Vitest, alvo de 100% de branches no domínio.
- **Risco aceito:** um usuário autenticado poderia chamar a função com um XP forjado. O único usuário autenticado é o dono; trapacear só afeta a própria progressão.
- Duas fontes de regra (TS e restrições SQL) precisam ser mantidas coerentes: os testes de integração cobrem a fronteira.
