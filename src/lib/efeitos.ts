/**
 * Preferência de "Efeitos visuais" (design-system.md §4), como o menu de
 * gráficos de um jogo. Também é o controle de pausa que o WCAG 2.2.2 exige
 * para movimento automático com mais de 5 s.
 *
 * - completo: ambiente, transições e recompensas;
 * - reduzido: sem animação contínua de ambiente; transições e recompensas curtas;
 * - desligado: nenhuma animação.
 *
 * Sem preferência salva, vale o `prefers-reduced-motion` do sistema.
 */
export const PREFERENCIAS_EFEITOS = ['completo', 'reduzido', 'desligado'] as const;

export type PreferenciaEfeitos = (typeof PREFERENCIAS_EFEITOS)[number];

export const NOME_COOKIE_EFEITOS = 'efeitos';

/** Um ano: é uma preferência de interface, não um dado sensível. */
const VALIDADE_COOKIE_SEGUNDOS = 60 * 60 * 24 * 365;

/**
 * Valida o valor lido do cookie contra a lista fechada de opções.
 *
 * @param valor - Conteúdo do cookie, se houver.
 * @returns A preferência, ou `null` se ausente ou desconhecida.
 */
export function lerPreferenciaEfeitos(valor: string | undefined): PreferenciaEfeitos | null {
  return (PREFERENCIAS_EFEITOS as readonly string[]).includes(valor ?? '')
    ? (valor as PreferenciaEfeitos)
    : null;
}

/**
 * Monta o cookie da preferência. Lido pelo servidor no layout, para a página
 * já chegar com o modo certo, sem piscar animação antes de o JavaScript rodar.
 *
 * @param preferencia - Opção escolhida.
 * @param seguro - `true` em HTTPS, para marcar o cookie como `Secure`.
 * @returns Valor para `document.cookie`.
 */
export function montarCookieEfeitos(preferencia: PreferenciaEfeitos, seguro: boolean): string {
  const base = `${NOME_COOKIE_EFEITOS}=${preferencia}; Path=/; Max-Age=${VALIDADE_COOKIE_SEGUNDOS}; SameSite=Lax`;
  return seguro ? `${base}; Secure` : base;
}

/**
 * Apaga o cookie da preferência, voltando ao modo automático (segue o
 * `prefers-reduced-motion` do sistema).
 *
 * @returns Valor para `document.cookie`.
 */
export function montarCookieRemocaoEfeitos(): string {
  return `${NOME_COOKIE_EFEITOS}=; Path=/; Max-Age=0; SameSite=Lax`;
}
