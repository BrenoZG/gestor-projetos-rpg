import { cookies } from 'next/headers';

import { lerPreferenciaEfeitos, NOME_COOKIE_EFEITOS, type PreferenciaEfeitos } from '@/lib/efeitos';

/**
 * Preferência de Efeitos visuais salva no cookie (uso no servidor).
 *
 * @returns A preferência, ou `null` no modo automático.
 */
export async function obterPreferenciaEfeitos(): Promise<PreferenciaEfeitos | null> {
  return lerPreferenciaEfeitos((await cookies()).get(NOME_COOKIE_EFEITOS)?.value);
}
