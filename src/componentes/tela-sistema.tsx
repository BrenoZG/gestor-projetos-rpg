import type { ReactNode } from 'react';

import { ConteudoPrincipal } from './conteudo-principal';
import { Particulas } from './particulas';
import { SigiloRunico } from './sigilo-runico';

/**
 * Tela cheia de aviso do Sistema (erro, página não encontrada): fundo vivo,
 * sigilo e uma Janela do Sistema com a mensagem e as ações.
 *
 * @param props - Rótulo do topo, título, texto e ações (links ou botões).
 */
export function TelaSistema({
  rotulo,
  titulo,
  children,
  acoes,
}: {
  rotulo: string;
  titulo: string;
  children: ReactNode;
  acoes: ReactNode;
}) {
  return (
    <div className="portal-sistema relative min-h-dvh">
      <Particulas />
      <ConteudoPrincipal className="relative flex min-h-dvh items-center justify-center px-4 py-12 sm:px-8">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          <SigiloRunico className="entrada-suave h-32 w-32 sm:h-44 sm:w-44" />
          <div className="aura-sistema entrada-janela w-full [animation-delay:150ms]">
            <div className="janela-sistema">
              <div className="janela-sistema-conteudo flex flex-col gap-5 p-6 sm:p-10">
                <span className="font-mono text-xs tracking-[0.2em] text-acento">{rotulo}</span>
                <h1 className="titulo-jogo font-display text-[clamp(1.75rem,6vw,3rem)] leading-tight font-extrabold">
                  {titulo}
                </h1>
                <div className="text-base leading-relaxed text-texto-suave sm:text-lg">{children}</div>
                <div className="flex flex-wrap gap-3 pt-2">{acoes}</div>
              </div>
            </div>
          </div>
        </div>
      </ConteudoPrincipal>
    </div>
  );
}

/** Classes do botão principal das telas de aviso, para links e botões. */
export const CLASSES_ACAO_PRINCIPAL =
  'botao-sistema inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md bg-acento-solido px-6 font-display font-bold text-acento-contraste enabled:hover:bg-acento-forte focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acento';

/** Classes da ação secundária. */
export const CLASSES_ACAO_SECUNDARIA =
  'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-borda-campo px-6 text-texto-suave transition-colors duration-200 hover:border-texto-suave hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento';
