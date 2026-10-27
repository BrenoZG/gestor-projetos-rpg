# ADR-0009: Arrasto no Quadro com @dnd-kit/react

- **Status:** aceito
- **Data:** 2026-10-27

## Contexto
O dono pediu para mover as Missões entre as colunas do Quadro arrastando os cartões, com o mouse no computador e com o dedo no celular (RF-20). Restrições que pesam na escolha:
- **Toque no iPhone:** o arrasto nativo do HTML5 é irregular em celular, e o suporte no Safari do iPhone não foi confirmado (um bug do WebKit de 2021 dizia que ele funcionava só no iPad).
- **CSP com nonce em produção (ADR-0007):** um estilo injetado sem o nonce é bloqueado.
- **WCAG 2.5.7:** o arrasto não pode ser o único caminho.

## Decisão
- Usar `@dnd-kit/react` e `@dnd-kit/dom` **0.5.1, versão exata**. A biblioteca é baseada em eventos de ponteiro, então funciona igual com mouse, dedo e caneta.
- **Só o sensor de ponteiro.** O sensor de teclado da biblioteca fica de fora: o cartão tem um link, e quem usa teclado move pelo botão "Mover", que abre a lista das outras colunas e é a alternativa exigida pela WCAG 2.5.7.
- **O plugin `Accessibility` também fica de fora:** os avisos dele são em inglês e falam do teclado. O Quadro anuncia em português, numa região `role="status"`, para onde a Missão foi movida.
- **CSP:** a biblioteca injeta um `<style>`. O nonce da requisição é lido do cabeçalho CSP no servidor (`extrairNonce`) e passado ao `StyleInjector.configure({ nonce })`. Uma contraprova sem o nonce reprovou o E2E com `CSP: style-src-elem inline`.
- **O link do cartão é só o título.** A biblioteca não começa um arrasto dentro de um `a[href]` (`preventActivation`), e no celular o toque longo num link abre o menu do sistema. O corpo do cartão arrasta e, num clique simples, abre o detalhe por `router.push`; teclado e leitor de tela usam o link.
- **Ativação:** no mouse, depois de 5 px de movimento (o clique continua sendo clique); no dedo, depois de um toque longo de 250 ms (um deslize rápido continua rolando a página). Esses são os padrões da biblioteca.
- **A mudança aparece na hora** (`useOptimistic`) e a Server Action `moverMissao` grava só o status. Se ela recusar ou a rede falhar, o cartão volta para a coluna de origem e um `role="alert"` explica o motivo.

## Alternativas consideradas
- **Arrasto nativo do HTML5, sem dependência:** sem suporte confiável a toque, que foi um requisito explícito.
- **`@atlaskit/pragmatic-drag-and-drop`:** mantido e pequeno, mas apoiado no arrasto nativo, com a mesma dúvida no iPhone.
- **`@dnd-kit/core` 6.x:** API estável, mas sem versão nova desde 12/2024.
- **Liberar o arrasto a partir do link** (`preventActivation` próprio): funciona no mouse, mas briga com o menu de toque longo do celular.

## Consequências
- A versão 0.x pode mudar a API entre versões menores: por isso a versão é exata, e o E2E cobre o arrasto com mouse, o toque emulado, o botão por teclado, a falha do servidor e a CSP.
- A atualização da biblioteca é manual, com o E2E como portão.
- **Não verificado por automação:** o arrasto num aparelho real, e o arrasto até uma coluna fora da tela, com rolagem automática durante o movimento. A emulação de toque do Chromium cobre a ativação e a soltura numa coluna visível.
