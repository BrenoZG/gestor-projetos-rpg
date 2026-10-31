import { describe, expect, it } from 'vitest';

import {
  acaoDoAtalho,
  atalhoLigado,
  deveAbrirFicha,
  deveFecharFicha,
  ehCampoDeTexto,
  montarCookieAtalho,
  type TeclaPressionada,
} from '@/lib/atalho-ficha';

const TECLA_C: TeclaPressionada = {
  key: 'c',
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  defaultPrevented: false,
  emCampoDeTexto: false,
  janelaAberta: false,
};

describe('atalhoLigado', () => {
  it('sem cookie, o atalho vem ligado', () => {
    expect(atalhoLigado('')).toBe(true);
    expect(atalhoLigado('efeitos=reduzido')).toBe(true);
  });

  it('o cookie "desligado" desliga (RN-12)', () => {
    expect(atalhoLigado('efeitos=reduzido; atalho-ficha=desligado')).toBe(false);
  });

  it('valor desconhecido não desliga', () => {
    expect(atalhoLigado('atalho-ficha=talvez')).toBe(true);
  });
});

describe('montarCookieAtalho', () => {
  it('desligar grava por um ano, em todo o site, com SameSite=Lax', () => {
    expect(montarCookieAtalho(false, false)).toBe(
      'atalho-ficha=desligado; Path=/; Max-Age=31536000; SameSite=Lax',
    );
  });

  it('em HTTPS marca Secure', () => {
    expect(montarCookieAtalho(false, true)).toMatch(/; Secure$/);
  });

  it('ligar apaga o cookie (volta ao padrão)', () => {
    expect(montarCookieAtalho(true, false)).toBe('atalho-ficha=; Path=/; Max-Age=0; SameSite=Lax');
  });
});

describe('ehCampoDeTexto', () => {
  it.each([
    { tagName: 'INPUT', type: 'text' },
    { tagName: 'INPUT', type: 'search' },
    { tagName: 'TEXTAREA' },
    { tagName: 'SELECT' },
    { tagName: 'DIV', isContentEditable: true },
  ])('%j é campo de texto', (alvo) => {
    expect(ehCampoDeTexto(alvo)).toBe(true);
  });

  it.each([
    { tagName: 'INPUT', type: 'checkbox' },
    { tagName: 'INPUT', type: 'radio' },
    { tagName: 'BUTTON' },
    { tagName: 'A' },
    { tagName: 'BODY' },
  ])('%j não é campo de texto', (alvo) => {
    expect(ehCampoDeTexto(alvo)).toBe(false);
  });
});

describe('deveAbrirFicha', () => {
  it('C ou c abre', () => {
    expect(deveAbrirFicha(TECLA_C)).toBe(true);
    expect(deveAbrirFicha({ ...TECLA_C, key: 'C' })).toBe(true);
  });

  it.each([
    ['outra tecla', { key: 'x' }],
    ['Ctrl+C (copiar)', { ctrlKey: true }],
    ['Alt+C', { altKey: true }],
    ['⌘+C', { metaKey: true }],
    ['tecla segurada', { repeat: true }],
    ['evento já tratado', { defaultPrevented: true }],
    ['foco em campo de texto', { emCampoDeTexto: true }],
    ['janela aberta', { janelaAberta: true }],
  ])('não abre com %s (RN-12)', (_caso, mudanca) => {
    expect(deveAbrirFicha({ ...TECLA_C, ...mudanca })).toBe(false);
  });
});

describe('deveFecharFicha', () => {
  const ESC = { ...TECLA_C, key: 'Escape' };

  it('Esc fecha', () => {
    expect(deveFecharFicha(ESC)).toBe(true);
  });

  it.each([
    ['janela aberta (o Esc é dela)', { janelaAberta: true }],
    ['evento já tratado (menu fechou)', { defaultPrevented: true }],
    ['foco em campo de texto', { emCampoDeTexto: true }],
    ['outra tecla', { key: 'c' }],
  ])('não fecha com %s', (_caso, mudanca) => {
    expect(deveFecharFicha({ ...ESC, ...mudanca })).toBe(false);
  });
});

describe('acaoDoAtalho', () => {
  const ESC = { ...TECLA_C, key: 'Escape' };

  it('C fora da Ficha abre a Ficha', () => {
    expect(acaoDoAtalho({ tecla: TECLA_C, caminho: '/', anterior: null, ligado: true })).toBe('abrir');
  });

  it('C com o atalho desligado não faz nada (RN-12)', () => {
    expect(acaoDoAtalho({ tecla: TECLA_C, caminho: '/', anterior: null, ligado: false })).toBeNull();
  });

  it('C na própria Ficha não faz nada', () => {
    expect(acaoDoAtalho({ tecla: TECLA_C, caminho: '/personagem', anterior: '/', ligado: true })).toBeNull();
  });

  it('Esc na Ficha volta para a tela anterior do app', () => {
    expect(acaoDoAtalho({ tecla: ESC, caminho: '/personagem', anterior: '/tags', ligado: true })).toBe(
      'voltar',
    );
  });

  it('Esc na Ficha aberta direto pelo endereço vai para o Quadro', () => {
    expect(acaoDoAtalho({ tecla: ESC, caminho: '/personagem', anterior: null, ligado: true })).toBe('quadro');
  });

  it('Esc vale mesmo com o atalho C desligado (não é tecla de caractere, WCAG 2.1.4)', () => {
    expect(acaoDoAtalho({ tecla: ESC, caminho: '/personagem', anterior: '/', ligado: false })).toBe('voltar');
  });

  it('Esc fora da Ficha não faz nada', () => {
    expect(acaoDoAtalho({ tecla: ESC, caminho: '/', anterior: null, ligado: true })).toBeNull();
  });
});
