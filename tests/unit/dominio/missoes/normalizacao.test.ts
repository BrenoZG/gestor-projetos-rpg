import { describe, expect, it } from 'vitest';

import { chaveDeComparacao, deduplicarStacks } from '@/dominio/missoes/normalizacao';

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

describe('deduplicarStacks', () => {
  it('mantém a primeira grafia de cada stack (RN-05)', () => {
    expect(deduplicarStacks(['Next.js', 'next.js', ' NEXT.JS '])).toEqual(['Next.js']);
  });

  it('remove espaços nas pontas e mantém a ordem de entrada', () => {
    expect(deduplicarStacks([' Supabase', 'React ', 'supabase'])).toEqual(['Supabase', 'React']);
  });

  it('descarta entradas vazias ou só com espaços', () => {
    expect(deduplicarStacks(['', '   ', 'Python'])).toEqual(['Python']);
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(deduplicarStacks([])).toEqual([]);
  });
});
