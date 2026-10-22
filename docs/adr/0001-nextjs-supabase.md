# ADR-0001: Monolito Next.js com Supabase

- **Status:** aceito
- **Data:** 2026-10-21

## Contexto
Sistema web de um único usuário, acessado do computador e do celular, com login e dados persistentes. Time de uma pessoa. O autor já mantém um Portfolio em Next.js + Tailwind v4, cujos tokens de design serão reaproveitados.

## Decisão
Monolito **Next.js** (App Router, Server Actions) com **Supabase** (Postgres + Auth), acessado apenas pelo servidor, com deploy na Vercel. Versão instalada no scaffold: Next.js 16.4.2.

## Alternativas consideradas
- **Next.js + Neon + Auth.js:** zero lock-in, mas mais peças para configurar e manter (adapter de sessão, provedor, migrations separadas).
- **Next.js (front) + FastAPI (back):** prática de Python, mas dobra a operação (dois deploys, CORS, contrato HTTP entre os dois) para um sistema de um usuário.
- **Microsserviços:** sem escala nem time que justifiquem.

## Consequências
- Acoplamento ao Supabase Auth; o Postgres em si é portável.
- Plano gratuito do Supabase pausa por inatividade e não tem backup automático: mitigado no ADR-0006.
- Next.js 16 vem com `cacheComponents` ligado: leituras dinâmicas (sessão em cookie) precisam de `<Suspense>` nas rotas autenticadas.
- `npm run typecheck` executa `next typegen` antes do `tsc`, porque tipos como `LayoutProps` são gerados pelo framework.
