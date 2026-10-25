import { describe, expect, it } from 'vitest';

import { mapearMissao } from '@/dados/missoes';

const LINHA = {
  id: '00000000-0000-4000-8000-000000000001',
  nome: 'Gestor',
  descricao: 'Ideias num lugar só',
  arquitetura: null,
  dificuldade: 3,
  status: 'desenvolvimento',
  inicio_desenvolvimento_em: '2026-10-25T12:00:00+00:00',
  concluido_em: null,
  criado_em: '2026-10-24T12:00:00+00:00',
  atualizado_em: '2026-10-25T12:00:00+00:00',
  projeto_stacks: [{ stacks: { nome: 'Supabase' } }, { stacks: { nome: 'Next.js' } }],
};

describe('mapearMissao', () => {
  it('converte a linha do banco para o formato das telas, com Rank e stacks em ordem alfabética', () => {
    expect(mapearMissao(LINHA)).toEqual({
      id: LINHA.id,
      nome: 'Gestor',
      descricao: 'Ideias num lugar só',
      arquitetura: null,
      dificuldade: 3,
      status: 'desenvolvimento',
      stacks: ['Next.js', 'Supabase'],
      rank: 'C',
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
});
