import { describe, expect, it, vi } from 'vitest';

import {
  contarAtualizacoesConcluidas,
  criarAtualizacao,
  mapearAtualizacao,
  mudarStatusDaAtualizacao,
  obterProjetoDaAtualizacao,
} from '@/dados/atualizacoes';

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

type Cliente = Parameters<typeof criarAtualizacao>[0];

describe('criarAtualizacao', () => {
  it('cria pela criar_atualizacao com o XP de criação', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'id-novo', error: null });
    const cliente = { rpc } as unknown as Cliente;
    await expect(
      criarAtualizacao(cliente, { projetoId: 'p1', titulo: 'Login', descricao: 'x' }),
    ).resolves.toEqual({ ok: true, id: 'id-novo' });
    expect(rpc).toHaveBeenCalledWith('criar_atualizacao', {
      p_projeto_id: 'p1',
      p_titulo: 'Login',
      p_descricao: 'x',
      p_xp_criacao: 5,
    });
  });

  it('devolve o código do erro do banco para a tela traduzir', async () => {
    const cliente = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: '42501' } }),
    } as unknown as Cliente;
    await expect(
      criarAtualizacao(cliente, { projetoId: 'p1', titulo: 'Login', descricao: 'x' }),
    ).resolves.toEqual({ ok: false, codigo: '42501' });
  });
});

describe('mudarStatusDaAtualizacao', () => {
  it('conclui pela mudar_status_atualizacao com o XP e o Rank do Projeto', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ situacao: 'movida', xp_ganho: 30 }], error: null });
    const cliente = { rpc } as unknown as Cliente;
    await expect(
      mudarStatusDaAtualizacao(cliente, 'a1', 'concluido', { xp: 30, rank: 'B' }),
    ).resolves.toEqual({
      situacao: 'movida',
      xpGanho: 30,
    });
    expect(rpc).toHaveBeenCalledWith('mudar_status_atualizacao', {
      p_id: 'a1',
      p_status: 'concluido',
      p_xp: 30,
      p_rank: 'B',
    });
  });

  it('lança ErroDeMissao quando o banco falha', async () => {
    const cliente = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: '23514' } }),
    } as unknown as Cliente;
    await expect(mudarStatusDaAtualizacao(cliente, 'a1', 'backlog', null)).rejects.toMatchObject({
      name: 'ErroDeMissao',
      codigo: '23514',
    });
  });
});

/** Cadeia mínima do PostgREST: cada método devolve o próprio objeto e o fim resolve a resposta. */
function consultaFalsa(resposta: unknown, fim: 'maybeSingle' | 'eq2') {
  const cadeia: Record<string, unknown> = {};
  const eq = vi.fn();
  cadeia.select = vi.fn(() => cadeia);
  cadeia.eq = eq;
  if (fim === 'maybeSingle') {
    eq.mockReturnValue(cadeia);
    cadeia.maybeSingle = vi.fn().mockResolvedValue(resposta);
  } else {
    eq.mockReturnValueOnce(cadeia).mockResolvedValueOnce(resposta);
  }
  const from = vi.fn(() => cadeia);
  return { cliente: { from } as unknown as Cliente, from, cadeia, eq };
}

describe('contarAtualizacoesConcluidas', () => {
  it('conta só as concluídas do Projeto, sem trazer as linhas', async () => {
    const { cliente, from, cadeia, eq } = consultaFalsa({ count: 7, error: null }, 'eq2');
    await expect(contarAtualizacoesConcluidas(cliente, 'p1')).resolves.toBe(7);
    expect(from).toHaveBeenCalledWith('atualizacoes');
    expect(cadeia.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(eq).toHaveBeenNthCalledWith(1, 'projeto_id', 'p1');
    expect(eq).toHaveBeenNthCalledWith(2, 'status', 'concluido');
  });

  it('lança ErroDeMissao quando a contagem falha', async () => {
    const { cliente } = consultaFalsa({ count: null, error: { code: '57014' } }, 'eq2');
    await expect(contarAtualizacoesConcluidas(cliente, 'p1')).rejects.toMatchObject({ codigo: '57014' });
  });
});

describe('obterProjetoDaAtualizacao', () => {
  it('devolve o id do Projeto vinculado', async () => {
    const { cliente } = consultaFalsa({ data: { projeto_id: 'p1' }, error: null }, 'maybeSingle');
    await expect(obterProjetoDaAtualizacao(cliente, 'a1')).resolves.toBe('p1');
  });

  it('devolve null quando a Atualização não existe ou é de outro usuário', async () => {
    const { cliente } = consultaFalsa({ data: null, error: null }, 'maybeSingle');
    await expect(obterProjetoDaAtualizacao(cliente, 'a1')).resolves.toBeNull();
  });

  it('lança ErroDeMissao quando a leitura falha', async () => {
    const { cliente } = consultaFalsa({ data: null, error: { code: '57014' } }, 'maybeSingle');
    await expect(obterProjetoDaAtualizacao(cliente, 'a1')).rejects.toMatchObject({ codigo: '57014' });
  });
});
