import type { Recompensa } from '@/dominio/gamificacao/recompensa';

/**
 * Formato do estado do formulário de Missão, compartilhado entre as Server
 * Actions e o componente de cliente. Fica separado da validação para que o
 * Zod não entre no bundle do navegador (ele usa `Function`, barrado pela CSP).
 */

export type CampoMissao =
  | 'tipo'
  | 'nome'
  | 'descricao'
  | 'arquitetura'
  | 'estilo'
  | 'capacidades'
  | 'status'
  | 'stacks'
  | 'tags'
  | 'links';

export type ErrosMissao = Partial<Record<CampoMissao, string>>;

/** Estado entre envios (`useActionState`): erros por campo e aviso geral. */
export type EstadoFormularioMissao = { erros: ErrosMissao; mensagem: string | null };

export const ESTADO_INICIAL_FORMULARIO: EstadoFormularioMissao = { erros: {}, mensagem: null };

/**
 * Resposta de mover uma Missão ou Atualização; a mensagem de erro já vem
 * pronta para a tela. `recompensa` só vem quando o item foi concluído agora.
 */
export type ResultadoMovimento = { ok: true; recompensa?: Recompensa } | { ok: false; mensagem: string };
