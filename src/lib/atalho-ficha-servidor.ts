import { cookies } from 'next/headers';

import { NOME_COOKIE_ATALHO, VALOR_ATALHO_DESLIGADO } from '@/lib/atalho-ficha';

/**
 * Preferência do atalho `C` salva no cookie (uso no servidor, RN-12).
 *
 * @returns `true` se o atalho está ligado (padrão, sem cookie).
 */
export async function obterAtalhoLigado(): Promise<boolean> {
  return (await cookies()).get(NOME_COOKIE_ATALHO)?.value !== VALOR_ATALHO_DESLIGADO;
}
