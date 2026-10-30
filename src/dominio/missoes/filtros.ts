/**
 * Filtros do Quadro (RF-21, RF-25) e a vista escolhida (RF-22). Funções puras: os
 * filtros vivem na URL, para sobreviver ao recarregar e ao botão Voltar, e a
 * filtragem roda no navegador sobre as Missões que o Quadro já carregou.
 */

import { LIMITES_MISSAO, TIPOS_PROJETO, type TipoProjeto } from './campos';
import type { RankMissao } from './rank';

export type FiltrosMissao = {
  busca: string;
  /** Stack (Desenvolvimento) ou ferramenta (Geral): as duas moram na mesma lista. */
  stack: string | null;
  rank: RankMissao | null;
  tipo: TipoProjeto | null;
  tag: string | null;
};

export const VISTAS = ['quadro', 'lista'] as const;
export type Vista = (typeof VISTAS)[number];

export const RANKS: readonly RankMissao[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export const FILTROS_VAZIOS: FiltrosMissao = { busca: '', stack: null, rank: null, tipo: null, tag: null };

/** A busca cabe num nome de Missão; o que passar disso não muda o resultado. */
const TAMANHO_MAXIMO_BUSCA = LIMITES_MISSAO.nome.maximo;
const TAMANHO_MAXIMO_STACK = LIMITES_MISSAO.nomeStack.maximo;
const TAMANHO_MAXIMO_TAG = LIMITES_MISSAO.nomeTag.maximo;

/** O mínimo de uma Missão que os filtros leem; Missão Geral não tem Rank (`null`). */
type MissaoFiltravel = {
  nome: string;
  descricao: string;
  tipo: TipoProjeto;
  stacks: readonly string[];
  tags: readonly string[];
  rank: RankMissao | null;
};

/**
 * Texto para comparação: sem acentos, sem maiúsculas e sem espaços nas pontas.
 *
 * @param texto - Texto digitado ou gravado.
 * @returns O texto normalizado.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Missões que batem com todos os filtros, na ordem recebida.
 *
 * @param missoes - Missões carregadas.
 * @param filtros - Busca (nome ou descrição), stack, Rank, tipo e tag; vazio ou `null` não filtra.
 * @returns As Missões que passam em todos os filtros.
 */
export function filtrarMissoes<T extends MissaoFiltravel>(
  missoes: readonly T[],
  filtros: FiltrosMissao,
): T[] {
  const busca = normalizarTexto(filtros.busca);
  const stack = filtros.stack === null ? null : normalizarTexto(filtros.stack);
  const tag = filtros.tag === null ? null : normalizarTexto(filtros.tag);

  return missoes.filter(
    (missao) =>
      (busca === '' ||
        normalizarTexto(missao.nome).includes(busca) ||
        normalizarTexto(missao.descricao).includes(busca)) &&
      (stack === null || missao.stacks.some((item) => normalizarTexto(item) === stack)) &&
      (filtros.rank === null || missao.rank === filtros.rank) &&
      (filtros.tipo === null || missao.tipo === filtros.tipo) &&
      (tag === null || missao.tags.some((item) => normalizarTexto(item) === tag)),
  );
}

/**
 * Lê os filtros e a vista da URL. Valores desconhecidos (URL editada à mão)
 * viram o padrão, e textos longos são cortados.
 *
 * @param parametros - Query string da página.
 * @returns Filtros e vista válidos.
 */
export function lerParametros(parametros: URLSearchParams): { filtros: FiltrosMissao; vista: Vista } {
  const stack = (parametros.get('stack') ?? '').trim().slice(0, TAMANHO_MAXIMO_STACK);
  const tag = (parametros.get('tag') ?? '').trim().slice(0, TAMANHO_MAXIMO_TAG);
  const rank = parametros.get('rank');
  const tipo = parametros.get('tipo');
  const vista = parametros.get('vista');
  return {
    filtros: {
      busca: (parametros.get('busca') ?? '').slice(0, TAMANHO_MAXIMO_BUSCA),
      stack: stack === '' ? null : stack,
      rank: RANKS.find((item) => item === rank) ?? null,
      tipo: TIPOS_PROJETO.find((item) => item === tipo) ?? null,
      tag: tag === '' ? null : tag,
    },
    vista: VISTAS.find((item) => item === vista) ?? 'quadro',
  };
}

/**
 * Monta a query string dos filtros e da vista, omitindo o que está no padrão.
 *
 * @param filtros - Filtros atuais.
 * @param vista - Vista atual.
 * @returns Query string sem o `?` (vazia quando tudo está no padrão).
 */
export function escreverParametros(filtros: FiltrosMissao, vista: Vista): string {
  const parametros = new URLSearchParams();
  if (filtros.busca.trim() !== '') parametros.set('busca', filtros.busca);
  if (filtros.stack !== null) parametros.set('stack', filtros.stack);
  if (filtros.rank !== null) parametros.set('rank', filtros.rank);
  if (filtros.tipo !== null) parametros.set('tipo', filtros.tipo);
  if (filtros.tag !== null) parametros.set('tag', filtros.tag);
  if (vista !== 'quadro') parametros.set('vista', vista);
  return parametros.toString();
}

/**
 * Diz se algum filtro restringe a lista (busca só com espaços não conta).
 *
 * @param filtros - Filtros atuais.
 * @returns `true` se a lista exibida pode ser menor que a carregada.
 */
export function haFiltroAtivo(filtros: FiltrosMissao): boolean {
  return (
    filtros.busca.trim() !== '' ||
    filtros.stack !== null ||
    filtros.rank !== null ||
    filtros.tipo !== null ||
    filtros.tag !== null
  );
}

/**
 * Opções de um select de filtro por nome (stack ou tag). Um valor que veio da
 * URL e não existe mais nas Missões entra na lista, para o select mostrar o
 * filtro que está valendo em vez de "Todas".
 *
 * @param nomes - Nomes existentes nas Missões, já ordenados.
 * @param atual - Valor do filtro, ou `null`.
 * @returns Os nomes, com o atual no começo quando faltar.
 */
export function opcoesDoFiltro(nomes: readonly string[], atual: string | null): readonly string[] {
  return atual === null || nomes.includes(atual) ? nomes : [atual, ...nomes];
}
