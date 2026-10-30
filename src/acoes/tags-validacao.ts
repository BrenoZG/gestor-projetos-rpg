import 'server-only';
import { z } from 'zod';

import { LIMITES_MISSAO } from '@/dominio/missoes/campos';

/**
 * Validação do nome de tag na fronteira (Server Actions). Só roda no servidor
 * (`server-only`): o Zod fica fora do bundle do navegador.
 */

const { nomeTag } = LIMITES_MISSAO;

const MENSAGEM_TAMANHO = `A tag precisa ter de ${nomeTag.minimo} a ${nomeTag.maximo} caracteres.`;

const esquemaNome = z
  .string({ error: MENSAGEM_TAMANHO })
  .trim()
  .min(nomeTag.minimo, MENSAGEM_TAMANHO)
  .max(nomeTag.maximo, MENSAGEM_TAMANHO);

export type ResultadoValidacaoTag = { ok: true; nome: string } | { ok: false; mensagem: string };

/**
 * Confere o nome novo de uma tag com a mesma regra da criação (RF-28).
 *
 * @param valor - Valor recebido do cliente (qualquer tipo, num POST direto).
 * @returns O nome sem espaços nas pontas, ou a mensagem para a tela.
 */
export function validarNomeDaTag(valor: unknown): ResultadoValidacaoTag {
  const resultado = esquemaNome.safeParse(valor);
  return resultado.success ? { ok: true, nome: resultado.data } : { ok: false, mensagem: MENSAGEM_TAMANHO };
}

/**
 * Traduz o erro da `renomear_tag` para a tela.
 *
 * @param codigo - SQLSTATE devolvido pelo banco.
 * @returns A mensagem para o usuário, sem detalhe interno.
 */
export function mensagemDoErroDaTag(codigo: string | undefined): string {
  switch (codigo) {
    case 'P0002':
      return 'Esta tag não existe mais.';
    case '23514':
      return MENSAGEM_TAMANHO;
    default:
      return 'Não foi possível salvar agora. Tente de novo em instantes.';
  }
}
