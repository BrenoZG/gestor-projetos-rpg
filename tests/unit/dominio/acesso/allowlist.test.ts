import { describe, expect, it } from 'vitest';

import { estaAutorizado, type Identidade } from '@/dominio/acesso/allowlist';

const githubDoDono: Identidade = { provider: 'github', id: '123' };
const allowlist = ['123', '456'];

describe('estaAutorizado', () => {
  it('autoriza quando o ID do GitHub está na allowlist', () => {
    expect(estaAutorizado([githubDoDono], allowlist)).toBe(true);
  });

  it('nega quando o ID do GitHub não está na allowlist', () => {
    expect(estaAutorizado([{ provider: 'github', id: '999' }], allowlist)).toBe(false);
  });

  it('nega usuário sem nenhuma identidade', () => {
    expect(estaAutorizado([], allowlist)).toBe(false);
  });

  it('nega identidade de outro provedor mesmo com ID igual a um da allowlist', () => {
    expect(estaAutorizado([{ provider: 'google', id: '123' }], allowlist)).toBe(false);
  });

  it('autoriza quando a identidade do GitHub é uma entre várias', () => {
    expect(estaAutorizado([{ provider: 'email', id: 'abc' }, githubDoDono], allowlist)).toBe(true);
  });

  it('exige igualdade exata do ID, sem prefixo nem conversão numérica', () => {
    expect(estaAutorizado([{ provider: 'github', id: '12' }], allowlist)).toBe(false);
    expect(estaAutorizado([{ provider: 'github', id: '0123' }], allowlist)).toBe(false);
  });

  it('compara IDs maiores que o inteiro seguro do JavaScript sem perder precisão', () => {
    const idGrande = '9007199254740993';
    expect(estaAutorizado([{ provider: 'github', id: idGrande }], [idGrande])).toBe(true);
    expect(estaAutorizado([{ provider: 'github', id: '9007199254740992' }], [idGrande])).toBe(false);
  });

  it('nega todos quando a allowlist está vazia', () => {
    expect(estaAutorizado([githubDoDono], [])).toBe(false);
  });
});
