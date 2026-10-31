/**
 * Maestria por stack e Domínio por ferramenta (docs/gamificacao.md §5 e §7,
 * RN-10, RN-18): a mesma curva do personagem, parada no nível 50. O XP de cada
 * stack vem somado do banco (função `maestria()`).
 */
import { calcularNivel, limiarNivel, type ProgressoNivel } from './progressao';

export const NIVEL_MAXIMO_MAESTRIA = 50;

/**
 * Nível e progresso de uma stack ou ferramenta.
 *
 * @param xp - XP de conclusão de Projetos que usam a stack; inteiro maior ou igual a zero.
 * @returns O progresso no nível, com `xpParaProximo` nulo no nível 50.
 * @throws {RangeError} Se o XP for negativo ou não inteiro.
 */
export function progressoDaMaestria(xp: number): ProgressoNivel {
  const nivel = Math.min(calcularNivel(xp), NIVEL_MAXIMO_MAESTRIA);
  const inicio = limiarNivel(nivel);
  const xpNoNivel = xp - inicio;
  if (nivel === NIVEL_MAXIMO_MAESTRIA) {
    return { nivel, xpNoNivel, xpParaProximo: null, fracao: 1 };
  }
  const xpParaProximo = limiarNivel(nivel + 1) - inicio;
  return { nivel, xpNoNivel, xpParaProximo, fracao: xpNoNivel / xpParaProximo };
}
