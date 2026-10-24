import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para Client Components (roda no navegador).
 *
 * Não usa o Zod de `lib/ambiente`, de propósito: importá-lo aqui levaria a
 * biblioteca inteira para o bundle do navegador, e a detecção de JIT do Zod
 * (`Function("")`) gera uma violação de CSP a cada carregamento. A validação
 * completa já acontece no servidor (proxy), sobre os mesmos valores, que o
 * Next embute no build; aqui basta garantir que existem.
 *
 * As variáveis são lidas pelo nome literal: só assim o Next as embute no
 * código do navegador. `createBrowserClient` reaproveita uma única instância.
 *
 * @returns Cliente do navegador.
 * @throws {Error} Se a URL ou a publishable key não estiverem no build.
 */
export function criarClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chavePublica) {
    throw new Error(
      'Variáveis de ambiente inválidas: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }
  return createBrowserClient(url, chavePublica);
}
