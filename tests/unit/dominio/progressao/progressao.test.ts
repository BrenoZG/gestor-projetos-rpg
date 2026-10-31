import { describe, expect, it } from 'vitest';

import {
  calcularNivel,
  limiarNivel,
  progressoDoNivel,
  rankDoAventureiro,
  tituloDoNivel,
} from '@/dominio/progressao/progressao';

describe('limiarNivel', () => {
  it.each([
    [1, 0],
    [2, 20],
    [3, 57],
    [4, 104],
    [5, 160],
    [10, 540],
    [20, 1656],
    [30, 3123],
    [40, 4871],
    [50, 6860],
    [60, 9064],
    [70, 11463],
    [80, 14043],
    [90, 16792],
    [100, 19701],
  ])('nível %i exige %i de XP total (tabela de gamificacao.md)', (nivel, xp) => {
    expect(limiarNivel(nivel)).toBe(xp);
  });

  it.each([0, 101, 1.5, Number.NaN])('rejeita nível fora de 1..100 ou não inteiro (%s)', (nivel) => {
    expect(() => limiarNivel(nivel)).toThrow(RangeError);
  });
});

describe('calcularNivel', () => {
  it.each([
    [0, 1],
    [19, 1],
    [20, 2],
    [56, 2],
    [57, 3],
    [19700, 99],
    [19701, 100],
    [999_999, 100],
  ])('com %i de XP o personagem está no nível %i', (xp, nivel) => {
    expect(calcularNivel(xp)).toBe(nivel);
  });

  it.each([-1, 1.5, Number.NaN])('rejeita XP negativo ou não inteiro (%s)', (xp) => {
    expect(() => calcularNivel(xp)).toThrow(RangeError);
  });
});

describe('rankDoAventureiro', () => {
  it.each([
    [1, 'E'],
    [19, 'E'],
    [20, 'D'],
    [29, 'D'],
    [30, 'C'],
    [49, 'C'],
    [50, 'B'],
    [69, 'B'],
    [70, 'A'],
    [89, 'A'],
    [90, 'S'],
    [100, 'S'],
  ])('nível %i é Rank %s', (nivel, rank) => {
    expect(rankDoAventureiro(nivel)).toBe(rank);
  });
});

describe('tituloDoNivel', () => {
  it.each([
    [1, 'Estagiário'],
    [9, 'Estagiário'],
    [10, 'Desenvolvedor Iniciante'],
    [19, 'Desenvolvedor Iniciante'],
    [20, 'Desenvolvedor Aprendiz'],
    [30, 'Desenvolvedor Júnior'],
    [40, 'Desenvolvedor Júnior Avançado'],
    [50, 'Desenvolvedor Pleno'],
    [60, 'Desenvolvedor Pleno Avançado'],
    [70, 'Especialista'],
    [80, 'Arquiteto'],
    [90, 'Mestre'],
    [99, 'Mestre'],
    [100, 'Desenvolvedor Sênior'],
  ])('nível %i tem o título "%s"', (nivel, titulo) => {
    expect(tituloDoNivel(nivel)).toBe(titulo);
  });
});

describe('progressoDoNivel', () => {
  it('personagem novo: nível 1, faltam 20 XP para o nível 2', () => {
    expect(progressoDoNivel(0)).toEqual({ nivel: 1, xpNoNivel: 0, xpParaProximo: 20, fracao: 0 });
  });

  it('mede o progresso dentro do nível atual', () => {
    // Nível 2 começa em 20 XP e o 3 em 57: 10 de 37 percorridos.
    expect(progressoDoNivel(30)).toEqual({ nivel: 2, xpNoNivel: 10, xpParaProximo: 37, fracao: 10 / 37 });
  });

  it('no nível máximo não há próximo nível e a barra fica cheia', () => {
    expect(progressoDoNivel(25_000)).toEqual({ nivel: 100, xpNoNivel: 5299, xpParaProximo: null, fracao: 1 });
  });
});
