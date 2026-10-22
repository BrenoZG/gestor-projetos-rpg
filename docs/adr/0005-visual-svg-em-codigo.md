# ADR-0005: Medalhas, emblemas e brasões em SVG gerado por código

- **Status:** aceito
- **Data:** 2026-10-21

## Contexto
O tema RPG/anime exige 10 medalhas, 6 emblemas de Rank e 8 brasões de Classe visualmente impactantes, animáveis e com progressão clara de "poder". O repositório é público, então toda arte precisa ter licença clara.

## Decisão
Componentes React que **geram o SVG por código**: geometria calculada (estrelas facetadas, louros, asas, chamas), gradientes metálicos, filtro de iluminação especular para relevo e animações CSS (brilho, aura, órbita). Cada tier herda as camadas do anterior. Validado em protótipo e aprovado.

## Alternativas consideradas
- **Ilustração raster (PNG/WebP) com animação por cima:** maior teto visual, mas exige arte consistente para 24 peças e licença compatível com repositório público.
- **3D com Three.js:** reflexo real de metal, mas modelos a produzir, bundle pesado e fallback de acessibilidade obrigatório.

## Consequências
- Sem custo de arte, nítido em qualquer tamanho, tokens de cor centralizados, licença MIT do próprio código.
- Teto visual: não alcança o nível de uma ilustração profissional de jogo.
- IDs de gradientes e filtros precisam ser únicos por instância (várias medalhas na mesma página).
