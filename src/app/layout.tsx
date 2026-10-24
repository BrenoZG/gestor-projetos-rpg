import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { connection } from 'next/server';

import { obterPreferenciaEfeitos } from '@/lib/efeitos-servidor';

import './globals.css';

/**
 * Fontes herdadas do Portfolio, em arquivos variáveis (subset latin, que cobre
 * o português) instalados pelos pacotes `@fontsource-variable/*` (licença OFL).
 *
 * Por que local e não `next/font/google`: o loader do Google baixa as fontes a
 * cada build, e uma resposta instável do Google já derrubou o CI sem nenhuma
 * mudança de código. Com os arquivos no `node_modules`, o build não depende de
 * rede além do registro do npm, e a integridade vem do hash no lockfile.
 *
 * O `next/font` continua servindo as fontes do próprio domínio e gerando o
 * fallback ajustado (`size-adjust`), que evita deslocamento de layout na troca.
 * `swap` evita texto invisível enquanto a fonte carrega.
 */
const fonteDisplay = localFont({
  src: '../../node_modules/@fontsource-variable/syne/files/syne-latin-wght-normal.woff2',
  weight: '400 800',
  variable: '--fonte-display',
  display: 'swap',
});
const fonteCorpo = localFont({
  src: '../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2',
  weight: '100 1000',
  variable: '--fonte-corpo',
  display: 'swap',
});
const fonteMono = localFont({
  src: '../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
  weight: '100 800',
  variable: '--fonte-mono',
  display: 'swap',
});

/**
 * App inteiro renderizado por requisição (ADR-0007). A CSP usa um nonce novo a
 * cada requisição, e o Next só consegue aplicá-lo a scripts gerados no render;
 * HTML pré-gerado no build sairia sem nonce e seria bloqueado pelo navegador.
 * `false` no layout raiz desliga a exigência de "casca estática" do Cache
 * Components; num sistema privado, toda página depende do usuário logado.
 */
export const instant = false;

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
export default async function LayoutRaiz({ children }: LayoutProps<'/'>) {
  // Marca o render como dependente da requisição (ver `instant` acima).
  await connection();
  // Preferência de Efeitos visuais vinda do cookie: o CSS reage a `data-efeitos`.
  // Sem cookie, o atributo fica ausente e vale o prefers-reduced-motion do sistema.
  const efeitos = await obterPreferenciaEfeitos();

  return (
    <html
      lang="pt-BR"
      data-efeitos={efeitos ?? undefined}
      className={`${fonteDisplay.variable} ${fonteCorpo.variable} ${fonteMono.variable}`}
    >
      <body className="min-h-dvh font-sans antialiased">
        {/* Link de salto: primeiro elemento focável, visível só ao receber foco. */}
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-acento-solido focus:px-5 focus:py-3 focus:text-acento-contraste"
        >
          Pular para o conteúdo
        </a>
        {/* O <main id="conteudo-principal"> fica com cada layout ou página
            (ver componentes/conteudo-principal.tsx): o HUD do jogo é cabeçalho
            e precisa ficar fora dele, para o link de salto pular o HUD. */}
        {children}
      </body>
    </html>
  );
}
