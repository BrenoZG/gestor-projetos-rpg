'use client';

import { useDraggable } from '@dnd-kit/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { EmblemaRank } from '@/componentes/emblema-rank';
import type { Missao } from '@/dados/missoes';
import { ROTULOS_ESTILO, ROTULOS_TIPO, type StatusMissao } from '@/dominio/missoes/campos';

import { CLASSES_CHIP } from './estilos';
import { MenuMover } from './menu-mover';
import { SeloGeral } from './selo-tipo';

/** Quantas stacks cabem no cartão; o resto vira "+N". */
const STACKS_VISIVEIS = 3;

/** Id do botão Mover de uma Missão: o Quadro devolve o foco a ele depois de mover. */
export const idBotaoMover = (idMissao: string) => `mover-${idMissao}`;

/**
 * Cartão de uma Missão no Quadro.
 *
 * - O corpo do cartão se arrasta (mouse: depois de 5 px; dedo: toque longo).
 *   A biblioteca não arrasta a partir de um link, e no celular o toque longo
 *   num link abre o menu do sistema: por isso o link é só o título.
 * - Clicar no corpo abre o detalhe, como antes; teclado e leitor de tela usam
 *   o link do título, que é o caminho semântico.
 * - O botão Mover é a alternativa sem arrasto (WCAG 2.5.7).
 *
 * @param props - Missão, ação de mover e classes extras (atraso de entrada).
 */
export function CartaoMissao({
  missao,
  aoMover,
  className = '',
}: {
  missao: Missao;
  aoMover: (status: StatusMissao) => void;
  className?: string;
}) {
  const { ref, isDragging, isDropping } = useDraggable({ id: missao.id });
  const router = useRouter();
  const href = `/missoes/${missao.id}`;
  const visiveis = missao.stacks.slice(0, STACKS_VISIVEIS);
  const restantes = missao.stacks.length - visiveis.length;

  return (
    <li ref={ref} className={`relative ${isDragging ? 'opacity-70' : ''} ${className}`}>
      <div
        onClick={(evento) => {
          // Link e botão cuidam do próprio clique; soltar um arrasto não abre o detalhe.
          if ((evento.target as Element).closest('a, button') || isDragging || isDropping) return;
          router.push(href);
        }}
        className="group flex cursor-pointer touch-manipulation gap-4 rounded-md border border-borda-forte bg-superficie/80 p-4 pr-24 transition-[border-color,transform,background-color] duration-200 select-none hover:-translate-y-0.5 hover:border-acento hover:bg-superficie-alta has-focus-visible:border-acento"
      >
        {missao.tipo === 'dev' ? (
          <EmblemaRank
            rank={missao.rank}
            rotulo={`Rank de Missão ${missao.rank}`}
            className="h-12 w-11 shrink-0"
          />
        ) : (
          <SeloGeral className="h-12 w-11 shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 className="font-display text-base leading-snug font-bold break-words">
            <Link
              href={href}
              draggable={false}
              className="rounded-sm group-hover:text-acento-titulo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            >
              {missao.nome}
            </Link>
          </h3>
          <p className="font-mono text-xs text-texto-suave">
            {missao.tipo === 'dev'
              ? `${ROTULOS_ESTILO[missao.estilo]} · ${missao.pontuacao.total} pontos`
              : ROTULOS_TIPO.geral}
          </p>
          <ul
            className="flex flex-wrap gap-1.5"
            aria-label={missao.tipo === 'dev' ? 'Stacks' : 'Ferramentas'}
          >
            {visiveis.map((stack) => (
              <li key={stack} className={CLASSES_CHIP}>
                {stack}
              </li>
            ))}
            {restantes > 0 && (
              <li className={CLASSES_CHIP}>
                +{restantes}
                <span className="sr-only">{missao.tipo === 'dev' ? ' stacks' : ' ferramentas'}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="absolute top-3 right-3">
        <MenuMover
          nome={missao.nome}
          statusAtual={missao.status}
          aoMover={aoMover}
          idBotao={idBotaoMover(missao.id)}
        />
      </div>
    </li>
  );
}
