import { describe, expect, it } from 'vitest';

import {
  avaliarConclusaoProjeto,
  trilhaDoTipo,
  XP_CRIACAO_ATUALIZACAO,
  XP_CRIACAO_PROJETO,
  xpConclusaoAtualizacao,
  xpConclusaoProjeto,
} from '@/dominio/gamificacao/xp';

const HORA = 60 * 60 * 1000;
const AGORA = new Date('2026-10-31T12:00:00Z');
const horasAtras = (horas: number) => new Date(AGORA.getTime() - horas * HORA);

describe('XP de criação', () => {
  it('vale 10 para Projeto e 5 para Atualização (gamificacao.md §2)', () => {
    expect(XP_CRIACAO_PROJETO).toBe(10);
    expect(XP_CRIACAO_ATUALIZACAO).toBe(5);
  });
});

describe('trilhaDoTipo', () => {
  it('manda Desenvolvimento para a trilha Desenvolvedor e Geral para Produtividade (RN-18)', () => {
    expect(trilhaDoTipo('dev')).toBe('desenvolvedor');
    expect(trilhaDoTipo('geral')).toBe('produtividade');
  });
});

describe('xpConclusaoAtualizacao', () => {
  it.each([
    ['E', 15],
    ['D', 20],
    ['C', 25],
    ['B', 30],
    ['A', 35],
    ['S', 40],
  ] as const)('Rank %s rende %i', (rank, xp) => {
    expect(xpConclusaoAtualizacao(rank)).toBe(xp);
  });

  it('rende 20 num Projeto Geral, que não tem Rank (RN-18)', () => {
    expect(xpConclusaoAtualizacao(null)).toBe(20);
  });
});

describe('xpConclusaoProjeto', () => {
  it.each([
    ['E', 0, 40],
    ['C', 5, 104],
    ['B', 7, 157],
    ['S', 20, 400],
  ] as const)('Rank %s com %i Atualizações concluídas rende %i', (rank, atualizacoes, xp) => {
    expect(xpConclusaoProjeto(rank, atualizacoes)).toBe(xp);
  });

  it('arredonda o meio para cima em inteiros, sem erro de ponto flutuante (RN-13: 90 × 1,15 = 103,5)', () => {
    expect(xpConclusaoProjeto('C', 5)).toBe(104);
  });

  it('para de somar bônus depois de 20 Atualizações', () => {
    expect(xpConclusaoProjeto('S', 35)).toBe(400);
  });

  it.each([
    [0, 60],
    [5, 69],
    [20, 96],
  ])('Projeto Geral com %i Atualizações concluídas rende %i (RN-18)', (atualizacoes, xp) => {
    expect(xpConclusaoProjeto(null, atualizacoes)).toBe(xp);
  });

  it.each([-1, 1.5, Number.NaN])('rejeita quantidade de Atualizações inválida (%s)', (atualizacoes) => {
    expect(() => xpConclusaoProjeto('E', atualizacoes)).toThrow(RangeError);
  });
});

describe('avaliarConclusaoProjeto', () => {
  it('concede o XP com 24 horas ou mais em Desenvolvimento (RN-06d)', () => {
    expect(
      avaliarConclusaoProjeto({
        rank: 'B',
        atualizacoesConcluidas: 7,
        inicioDesenvolvimentoEm: horasAtras(25),
        agora: AGORA,
      }),
    ).toEqual({ concede: true, xp: 157 });
  });

  it('concede exatamente no limite de 24 horas', () => {
    expect(
      avaliarConclusaoProjeto({
        rank: 'E',
        atualizacoesConcluidas: 0,
        inicioDesenvolvimentoEm: horasAtras(24),
        agora: AGORA,
      }),
    ).toEqual({ concede: true, xp: 40 });
  });

  it('recusa antes da trava e diz quantas horas faltaram, arredondando para cima', () => {
    expect(
      avaliarConclusaoProjeto({
        rank: 'E',
        atualizacoesConcluidas: 0,
        inicioDesenvolvimentoEm: horasAtras(2.5),
        agora: AGORA,
      }),
    ).toEqual({ concede: false, horasRestantes: 22 });
  });

  it('recusa com 24 horas restantes quando o Projeto nunca entrou em Desenvolvimento', () => {
    expect(
      avaliarConclusaoProjeto({
        rank: null,
        atualizacoesConcluidas: 3,
        inicioDesenvolvimentoEm: null,
        agora: AGORA,
      }),
    ).toEqual({ concede: false, horasRestantes: 24 });
  });
});
