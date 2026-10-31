import type { Trilha } from '@/dominio/gamificacao/xp';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

import { ErroDeMissao } from './missoes';

/**
 * Leitura do ledger de XP (`eventos_xp`) com a sessão do usuário: o RLS só
 * deixa somar os eventos do próprio dono.
 */

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

export type XpPorTrilha = Record<Trilha, number>;

type LinhaResumo = { trilha: string; xp_total: number };

/**
 * XP total de cada trilha (RF-12, RN-18), pela função `resumo_xp`, que soma no
 * banco. Trilha sem evento fica com zero.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function obterXpPorTrilha(supabase: ClienteSupabase): Promise<XpPorTrilha> {
  const { data, error } = await supabase.rpc('resumo_xp');
  if (error) throw new ErroDeMissao('resumo_xp', error.code);
  const xp: XpPorTrilha = { desenvolvedor: 0, produtividade: 0 };
  for (const { trilha, xp_total } of data as LinhaResumo[]) {
    if (trilha === 'desenvolvedor' || trilha === 'produtividade') xp[trilha] = xp_total;
  }
  return xp;
}

/** XP de conclusão de Projetos de uma stack (ou ferramenta) numa trilha (RN-10, RN-18). */
export type LinhaMaestria = { trilha: Trilha; nome: string; xp: number; projetos: number };

type LinhaMaestriaBanco = { trilha: string; nome: string; xp: number; projetos: number };

function ehTrilha(valor: string): valor is Trilha {
  return valor === 'desenvolvedor' || valor === 'produtividade';
}

/**
 * Maestria e Domínio do usuário, pela função `maestria`, que soma no banco
 * (grão: trilha + stack; o XP de um Projeto conta inteiro para cada stack).
 * A ordem vem do banco: trilha e depois o maior XP.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function obterMaestria(supabase: ClienteSupabase): Promise<LinhaMaestria[]> {
  const { data, error } = await supabase.rpc('maestria');
  if (error) throw new ErroDeMissao('maestria', error.code);
  return (data as LinhaMaestriaBanco[]).flatMap(({ trilha, nome, xp, projetos }) =>
    ehTrilha(trilha) ? [{ trilha, nome, xp, projetos }] : [],
  );
}

/**
 * O Projeto já tem XP de conclusão no ledger (RN-06a)? Serve para a tela não
 * pedir as 24 h de um XP que não volta. A unicidade continua garantida pelo
 * banco; esta leitura só escolhe o texto.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function jaRecebeuConclusaoDoProjeto(
  supabase: ClienteSupabase,
  projetoId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from('eventos_xp')
    .select('id', { count: 'exact', head: true })
    .eq('referencia_id', projetoId)
    .eq('tipo', 'conclusao_projeto');
  if (error) throw new ErroDeMissao('ler_conclusao_projeto', error.code);
  return (count ?? 0) > 0;
}
