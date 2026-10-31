/**
 * Atalho de teclado da Ficha (RN-12, WCAG 2.1.4): `C` abre, `Esc` volta. Atalho
 * de uma tecla só pode atrapalhar quem digita ou usa comando de voz, por isso
 * é ignorado em campo de texto e pode ser desligado (cookie, por aparelho).
 */
import { ROTA_PERSONAGEM } from '@/dominio/acesso/rotas';

export const NOME_COOKIE_ATALHO = 'atalho-ficha';

export const VALOR_ATALHO_DESLIGADO = 'desligado';

/** Um ano: é uma preferência de interface, não um dado sensível. */
const VALIDADE_COOKIE_SEGUNDOS = 60 * 60 * 24 * 365;

/** Tipos de `<input>` que não recebem texto: neles, a tecla não digita nada. */
const ENTRADAS_SEM_TEXTO = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'file',
]);

/**
 * O atalho está ligado? Sem cookie, sim.
 *
 * @param cookies - Texto no formato de `document.cookie` (`nome=valor; ...`).
 */
export function atalhoLigado(cookies: string): boolean {
  return !cookies.split(';').some((par) => par.trim() === `${NOME_COOKIE_ATALHO}=${VALOR_ATALHO_DESLIGADO}`);
}

/**
 * Monta o cookie da preferência. Ligar apaga o cookie (o padrão é ligado).
 *
 * @param ligado - Escolha do usuário.
 * @param seguro - `true` em HTTPS, para marcar o cookie como `Secure`.
 * @returns Valor para `document.cookie`.
 */
export function montarCookieAtalho(ligado: boolean, seguro: boolean): string {
  if (ligado) return `${NOME_COOKIE_ATALHO}=; Path=/; Max-Age=0; SameSite=Lax`;
  const base = `${NOME_COOKIE_ATALHO}=${VALOR_ATALHO_DESLIGADO}; Path=/; Max-Age=${VALIDADE_COOKIE_SEGUNDOS}; SameSite=Lax`;
  return seguro ? `${base}; Secure` : base;
}

/** O que importa do elemento com foco. */
export type AlvoDaTecla = { tagName: string; type?: string; isContentEditable?: boolean };

/**
 * O foco está num lugar onde a tecla digita (ou escolhe uma opção, no `<select>`)?
 *
 * @param alvo - Elemento com foco.
 */
export function ehCampoDeTexto({ tagName, type, isContentEditable }: AlvoDaTecla): boolean {
  if (isContentEditable) return true;
  if (tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
  return tagName === 'INPUT' && !ENTRADAS_SEM_TEXTO.has(type ?? 'text');
}

/** O que importa do `KeyboardEvent`, mais o estado da página. */
export type TeclaPressionada = {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  defaultPrevented: boolean;
  emCampoDeTexto: boolean;
  /**
   * O foco está dentro de um `<form>` (rádio, checkbox, botão): sair da tela
   * perderia o que já foi preenchido, que não tem rascunho salvo.
   */
  emFormulario: boolean;
  /** Há um `<dialog>` aberto (Janela do Sistema ou cinemática): a tecla é dela. */
  janelaAberta: boolean;
};

function teclaLivre(tecla: TeclaPressionada): boolean {
  return !tecla.defaultPrevented && !tecla.emCampoDeTexto && !tecla.emFormulario && !tecla.janelaAberta;
}

/**
 * `C` sozinho, sem modificador nem repetição, fora de campo e sem janela aberta.
 * O Ctrl+C (copiar) continua com o navegador.
 *
 * @param tecla - Tecla e contexto.
 */
export function deveAbrirFicha(tecla: TeclaPressionada): boolean {
  const semModificador = !tecla.ctrlKey && !tecla.altKey && !tecla.metaKey && !tecla.repeat;
  return tecla.key.toLowerCase() === 'c' && semModificador && teclaLivre(tecla);
}

/**
 * `Esc` na Ficha, quando nenhum menu ou janela já tratou a tecla.
 *
 * @param tecla - Tecla e contexto.
 */
export function deveFecharFicha(tecla: TeclaPressionada): boolean {
  return tecla.key === 'Escape' && teclaLivre(tecla);
}

/** `abrir` a Ficha; `voltar` à tela anterior; ir ao `quadro` (Ficha aberta direto pelo endereço). */
export type AcaoDoAtalho = 'abrir' | 'voltar' | 'quadro';

/**
 * O que fazer com a tecla. O `Esc` não depende do liga/desliga: o WCAG 2.1.4
 * trata só de atalhos de caractere, e o `Esc` não digita nada.
 *
 * @param contexto - Tecla, rota atual, rota anterior dentro do app (`null` se
 *   a Ficha foi a primeira tela) e a preferência do atalho `C`.
 * @returns A ação, ou `null` para deixar a tecla seguir.
 */
export function acaoDoAtalho({
  tecla,
  caminho,
  anterior,
  ligado,
}: {
  tecla: TeclaPressionada;
  caminho: string;
  anterior: string | null;
  ligado: boolean;
}): AcaoDoAtalho | null {
  const naFicha = caminho === ROTA_PERSONAGEM;
  if (!naFicha) return ligado && deveAbrirFicha(tecla) ? 'abrir' : null;
  if (!deveFecharFicha(tecla)) return null;
  return anterior === null ? 'quadro' : 'voltar';
}
