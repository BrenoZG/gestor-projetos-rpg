import { describe, expect, it } from 'vitest';

import { chaveDeComparacao, deduplicarNomes, separarNomesDigitados } from '@/dominio/missoes/normalizacao';

describe('separarNomesDigitados', () => {
  it('separa por vírgula e tira espaços e pedaços vazios', () => {
    expect(separarNomesDigitados(' Next.js, Supabase,,  ')).toEqual(['Next.js', 'Supabase']);
  });

  it('não deixa a vírgula final virar parte do nome', () => {
    expect(separarNomesDigitados('Supabase,')).toEqual(['Supabase']);
  });

  it('devolve lista vazia para texto em branco', () => {
    expect(separarNomesDigitados('   ')).toEqual([]);
  });
});

describe('chaveDeComparacao', () => {
  it('ignora espaços nas pontas e maiúsculas (RN-05 e unicidade do nome)', () => {
    expect(chaveDeComparacao('  Next.js ')).toBe('next.js');
    expect(chaveDeComparacao('NEXT.JS')).toBe(chaveDeComparacao('next.js'));
  });

  it('preserva espaços internos e acentos', () => {
    expect(chaveDeComparacao(' Gestão de  Projetos ')).toBe('gestão de  projetos');
    expect(chaveDeComparacao('AÇÃO')).toBe('ação');
  });
});

describe('deduplicarNomes', () => {
  it('mantém a primeira grafia de cada stack (RN-05)', () => {
    expect(deduplicarNomes(['Next.js', 'next.js', ' NEXT.JS '])).toEqual(['Next.js']);
  });

  it('remove espaços nas pontas e mantém a ordem de entrada', () => {
    expect(deduplicarNomes([' Supabase', 'React ', 'supabase'])).toEqual(['Supabase', 'React']);
  });

  it('descarta entradas vazias ou só com espaços', () => {
    expect(deduplicarNomes(['', '   ', 'Python'])).toEqual(['Python']);
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(deduplicarNomes([])).toEqual([]);
  });
});
