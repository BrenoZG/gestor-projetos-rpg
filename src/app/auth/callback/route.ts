import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { ROTA_ENTRAR, ROTA_INICIAL } from '@/dominio/acesso/rotas';
import { processarRetornoOAuth, type PortaAutenticacao } from '@/dominio/acesso/retorno-oauth';
import { lerAmbiente } from '@/lib/ambiente';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Registra a falha de uma chamada ao Supabase só com o código do erro (sem PII). */
function registrarFalha(operacao: string, codigo: string | undefined): void {
  registrarEvento('erro', 'supabase_falhou', { operacao, codigo: codigo ?? 'desconhecido' });
}

/** Liga a porta de autenticação do domínio ao Supabase. */
function criarPorta(supabase: ClienteSupabase): PortaAutenticacao {
  let idUsuario: string | null = null;

  return {
    async trocarCodigoPorSessao(codigo) {
      const { error } = await supabase.auth.exchangeCodeForSession(codigo);
      if (error) registrarFalha('trocar_codigo', error.code);
      return !error;
    },
    async lerIdentidades() {
      // getUser() consulta o servidor de Auth: as identidades vêm validadas,
      // não do cookie.
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        registrarFalha('ler_usuario', error?.code);
        return null;
      }
      idUsuario = data.user.id;
      return data.user.identities ?? [];
    },
    async garantirPersonagem() {
      if (!idUsuario) return false;
      // insert ... on conflict (user_id) do nothing: idempotente no 2º acesso.
      const { error } = await supabase
        .from('personagem')
        .upsert({ user_id: idUsuario }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (error) registrarFalha('garantir_personagem', error.code);
      return !error;
    },
    async encerrarSessao() {
      const { error } = await supabase.auth.signOut();
      if (error) registrarFalha('encerrar_sessao', error.code);
    },
  };
}

/**
 * Retorno do login com GitHub (OAuth com PKCE).
 *
 * O destino é sempre fixo (`/` ou `/entrar`): aceitar um destino vindo da URL
 * abriria um redirecionamento para qualquer site (open redirect).
 *
 * @param request - Requisição com `code` (sucesso) ou `error_code` (falha).
 */
export async function GET(request: NextRequest): Promise<never> {
  const parametros = request.nextUrl.searchParams;
  const supabase = await criarClienteServidor();

  const resultado = await processarRetornoOAuth(
    {
      codigo: parametros.get('code'),
      codigoErro: parametros.get('error_code') ?? parametros.get('error'),
    },
    lerAmbiente().ALLOWLIST_GITHUB_IDS,
    criarPorta(supabase),
  );

  if (resultado.tipo === 'autorizado') {
    registrarEvento('info', 'login_autorizado');
    redirect(ROTA_INICIAL);
  }
  registrarEvento('aviso', 'login_recusado', { causa: resultado.causa });
  redirect(`${ROTA_ENTRAR}?erro=${resultado.motivo}`);
}
