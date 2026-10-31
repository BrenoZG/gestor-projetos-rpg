import { useId } from 'react';

import type { MaterialMedalha } from '@/dominio/progressao/medalhas';

/**
 * Geometria das medalhas (ADR-0005): tudo calculado aqui, em coordenadas com o
 * centro em (0, 0) e o disco com raio 30. Cada tier herda as camadas do
 * anterior e soma uma (design-system.md §5): I gema · II louros · III asas ·
 * IV aura · V coroa · VI raios · VII aro duplo · VIII cintilações · IX órbita · X chamas.
 */

const RAIO_DISCO = 30;
const TIER_GEMA = 1;
const TIER_LOUROS = 2;
const TIER_ASAS = 3;
const TIER_AURA = 4;
const TIER_COROA = 5;
const TIER_RAIOS = 6;
const TIER_ARO_DUPLO = 7;
const TIER_CINTILACOES = 8;
const TIER_ORBITA = 9;
const TIER_CHAMAS = 10;

type Ponto = readonly [number, number];

/** Uma casa decimal basta para o desenho e encurta o SVG. */
function arredondar(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function polar(raio: number, graus: number): Ponto {
  const radianos = (graus * Math.PI) / 180;
  return [arredondar(raio * Math.cos(radianos)), arredondar(raio * Math.sin(radianos))];
}

function caminhoFechado(pontos: readonly Ponto[]): string {
  return `M${pontos.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
}

/** Vértices de uma estrela, alternando ponta e vale, com a 1ª ponta para cima. */
function pontosDaEstrela(pontas: number, raioPonta: number, raioVale: number): Ponto[] {
  const passo = 180 / pontas;
  return Array.from({ length: pontas * 2 }, (_, i) =>
    polar(i % 2 === 0 ? raioPonta : raioVale, i * passo - 90),
  );
}

const ESTRELA = pontosDaEstrela(5, 19, 8);
/** Facetas: um triângulo do centro a cada aresta, claro e escuro alternados (relevo). */
const FACETAS = ESTRELA.map((ponto, i) =>
  caminhoFechado([[0, 0], ponto, ESTRELA[(i + 1) % ESTRELA.length]!]),
);

/** Folhas do louro esquerdo, de baixo para cima; o direito é o espelho. */
const FOLHAS_LOURO = [100, 122, 144, 166, 188, 210].map((graus) => {
  const [x, y] = polar(38, graus);
  return { x, y, giro: graus + 90 };
});

/** Penas da asa direita, da maior para a menor; a esquerda é o espelho. */
const PENAS_ASA = [0, 1, 2].map((k) => {
  const yBase = -6 + k * 8;
  const ponta: Ponto = [58 - k * 7, -18 + k * 9];
  return `M26 ${yBase}Q${42 - k * 3} ${yBase - 16} ${ponta[0]} ${ponta[1]}Q${40 - k * 2} ${yBase + 2} 26 ${yBase + 7}Z`;
});

const RAIOS = Array.from({ length: 16 }, (_, i) => {
  const graus = i * 22.5;
  const alcance = i % 2 === 0 ? 52 : 45;
  return caminhoFechado([polar(32, graus - 3), polar(alcance, graus), polar(32, graus + 3)]);
});

const COROA = caminhoFechado([
  [-14, -27],
  [-17, -45],
  [-7, -36],
  [0, -50],
  [7, -36],
  [17, -45],
  [14, -27],
]);

const CINTILACOES = [-140, -60, 20, 100, 160].map((graus) => polar(54, graus));

/** Brilho de 4 pontas centrado em (x, y). */
function cintilacao([x, y]: Ponto): string {
  const r = 4.5;
  const v = 1.2;
  return `M${x} ${y - r}L${x + v} ${y - v}L${x + r} ${y}L${x + v} ${y + v}L${x} ${y + r}L${x - v} ${y + v}L${x - r} ${y}L${x - v} ${y - v}Z`;
}

/** Línguas de fogo atrás da metade de cima do disco. */
const CHAMAS = [-160, -133, -107, -90, -73, -47, -20].map((graus, i) => {
  const alcance = i % 2 === 0 ? 54 : 59;
  const [bx1, by1] = polar(30, graus - 11);
  const [bx2, by2] = polar(30, graus + 11);
  const [px, py] = polar(alcance, graus);
  const [cx1, cy1] = polar(44, graus - 13);
  const [cx2, cy2] = polar(44, graus + 13);
  return `M${bx1} ${by1}Q${cx1} ${cy1} ${px} ${py}Q${cx2} ${cy2} ${bx2} ${by2}Z`;
});

/**
 * Medalha de um tier (RF-15), em SVG gerado. Bloqueada, é desenhada em ferro,
 * sem animação; quem a usa diz "bloqueada" também em texto (a cor não é o único sinal).
 *
 * As cores vêm de classes (`parada-<material>-<n>`, globals.css), porque
 * atributos SVG não aceitam `var(...)` e estilo inline seria bloqueado pela CSP.
 * Os ids internos são únicos por medalha (`useId`).
 *
 * @param props - Tier (1–10), material, se está bloqueada, rótulo acessível e classes de tamanho.
 */
export function Medalha({
  tier,
  material,
  bloqueada = false,
  rotulo,
  className = '',
}: {
  tier: number;
  material: MaterialMedalha;
  bloqueada?: boolean;
  rotulo: string;
  className?: string;
}) {
  const metal = bloqueada ? 'ferro' : material;
  const animada = !bloqueada;
  const sufixo = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (nome: string) => `medalha-${nome}-${sufixo}`;
  const preencher = (nome: string) => `url(#${id(nome)})`;
  const tem = (camada: number) => tier >= camada;

  return (
    <svg
      role="img"
      aria-label={rotulo}
      viewBox="-60 -60 120 120"
      className={`${bloqueada ? 'medalha-bloqueada' : ''} ${className}`}
    >
      <defs>
        <linearGradient id={id('metal')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" className={`parada-${metal}-0`} />
          <stop offset="0.35" className={`parada-${metal}-1`} />
          <stop offset="0.75" className={`parada-${metal}-2`} />
          <stop offset="1" className={`parada-${metal}-3`} />
        </linearGradient>
        <linearGradient id={id('estrela')} x1="0" y1="1" x2="0.3" y2="0">
          <stop offset="0" className={`parada-${metal}-2`} />
          <stop offset="1" className={`parada-${metal}-0`} />
        </linearGradient>
        <linearGradient id={id('gema')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className={bloqueada ? 'parada-ferro-1' : 'parada-acento'} />
          <stop offset="1" className={bloqueada ? 'parada-ferro-3' : 'parada-acento-forte'} />
        </linearGradient>
        <radialGradient id={id('aura')}>
          <stop offset="0.55" className={`parada-${metal}-1`} stopOpacity="0.55" />
          <stop offset="1" className={`parada-${metal}-1`} stopOpacity="0" />
        </radialGradient>
      </defs>

      {tem(TIER_CHAMAS) && (
        <g className={animada ? 'chama-medalha' : undefined} fill={preencher('metal')} opacity="0.9">
          {CHAMAS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      )}
      {tem(TIER_AURA) && (
        <circle r="44" fill={preencher('aura')} className={animada ? 'aura-medalha' : undefined} />
      )}
      {tem(TIER_RAIOS) && (
        <g fill={preencher('metal')} opacity="0.8">
          {RAIOS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      )}
      {tem(TIER_ASAS) && (
        <g fill={preencher('metal')} className={`contorno-${metal}`} strokeWidth="0.8">
          {PENAS_ASA.map((d) => (
            <path key={d} d={d} />
          ))}
          <g transform="scale(-1 1)">
            {PENAS_ASA.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </g>
      )}
      {tem(TIER_LOUROS) && (
        <g fill={preencher('metal')}>
          {FOLHAS_LOURO.map(({ x, y, giro }) => (
            <ellipse key={giro} cx={x} cy={y} rx="6" ry="2.6" transform={`rotate(${giro} ${x} ${y})`} />
          ))}
          <g transform="scale(-1 1)">
            {FOLHAS_LOURO.map(({ x, y, giro }) => (
              <ellipse key={giro} cx={x} cy={y} rx="6" ry="2.6" transform={`rotate(${giro} ${x} ${y})`} />
            ))}
          </g>
        </g>
      )}

      <circle r={RAIO_DISCO} fill={preencher('metal')} />
      <circle r={RAIO_DISCO - 4} fill="none" className={`contorno-${metal}`} strokeWidth="1.5" />
      {tem(TIER_ARO_DUPLO) && (
        <>
          <circle r={RAIO_DISCO + 3} fill="none" stroke={preencher('metal')} strokeWidth="3" />
          <circle r={RAIO_DISCO - 7} fill="none" className={`contorno-${metal}`} strokeWidth="0.8" />
        </>
      )}

      <path d={caminhoFechado(ESTRELA)} fill={preencher('estrela')} />
      {FACETAS.map((d, i) => (
        <path key={d} d={d} className={i % 2 === 0 ? 'faceta-clara' : 'faceta-escura'} />
      ))}
      {tem(TIER_GEMA) && <path d="M0 -6 5 0 0 6 -5 0Z" fill={preencher('gema')} />}

      {tem(TIER_COROA) && (
        <g>
          <path d={COROA} fill={preencher('metal')} className={`contorno-${metal}`} strokeWidth="0.8" />
          {(
            [
              [-17, -45],
              [0, -50],
              [17, -45],
            ] as const
          ).map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="2.4" fill={preencher('gema')} />
          ))}
        </g>
      )}
      {tem(TIER_CINTILACOES) && (
        <g fill={preencher('estrela')}>
          {CINTILACOES.map((ponto) => (
            <path
              key={ponto.join()}
              d={cintilacao(ponto)}
              className={animada ? 'cintila-medalha' : undefined}
            />
          ))}
        </g>
      )}
      {tem(TIER_ORBITA) && (
        <g className={animada ? 'orbita-medalha' : undefined}>
          <ellipse
            rx="52"
            ry="15"
            fill="none"
            className={`contorno-${metal}`}
            strokeWidth="1"
            transform="rotate(-20)"
          />
          <circle cx="48.9" cy="-17.8" r="3" fill={preencher('gema')} />
        </g>
      )}
    </svg>
  );
}
