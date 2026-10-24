/** Tempo máximo do health check: um banco travado não pode travar o smoke test. */
export const LIMITE_SAUDE_MS = 3000;

export type CausaIndisponibilidade = 'erro' | 'tempo-esgotado' | 'resposta-invalida';

export type ResultadoSaude = { status: 'ok' } | { status: 'indisponivel'; causa: CausaIndisponibilidade };

/** Consulta ao banco; deve respeitar o sinal e abortar quando ele disparar. */
export type ConsultaSaude = (sinal: AbortSignal) => Promise<boolean>;

/**
 * Executa a consulta de saúde com limite de tempo.
 *
 * Nunca lança: qualquer falha vira `indisponivel`, com a causa para o log
 * interno (a resposta HTTP não a expõe).
 *
 * @param consultar - Consulta ao banco (ex.: RPC `verificar_saude`).
 * @param limiteMs - Tempo máximo de espera.
 * @returns `ok` ou `indisponivel` com a causa.
 */
export async function verificarSaude(
  consultar: ConsultaSaude,
  limiteMs: number = LIMITE_SAUDE_MS,
): Promise<ResultadoSaude> {
  const controle = new AbortController();
  let cronometro: ReturnType<typeof setTimeout> | undefined;
  const tempoEsgotado = new Promise<'tempo-esgotado'>((resolver) => {
    cronometro = setTimeout(() => {
      controle.abort();
      resolver('tempo-esgotado');
    }, limiteMs);
  });

  try {
    const resposta = await Promise.race([consultar(controle.signal), tempoEsgotado]);
    if (resposta === 'tempo-esgotado') return { status: 'indisponivel', causa: 'tempo-esgotado' };
    return resposta === true ? { status: 'ok' } : { status: 'indisponivel', causa: 'resposta-invalida' };
  } catch {
    return { status: 'indisponivel', causa: 'erro' };
  } finally {
    clearTimeout(cronometro);
  }
}
