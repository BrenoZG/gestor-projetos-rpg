# Modelo de dados

> **Estado:** desenho aprovado, a implementar por migrations versionadas em `supabase/migrations/` (M1: `personagem`, `projetos`, `stacks`, `projeto_stacks` · M2: `atualizacoes` · M3: `eventos_xp` e função `concluir_item`).
>
> Modelo **transacional normalizado (3FN)**: o sistema grava e consulta registros individuais; não há camada analítica separada.

## 1. Diagrama entidade-relacionamento

```mermaid
erDiagram
    PERSONAGEM ||--o{ PROJETOS : possui
    PERSONAGEM ||--o{ STACKS : cadastra
    PROJETOS ||--o{ PROJETO_STACKS : usa
    STACKS ||--o{ PROJETO_STACKS : "aparece em"
    PROJETOS ||--o{ ATUALIZACOES : recebe
    PERSONAGEM ||--o{ EVENTOS_XP : acumula

    PERSONAGEM {
        uuid user_id PK "= auth.users.id"
        text classe "nulo até a 1ª escolha"
        smallint nivel_maximo
        smallint medalha_vista
        timestamptz criado_em
    }
    PROJETOS {
        uuid id PK
        uuid user_id FK
        text nome
        text nome_normalizado "único por user_id"
        text descricao
        text arquitetura "Markdown, opcional"
        smallint dificuldade "1 a 5"
        text status
        timestamptz inicio_desenvolvimento_em
        timestamptz concluido_em
        timestamptz criado_em
        timestamptz atualizado_em
    }
    STACKS {
        uuid id PK
        uuid user_id FK
        text nome "grafia exibida"
        text nome_normalizado "único por user_id"
    }
    PROJETO_STACKS {
        uuid projeto_id PK, FK
        uuid stack_id PK, FK
    }
    ATUALIZACOES {
        uuid id PK
        uuid user_id FK
        uuid projeto_id FK "ON DELETE CASCADE"
        text titulo
        text descricao
        text status
        timestamptz concluido_em
        timestamptz criado_em
        timestamptz atualizado_em
    }
    EVENTOS_XP {
        uuid id PK
        uuid user_id FK
        text tipo
        uuid referencia_id "id do item; sobrevive à exclusão"
        integer xp "maior que zero"
        text nome_snapshot
        text rank_snapshot
        text_array stacks_snapshot "normalizadas"
        timestamptz criado_em
    }
```

## 2. Dicionário de dados

### `personagem` — grão: 1 linha por usuário
| Coluna | Tipo | Regra |
|---|---|---|
| `user_id` | `uuid` PK | = `auth.users.id`, `ON DELETE CASCADE` |
| `classe` | `text` | `CHECK` nas 8 chaves de `requisitos.md` §6; nulo até a escolha (RF-17) |
| `nivel_maximo` | `smallint` | 1–100; nunca diminui (medalhas permanentes, RN-08) |
| `medalha_vista` | `smallint` | 0–10; última medalha cuja animação já tocou |
| `criado_em` | `timestamptz` | `default now()` |

**Privilégios** (migration `criar_personagem`): `authenticated` lê a linha, cria só com `user_id` (o resto vem dos defaults) e altera só `classe` e `medalha_vista`. `nivel_maximo` fica fora do `UPDATE`: quem grava esse campo é a função de XP do M3, e assim ninguém sobe o próprio nível pela API. Não há `DELETE`: a linha sai com o usuário (`ON DELETE CASCADE`). `anon` não tem nenhum privilégio.

### `projetos` — grão: 1 linha por Projeto
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` FK | dono; base do RLS |
| `nome` | `text` | 3–80 caracteres |
| `nome_normalizado` | `text` | `lower(trim(nome))`; `UNIQUE (user_id, nome_normalizado)` |
| `descricao` | `text` | 1–2.000 |
| `arquitetura` | `text` | nulo ou até 20.000 |
| `dificuldade` | `smallint` | `CHECK (dificuldade BETWEEN 1 AND 5)` |
| `status` | `text` | `CHECK (status IN ('backlog','desenvolvimento','concluido'))` |
| `inicio_desenvolvimento_em` | `timestamptz` | ingresso mais recente em Desenvolvimento (trava de 24 h) |
| `concluido_em` | `timestamptz` | preenchido só em `concluido` (`CHECK` de coerência) |
| `criado_em`, `atualizado_em` | `timestamptz` | automáticos |

O Rank de Missão **não é coluna**: é derivado de `dificuldade` e da contagem de stacks pelo domínio. Guardá-lo criaria duas fontes da verdade.

### `stacks` — grão: 1 linha por stack distinta do usuário
| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK | |
| `nome` | `text` | primeira grafia cadastrada (RN-05) |
| `nome_normalizado` | `text` | `UNIQUE (user_id, nome_normalizado)` |

Tabela própria, e não array no projeto: permite autocompletar (evita "Next.js" e "NextJS" coexistirem) e contar uso por stack.

### `projeto_stacks` — grão: 1 linha por par (Projeto, stack)
PK composta `(projeto_id, stack_id)`. Ambas as FKs com `ON DELETE CASCADE`. Limite de 20 stacks por Projeto validado na aplicação.

### `atualizacoes` — grão: 1 linha por Atualização
| Coluna | Tipo | Regra |
|---|---|---|
| `projeto_id` | `uuid` FK | obrigatório; `ON DELETE CASCADE` (RN-04) |
| `titulo` | `text` | 3–120 |
| `descricao` | `text` | 1–5.000 |
| `status`, `concluido_em`, datas | | mesmas regras de `projetos` |

### `eventos_xp` — grão: 1 linha por evento de XP de um item
| Coluna | Tipo | Regra |
|---|---|---|
| `tipo` | `text` | `criacao_projeto` · `criacao_atualizacao` · `conclusao_projeto` · `conclusao_atualizacao` |
| `referencia_id` | `uuid` | id do Projeto ou Atualização. **Sem FK**: o evento precisa sobreviver à exclusão do item |
| `xp` | `integer` | `CHECK (xp > 0)` |
| `nome_snapshot` | `text` | nome do item no momento do evento (Registro de Missões) |
| `rank_snapshot` | `text` | Rank de Missão no momento do evento |
| `stacks_snapshot` | `text[]` | stacks normalizadas na conclusão do Projeto (Maestria) |
| — | | `UNIQUE (referencia_id, tipo)`: garante RN-06a no banco, não só na aplicação |

**Append-only:** o RLS permite `SELECT`; a escrita acontece apenas pela função `concluir_item` e pelas funções de criação e exclusão. A única remoção prevista é a revogação do XP de criação (RN-06c).

## 3. Segurança no banco

- RLS habilitado em **todas** as tabelas, com política `user_id = auth.uid()` para cada operação permitida.
- A aplicação usa a sessão do usuário (publishable key + JWT), nunca a `service_role`.
- Privilégios explícitos e por coluna (`GRANT`), porque a Data API não expõe tabelas novas automaticamente e o RLS filtra linhas, não colunas.
- Testes de banco em pgTAP (`supabase/tests/database/`, `npm run db:test`) provam que um usuário B não lê nem altera dados de um usuário A.

## 4. Consultas derivadas e grão

| Consulta | Fonte | Atenção ao grão |
|---|---|---|
| XP total | `SUM(xp)` em `eventos_xp` do usuário | Grão do evento: sem JOIN, sem risco de duplicação |
| Nível, título, Rank do Caçador | XP total + domínio | Calculado, não armazenado (exceto `nivel_maximo`) |
| Maestria | `unnest(stacks_snapshot)` em eventos `conclusao_projeto`, agrupado por stack | O XP de um Projeto é replicado para cada stack **por definição** (ver `gamificacao.md` §5). A soma entre stacks não é o XP total |
| Registro de Missões | `eventos_xp` ordenado por `criado_em` | Usa os snapshots; continua legível após exclusões |

## 5. Qualidade de dados (restrições no banco)

| Dimensão | Garantia |
|---|---|
| Validade | `CHECK` em status, dificuldade, classe, tamanhos e `xp > 0` |
| Unicidade | `UNIQUE` em nome normalizado de Projeto e stack; `UNIQUE (referencia_id, tipo)` no ledger |
| Completude | `NOT NULL` em todo campo obrigatório |
| Consistência | `CHECK` de coerência entre `status` e `concluido_em`; função atômica para status + XP |
