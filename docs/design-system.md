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

Arquivos variáveis (subset latin, que cobre o português) dos pacotes `@fontsource-variable/*` (licença OFL), carregados com `next/font/local`: servidos do próprio domínio, com fallback ajustado contra deslocamento de layout. O build não acessa o Google Fonts; a integridade dos arquivos vem do hash no `package-lock.json`.

## 3. Linguagem visual: "Janelas do Sistema"

O sistema fala com o usuário como o *Sistema* de um anime de progressão: painéis com cantos chanfrados (`clip-path`), borda vinho com brilho contido, rótulos em mono no formato `[ SISTEMA ] · CONTEXTO`. A inspiração é estética: nenhum nome, logo ou personagem de obra protegida.

### Classes de componente (`globals.css`, `@layer components`)
| Classe | Uso |
|---|---|
| `portal-sistema` | Fundo de tela cheia: brilho vinho no topo e grade tênue |
| `aura-sistema` | Brilho em volta da janela; vai no **elemento pai**, porque o `clip-path` cortaria a sombra |
| `janela-sistema` + `janela-sistema-conteudo` | Moldura chanfrada (1px de gradiente) e o miolo; sempre aninhadas |
| `entrada-janela` | Abertura da janela (420 ms); o estado final é a base, então `prefers-reduced-motion` já mostra a janela pronta |
| `botao-sistema` | Botão principal com reflexo no hover e no foco |
| `brilho-sigilo` | Brilho de ícones decorativos |

**Duas restrições técnicas:**
- **CSS Modules não funcionam neste projeto.** A regra do Turbopack para o Tailwind (`'*.css'` em `next.config.ts`) também captura `*.module.css`, e o objeto de classes chega vazio, **sem erro**. Componentes visuais reutilizáveis ficam em `@layer components`.
- **Nada de `style={{…}}`.** A CSP com nonce bloqueia atributos `style` inline.

O título que não pode quebrar (ex.: "Identifique-se,") usa tamanho fluido (`clamp`) e é conferido sem transbordar em 320, 360, 768 e 1280 px. O `clip-path` esconde o transbordo, então a falta de rolagem horizontal **não** prova que o texto coube.

## 4. Movimento

**Política aprovada: animação em todas as telas, organizada em 3 camadas, com o seletor "Efeitos visuais".** Vale para toda tela nova, inclusive os estados de carregamento, erro e vazio.

| Camada | O que anima | Exemplos atuais |
|---|---|---|
| 1. Ambiente | Contínuo e sutil, sem ação do usuário | Brasas (`.particulas`, `.lentas` nas telas de trabalho), anéis e núcleo do sigilo, reflexo do emblema de Rank, brilho no trilho da barra de XP e nos espaços vazios, cursor piscante |
| 2. Transição | Ao abrir ou navegar | HUD descendo (`.entrada-hud`), janelas abrindo (`.entrada-janela`), conteúdo e cartões em cascata (`.entrada-suave` + `[animation-delay:…]`) |
| 3. Recompensa | Resposta a ação ou conquista | Barra de XP enchendo (`.preenchimento-xp`), reflexo do botão principal; no futuro, "+XP" flutuando, contadores e level up |

**Efeitos visuais** (`componentes/seletor-efeitos.tsx`, cookie `efeitos`, atributo `data-efeitos` no `<html>`):

| Opção | Comportamento |
|---|---|
| Automático (padrão, sem cookie) | Segue o `prefers-reduced-motion` do sistema |
| Completo | As 3 camadas |
| Reduzido | Para a camada de ambiente; transições e recompensas curtas continuam |
| Desligado | Nenhuma animação nem transição |

O seletor é também o **controle de pausa exigido pelo WCAG 2.2.2** (nível A) para movimento automático com mais de 5 s. Por isso aparece no HUD e na tela de entrada.

Regras:
1. **Toda animação contínua nova entra na lista do modo Reduzido** em `globals.css`. Pseudo-elementos (`::after`) vão numa regra separada, porque não podem ficar dentro de `:is()`.
2. **Base = estado final:** o CSS sem animação já mostra o estado final; a animação só parte de um estado inicial. Desligar efeitos nunca esconde conteúdo.
3. **Só `transform` e `opacity`** (sem custo de layout).
4. **Durações:** microinterações 150–300 ms; entrada de janela até 450 ms; ambiente lento (3–60 s); cinemática de level up ~5 s, sempre pulável (`Esc`).
5. **Conferência:** no Chrome, `document.getAnimations()` deve dar 0 animações rodando com Desligado e com Reduzido (após as entradas), e também com o sistema pedindo menos movimento no modo Automático.

Comportamento conhecido: ao sair de "Desligado" para outra opção, as animações de entrada tocam uma vez de novo.

## 5. Inventário de componentes RPG

| Componente | Variantes | Marco |
|---|---|---|
| Medalha (SVG gerado) | Tiers I–X: Bronze, Prata, Ouro, Platina, Esmeralda, Safira, Rubi, Diamante, Mítica, Lendária. Cada tier herda o anterior e soma uma camada (gema, louros, asas, aura, coroa, raios, aro duplo, cintilações, órbita, chamas) | M4 |
| Emblema de Rank (SVG gerado) | E Ferro · D Bronze · C Prata · B Safira · A Rubi · S Lendário | M4 |
| Brasão de Classe (SVG gerado) | 8 classes | M4 |
| Tela "Escolha sua classe" | — | M4 |
| Janela do Sistema | Projeto concluído, XP ganho, recompensa bloqueada pela trava (até lá, o aviso do M3) | M5 |
| Cinemática de level up | Com ou sem medalha nova; com ou sem troca de Rank | M5 |
| Página do Personagem | Classe trocável e galeria de medalhas (conquistada · bloqueada em ferro, com cadeado e texto) | M4 |
| Ficha do Personagem | Página completa (tecla `C`), a partir da página do Personagem | M5 |

Protótipo visual aprovado: medalhas, emblemas, Janela do Sistema, cinemática e Ficha (referência de design, não código de produção).

## 6. Acessibilidade

- Contraste AA calibrado no pior par (texto sobre superfície, não sobre o fundo).
- Foco visível em todo elemento interativo; alvo de toque ≥ 44 × 44 px.
- SVG decorativo com `aria-hidden`; medalha e emblema com `role="img"` e rótulo ("Medalha Ouro, nível 30").
- Atalhos de uma tecla com proteção e opção de desligar (RN-12).
- Zoom nunca bloqueado.
