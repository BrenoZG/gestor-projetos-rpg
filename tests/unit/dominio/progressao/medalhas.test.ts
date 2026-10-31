import { describe, expect, it } from 'vitest';

import { MEDALHAS, medalhasDoPersonagem, nivelConquistado } from '@/dominio/progressao/medalhas';

describe('MEDALHAS', () => {
  it.each([
    [1, 'I', 'Bronze', 10, 'Desenvolvedor Iniciante'],
    [2, 'II', 'Prata', 20, 'Desenvolvedor Aprendiz'],
    [3, 'III', 'Ouro', 30, 'Desenvolvedor Júnior'],
    [4, 'IV', 'Platina', 40, 'Desenvolvedor Júnior Avançado'],
    [5, 'V', 'Esmeralda', 50, 'Desenvolvedor Pleno'],
    [6, 'VI', 'Safira', 60, 'Desenvolvedor Pleno Avançado'],
    [7, 'VII', 'Rubi', 70, 'Especialista'],
    [8, 'VIII', 'Diamante', 80, 'Arquiteto'],
    [9, 'IX', 'Mítica', 90, 'Mestre'],
    [10, 'X', 'Lendária', 100, 'Desenvolvedor Sênior'],
  ])(
    'tier %i é %s %s, no nível %i, com o título %s (gamificacao.md §3)',
    (tier, numeral, nome, nivel, titulo) => {
      expect(MEDALHAS[tier - 1]).toMatchObject({ tier, numeral, nome, nivel, titulo });
    },
  );

  it('tem exatamente 10 medalhas', () => {
    expect(MEDALHAS).toHaveLength(10);
  });
});

describe('nivelConquistado', () => {
  it('usa o maior nível já registrado quando o XP atual caiu (RN-08)', () => {
    expect(nivelConquistado(23, 9)).toBe(23);
  });

  it('usa o nível atual quando ele ainda não foi registrado', () => {
    expect(nivelConquistado(1, 31)).toBe(31);
  });

  it.each([
    [0, 5],
    [5, 101],
    [1.5, 5],
  ])('rejeita nível fora de 1..100 (%s, %s)', (maximo, atual) => {
    expect(() => nivelConquistado(maximo, atual)).toThrow(RangeError);
  });
});

describe('medalhasDoPersonagem', () => {
  it('nível 9 não tem medalha e faltam 1 nível para a Bronze', () => {
    const medalhas = medalhasDoPersonagem(9);
    expect(medalhas.filter((m) => m.conquistada)).toHaveLength(0);
    expect(medalhas[0]).toMatchObject({ nome: 'Bronze', conquistada: false, niveisFaltando: 1 });
  });

  it('nível 10 conquista a Bronze na fronteira', () => {
    expect(medalhasDoPersonagem(10)[0]).toMatchObject({ conquistada: true, niveisFaltando: 0 });
  });

  it('nível 23 tem Bronze e Prata; Ouro faltam 7 níveis', () => {
    const medalhas = medalhasDoPersonagem(23);
    expect(medalhas.filter((m) => m.conquistada).map((m) => m.nome)).toEqual(['Bronze', 'Prata']);
    expect(medalhas[2]).toMatchObject({ nome: 'Ouro', niveisFaltando: 7 });
  });

  it('nível 100 conquista as 10', () => {
    expect(medalhasDoPersonagem(100).every((m) => m.conquistada)).toBe(true);
  });
});
