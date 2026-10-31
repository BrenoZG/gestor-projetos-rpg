import { useId, type ReactNode } from 'react';

import type { ChaveClasse } from '@/dominio/personagem/classes';

/** Material de cada brasão (design-system.md §2, a exceção metálica da paleta). */
const MATERIAL_POR_CLASSE: Readonly<Record<ChaveClasse, string>> = {
  arquimago_dados: 'safira',
  guerreiro_backend: 'bronze',
  arqueiro_frontend: 'esmeralda',
  lamina_arcana_fullstack: 'rubi',
  paladino_devops: 'ouro',
  sombra_seguranca: 'ferro',
  invocador_ia: 'mitica',
  bardo_experiencia: 'platina',
};

/**
 * Glifo de cada Classe, em coordenadas do brasão (64 × 72, centro em 32, 36).
 * Preenchimento e traço vêm da classe `texto-<material>` do grupo (`currentColor`).
 */
const GLIFO_POR_CLASSE: Readonly<Record<ChaveClasse, ReactNode>> = {
  // Barras de um gráfico.
  arquimago_dados: (
    <>
      <rect x="19" y="38" width="6" height="12" rx="1" />
      <rect x="29" y="30" width="6" height="20" rx="1" />
      <rect x="39" y="22" width="6" height="28" rx="1" />
      <rect x="17" y="51" width="30" height="2" />
    </>
  ),
  // Espada.
  guerreiro_backend: (
    <>
      <path d="M32 15 35.5 20V43h-7V20Z" />
      <rect x="23" y="43" width="18" height="3.5" rx="1" />
      <rect x="30.5" y="46.5" width="3" height="7" />
      <circle cx="32" cy="56" r="2.5" />
    </>
  ),
  // Arco e flecha.
  arqueiro_frontend: (
    <>
      <path d="M24 18Q46 36 24 54" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 18V54" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M18 36H43" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M43 31.5 50 36 43 40.5Z" />
    </>
  ),
  // Camadas empilhadas.
  lamina_arcana_fullstack: (
    <>
      <path d="M32 18 47 25 32 32 17 25Z" />
      <path
        d="M17 32 32 39 47 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 39 32 46 47 39"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </>
  ),
  // Infinito do ciclo de entrega.
  paladino_devops: (
    <path
      d="M32 36C26 26 14 26 14 36s12 10 18 0 18-10 18 0-12 10-18 0Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
    />
  ),
  // Buraco de fechadura.
  sombra_seguranca: (
    <>
      <circle cx="32" cy="30" r="7" />
      <path d="M28.5 33h7l2.5 17h-12Z" />
    </>
  ),
  // Rede de neurônios.
  invocador_ia: (
    <>
      <g fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M32 36 19 23M32 36 45 23M32 36 19 49M32 36 45 49M32 36V16" />
      </g>
      <circle cx="32" cy="36" r="5" />
      <circle cx="19" cy="23" r="3" />
      <circle cx="45" cy="23" r="3" />
      <circle cx="19" cy="49" r="3" />
      <circle cx="45" cy="49" r="3" />
      <circle cx="32" cy="16" r="3" />
    </>
  ),
  // Pena de desenho (caneta de vetor).
  bardo_experiencia: (
    <>
      <path d="M32 16 44 34Q41 46 32 55 23 46 20 34Z" />
      <path d="M32 37V55" fill="none" className="contorno-platina" strokeWidth="1.5" />
      <circle cx="32" cy="34" r="2.6" fill="none" className="contorno-platina" strokeWidth="1.5" />
    </>
  ),
};

/**
 * Brasão de uma Classe (RF-17, RF-18): escudo metálico com o glifo da área.
 * Decorativo por padrão (`aria-hidden`), porque o nome da Classe sempre
 * aparece em texto ao lado; com `rotulo`, vira imagem com nome acessível.
 *
 * @param props - Classe, rótulo opcional e classes de tamanho.
 */
export function BrasaoClasse({
  classe,
  rotulo,
  className = '',
}: {
  classe: ChaveClasse;
  rotulo?: string;
  className?: string;
}) {
  const material = MATERIAL_POR_CLASSE[classe];
  const sufixo = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const idGradiente = `brasao-metal-${sufixo}`;
  const contorno = 'M32 2 60 13 56 46 32 70 8 46 4 13Z';
  const acessibilidade = rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true };

  return (
    <svg viewBox="0 0 64 72" className={className} {...acessibilidade}>
      <defs>
        <linearGradient id={idGradiente} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" className={`parada-${material}-0`} />
          <stop offset="0.35" className={`parada-${material}-1`} />
          <stop offset="0.75" className={`parada-${material}-2`} />
          <stop offset="1" className={`parada-${material}-3`} />
        </linearGradient>
      </defs>
      <path d={contorno} fill={`url(#${idGradiente})`} />
      <path
        d="M32 8 54 17 51 44 32 63 13 44 10 17Z"
        className={`contorno-${material}`}
        fill="none"
        strokeWidth="1.5"
      />
      <g className={`texto-${material}`}>{GLIFO_POR_CLASSE[classe]}</g>
    </svg>
  );
}
