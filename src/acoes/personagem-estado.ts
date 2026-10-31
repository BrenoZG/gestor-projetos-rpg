/**
 * Formato compartilhado entre as Server Actions da Classe e o formulário de
 * cliente. Fica separado da validação para que o Zod não entre no bundle do
 * navegador (ver `missoes-estado.ts`).
 */

/** Estado do formulário de Classe; `salvo` muda a cada troca gravada. */
export type EstadoFormularioClasse = { mensagem: string | null; salvo: number };

export const ESTADO_INICIAL_CLASSE: EstadoFormularioClasse = { mensagem: null, salvo: 0 };
