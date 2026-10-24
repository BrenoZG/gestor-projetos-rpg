'use server';

import { redirect } from 'next/navigation';

import { ROTA_ENTRAR } from '@/dominio/acesso/rotas';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

/**
 * Encerra a sessão e volta para a tela de entrada.
 *
 * `signOut()` sem escopo revoga as sessões do usuário em todos os
 * dispositivos: sair é tratado como "fechar tudo".
 */
export async function sair(): Promise<never> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signOut();
  if (error) {
    registrarEvento('erro', 'supabase_falhou', { operacao: 'sair', codigo: error.code ?? 'desconhecido' });
  }
  redirect(ROTA_ENTRAR);
}
