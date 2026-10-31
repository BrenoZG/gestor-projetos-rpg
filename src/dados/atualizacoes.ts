import type { DadosAtualizacao } from '@/dominio/atualizacoes/campos';
import { intervaloDaPagina, type FiltrosAtualizacoes } from '@/dominio/atualizacoes/filtros';
import { XP_CRIACAO_ATUALIZACAO } from '@/dominio/gamificacao/xp';
import { ehStatusMissao, type StatusMissao } from '@/dominio/missoes/campos';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

import {
  ErroDeMissao,
  lerResultadoMudancaStatus,
  type RecompensaDaConclusao,
  type ResultadoGravacao,
  type ResultadoMudancaStatus,
} from './missoes';

/**
 * Acesso às Atualizações no Postgres, sempre com a sessão do usuário: o RLS
 * garante que cada consulta só enxerga e altera as do próprio dono, e que a
 * Missão vinculada também é dele (RN-01).
 */

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

export type Atualizacao = {
  id: string;
  projetoId: string;
  nomeMissao: string;
  titulo: string;
  descricao: string;
  status: StatusMissao;
  concluidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

/** Linha de `atualizacoes` com o nome da Missão embutido pelo PostgREST. */
export type LinhaAtualizacao = {
  id: string;
  projeto_id: string;
  titulo: string;
  descricao: string;
  status: string;
  concluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  projetos: { nome: string } | ReadonlyArray<{ nome: string }> | null;
};

const COLUNAS_ATUALIZACAO =
  'id, projeto_id, titulo, descricao, status, concluido_em, criado_em, atualizado_em, projetos(nome)';

/**
 * Converte a linha do banco no formato das telas.
 *
 * @param linha - Linha de `atualizacoes` com o nome da Missão embutido.
 * @returns A Atualização.
 * @throws {Error} Se o status vindo do banco for desconhecido.
 */
export function mapearAtualizacao(linha: LinhaAtualizacao): Atualizacao {
  if (!ehStatusMissao(linha.status)) {
    throw new Error(`Status de Atualização desconhecido: ${linha.status}`);
  }
  const missao = Array.isArray(linha.projetos) ? linha.projetos[0] : linha.projetos;
  return {
    id: linha.id,
    projetoId: linha.projeto_id,
    nomeMissao: missao?.nome ?? '',
    titulo: linha.titulo,
    descricao: linha.descricao,
    status: linha.status,
    concluidoEm: linha.concluido_em,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

/**
 * Histórico de uma Missão, da Atualização mais recente para a mais antiga pela
 * data de criação (RF-09): editar ou concluir não muda a posição. O `id`
 * desempata as criadas no mesmo instante, para a ordem nunca variar.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function listarAtualizacoesDaMissao(
  supabase: ClienteSupabase,
  projetoId: string,
): Promise<Atualizacao[]> {
  const { data, error } = await supabase
    .from('atualizacoes')
    .select(COLUNAS_ATUALIZACAO)
    .eq('projeto_id', projetoId)
    .order('criado_em', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw new ErroDeMissao('listar_atualizacoes', error.code);
  return (data as unknown as LinhaAtualizacao[]).map(mapearAtualizacao);
}

/**
 * Uma página das Atualizações do usuário, com os filtros da página geral
 * (RF-10), mais recentes primeiro. A ordem é total (data de criação e `id`):
 * sem o desempate, itens do mesmo instante poderiam se repetir ou sumir entre
 * as páginas.
 *
 * @param filtros - Status, Missão e página já validados.
 * @returns Os itens da página e o total que bate com os filtros.
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function listarAtualizacoes(
  supabase: ClienteSupabase,
  filtros: FiltrosAtualizacoes,
): Promise<{ itens: Atualizacao[]; total: number }> {
  const { de, ate } = intervaloDaPagina(filtros.pagina);
  let consulta = supabase.from('atualizacoes').select(COLUNAS_ATUALIZACAO, { count: 'exact' });
  if (filtros.status) consulta = consulta.eq('status', filtros.status);
  if (filtros.missao) consulta = consulta.eq('projeto_id', filtros.missao);
  const { data, error, count } = await consulta
    .order('criado_em', { ascending: false })
    .order('id', { ascending: false })
    .range(de, ate);
  if (error) throw new ErroDeMissao('listar_atualizacoes', error.code);
  return { itens: (data as unknown as LinhaAtualizacao[]).map(mapearAtualizacao), total: count ?? 0 };
}

/**
 * Cria uma Atualização e grava o XP de criação na mesma transação
 * (`criar_atualizacao`, RN-06). O status nasce em Backlog (padrão do banco).
 *
 * @returns O id gravado, ou o código do erro do banco para a tela traduzir.
 */
export async function criarAtualizacao(
  supabase: ClienteSupabase,
  dados: DadosAtualizacao,
): Promise<ResultadoGravacao> {
  const { data, error } = await supabase.rpc('criar_atualizacao', {
    p_projeto_id: dados.projetoId,
    p_titulo: dados.titulo,
    p_descricao: dados.descricao,
    p_xp_criacao: XP_CRIACAO_ATUALIZACAO,
  });
  if (error) return { ok: false, codigo: error.code };
  return { ok: true, id: data as string };
}

/**
 * Altera título, descrição e a Missão vinculada (RN-01).
 *
 * @returns O id, ou o código do erro; `P0002` se não existir ou for de outro usuário.
 */
export async function editarAtualizacao(
  supabase: ClienteSupabase,
  id: string,
  dados: DadosAtualizacao,
): Promise<ResultadoGravacao> {
  const { data, error } = await supabase
    .from('atualizacoes')
    .update({ projeto_id: dados.projetoId, titulo: dados.titulo, descricao: dados.descricao })
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, codigo: error.code };
  return data.length > 0 ? { ok: true, id } : { ok: false, codigo: 'P0002' };
}

/**
 * Muda só o status e, ao concluir com recompensa, grava o XP na mesma
 * transação (`mudar_status_atualizacao`). Mover para o status atual não grava
 * nada (idempotente). O trigger grava a data de conclusão.
 *
 * @param recompensa - XP e Rank do Projeto na conclusão, ou `null` sem XP a gravar.
 * @returns Situação e o XP gravado.
 * @throws {ErroDeMissao} Se o banco falhar.
 */
export async function mudarStatusDaAtualizacao(
  supabase: ClienteSupabase,
  id: string,
  status: StatusMissao,
  recompensa: RecompensaDaConclusao | null,
): Promise<ResultadoMudancaStatus> {
  const { data, error } = await supabase.rpc('mudar_status_atualizacao', {
    p_id: id,
    p_status: status,
    p_xp: recompensa?.xp ?? null,
    p_rank: recompensa?.rank ?? null,
  });
  if (error) throw new ErroDeMissao('mudar_status_atualizacao', error.code);
  return lerResultadoMudancaStatus(data);
}

/**
 * Projeto vinculado a uma Atualização, para o Rank e a trilha da conclusão.
 *
 * @returns O id do Projeto, ou `null` se a Atualização não existe ou é de outro usuário.
 * @throws {ErroDeMissao} Se a leitura falhar.
 */
export async function obterProjetoDaAtualizacao(
  supabase: ClienteSupabase,
  id: string,
): Promise<string | null> {
  const { data, error } = await supabase.from('atualizacoes').select('projeto_id').eq('id', id).maybeSingle();
  if (error) throw new ErroDeMissao('ler_atualizacao', error.code);
  return data ? (data.projeto_id as string) : null;
}

/**
 * Atualizações concluídas de um Projeto, para o bônus da conclusão (RN-06).
 *
 * @throws {ErroDeMissao} Se a contagem falhar.
 */
export async function contarAtualizacoesConcluidas(
  supabase: ClienteSupabase,
  projetoId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('atualizacoes')
    .select('id', { count: 'exact', head: true })
    .eq('projeto_id', projetoId)
    .eq('status', 'concluido');
  if (error) throw new ErroDeMissao('contar_atualizacoes_concluidas', error.code);
  return count ?? 0;
}

/**
 * Exclui uma Atualização do usuário.
 *
 * @returns `true` se excluiu; `false` se não existia ou era de outro usuário.
 * @throws {ErroDeMissao} Se a exclusão falhar.
 */
export async function apagarAtualizacao(supabase: ClienteSupabase, id: string): Promise<boolean> {
  const { data, error } = await supabase.from('atualizacoes').delete().eq('id', id).select('id');
  if (error) throw new ErroDeMissao('excluir_atualizacao', error.code);
  return data.length > 0;
}
