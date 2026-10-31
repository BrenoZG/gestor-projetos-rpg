import { describe, expect, it, vi } from 'vitest';

import { gravarClasse, obterPersonagem, registrarNivelMaximo } from '@/dados/personagem';

type Cliente = Parameters<typeof obterPersonagem>[0];

const ID = '00000000-0000-4000-8000-00000000000a';

describe('obterPersonagem', () => {
  function leituraFalsa(resposta: { data: unknown; error: { code: string } | null }) {
    const maybeSingle = vi.fn().mockResolvedValue(resposta);
    const select = vi.fn(() => ({ maybeSingle }));
    const from = vi.fn(() => ({ select }));
    return { cliente: { from } as unknown as Cliente, from, select };
  }

  it('lê a classe e o nível máximo do personagem', async () => {
    const { cliente, from, select } = leituraFalsa({
      data: { classe: 'invocador_ia', nivel_maximo: 23 },
      error: null,
    });
    await expect(obterPersonagem(cliente)).resolves.toEqual({ classe: 'invocador_ia', nivelMaximo: 23 });
    expect(from).toHaveBeenCalledWith('personagem');
    expect(select).toHaveBeenCalledWith('classe, nivel_maximo');
  });

  it('classe nula ou desconhecida vira null', async () => {
    const { cliente } = leituraFalsa({ data: { classe: 'antiga', nivel_maximo: 1 }, error: null });
    await expect(obterPersonagem(cliente)).resolves.toEqual({ classe: null, nivelMaximo: 1 });
  });

  it('sem linha, devolve null', async () => {
    const { cliente } = leituraFalsa({ data: null, error: null });
    await expect(obterPersonagem(cliente)).resolves.toBeNull();
  });

  it('lança ErroDeMissao, só com o código, quando o banco falha', async () => {
    const { cliente } = leituraFalsa({ data: null, error: { code: '57014' } });
    await expect(obterPersonagem(cliente)).rejects.toMatchObject({
      name: 'ErroDeMissao',
      operacao: 'ler_personagem',
      codigo: '57014',
    });
  });
});

describe('gravarClasse', () => {
  function gravacaoFalsa(resposta: { data: unknown; error: { code: string } | null }) {
    const select = vi.fn().mockResolvedValue(resposta);
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    return { cliente: { from } as unknown as Cliente, update, eq };
  }

  it('grava a classe só na linha do usuário', async () => {
    const { cliente, update, eq } = gravacaoFalsa({ data: [{ user_id: ID }], error: null });
    await expect(gravarClasse(cliente, ID, 'bardo_experiencia')).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith({ classe: 'bardo_experiencia' });
    expect(eq).toHaveBeenCalledWith('user_id', ID);
  });

  it('sem personagem, devolve false', async () => {
    const { cliente } = gravacaoFalsa({ data: [], error: null });
    await expect(gravarClasse(cliente, ID, 'bardo_experiencia')).resolves.toBe(false);
  });

  it('lança ErroDeMissao quando o banco falha', async () => {
    const { cliente } = gravacaoFalsa({ data: null, error: { code: '42501' } });
    await expect(gravarClasse(cliente, ID, 'bardo_experiencia')).rejects.toMatchObject({
      operacao: 'gravar_classe',
      codigo: '42501',
    });
  });
});

describe('registrarNivelMaximo', () => {
  it('chama a registrar_nivel_maximo com o nível', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 23, error: null });
    await registrarNivelMaximo({ rpc } as unknown as Cliente, 23);
    expect(rpc).toHaveBeenCalledWith('registrar_nivel_maximo', { p_nivel: 23 });
  });

  it('lança ErroDeMissao quando o banco falha', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: '22023' } });
    await expect(registrarNivelMaximo({ rpc } as unknown as Cliente, 23)).rejects.toMatchObject({
      operacao: 'registrar_nivel_maximo',
      codigo: '22023',
    });
  });
});
