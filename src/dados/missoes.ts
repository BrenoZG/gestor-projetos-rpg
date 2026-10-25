import { ehStatusMissao, type DadosMissao, type StatusMissao } from '@/dominio/missoes/campos';
import { rankDaMissao, type RankMissao } from '@/dominio/missoes/rank';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

/**
 * Acesso às Missões no Postgres, sempre com a sessão do usuário: o RLS garante
 * que cada consulta só enxerga e altera as Missões do próprio dono.
 */

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

export type Missao = {
  id: string;
  nome: string;
  descricao: string;
  arquitetura: string | null;
  dificuldade: number;
  status: StatusMissao;
  stacks: string[];
  rank: RankMissao;
  inicioDesenvolvimentoEm: string | null;
  concluidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

/** Linha de `projetos` com as stacks embutidas pelo PostgREST (via `projeto_stacks`). */
export type LinhaMissao = {
  id: string;
  nome: string;
  descricao: string;
  arquitetura: string | null;
  dificuldade: number;
  status: string;
  inicio_desenvolvimento_em: string | null;
  concluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  projeto_stacks: ReadonlyArray<{ stacks: { nome: string } | ReadonlyArray<{ nome: string }> | null }>;
};

const COLUNAS_MISSAO =
  'id, nome, descricao, arquitetura, dificuldade, status, inicio_desenvolvimento_em, concluido_em, criado_em, atualizado_em, projeto_stacks(stacks(nome))';

/**
 * Converte a linha do banco no formato das telas, com o Rank derivado.
 *
 * @param linha - Linha de `projetos` com as stacks embutidas.
 * @returns A Missão, com as stacks em ordem alfabética.
 * @throws {Error} Se o status vindo do banco for desconhecido.
 */
export function mapearMissao(linha: LinhaMissao): Missao {
  if (!ehStatusMissao(linha.status)) {
    throw new Error(`Status de Missão desconhecido: ${linha.status}`);
  }
  const stacks = linha.projeto_stacks
    .flatMap(({ stacks: stack }) => (stack === null ? [] : Array.isArray(stack) ? stack : [stack]))
    .map(({ nome }) => nome)
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  return {
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    arquitetura: linha.arquitetura,
    dificuldade: linha.dificuldade,
    status: linha.status,
    stacks,
    rank: rankDaMissao(linha.dificuldade, stacks.length),
    inicioDesenvolvimentoEm: linha.inicio_desenvolvimento_em,
    concluidoEm: linha.concluido_em,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
}

/** Erro de banco reduzido ao código (SQLSTATE), o único dado que vai para o log. */
export class ErroDeMissao extends Error {
  constructor(
    readonly operacao: string,
    readonly codigo: string | undefined,
  ) {
    super(`Falha em ${operacao} (${codigo ?? 'sem código'})`);
    this.name = 'ErroDeMissao';
  }
}

/**
 * Missões do usuário, da edição mais recente para a mais antiga.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function listarMissoes(supabase: ClienteSupabase): Promise<Missao[]> {
  const { data, error } = await supabase
    .from('projetos')
    .select(COLUNAS_MISSAO)
    .order('atualizado_em', { ascending: false });
  if (error) throw new ErroDeMissao('listar_missoes', error.code);
  return (data as unknown as LinhaMissao[]).map(mapearMissao);
}

/**
 * Uma Missão do usuário.
 *
 * @returns A Missão, ou `null` se não existir ou for de outro usuário (o RLS a esconde).
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function obterMissao(supabase: ClienteSupabase, id: string): Promise<Missao | null> {
  const { data, error } = await supabase.from('projetos').select(COLUNAS_MISSAO).eq('id', id).maybeSingle();
  if (error) throw new ErroDeMissao('obter_missao', error.code);
  return data ? mapearMissao(data as unknown as LinhaMissao) : null;
}

/**
 * Nomes das stacks já cadastradas pelo usuário, para o autocompletar.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function listarNomesDeStacks(supabase: ClienteSupabase): Promise<string[]> {
  const { data, error } = await supabase.from('stacks').select('nome').order('nome');
  if (error) throw new ErroDeMissao('listar_stacks', error.code);
  return data.map(({ nome }) => nome as string);
}

export type ResultadoGravacao = { ok: true; id: string } | { ok: false; codigo: string | undefined };

/**
 * Cria (sem `id`) ou altera uma Missão com as stacks, numa transação (`salvar_missao`).
 *
 * @param id - Missão a alterar, ou `null` para criar.
 * @returns O id gravado, ou o código do erro do banco para a tela traduzir.
 */
export async function salvarMissao(
  supabase: ClienteSupabase,
  id: string | null,
  dados: DadosMissao,
): Promise<ResultadoGravacao> {
  const { data, error } = await supabase.rpc('salvar_missao', {
    p_id: id,
    p_nome: dados.nome,
    p_descricao: dados.descricao,
    p_arquitetura: dados.arquitetura,
    p_dificuldade: dados.dificuldade,
    p_status: dados.status,
    p_stacks: dados.stacks,
  });
  if (error) return { ok: false, codigo: error.code };
  return { ok: true, id: data as string };
}

/**
 * Exclui uma Missão do usuário (os vínculos com as stacks saem em cascata).
 *
 * @returns `true` se excluiu; `false` se não existia ou era de outro usuário.
 * @throws {ErroDeMissao} Se a exclusão falhar.
 */
export async function apagarMissao(supabase: ClienteSupabase, id: string): Promise<boolean> {
  const { data, error } = await supabase.from('projetos').delete().eq('id', id).select('id');
  if (error) throw new ErroDeMissao('excluir_missao', error.code);
  return data.length > 0;
}
