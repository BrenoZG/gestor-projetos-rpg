import { describe, expect, it, vi } from 'vitest';

import { obterDadosExportados } from '@/dados/exportacao';

type Cliente = Parameters<typeof obterDadosExportados>[0];

function clienteFalso(resposta: { data: unknown; error: { code: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { cliente: { rpc } as unknown as Cliente, rpc };
}

const DADOS_DO_BANCO = {
  personagem: { classe: 'guerreiro_backend', nivel_maximo: 3 },
  projetos: [{ id: 'p1', nome: 'Gestor' }],
  stacks: [],
  projeto_stacks: [],
  tags: [],
  projeto_tags: [],
  projeto_links: [],
  atualizacoes: [],
  eventos_xp: [{ id: 'e1', xp: 10 }],
};

describe('obterDadosExportados', () => {
  it('lê todos os dados pela exportar_dados, num valor só', async () => {
    const { cliente, rpc } = clienteFalso({ data: DADOS_DO_BANCO, error: null });
    await expect(obterDadosExportados(cliente)).resolves.toEqual(DADOS_DO_BANCO);
    expect(rpc).toHaveBeenCalledWith('exportar_dados');
  });

  it('aceita usuário sem personagem', async () => {
    const { cliente } = clienteFalso({ data: { ...DADOS_DO_BANCO, personagem: null }, error: null });
    await expect(obterDadosExportados(cliente)).resolves.toMatchObject({ personagem: null });
  });

  it('lança ErroDeMissao, só com o código, quando o banco falha', async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: '57014' } });
    await expect(obterDadosExportados(cliente)).rejects.toMatchObject({
      name: 'ErroDeMissao',
      operacao: 'exportar_dados',
      codigo: '57014',
    });
  });

  it('recusa um export sem uma das tabelas: o backup não sai incompleto', async () => {
    const { eventos_xp: _, ...semLedger } = DADOS_DO_BANCO;
    const { cliente } = clienteFalso({ data: semLedger, error: null });
    await expect(obterDadosExportados(cliente)).rejects.toMatchObject({
      name: 'ErroDeMissao',
      codigo: 'formato-inesperado',
    });
  });

  it('recusa uma tabela que o código não conhece, em vez de descartá-la calado', async () => {
    const { cliente } = clienteFalso({ data: { ...DADOS_DO_BANCO, nova_tabela: [] }, error: null });
    await expect(obterDadosExportados(cliente)).rejects.toMatchObject({ codigo: 'formato-inesperado' });
  });
});
