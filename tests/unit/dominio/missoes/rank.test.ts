import { describe, expect, it } from 'vitest';

import type { Capacidade, EstiloArquitetural } from '@/dominio/missoes/campos';
import { pontuacaoDaMissao, rankDaMissao, rankPorPontos } from '@/dominio/missoes/rank';

const TODAS_AS_CAPACIDADES: Capacidade[] = [
  'autenticacao',
  'banco_de_dados',
  'api_externa',
  'tempo_real',
  'filas',
  'ia',
  'ci_cd',
  'mobile',
];

/** As `n` primeiras capacidades da lista: o peso é igual para todas. */
const capacidades = (n: number) => TODAS_AS_CAPACIDADES.slice(0, n);

describe('pontuacaoDaMissao', () => {
  it('detalha estilo, capacidades e stacks (exemplo de gamificacao.md)', () => {
    expect(
      pontuacaoDaMissao({
        estilo: 'monolito',
        capacidades: ['autenticacao', 'banco_de_dados', 'api_externa', 'ci_cd'],
        quantidadeStacks: 6,
      }),
    ).toEqual({ estilo: 5, capacidades: 20, stacks: 12, total: 37 });
  });

  it.each([
    ['script', 0],
    ['monolito', 5],
    ['monolito_modular', 10],
    ['hexagonal', 12],
    ['serverless', 12],
    ['eventos', 16],
    ['microsservicos', 20],
  ] as const)('o estilo %s vale %i pontos', (estilo, pontos) => {
    expect(pontuacaoDaMissao({ estilo, capacidades: [], quantidadeStacks: 0 }).estilo).toBe(pontos);
  });

  it('cada capacidade vale 5 pontos', () => {
    expect(pontuacaoDaMissao({ estilo: 'script', capacidades: capacidades(8), quantidadeStacks: 0 })).toEqual(
      {
        estilo: 0,
        capacidades: 40,
        stacks: 0,
        total: 40,
      },
    );
  });

  it('capacidade repetida conta uma vez só', () => {
    const pontuacao = pontuacaoDaMissao({
      estilo: 'script',
      capacidades: ['ia', 'ia', 'filas'],
      quantidadeStacks: 0,
    });
    expect(pontuacao.capacidades).toBe(10);
  });

  it('só as 10 primeiras stacks pontuam', () => {
    const comDez = pontuacaoDaMissao({ estilo: 'script', capacidades: [], quantidadeStacks: 10 });
    const comVinte = pontuacaoDaMissao({ estilo: 'script', capacidades: [], quantidadeStacks: 20 });
    expect(comDez.stacks).toBe(20);
    expect(comVinte).toEqual(comDez);
  });

  it('chega ao máximo de 80 pontos', () => {
    expect(
      pontuacaoDaMissao({ estilo: 'microsservicos', capacidades: capacidades(8), quantidadeStacks: 20 })
        .total,
    ).toBe(80);
  });

  it('aceita zero stacks (prévia do formulário antes da primeira tag)', () => {
    expect(pontuacaoDaMissao({ estilo: 'monolito', capacidades: [], quantidadeStacks: 0 }).total).toBe(5);
  });

  it.each([-1, 1.5, Number.NaN])('rejeita quantidade de stacks %s', (quantidadeStacks) => {
    expect(() => pontuacaoDaMissao({ estilo: 'monolito', capacidades: [], quantidadeStacks })).toThrow(
      RangeError,
    );
  });

  it('rejeita estilo desconhecido (valor vindo do banco)', () => {
    expect(() =>
      pontuacaoDaMissao({
        estilo: 'monolitico' as EstiloArquitetural,
        capacidades: [],
        quantidadeStacks: 1,
      }),
    ).toThrow(RangeError);
  });

  it('rejeita capacidade desconhecida (valor vindo do banco)', () => {
    expect(() =>
      pontuacaoDaMissao({
        estilo: 'monolito',
        capacidades: ['blockchain' as Capacidade],
        quantidadeStacks: 1,
      }),
    ).toThrow(RangeError);
  });
});

describe('rankPorPontos', () => {
  // Cada par mostra o último ponto de um Rank e o primeiro do seguinte.
  it.each([
    [0, 'E'],
    [14, 'E'],
    [15, 'D'],
    [29, 'D'],
    [30, 'C'],
    [44, 'C'],
    [45, 'B'],
    [59, 'B'],
    [60, 'A'],
    [69, 'A'],
    [70, 'S'],
    [80, 'S'],
  ] as const)('%i pontos é Rank %s', (pontos, rank) => {
    expect(rankPorPontos(pontos)).toBe(rank);
  });

  it.each([-1, 2.5, Number.NaN])('rejeita %s pontos', (pontos) => {
    expect(() => rankPorPontos(pontos)).toThrow(RangeError);
  });
});

describe('rankDaMissao', () => {
  it.each([
    [{ estilo: 'script', capacidades: capacidades(0), quantidadeStacks: 7 }, 14, 'E'],
    [{ estilo: 'script', capacidades: capacidades(1), quantidadeStacks: 5 }, 15, 'D'],
    [{ estilo: 'monolito', capacidades: capacidades(4), quantidadeStacks: 6 }, 37, 'C'],
    [{ estilo: 'microsservicos', capacidades: capacidades(3), quantidadeStacks: 5 }, 45, 'B'],
    [{ estilo: 'microsservicos', capacidades: capacidades(6), quantidadeStacks: 5 }, 60, 'A'],
    [{ estilo: 'microsservicos', capacidades: capacidades(6), quantidadeStacks: 10 }, 70, 'S'],
  ] as const)('%o soma %i pontos e é Rank %s', (entrada, pontos, rank) => {
    expect(pontuacaoDaMissao(entrada).total).toBe(pontos);
    expect(rankDaMissao(entrada)).toBe(rank);
  });
});
