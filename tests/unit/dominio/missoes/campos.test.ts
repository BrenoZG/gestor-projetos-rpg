import { describe, expect, it } from 'vitest';

import {
  LIMITES_MISSAO,
  ROTULOS_DIFICULDADE,
  ROTULOS_STATUS,
  STATUS_MISSAO,
  ehStatusMissao,
} from '@/dominio/missoes/campos';

describe('LIMITES_MISSAO', () => {
  it('segue a seção 3 de requisitos.md', () => {
    expect(LIMITES_MISSAO).toEqual({
      nome: { minimo: 3, maximo: 80 },
      descricao: { minimo: 1, maximo: 2000 },
      arquitetura: { maximo: 20000 },
      stacks: { minimo: 1, maximo: 20 },
      nomeStack: { minimo: 1, maximo: 40 },
      dificuldade: { minimo: 1, maximo: 5 },
    });
  });
});

describe('status da Missão', () => {
  it('tem os três status, na ordem das colunas do Quadro', () => {
    expect(STATUS_MISSAO).toEqual(['backlog', 'desenvolvimento', 'concluido']);
  });

  it('tem rótulo para cada status', () => {
    expect(ROTULOS_STATUS).toEqual({
      backlog: 'Backlog',
      desenvolvimento: 'Desenvolvimento',
      concluido: 'Concluído',
    });
  });

  it.each(['backlog', 'desenvolvimento', 'concluido'])('reconhece "%s"', (valor) => {
    expect(ehStatusMissao(valor)).toBe(true);
  });

  it.each(['Backlog', 'concluído', '', 'arquivado'])('rejeita "%s"', (valor) => {
    expect(ehStatusMissao(valor)).toBe(false);
  });
});

describe('ROTULOS_DIFICULDADE', () => {
  it('nomeia as 5 dificuldades, de Trivial a Extremo (glossário)', () => {
    expect(ROTULOS_DIFICULDADE).toEqual({ 1: 'Trivial', 2: 'Fácil', 3: 'Média', 4: 'Difícil', 5: 'Extremo' });
  });
});
