import type { NextRequest, NextResponse } from 'next/server';

import { decidirRedirecionamento, ROTA_ENTRAR } from '@/dominio/acesso/rotas';
import { lerAmbientePublico } from '@/lib/ambiente';
import { gerarNonce, montarCsp } from '@/lib/seguranca/csp';
import { atualizarSessao, redirecionarComSessao } from '@/lib/supabase/sessao-proxy';

const CABECALHO_CSP = 'Content-Security-Policy';

/**
 * Roda antes de cada página: aplica a CSP com um nonce novo, renova a sessão e
 * manda quem não está logado para `/entrar`.
 *
 * A CSP vai na requisição (o Next lê o nonce dela e o aplica aos próprios
 * scripts durante o render) e na resposta (é a que o navegador obedece).
 *
 * Este é o primeiro portão, não o único: cada Server Action e Route Handler
 * confere a sessão de novo, e o RLS protege os dados no banco.
 *
 * @param request - Requisição recebida.
 * @returns Resposta com a CSP e os cookies de sessão renovados, ou um redirecionamento.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const csp = montarCsp({
    nonce: gerarNonce(),
    desenvolvimento: process.env.NODE_ENV === 'development',
    urlSupabase: lerAmbientePublico().NEXT_PUBLIC_SUPABASE_URL,
  });
  request.headers.set(CABECALHO_CSP, csp);

  const { resposta, logado, expirou } = await atualizarSessao(request);

  const destino = decidirRedirecionamento({ caminho: request.nextUrl.pathname, logado });
  if (destino) {
    const url = new URL(destino, request.url);
    // Avisa na tela de entrada por que a sessão acabou.
    if (expirou && destino === ROTA_ENTRAR) url.searchParams.set('erro', 'sessao-expirada');
    return redirecionarComSessao(url, resposta);
  }

  resposta.headers.set(CABECALHO_CSP, csp);
  return resposta;
}

export const config = {
  matcher: [
    {
      // Tudo, exceto arquivos estáticos do Next, o favicon e imagens: não
      // renderizam HTML (dispensam CSP) e não precisam de sessão.
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
      // Prefetch do <Link>: a resposta não é a página que o usuário abre.
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
