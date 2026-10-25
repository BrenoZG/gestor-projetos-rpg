/** UUID no formato do Postgres: 8-4-4-4-12 dígitos hexadecimais. */
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Confere se um id vindo da URL ou do cliente tem formato de UUID, antes de ir
 * ao banco: um texto qualquer viraria erro do Postgres (22P02) em vez de
 * "não encontrado".
 *
 * @param valor - Texto a conferir.
 * @returns `true` se for um UUID.
 */
export function ehUuid(valor: string): boolean {
  return FORMATO_UUID.test(valor);
}
