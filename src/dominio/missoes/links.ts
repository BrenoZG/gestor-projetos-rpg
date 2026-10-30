/**
 * Links de referência das Missões (RF-26, RN-17). Funções puras: o servidor
 * nunca abre o endereço (sem pré-visualização), então não há requisição a
 * terceiros nem risco de SSRF; a validação só garante um `https` bem formado.
 */

import { LIMITES_MISSAO } from './campos';

export type MotivoLinkInvalido = 'formato' | 'protocolo' | 'credenciais' | 'tamanho';

export type ResultadoUrlDeLink = { ok: true; url: string } | { ok: false; motivo: MotivoLinkInvalido };

export type TipoDeLink = 'youtube' | 'instagram' | 'drive' | 'pagina';

/** Domínios exatos de cada ícone; um subdomínio forjado (`youtube.com.evil.com`) não casa. */
const DOMINIOS_POR_TIPO: ReadonlyArray<readonly [Exclude<TipoDeLink, 'pagina'>, readonly string[]]> = [
  ['youtube', ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']],
  ['instagram', ['instagram.com', 'www.instagram.com']],
  ['drive', ['drive.google.com', 'docs.google.com']],
];

function interpretarUrl(texto: string): URL | null {
  try {
    return new URL(texto);
  } catch {
    // TypeError: o texto não é um endereço absoluto.
    return null;
  }
}

/**
 * Valida o endereço digitado para um link de referência.
 *
 * Só `https:` passa: barra `javascript:` e `data:` (XSS ao clicar) e `http:`
 * (sem criptografia). Usuário ou senha embutidos são recusados porque
 * vazariam credenciais na tela e no export.
 *
 * @param entrada - Endereço como digitado.
 * @returns O endereço normalizado (`href`) ou o motivo da recusa.
 */
export function validarUrlDeLink(entrada: string): ResultadoUrlDeLink {
  const url = interpretarUrl(entrada.trim());
  if (url === null) return { ok: false, motivo: 'formato' };
  if (url.protocol !== 'https:') return { ok: false, motivo: 'protocolo' };
  if (url.username !== '' || url.password !== '') return { ok: false, motivo: 'credenciais' };
  if (url.href.length > LIMITES_MISSAO.url.maximo) return { ok: false, motivo: 'tamanho' };
  return { ok: true, url: url.href };
}

/**
 * Tipo do link pelo domínio, para escolher o ícone na ficha.
 *
 * @param url - Endereço já validado.
 * @returns `youtube`, `instagram`, `drive` ou `pagina` (qualquer outro, ou inválido).
 */
export function tipoDeLink(url: string): TipoDeLink {
  const dominio = interpretarUrl(url)?.hostname;
  if (dominio === undefined) return 'pagina';
  const encontrado = DOMINIOS_POR_TIPO.find(([, dominios]) => dominios.includes(dominio));
  return encontrado ? encontrado[0] : 'pagina';
}
