# ADR-0008: Deploy de produção só pelo GitHub Actions

- **Status:** aceito
- **Data:** 2026-10-25

## Contexto
Um deploy deste sistema tem duas partes que precisam acontecer em ordem: as migrations no Supabase e o código na Vercel. A integração Git da Vercel publica a cada push, sem esperar a migration, e cria um preview por PR que usaria o banco de produção. Também é preciso uma aprovação humana antes de mexer em produção e um caminho de volta se a versão nova não responder.

## Decisão
- O projeto na Vercel foi criado pela CLI, **sem integração com o Git**. O `vercel.json` também desliga os deploys por Git (`git.deploymentEnabled: false`), para o caso de alguém conectar o repositório depois.
- O workflow `.github/workflows/deploy.yml` roda a cada push na `main`, nesta ordem:
  1. o CI completo (`ci.yml`, chamado como workflow reutilizável);
  2. a aprovação no ambiente `production` do GitHub, que exige o dono como revisor e só aceita a `main`;
  3. `vercel pull` e `vercel build --prod`. **O build vem antes das migrations:** se ele quebrar, o banco não é tocado;
  4. `supabase db push --db-url`, pelo pooler (IPv4), com a senha do banco montada a partir de um secret do ambiente;
  5. `vercel deploy --prebuilt --prod --skip-domain`, que publica sem trocar o que está no ar;
  6. `vercel promote`, que troca o domínio explicitamente e reativa a atribuição automática do domínio, desligada pela Vercel depois de qualquer rollback;
  7. smoke test (`curl -f` em `/api/saude`);
  8. `vercel rollback` se o smoke test falhar.
- Os segredos entram só nos passos que os usam. O `npm ci`, que executa scripts de dependências de terceiros, nunca os recebe.
- As credenciais são restritas: a senha do banco vale para este projeto, e o token da Vercel é limitado à equipe e expira em 90 dias. O token de conta do Supabase (`SUPABASE_ACCESS_TOKEN`), que daria acesso a todos os projetos, não é usado.
- A função roda em `gru1` (São Paulo), ao lado do banco em `sa-east-1`.

## Alternativas consideradas
- **Integração Git da Vercel com `ignoreCommand`:** publica sozinha e não sabe da migration; a ordem entre banco e código não seria garantida.
- **`supabase db push --linked` com `SUPABASE_ACCESS_TOKEN`:** o token pessoal vale para a conta inteira. A URL do banco vale só para este projeto (menor privilégio).
- **`vercel deploy --prod` direto:** depois de um rollback, a Vercel deixa de atribuir o domínio aos deploys novos. O deploy seguinte iria ao ar sem domínio, e o smoke test testaria a versão antiga.

## Consequências
- O rollback reverte só o app. **As migrations precisam ser compatíveis com a versão anterior do app** (expandir antes, contrair depois); o procedimento está em `docs/operacao.md`.
- No plano Hobby, o rollback volta só para o deploy imediatamente anterior.
- A CLI da Vercel tem versão fixa no workflow e não é atualizada pelo Dependabot.
- Sem previews: uma mudança visual é conferida localmente antes do merge.
