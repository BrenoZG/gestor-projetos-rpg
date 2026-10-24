/**
 * As 8 classes do personagem (docs/requisitos.md §6). As chaves são as mesmas
 * do CHECK `personagem_classe_valida` no banco; um teste garante que não divergem.
 */
const NOMES_CLASSE = {
  arquimago_dados: 'Arquimago de Dados',
  guerreiro_backend: 'Guerreiro do Backend',
  arqueiro_frontend: 'Arqueiro do Frontend',
  lamina_arcana_fullstack: 'Lâmina Arcana Full Stack',
  paladino_devops: 'Paladino DevOps',
  sombra_seguranca: 'Sombra da Segurança',
  invocador_ia: 'Invocador de IA',
  bardo_experiencia: 'Bardo da Experiência',
} as const;

export type ChaveClasse = keyof typeof NOMES_CLASSE;

export const CHAVES_CLASSE = Object.keys(NOMES_CLASSE) as readonly ChaveClasse[];

/**
 * Nome exibido de uma classe.
 *
 * @param chave - Valor da coluna `personagem.classe`.
 * @returns O nome, ou `null` se o personagem ainda não escolheu (ou a chave for desconhecida).
 */
export function nomeDaClasse(chave: string | null): string | null {
  return chave !== null && Object.hasOwn(NOMES_CLASSE, chave) ? NOMES_CLASSE[chave as ChaveClasse] : null;
}
