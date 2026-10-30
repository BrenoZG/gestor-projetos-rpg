import {
  ehEstiloArquitetural,
  ehStatusMissao,
  ehTipoProjeto,
  type Capacidade,
  type DadosMissao,
  type EstiloArquitetural,
  type LinkReferencia,
  type StatusMissao,
} from '@/dominio/missoes/campos';
import {
  pontuacaoDaMissao,
  rankPorPontos,
  type PontuacaoMissao,
  type RankMissao,
} from '@/dominio/missoes/rank';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

/**
 * Acesso às Missões no Postgres, sempre com a sessão do usuário: o RLS garante
 * que cada consulta só enxerga e altera as Missões do próprio dono.
 */

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

type CamposComuns = {
  id: string;
  nome: string;
  descricao: string;
  status: StatusMissao;
  /** Stacks (Desenvolvimento) ou ferramentas (Geral), em ordem alfabética. */
  stacks: string[];
  tags: string[];
  links: LinkReferencia[];
  inicioDesenvolvimentoEm: string | null;
  concluidoEm: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type MissaoDesenvolvimento = CamposComuns & {
  tipo: 'dev';
  arquitetura: string;
  estilo: EstiloArquitetural;
  capacidades: Capacidade[];
  pontuacao: PontuacaoMissao;
  rank: RankMissao;
};

/** Missão Geral (RN-15): sem parte técnica e sem Rank. */
export type MissaoGeral = CamposComuns & { tipo: 'geral'; rank: null };

export type Missao = MissaoDesenvolvimento | MissaoGeral;

/** Nome embutido pelo PostgREST: objeto, lista (formato alternativo) ou nulo (sem acesso). */
type NomeEmbutido = { nome: string } | ReadonlyArray<{ nome: string }> | null;

/** Linha de `projetos` com stacks, tags e links embutidos pelo PostgREST. */
export type LinhaMissao = {
  id: string;
  tipo: string;
  nome: string;
  descricao: string;
  arquitetura: string | null;
  estilo_arquitetural: string | null;
  capacidades: string[];
  status: string;
  inicio_desenvolvimento_em: string | null;
  concluido_em: string | null;
  criado_em: string;
  atualizado_em: string;
  projeto_stacks: ReadonlyArray<{ stacks: NomeEmbutido }>;
  projeto_tags: ReadonlyArray<{ tags: NomeEmbutido }>;
  projeto_links: ReadonlyArray<{ url: string; titulo: string | null; ordem: number }>;
};

const COLUNAS_MISSAO =
  'id, tipo, nome, descricao, arquitetura, estilo_arquitetural, capacidades, status, inicio_desenvolvimento_em, concluido_em, criado_em, atualizado_em, projeto_stacks(stacks(nome)), projeto_tags(tags(nome)), projeto_links(url, titulo, ordem)';

function nomesEmOrdem(nomes: ReadonlyArray<NomeEmbutido>): string[] {
  return nomes
    .flatMap((item) => (item === null ? [] : Array.isArray(item) ? item : [item]))
    .map(({ nome }) => nome)
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

/**
 * Converte a linha do banco no formato das telas; em Desenvolvimento, com a
 * pontuação e o Rank derivados (RN-14). Missão Geral não tem Rank (RN-15).
 *
 * @param linha - Linha de `projetos` com stacks, tags e links embutidos.
 * @returns A Missão, com stacks e tags em ordem alfabética e links na ordem da tela.
 * @throws {Error} Se o tipo, o status ou o estilo vindo do banco for desconhecido, ou faltar a arquitetura.
 * @throws {RangeError} Se uma capacidade vinda do banco for desconhecida.
 */
export function mapearMissao(linha: LinhaMissao): Missao {
  if (!ehTipoProjeto(linha.tipo)) {
    throw new Error(`Tipo de Missão desconhecido: ${linha.tipo}`);
  }
  if (!ehStatusMissao(linha.status)) {
    throw new Error(`Status de Missão desconhecido: ${linha.status}`);
  }
  const comuns: CamposComuns = {
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    status: linha.status,
    stacks: nomesEmOrdem(linha.projeto_stacks.map(({ stacks }) => stacks)),
    tags: nomesEmOrdem(linha.projeto_tags.map(({ tags }) => tags)),
    links: [...linha.projeto_links]
      .sort((a, b) => a.ordem - b.ordem)
      .map(({ url, titulo }) => ({ url, titulo })),
    inicioDesenvolvimentoEm: linha.inicio_desenvolvimento_em,
    concluidoEm: linha.concluido_em,
    criadoEm: linha.criado_em,
    atualizadoEm: linha.atualizado_em,
  };
  if (linha.tipo === 'geral') return { ...comuns, tipo: 'geral', rank: null };

  if (linha.estilo_arquitetural === null || !ehEstiloArquitetural(linha.estilo_arquitetural)) {
    throw new Error(`Estilo arquitetural desconhecido: ${linha.estilo_arquitetural}`);
  }
  if (linha.arquitetura === null) {
    throw new Error('Missão de Desenvolvimento sem arquitetura');
  }
  // pontuacaoDaMissao recusa (RangeError) capacidade fora da lista: a conversão de tipo é conferida ali.
  const capacidades = linha.capacidades as Capacidade[];
  const pontuacao = pontuacaoDaMissao({
    estilo: linha.estilo_arquitetural,
    capacidades,
    quantidadeStacks: comuns.stacks.length,
  });

  return {
    ...comuns,
    tipo: 'dev',
    arquitetura: linha.arquitetura,
    estilo: linha.estilo_arquitetural,
    capacidades,
    pontuacao,
    rank: rankPorPontos(pontuacao.total),
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
 * Nomes das stacks e ferramentas já cadastradas pelo usuário, para o autocompletar.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function listarNomesDeStacks(supabase: ClienteSupabase): Promise<string[]> {
  const { data, error } = await supabase.from('stacks').select('nome').order('nome');
  if (error) throw new ErroDeMissao('listar_stacks', error.code);
  return data.map(({ nome }) => nome as string);
}

/**
 * Nomes das tags já cadastradas pelo usuário, para o autocompletar (RF-24).
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function listarNomesDeTags(supabase: ClienteSupabase): Promise<string[]> {
  const { data, error } = await supabase.from('tags').select('nome').order('nome');
  if (error) throw new ErroDeMissao('listar_tags', error.code);
  return data.map(({ nome }) => nome as string);
}

export type ResumoMissao = { id: string; nome: string };

/**
 * Id e nome das Missões do usuário, em ordem alfabética: opções para mover
 * uma Atualização (RN-01) e para o filtro da página geral.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function listarResumoDasMissoes(supabase: ClienteSupabase): Promise<ResumoMissao[]> {
  const { data, error } = await supabase.from('projetos').select('id, nome').order('nome');
  if (error) throw new ErroDeMissao('listar_resumo_missoes', error.code);
  return data.map(({ id, nome }) => ({ id: id as string, nome: nome as string }));
}

export type ResultadoGravacao = { ok: true; id: string } | { ok: false; codigo: string | undefined };

/**
 * Cria (sem `id`) ou altera uma Missão com stacks ou ferramentas, tags e links,
 * numa transação (`salvar_missao_v3`). Na edição, o banco não altera o status.
 *
 * @param id - Missão a alterar, ou `null` para criar.
 * @returns O id gravado, ou o código do erro do banco para a tela traduzir.
 */
export async function salvarMissao(
  supabase: ClienteSupabase,
  id: string | null,
  dados: DadosMissao,
): Promise<ResultadoGravacao> {
  const tecnicos =
    dados.tipo === 'dev'
      ? { p_arquitetura: dados.arquitetura, p_estilo: dados.estilo, p_capacidades: dados.capacidades }
      : { p_arquitetura: null, p_estilo: null, p_capacidades: null };
  const { data, error } = await supabase.rpc('salvar_missao_v3', {
    p_id: id,
    p_tipo: dados.tipo,
    p_nome: dados.nome,
    p_descricao: dados.descricao,
    ...tecnicos,
    p_status: dados.status,
    p_stacks: dados.stacks,
    p_tags: dados.tags,
    p_links: dados.links,
  });
  if (error) return { ok: false, codigo: error.code };
  return { ok: true, id: data as string };
}

export type ResultadoMudancaStatus = 'movida' | 'sem_mudanca' | 'inexistente';

/**
 * Muda só o status de uma Missão do usuário (RF-20). O trigger grava as datas
 * (RN-02). Mover para o status atual não grava nada, para não mexer na
 * "última edição": repetir o pedido dá o mesmo resultado (idempotente).
 *
 * @returns `movida`, `sem_mudanca` (já estava no status) ou `inexistente` (não existe ou é de outro usuário).
 * @throws {ErroDeMissao} Se o banco falhar.
 */
export async function mudarStatusDaMissao(
  supabase: ClienteSupabase,
  id: string,
  status: StatusMissao,
): Promise<ResultadoMudancaStatus> {
  const { data, error } = await supabase
    .from('projetos')
    .update({ status })
    .eq('id', id)
    .neq('status', status)
    .select('id');
  if (error) throw new ErroDeMissao('mover_missao', error.code);
  if (data.length > 0) return 'movida';

  const { data: existente, error: erroLeitura } = await supabase
    .from('projetos')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (erroLeitura) throw new ErroDeMissao('mover_missao', erroLeitura.code);
  return existente ? 'sem_mudanca' : 'inexistente';
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
