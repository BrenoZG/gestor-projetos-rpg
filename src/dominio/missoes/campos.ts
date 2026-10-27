/**
 * Campos da Missão (requisitos.md §3). Os mesmos limites estão nos `CHECK`s
 * das migrations `criar_missoes` e `rank_por_arquitetura`; os testes de banco
 * cobrem a fronteira.
 */

export const LIMITES_MISSAO = {
  nome: { minimo: 3, maximo: 80 },
  descricao: { minimo: 1, maximo: 2000 },
  arquitetura: { minimo: 1, maximo: 20000 },
  stacks: { minimo: 1, maximo: 20 },
  /** O requisito limita só a quantidade; 40 evita "tags-parágrafo" (decisão do M1b). */
  nomeStack: { minimo: 1, maximo: 40 },
} as const;

/** Na ordem das colunas do Quadro. */
export const STATUS_MISSAO = ['backlog', 'desenvolvimento', 'concluido'] as const;

export type StatusMissao = (typeof STATUS_MISSAO)[number];

export const ROTULOS_STATUS: Readonly<Record<StatusMissao, string>> = {
  backlog: 'Backlog',
  desenvolvimento: 'Desenvolvimento',
  concluido: 'Concluído',
};

/** Estilos da RN-14, do mais simples ao mais distribuído (a ordem da tela). */
export const ESTILOS_ARQUITETURAIS = [
  'script',
  'monolito',
  'monolito_modular',
  'hexagonal',
  'serverless',
  'eventos',
  'microsservicos',
] as const;

export type EstiloArquitetural = (typeof ESTILOS_ARQUITETURAIS)[number];

export const ROTULOS_ESTILO: Readonly<Record<EstiloArquitetural, string>> = {
  script: 'Script ou automação',
  monolito: 'Monolito',
  monolito_modular: 'Monolito modular',
  hexagonal: 'Hexagonal / Clean',
  serverless: 'Serverless',
  eventos: 'Orientado a eventos',
  microsservicos: 'Microsserviços',
};

/** Capacidades da RN-14: o que a Missão precisa entregar além do código de negócio. */
export const CAPACIDADES = [
  'autenticacao',
  'banco_de_dados',
  'api_externa',
  'tempo_real',
  'filas',
  'ia',
  'ci_cd',
  'mobile',
] as const;

export type Capacidade = (typeof CAPACIDADES)[number];

export const ROTULOS_CAPACIDADE: Readonly<Record<Capacidade, string>> = {
  autenticacao: 'Autenticação',
  banco_de_dados: 'Banco de dados',
  api_externa: 'Integração com API externa',
  tempo_real: 'Tempo real',
  filas: 'Filas e processamento assíncrono',
  ia: 'IA ou machine learning',
  ci_cd: 'CI/CD e deploy',
  mobile: 'App mobile',
};

/** Campos de uma Missão já validados e limpos, prontos para gravar. */
export type DadosMissao = {
  nome: string;
  descricao: string;
  arquitetura: string;
  estilo: EstiloArquitetural;
  capacidades: Capacidade[];
  status: StatusMissao;
  stacks: string[];
};

/**
 * Confere se um texto é um dos status da Missão (valor vindo de formulário ou do banco).
 *
 * @param valor - Texto a conferir.
 * @returns `true` se for `backlog`, `desenvolvimento` ou `concluido`.
 */
export function ehStatusMissao(valor: string): valor is StatusMissao {
  return (STATUS_MISSAO as readonly string[]).includes(valor);
}

/**
 * Confere se um texto é um dos estilos arquiteturais da RN-14.
 *
 * @param valor - Texto a conferir (formulário ou banco).
 * @returns `true` se estiver em {@link ESTILOS_ARQUITETURAIS}.
 */
export function ehEstiloArquitetural(valor: string): valor is EstiloArquitetural {
  return (ESTILOS_ARQUITETURAIS as readonly string[]).includes(valor);
}

/**
 * Confere se um texto é uma das capacidades da RN-14.
 *
 * @param valor - Texto a conferir (formulário ou banco).
 * @returns `true` se estiver em {@link CAPACIDADES}.
 */
export function ehCapacidade(valor: string): valor is Capacidade {
  return (CAPACIDADES as readonly string[]).includes(valor);
}
