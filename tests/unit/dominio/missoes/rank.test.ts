import { describe, expect, it } from 'vitest';

import { pontosDaMissao, rankDaMissao } from '@/dominio/missoes/rank';

describe('pontosDaMissao', () => {
  it.each([
    [1, 1, 12],
    [2, 3, 26],
    [3, 5, 40],
    [4, 10, 60],
    [5, 5, 60],
  ])(
    'dificuldade %i com %i stacks vale %i pontos (exemplos de gamificacao.md)',
    (dificuldade, stacks, pontos) => {
      expect(pontosDaMissao(dificuldade, stacks)).toBe(pontos);
    },
  );

  it('só as 10 primeiras stacks pontuam', () => {
    expect(pontosDaMissao(3, 11)).toBe(pontosDaMissao(3, 10));
    expect(pontosDaMissao(3, 20)).toBe(50);
  });

  it('aceita zero stacks (prévia do formulário antes da primeira tag)', () => {
    expect(pontosDaMissao(2, 0)).toBe(20);
  });

  it.each([0, 6, 2.5, Number.NaN])('rejeita dificuldade %s', (dificuldade) => {
    expect(() => pontosDaMissao(dificuldade, 1)).toThrow(RangeError);
  });

  it.each([-1, 1.5, Number.NaN])('rejeita quantidade de stacks %s', (stacks) => {
    expect(() => pontosDaMissao(1, stacks)).toThrow(RangeError);
  });
});

describe('rankDaMissao', () => {
  it.each([
    [1, 1, 'E'],
    [2, 3, 'D'],
    [3, 5, 'B'],
    [4, 10, 'S'],
    [5, 5, 'S'],
  ] as const)(
    'dificuldade %i com %i stacks é Rank %s (exemplos de gamificacao.md)',
    (dificuldade, stacks, rank) => {
      expect(rankDaMissao(dificuldade, stacks)).toBe(rank);
    },
  );

  // Cada par mostra o último ponto de um Rank e o primeiro do seguinte.
  it.each([
    [1, 4, 18, 'E'],
    [2, 0, 20, 'D'],
    [2, 4, 28, 'D'],
    [3, 0, 30, 'C'],
    [3, 4, 38, 'C'],
    [4, 0, 40, 'B'],
    [4, 4, 48, 'B'],
    [5, 0, 50, 'A'],
    [5, 4, 58, 'A'],
    [5, 5, 60, 'S'],
  ] as const)('dificuldade %i com %i stacks (%i pontos) é Rank %s', (dificuldade, stacks, pontos, rank) => {
    expect(pontosDaMissao(dificuldade, stacks)).toBe(pontos);
    expect(rankDaMissao(dificuldade, stacks)).toBe(rank);
  });
});
