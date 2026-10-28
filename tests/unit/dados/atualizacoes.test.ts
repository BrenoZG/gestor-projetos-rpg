import { describe, expect, it } from 'vitest';

import { mapearAtualizacao } from '@/dados/atualizacoes';

const LINHA = {
  id: '00000000-0000-4000-8000-0000000000a1',
  projeto_id: '00000000-0000-4000-8000-000000000001',
  titulo: 'Corrige o login',
  descricao: 'Detalhes',
  status: 'concluido',
  concluido_em: '2026-10-27T12:00:00+00:00',
  criado_em: '2026-10-26T12:00:00+00:00',
  atualizado_em: '2026-10-27T12:00:00+00:00',
  projetos: { nome: 'Gestor' },
};

describe('mapearAtualizacao', () => {
  it('converte a linha do banco para o formato das telas, com o nome da Missão', () => {
    expect(mapearAtualizacao(LINHA)).toEqual({
      id: LINHA.id,
      projetoId: LINHA.projeto_id,
      nomeMissao: 'Gestor',
      titulo: 'Corrige o login',
      descricao: 'Detalhes',
      status: 'concluido',
      concluidoEm: '2026-10-27T12:00:00+00:00',
      criadoEm: '2026-10-26T12:00:00+00:00',
      atualizadoEm: '2026-10-27T12:00:00+00:00',
    });
  });

  it('aceita a Missão embutida como lista (formato alternativo do PostgREST)', () => {
    expect(mapearAtualizacao({ ...LINHA, projetos: [{ nome: 'Gestor' }] }).nomeMissao).toBe('Gestor');
  });

  it('recusa status desconhecido vindo do banco', () => {
    expect(() => mapearAtualizacao({ ...LINHA, status: 'arquivado' })).toThrow(
      'Status de Atualização desconhecido',
    );
  });
});
