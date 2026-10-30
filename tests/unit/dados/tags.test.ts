import { describe, expect, it, vi } from 'vitest';

import { ErroDeMissao } from '@/dados/missoes';
import { apagarTag, gravarNomeDaTag, listarTagsComUso } from '@/dados/tags';

type Cliente = Parameters<typeof listarTagsComUso>[0];
type RespostaBanco = { data: unknown; error: { code: string } | null };

const ID = '00000000-0000-4000-8000-000000000001';

describe('listarTagsComUso', () => {
  /** `from('tags').select(...).order('nome')`: só a resposta final importa. */
  function clienteFalso(resposta: RespostaBanco) {
    const order = vi.fn().mockResolvedValue(resposta);
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    return { cliente: { from } as unknown as Cliente, from, select, order };
  }

  it('devolve id, nome e quantas Missões usam cada tag, na ordem do banco', async () => {
    const { cliente, from, select, order } = clienteFalso({
      data: [
        { id: 'a', nome: 'Revenda', projeto_tags: [{ projeto_id: 'p1' }, { projeto_id: 'p2' }] },
        { id: 'b', nome: 'Vídeos', projeto_tags: [] },
      ],
      error: null,
    });
    await expect(listarTagsComUso(cliente)).resolves.toEqual([
      { id: 'a', nome: 'Revenda', missoes: 2 },
      { id: 'b', nome: 'Vídeos', missoes: 0 },
    ]);
    expect(from).toHaveBeenCalledWith('tags');
    expect(select).toHaveBeenCalledWith('id, nome, projeto_tags(projeto_id)');
    expect(order).toHaveBeenCalledWith('nome');
  });

  it('lança ErroDeMissao com o código do banco quando a consulta falha', async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: '42501' } });
    await expect(listarTagsComUso(cliente)).rejects.toMatchObject({
      name: 'ErroDeMissao',
      operacao: 'listar_tags_uso',
      codigo: '42501',
    });
  });
});

describe('gravarNomeDaTag', () => {
  /** `rpc('renomear_tag', ...).single()`. */
  function clienteFalso(resposta: RespostaBanco) {
    const single = vi.fn().mockResolvedValue(resposta);
    const rpc = vi.fn().mockReturnValue({ single });
    return { cliente: { rpc } as unknown as Cliente, rpc };
  }

  it('chama a renomear_tag e devolve o resultado com a quantidade de Missões e o destino', async () => {
    const { cliente, rpc } = clienteFalso({
      data: { resultado: 'conflito', projetos: 3, destino: 'Revenda' },
      error: null,
    });
    await expect(gravarNomeDaTag(cliente, ID, 'revenda', false)).resolves.toEqual({
      ok: true,
      resultado: 'conflito',
      missoes: 3,
      destino: 'Revenda',
    });
    expect(rpc).toHaveBeenCalledWith('renomear_tag', { p_id: ID, p_nome: 'revenda', p_juntar: false });
  });

  it('devolve o código do erro do banco para a tela traduzir', async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: 'P0002' } });
    await expect(gravarNomeDaTag(cliente, ID, 'Revenda', true)).resolves.toEqual({
      ok: false,
      codigo: 'P0002',
    });
  });
});

describe('apagarTag', () => {
  /** `from('tags').delete().eq('id', id).select('id')`. */
  function clienteFalso(resposta: RespostaBanco) {
    const select = vi.fn().mockResolvedValue(resposta);
    const eq = vi.fn().mockReturnValue({ select });
    const remover = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: remover });
    return { cliente: { from } as unknown as Cliente, eq };
  }

  it('devolve true quando o banco excluiu a tag', async () => {
    const { cliente, eq } = clienteFalso({ data: [{ id: ID }], error: null });
    await expect(apagarTag(cliente, ID)).resolves.toBe(true);
    expect(eq).toHaveBeenCalledWith('id', ID);
  });

  it('devolve false quando a tag está em uso, não existe ou é de outro usuário (0 linhas)', async () => {
    const { cliente } = clienteFalso({ data: [], error: null });
    await expect(apagarTag(cliente, ID)).resolves.toBe(false);
  });

  it('lança ErroDeMissao quando a exclusão falha', async () => {
    const { cliente } = clienteFalso({ data: null, error: { code: '08006' } });
    await expect(apagarTag(cliente, ID)).rejects.toBeInstanceOf(ErroDeMissao);
  });
});
