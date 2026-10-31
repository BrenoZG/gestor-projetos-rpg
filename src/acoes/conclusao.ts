import 'server-only';

import { contarAtualizacoesConcluidas, obterProjetoDaAtualizacao } from '@/dados/atualizacoes';
import { obterMissao, type RecompensaDaConclusao } from '@/dados/missoes';
import { jaRecebeuConclusaoDoProjeto } from '@/dados/progressao';
import {
  avaliarConclusaoProjeto,
  trilhaDoTipo,
  xpConclusaoAtualizacao,
  type AvaliacaoConclusao,
  type Trilha,
} from '@/dominio/gamificacao/xp';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

/**
 * Prepara a conclusão de um item antes de gravar (ADR-0003): lê o Projeto,
 * calcula o XP no domínio e devolve o que a função do banco grava e o que a
 * tela precisa para explicar o resultado. Sem `'use server'`: nada daqui vira
 * endpoint.
 */

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

export type PreparoConclusao = {
  avaliacao: AvaliacaoConclusao;
  trilha: Trilha;
  /** O que gravar no ledger; `null` quando não há XP (trava ou XP já recebido). */
  recompensa: RecompensaDaConclusao | null;
};

/**
 * Conclusão de Projeto: Rank, Atualizações concluídas, XP já recebido e a trava de 24 h (RN-06).
 *
 * @returns O preparo, ou `null` se o Projeto não existe ou é de outro usuário.
 * @throws {ErroDeMissao} Se uma leitura falhar.
 */
export async function prepararConclusaoDaMissao(
  supabase: ClienteSupabase,
  id: string,
): Promise<PreparoConclusao | null> {
  const missao = await obterMissao(supabase, id);
  if (!missao) return null;
  const [atualizacoesConcluidas, jaRecebido] = await Promise.all([
    contarAtualizacoesConcluidas(supabase, id),
    jaRecebeuConclusaoDoProjeto(supabase, id),
  ]);
  const avaliacao = avaliarConclusaoProjeto({
    rank: missao.rank,
    atualizacoesConcluidas,
    inicioDesenvolvimentoEm: missao.inicioDesenvolvimentoEm ? new Date(missao.inicioDesenvolvimentoEm) : null,
    agora: new Date(),
    jaRecebido,
  });
  return {
    avaliacao,
    trilha: trilhaDoTipo(missao.tipo),
    recompensa: avaliacao.concede ? { xp: avaliacao.xp, rank: missao.rank } : null,
  };
}

/**
 * Conclusão de Atualização: XP pelo Rank do Projeto vinculado, sem trava.
 *
 * @returns O preparo, ou `null` se a Atualização não existe ou é de outro usuário.
 * @throws {ErroDeMissao} Se uma leitura falhar.
 */
export async function prepararConclusaoDaAtualizacao(
  supabase: ClienteSupabase,
  id: string,
): Promise<PreparoConclusao | null> {
  const projetoId = await obterProjetoDaAtualizacao(supabase, id);
  const missao = projetoId ? await obterMissao(supabase, projetoId) : null;
  if (!missao) return null;
  const xp = xpConclusaoAtualizacao(missao.rank);
  return {
    avaliacao: { concede: true, xp },
    trilha: trilhaDoTipo(missao.tipo),
    recompensa: { xp, rank: missao.rank },
  };
}
