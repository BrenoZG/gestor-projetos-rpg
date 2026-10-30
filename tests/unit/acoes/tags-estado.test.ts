import { describe, expect, it } from 'vitest';

import { quantidadeDeProjetos } from '@/acoes/tags-estado';

describe('quantidadeDeProjetos', () => {
  it.each([
    [0, '0 projetos'],
    [1, '1 projeto'],
    [2, '2 projetos'],
  ])('escreve %i como "%s"', (quantidade, texto) => {
    expect(quantidadeDeProjetos(quantidade)).toBe(texto);
  });
});
