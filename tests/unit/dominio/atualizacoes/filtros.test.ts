import { describe, expect, it } from 'vitest';

import {
  POR_PAGINA,
  escreverFiltrosAtualizacoes,
  intervaloDaPagina,
  lerFiltrosAtualizacoes,
  totalDePaginas,
} from '@/dominio/atualizacoes/filtros';

const MISSAO = '00000000-0000-4000-8000-000000000001';

describe('lerFiltrosAtualizacoes', () => {
  it('lê status, Missão e página da URL', () => {
    expect(lerFiltrosAtualizacoes(new URLSearchParams(`status=concluido&missao=${MISSAO}&pagina=3`))).toEqual(
      {
        status: 'concluido',
        missao: MISSAO,
        pagina: 3,
      },
    );
  });

  it('sem parâmetros, não filtra e começa na página 1', () => {
    expect(lerFiltrosAtualizacoes(new URLSearchParams())).toEqual({ status: null, missao: null, pagina: 1 });
  });

  it.each([
    ['status=arquivado', { status: null }],
    ['missao=nao-e-uuid', { missao: null }],
    ['pagina=0', { pagina: 1 }],
    ['pagina=-2', { pagina: 1 }],
    ['pagina=2.5', { pagina: 1 }],
    ['pagina=abc', { pagina: 1 }],
    ['pagina=99999', { pagina: 1000 }],
  ])('descarta ou limita valor fora da regra (%s)', (consulta, esperado) => {
    expect(lerFiltrosAtualizacoes(new URLSearchParams(consulta))).toMatchObject(esperado);
  });
});

describe('escreverFiltrosAtualizacoes', () => {
  it('omite o que está no padrão', () => {
    expect(escreverFiltrosAtualizacoes({ status: null, missao: null, pagina: 1 })).toBe('');
  });

  it('é o inverso de lerFiltrosAtualizacoes', () => {
    const filtros = { status: 'desenvolvimento' as const, missao: MISSAO, pagina: 2 };
    expect(lerFiltrosAtualizacoes(new URLSearchParams(escreverFiltrosAtualizacoes(filtros)))).toEqual(
      filtros,
    );
  });
});

describe('paginação', () => {
  it('são 50 por página', () => {
    expect(POR_PAGINA).toBe(50);
  });

  it.each([
    [1, { de: 0, ate: 49 }],
    [2, { de: 50, ate: 99 }],
    [3, { de: 100, ate: 149 }],
  ])('a página %i vai da linha %o (intervalo inclusivo do PostgREST)', (pagina, intervalo) => {
    expect(intervaloDaPagina(pagina)).toEqual(intervalo);
  });

  it.each([
    [0, 1],
    [1, 1],
    [50, 1],
    [51, 2],
    [100, 2],
    [101, 3],
  ])('%i atualizações cabem em %i página(s)', (total, paginas) => {
    expect(totalDePaginas(total)).toBe(paginas);
  });
});
