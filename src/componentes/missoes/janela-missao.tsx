import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Moldura das telas de uma Missão (cadastro, detalhe, edição): link de volta,
 * rótulo do Sistema, título e uma Janela do Sistema com o conteúdo.
 *
 * @param props - Rótulo do topo, título (h1), destino do link de volta e conteúdo.
 */
export function JanelaMissao({
  rotulo,
  titulo,
  voltarPara,
  textoVoltar,
  children,
}: {
  rotulo: string;
  titulo: ReactNode;
  voltarPara: string;
  textoVoltar: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href={voltarPara}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md font-mono text-sm text-texto-suave transition-colors duration-200 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
      >
        <span aria-hidden="true">←</span> {textoVoltar}
      </Link>
      <header className="entrada-suave flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.2em] text-acento sm:text-sm">{rotulo}</span>
        <h1 className="titulo-jogo font-display text-[clamp(1.75rem,5vw,3rem)] leading-tight font-extrabold break-words">
          {titulo}
        </h1>
      </header>
      <div className="aura-sistema entrada-janela w-full [animation-delay:120ms]">
        <div className="janela-sistema">
          <div className="janela-sistema-conteudo p-5 sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
