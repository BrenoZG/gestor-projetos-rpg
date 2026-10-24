import { estaAutorizado, type Identidade } from '@/dominio/acesso/allowlist';

/**
 * O que o retorno do OAuth precisa do provedor de autenticação. A rota
 * `/auth/callback` implementa com o Supabase; os testes, com uma versão falsa.
 * Nenhum método lança erro: falhas viram `false` ou `null`.
 */
export type PortaAutenticacao = {
  trocarCodigoPorSessao(codigo: string): Promise<boolean>;
  /** Identidades do usuário já validado pelo servidor de Auth; `null` se indisponível. */
  lerIdentidades(): Promise<readonly Identidade[] | null>;
  /** Cria o personagem no 1º acesso; nos seguintes, não faz nada. */
  garantirPersonagem(): Promise<boolean>;
  encerrarSessao(): Promise<void>;
};

/** Mostrado ao usuário na tela de entrada. */
export type MotivoRecusa = 'acesso-negado' | 'falha-login';

/** Só para o log interno: nunca exibido ao usuário. */
export type CausaRecusa =
  | 'cadastro-desligado'
  | 'erro-do-provedor'
  | 'sem-codigo'
  | 'troca-falhou'
  | 'usuario-indisponivel'
  | 'fora-da-allowlist'
  | 'personagem-falhou';

export type ResultadoRetorno =
  { tipo: 'autorizado' } | { tipo: 'recusado'; motivo: MotivoRecusa; causa: CausaRecusa };

/** Código que o Supabase Auth devolve quando novos cadastros estão desligados. */
const CODIGO_CADASTRO_DESLIGADO = 'signup_disabled';

function recusar(motivo: MotivoRecusa, causa: CausaRecusa): ResultadoRetorno {
  return { tipo: 'recusado', motivo, causa };
}

/**
 * Conclui o login: troca o código por sessão, confere a allowlist e garante o
 * personagem. Qualquer recusa depois da troca encerra a sessão, para que não
 * sobre sessão válida de quem não deveria entrar.
 *
 * @param retorno - Parâmetros da URL de retorno (`code` e `error_code`).
 * @param allowlist - IDs do GitHub autorizados.
 * @param porta - Acesso ao provedor de autenticação.
 * @returns Autorizado, ou recusado com o motivo (tela) e a causa (log).
 */
export async function processarRetornoOAuth(
  retorno: { codigo: string | null; codigoErro: string | null },
  allowlist: readonly string[],
  porta: PortaAutenticacao,
): Promise<ResultadoRetorno> {
  if (retorno.codigoErro) {
    return retorno.codigoErro === CODIGO_CADASTRO_DESLIGADO
      ? recusar('acesso-negado', 'cadastro-desligado')
      : recusar('falha-login', 'erro-do-provedor');
  }
  if (!retorno.codigo) {
    return recusar('falha-login', 'sem-codigo');
  }
  if (!(await porta.trocarCodigoPorSessao(retorno.codigo))) {
    return recusar('falha-login', 'troca-falhou');
  }

  const identidades = await porta.lerIdentidades();
  if (identidades === null) {
    await porta.encerrarSessao();
    return recusar('falha-login', 'usuario-indisponivel');
  }
  if (!estaAutorizado(identidades, allowlist)) {
    await porta.encerrarSessao();
    return recusar('acesso-negado', 'fora-da-allowlist');
  }
  if (!(await porta.garantirPersonagem())) {
    await porta.encerrarSessao();
    return recusar('falha-login', 'personagem-falhou');
  }
  return { tipo: 'autorizado' };
}
