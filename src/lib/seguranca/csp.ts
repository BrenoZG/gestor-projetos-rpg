/**
 * Alfabeto aceito no nonce: base64 padrão e base64url. O nonce vai dentro de um
 * cabeçalho HTTP; qualquer outro caractere (`;`, aspas, quebra de linha) poderia
 * fechar a diretiva e injetar outra.
 */
const FORMATO_NONCE = /^[A-Za-z0-9+/_-]+={0,2}$/;

/** 16 bytes = 128 bits, o mínimo que a especificação CSP Level 3 (W3C) recomenda. */
const BYTES_NONCE = 16;

/**
 * sha256 de `display:none`. Ao transmitir em streaming um trecho que fica dentro
 * de um `<svg>`, o React o envia num `<svg style="display:none">` (um `<div>`
 * não é válido ali) e o move para o lugar em seguida. Sem esta exceção, a CSP
 * bloqueia o atributo e acusa uma violação por trecho. Só este valor exato é
 * liberado: no pior caso, um atributo injetado esconderia um elemento.
 */
const HASH_ESTILO_STREAMING_SVG = "'sha256-aqNNdDLnnrDOnTNdkJpYlAxKVJtLt9CtFLklmInuUAE='";

/**
 * Gera o nonce de uma requisição com o gerador criptográfico da Web Crypto API
 * (nunca `Math.random`, que é previsível).
 *
 * @returns 128 bits aleatórios em base64 (24 caracteres).
 */
export function gerarNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(BYTES_NONCE))).toString('base64');
}

export type OpcoesCsp = {
  /** Valor aleatório e único por requisição, gerado no proxy. */
  readonly nonce: string;
  /** `true` em `next dev`: libera o que o React e o overlay de erros exigem. */
  readonly desenvolvimento: boolean;
  /** URL do projeto Supabase; só a origem entra em `connect-src`. */
  readonly urlSupabase: string;
};

/**
 * Monta o valor do cabeçalho `Content-Security-Policy`.
 *
 * Baseada na política com nonce da documentação do Next 16. Diferenças entre
 * ambientes, todas exigidas pelo `next dev`:
 * - `'unsafe-eval'` em scripts: o React reconstrói pilhas de erro com `eval`;
 * - `'unsafe-inline'` em estilos: o overlay de erros injeta estilos sem nonce;
 * - sem `upgrade-insecure-requests`: o Supabase local responde só em HTTP.
 *
 * @param opcoes - Nonce, ambiente e URL do Supabase.
 * @returns A política em uma única linha.
 * @throws {Error} Se o nonce tiver caractere fora do alfabeto base64.
 * @throws {TypeError} Se `urlSupabase` não for uma URL válida.
 */
export function montarCsp({ nonce, desenvolvimento, urlSupabase }: OpcoesCsp): string {
  if (!FORMATO_NONCE.test(nonce)) {
    throw new Error('CSP: nonce fora do formato base64.');
  }
  const origemSupabase = new URL(urlSupabase).origin;

  const diretivas = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desenvolvimento ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${desenvolvimento ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${origemSupabase}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!desenvolvimento) {
    diretivas.push(`style-src-attr 'unsafe-hashes' ${HASH_ESTILO_STREAMING_SVG}`);
    diretivas.push('upgrade-insecure-requests');
  }
  return diretivas.join('; ');
}
