/**
 * O que a tela informa depois de uma conclusão (RN-06): junta a avaliação do
 * domínio com o que o banco de fato gravou no ledger.
 */

import type { AvaliacaoConclusao, Trilha } from './xp';

export type Recompensa =
  | { tipo: 'xp'; xp: number; trilha: Trilha }
  | { tipo: 'trava'; horasRestantes: number }
  | { tipo: 'ja_recebido' };

/**
 * Recompensa de uma conclusão já gravada.
 *
 * @param avaliacao - Resultado da trava de 24 h (Atualizações sempre concedem).
 * @param xpGanho - XP que o banco gravou; `null` se o evento já existia.
 * @param trilha - Trilha do item no momento da conclusão.
 * @returns XP ganho, trava não cumprida ou XP já recebido antes.
 */
export function recompensaDaConclusao(
  avaliacao: AvaliacaoConclusao,
  xpGanho: number | null,
  trilha: Trilha,
): Recompensa {
  if (!avaliacao.concede) return { tipo: 'trava', horasRestantes: avaliacao.horasRestantes };
  if (xpGanho === null) return { tipo: 'ja_recebido' };
  return { tipo: 'xp', xp: xpGanho, trilha };
}
