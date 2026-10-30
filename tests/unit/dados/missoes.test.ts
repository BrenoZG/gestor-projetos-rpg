import { describe, expect, it, vi } from 'vitest';

import { mapearMissao, salvarMissao } from '@/dados/missoes';
import type { DadosMissao } from '@/dominio/missoes/campos';

const LINHA = {
  id: '00000000-0000-4000-8000-000000000001',
  tipo: 'dev',
  nome: 'Gestor',
  descricao: 'Ideias num lugar só',
  arquitetura: 'Monolito Next.js',
  estilo_arquitetural: 'monolito',
  capacidades: ['autenticacao', 'ci_cd'],
  status: 'desenvolvimento',
  inicio_desenvolvimento_em: '2026-10-25T12:00:00+00:00',
  concluido_em: null,
  criado_em: '2026-10-24T12:00:00+00:00',
  atualizado_em: '2026-10-25T12:00:00+00:00',
  projeto_stacks: [{ stacks: { nome: 'Supabase' } }, { stacks: { nome: 'Next.js' } }],
  projeto_tags: [],
  projeto_links: [],
};

const LINHA_GERAL = {
  ...LINHA,
  id: '00000000-0000-4000-8000-000000000002',
  tipo: 'geral',
  nome: 'Revenda',
  arquitetura: null,
  estilo_arquitetural: null,
  capacidades: [],
  projeto_stacks: [{ stacks: { nome: 'Canva' } }],
};

describe('mapearMissao', () => {
  it('converte a linha do banco para o formato das telas, com a pontuação, o Rank e as stacks em ordem', () => {
    expect(mapearMissao(LINHA)).toEqual({
      id: LINHA.id,
      tipo: 'dev',
      nome: 'Gestor',
      descricao: 'Ideias num lugar só',
      arquitetura: 'Monolito Next.js',
      estilo: 'monolito',
      capacidades: ['autenticacao', 'ci_cd'],
      status: 'desenvolvimento',
      stacks: ['Next.js', 'Supabase'],
      tags: [],
      links: [],
      pontuacao: { estilo: 5, capacidades: 10, stacks: 4, total: 19 },
      rank: 'D',
      inicioDesenvolvimentoEm: '2026-10-25T12:00:00+00:00',
      concluidoEm: null,
      criadoEm: '2026-10-24T12:00:00+00:00',
      atualizadoEm: '2026-10-25T12:00:00+00:00',
    });
  });

  it('ignora vínculos sem stack legível', () => {
    const missao = mapearMissao({ ...LINHA, projeto_stacks: [{ stacks: null }, { stacks: { nome: 'Go' } }] });
    expect(missao.stacks).toEqual(['Go']);
  });

  it('aceita a stack embutida como lista (formato alternativo do PostgREST)', () => {
    const missao = mapearMissao({ ...LINHA, projeto_stacks: [{ stacks: [{ nome: 'Go' }] }] });
    expect(missao.stacks).toEqual(['Go']);
  });

  it('recusa status desconhecido vindo do banco', () => {
    expect(() => mapearMissao({ ...LINHA, status: 'arquivado' })).toThrow('Status de Missão desconhecido');
  });

  it('recusa estilo desconhecido vindo do banco', () => {
    expect(() => mapearMissao({ ...LINHA, estilo_arquitetural: 'monolitico' })).toThrow(
      'Estilo arquitetural desconhecido',
    );
  });

  it('recusa capacidade desconhecida vinda do banco', () => {
    expect(() => mapearMissao({ ...LINHA, capacidades: ['blockchain'] })).toThrow('Capacidade desconhecida');
  });

  it('recusa tipo desconhecido vindo do banco', () => {
    expect(() => mapearMissao({ ...LINHA, tipo: 'vendas' })).toThrow('Tipo de Missão desconhecido');
  });

  it('recusa Missão de Desenvolvimento sem estilo', () => {
    expect(() => mapearMissao({ ...LINHA, estilo_arquitetural: null })).toThrow(
      'Estilo arquitetural desconhecido',
    );
  });

  it('recusa Missão de Desenvolvimento sem arquitetura', () => {
    expect(() => mapearMissao({ ...LINHA, arquitetura: null })).toThrow(
      'Missão de Desenvolvimento sem arquitetura',
    );
  });

  it('converte a Missão Geral sem Rank, sem pontuação e sem campos técnicos (RN-15)', () => {
    expect(mapearMissao(LINHA_GERAL)).toEqual({
      id: LINHA_GERAL.id,
      tipo: 'geral',
      nome: 'Revenda',
      descricao: 'Ideias num lugar só',
      status: 'desenvolvimento',
      stacks: ['Canva'],
      tags: [],
      links: [],
      rank: null,
      inicioDesenvolvimentoEm: '2026-10-25T12:00:00+00:00',
      concluidoEm: null,
      criadoEm: '2026-10-24T12:00:00+00:00',
      atualizadoEm: '2026-10-25T12:00:00+00:00',
    });
  });

  it('põe as tags em ordem alfabética e os links na ordem da tela', () => {
    const missao = mapearMissao({
      ...LINHA_GERAL,
      projeto_tags: [{ tags: { nome: 'Vídeo' } }, { tags: [{ nome: 'IA' }] }, { tags: null }],
      projeto_links: [
        { url: 'https://exemplo.com/2', titulo: null, ordem: 1 },
        { url: 'https://exemplo.com/1', titulo: 'Primeiro', ordem: 0 },
      ],
    });
    expect(missao.tags).toEqual(['IA', 'Vídeo']);
    expect(missao.links).toEqual([
      { url: 'https://exemplo.com/1', titulo: 'Primeiro' },
      { url: 'https://exemplo.com/2', titulo: null },
    ]);
  });
});

describe('salvarMissao', () => {
  const DADOS: DadosMissao = {
    tipo: 'dev',
    nome: 'Gestor',
    descricao: 'Ideias',
    arquitetura: 'Monolito',
    estilo: 'monolito',
    capacidades: ['ci_cd'],
    status: 'backlog',
    stacks: ['Next.js'],
    tags: ['IA'],
    links: [{ url: 'https://exemplo.com/', titulo: null }],
  };

  /** Só o `rpc` importa aqui: o resto do cliente não é usado pela função. */
  function clienteFalso(resposta: { data: unknown; error: { code: string } | null }) {
    const rpc = vi.fn().mockResolvedValue(resposta);
    return { cliente: { rpc } as unknown as Parameters<typeof salvarMissao>[0], rpc };
  }

  it('grava pela salvar_missao_v3 com tipo, estilo, capacidades, tags e links', async () => {
    const { cliente, rpc } = clienteFalso({ data: 'id-novo', error: null });
    await expect(salvarMissao(cliente, null, DADOS)).resolves.toEqual({ ok: true, id: 'id-novo' });
    expect(rpc).toHaveBeenCalledWith('salvar_missao_v3', {
      p_id: null,
      p_tipo: 'dev',
      p_nome: 'Gestor',
      p_descricao: 'Ideias',
      p_arquitetura: 'Monolito',
      p_estilo: 'monolito',
      p_capacidades: ['ci_cd'],
      p_status: 'backlog',
      p_stacks: ['Next.js'],
      p_tags: ['IA'],
      p_links: [{ url: 'https://exemplo.com/', titulo: null }],
    });
  });

  it('grava a Missão Geral sem os campos técnicos e, na edição, sem status', async () => {
    const { cliente, rpc } = clienteFalso({ data: 'id', error: null });
    const geral: DadosMissao = {
      tipo: 'geral',
      nome: 'Revenda',
      descricao: 'Ideias',
      status: null,
      stacks: [],
      tags: [],
      links: [],
    };
    await salvarMissao(cliente, 'id', geral);
    expect(rpc).toHaveBeenCalledWith('salvar_missao_v3', {
      p_id: 'id',
      p_tipo: 'geral',
      p_nome: 'Revenda',
      p_descricao: 'Ideias',
      p_arquitetura: null,
      p_estilo: null,
      p_capacidades: null,
      p_status: null,
      p_stacks: [],
      p_tags: [],
      p_links: [],
    });
  });

  it('devolve o código do erro do banco para a tela traduzir', async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: '23505' } });
    await expect(salvarMissao(cliente, 'id', DADOS)).resolves.toEqual({ ok: false, codigo: '23505' });
  });
});
