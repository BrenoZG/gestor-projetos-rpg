/**
 * Classes compartilhadas pelos formulários e cartões de Missão.
 * Borda `borda-campo` (3:1, WCAG 1.4.11), foco visível no acento e alvo de
 * toque com pelo menos 48 px de altura.
 */

export const CLASSES_ROTULO = 'font-mono text-xs tracking-[0.14em] text-texto-suave uppercase';

export const CLASSES_CAMPO =
  'w-full min-h-12 rounded-md border border-borda-campo bg-fundo/70 px-4 py-3 text-base text-texto placeholder:text-texto-tenue transition-colors duration-200 hover:border-texto-suave focus-visible:border-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento aria-[invalid=true]:border-negativo';

export const CLASSES_AJUDA = 'text-sm text-texto-suave';

/** Mensagem de erro do campo: o vermelho fica no ícone (contraste AA do texto). */
export const CLASSES_ERRO_CAMPO = 'flex items-start gap-2 text-sm text-texto';

export const CLASSES_CHIP =
  'inline-flex items-center gap-1 rounded-full border border-borda-forte bg-superficie-alta px-3 py-1 font-mono text-xs text-texto-suave';
