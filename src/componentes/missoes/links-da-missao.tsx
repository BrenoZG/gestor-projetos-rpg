import type { LinkReferencia } from '@/dominio/missoes/campos';
import { tipoDeLink, type TipoDeLink } from '@/dominio/missoes/links';

import { CLASSES_ROTULO } from './estilos';

const ROTULOS_DO_TIPO: Readonly<Record<TipoDeLink, string>> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  drive: 'Google Drive',
  pagina: 'Página',
};

/** Traço de cada ícone, num quadro de 16 × 16 (desenhado em código, ADR-0005). */
const ICONES: Readonly<Record<TipoDeLink, string>> = {
  youtube: 'M2.5 4.5h11v7h-11z M6.75 6.25v3.5L9.75 8z',
  instagram: 'M3 3h10v10H3z M8 5.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5 M11 4.75v.01',
  drive: 'M6 2.5h4l4 7-2 3.5H4L2 9.5z M6 2.5l4 7 M2 9.5h8',
  pagina: 'M3.5 2.5h6l3 3v8h-9z M9.5 2.5v3h3',
};

/** Texto do link: o título, ou o domínio quando não há título. */
function textoDoLink({ url, titulo }: LinkReferencia): string {
  return titulo ?? new URL(url).hostname.replace(/^www\./, '');
}

/**
 * Links de referência na ficha (RF-26). Abrem numa aba nova sem dar à página
 * aberta acesso a esta (`noopener`) nem o endereço de origem (`noreferrer`).
 * O servidor nunca busca o link: o ícone sai só do domínio.
 *
 * @param props - Links da Missão, na ordem gravada.
 * @returns A seção, ou nada quando não há links.
 */
export function LinksDaMissao({ links }: { links: readonly LinkReferencia[] }) {
  if (links.length === 0) return null;

  return (
    <section aria-labelledby="titulo-links" className="flex flex-col gap-2">
      <h3 id="titulo-links" className={CLASSES_ROTULO}>
        Links de referência
      </h3>
      <ul className="flex flex-col gap-2">
        {links.map((link, indice) => {
          const tipo = tipoDeLink(link.url);
          return (
            // O mesmo endereço pode aparecer duas vezes; a posição desempata.
            <li key={`${indice}-${link.url}`}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 max-w-full items-center gap-3 rounded-md border border-borda-forte px-3 py-2 text-sm text-texto transition-colors duration-200 hover:border-acento hover:text-acento-titulo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" className="shrink-0">
                  <path
                    d={ICONES[tipo]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="min-w-0 break-words">{textoDoLink(link)}</span>
                <span className="shrink-0 font-mono text-xs text-texto-suave">
                  {ROTULOS_DO_TIPO[tipo]}
                  <span className="sr-only"> (abre em nova aba)</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
