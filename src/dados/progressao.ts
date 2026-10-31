import type { Trilha } from '@/dominio/gamificacao/xp';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

import { ErroDeMissao } from './missoes';

/**
 * Leitura do ledger de XP (`eventos_xp`) com a sessão do usuário: o RLS só
 * deixa somar os eventos do próprio dono.
 */

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

export type XpPorTrilha = Record<Trilha, number>;

type LinhaResumo = { trilha: string; xp_total: number };

/**
 * XP total de cada trilha (RF-12, RN-18), pela função `resumo_xp`, que soma no
 * banco. Trilha sem evento fica com zero.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function obterXpPorTrilha(supabase: ClienteSupabase): Promise<XpPorTrilha> {
  const { data, error } = await supabase.rpc('resumo_xp');
  if (error) throw new ErroDeMissao('resumo_xp', error.code);
  const xp: XpPorTrilha = { desenvolvedor: 0, produtividade: 0 };
  for (const { trilha, xp_total } of data as LinhaResumo[]) {
    if (trilha === 'desenvolvedor' || trilha === 'produtividade') xp[trilha] = xp_total;
  }
  return xp;
}
