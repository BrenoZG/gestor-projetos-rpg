/**
 * Arquivo do export JSON (RF-14): o envelope versionado, o nome do arquivo e a
 * contagem por tabela. Regras puras, sem I/O; os dados vêm da `exportar_dados`.
 */

export const FORMATO_EXPORT = 'gestor-projetos-rpg/export';

/** Sobe quando o formato muda (tabela ou coluna nova): um import futuro lê por ela. */
export const VERSAO_FORMATO_EXPORT = 1;

/** Tabelas que saem como lista; o personagem sai como um objeto só. */
export const TABELAS_EM_LISTA = [
  'projetos',
  'stacks',
  'projeto_stacks',
  'tags',
  'projeto_tags',
  'projeto_links',
  'atualizacoes',
  'eventos_xp',
] as const;

export type TabelaEmLista = (typeof TABELAS_EM_LISTA)[number];

/** Uma linha de tabela, com as colunas do banco (snake_case). */
export type Registro = Readonly<Record<string, unknown>>;

export type DadosExportados = { personagem: Registro | null } & Record<TabelaEmLista, readonly Registro[]>;

export type ArquivoExport = {
  formato: typeof FORMATO_EXPORT;
  versao_formato: typeof VERSAO_FORMATO_EXPORT;
  exportado_em: string;
  dados: DadosExportados;
};

/** `en-CA` formata como AAAA-MM-DD; o fuso é o de exibição (RNF-05). */
const FORMATO_DIA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Envelope do arquivo: identifica o formato e a versão, para um import futuro.
 *
 * @param dados - Dados do usuário, como vieram do banco.
 * @param agora - Hora do export.
 * @returns O conteúdo do arquivo.
 */
export function montarArquivoExport(dados: DadosExportados, agora: Date): ArquivoExport {
  return {
    formato: FORMATO_EXPORT,
    versao_formato: VERSAO_FORMATO_EXPORT,
    exportado_em: agora.toISOString(),
    dados,
  };
}

/**
 * Nome do arquivo com o dia de São Paulo: exportar às 23h30 não sai com a data de amanhã.
 *
 * @param agora - Hora do export.
 * @returns Ex.: "gestor-projetos-2026-10-31.json".
 */
export function nomeDoArquivoExport(agora: Date): string {
  return `gestor-projetos-${FORMATO_DIA.format(agora)}.json`;
}

const PADRAO_NOME_NO_CABECALHO = /filename="([^"]+)"/;

/**
 * Nome do arquivo que o servidor mandou no `Content-Disposition`.
 *
 * @param cabecalho - Valor do cabeçalho, ou `null` se ausente.
 * @returns O nome, ou `null` se o cabeçalho não trouxer um.
 */
export function nomeDoArquivoNoCabecalho(cabecalho: string | null): string | null {
  return cabecalho?.match(PADRAO_NOME_NO_CABECALHO)?.[1] ?? null;
}

export type ResumoDoArquivo = { projetos: number; atualizacoes: number };

/**
 * Projetos e Atualizações do arquivo baixado, para o aviso de sucesso. Não
 * valida o arquivo inteiro: o servidor já validou; aqui só se lê o que se mostra.
 *
 * @param texto - Conteúdo baixado.
 * @returns As contagens, ou `null` se o texto não for um arquivo do export.
 */
export function resumoDoArquivo(texto: string): ResumoDoArquivo | null {
  let arquivo: unknown;
  try {
    arquivo = JSON.parse(texto);
  } catch {
    // Não é JSON (ex.: página HTML de erro): sem resumo, quem chama decide.
    return null;
  }
  if (typeof arquivo !== 'object' || arquivo === null) return null;
  const { formato, dados } = arquivo as {
    formato?: unknown;
    dados?: { projetos?: unknown; atualizacoes?: unknown };
  };
  if (formato !== FORMATO_EXPORT || !Array.isArray(dados?.projetos) || !Array.isArray(dados.atualizacoes)) {
    return null;
  }
  return { projetos: dados.projetos.length, atualizacoes: dados.atualizacoes.length };
}

/**
 * Quantas linhas cada tabela trouxe: vai para o log e para o aviso de sucesso.
 *
 * @param dados - Dados exportados.
 * @returns Contagem por tabela em lista.
 */
export function contarRegistros(dados: DadosExportados): Record<TabelaEmLista, number> {
  return Object.fromEntries(TABELAS_EM_LISTA.map((tabela) => [tabela, dados[tabela].length])) as Record<
    TabelaEmLista,
    number
  >;
}
