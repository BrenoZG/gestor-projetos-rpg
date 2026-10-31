import { afterEach, describe, expect, it, vi } from 'vitest';

import { responderExport } from '@/app/api/exportar/responder';

type Cliente = Parameters<typeof responderExport>[0];

const AGORA = new Date('2026-10-31T23:30:00.000Z');

const DADOS = {
  personagem: { classe: 'guerreiro_backend' },
  projetos: [{ id: 'p1', nome: 'Projeto secreto' }],
  stacks: [],
  projeto_stacks: [],
  tags: [],
  projeto_tags: [],
  projeto_links: [],
  atualizacoes: [{ id: 'a1' }, { id: 'a2' }],
  eventos_xp: [],
};

function clienteFalso({
  logado = true,
  resposta = { data: DADOS as unknown, error: null as { code: string } | null },
} = {}) {
  const getClaims = vi
    .fn()
    .mockResolvedValue(
      logado ? { data: { claims: { sub: 'u1' } }, error: null } : { data: null, error: { message: 'x' } },
    );
  const rpc = vi.fn().mockResolvedValue(resposta);
  return { cliente: { auth: { getClaims }, rpc } as unknown as Cliente, rpc };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('responderExport', () => {
  it('entrega o arquivo para baixar, sem cache', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const { cliente } = clienteFalso();

    const resposta = await responderExport(cliente, AGORA);

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(resposta.headers.get('Content-Disposition')).toBe(
      'attachment; filename="gestor-projetos-2026-10-31.json"',
    );
    expect(resposta.headers.get('Cache-Control')).toBe('no-store');
    expect(await resposta.json()).toEqual({
      formato: 'gestor-projetos-rpg/export',
      versao_formato: 1,
      exportado_em: '2026-10-31T23:30:00.000Z',
      dados: DADOS,
    });
  });

  it('registra contagens e tamanho, nunca o conteúdo', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { cliente } = clienteFalso();

    const resposta = await responderExport(cliente, AGORA);
    const tamanho = (await resposta.arrayBuffer()).byteLength;

    expect(info).toHaveBeenCalledOnce();
    const linha = String(info.mock.calls[0]?.[0]);
    expect(JSON.parse(linha)).toMatchObject({
      evento: 'exportacao_dados',
      projetos: 1,
      atualizacoes: 2,
      eventos_xp: 0,
      bytes: tamanho,
    });
    expect(linha).not.toContain('Projeto secreto');
  });

  it('sem sessão, responde 401 sem ler o banco', async () => {
    const { cliente, rpc } = clienteFalso({ logado: false });

    const resposta = await responderExport(cliente, AGORA);

    expect(resposta.status).toBe(401);
    expect(await resposta.json()).toEqual({ erro: 'sem-sessao' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('com o banco fora, responde 500 genérico e registra só o código', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { cliente } = clienteFalso({ resposta: { data: null, error: { code: '57014' } } });

    const resposta = await responderExport(cliente, AGORA);

    expect(resposta.status).toBe(500);
    expect(resposta.headers.get('Content-Disposition')).toBeNull();
    expect(await resposta.json()).toEqual({ erro: 'falha-ao-exportar' });
    expect(JSON.parse(String(erro.mock.calls[0]?.[0]))).toMatchObject({
      evento: 'exportacao_falhou',
      codigo: '57014',
    });
  });
});
