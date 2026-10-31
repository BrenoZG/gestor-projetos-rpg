import 'server-only';
import { z } from 'zod';

import { CHAVES_CLASSE, type ChaveClasse } from '@/dominio/personagem/classes';
import { NIVEL_MAXIMO } from '@/dominio/progressao/progressao';

/**
 * Validação da Classe na fronteira (Server Actions). Só roda no servidor
 * (`server-only`): o Zod fica fora do bundle do navegador.
 */

const MENSAGEM_CLASSE = 'Escolha uma das 8 classes.';

const esquemaClasse = z.enum(CHAVES_CLASSE as [ChaveClasse, ...ChaveClasse[]]);

export type ResultadoValidacaoClasse = { ok: true; classe: ChaveClasse } | { ok: false; mensagem: string };

/**
 * Confere se o valor é uma das 8 chaves de requisitos.md §6 (a mesma lista do CHECK no banco).
 *
 * @param valor - Valor recebido do cliente (qualquer tipo, num POST direto).
 * @returns A chave, ou a mensagem para a tela.
 */
export function validarClasse(valor: unknown): ResultadoValidacaoClasse {
  const resultado = esquemaClasse.safeParse(valor);
  return resultado.success ? { ok: true, classe: resultado.data } : { ok: false, mensagem: MENSAGEM_CLASSE };
}

const esquemaNivel = z.number().int().min(1).max(NIVEL_MAXIMO);

/**
 * Confere o nível da cinemática que o cliente diz ter exibido (RF-16).
 *
 * @param valor - Valor recebido do cliente (qualquer tipo, num POST direto).
 * @returns O nível de 1 a 100, ou `null` se inválido.
 */
export function validarNivelVisto(valor: unknown): number | null {
  const resultado = esquemaNivel.safeParse(valor);
  return resultado.success ? resultado.data : null;
}
