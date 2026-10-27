/**
 * Rank de Missão (RN-14, docs/gamificacao.md §1). Funções puras: o Rank não é
 * guardado no banco, é derivado do estilo arquitetural, das capacidades e da
 * quantidade de stacks.
 */

import { ehCapacidade, ehEstiloArquitetural, type Capacidade, type EstiloArquitetural } from './campos';

export type RankMissao = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export const PONTOS_POR_ESTILO: Readonly<Record<EstiloArquitetural, number>> = {
  script: 0,
  monolito: 5,
  monolito_modular: 10,
  hexagonal: 12,
  serverless: 12,
  eventos: 16,
  microsservicos: 20,
};
export const PONTOS_POR_CAPACIDADE = 5;
const PONTOS_POR_STACK = 2;
/** Só as 10 primeiras stacks pontuam: sem teto, muitas tags virariam atalho de Rank. */
export const STACKS_QUE_PONTUAM = 10;

/** Pontos mínimos de cada Rank, do maior para o menor. */
const RANKS_POR_PONTOS: ReadonlyArray<readonly [number, RankMissao]> = [
  [70, 'S'],
  [60, 'A'],
  [45, 'B'],
  [30, 'C'],
  [15, 'D'],
  [0, 'E'],
];

export type EntradaPontuacao = {
  estilo: EstiloArquitetural;
  capacidades: readonly Capacidade[];
  quantidadeStacks: number;
};

/** Pontos de cada fator e o total: a tela mostra a conta, não só o resultado. */
export type PontuacaoMissao = { estilo: number; capacidades: number; stacks: number; total: number };

/**
 * Pontos da Missão: `estilo + 5 × capacidades distintas + 2 × min(stacks, 10)`, de 0 a 80.
 *
 * @param entrada - Estilo, capacidades marcadas e quantidade de stacks.
 * @returns Os pontos de cada fator e o total.
 * @throws {RangeError} Se o estilo ou uma capacidade for desconhecida, ou a quantidade de stacks inválida.
 */
export function pontuacaoDaMissao({
  estilo,
  capacidades,
  quantidadeStacks,
}: EntradaPontuacao): PontuacaoMissao {
  if (!ehEstiloArquitetural(estilo)) {
    throw new RangeError(`Estilo arquitetural desconhecido: ${estilo}`);
  }
  const desconhecida = capacidades.find((capacidade) => !ehCapacidade(capacidade));
  if (desconhecida !== undefined) {
    throw new RangeError(`Capacidade desconhecida: ${desconhecida}`);
  }
  if (!Number.isInteger(quantidadeStacks) || quantidadeStacks < 0) {
    throw new RangeError(`Quantidade de stacks inválida: ${quantidadeStacks}`);
  }

  const pontos = {
    estilo: PONTOS_POR_ESTILO[estilo],
    capacidades: new Set(capacidades).size * PONTOS_POR_CAPACIDADE,
    stacks: Math.min(quantidadeStacks, STACKS_QUE_PONTUAM) * PONTOS_POR_STACK,
  };
  return { ...pontos, total: pontos.estilo + pontos.capacidades + pontos.stacks };
}

/**
 * Rank de Missão pela faixa de pontos: E < 15 · D 15–29 · C 30–44 · B 45–59 · A 60–69 · S ≥ 70.
 *
 * @param pontos - Inteiro maior ou igual a zero.
 * @returns Letra do Rank.
 * @throws {RangeError} Se os pontos não forem um inteiro não negativo.
 */
export function rankPorPontos(pontos: number): RankMissao {
  if (!Number.isInteger(pontos) || pontos < 0) {
    throw new RangeError(`Pontos inválidos: ${pontos}`);
  }
  // A última faixa começa em 0 e os pontos nunca são negativos: o `find` sempre acha.
  return RANKS_POR_PONTOS.find(([minimo]) => pontos >= minimo)![1];
}

/**
 * Rank de Missão a partir dos fatores da RN-14.
 *
 * @param entrada - Estilo, capacidades marcadas e quantidade de stacks.
 * @returns Letra do Rank.
 * @throws {RangeError} Nas mesmas condições de {@link pontuacaoDaMissao}.
 */
export function rankDaMissao(entrada: EntradaPontuacao): RankMissao {
  return rankPorPontos(pontuacaoDaMissao(entrada).total);
}
