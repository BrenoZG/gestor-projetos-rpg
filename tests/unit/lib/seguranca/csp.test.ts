import { describe, expect, it } from 'vitest';

import { gerarNonce, montarCsp } from '@/lib/seguranca/csp';

const NONCE = 'bm9uY2UtZGUtdGVzdGU=';
const URL_SUPABASE = 'https://exemplo.supabase.co';

/** Separa a CSP em diretivas: nome → lista de valores. */
function lerDiretivas(csp: string): Map<string, string[]> {
  return new Map(
    csp
      .split(';')
      .map((trecho) => trecho.trim().split(/\s+/))
      .filter(([nome]) => nome)
      .map(([nome, ...valores]) => [nome as string, valores]),
  );
}

function montar(desenvolvimento: boolean): Map<string, string[]> {
  return lerDiretivas(montarCsp({ nonce: NONCE, desenvolvimento, urlSupabase: URL_SUPABASE }));
}

describe('montarCsp', () => {
  it('libera scripts só com o nonce da requisição e strict-dynamic', () => {
    expect(montar(false).get('script-src')).toEqual(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"]);
  });

  it('exige o nonce nos estilos inline em produção', () => {
    expect(montar(false).get('style-src')).toEqual(["'self'", `'nonce-${NONCE}'`]);
  });

  it('adiciona unsafe-eval e unsafe-inline de estilo apenas em desenvolvimento', () => {
    const producao = montar(false);
    const desenvolvimento = montar(true);

    expect(producao.get('script-src')).not.toContain("'unsafe-eval'");
    expect(producao.get('style-src')).not.toContain("'unsafe-inline'");
    expect(desenvolvimento.get('script-src')).toContain("'unsafe-eval'");
    expect(desenvolvimento.get('style-src')).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it('nunca libera script inline sem nonce', () => {
    expect(montar(false).get('script-src')).not.toContain("'unsafe-inline'");
    expect(montar(true).get('script-src')).not.toContain("'unsafe-inline'");
  });

  it('permite conexões só com a própria origem e com a origem do Supabase, sem caminho', () => {
    const csp = lerDiretivas(
      montarCsp({ nonce: NONCE, desenvolvimento: false, urlSupabase: `${URL_SUPABASE}/rest/v1/` }),
    );
    expect(csp.get('connect-src')).toEqual(["'self'", URL_SUPABASE]);
  });

  it.each([false, true])('mantém as diretivas fixas de proteção (desenvolvimento: %s)', (desenvolvimento) => {
    const csp = montar(desenvolvimento);
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
    expect(csp.get('form-action')).toEqual(["'self'"]);
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('força HTTPS só em produção, porque o Supabase local roda em HTTP', () => {
    expect(montar(false).has('upgrade-insecure-requests')).toBe(true);
    expect(montar(true).has('upgrade-insecure-requests')).toBe(false);
  });

  it('gera uma única linha, como exige um cabeçalho HTTP', () => {
    const csp = montarCsp({ nonce: NONCE, desenvolvimento: false, urlSupabase: URL_SUPABASE });
    expect(csp).not.toMatch(/[\r\n]/);
  });

  it.each(['', 'abc; script-src *', 'abc\r\nSet-Cookie: x=1', "abc'"])(
    'rejeita nonce fora do alfabeto base64 (%j) para impedir injeção de diretiva',
    (nonceInvalido) => {
      expect(() =>
        montarCsp({ nonce: nonceInvalido, desenvolvimento: false, urlSupabase: URL_SUPABASE }),
      ).toThrow(/nonce/);
    },
  );
});

describe('gerarNonce', () => {
  it('gera um nonce aceito pela montagem da CSP', () => {
    const nonce = gerarNonce();
    expect(montarCsp({ nonce, desenvolvimento: false, urlSupabase: URL_SUPABASE })).toContain(
      `'nonce-${nonce}'`,
    );
  });

  it('carrega 128 bits aleatórios (24 caracteres em base64)', () => {
    expect(gerarNonce()).toHaveLength(24);
  });

  it('não repete o valor entre chamadas', () => {
    const nonces = new Set(Array.from({ length: 1000 }, gerarNonce));
    expect(nonces.size).toBe(1000);
  });
});
