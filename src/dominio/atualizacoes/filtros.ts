/**
 * Filtros e paginação da página geral de Atualizações (RF-10). Funções puras:
 * os filtros vivem na URL e a consulta roda no servidor, porque o volume
 * previsto (RNF-04: até 5.000 Atualizações) não cabe no navegador.
 */

import { ehStatusMissao, type StatusMissao } from '@/dominio/missoes/campos';
import { ehUuid } from '@/lib/uuid';

export const POR_PAGINA = 50;

/** 1.000 páginas × 50 = 50.000: muito acima do previsto, e barra números absurdos na URL. */
const PAGINA_MAXIMA = 1000;

export type FiltrosAtualizacoes = { status: StatusMissao | null; missao: string | null; pagina: number };

/**
 * Lê os filtros da URL. Valores desconhecidos (URL editada à mão) viram o
 * padrão, e a página fica entre 1 e o máximo.
 *
 * @param parametros - Query string da página.
 * @returns Filtros válidos.
 */
export function lerFiltrosAtualizacoes(parametros: URLSearchParams): FiltrosAtualizacoes {
  const status = parametros.get('status') ?? '';
  const missao = parametros.get('missao') ?? '';
  const pagina = Number(parametros.get('pagina'));
  return {
    status: ehStatusMissao(status) ? status : null,
    missao: ehUuid(missao) ? missao : null,
    pagina: Number.isInteger(pagina) && pagina >= 1 ? Math.min(pagina, PAGINA_MAXIMA) : 1,
  };
}

/**
 * Monta a query string dos filtros, omitindo o que está no padrão.
 *
 * @param filtros - Filtros atuais.
 * @returns Query string sem o `?` (vazia quando tudo está no padrão).
 */
export function escreverFiltrosAtualizacoes(filtros: FiltrosAtualizacoes): string {
  const parametros = new URLSearchParams();
  if (filtros.status) parametros.set('status', filtros.status);
  if (filtros.missao) parametros.set('missao', filtros.missao);
  if (filtros.pagina > 1) parametros.set('pagina', String(filtros.pagina));
  return parametros.toString();
}

/**
 * Linhas de uma página, no formato do `.range()` do PostgREST (inclusivo).
 *
 * @param pagina - Página a partir de 1.
 * @returns Primeira e última linha (base 0).
 */
export function intervaloDaPagina(pagina: number): { de: number; ate: number } {
  const de = (pagina - 1) * POR_PAGINA;
  return { de, ate: de + POR_PAGINA - 1 };
}

/**
 * Quantas páginas um total ocupa; nunca menos de 1 (a página vazia também existe).
 *
 * @param total - Atualizações que batem com os filtros.
 * @returns Número de páginas.
 */
export function totalDePaginas(total: number): number {
  return Math.max(1, Math.ceil(total / POR_PAGINA));
}
