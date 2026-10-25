import Link from 'next/link';

import { EmblemaRank } from '@/componentes/emblema-rank';
import type { Missao } from '@/dados/missoes';
import { ROTULOS_DIFICULDADE, type Dificuldade } from '@/dominio/missoes/campos';

import { CLASSES_CHIP } from './estilos';

/** Quantas stacks cabem no cartão; o resto vira "+N". */
const STACKS_VISIVEIS = 3;

/**
 * Cartão de uma Missão no Quadro: o cartão inteiro é o link para o detalhe.
 *
 * @param props - Missão e classes extras (atraso de entrada).
 */
export function CartaoMissao({ missao, className = '' }: { missao: Missao; className?: string }) {
  const visiveis = missao.stacks.slice(0, STACKS_VISIVEIS);
  const restantes = missao.stacks.length - visiveis.length;

  return (
    <li className={className}>
      <Link
        href={`/missoes/${missao.id}`}
        className="group flex gap-4 rounded-md border border-borda-forte bg-superficie/80 p-4 transition-[border-color,transform,background-color] duration-200 hover:-translate-y-0.5 hover:border-acento hover:bg-superficie-alta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
      >
        <EmblemaRank
          rank={missao.rank}
          rotulo={`Rank de Missão ${missao.rank}`}
          className="h-12 w-11 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="font-display text-base leading-snug font-bold break-words group-hover:text-acento-titulo">
            {missao.nome}
          </h3>
          <p className="font-mono text-xs text-texto-suave">
            Dificuldade {missao.dificuldade} · {ROTULOS_DIFICULDADE[missao.dificuldade as Dificuldade]}
          </p>
          <ul className="flex flex-wrap gap-1.5" aria-label="Stacks">
            {visiveis.map((stack) => (
              <li key={stack} className={CLASSES_CHIP}>
                {stack}
              </li>
            ))}
            {restantes > 0 && (
              <li className={CLASSES_CHIP}>
                +{restantes}
                <span className="sr-only"> stacks</span>
              </li>
            )}
          </ul>
        </div>
      </Link>
    </li>
  );
}
