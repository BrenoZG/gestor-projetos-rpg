/**
 * Campos da Atualização (requisitos.md §3). Os mesmos limites estão nos
 * `CHECK`s da migration `criar_atualizacoes`; os testes de banco cobrem a
 * fronteira. O status usa os mesmos três valores da Missão.
 */

export const LIMITES_ATUALIZACAO = {
  titulo: { minimo: 3, maximo: 120 },
  descricao: { minimo: 1, maximo: 5000 },
} as const;

/** Campos de uma Atualização já validados e limpos, prontos para gravar. */
export type DadosAtualizacao = {
  projetoId: string;
  titulo: string;
  descricao: string;
};
