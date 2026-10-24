import type { ReactNode } from 'react';

/**
 * Região principal da página, alvo do link "Pular para o conteúdo" do layout raiz.
 * Cada tela usa exatamente um.
 *
 * `tabIndex={-1}` torna o alvo focável pela âncora sem incluí-lo na ordem de
 * Tab, para o foco acompanhar o salto.
 */
export function ConteudoPrincipal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main id="conteudo-principal" tabIndex={-1} className={`outline-none ${className}`}>
      {children}
    </main>
  );
}
