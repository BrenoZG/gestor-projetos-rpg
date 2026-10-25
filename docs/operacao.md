# Operação

> Como publicar, voltar atrás e trocar credenciais em produção. Decisões e alternativas em [ADR-0008](adr/0008-deploy-pelo-github-actions.md).

## 1. Onde está cada coisa

| Item | Onde | Observação |
|---|---|---|
| Banco e Auth | Supabase, projeto `gestor-projetos-rpg` (`sa-east-1`) | Plano Free |
| App | Vercel, projeto `gestor-projetos-rpg` (função em `gru1`) | Sem integração com o Git |
| Segredos do deploy | GitHub → Settings → Environments → `production` | `SUPABASE_DB_PASSWORD`, `VERCEL_TOKEN` |
| Configuração do deploy | Mesmo ambiente, aba *Variables* | `APP_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_POOLER_HOST`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| Variáveis do app | Vercel → projeto → Settings → Environment Variables (Production) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `ALLOWLIST_GITHUB_IDS` |
| Login com GitHub | OAuth App "Gestor de Projetos (produção)" no GitHub; Client ID e Secret no Supabase (Auth → Providers) | Separado do app de desenvolvimento |

## 2. Publicar
1. Faça o merge do PR na `main`. O workflow **Deploy** começa sozinho.
2. Depois do CI, o job `producao` espera a aprovação: GitHub → Actions → a execução → **Review deployments** → `production` → **Approve and deploy**.
3. O job faz o build, aplica as migrations, publica, promove e roda o smoke test. Verde = no ar.

Para publicar de novo sem um commit novo (por exemplo, depois de trocar uma variável na Vercel): Actions → Deploy → **Run workflow** na `main`.

## 3. Quando algo dá errado
| Sintoma | O que o pipeline já fez | O que fazer |
|---|---|---|
| CI vermelho | Nada foi publicado | Corrija no PR |
| Falha no build | Nada foi publicado; banco intocado | Corrija e faça outro merge |
| Falha nas migrations | App antigo no ar; a migration que falhou não foi registrada | Leia o log do passo, corrija a migration num PR novo |
| Falha no smoke test | Rollback automático para o deploy anterior | Investigue com `curl -i $APP_URL/api/saude` e os logs da Vercel; o app voltou, mas **as migrations novas continuam aplicadas** |

**Rollback manual** (a versão nova está no ar, mas com defeito):
```powershell
npx vercel@63.1.2 login
npx vercel@63.1.2 rollback --scope bgoncalves0899-6822s-projects
```
No plano Hobby, o rollback volta só para o deploy imediatamente anterior. O próximo deploy pelo pipeline promove a versão nova normalmente.

Não use "Re-run" numa execução antiga do Deploy para voltar no tempo: o `supabase db push` dela não conhece as migrations mais novas e falha.

## 4. Migrations compatíveis com o rollback
O rollback reverte o app, não o banco. Toda migration precisa funcionar com a versão do app que está no ar **e** com a nova:
- **Pode:** criar tabela, coluna anulável ou com default, índice, função nova.
- **Em dois deploys (expandir e depois contrair):** renomear ou remover coluna, tornar coluna obrigatória, mudar tipo. Primeiro, um deploy que passa a usar o novo; depois, outro que remove o antigo.
- Toda migration traz no cabeçalho o SQL de reversão, para aplicar à mão por uma migration nova, se for preciso.
- Objetos novos no schema `public` nascem sem acesso pela Data API: cada migration concede, explicitamente, só o necessário.

## 5. Trocar credenciais
Faça a troca a cada vencimento ou na suspeita de vazamento. Um segredo nunca passa por chat, print ou arquivo do repositório.

**Token da Vercel** (expira em 90 dias; o deploy falha no passo "Baixar a configuração" quando vence):
1. [vercel.com/account/settings/tokens](https://vercel.com/account/settings/tokens) → Create Token: escopo `bgoncalves0899-6822's projects`, validade de 90 dias.
2. `gh secret set VERCEL_TOKEN --env production --repo BrenoZG/gestor-projetos-rpg` e cole o token quando for pedido.
3. Apague o token antigo na mesma página.

**Senha do banco** (só letras e números: o pipeline a usa direto na URL de conexão):
1. Gere uma senha e copie para a área de transferência:
   ```powershell
   $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); ([Convert]::ToBase64String($b) -replace '[^A-Za-z0-9]', '') | Set-Clipboard
   ```
2. Supabase → Project Settings → Database → **Reset database password** → cole.
3. `gh secret set SUPABASE_DB_PASSWORD --env production --repo BrenoZG/gestor-projetos-rpg` → cole.
4. Limpe a área de transferência: `Set-Clipboard -Value ' '`.

**Client Secret do GitHub (login):** na página do OAuth App de produção, **Generate a new client secret** → cole no Supabase (Auth → Providers → GitHub → Save) → apague o secret antigo no GitHub.
