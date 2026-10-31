import { useId } from 'react';

import type { RankAventureiro } from '@/dominio/progressao/progressao';

/** Material de cada Rank (design-system.md §5): a exceção metálica da paleta. */
const MATERIAL_POR_RANK: Readonly<Record<RankAventureiro, string>> = {
  E: 'ferro',
  D: 'bronze',
  C: 'prata',
  B: 'safira',
  A: 'rubi',
  S: 'lendaria',
};

/**
 * Emblema de Rank (do Aventureiro ou de Missão): escudo metálico com a letra e um
 * reflexo que atravessa de tempos em tempos (camada de ambiente).
 *
 * As cores vêm de classes `parada-<material>-<n>` (globals.css), porque
 * atributos SVG não aceitam `var(...)` e estilo inline seria bloqueado pela CSP.
 * Os ids internos do SVG são únicos por emblema (`useId`): vários emblemas do
 * mesmo Rank na mesma tela não podem repetir id.
 *
 * @param props - Rank, rótulo acessível e classes de tamanho.
 */
export function EmblemaRank({
  rank,
  rotulo = `Rank ${rank} do Caçador`,
  className = '',
}: {
  rank: RankAventureiro;
  rotulo?: string;
  className?: string;
}) {
  const material = MATERIAL_POR_RANK[rank];
  // O id do React traz caracteres que não servem dentro de `url(#...)`.
  const sufixo = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const idGradiente = `emblema-metal-${sufixo}`;
  const idRecorte = `emblema-recorte-${sufixo}`;
  const escudo = 'M32 2 60 12v24c0 17-12 29-28 34C16 65 4 53 4 36V12Z';

  return (
    <svg role="img" aria-label={rotulo} viewBox="0 0 64 72" className={className}>
      <defs>
        <linearGradient id={idGradiente} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" className={`parada-${material}-0`} />
          <stop offset="0.35" className={`parada-${material}-1`} />
          <stop offset="0.75" className={`parada-${material}-2`} />
          <stop offset="1" className={`parada-${material}-3`} />
        </linearGradient>
        <clipPath id={idRecorte}>
          <path d={escudo} />
        </clipPath>
      </defs>
      <path d={escudo} fill={`url(#${idGradiente})`} />
      <path
        d="M32 9 53 17v19c0 13-9 23-21 27-12-4-21-14-21-27V17Z"
        className={`contorno-${material}`}
        fill="none"
        strokeWidth="1.5"
      />
      <text
        x="32"
        y="45"
        textAnchor="middle"
        className={`texto-${material} font-display`}
        fontSize="28"
        fontWeight="800"
      >
        {rank}
      </text>
      <g clipPath={`url(#${idRecorte})`}>
        <rect x="-40" y="-10" width="18" height="100" className="brilho-emblema" transform="rotate(20)" />
      </g>
    </svg>
  );
}
