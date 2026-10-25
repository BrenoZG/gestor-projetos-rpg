'use client';

import { useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';

const CLASSES_PERIGO =
  'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-negativo px-6 font-display font-bold text-texto transition-colors duration-200 enabled:hover:bg-negativo/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negativo disabled:cursor-wait disabled:opacity-70';

function BotaoExcluir() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={CLASSES_PERIGO}>
      {pending ? 'Excluindo…' : 'Excluir missão'}
    </button>
  );
}

/**
 * Exclusão com confirmação (RN-04), num `<dialog>` modal nativo: ele prende o
 * foco e fecha com Esc sem código extra. O foco inicial fica em "Cancelar",
 * para um Enter apressado não excluir nada.
 *
 * @param props - Nome da Missão (exibido na pergunta) e a Server Action já ligada ao id.
 */
export function ConfirmarExclusao({ nome, acao }: { nome: string; acao: () => Promise<void> }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const base = useId();

  return (
    <>
      <button type="button" onClick={() => dialogo.current?.showModal()} className={CLASSES_PERIGO}>
        Excluir
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={`${base}-titulo`}
        aria-describedby={`${base}-texto`}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-md border border-negativo bg-superficie p-0 text-texto backdrop:bg-black/70"
      >
        <form action={acao} className="flex flex-col gap-5 p-6 sm:p-8">
          <span className="font-mono text-xs tracking-[0.2em] text-texto-suave">
            [ SISTEMA ] · CONFIRMAÇÃO
          </span>
          <h2 id={`${base}-titulo`} className="font-display text-xl font-extrabold">
            Excluir a missão “{nome}”?
          </h2>
          <p id={`${base}-texto`} className="text-texto-suave">
            A missão e o vínculo com as stacks serão apagados. Esta ação não pode ser desfeita.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => dialogo.current?.close()}
              className={CLASSES_ACAO_SECUNDARIA}
            >
              Cancelar
            </button>
            <BotaoExcluir />
          </div>
        </form>
      </dialog>
    </>
  );
}
