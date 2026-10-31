import { criarClienteServidor } from '@/lib/supabase/servidor';

import { responderExport } from './responder';

/**
 * Export JSON de todos os dados do usuário logado (RF-14, backup do ADR-0006).
 * Só leitura: outro site até dispara o download, mas não lê a resposta.
 */
export async function GET(): Promise<Response> {
  return responderExport(await criarClienteServidor(), new Date());
}
