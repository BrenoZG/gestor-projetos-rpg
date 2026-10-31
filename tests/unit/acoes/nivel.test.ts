import { afterEach, describe, expect, it, vi } from 'vitest';

import { sincronizarNivelMaximo } from '@/acoes/nivel';

type Cliente = Parameters<typeof sincronizarNivelMaximo>[0];

function clienteFalso(respostas: Record<string, { data: unknown; error: { code: string } | null }>) {
  const rpc = vi.fn((funcao: string) => Promise.resolve(respostas[funcao]));
  return { cliente: { rpc } as unknown as Cliente, rpc };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sincronizarNivelMaximo', () => {
  it('registra o nível que o XP de Desenvolvedor dá hoje', async () => {
    const { cliente, rpc } = clienteFalso({
      // 1.900 XP = nível 21 (limiar 21 = 1.789, limiar 22 = 1.925).
      resumo_xp: {
        data: [
          { trilha: 'desenvolvedor', xp_total: 1900 },
          { trilha: 'produtividade', xp_total: 9000 },
        ],
        error: null,
      },
      registrar_nivel_maximo: { data: 21, error: null },
    });
    await sincronizarNivelMaximo(cliente);
    expect(rpc).toHaveBeenCalledWith('registrar_nivel_maximo', { p_nivel: 21 });
  });

  it('falha do banco só vai para o log, sem derrubar a ação que já gravou o XP', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { cliente } = clienteFalso({
      resumo_xp: { data: [], error: null },
      registrar_nivel_maximo: { data: null, error: { code: '57014' } },
    });
    await expect(sincronizarNivelMaximo(cliente)).resolves.toBeUndefined();
    const linha = JSON.parse(String(erro.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(linha).toMatchObject({
      evento: 'supabase_falhou',
      operacao: 'registrar_nivel_maximo',
      codigo: '57014',
    });
  });
});
