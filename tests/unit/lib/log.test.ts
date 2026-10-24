import { afterEach, describe, expect, it, vi } from 'vitest';

import { registrarEvento } from '@/lib/log';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('registrarEvento', () => {
  it('escreve uma linha JSON com nível, evento, contexto e data ISO', () => {
    const saida = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registrarEvento('aviso', 'login_recusado', { causa: 'fora-da-allowlist' });

    expect(saida).toHaveBeenCalledOnce();
    const linha = JSON.parse(String(saida.mock.calls[0]?.[0]));
    expect(linha).toMatchObject({ nivel: 'aviso', evento: 'login_recusado', causa: 'fora-da-allowlist' });
    expect(new Date(linha.em).toISOString()).toBe(linha.em);
  });

  it.each([
    ['info', 'info'],
    ['aviso', 'warn'],
    ['erro', 'error'],
  ] as const)('usa o canal do console certo para o nível %s', (nivel, metodo) => {
    const saida = vi.spyOn(console, metodo).mockImplementation(() => {});
    registrarEvento(nivel, 'teste');
    expect(saida).toHaveBeenCalledOnce();
  });

  it('não deixa o contexto sobrescrever os campos fixos', () => {
    const saida = vi.spyOn(console, 'info').mockImplementation(() => {});
    registrarEvento('info', 'real', { evento: 'falso', nivel: 'falso' });
    const linha = JSON.parse(String(saida.mock.calls[0]?.[0]));
    expect(linha).toMatchObject({ nivel: 'info', evento: 'real' });
  });
});
