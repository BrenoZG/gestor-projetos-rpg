import type { ReactNode } from 'react';

/**
 * Aviso de erro anunciado por leitores de tela (`role="alert"`).
 *
 * O vermelho (`negativo`) fica só no ícone e na borda: como texto pequeno ele
 * não alcança o contraste AA (4,05:1). O texto usa `texto` (16,56:1), e o erro
 * não depende só da cor para ser percebido (ícone + título).
 */
export function AvisoErro({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-md border border-negativo bg-superficie px-4 py-3 text-sm text-texto"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        className="mt-px shrink-0 text-negativo"
      >
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 5.5v5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="10" cy="14.25" r="1.1" fill="currentColor" />
      </svg>
      <p>
        <strong className="font-bold">{titulo} </strong>
        {children}
      </p>
    </div>
  );
}
