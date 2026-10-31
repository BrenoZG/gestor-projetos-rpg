'use client';

import { useEffect, useId, useRef } from 'react';

import { CLASSES_ACAO_PRINCIPAL, CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import { textoDaRecompensa } from '@/dominio/gamificacao/recompensa';

import type { JanelaConclusao } from './provedor-sistema';

/** Rótulo do topo e cor da borda de cada resultado (a cor nunca é o único sinal: o rótulo diz). */
const APARENCIA = {
  xp: { rotulo: '[ SISTEMA ] · PROJETO CONCLUÍDO', borda: 'border-acento', cor: 'text-acento' },
  trava: { rotulo: '[ SISTEMA ] · RECOMPENSA BLOQUEADA', borda: 'border-atencao', cor: 'text-atencao' },
  ja_recebido: {
    rotulo: '[ SISTEMA ] · PROJETO CONCLUÍDO',
    borda: 'border-borda-campo',
    cor: 'text-texto-suave',
  },
} as const;

/**
 * Janela do Sistema da conclusão de um Projeto (design-system §5): XP ganho,
 * recompensa bloqueada pela trava de 24 h ou XP já recebido (RN-06). É um
 * `<dialog>` modal nativo: prende o foco, fecha com Esc e devolve o foco a
 * quem a abriu. O texto é o mesmo do aviso do M3 (`textoDaRecompensa`).
 *
 * @param props - Conclusão a mostrar (`null` = fechada) e o aviso de fechamento.
 */
export function JanelaSistema({
  janela,
  aoFechar,
}: {
  janela: JanelaConclusao | null;
  aoFechar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const base = useId();

  useEffect(() => {
    const elemento = dialogo.current;
    if (janela && elemento && !elemento.open) elemento.showModal();
  }, [janela]);

  const conteudo = janela && {
    ...APARENCIA[janela.recompensa.tipo],
    ...textoDaRecompensa(janela.recompensa, 'projeto'),
    ganhou: janela.recompensa.tipo === 'xp',
  };

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${base}-titulo`}
      aria-describedby={`${base}-texto`}
      onClose={aoFechar}
      className={`janela-sistema-conteudo m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md border bg-superficie p-0 text-texto shadow-2xl shadow-fundo backdrop:bg-black/70 ${conteudo?.borda ?? 'border-borda-forte'}`}
    >
      {conteudo && janela && (
        <div className="entrada-janela flex flex-col gap-4 p-6 sm:p-8">
          <span className={`font-mono text-xs tracking-[0.2em] ${conteudo.cor}`}>{conteudo.rotulo}</span>
          <h2 id={`${base}-titulo`} className="font-display text-xl font-extrabold break-words">
            {janela.nome}
          </h2>
          <div id={`${base}-texto`} className="flex flex-col gap-1">
            {conteudo.ganhou ? (
              <p className="font-display text-4xl font-extrabold text-positivo">{conteudo.titulo}</p>
            ) : (
              <p className="font-bold">{conteudo.titulo}</p>
            )}
            <p className="text-sm text-texto-suave">{conteudo.detalhe}</p>
          </div>
          <form method="dialog" className="flex justify-end pt-2">
            {/* autoFocus: o showModal leva o foco ao botão, e Enter fecha. */}
            <button
              type="submit"
              autoFocus
              className={conteudo.ganhou ? CLASSES_ACAO_PRINCIPAL : CLASSES_ACAO_SECUNDARIA}
            >
              {janela.recompensa.tipo === 'trava' ? 'Entendi' : 'Continuar'}
            </button>
          </form>
        </div>
      )}
    </dialog>
  );
}
