# Arquitetura

> Decisões e alternativas descartadas em [`adr/`](adr/). Diagramas em Mermaid: renderizam no GitHub e no VS Code (extensão *Markdown Preview Mermaid Support*).

## 1. Estilo

**Monolito modular em Next.js (App Router).** Um usuário, um deploy. Microsserviços seriam custo sem benefício (ADR-0001). Dentro do monolito, a regra de negócio fica isolada do framework.

## 2. Contexto (C4 nível 1)

```mermaid
flowchart LR
    usuario([Dono do sistema])
    app[Gestor de Projetos<br/>Next.js na Vercel]
    supa[(Supabase<br/>Auth + Postgres)]
    gh[GitHub<br/>OAuth]
    cron[Vercel Cron]

    usuario -- usa pelo navegador --> app
    app -- login OAuth --> gh
    app -- sessão e dados com RLS --> supa
    cron -- keepalive diário --> app
```

## 3. Contêineres e camadas (C4 nível 2)

```mermaid
flowchart TB
    subgraph next[Aplicação Next.js]
        ui[UI · React Server/Client Components<br/>src/app, src/componentes]
        acoes[Server Actions<br/>src/acoes · orquestram casos de uso]
        dominio[Domínio puro<br/>src/dominio · XP, Rank, nível, medalhas, validação]
        dados[Acesso a dados<br/>src/dados · clientes Supabase]
    end
    pg[(Postgres<br/>RLS em todas as tabelas)]

    ui --> acoes
    acoes --> dominio
    acoes --> dados
    dados --> pg
```

| Camada | Responsabilidade | Pode depender de |
|---|---|---|
| `src/app`, `src/componentes` | Renderizar e capturar intenção do usuário | `acoes`, tipos do `dominio` |
| `src/acoes` | Validar entrada (Zod), orquestrar, tratar erro de fronteira, logar | `dominio`, `dados` |
| `src/dominio` | Regras de negócio puras e determinísticas | nada (sem Next, sem Supabase) |
| `src/dados` | Ler e gravar no Postgres com a sessão do usuário | Supabase SDK |

O domínio não importa nada de infraestrutura: é testável em milissegundos e sobrevive a uma troca de banco ou framework.

## 4. Fluxo crítico: concluir missão

```mermaid
sequenceDiagram
    actor U as Usuário
    participant UI as UI
    participant A as Server Action
    participant D as Domínio
    participant DB as Postgres

    U->>UI: Marca missão como Concluída
    UI->>A: concluirProjeto(id)
    A->>DB: Lê projeto, stacks, atualizações concluídas (RLS)
    A->>D: calcularXpConclusao(projeto, agora)
    D-->>A: { xp, elegivel } (trava de 24 h)
    A->>DB: rpc concluir_item(id, xp)
    Note over DB: Uma transação: atualiza status<br/>e insere no ledger com UNIQUE(referencia_id, tipo)
    DB-->>A: XP total atualizado
    A->>D: nivelPorXp(total) e medalhas novas
    A-->>UI: { xpGanho, nivelAntes, nivelDepois, medalhaNova }
    UI-->>U: Janela do Sistema e, se subiu de nível, cinemática
```

**Por que a função SQL:** o cliente Supabase não abre transação. Atualizar o status e gravar o XP em duas chamadas permite um estado inconsistente (missão concluída sem XP) se a segunda falhar (ADR-0003).

## 5. Ciclo de vida do status

```mermaid
stateDiagram-v2
    state "Concluído" as Concluido
    [*] --> Backlog
    Backlog --> Desenvolvimento: iniciar (grava ingresso)
    Desenvolvimento --> Backlog: pausar
    Desenvolvimento --> Concluido: concluir (XP se ≥ 24 h)
    Backlog --> Concluido: concluir (sem XP de conclusão)
    Concluido --> Desenvolvimento: reabrir (XP mantido)
    Concluido --> Backlog: reabrir (XP mantido)
```

Vale para Projetos. Atualizações seguem o mesmo ciclo, sem a trava de 24 h.

## 6. Segurança

- **Autenticação:** GitHub OAuth via Supabase Auth, com cadastro público desativado (ADR-0004).
- **Autorização em três camadas:** cadastro fechado no provedor → allowlist de IDs do GitHub no middleware → RLS `user_id = auth.uid()` no banco.
- **Menor privilégio:** a aplicação não usa a `service_role`; toda consulta roda com a sessão do usuário.
- **Segredos:** apenas em variáveis de ambiente, validadas na inicialização (`src/lib/ambiente.ts`), com mensagem de erro que lista nomes de campos, nunca valores.
- **Repositório público:** `gitleaks` no CI, push protection do GitHub, dados fictícios no seed.
- **Cabeçalhos HTTP** (`next.config.ts`): `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e HSTS.
- **CSP com nonce** (`src/proxy.ts` + `src/lib/seguranca/csp.ts`): nonce de 128 bits novo a cada requisição, `script-src` com `'strict-dynamic'`, `connect-src` restrito à origem do Supabase, sem `'unsafe-inline'` em scripts. Exige render por requisição ([ADR-0007](adr/0007-csp-nonce-render-por-requisicao.md)).
- **Cadeia de suprimentos:** Actions fixadas por SHA de commit; Dependabot semanal para npm e Actions; o CI bloqueia vulnerabilidade `high` ou maior em dependência de **produção**. O gitleaks roda pela CLI com versão fixada e checksum SHA-256 conferido no próprio workflow; essa versão **não** é atualizada pelo Dependabot e deve ser revisada a cada release.

### Riscos aceitos
| Data | Risco | Por que é aceito | Revisão |
|---|---|---|---|
| 2026-10-21 | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): `braces` ≤ 3.0.3 (DoS por padrão de glob aninhado), via `eslint-config-next` → `fast-glob` → `micromatch`. Sem versão corrigida publicada. | Dependência só de desenvolvimento. Os padrões de glob vêm da configuração do ESLint do próprio projeto, nunca de entrada externa. O audit de produção está limpo. | Fechar quando o Dependabot propuser a versão corrigida. |

## 7. Notas de framework

- **Next.js 16 com `cacheComponents` ligado e app inteiro dinâmico:** o layout raiz declara `instant = false` e chama `await connection()` ([ADR-0007](adr/0007-csp-nonce-render-por-requisicao.md)). Por isso, ler cookies ou sessão não exige `<Suspense>`. `<Suspense>` continua útil para mostrar o estado de carregamento enquanto um dado lento chega.
- **Sessão renovada no proxy:** `src/lib/supabase/sessao-proxy.ts` chama `getClaims()` a cada requisição e devolve os cookies renovados com os cabeçalhos anti-cache do `@supabase/ssr`. Nunca usar `getSession()` no servidor: ele confia no cookie sem validar a assinatura.
- **Tipos de rota gerados:** `npm run typecheck` executa `next typegen` antes do `tsc`, porque tipos como `LayoutProps` só existem depois da geração.

## 8. Observabilidade

Log estruturado em JSON nas Server Actions, sem dado pessoal · error boundary por rota · logs da Vercel. Sentry fica fora da v1 (um usuário só).
