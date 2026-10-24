/**
 * Validade máxima de uma sessão, contada a partir do login. O Supabase só
 * oferece esse limite no plano Pro; aqui ele é imposto pelo proxy.
 */
export const VALIDADE_MAXIMA_SESSAO_SEGUNDOS = 12 * 60 * 60;

/** Claims do JWT de que a regra precisa; o tipo é aberto porque vem de fora. */
type ClaimsSessao = { amr?: unknown };

/**
 * Instante do login original: o menor `timestamp` em `amr` (Authentication
 * Methods References). Diferente do `iat`, que muda a cada renovação do token.
 */
function instanteDoLogin(claims: ClaimsSessao): number | null {
  if (!Array.isArray(claims.amr)) return null;
  const instantes = claims.amr
    .map((metodo: unknown) => (metodo as { timestamp?: unknown } | null)?.timestamp)
    .filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
  return instantes.length ? Math.min(...instantes) : null;
}

/**
 * Diz se a sessão passou da validade máxima e deve ser encerrada.
 *
 * Falha fechada: sem o instante do login no token, considera expirada.
 *
 * @param claims - Claims do JWT já validado (`getClaims()`).
 * @param agoraSegundos - Instante atual, em segundos desde a época Unix.
 * @param validadeSegundos - Validade máxima; padrão de 12 horas.
 * @returns `true` se a sessão deve ser encerrada.
 */
export function sessaoExpirada(
  claims: ClaimsSessao,
  agoraSegundos: number,
  validadeSegundos: number = VALIDADE_MAXIMA_SESSAO_SEGUNDOS,
): boolean {
  const login = instanteDoLogin(claims);
  return login === null || agoraSegundos - login >= validadeSegundos;
}
