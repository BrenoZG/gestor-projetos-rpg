/**
 * Formato do estado do formulário de Atualização, compartilhado entre as
 * Server Actions e o componente de cliente. Fica separado da validação para
 * que o Zod não entre no bundle do navegador (ver `missoes-estado.ts`).
 */

export type CampoAtualizacao = 'titulo' | 'descricao' | 'projetoId';

export type ErrosAtualizacao = Partial<Record<CampoAtualizacao, string>>;

/** Estado entre envios (`useActionState`); `enviado` muda a cada sucesso, para o formulário se limpar. */
export type EstadoFormularioAtualizacao = {
  erros: ErrosAtualizacao;
  mensagem: string | null;
  enviado: number;
};

export const ESTADO_INICIAL_ATUALIZACAO: EstadoFormularioAtualizacao = {
  erros: {},
  mensagem: null,
  enviado: 0,
};
