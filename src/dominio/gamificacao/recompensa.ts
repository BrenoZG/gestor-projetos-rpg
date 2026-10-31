/**
 * O que a tela informa depois de uma conclusão (RN-06): junta a avaliação do
 * domínio com o que o banco de fato gravou no ledger.
 */

import { HORAS_DA_TRAVA, type AvaliacaoConclusao, type Trilha } from './xp';

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
  if (!avaliacao.concede) {
    return avaliacao.motivo === 'trava'
      ? { tipo: 'trava', horasRestantes: avaliacao.horasRestantes }
      : { tipo: 'ja_recebido' };
  }
  // O banco ignora o evento repetido (on conflict): a corrida também cai aqui.
  if (xpGanho === null) return { tipo: 'ja_recebido' };
  return { tipo: 'xp', xp: xpGanho, trilha };
}

const ROTULOS_TRILHA: Readonly<Record<Trilha, string>> = {
  desenvolvedor: 'Desenvolvedor',
  produtividade: 'Produtividade',
};

/** Item concluído, para o texto concordar ("deste projeto", "desta atualização"). */
export type ItemConcluido = 'projeto' | 'atualizacao';

/**
 * Texto do aviso de recompensa, igual na tela e no anúncio do leitor de tela.
 *
 * @param recompensa - Resultado da conclusão.
 * @param item - O que foi concluído.
 * @returns Título curto e detalhe.
 */
export function textoDaRecompensa(
  recompensa: Recompensa,
  item: ItemConcluido,
): { titulo: string; detalhe: string } {
  switch (recompensa.tipo) {
    case 'xp':
      return { titulo: `+${recompensa.xp} XP`, detalhe: `Trilha ${ROTULOS_TRILHA[recompensa.trilha]}.` };
    case 'trava':
      return {
        titulo: 'Concluído, sem XP.',
        detalhe: `A recompensa exige ${HORAS_DA_TRAVA} h em Desenvolvimento e faltaram ${recompensa.horasRestantes} h. Para ganhar o XP, volte o projeto para Desenvolvimento e conclua depois de ${HORAS_DA_TRAVA} h.`,
      };
    case 'ja_recebido':
      return {
        titulo: 'Concluído.',
        detalhe: `O XP ${item === 'projeto' ? 'deste projeto' : 'desta atualização'} já foi recebido antes.`,
      };
  }
}
