/**
 * Regras de progressão do personagem (docs/gamificacao.md §3 e §4).
 * Funções puras: recebem o XP total (soma do ledger) e derivam nível, Rank e título.
 */

export const NIVEL_MAXIMO = 100;

/** Multiplicador e expoente da curva: limiar(n) = arredondar(20 × (n − 1)^1,5). */
const BASE_CURVA = 20;
const EXPOENTE_CURVA = 1.5;

export type RankAventureiro = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

/** Nível mínimo de cada Rank, do maior para o menor. */
const RANKS_POR_NIVEL: ReadonlyArray<readonly [number, RankAventureiro]> = [
  [90, 'S'],
  [70, 'A'],
  [50, 'B'],
  [30, 'C'],
  [20, 'D'],
  [1, 'E'],
];

/** Título de cada faixa de 10 níveis; índice = Math.floor(nivel / 10). */
const TITULOS_POR_DEZENA = [
  'Estagiário',
  'Desenvolvedor Iniciante',
  'Desenvolvedor Aprendiz',
  'Desenvolvedor Júnior',
  'Desenvolvedor Júnior Avançado',
  'Desenvolvedor Pleno',
  'Desenvolvedor Pleno Avançado',
  'Especialista',
  'Arquiteto',
  'Mestre',
  'Desenvolvedor Sênior',
] as const;

function exigirNivelValido(nivel: number): void {
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > NIVEL_MAXIMO) {
    throw new RangeError(`Nível fora de 1..${NIVEL_MAXIMO}: ${nivel}`);
  }
}

/**
 * XP total necessário para alcançar um nível.
 *
 * @param nivel - Inteiro de 1 a 100.
 * @returns XP total mínimo do nível.
 * @throws {RangeError} Se o nível não for inteiro entre 1 e 100.
 */
export function limiarNivel(nivel: number): number {
  exigirNivelValido(nivel);
  return Math.round(BASE_CURVA * (nivel - 1) ** EXPOENTE_CURVA);
}

/**
 * Nível correspondente a um XP total: o maior nível cujo limiar já foi atingido.
 *
 * @param xpTotal - Soma do XP do ledger; inteiro maior ou igual a zero.
 * @returns Nível de 1 a 100.
 * @throws {RangeError} Se o XP for negativo ou não inteiro.
 */
export function calcularNivel(xpTotal: number): number {
  if (!Number.isInteger(xpTotal) || xpTotal < 0) {
    throw new RangeError(`XP total inválido: ${xpTotal}`);
  }
  let nivel = 1;
  while (nivel < NIVEL_MAXIMO && xpTotal >= limiarNivel(nivel + 1)) {
    nivel += 1;
  }
  return nivel;
}

/**
 * Rank do Aventureiro pelo nível (gamificacao.md §4).
 *
 * @param nivel - Inteiro de 1 a 100.
 * @returns Letra do Rank.
 */
export function rankDoAventureiro(nivel: number): RankAventureiro {
  exigirNivelValido(nivel);
  const faixa = RANKS_POR_NIVEL.find(([minimo]) => nivel >= minimo);
  return faixa ? faixa[1] : 'E';
}

/**
 * Título do personagem: muda a cada 10 níveis, com a medalha nova.
 *
 * @param nivel - Inteiro de 1 a 100.
 * @returns Título exibido no HUD e na Ficha.
 */
export function tituloDoNivel(nivel: number): string {
  exigirNivelValido(nivel);
  return TITULOS_POR_DEZENA[Math.floor(nivel / 10)] ?? TITULOS_POR_DEZENA[0];
}

export type ProgressoNivel = {
  nivel: number;
  /** XP acumulado desde o início do nível atual. */
  xpNoNivel: number;
  /** XP do início do nível atual até o próximo; `null` no nível máximo. */
  xpParaProximo: number | null;
  /** De 0 a 1, para a barra de XP. */
  fracao: number;
};

/**
 * Progresso dentro do nível atual, para a barra de XP.
 *
 * @param xpTotal - Soma do XP do ledger.
 * @returns Nível, XP no nível, tamanho do nível e fração percorrida.
 */
export function progressoDoNivel(xpTotal: number): ProgressoNivel {
  const nivel = calcularNivel(xpTotal);
  const inicio = limiarNivel(nivel);
  const xpNoNivel = xpTotal - inicio;
  if (nivel === NIVEL_MAXIMO) {
    return { nivel, xpNoNivel, xpParaProximo: null, fracao: 1 };
  }
  const xpParaProximo = limiarNivel(nivel + 1) - inicio;
  return { nivel, xpNoNivel, xpParaProximo, fracao: xpNoNivel / xpParaProximo };
}
