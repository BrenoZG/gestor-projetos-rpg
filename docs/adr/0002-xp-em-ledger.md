# ADR-0002: XP registrado em ledger permanente

- **Status:** aceito
- **Data:** 2026-10-21
- **Complementada por:** [ADR-0011](0011-privilegios-do-ledger-e-revogacao-por-trigger.md) (implementação no M3: `UNIQUE (user_id, referencia_id, tipo)`, funções por operação e revogação por trigger)

## Contexto
A primeira proposta calculava o XP a partir do estado atual (projetos e atualizações existentes). A regra de negócio aprovada depois exige que **XP de um projeto concluído não diminua se o projeto for excluído** (RN-06b), o que o modelo derivado não consegue atender: se o item some, o XP calculado some junto.

## Decisão
Cada ganho de XP é um evento gravado em `eventos_xp` (append-only), com `UNIQUE (referencia_id, tipo)` e snapshots de nome, Rank e stacks. O XP total é a soma do ledger. Medalhas passam a ser permanentes (`personagem.nivel_maximo`).

## Alternativas consideradas
- **XP derivado do estado:** sempre consistente e recalculável retroativamente, mas viola a RN-06b.
- **Contador acumulado numa coluna:** simples, mas sem rastreabilidade de origem e sem proteção contra concessão duplicada.

## Consequências
- **Perde-se o recálculo retroativo:** mudar uma fórmula afeta apenas eventos futuros.
- Ganha-se o "Registro de Missões" na Ficha, legível mesmo após exclusões, graças aos snapshots.
- Abre-se a brecha de "concluir e excluir" para acumular XP. Mitigação: trava de 24 h em Desenvolvimento para a conclusão de Projetos (RN-06d). Atualizações não têm trava; o ganho possível é pequeno (15–40 XP) e o único jogador é o dono.
