import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { lerAmbientePublico } from '@/lib/ambiente';

/** Cabeçalhos anti-cache que o `@supabase/ssr` envia junto dos cookies de sessão. */
const CABECALHOS_ANTI_CACHE = ['cache-control', 'expires', 'pragma'] as const;

export type SessaoProxy = {
  /** Resposta que carrega os cookies renovados. */
  resposta: NextResponse;
  /** Há sessão com JWT de assinatura válida. */
  logado: boolean;
};

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
 * @returns A resposta com os cookies renovados e se há usuário logado.
 */
export async function atualizarSessao(request: NextRequest): Promise<SessaoProxy> {
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
  const { data } = await supabase.auth.getClaims();

  return { resposta, logado: Boolean(data?.claims) };
}

/**
 * Cria um redirecionamento que preserva os cookies renovados e os cabeçalhos
 * anti-cache da sessão. Sem a cópia, o navegador ficaria com o token antigo e
 * o usuário seria deslogado na requisição seguinte.
 *
 * @param destino - URL absoluta de destino.
 * @param sessao - Resposta devolvida por `atualizarSessao`.
 * @returns Resposta de redirecionamento (307).
 */
export function redirecionarComSessao(destino: URL, sessao: NextResponse): NextResponse {
  const redirecionamento = NextResponse.redirect(destino);
  sessao.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie));
  for (const nome of CABECALHOS_ANTI_CACHE) {
    const valor = sessao.headers.get(nome);
    if (valor) redirecionamento.headers.set(nome, valor);
  }
  return redirecionamento;
}
