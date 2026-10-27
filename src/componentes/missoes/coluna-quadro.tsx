'use client';

import { useDroppable } from '@dnd-kit/react';

import { SigiloRunico } from '@/componentes/sigilo-runico';
import type { Missao } from '@/dados/missoes';
import type { StatusMissao } from '@/dominio/missoes/campos';

import { CartaoMissao } from './cartao-missao';
import { atraso, type ColunaQuadro } from './colunas';

/**
 * Coluna do Quadro: lista os cartões de um status e é a área onde se solta um
 * cartão arrastado (o id da área é o próprio status).
 *
 * @param props - Coluna, Missões já filtradas, se há filtro ativo, posição e ação de mover.
 */
export function ColunaMissoes({
  coluna,
  missoes,
  filtrada,
  indice,
  aoMover,
}: {
  coluna: ColunaQuadro;
  missoes: readonly Missao[];
  filtrada: boolean;
  indice: number;
  aoMover: (id: string, status: StatusMissao) => void;
}) {
  const { ref, isDropTarget } = useDroppable({ id: coluna.id });

  return (
    <section
      ref={ref}
      aria-labelledby={`coluna-${coluna.id}`}
      data-alvo-arrasto={isDropTarget || undefined}
      className={`aura-sistema entrada-janela ${atraso(indice)} flex min-h-80 rounded-md transition-shadow duration-200 ${
        isDropTarget ? 'ring-2 ring-acento ring-offset-2 ring-offset-fundo' : ''
      }`}
    >
      <div className="janela-sistema flex w-full">
        <div className="janela-sistema-conteudo flex w-full flex-col gap-4 p-5">
          <header className="flex items-center justify-between gap-3 border-b border-borda pb-3">
            <h2 id={`coluna-${coluna.id}`} className="flex items-center gap-2 font-display text-lg font-bold">
              <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-acento" />
              {coluna.titulo}
            </h2>
            <span className="rounded-full border border-borda-forte px-2.5 py-0.5 font-mono text-xs text-texto-suave">
              {missoes.length}
              <span className="sr-only"> {missoes.length === 1 ? 'missão' : 'missões'}</span>
            </span>
          </header>

          {missoes.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {missoes.map((missao, posicao) => (
                <CartaoMissao
                  key={missao.id}
                  missao={missao}
                  aoMover={(status) => aoMover(missao.id, status)}
                  className={`entrada-suave ${atraso(posicao)}`}
                />
              ))}
            </ul>
          ) : filtrada ? (
            <p className="rounded-md border border-dashed border-borda-campo px-6 py-10 text-center text-sm text-texto-suave">
              Nada nesta coluna com os filtros atuais.
            </p>
          ) : (
            <div className="slot-vazio flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-dashed border-borda-campo px-6 py-10 text-center">
              <SigiloRunico className="h-20 w-20 opacity-60 lg:h-32 lg:w-32" />
              <p className="font-medium text-texto">{coluna.vazio}</p>
              <p className="text-sm text-texto-suave">{coluna.detalhe}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
