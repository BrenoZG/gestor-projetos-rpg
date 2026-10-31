export const ROTA_ENTRAR = '/entrar';
export const ROTA_INICIAL = '/';
/** Escolha da Classe no 1º acesso (RF-17), fora do HUD. */
export const ROTA_ESCOLHER_CLASSE = '/classe';
export const ROTA_PERSONAGEM = '/personagem';
/** Export JSON (RF-14): exige login, como toda rota fora de `ROTAS_PUBLICAS`. */
export const ROTA_EXPORTAR = '/api/exportar';

/** Abertas a quem não está logado. Comparação exata: `/entrarx` não é pública. */
const ROTAS_PUBLICAS: ReadonlySet<string> = new Set([ROTA_ENTRAR, '/api/saude']);

/** Retorno do OAuth: precisa estar aberto, porque é nele que a sessão nasce. */
const PREFIXO_AUTH = '/auth/';

function ehPublica(caminho: string): boolean {
  return ROTAS_PUBLICAS.has(caminho) || caminho.startsWith(PREFIXO_AUTH);
}

/**
 * Decide para onde o proxy deve mandar a requisição.
 *
 * Por padrão, toda rota exige login: rota nova nasce protegida, e abrir uma
 * exige incluí-la de propósito em `ROTAS_PUBLICAS`.
 *
 * @param entrada - Caminho pedido e se há sessão válida.
 * @returns O caminho de destino, ou `null` para seguir sem redirecionar.
 */
export function decidirRedirecionamento({
  caminho,
  logado,
}: {
  caminho: string;
  logado: boolean;
}): string | null {
  if (!logado) {
    return ehPublica(caminho) ? null : ROTA_ENTRAR;
  }
  return caminho === ROTA_ENTRAR ? ROTA_INICIAL : null;
}
