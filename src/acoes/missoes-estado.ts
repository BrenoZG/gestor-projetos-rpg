/**
 * Formato do estado do formulário de Missão, compartilhado entre as Server
 * Actions e o componente de cliente. Fica separado da validação para que o
 * Zod não entre no bundle do navegador (ele usa `Function`, barrado pela CSP).
 */

export type CampoMissao = 'nome' | 'descricao' | 'arquitetura' | 'dificuldade' | 'status' | 'stacks';

export type ErrosMissao = Partial<Record<CampoMissao, string>>;

/** Estado entre envios (`useActionState`): erros por campo e aviso geral. */
export type EstadoFormularioMissao = { erros: ErrosMissao; mensagem: string | null };

export const ESTADO_INICIAL_FORMULARIO: EstadoFormularioMissao = { erros: {}, mensagem: null };
