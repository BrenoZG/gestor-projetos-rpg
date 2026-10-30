import { describe, expect, it } from 'vitest';

import { mensagemDoErroDaTag, validarNomeDaTag } from '@/acoes/tags-validacao';

const MENSAGEM_TAMANHO = 'A tag precisa ter de 1 a 30 caracteres.';

describe('validarNomeDaTag', () => {
  it('aceita o nome e tira os espaços das pontas', () => {
    expect(validarNomeDaTag('  Revenda ')).toEqual({ ok: true, nome: 'Revenda' });
  });

  it('aceita o nome com exatamente 30 caracteres', () => {
    const nome = 'x'.repeat(30);
    expect(validarNomeDaTag(nome)).toEqual({ ok: true, nome });
  });

  it.each([
    ['só espaços', '   '],
    ['vazio', ''],
    ['ausente', null],
    ['com 31 caracteres', 'x'.repeat(31)],
    ['que não é texto', 42],
  ])('recusa o nome %s', (_caso, valor) => {
    expect(validarNomeDaTag(valor)).toEqual({ ok: false, mensagem: MENSAGEM_TAMANHO });
  });
});

describe('mensagemDoErroDaTag', () => {
  it('explica a tag que não existe mais', () => {
    expect(mensagemDoErroDaTag('P0002')).toBe('Esta tag não existe mais.');
  });

  it('explica o nome fora da regra recusado pelo banco', () => {
    expect(mensagemDoErroDaTag('23514')).toBe(MENSAGEM_TAMANHO);
  });

  it('usa uma mensagem genérica para qualquer outra falha', () => {
    expect(mensagemDoErroDaTag(undefined)).toBe('Não foi possível salvar agora. Tente de novo em instantes.');
  });
});
