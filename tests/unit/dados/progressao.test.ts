import { describe, expect, it, vi } from 'vitest';

import { obterXpPorTrilha } from '@/dados/progressao';

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
