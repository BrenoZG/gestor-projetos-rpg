import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { lerAmbientePublico } from '@/lib/ambiente';

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 *
 * Um cliente por requisição: ele carrega os cookies desta requisição. Usa a
 * publishable key e a sessão do usuário; o RLS decide o que ele acessa.
 *
 * @returns Cliente ligado aos cookies da requisição atual.
 */
export async function criarClienteServidor() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = lerAmbientePublico();
  const armazemCookies = await cookies();

  return createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return armazemCookies.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) => armazemCookies.set(name, value, options));
        } catch {
          // Server Components não gravam cookies. Pode ignorar: o proxy renova
          // a sessão a cada requisição. Em Route Handlers e Server Actions,
          // a gravação funciona e este bloco não é atingido.
        }
      },
    },
  });
}
