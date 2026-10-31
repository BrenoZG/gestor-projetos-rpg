import { describe, expect, it } from 'vitest';

import { validarClasse } from '@/acoes/personagem-validacao';

describe('validarClasse', () => {
  it('aceita uma das 8 chaves', () => {
    expect(validarClasse('paladino_devops')).toEqual({ ok: true, classe: 'paladino_devops' });
  });

  it.each([
    ['ausente', null],
    ['vazia', ''],
    ['inventada', 'mago_inexistente'],
    ['herdada do protótipo', 'toString'],
    ['em maiúsculas', 'PALADINO_DEVOPS'],
    ['que não é texto', 7],
  ])('recusa a classe %s', (_caso, valor) => {
    expect(validarClasse(valor)).toEqual({ ok: false, mensagem: 'Escolha uma das 8 classes.' });
  });
});
