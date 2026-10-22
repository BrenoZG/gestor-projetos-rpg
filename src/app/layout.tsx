import type { Metadata, Viewport } from 'next';
import { DM_Sans, JetBrains_Mono, Syne } from 'next/font/google';

import './globals.css';

/**
 * Fontes herdadas do Portfolio, servidas do próprio domínio pelo `next/font`
 * (sem requisição a terceiros em produção). `swap` evita texto invisível
 * enquanto a fonte carrega.
 */
const fonteDisplay = Syne({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--fonte-display', display: 'swap' });
const fonteCorpo = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--fonte-corpo', display: 'swap' });
const fonteMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--fonte-mono', display: 'swap' });

/** Sistema privado: a URL de produção não deve ser indexada por buscadores. */
export const metadata: Metadata = {
  title: { default: 'Gestor de Projetos', template: '%s · Gestor de Projetos' },
  description: 'Gestão de projetos pessoais com progressão estilo RPG.',
  robots: { index: false, follow: false },
};

/** Zoom liberado de propósito: bloquear ampliação reprova acessibilidade (WCAG 1.4.4). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f0e0e',
};

/**
 * Layout raiz.
 *
 * @param props - Conteúdo da rota ativa.
 * @returns Documento HTML completo.
 */
export default function LayoutRaiz({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${fonteDisplay.variable} ${fonteCorpo.variable} ${fonteMono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {/* Link de salto: primeiro elemento focável, visível só ao receber foco. */}
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-acento-solido focus:px-5 focus:py-3 focus:text-acento-contraste"
        >
          Pular para o conteúdo
        </a>
        {/* tabIndex -1: torna o alvo do link de salto focável por script/âncora
            sem incluí-lo na ordem de Tab, para o foco acompanhar o salto. */}
        <main id="conteudo-principal" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </body>
    </html>
  );
}
