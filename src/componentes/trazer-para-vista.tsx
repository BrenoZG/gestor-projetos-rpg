'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Rola a página até o conteúdo quando ele nasce fora da tela.
 *
 * Feito para avisos que chegam com a página: no celular, a tela de login
 * ocupa a primeira dobra com o título, e um aviso de recusa abaixo dela
 * passaria despercebido. A rolagem é instantânea, sem animação, e só acontece
 * na montagem; depois disso, a rolagem é sempre de quem usa.
 */
export function TrazerParaVista({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const { top, bottom } = elemento.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) {
      elemento.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, []);

  return <div ref={ref}>{children}</div>;
}
