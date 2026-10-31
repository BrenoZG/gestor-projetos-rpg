import 'server-only';
import { z } from 'zod';

import type { CampoMissao, ErrosMissao } from '@/acoes/missoes-estado';
import {
  CAPACIDADES,
  ESTILOS_ARQUITETURAIS,
  LIMITES_MISSAO,
  STATUS_MISSAO,
  TIPOS_PROJETO,
  ehTipoProjeto,
  type DadosMissao,
  type LinkReferencia,
} from '@/dominio/missoes/campos';
import { validarUrlDeLink, type MotivoLinkInvalido } from '@/dominio/missoes/links';
import { deduplicarNomes } from '@/dominio/missoes/normalizacao';

/**
 * Validação do formulário de Missão, na fronteira (Server Actions). Só roda no
 * servidor (`server-only` faz o build falhar se um componente de cliente a
 * importar): o Zod fica fora do bundle do navegador, que a CSP protege.
 * As mensagens dizem a causa e como corrigir.
 *
 * O formulário é validado em três partes, e os erros de todas aparecem juntos:
 * os campos comuns, os campos do tipo (RN-15) e os links (RN-17).
 */

export type ResultadoValidacao = { ok: true; dados: DadosMissao } | { ok: false; erros: ErrosMissao };

/** No cadastro o status inicial é escolhido; na edição ele não muda. */
export type ModoFormulario = 'criar' | 'editar';

const { nome, descricao, arquitetura, stacks, nomeStack, ferramentas, tags, nomeTag, links, tituloLink } =
  LIMITES_MISSAO;

const MENSAGENS = {
  tipo: 'Escolha o tipo do projeto: Desenvolvimento ou Geral.',
  nome: `O nome precisa ter de ${nome.minimo} a ${nome.maximo} caracteres.`,
  descricaoVazia: 'A descrição é obrigatória.',
  descricaoLonga: 'A descrição aceita até 2.000 caracteres.',
  arquiteturaVazia: 'Descreva a estrutura e a arquitetura do projeto.',
  arquiteturaLonga: 'A estrutura aceita até 20.000 caracteres.',
  estilo: 'Escolha o estilo arquitetural do projeto.',
  capacidades: 'Marque só capacidades da lista.',
  status: 'Escolha Backlog, Desenvolvimento ou Concluído.',
  quantidadeStacks: `Adicione de ${stacks.minimo} a ${stacks.maximo} stacks.`,
  quantidadeFerramentas: `Adicione até ${ferramentas.maximo} ferramentas.`,
  quantidadeTags: `Use até ${tags.maximo} tags.`,
  quantidadeLinks: `Adicione até ${links.maximo} links.`,
} as const;

const MENSAGENS_DO_LINK: Readonly<Record<MotivoLinkInvalido, string>> = {
  formato: 'o endereço precisa começar com https:// e ser válido.',
  protocolo: 'o endereço precisa começar com https:// e ser válido.',
  credenciais: 'tire o usuário e a senha do endereço.',
  tamanho: 'o endereço aceita até 2.000 caracteres.',
};

/** Campo ausente no formulário chega como `null`/`undefined`; vira texto vazio. */
const texto = (esquema: z.ZodType) => z.preprocess((valor) => valor ?? '', esquema);

/** Campo repetível: um só valor chega como texto; nenhum, como `null`. */
const comoLista = (valor: unknown): unknown => (typeof valor === 'string' ? [valor] : (valor ?? []));

type RegrasDaLista = {
  minimo: number;
  maximo: number;
  maximoCaracteres: number;
  mensagemQuantidade: string;
  /** Como o item é chamado na mensagem do nome longo ("stack", "ferramenta", "tag"). */
  item: string;
};

/** Lista de nomes digitados (stacks, ferramentas ou tags): sem repetição (RN-05) e dentro dos limites. */
function listaDeNomes({ minimo, maximo, maximoCaracteres, mensagemQuantidade, item }: RegrasDaLista) {
  return z
    .preprocess(comoLista, z.array(z.string(), { error: mensagemQuantidade }))
    .transform(deduplicarNomes)
    .pipe(
      z
        .array(z.string())
        .min(minimo, mensagemQuantidade)
        .max(maximo, mensagemQuantidade)
        .superRefine((lista, contexto) => {
          const longo = lista.find((nomeDigitado) => nomeDigitado.length > maximoCaracteres);
          if (longo) {
            contexto.addIssue({
              code: 'custom',
              message: `Cada ${item} aceita até ${maximoCaracteres} caracteres: "${longo}".`,
            });
          }
        }),
    );
}

const esquemaComum = z.object({
  tipo: texto(z.enum(TIPOS_PROJETO, { error: MENSAGENS.tipo })),
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
  tags: listaDeNomes({
    minimo: tags.minimo,
    maximo: tags.maximo,
    maximoCaracteres: nomeTag.maximo,
    mensagemQuantidade: MENSAGENS.quantidadeTags,
    item: 'tag',
  }),
});

const esquemaComumDoCadastro = esquemaComum.extend({
  status: z.enum(STATUS_MISSAO, { error: MENSAGENS.status }),
});

const esquemaDesenvolvimento = z.object({
  arquitetura: texto(
    z
      .string({ error: MENSAGENS.arquiteturaVazia })
      .trim()
      .min(arquitetura.minimo, MENSAGENS.arquiteturaVazia)
      .max(arquitetura.maximo, MENSAGENS.arquiteturaLonga),
  ),
  estilo: texto(z.enum(ESTILOS_ARQUITETURAIS, { error: MENSAGENS.estilo })),
  // Nenhuma marcada é válido; sem repetição e em ordem alfabética, como o banco grava.
  capacidades: z
    .preprocess(
      comoLista,
      z.array(z.enum(CAPACIDADES, { error: MENSAGENS.capacidades }), { error: MENSAGENS.capacidades }),
    )
    .transform((lista) => [...new Set(lista)].sort()),
  stacks: listaDeNomes({
    minimo: stacks.minimo,
    maximo: stacks.maximo,
    maximoCaracteres: nomeStack.maximo,
    mensagemQuantidade: MENSAGENS.quantidadeStacks,
    item: 'stack',
  }),
});

/** Na Missão Geral, os campos técnicos enviados são descartados (o Zod remove chaves fora do esquema). */
const esquemaGeral = z.object({
  stacks: listaDeNomes({
    minimo: ferramentas.minimo,
    maximo: ferramentas.maximo,
    maximoCaracteres: nomeStack.maximo,
    mensagemQuantidade: MENSAGENS.quantidadeFerramentas,
    item: 'ferramenta',
  }),
});

type ResultadoLinks = { ok: true; links: LinkReferencia[] } | { ok: false; mensagem: string };

const comoTextos = (valor: unknown): string[] =>
  (comoLista(valor) as unknown[]).map((item) => (typeof item === 'string' ? item : ''));

/**
 * Junta os campos `link_url` e `link_titulo` pela posição. Linha sem endereço
 * é descartada (linha deixada em branco no formulário); o número na mensagem é
 * a posição da linha na tela.
 */
function validarLinks(urls: unknown, titulos: unknown): ResultadoLinks {
  const listaDeTitulos = comoTextos(titulos);
  const preenchidos = comoTextos(urls)
    .map((url, indice) => ({ url, titulo: (listaDeTitulos[indice] ?? '').trim(), posicao: indice + 1 }))
    .filter(({ url }) => url.trim() !== '');
  if (preenchidos.length > links.maximo) return { ok: false, mensagem: MENSAGENS.quantidadeLinks };

  const validos: LinkReferencia[] = [];
  for (const { url, titulo, posicao } of preenchidos) {
    const endereco = validarUrlDeLink(url);
    if (!endereco.ok)
      return { ok: false, mensagem: `Link ${posicao}: ${MENSAGENS_DO_LINK[endereco.motivo]}` };
    if (titulo.length > tituloLink.maximo) {
      return { ok: false, mensagem: `Link ${posicao}: o título aceita até ${tituloLink.maximo} caracteres.` };
    }
    validos.push({ url: endereco.url, titulo: titulo === '' ? null : titulo });
  }
  return { ok: true, links: validos };
}

function coletarErros(problemas: readonly z.core.$ZodIssue[], erros: ErrosMissao): void {
  for (const problema of problemas) {
    const campo = problema.path[0] as CampoMissao;
    erros[campo] ??= problema.message;
  }
}

/**
 * Valida e limpa os campos do formulário de Missão.
 *
 * @param entrada - Valores do formulário (campos repetíveis podem chegar como lista ou texto único).
 * @param modo - `criar` exige o status inicial; `editar` não o lê (devolve `status: null`).
 * @returns Os dados prontos para gravar, ou a primeira mensagem de erro de cada campo.
 */
export function validarFormularioMissao(
  entrada: Record<string, unknown>,
  modo: ModoFormulario,
): ResultadoValidacao {
  const erros: ErrosMissao = {};
  const comum = (modo === 'criar' ? esquemaComumDoCadastro : esquemaComum).safeParse(entrada);
  if (!comum.success) coletarErros(comum.error.issues, erros);

  // Sem tipo válido não há como saber quais campos técnicos exigir: só o erro do tipo aparece.
  const tipo = typeof entrada.tipo === 'string' && ehTipoProjeto(entrada.tipo) ? entrada.tipo : null;
  const especifico =
    tipo === null ? null : (tipo === 'dev' ? esquemaDesenvolvimento : esquemaGeral).safeParse(entrada);
  if (especifico && !especifico.success) coletarErros(especifico.error.issues, erros);

  const resultadoLinks = validarLinks(entrada.link_url, entrada.link_titulo);
  if (!resultadoLinks.ok) erros.links = resultadoLinks.mensagem;

  if (!comum.success || !especifico?.success || !resultadoLinks.ok) return { ok: false, erros };

  const status = 'status' in comum.data ? comum.data.status : null;
  // O tipo (lido do esquema comum) e os campos do esquema do mesmo tipo formam a união de DadosMissao.
  const dados = { ...comum.data, ...especifico.data, status, links: resultadoLinks.links } as DadosMissao;
  return { ok: true, dados };
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
      return { campo: 'nome', mensagem: 'Já existe um projeto com esse nome. Escolha outro.' };
    case 'P0002':
      return { campo: null, mensagem: 'Este projeto não existe mais.' };
    case '23514':
    case '22023':
      return { campo: null, mensagem: 'Algum campo está fora das regras. Revise e tente de novo.' };
    default:
      return { campo: null, mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.' };
  }
}
