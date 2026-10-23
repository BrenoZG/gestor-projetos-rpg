import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { lerAmbientePublico } from '@/lib/ambiente';

/**
 * Renova a sessão do Supabase Auth a cada requisição.
 *
 * Server Components não conseguem gravar cookies; por isso o proxy renova o
 * token e o entrega em dois lugares: na própria requisição (para o render desta
 * resposta já usar o token novo) e na resposta (para o navegador substituir o
 * antigo). Sem isso, o token expira e o usuário é deslogado "do nada".
 *
 * Os cabeçalhos anti-cache que o `@supabase/ssr` envia junto dos cookies são
 * aplicados à resposta: sem eles, uma CDN poderia guardar a resposta com o
 * `Set-Cookie` e entregar a sessão de um usuário a outro.
 *
 * Cabeçalhos já definidos em `request.headers` (como a CSP) seguem para o render.
 *
 * @param request - Requisição recebida pelo proxy.
 * @returns A resposta que carrega os cookies renovados; deve ser a devolvida pelo proxy.
 */
export async function atualizarSessao(request: NextRequest): Promise<NextResponse> {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = lerAmbientePublico();
  let resposta = NextResponse.next({ request });

  // Um cliente por requisição: os cookies são desta requisição, e os
  // cabeçalhos anti-cache só chegam na primeira gravação de cada cliente.
  const supabase = createServerClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies, cabecalhos) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        Object.entries(cabecalhos).forEach(([nome, valor]) => resposta.headers.set(nome, valor));
      },
    },
  });

  // Nada entre criar o cliente e o getClaims(): é ele que dispara a renovação.
  // getClaims() valida a assinatura do JWT; getSession() confiaria no cookie,
  // que qualquer um pode forjar.
  await supabase.auth.getClaims();

  return resposta;
}
