import type { DadosAtualizacao } from '@/dominio/atualizacoes/campos';
import { ehStatusMissao, type StatusMissao } from '@/dominio/missoes/campos';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

import { ErroDeMissao, type ResultadoGravacao, type ResultadoMudancaStatus } from './missoes';

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
 * data de criação (RF-09): editar ou concluir não muda a posição.
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
    .order('criado_em', { ascending: false });
  if (error) throw new ErroDeMissao('listar_atualizacoes', error.code);
  return (data as unknown as LinhaAtualizacao[]).map(mapearAtualizacao);
}

/**
 * Cria uma Atualização. O status nasce em Backlog (padrão do banco).
 *
 * @returns O id gravado, ou o código do erro do banco para a tela traduzir.
 */
export async function criarAtualizacao(
  supabase: ClienteSupabase,
  dados: DadosAtualizacao,
): Promise<ResultadoGravacao> {
  const { data, error } = await supabase
    .from('atualizacoes')
    .insert({ projeto_id: dados.projetoId, titulo: dados.titulo, descricao: dados.descricao })
    .select('id')
    .single();
  if (error) return { ok: false, codigo: error.code };
  return { ok: true, id: data.id as string };
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
 * Muda só o status. Mover para o status atual não grava nada (idempotente),
 * para não mexer na "última edição". O trigger grava a data de conclusão.
 *
 * @throws {ErroDeMissao} Se o banco falhar.
 */
export async function mudarStatusDaAtualizacao(
  supabase: ClienteSupabase,
  id: string,
  status: StatusMissao,
): Promise<ResultadoMudancaStatus> {
  const { data, error } = await supabase
    .from('atualizacoes')
    .update({ status })
    .eq('id', id)
    .neq('status', status)
    .select('id');
  if (error) throw new ErroDeMissao('mudar_status_atualizacao', error.code);
  if (data.length > 0) return 'movida';

  const { data: existente, error: erroLeitura } = await supabase
    .from('atualizacoes')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (erroLeitura) throw new ErroDeMissao('mudar_status_atualizacao', erroLeitura.code);
  return existente ? 'sem_mudanca' : 'inexistente';
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
