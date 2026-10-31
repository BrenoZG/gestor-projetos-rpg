/**
 * O que a cinemática de level up mostra (RF-16, RN-08): do último nível já
 * exibido até o nível conquistado, numa conquista só, com a medalha mais alta
 * e a troca de Rank, se houver. Só a trilha Desenvolvedor tem cinemática.
 */
import { MEDALHAS, type Medalha } from './medalhas';
import { NIVEL_MAXIMO, rankDoAventureiro, type RankAventureiro } from './progressao';

export type Conquista = {
  /** Último nível cuja cinemática já tocou (`personagem.nivel_visto`). */
  de: number;
  /** Nível conquistado (o maior entre o máximo registrado e o atual). */
  para: number;
  rankAntes: RankAventureiro;
  rankDepois: RankAventureiro;
  /** Medalha mais alta ganha entre `de` (exclusive) e `para` (inclusive). */
  medalha: Medalha | null;
};

function exigirNivel(nivel: number): void {
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > NIVEL_MAXIMO) {
    throw new RangeError(`Nível fora de 1..${NIVEL_MAXIMO}: ${nivel}`);
  }
}

/**
 * Conquista ainda não exibida.
 *
 * @param nivelVisto - Coluna `personagem.nivel_visto`.
 * @param nivelConquistado - Resultado de `nivelConquistado` (medalhas.ts).
 * @returns A conquista, ou `null` se não há nível novo.
 * @throws {RangeError} Se algum dos dois não for inteiro entre 1 e 100.
 */
export function conquistaPendente(nivelVisto: number, nivelConquistado: number): Conquista | null {
  exigirNivel(nivelVisto);
  exigirNivel(nivelConquistado);
  if (nivelConquistado <= nivelVisto) return null;
  const ganhas = MEDALHAS.filter(({ nivel }) => nivel > nivelVisto && nivel <= nivelConquistado);
  return {
    de: nivelVisto,
    para: nivelConquistado,
    rankAntes: rankDoAventureiro(nivelVisto),
    rankDepois: rankDoAventureiro(nivelConquistado),
    medalha: ganhas.at(-1) ?? null,
  };
}
