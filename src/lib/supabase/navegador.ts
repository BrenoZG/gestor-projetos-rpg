import { createBrowserClient } from '@supabase/ssr';

import { lerAmbientePublico } from '@/lib/ambiente';

/**
 * Cliente Supabase para Client Components (roda no navegador).
 *
 * As variáveis são lidas pelo nome literal: só assim o Next as embute no
 * código do navegador. `createBrowserClient` reaproveita uma única instância.
 *
 * @returns Cliente do navegador.
 */
export function criarClienteNavegador() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = lerAmbientePublico({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
