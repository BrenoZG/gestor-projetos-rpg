import 'server-only';

import { redirect } from 'next/navigation';

import { ROTA_ENTRAR } from '@/dominio/acesso/rotas';
import { criarClienteServidor } from '@/lib/supabase/servidor';
import { ehUuid } from '@/lib/uuid';

/**
 * Checagens comuns às Server Actions. Toda ação é alcançável por um POST
 * direto: a sessão e os ids são conferidos em cada uma, antes do banco.
 */

export type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

/**
 * Cliente do Supabase com a sessão do usuário; sem sessão válida, manda para a entrada.
 *
 * @returns O cliente autenticado (o RLS usa a sessão dele).
 */
export async function clienteComSessao(): Promise<ClienteSupabase> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect(ROTA_ENTRAR);
  return supabase;
}

/**
 * O id chega pelo `.bind` ou pelo corpo e pode ser forjado num POST direto:
 * qualquer tipo, qualquer texto.
 *
 * @param id - Valor recebido do cliente.
 * @returns `true` se for um UUID em texto.
 */
export function ehIdValido(id: unknown): id is string {
  return typeof id === 'string' && ehUuid(id);
}
