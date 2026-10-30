import { describe, expect, it } from 'vitest';

import { tipoDeLink, validarUrlDeLink } from '@/dominio/missoes/links';

describe('validarUrlDeLink (RN-17)', () => {
  it('aceita https e devolve o endereço normalizado', () => {
    expect(validarUrlDeLink('https://www.youtube.com/watch?v=abc')).toEqual({
      ok: true,
      url: 'https://www.youtube.com/watch?v=abc',
    });
  });

  it('tira os espaços das pontas e normaliza esquema e domínio', () => {
    expect(validarUrlDeLink(' HTTPS://Exemplo.com ')).toEqual({ ok: true, url: 'https://exemplo.com/' });
  });

  it.each(['javascript:alert(1)', 'http://exemplo.com', 'data:text/html,<b>x</b>', 'ftp://exemplo.com'])(
    'recusa o protocolo de "%s"',
    (entrada) => {
      expect(validarUrlDeLink(entrada)).toEqual({ ok: false, motivo: 'protocolo' });
    },
  );

  it.each(['https://usuario:senha@exemplo.com', 'https://usuario@exemplo.com'])(
    'recusa credenciais embutidas em "%s"',
    (entrada) => {
      expect(validarUrlDeLink(entrada)).toEqual({ ok: false, motivo: 'credenciais' });
    },
  );

  it.each(['não é url', '', '   ', 'exemplo.com'])('recusa o formato de "%s"', (entrada) => {
    expect(validarUrlDeLink(entrada)).toEqual({ ok: false, motivo: 'formato' });
  });

  it('recusa endereço com mais de 2.000 caracteres', () => {
    expect(validarUrlDeLink(`https://exemplo.com/${'a'.repeat(2000)}`)).toEqual({
      ok: false,
      motivo: 'tamanho',
    });
  });

  it('aceita endereço com exatamente 2.000 caracteres', () => {
    const url = `https://exemplo.com/${'a'.repeat(2000 - 'https://exemplo.com/'.length)}`;
    expect(validarUrlDeLink(url)).toEqual({ ok: true, url });
  });
});

describe('tipoDeLink', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abc', 'youtube'],
    ['https://youtube.com/shorts/abc', 'youtube'],
    ['https://m.youtube.com/watch?v=abc', 'youtube'],
    ['https://youtu.be/abc', 'youtube'],
    ['https://www.instagram.com/p/abc', 'instagram'],
    ['https://instagram.com/reel/abc', 'instagram'],
    ['https://drive.google.com/file/d/abc', 'drive'],
    ['https://docs.google.com/document/d/abc', 'drive'],
    ['https://exemplo.com/', 'pagina'],
  ])('"%s" é %s', (url, tipo) => {
    expect(tipoDeLink(url)).toBe(tipo);
  });

  it.each(['https://youtube.com.evil.com/', 'https://evil.com/youtube.com', 'https://notyoutube.com/'])(
    'só o domínio exato conta: "%s" é página',
    (url) => {
      expect(tipoDeLink(url)).toBe('pagina');
    },
  );

  it('endereço inválido é página', () => {
    expect(tipoDeLink('não é url')).toBe('pagina');
  });
});
