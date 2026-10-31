/**
 * As 8 classes do personagem (docs/requisitos.md §6). As chaves são as mesmas
 * do CHECK `personagem_classe_valida` no banco; um teste garante que não divergem.
 * A Classe é só identidade visual: não entra em nenhuma fórmula (RN-11).
 */
const DADOS_CLASSE = {
  arquimago_dados: { nome: 'Arquimago de Dados', area: 'Dados, BI, engenharia e análise de dados' },
  guerreiro_backend: { nome: 'Guerreiro do Backend', area: 'APIs, servidores, banco de dados' },
  arqueiro_frontend: { nome: 'Arqueiro do Frontend', area: 'Interfaces web' },
  lamina_arcana_fullstack: { nome: 'Lâmina Arcana Full Stack', area: 'Full stack' },
  paladino_devops: { nome: 'Paladino DevOps', area: 'Infraestrutura, CI/CD, cloud, SRE' },
  sombra_seguranca: { nome: 'Sombra da Segurança', area: 'Segurança de aplicações, pentest' },
  invocador_ia: { nome: 'Invocador de IA', area: 'IA, machine learning, LLMs' },
  bardo_experiencia: { nome: 'Bardo da Experiência', area: 'UI/UX, design de produto' },
} as const;

export type ChaveClasse = keyof typeof DADOS_CLASSE;

export const CHAVES_CLASSE = Object.keys(DADOS_CLASSE) as readonly ChaveClasse[];

export type Classe = { chave: ChaveClasse; nome: string; area: string };

/** As 8 classes na ordem de requisitos.md §6, para a tela de escolha. */
export const CLASSES: readonly Classe[] = CHAVES_CLASSE.map((chave) => ({ chave, ...DADOS_CLASSE[chave] }));

/**
 * O valor é uma das 8 chaves? Usa `Object.hasOwn` para não aceitar nomes
 * herdados do protótipo (`toString`, `constructor`).
 *
 * @param valor - Texto vindo do banco ou do formulário.
 */
export function ehChaveClasse(valor: string): valor is ChaveClasse {
  return Object.hasOwn(DADOS_CLASSE, valor);
}

/**
 * Nome exibido de uma classe.
 *
 * @param chave - Valor da coluna `personagem.classe`.
 * @returns O nome, ou `null` se o personagem ainda não escolheu (ou a chave for desconhecida).
 */
export function nomeDaClasse(chave: string | null): string | null {
  return chave !== null && ehChaveClasse(chave) ? DADOS_CLASSE[chave].nome : null;
}
