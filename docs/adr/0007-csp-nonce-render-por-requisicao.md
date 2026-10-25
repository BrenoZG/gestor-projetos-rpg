# ADR-0007: CSP com nonce e render por requisição

- **Status:** aceito
- **Data:** 2026-10-22

## Contexto
A CSP com nonce é a forma que a documentação do Next 16 recomenda para bloquear XSS sem `'unsafe-inline'`. O Next lê o nonce do cabeçalho da requisição e o aplica aos próprios scripts **durante o render**. Uma página pré-gerada no build não tem requisição e, portanto, sai sem nonce.

Teste feito em 2026-10-22 com `next build` + `next start`:

| Configuração | Resultado |
|---|---|
| Cache Components ligado, sem ajuste | `/` estática; 0 de 14 scripts com o nonce. O navegador bloquearia o app |
| + `await connection()` no layout raiz | Build falha: acesso a dado de requisição fora de `<Suspense>` |
| + `export const instant = false` no layout raiz | `/` dinâmica; 10 de 10 scripts e o CSS com o nonce, nonce diferente a cada requisição |

## Decisão
- `src/proxy.ts` gera o nonce (128 bits, Web Crypto) e monta a CSP (`src/lib/seguranca/csp.ts`), enviada na requisição e na resposta.
- O layout raiz declara `instant = false` e chama `await connection()`. Com isso, o app inteiro é renderizado por requisição, com o Cache Components ainda ligado.

## Alternativas consideradas
- **`cacheComponents: false`:** a documentação avisa que a opção será removida na próxima versão major, com o Cache Components ligado para todos. Isso forçaria uma migração.
- **CSP com `'unsafe-inline'` em scripts:** mantém páginas estáticas, mas deixa passar justamente o script injetado que a CSP existe para barrar.
- **SRI (hashes no build):** permite páginas estáticas com CSP estrita, mas é experimental no Next 16.

## Consequências
- Todo conteúdo das páginas é renderizado por requisição. Para um sistema privado, em que toda página depende do usuário logado, quase nada seria cacheável de qualquer forma.
- Com `next start`, as respostas saem com `Cache-Control: private, no-store`. Na Vercel, veja a atualização abaixo.
- `'unsafe-eval'` (scripts) e `'unsafe-inline'` (estilos) entram só em `next dev`, exigidos pelo React e pelo overlay de erros.
- Uma rota que precise ser estática no futuro (uma página pública, por exemplo) precisará de outra estratégia de CSP: hashes ou SRI.

## Atualização (2026-10-25): comportamento na Vercel
Medido em produção depois do primeiro deploy:
- `/entrar` sai com `x-vercel-cache: HIT`, `x-nextjs-prerender: 1` e `Cache-Control: public, max-age=0, must-revalidate`. A Vercel serve da CDN a **casca estática** da rota, que é praticamente vazia, porque o layout raiz chama `connection()` antes de qualquer conteúdo.
- O conteúdo continua sendo gerado por requisição: o nonce muda a cada resposta e é o mesmo no cabeçalho da CSP e nos 15 scripts do HTML; o cookie de Efeitos muda o `data-efeitos`; o `?erro=` escolhe a mensagem.
- Sem sessão, `/` responde 307 para `/entrar`, sem cache e sem nenhum dado do HUD, inclusive em navegação interna (`RSC: 1`), mesmo logo depois de um login em produção.

A decisão não muda: a CSP com nonce funciona, e nada que dependa da requisição vai para o cache compartilhado. Ao mudar o layout raiz ou a forma de render, repita essas três verificações em produção.

## Atualização (2026-10-25, M1b): atributo de estilo do streaming de SVG
Com o Quadro carregando as Missões dentro de um `<Suspense>`, parte das respostas acusava violações de CSP (`style-src-attr`). Quando o trecho transmitido em streaming fica dentro de um `<svg>` (os sigilos das colunas vazias), o React o envia num `<svg aria-hidden="true" style="display:none">`, porque um `<div>` não é válido ali, e o move para o lugar em seguida. O defeito é intermitente: depende de quando os dados chegam em relação à casca da página.

- **Decisão:** em produção, `style-src-attr 'unsafe-hashes' 'sha256-aqNNdDLnnrDOnTNdkJpYlAxKVJtLt9CtFLklmInuUAE='`, o hash exato de `display:none`. Qualquer outro atributo `style` continua bloqueado; no pior caso, um atributo injetado com esse valor só esconderia um elemento, sem executar nada.
- **Descartado:** `'unsafe-inline'` em estilos (libera tudo); tirar o `<Suspense>` do Quadro (o `loading.tsx` da rota também cria um, e o problema volta).
- **Evidência:** o HTML do Quadro trouxe 59 desses contêineres em 3 de 4 respostas; com a exceção, 0 violações no navegador em 3 visitas e no roteiro completo das Missões, rodado 3 vezes.
