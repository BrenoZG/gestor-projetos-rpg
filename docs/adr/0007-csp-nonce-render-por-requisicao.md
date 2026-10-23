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
- Nenhuma página é servida de cache de CDN. Para um sistema privado, em que toda página depende do usuário logado, quase nada seria cacheável de qualquer forma.
- As respostas saem com `Cache-Control: private, no-store`.
- `'unsafe-eval'` (scripts) e `'unsafe-inline'` (estilos) entram só em `next dev`, exigidos pelo React e pelo overlay de erros.
- Uma rota que precise ser estática no futuro (uma página pública, por exemplo) precisará de outra estratégia de CSP: hashes ou SRI.
