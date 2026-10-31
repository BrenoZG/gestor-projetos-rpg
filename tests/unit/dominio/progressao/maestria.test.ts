import { describe, expect, it } from 'vitest';

import { NIVEL_MAXIMO_MAESTRIA, progressoDaMaestria } from '@/dominio/progressao/maestria';

describe('progressoDaMaestria', () => {
  it.each([
    [0, 1],
    [150, 4],
    [1500, 18],
    [3750, 33],
    [6859, 49],
    [6860, 50],
  ])('%i XP na stack dá o nível %i (gamificacao.md §5)', (xp, nivel) => {
    expect(progressoDaMaestria(xp).nivel).toBe(nivel);
  });

  it('para no nível 50 mesmo com XP de nível 100 (RN-10)', () => {
    expect(progressoDaMaestria(200_000)).toEqual({
      nivel: 50,
      xpNoNivel: 193_140,
      xpParaProximo: null,
      fracao: 1,
    });
  });

  it('abaixo do teto mostra o progresso até o próximo nível', () => {
    // Nível 4 começa em 104 e o 5 em 160: 46 de 56.
    expect(progressoDaMaestria(150)).toEqual({ nivel: 4, xpNoNivel: 46, xpParaProximo: 56, fracao: 46 / 56 });
  });

  it('o teto é 50', () => {
    expect(NIVEL_MAXIMO_MAESTRIA).toBe(50);
  });

  it('recusa XP negativo ou fracionado', () => {
    expect(() => progressoDaMaestria(-1)).toThrow(RangeError);
    expect(() => progressoDaMaestria(1.5)).toThrow(RangeError);
  });
});
