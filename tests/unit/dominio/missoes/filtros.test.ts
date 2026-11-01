import { describe, expect, it } from 'vitest';

import {
  FILTROS_VAZIOS,
  dicaSemResultado,
  escreverParametros,
  filtrarMissoes,
  haFiltroAtivo,
  lerParametros,
  normalizarTexto,
  opcoesDoFiltro,
} from '@/dominio/missoes/filtros';

type MissaoFiltravel = Parameters<typeof filtrarMissoes>[0][number];

const missao = (nome: string, extra: Partial<MissaoFiltravel> = {}): MissaoFiltravel => ({
  nome,
  descricao: `Descrição de ${nome}`,
  tipo: 'dev',
  stacks: ['Next.js'],
  tags: [],
  rank: 'C',
  ...extra,
});

const GESTOR = missao('Gestor de Projetos', { stacks: ['Next.js', 'Supabase'], rank: 'C' });
const AGENDA = missao('Agenda', { descricao: 'Calendário com notificações', stacks: ['Python'], rank: 'E' });
const BOT = missao('Bot do Discord', { stacks: ['Python', 'Redis'], tags: ['IA'], rank: 'B' });
const REVENDA = missao('Revenda de fones', {
  tipo: 'geral',
  stacks: ['Canva'],
  tags: ['Revenda', 'IA'],
  rank: null,
});
const TODAS = [GESTOR, AGENDA, BOT, REVENDA];

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

  it('filtro de Rank não devolve Missões Gerais (elas não têm Rank)', () => {
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, rank: 'C' })).toEqual([GESTOR]);
  });

  it('filtra pelo tipo', () => {
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, tipo: 'geral' })).toEqual([REVENDA]);
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, tipo: 'dev' })).toEqual([GESTOR, AGENDA, BOT]);
  });

  it('filtra pela tag sem diferenciar maiúsculas nem acentos', () => {
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, tag: 'ia' })).toEqual([BOT, REVENDA]);
  });

  it('o filtro de stack também casa as ferramentas das Missões Gerais', () => {
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, stack: 'canva' })).toEqual([REVENDA]);
  });

  it('combina os filtros (todos precisam bater)', () => {
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, busca: 'bot', stack: 'Python', rank: 'E' })).toEqual(
      [],
    );
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, busca: 'bot', stack: 'Python', rank: 'B' })).toEqual([
      BOT,
    ]);
    expect(filtrarMissoes(TODAS, { ...FILTROS_VAZIOS, tipo: 'dev', tag: 'IA' })).toEqual([BOT]);
  });
});

describe('lerParametros', () => {
  it('lê busca, stack, Rank, tipo, tag e vista da URL', () => {
    expect(
      lerParametros(new URLSearchParams('busca=gestor&stack=Next.js&rank=C&tipo=dev&tag=IA&vista=lista')),
    ).toEqual({
      filtros: { busca: 'gestor', stack: 'Next.js', rank: 'C', tipo: 'dev', tag: 'IA' },
      vista: 'lista',
    });
  });

  it('sem parâmetros, devolve os filtros vazios e o Quadro', () => {
    expect(lerParametros(new URLSearchParams())).toEqual({ filtros: FILTROS_VAZIOS, vista: 'quadro' });
  });

  it('descarta Rank, tipo e vista desconhecidos (URL editada à mão)', () => {
    expect(lerParametros(new URLSearchParams('rank=Z&tipo=xx&vista=tabela'))).toEqual({
      filtros: FILTROS_VAZIOS,
      vista: 'quadro',
    });
  });

  it('corta busca, stack e tag longas demais', () => {
    const { filtros } = lerParametros(
      new URLSearchParams({ busca: 'x'.repeat(200), stack: 'y'.repeat(200), tag: 'z'.repeat(200) }),
    );
    expect(filtros.busca).toHaveLength(80);
    expect(filtros.stack).toHaveLength(40);
    expect(filtros.tag).toHaveLength(30);
  });

  it('stack e tag só com espaços valem como nenhuma', () => {
    const { filtros } = lerParametros(new URLSearchParams('stack=%20%20&tag=%20'));
    expect(filtros.stack).toBeNull();
    expect(filtros.tag).toBeNull();
  });
});

describe('escreverParametros', () => {
  it('omite o que está no padrão', () => {
    expect(escreverParametros(FILTROS_VAZIOS, 'quadro')).toBe('');
  });

  it('é o inverso de lerParametros', () => {
    const filtros = {
      busca: 'gestor de',
      stack: 'Next.js',
      rank: 'S',
      tipo: 'geral',
      tag: 'Revenda & IA',
    } as const;
    const texto = escreverParametros(filtros, 'lista');
    expect(lerParametros(new URLSearchParams(texto))).toEqual({
      filtros,
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
    [{ ...FILTROS_VAZIOS, tipo: 'geral' as const }, true],
    [{ ...FILTROS_VAZIOS, tag: 'IA' }, true],
  ])('%o → %s', (filtros, esperado) => {
    expect(haFiltroAtivo(filtros)).toBe(esperado);
  });
});

describe('dicaSemResultado', () => {
  it('Rank com tipo Geral explica que Gerais não têm Rank (RN-15)', () => {
    expect(dicaSemResultado({ ...FILTROS_VAZIOS, tipo: 'geral', rank: 'S' })).toBe(
      'Projetos Gerais não têm Rank. Tire o filtro de Rank para vê-los.',
    );
  });

  it.each([
    ['sem filtro', FILTROS_VAZIOS],
    ['só o tipo Geral', { ...FILTROS_VAZIOS, tipo: 'geral' as const }],
    ['só o Rank', { ...FILTROS_VAZIOS, rank: 'S' as const }],
    ['Rank com tipo Desenvolvimento', { ...FILTROS_VAZIOS, tipo: 'dev' as const, rank: 'S' as const }],
  ])('%s não tem dica', (_caso, filtros) => {
    expect(dicaSemResultado(filtros)).toBeNull();
  });
});

describe('opcoesDoFiltro', () => {
  it('sem filtro, devolve os nomes como vieram', () => {
    expect(opcoesDoFiltro(['Go', 'Python'], null)).toEqual(['Go', 'Python']);
  });

  it('com um filtro que já está na lista, não repete', () => {
    expect(opcoesDoFiltro(['Go', 'Python'], 'Python')).toEqual(['Go', 'Python']);
  });

  it('um filtro que veio da URL e não existe nas Missões entra no começo', () => {
    expect(opcoesDoFiltro(['Go', 'Python'], 'Revenda')).toEqual(['Revenda', 'Go', 'Python']);
  });
});
