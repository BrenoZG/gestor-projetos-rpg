import 'server-only';
import { z } from 'zod';

import type { CampoAtualizacao, ErrosAtualizacao } from '@/acoes/atualizacoes-estado';
import { LIMITES_ATUALIZACAO, type DadosAtualizacao } from '@/dominio/atualizacoes/campos';
import { ehUuid } from '@/lib/uuid';

/**
 * Validação do formulário de Atualização, na fronteira (Server Actions). Só
 * roda no servidor (`server-only`): o Zod fica fora do bundle do navegador.
 */

export type ResultadoValidacaoAtualizacao =
  { ok: true; dados: DadosAtualizacao } | { ok: false; erros: ErrosAtualizacao };

const { titulo, descricao } = LIMITES_ATUALIZACAO;

const MENSAGENS = {
  titulo: `O título precisa ter de ${titulo.minimo} a ${titulo.maximo} caracteres.`,
  descricaoVazia: 'Descreva o que foi feito.',
  descricaoLonga: 'A descrição aceita até 5.000 caracteres.',
  missao: 'Escolha uma das suas missões.',
} as const;

/** Campo ausente no formulário chega como `null`/`undefined`; vira texto vazio. */
const texto = (esquema: z.ZodType) => z.preprocess((valor) => valor ?? '', esquema);

const esquemaAtualizacao = z.object({
  titulo: texto(
    z
      .string({ error: MENSAGENS.titulo })
      .trim()
      .min(titulo.minimo, MENSAGENS.titulo)
      .max(titulo.maximo, MENSAGENS.titulo),
  ),
  descricao: texto(
    z
      .string({ error: MENSAGENS.descricaoVazia })
      .trim()
      .min(descricao.minimo, MENSAGENS.descricaoVazia)
      .max(descricao.maximo, MENSAGENS.descricaoLonga),
  ),
  projetoId: z.string({ error: MENSAGENS.missao }).refine(ehUuid, MENSAGENS.missao),
});

/**
 * Valida e limpa os campos do formulário de Atualização.
 *
 * @param entrada - Valores do formulário.
 * @returns Os dados prontos para gravar, ou a primeira mensagem de erro de cada campo.
 */
export function validarFormularioAtualizacao(
  entrada: Record<string, unknown>,
): ResultadoValidacaoAtualizacao {
  const resultado = esquemaAtualizacao.safeParse(entrada);
  if (resultado.success) return { ok: true, dados: resultado.data as DadosAtualizacao };

  const erros: ErrosAtualizacao = {};
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0] as CampoAtualizacao;
    erros[campo] ??= problema.message;
  }
  return { ok: false, erros };
}

/**
 * Traduz o código de erro do Postgres em mensagem para o usuário, sem expor detalhes.
 *
 * @param codigo - SQLSTATE devolvido pelo Supabase.
 * @returns Campo afetado (ou `null` para aviso geral) e a mensagem.
 */
export function mensagemDoErroDaAtualizacao(codigo: string | undefined): {
  campo: CampoAtualizacao | null;
  mensagem: string;
} {
  switch (codigo) {
    // 42501: o RLS barrou a Missão (de outro usuário ou inexistente); 23503: a Missão sumiu.
    case '42501':
    case '23503':
      return { campo: 'projetoId', mensagem: MENSAGENS.missao };
    case '23514':
      return { campo: null, mensagem: 'Algum campo está fora das regras. Revise e tente de novo.' };
    default:
      return { campo: null, mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.' };
  }
}
