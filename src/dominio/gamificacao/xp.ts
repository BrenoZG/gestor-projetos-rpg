/**
 * XP por evento (docs/gamificacao.md §2 e §7, RN-06, RN-13 e RN-18).
 * Funções puras: quem chama lê o item do banco e grava o resultado no ledger.
 */

import type { TipoProjeto } from '@/dominio/missoes/campos';
import type { RankMissao } from '@/dominio/missoes/rank';

/** Trilha em que o evento nasce; trocar o tipo do Projeto depois não a muda (RN-16). */
export type Trilha = 'desenvolvedor' | 'produtividade';

export const XP_CRIACAO_PROJETO = 10;
export const XP_CRIACAO_ATUALIZACAO = 5;

/** Tempo mínimo em Desenvolvimento para a conclusão do Projeto render XP (RN-06d). */
export const HORAS_DA_TRAVA = 24;

const XP_CONCLUSAO_ATUALIZACAO: Readonly<Record<RankMissao, number>> = {
  E: 15,
  D: 20,
  C: 25,
  B: 30,
  A: 35,
  S: 40,
};
const XP_CONCLUSAO_ATUALIZACAO_GERAL = 20;

const BASE_CONCLUSAO_PROJETO: Readonly<Record<RankMissao, number>> = {
  E: 40,
  D: 60,
  C: 90,
  B: 130,
  A: 180,
  S: 250,
};
const BASE_CONCLUSAO_PROJETO_GERAL = 60;

/** Bônus de 3% por Atualização concluída, em pontos percentuais, até 20 Atualizações. */
const BONUS_PERCENTUAL_POR_ATUALIZACAO = 3;
const TETO_DE_ATUALIZACOES = 20;

const MS_POR_HORA = 60 * 60 * 1000;

/**
 * Trilha de um evento pelo tipo do Projeto no momento do evento.
 *
 * @param tipo - Tipo do Projeto.
 * @returns `desenvolvedor` para Desenvolvimento e `produtividade` para Geral.
 */
export function trilhaDoTipo(tipo: TipoProjeto): Trilha {
  return tipo === 'dev' ? 'desenvolvedor' : 'produtividade';
}

/**
 * XP de concluir uma Atualização, pelo Rank do Projeto no momento da conclusão.
 *
 * @param rank - Rank do Projeto; `null` em Projeto Geral, que não tem Rank.
 * @returns XP do evento.
 */
export function xpConclusaoAtualizacao(rank: RankMissao | null): number {
  return rank === null ? XP_CONCLUSAO_ATUALIZACAO_GERAL : XP_CONCLUSAO_ATUALIZACAO[rank];
}

/**
 * XP de concluir um Projeto: `base × (1 + 0,03 × min(Atualizações concluídas, 20))`.
 * A conta é feita em inteiros (centésimos) para o meio arredondar para cima
 * (RN-13): em ponto flutuante, 90 × 1,15 vira 103,4999… e cairia para 103.
 *
 * @param rank - Rank do Projeto; `null` em Projeto Geral (base 60, RN-18).
 * @param atualizacoesConcluidas - Atualizações do Projeto concluídas agora.
 * @returns XP do evento.
 * @throws {RangeError} Se a quantidade não for um inteiro maior ou igual a zero.
 */
export function xpConclusaoProjeto(rank: RankMissao | null, atualizacoesConcluidas: number): number {
  if (!Number.isInteger(atualizacoesConcluidas) || atualizacoesConcluidas < 0) {
    throw new RangeError(`Quantidade de Atualizações inválida: ${atualizacoesConcluidas}`);
  }
  const base = rank === null ? BASE_CONCLUSAO_PROJETO_GERAL : BASE_CONCLUSAO_PROJETO[rank];
  const percentual =
    100 + BONUS_PERCENTUAL_POR_ATUALIZACAO * Math.min(atualizacoesConcluidas, TETO_DE_ATUALIZACOES);
  return Math.floor((base * percentual + 50) / 100);
}

export type EntradaConclusaoProjeto = {
  rank: RankMissao | null;
  atualizacoesConcluidas: number;
  /** Ingresso mais recente em Desenvolvimento; `null` se nunca entrou. */
  inicioDesenvolvimentoEm: Date | null;
  agora: Date;
  /** O Projeto já tem evento de conclusão no ledger (RN-06a). */
  jaRecebido: boolean;
};

export type AvaliacaoConclusao =
  | { concede: true; xp: number }
  | { concede: false; motivo: 'trava'; horasRestantes: number }
  | { concede: false; motivo: 'ja_recebido' };

/**
 * Decide se a conclusão do Projeto rende XP (trava de 24 h, RN-06d) e quanto.
 * O XP já recebido vem antes da trava: reabrir zera o relógio, e a tela não
 * pode sugerir esperar 24 h por um XP que não volta (RN-06a).
 *
 * @param entrada - Rank, Atualizações concluídas, ingresso em Desenvolvimento, o instante atual e se já houve XP.
 * @returns O XP; ou o motivo de não haver XP, com as horas que faltaram (arredondadas para cima) na trava.
 * @throws {RangeError} Nas mesmas condições de {@link xpConclusaoProjeto}.
 */
export function avaliarConclusaoProjeto(entrada: EntradaConclusaoProjeto): AvaliacaoConclusao {
  const { rank, atualizacoesConcluidas, inicioDesenvolvimentoEm, agora, jaRecebido } = entrada;
  if (jaRecebido) return { concede: false, motivo: 'ja_recebido' };
  const trava = HORAS_DA_TRAVA * MS_POR_HORA;
  const decorrido =
    inicioDesenvolvimentoEm === null ? 0 : agora.getTime() - inicioDesenvolvimentoEm.getTime();
  if (decorrido < trava) {
    return { concede: false, motivo: 'trava', horasRestantes: Math.ceil((trava - decorrido) / MS_POR_HORA) };
  }
  return { concede: true, xp: xpConclusaoProjeto(rank, atualizacoesConcluidas) };
}
