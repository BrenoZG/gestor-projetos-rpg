import { describe, expect, it } from 'vitest';

import { sessaoExpirada, VALIDADE_MAXIMA_SESSAO_SEGUNDOS } from '@/dominio/acesso/sessao';

const HORA = 60 * 60;
const LOGIN = 1_800_000_000; // instante fictício do login, em segundos

const claimsComLoginEm = (...instantes: unknown[]) => ({
  amr: instantes.map((timestamp) => ({ method: 'oauth', timestamp })),
});

describe('sessaoExpirada', () => {
  it('vale 12 horas', () => {
    expect(VALIDADE_MAXIMA_SESSAO_SEGUNDOS).toBe(12 * HORA);
  });

  it.each([
    ['logo após o login', 0, false],
    ['11 h 59 min depois', 12 * HORA - 60, false],
    ['exatamente 12 h depois', 12 * HORA, true],
    ['13 h depois', 13 * HORA, true],
  ])('%s → expirada: %s', (_descricao, decorrido, esperado) => {
    expect(sessaoExpirada(claimsComLoginEm(LOGIN), LOGIN + decorrido)).toBe(esperado);
  });

  it('conta a partir do primeiro método de autenticação (o login original)', () => {
    // Ex.: login às 0 h e uma confirmação extra 10 h depois: às 12 h, expira.
    expect(sessaoExpirada(claimsComLoginEm(LOGIN + 10 * HORA, LOGIN), LOGIN + 12 * HORA)).toBe(true);
  });

  it('não expira com relógio levemente adiantado no token (login "no futuro")', () => {
    expect(sessaoExpirada(claimsComLoginEm(LOGIN + 30), LOGIN)).toBe(false);
  });

  it.each([
    ['sem amr', {}],
    ['amr vazio', { amr: [] }],
    ['amr que não é lista', { amr: 'oauth' }],
    ['timestamp não numérico', claimsComLoginEm('ontem')],
    ['timestamp infinito', claimsComLoginEm(Number.POSITIVE_INFINITY)],
  ])('na dúvida, trata como expirada (%s)', (_descricao, claims) => {
    expect(sessaoExpirada(claims, LOGIN)).toBe(true);
  });
});
