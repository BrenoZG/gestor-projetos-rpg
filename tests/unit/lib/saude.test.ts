import { describe, expect, it } from 'vitest';

import { verificarSaude } from '@/lib/saude';

const LIMITE_MS = 50;

describe('verificarSaude', () => {
  it('responde ok quando o banco confirma', async () => {
    expect(await verificarSaude(async () => true, LIMITE_MS)).toEqual({ status: 'ok' });
  });

  it('responde indisponível quando o banco nega', async () => {
    expect(await verificarSaude(async () => false, LIMITE_MS)).toEqual({
      status: 'indisponivel',
      causa: 'resposta-invalida',
    });
  });

  it('responde indisponível quando a consulta lança erro', async () => {
    const falhar = async (): Promise<boolean> => {
      throw new Error('conexão recusada');
    };
    expect(await verificarSaude(falhar, LIMITE_MS)).toEqual({ status: 'indisponivel', causa: 'erro' });
  });

  it('não espera um banco travado além do limite', async () => {
    const travado = () => new Promise<boolean>(() => {});
    const inicio = performance.now();
    const resultado = await verificarSaude(travado, LIMITE_MS);
    expect(resultado).toEqual({ status: 'indisponivel', causa: 'tempo-esgotado' });
    expect(performance.now() - inicio).toBeLessThan(LIMITE_MS * 10);
  });

  it('entrega à consulta um sinal de cancelamento que dispara no limite', async () => {
    let sinalRecebido: AbortSignal | undefined;
    await verificarSaude((sinal) => {
      sinalRecebido = sinal;
      return new Promise<boolean>(() => {});
    }, LIMITE_MS);
    expect(sinalRecebido?.aborted).toBe(true);
  });
});
