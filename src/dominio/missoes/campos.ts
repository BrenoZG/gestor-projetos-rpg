/**
 * Campos da Missão (requisitos.md §3). Os mesmos limites estão nos `CHECK`s
 * da migration `criar_missoes`; os testes de banco cobrem a fronteira.
 */

export const LIMITES_MISSAO = {
  nome: { minimo: 3, maximo: 80 },
  descricao: { minimo: 1, maximo: 2000 },
  arquitetura: { maximo: 20000 },
  stacks: { minimo: 1, maximo: 20 },
  /** O requisito limita só a quantidade; 40 evita "tags-parágrafo" (decisão do M1b). */
  nomeStack: { minimo: 1, maximo: 40 },
  dificuldade: { minimo: 1, maximo: 5 },
} as const;

/** Na ordem das colunas do Quadro. */
export const STATUS_MISSAO = ['backlog', 'desenvolvimento', 'concluido'] as const;

export type StatusMissao = (typeof STATUS_MISSAO)[number];

export const ROTULOS_STATUS: Readonly<Record<StatusMissao, string>> = {
  backlog: 'Backlog',
  desenvolvimento: 'Desenvolvimento',
  concluido: 'Concluído',
};

/** Campos de uma Missão já validados e limpos, prontos para gravar. */
export type DadosMissao = {
  nome: string;
  descricao: string;
  arquitetura: string | null;
  dificuldade: number;
  status: StatusMissao;
  stacks: string[];
};

export type Dificuldade = 1 | 2 | 3 | 4 | 5;

/** Os extremos vêm do glossário; os intermediários são só rótulos de tela. */
export const ROTULOS_DIFICULDADE: Readonly<Record<Dificuldade, string>> = {
  1: 'Trivial',
  2: 'Fácil',
  3: 'Média',
  4: 'Difícil',
  5: 'Extremo',
};

/**
 * Confere se um texto é um dos status da Missão (valor vindo de formulário ou do banco).
 *
 * @param valor - Texto a conferir.
 * @returns `true` se for `backlog`, `desenvolvimento` ou `concluido`.
 */
export function ehStatusMissao(valor: string): valor is StatusMissao {
  return (STATUS_MISSAO as readonly string[]).includes(valor);
}
