import { describe, expect, it } from 'vitest';

import {
  FILTROS_VAZIOS,
  escreverParametros,
  filtrarMissoes,
  haFiltroAtivo,
  lerParametros,
  normalizarTexto,
} from '@/dominio/missoes/filtros';

type MissaoFiltravel = Parameters<typeof filtrarMissoes>[0][number];

const missao = (nome: string, extra: Partial<MissaoFiltravel> = {}): MissaoFiltravel => ({
  nome,
  descricao: `Descrição de ${nome}`,
  stacks: ['Next.js'],
  rank: 'C',
  ...extra,
});

const GESTOR = missao('Gestor de Projetos', { stacks: ['Next.js', 'Supabase'], rank: 'C' });
const AGENDA = missao('Agenda', { descricao: 'Calendário com notificações', stacks: ['Python'], rank: 'E' });
const BOT = missao('Bot do Discord', { stacks: ['Python', 'Redis'], rank: 'B' });
const TODAS = [GESTOR, AGENDA, BOT];

describe('normalizarTexto', () => {
  it('ignora maiúsculas, acentos e espaços nas pontas', () => {
    expect(normalizarTexto('  Calendário ÚTIL ')).toBe('calendario util');
  });
});

describe('filtrarMissoes', () => {
  it('sem filtro, devolve todas na mesma ordem', () => {
    expect(filtrarMissoes(TODAS, FILTROS_VAZIOS)).toEqual(TODAS);
  });

  it('busca no nome sem diferenciar maiúsculas nem acentos', () => {
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, busca: 'GESTÔR' })).toEqual([GESTOR]);
  });

  it('busca também na descrição', () => {
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, busca: 'calendario' })).toEqual([AGENDA]);
  });

  it('filtra pela stack sem diferenciar maiúsculas', () => {
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, stack: 'python' })).toEqual([AGENDA, BOT]);
  });

  it('filtra pelo Rank', () => {
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, rank: 'B' })).toEqual([BOT]);
  });

  it('combina os filtros (todos precisam bater)', () => {
    expect(filtrarMissoes(TODAS, { busca: 'bot', stack: 'Python', rank: 'E' })).toEqual([]);
    expect(filtrarMissoes(TODAS, { busca: 'bot', stack: 'Python', rank: 'B' })).toEqual([BOT]);
  });
});

describe('lerParametros', () => {
  it('lê busca, stack, Rank e vista da URL', () => {
    expect(lerParametros(new URLSearchParams('busca=gestor&stack=Next.js&rank=C&vista=lista'))).toEqual({
      filtros: { busca: 'gestor', stack: 'Next.js', rank: 'C' },
      vista: 'lista',
    });
  });

  it('sem parâmetros, devolve os filtros vazios e o Quadro', () => {
    expect(lerParametros(new URLSearchParams())).toEqual({ filtros: FILTROS_VAZIOS, vista: 'quadro' });
  });

  it('descarta Rank e vista desconhecidos (URL editada à mão)', () => {
    expect(lerParametros(new URLSearchParams('rank=Z&vista=tabela'))).toEqual({
      filtros: FILTROS_VAZIOS,
      vista: 'quadro',
    });
  });

  it('corta busca e stack longas demais', () => {
    const { filtros } = lerParametros(
      new URLSearchParams({ busca: 'x'.repeat(200), stack: 'y'.repeat(200) }),
    );
    expect(filtros.busca).toHaveLength(80);
    expect(filtros.stack).toHaveLength(40);
  });

  it('stack só com espaços vale como nenhuma', () => {
    expect(lerParametros(new URLSearchParams('stack=%20%20')).filtros.stack).toBeNull();
  });
});

describe('escreverParametros', () => {
  it('omite o que está no padrão', () => {
    expect(escreverParametros(FILTROS_VAZIOS, 'quadro')).toBe('');
  });

  it('é o inverso de lerParametros', () => {
    const texto = escreverParametros({ busca: 'gestor de', stack: 'Next.js', rank: 'S' }, 'lista');
    expect(lerParametros(new URLSearchParams(texto))).toEqual({
      filtros: { busca: 'gestor de', stack: 'Next.js', rank: 'S' },
      vista: 'lista',
    });
  });
});

describe('haFiltroAtivo', () => {
  it.each([
    [FILTROS_VAZIOS, false],
    [{ ...FILTROS_VAZIOS, busca: '   ' }, false],
    [{ ...FILTROS_VAZIOS, busca: 'a' }, true],
    [{ ...FILTROS_VAZIOS, stack: 'Go' }, true],
    [{ ...FILTROS_VAZIOS, rank: 'A' as const }, true],
  ])('%o → %s', (filtros, esperado) => {
    expect(haFiltroAtivo(filtros)).toBe(esperado);
  });
});
