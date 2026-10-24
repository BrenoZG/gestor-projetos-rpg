import { describe, expect, it } from 'vitest';

import { lerPreferenciaEfeitos, montarCookieEfeitos, montarCookieRemocaoEfeitos } from '@/lib/efeitos';

describe('lerPreferenciaEfeitos', () => {
  it.each(['completo', 'reduzido', 'desligado'] as const)('aceita "%s"', (valor) => {
    expect(lerPreferenciaEfeitos(valor)).toBe(valor);
  });

  it.each([undefined, '', 'COMPLETO', 'maximo', 'completo; Path=/', 'constructor'])(
    'trata valor ausente ou desconhecido (%j) como "sem preferência"',
    (valor) => {
      expect(lerPreferenciaEfeitos(valor)).toBeNull();
    },
  );
});

describe('montarCookieEfeitos', () => {
  it('grava por um ano, em todo o site, com SameSite=Lax', () => {
    expect(montarCookieEfeitos('reduzido', false)).toBe(
      'efeitos=reduzido; Path=/; Max-Age=31536000; SameSite=Lax',
    );
  });

  it('marca Secure quando a página está em HTTPS', () => {
    expect(montarCookieEfeitos('desligado', true)).toBe(
      'efeitos=desligado; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
    );
  });
});

describe('montarCookieRemocaoEfeitos', () => {
  it('expira o cookie na hora, voltando ao modo automático (preferência do sistema)', () => {
    expect(montarCookieRemocaoEfeitos()).toBe('efeitos=; Path=/; Max-Age=0; SameSite=Lax');
  });
});
