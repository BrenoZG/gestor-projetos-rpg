# Design system

> Identidade herdada do Portfolio do autor (paleta e tipografia) aplicada a um tema RPG/anime de progressão. Implementação dos tokens: [`src/app/globals.css`](../src/app/globals.css).

## 1. Tokens em três camadas

| Camada | Exemplo | Uso |
|---|---|---|
| Primitivo | `--color-vinho-700: #6b1e35` | Valor bruto. Nunca usado direto em componente |
| Semântico | `--cor-acento-solido` | Significado. É o que muda se o tema mudar |
| Utilitário | `bg-acento-solido` | O que o componente consome |

Nenhum componente carrega hexadecimal, com uma única exceção: a camada metálica abaixo.

### Paleta (tema escuro, único na v1)
| Token | Valor | Uso |
|---|---|---|
| `--cor-fundo` | `#0f0e0e` | Fundo da página |
| `--cor-superficie` / `-alta` | `#161514` / `#1e1c1b` | Cartões e painéis |
| `--cor-borda` / `-forte` / `-campo` | `#2b2927` / `#3d3a37` / `#686560` | Separadores · bordas de destaque · borda de campo (3:1, WCAG 1.4.11) |
| `--cor-texto` / `-suave` / `-tenue` | `#f4f4f2` / `#a8a5a0` / `#8a877f` | Texto principal · secundário · terciário (o `-tenue` foi recalibrado para passar AA também sobre `--cor-superficie-alta`) |
| `--cor-acento` | `#c56680` | Texto de destaque (4,5:1 sobre o fundo) |
| `--cor-acento-solido` | `#6b1e35` | Área preenchida (botões); o texto por cima é que contrasta |

Tema escuro único: brilho, aura e partículas do tema RPG dependem de fundo escuro. Tema claro está no backlog.

### Exceção metálica
Restrita a **medalhas, emblemas de Rank e brasões de Classe**. Cada material tem 4 tons (`-0` brilho · `-1` base · `-2` sombra · `-3` profundidade): ferro, bronze, prata, ouro, platina, esmeralda, safira, rubi, diamante, mítica, lendária. Fora desses componentes, nenhuma cor nova entra.

A cor nunca é o único sinal: as medalhas evoluem também em forma e camadas.

## 2. Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Display | Syne 600–800 | Títulos, nomes de medalha, "LEVEL UP" |
| Corpo | DM Sans 400–600 | Texto corrido e formulários (base 16 px) |
| Mono | JetBrains Mono 400–500 | Números, XP, rótulos `[ SISTEMA ]`, stacks |

Servidas pelo `next/font`, do próprio domínio, sem requisição ao Google em produção.

## 3. Linguagem visual: "Janelas do Sistema"

O sistema fala com o usuário como o *Sistema* de um anime de progressão: painéis com cantos chanfrados (`clip-path`), borda vinho com brilho contido, rótulos em mono no formato `[ SISTEMA ] · CONTEXTO`. A inspiração é estética: nenhum nome, logo ou personagem de obra protegida.

## 4. Movimento

1. **Causa → efeito:** toda animação responde a uma ação ou conquista. Sem animação decorativa em loop na interface comum.
2. **No máximo 1–2 elementos animados por tela** fora das cinemáticas.
3. **Durações:** microinterações 150–300 ms; entrada de janela até 450 ms; cinemática de level up ~5 s, sempre pulável (`Esc`).
4. **Base = estado final:** o CSS sem animação já mostra o estado final; a animação só parte de um estado inicial. Assim, `prefers-reduced-motion` exibe o resultado sem esforço extra.
5. **Só `transform` e `opacity`** em animações contínuas (sem custo de layout).

## 5. Inventário de componentes RPG

| Componente | Variantes | Marco |
|---|---|---|
| Medalha (SVG gerado) | Tiers I–X: Bronze, Prata, Ouro, Platina, Esmeralda, Safira, Rubi, Diamante, Mítica, Lendária. Cada tier herda o anterior e soma uma camada (gema, louros, asas, aura, coroa, raios, aro duplo, cintilações, órbita, chamas) | M4 |
| Emblema de Rank (SVG gerado) | E Ferro · D Bronze · C Prata · B Safira · A Rubi · S Lendário | M4 |
| Brasão de Classe (SVG gerado) | 8 classes | M4 |
| Tela "Escolha sua classe" | — | M4 |
| Janela do Sistema | Missão concluída, XP ganho, recompensa bloqueada pela trava | M4 |
| Cinemática de level up | Com ou sem medalha nova; com ou sem troca de Rank | M5 |
| Ficha do Personagem | Página completa (tecla `C`) | M5 |

Protótipo visual aprovado: medalhas, emblemas, Janela do Sistema, cinemática e Ficha (referência de design, não código de produção).

## 6. Acessibilidade

- Contraste AA calibrado no pior par (texto sobre superfície, não sobre o fundo).
- Foco visível em todo elemento interativo; alvo de toque ≥ 44 × 44 px.
- SVG decorativo com `aria-hidden`; medalha e emblema com `role="img"` e rótulo ("Medalha Ouro, nível 30").
- Atalhos de uma tecla com proteção e opção de desligar (RN-12).
- Zoom nunca bloqueado.
