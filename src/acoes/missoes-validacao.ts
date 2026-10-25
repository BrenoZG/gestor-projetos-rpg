import 'server-only';
import { z } from 'zod';

import type { CampoMissao, ErrosMissao } from '@/acoes/missoes-estado';
import { LIMITES_MISSAO, STATUS_MISSAO, type DadosMissao } from '@/dominio/missoes/campos';
import { deduplicarStacks } from '@/dominio/missoes/normalizacao';

/**
 * Validação do formulário de Missão, na fronteira (Server Actions). Só roda no
 * servidor (`server-only` faz o build falhar se um componente de cliente a
 * importar): o Zod fica fora do bundle do navegador, que a CSP protege.
 * As mensagens dizem a causa e como corrigir.
 */

export type ResultadoValidacao = { ok: true; dados: DadosMissao } | { ok: false; erros: ErrosMissao };

const { nome, descricao, arquitetura, stacks, nomeStack, dificuldade } = LIMITES_MISSAO;

const MENSAGENS = {
  nome: `O nome precisa ter de ${nome.minimo} a ${nome.maximo} caracteres.`,
  descricaoVazia: 'A descrição é obrigatória.',
  descricaoLonga: 'A descrição aceita até 2.000 caracteres.',
  arquitetura: 'A estrutura aceita até 20.000 caracteres.',
  dificuldade: 'Escolha uma dificuldade de 1 (Trivial) a 5 (Extremo).',
  status: 'Escolha Backlog, Desenvolvimento ou Concluído.',
  quantidadeStacks: `Adicione de ${stacks.minimo} a ${stacks.maximo} stacks.`,
} as const;

/** Campo ausente no formulário chega como `null`/`undefined`; vira texto vazio. */
const texto = (esquema: z.ZodType) => z.preprocess((valor) => valor ?? '', esquema);

const esquemaMissao = z.object({
  nome: texto(
    z
      .string({ error: MENSAGENS.nome })
      .trim()
      .min(nome.minimo, MENSAGENS.nome)
      .max(nome.maximo, MENSAGENS.nome),
  ),
  descricao: texto(
    z
      .string({ error: MENSAGENS.descricaoVazia })
      .trim()
      .min(descricao.minimo, MENSAGENS.descricaoVazia)
      .max(descricao.maximo, MENSAGENS.descricaoLonga),
  ),
  arquitetura: texto(
    z
      .string({ error: MENSAGENS.arquitetura })
      .trim()
      .max(arquitetura.maximo, MENSAGENS.arquitetura)
      .transform((valor) => valor || null),
  ),
  dificuldade: z.coerce
    .number({ error: MENSAGENS.dificuldade })
    .int(MENSAGENS.dificuldade)
    .min(dificuldade.minimo, MENSAGENS.dificuldade)
    .max(dificuldade.maximo, MENSAGENS.dificuldade),
  status: z.enum(STATUS_MISSAO, { error: MENSAGENS.status }),
  stacks: z
    .preprocess(
      (valor) => (typeof valor === 'string' ? [valor] : (valor ?? [])),
      z.array(z.string(), { error: MENSAGENS.quantidadeStacks }),
    )
    .transform(deduplicarStacks)
    .pipe(
      z
        .array(z.string())
        .min(stacks.minimo, MENSAGENS.quantidadeStacks)
        .max(stacks.maximo, MENSAGENS.quantidadeStacks)
        .superRefine((lista, contexto) => {
          const longa = lista.find((stack) => stack.length > nomeStack.maximo);
          if (longa) {
            contexto.addIssue({
              code: 'custom',
              message: `Cada stack aceita até ${nomeStack.maximo} caracteres: "${longa}".`,
            });
          }
        }),
    ),
});

/**
 * Valida e limpa os campos do formulário de Missão.
 *
 * @param entrada - Valores do formulário (`stacks` pode ser lista ou texto único).
 * @returns Os dados prontos para gravar, ou a primeira mensagem de erro de cada campo.
 */
export function validarFormularioMissao(entrada: Record<string, unknown>): ResultadoValidacao {
  const resultado = esquemaMissao.safeParse(entrada);
  if (resultado.success) return { ok: true, dados: resultado.data as DadosMissao };

  const erros: ErrosMissao = {};
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0] as CampoMissao;
    erros[campo] ??= problema.message;
  }
  return { ok: false, erros };
}

export type ErroDoBanco = { campo: CampoMissao | null; mensagem: string };

/**
 * Traduz o código de erro do Postgres em mensagem para o usuário, sem expor detalhes.
 *
 * @param codigo - SQLSTATE devolvido pelo Supabase (ex.: `23505`).
 * @returns Campo afetado (ou `null` para aviso geral) e a mensagem.
 */
export function mensagemDoErroDoBanco(codigo: string | undefined): ErroDoBanco {
  switch (codigo) {
    case '23505':
      return { campo: 'nome', mensagem: 'Já existe uma missão com esse nome. Escolha outro.' };
    case 'P0002':
      return { campo: null, mensagem: 'Esta missão não existe mais.' };
    case '23514':
    case '22023':
      return { campo: null, mensagem: 'Algum campo está fora das regras. Revise e tente de novo.' };
    default:
      return { campo: null, mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.' };
  }
}
