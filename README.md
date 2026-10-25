# Gestor de Projetos

Gestão de projetos pessoais e de suas atualizações, com progressão estilo RPG: cada missão concluída rende XP, níveis, medalhas e Ranks, do Estagiário ao Desenvolvedor Sênior.

> **Status:** em desenvolvimento — marco **M0 (Fundação)**. Os dados exibidos em capturas e no seed são fictícios.

## O que faz

- **Missões (Projetos):** nome, descrição, arquitetura em Markdown, stacks, dificuldade e status (Backlog → Desenvolvimento → Concluído).
- **Atualizações:** melhorias e implementações registradas dentro de um projeto, com linha do tempo.
- **Progressão:** XP por criação e conclusão, 100 níveis, 10 medalhas com títulos, Rank de Missão e Rank do Caçador (E → S), Maestria por stack e 8 classes que misturam RPG e áreas de desenvolvimento.

Regras completas em [`docs/requisitos.md`](docs/requisitos.md) e [`docs/gamificacao.md`](docs/gamificacao.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Aplicação | Next.js 16 (App Router, Server Actions) · React 19 · TypeScript strict |
| Estilo | Tailwind CSS v4 · tokens próprios · SVG gerado para medalhas e emblemas |
| Dados e auth | Supabase (Postgres 17 + Auth com GitHub OAuth) · RLS em todas as tabelas |
| Validação | Zod |
| Testes | Vitest (unitário) · Playwright (E2E, a partir do M1) |
| Entrega | GitHub Actions · gitleaks · Dependabot · Vercel |

## Arquitetura em resumo

Monolito modular. A UI chama Server Actions, que validam a entrada, aplicam as regras do **domínio puro** (`src/dominio`, sem dependência de framework) e gravam no Postgres com a sessão do usuário. Conclusão de missão e XP são gravados numa única transação. Detalhes e diagramas em [`docs/arquitetura.md`](docs/arquitetura.md).

## Como rodar (Windows)

**Pré-requisitos:** Node.js 24 e Docker Desktop **aberto**.

```powershell
npm ci
npm run db:start            # sobe o Supabase local; na 1ª vez baixa as imagens
Copy-Item .env.example .env.local
# Preencha o .env.local com API_URL e PUBLISHABLE_KEY impressos pelo db:start
# e com o seu ID do GitHub (gh api user --jq .id)
npm run dev                 # http://localhost:3000
```

**Login local com GitHub:**
1. Crie um OAuth App de **desenvolvimento** em GitHub → Settings → Developer settings → OAuth Apps, com Homepage `http://localhost:3000` e callback `http://127.0.0.1:54321/auth/v1/callback`.
2. `Copy-Item supabase/.env.example supabase/.env` e preencha com o Client ID e um Client Secret desse app.
3. `npm run db:stop; npm run db:start` para a CLI ler os valores.

Só a conta cujo ID está em `ALLOWLIST_GITHUB_IDS` entra; as demais veem "Acesso recusado". O login por e-mail fica desligado.

Studio do banco local: http://127.0.0.1:54323. Para liberar memória ao terminar: `npm run db:stop`.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run verificar` | Typecheck + lint + formatação + testes + build (o mesmo que o CI) |
| `npm run format` | Formata o código com Prettier |
| `npm run typecheck` | Gera os tipos de rota do Next e roda o `tsc` |
| `npm test` | Testes unitários |
| `npm run db:start` / `db:stop` / `db:reset` | Supabase local |
| `npm run db:test` | Testes do banco em pgTAP (RLS, privilégios e restrições), em `supabase/tests/` |
| `npm run db:advisors` | Advisors de segurança e desempenho do Supabase no banco local; falha em achado `WARN` ou `ERROR` |

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | URL da API do Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim | Chave pública (`sb_publishable_...`); a proteção dos dados é o RLS |
| `ALLOWLIST_GITHUB_IDS` | sim | IDs numéricos do GitHub autorizados, separados por vírgula |
| `CRON_SECRET` | só no deploy | Segredo do keepalive (32+ caracteres) |

Contrato validado na inicialização por [`src/lib/ambiente.ts`](src/lib/ambiente.ts). Nunca versione `.env.local`.

As credenciais do OAuth App local (`SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID` e `_SECRET`) ficam em `supabase/.env`, lido só pela CLI do Supabase (modelo em [`supabase/.env.example`](supabase/.env.example)).

## Deploy

**Produção:** https://gestor-projetos-rpg.vercel.app

Produção só sai pelo workflow **Deploy** (GitHub Actions), a cada merge na `main`: CI → sua aprovação no ambiente `production` → build → migrations → publicação → smoke test em `/api/saude` → rollback automático se o smoke test falhar. App na Vercel (`gru1`), banco no Supabase (`sa-east-1`). Passo a passo, rollback manual e troca de credenciais em [`docs/operacao.md`](docs/operacao.md).

## Documentação

- [Requisitos](docs/requisitos.md) · [Gamificação](docs/gamificacao.md) · [Arquitetura](docs/arquitetura.md) · [Operação](docs/operacao.md)
- [Modelo de dados](docs/modelo-de-dados.md) · [Design system](docs/design-system.md)
- [Decisões arquiteturais (ADRs)](docs/adr/)
- [Política de segurança](SECURITY.md)

## Licença

[MIT](LICENSE)
