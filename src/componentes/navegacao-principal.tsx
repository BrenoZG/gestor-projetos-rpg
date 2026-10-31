'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DESTINOS = [
  { href: '/', rotulo: 'Quadro' },
  { href: '/atualizacoes', rotulo: 'Atualizações' },
  { href: '/tags', rotulo: 'Tags' },
  { href: '/personagem', rotulo: 'Personagem' },
] as const;

/**
 * Navegação principal do HUD. A página atual é marcada com `aria-current`,
 * que o leitor de tela anuncia, e com cor e sublinhado (não só cor).
 */
export function NavegacaoPrincipal() {
  const caminho = usePathname();

  return (
    <nav aria-label="Principal">
      <ul className="flex items-center gap-1">
        {DESTINOS.map(({ href, rotulo }) => {
          const atual = caminho === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={atual ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento ${
                  atual
                    ? 'text-texto underline decoration-acento decoration-2 underline-offset-8'
                    : 'text-texto-suave hover:text-texto'
                }`}
              >
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
