/**
 * Medalhas do personagem (docs/gamificacao.md §3, RN-08): uma a cada 10 níveis,
 * permanentes. "Conquistada" se mede pelo maior nível já alcançado, não pelo
 * atual: a revogação do XP de criação (RN-06c) pode baixar o nível, nunca a medalha.
 */
import { NIVEL_MAXIMO, tituloDoNivel } from './progressao';

/** Níveis entre uma medalha e a próxima. */
const NIVEIS_POR_MEDALHA = 10;

/** Material do design-system §2, para os gradientes `parada-<material>-<n>`. */
export type MaterialMedalha =
  | 'bronze'
  | 'prata'
  | 'ouro'
  | 'platina'
  | 'esmeralda'
  | 'safira'
  | 'rubi'
  | 'diamante'
  | 'mitica'
  | 'lendaria';

export type Medalha = {
  /** 1 a 10; cada tier herda as camadas do anterior (design-system §5). */
  tier: number;
  numeral: string;
  nome: string;
  material: MaterialMedalha;
  /** Nível em que a medalha é concedida. */
  nivel: number;
  /** Título que a medalha traz. */
  titulo: string;
};

const TIERS: ReadonlyArray<readonly [string, string, MaterialMedalha]> = [
  ['I', 'Bronze', 'bronze'],
  ['II', 'Prata', 'prata'],
  ['III', 'Ouro', 'ouro'],
  ['IV', 'Platina', 'platina'],
  ['V', 'Esmeralda', 'esmeralda'],
  ['VI', 'Safira', 'safira'],
  ['VII', 'Rubi', 'rubi'],
  ['VIII', 'Diamante', 'diamante'],
  ['IX', 'Mítica', 'mitica'],
  ['X', 'Lendária', 'lendaria'],
];

export const MEDALHAS: readonly Medalha[] = TIERS.map(([numeral, nome, material], indice) => {
  const nivel = (indice + 1) * NIVEIS_POR_MEDALHA;
  return { tier: indice + 1, numeral, nome, material, nivel, titulo: tituloDoNivel(nivel) };
});

function exigirNivel(nivel: number): void {
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > NIVEL_MAXIMO) {
    throw new RangeError(`Nível fora de 1..${NIVEL_MAXIMO}: ${nivel}`);
  }
}

/**
 * Nível que conta para as medalhas: o maior entre o registrado no banco e o
 * atual. Se a gravação do `nivel_maximo` falhou, o nível atual ainda vale.
 *
 * @param nivelMaximo - Coluna `personagem.nivel_maximo`.
 * @param nivelAtual - Nível pelo XP de hoje.
 * @throws {RangeError} Se algum dos dois não for inteiro entre 1 e 100.
 */
export function nivelConquistado(nivelMaximo: number, nivelAtual: number): number {
  exigirNivel(nivelMaximo);
  exigirNivel(nivelAtual);
  return Math.max(nivelMaximo, nivelAtual);
}

export type MedalhaDoPersonagem = Medalha & {
  conquistada: boolean;
  /** Níveis que faltam; 0 quando conquistada. */
  niveisFaltando: number;
};

/**
 * As 10 medalhas com o estado de cada uma, para a galeria (RF-15).
 *
 * @param nivel - Resultado de {@link nivelConquistado}.
 * @throws {RangeError} Se o nível não for inteiro entre 1 e 100.
 */
export function medalhasDoPersonagem(nivel: number): MedalhaDoPersonagem[] {
  exigirNivel(nivel);
  return MEDALHAS.map((medalha) => ({
    ...medalha,
    conquistada: nivel >= medalha.nivel,
    niveisFaltando: Math.max(0, medalha.nivel - nivel),
  }));
}
