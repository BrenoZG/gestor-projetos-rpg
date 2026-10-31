import { describe, expect, it, vi } from 'vitest';

import { jaRecebeuConclusaoDoProjeto, obterXpPorTrilha } from '@/dados/progressao';

type Cliente = Parameters<typeof obterXpPorTrilha>[0];

function clienteFalso(resposta: { data: unknown; error: { code: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { cliente: { rpc } as unknown as Cliente, rpc };
}

describe('obterXpPorTrilha', () => {
  it('soma do ledger por trilha, pela resumo_xp', async () => {
    const { cliente, rpc } = clienteFalso({
      data: [
        { trilha: 'desenvolvedor', xp_total: 202 },
        { trilha: 'produtividade', xp_total: 84 },
      ],
      error: null,
    });
    await expect(obterXpPorTrilha(cliente)).resolves.toEqual({ desenvolvedor: 202, produtividade: 84 });
    expect(rpc).toHaveBeenCalledWith('resumo_xp');
  });

  it('trilha sem evento fica com zero', async () => {
    const { cliente } = clienteFalso({ data: [{ trilha: 'desenvolvedor', xp_total: 10 }], error: null });
    await expect(obterXpPorTrilha(cliente)).resolves.toEqual({ desenvolvedor: 10, produtividade: 0 });
  });

  it('ignora trilha desconhecida vinda do banco', async () => {
    const { cliente } = clienteFalso({ data: [{ trilha: 'outra', xp_total: 999 }], error: null });
    await expect(obterXpPorTrilha(cliente)).resolves.toEqual({ desenvolvedor: 0, produtividade: 0 });
  });

  it('lança ErroDeMissao, só com o código, quando o banco falha', async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: '57014' } });
    await expect(obterXpPorTrilha(cliente)).rejects.toMatchObject({ name: 'ErroDeMissao', codigo: '57014' });
  });
});

describe('jaRecebeuConclusaoDoProjeto', () => {
  function consultaFalsa(resposta: { count: number | null; error: { code: string } | null }) {
    const eq = vi.fn();
    const cadeia = { select: vi.fn(() => cadeia), eq };
    eq.mockReturnValueOnce(cadeia).mockResolvedValueOnce(resposta);
    const from = vi.fn(() => cadeia);
    return { cliente: { from } as unknown as Cliente, from, cadeia, eq };
  }

  it('procura o evento de conclusão do Projeto no ledger, sem trazer linhas', async () => {
    const { cliente, from, cadeia, eq } = consultaFalsa({ count: 1, error: null });
    await expect(jaRecebeuConclusaoDoProjeto(cliente, 'p1')).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('eventos_xp');
    expect(cadeia.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(eq).toHaveBeenNthCalledWith(1, 'referencia_id', 'p1');
    expect(eq).toHaveBeenNthCalledWith(2, 'tipo', 'conclusao_projeto');
  });

  it('sem evento, ainda não recebeu', async () => {
    const { cliente } = consultaFalsa({ count: 0, error: null });
    await expect(jaRecebeuConclusaoDoProjeto(cliente, 'p1')).resolves.toBe(false);
  });

  it('lança ErroDeMissao quando a consulta falha', async () => {
    const { cliente } = consultaFalsa({ count: null, error: { code: '57014' } });
    await expect(jaRecebeuConclusaoDoProjeto(cliente, 'p1')).rejects.toMatchObject({ codigo: '57014' });
  });
});
