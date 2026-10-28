'use client';

import { useId, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';

const CLASSES_PERIGO =
  'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-negativo px-6 font-display font-bold text-texto transition-colors duration-200 enabled:hover:bg-negativo/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negativo disabled:cursor-wait disabled:opacity-70';

/** Gatilho discreto, para itens de lista (a Atualização no histórico). */
const CLASSES_PERIGO_COMPACTO =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md px-3 text-sm text-texto-suave underline-offset-4 transition-colors duration-200 hover:text-texto hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-negativo';

function BotaoConfirmar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={CLASSES_PERIGO}>
      {pending ? 'Excluindo…' : rotulo}
    </button>
  );
}

/**
 * Exclusão com confirmação, num `<dialog>` modal nativo: ele prende o foco e
 * fecha com Esc sem código extra. O foco inicial fica em "Cancelar", para um
 * Enter apressado não excluir nada. O diálogo fecha quando a ação termina
 * (quem exclui uma Missão sai da página; quem exclui uma Atualização fica).
 *
 * @param props - Pergunta e detalhe exibidos, rótulo do botão de confirmar, a
 *   Server Action já ligada ao id, nome acessível do gatilho e o tamanho dele.
 */
export function ConfirmarExclusao({
  pergunta,
  detalhe,
  rotuloConfirmar,
  acao,
  rotuloGatilho,
  compacto = false,
}: {
  pergunta: string;
  detalhe: string;
  rotuloConfirmar: string;
  acao: () => Promise<void>;
  rotuloGatilho?: string;
  compacto?: boolean;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const base = useId();

  return (
    <>
      <button
        type="button"
        aria-label={rotuloGatilho}
        onClick={() => dialogo.current?.showModal()}
        className={compacto ? CLASSES_PERIGO_COMPACTO : CLASSES_PERIGO}
      >
        Excluir
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby={`${base}-titulo`}
        aria-describedby={`${base}-texto`}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-md border border-negativo bg-superficie p-0 text-texto backdrop:bg-black/70"
      >
        <form
          action={async () => {
            await acao();
            dialogo.current?.close();
          }}
          className="flex flex-col gap-5 p-6 sm:p-8"
        >
          <span className="font-mono text-xs tracking-[0.2em] text-texto-suave">
            [ SISTEMA ] · CONFIRMAÇÃO
          </span>
          <h2 id={`${base}-titulo`} className="font-display text-xl font-extrabold break-words">
            {pergunta}
          </h2>
          <p id={`${base}-texto`} className="text-texto-suave">
            {detalhe}
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
            <BotaoConfirmar rotulo={rotuloConfirmar} />
          </div>
        </form>
      </dialog>
    </>
  );
}
