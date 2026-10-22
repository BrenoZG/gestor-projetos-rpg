import type { NextConfig } from 'next';

/**
 * Cabeçalhos de segurança aplicados a todas as rotas.
 *
 * A CSP aqui cobre só diretivas que não dependem de origem de script
 * (`frame-ancestors`, `base-uri`, `form-action`, `object-src`). A política de
 * `script-src` com nonce entra no M1, junto com as origens do Supabase: o Next
 * injeta scripts inline, e uma `script-src` escrita antes disso ou quebraria o
 * app ou seria permissiva a ponto de não proteger nada.
 */
const cabecalhosSeguranca = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  // Não anunciar o framework no cabeçalho `X-Powered-By`.
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: cabecalhosSeguranca }];
  },
};

export default nextConfig;
