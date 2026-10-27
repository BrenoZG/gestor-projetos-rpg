'use client';

import { useId, useRef, useState } from 'react';

import type { StatusMissao } from '@/dominio/missoes/campos';

import { COLUNAS } from './colunas';

/**
 * Botão "Mover" do cartão: a alternativa ao arrasto para teclado, leitor de
 * tela e quem não consegue arrastar (WCAG 2.5.7). Abre a lista das outras
 * colunas; Esc fecha e devolve o foco ao botão.
 *
 * @param props - Nome da Missão (para o nome acessível), coluna atual, ação e id do botão.
 */
export function MenuMover({
  nome,
  statusAtual,
  aoMover,
  idBotao,
}: {
  nome: string;
  statusAtual: StatusMissao;
  aoMover: (status: StatusMissao) => void;
  idBotao: string;
}) {
  const [aberto, setAberto] = useState(false);
  const idMenu = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  return (
    <div
      ref={raiz}
      className="relative"
      onKeyDown={(evento) => {
        if (evento.key === 'Escape' && aberto) {
          evento.stopPropagation();
          setAberto(false);
          botao.current?.focus();
        }
      }}
      onBlur={(evento) => {
        // Fecha quando o foco sai do botão e da lista (Tab adiante ou clique fora).
        if (!raiz.current?.contains(evento.relatedTarget as Node | null)) setAberto(false);
      }}
    >
      <button
        ref={botao}
        id={idBotao}
        type="button"
        aria-label={`Mover ${nome}`}
        aria-expanded={aberto}
        aria-controls={idMenu}
        onClick={() => setAberto((anterior) => !anterior)}
        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-md border border-borda-campo px-3 font-mono text-xs text-texto-suave transition-colors duration-200 hover:border-texto-suave hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
      >
        Mover
        <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {aberto && (
        <ul
          id={idMenu}
          className="absolute right-0 z-20 mt-1 flex min-w-52 flex-col gap-1 rounded-md border border-borda-forte bg-superficie-alta p-1 shadow-lg"
        >
          {COLUNAS.filter((coluna) => coluna.id !== statusAtual).map((coluna) => (
            <li key={coluna.id}>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  aoMover(coluna.id);
                }}
                className="flex min-h-11 w-full cursor-pointer items-center rounded px-3 text-left text-sm text-texto hover:bg-acento-suave/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-acento"
              >
                Para {coluna.titulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
