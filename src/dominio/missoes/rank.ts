/**
 * Rank de Missão (docs/gamificacao.md §1). Funções puras: o Rank não é
 * guardado no banco, é derivado da dificuldade e da quantidade de stacks.
 */

import { LIMITES_MISSAO } from './campos';

export type RankMissao = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

const PONTOS_POR_DIFICULDADE = 10;
const PONTOS_POR_STACK = 2;
/** Só as 10 primeiras stacks pontuam: sem teto, muitas tags virariam atalho de Rank. */
const STACKS_QUE_PONTUAM = 10;
const { minimo: DIFICULDADE_MINIMA, maximo: DIFICULDADE_MAXIMA } = LIMITES_MISSAO.dificuldade;

/** Pontos mínimos de cada Rank, do maior para o menor. */
const RANKS_POR_PONTOS: ReadonlyArray<readonly [number, RankMissao]> = [
  [60, 'S'],
  [50, 'A'],
  [40, 'B'],
  [30, 'C'],
  [20, 'D'],
  [0, 'E'],
];

/**
 * Pontos da Missão: `dificuldade × 10 + min(stacks, 10) × 2`.
 *
 * @param dificuldade - Inteiro de 1 a 5.
 * @param quantidadeStacks - Inteiro maior ou igual a zero.
 * @returns Pontos que definem o Rank.
 * @throws {RangeError} Se a dificuldade ou a quantidade de stacks for inválida.
 */
export function pontosDaMissao(dificuldade: number, quantidadeStacks: number): number {
  if (
    !Number.isInteger(dificuldade) ||
    dificuldade < DIFICULDADE_MINIMA ||
    dificuldade > DIFICULDADE_MAXIMA
  ) {
    throw new RangeError(`Dificuldade fora de ${DIFICULDADE_MINIMA}..${DIFICULDADE_MAXIMA}: ${dificuldade}`);
  }
  if (!Number.isInteger(quantidadeStacks) || quantidadeStacks < 0) {
    throw new RangeError(`Quantidade de stacks inválida: ${quantidadeStacks}`);
  }
  return (
    dificuldade * PONTOS_POR_DIFICULDADE + Math.min(quantidadeStacks, STACKS_QUE_PONTUAM) * PONTOS_POR_STACK
  );
}

/**
 * Rank de Missão pela faixa de pontos: E < 20 · D 20–29 · C 30–39 · B 40–49 · A 50–59 · S ≥ 60.
 *
 * @param dificuldade - Inteiro de 1 a 5.
 * @param quantidadeStacks - Inteiro maior ou igual a zero.
 * @returns Letra do Rank.
 * @throws {RangeError} Nas mesmas condições de {@link pontosDaMissao}.
 */
export function rankDaMissao(dificuldade: number, quantidadeStacks: number): RankMissao {
  const pontos = pontosDaMissao(dificuldade, quantidadeStacks);
  // A última faixa começa em 0 e os pontos nunca são negativos: o `find` sempre acha.
  return RANKS_POR_PONTOS.find(([minimo]) => pontos >= minimo)![1];
}
