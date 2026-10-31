'use client';

import { useState } from 'react';

import { montarCookieAtalho } from '@/lib/atalho-ficha';

/**
 * Liga e desliga o atalho `C` da Ficha (RN-12, WCAG 2.1.4). Vale na hora: o
 * atalho lê o cookie a cada tecla.
 *
 * @param props - `inicial`: preferência lida do cookie no servidor.
 */
export function PreferenciaAtalho({ inicial }: { inicial: boolean }) {
  const [ligado, setLigado] = useState(inicial);

  return (
    <section
      aria-labelledby="titulo-preferencias"
      className="flex flex-col gap-3 rounded-md border border-borda-forte bg-superficie px-4 py-4"
    >
      <h2 id="titulo-preferencias" className="font-mono text-xs tracking-[0.2em] text-texto-suave">
        PREFERÊNCIAS
      </h2>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={ligado}
          aria-describedby="ajuda-atalho"
          onChange={(evento) => {
            setLigado(evento.target.checked);
            document.cookie = montarCookieAtalho(
              evento.target.checked,
              window.location.protocol === 'https:',
            );
          }}
          className="h-5 w-5 accent-acento"
        />
        <span>
          Atalho <kbd className="rounded border border-borda-campo px-1.5 font-mono text-xs">C</kbd> abre a
          Ficha
        </span>
      </label>
      <p id="ajuda-atalho" className="text-xs text-texto-suave">
        Em qualquer tela do jogo, fora de campos de texto; Esc volta. Desligue se o atalho atrapalhar um
        leitor de tela ou comando de voz.
      </p>
    </section>
  );
}
