'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { EstadoFormularioMissao } from '@/acoes/missoes-estado';
import { mensagemDoErroDoBanco, validarFormularioMissao } from '@/acoes/missoes-validacao';
import { apagarMissao, ErroDeMissao, salvarMissao } from '@/dados/missoes';
import { ROTA_ENTRAR, ROTA_INICIAL } from '@/dominio/acesso/rotas';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';
import { ehUuid } from '@/lib/uuid';

/**
 * Server Actions das Missões. Cada uma é alcançável por um POST direto, então
 * todas conferem a sessão e validam a entrada antes de tocar no banco; o RLS
 * garante que só as Missões do próprio usuário sejam alteradas.
 */

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

/** SQLSTATEs que são erro de uso (a tela explica), não falha a investigar. */
const ERROS_ESPERADOS = new Set(['23505', 'P0002']);

const MISSAO_INEXISTENTE: EstadoFormularioMissao = { erros: {}, mensagem: 'Esta missão não existe mais.' };

async function clienteComSessao(): Promise<ClienteSupabase> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect(ROTA_ENTRAR);
  return supabase;
}

/** O id chega pelo `.bind` e pode ser forjado num POST direto: qualquer tipo, qualquer texto. */
function ehIdValido(id: unknown): id is string {
  return typeof id === 'string' && ehUuid(id);
}

function lerFormulario(formulario: FormData): Record<string, unknown> {
  return {
    nome: formulario.get('nome'),
    descricao: formulario.get('descricao'),
    arquitetura: formulario.get('arquitetura'),
    estilo: formulario.get('estilo'),
    capacidades: formulario.getAll('capacidades'),
    status: formulario.get('status'),
    stacks: formulario.getAll('stacks'),
  };
}

async function gravar(id: string | null, formulario: FormData): Promise<EstadoFormularioMissao> {
  const supabase = await clienteComSessao();
  const validacao = validarFormularioMissao(lerFormulario(formulario));
  if (!validacao.ok) return { erros: validacao.erros, mensagem: null };

  const resultado = await salvarMissao(supabase, id, validacao.dados);
  if (!resultado.ok) {
    if (!ERROS_ESPERADOS.has(resultado.codigo ?? '')) {
      registrarEvento('erro', 'supabase_falhou', {
        operacao: 'salvar_missao',
        codigo: resultado.codigo ?? 'desconhecido',
      });
    }
    const { campo, mensagem } = mensagemDoErroDoBanco(resultado.codigo);
    return campo ? { erros: { [campo]: mensagem }, mensagem: null } : { erros: {}, mensagem };
  }

  revalidatePath(ROTA_INICIAL, 'layout');
  redirect(`/missoes/${resultado.id}`);
}

/**
 * Cadastra uma Missão (RF-01) e abre o detalhe dela.
 *
 * @param _estadoAnterior - Estado do envio anterior (exigido pelo `useActionState`).
 * @param formulario - Campos do formulário de Missão.
 * @returns Erros a exibir; em caso de sucesso, redireciona e não retorna.
 */
export async function criarMissao(
  _estadoAnterior: EstadoFormularioMissao,
  formulario: FormData,
): Promise<EstadoFormularioMissao> {
  return gravar(null, formulario);
}

/**
 * Edita uma Missão (RF-03), inclusive o status (RN-02, datas gravadas pelo banco).
 *
 * @param id - Missão a editar (ligado com `.bind`; validado aqui, pois vem do cliente).
 * @param _estadoAnterior - Estado do envio anterior.
 * @param formulario - Campos do formulário de Missão.
 * @returns Erros a exibir; em caso de sucesso, redireciona e não retorna.
 */
export async function editarMissao(
  id: string,
  _estadoAnterior: EstadoFormularioMissao,
  formulario: FormData,
): Promise<EstadoFormularioMissao> {
  if (!ehIdValido(id)) return MISSAO_INEXISTENTE;
  return gravar(id, formulario);
}

/**
 * Exclui uma Missão (RF-04) e volta ao Quadro. Excluir o que já não existe
 * também volta ao Quadro: o resultado final é o mesmo.
 *
 * @param id - Missão a excluir (ligado com `.bind`; validado aqui).
 * @throws {ErroDeMissao} Se o banco falhar; a tela de erro assume.
 */
export async function excluirMissao(id: string): Promise<never> {
  const supabase = await clienteComSessao();
  if (ehIdValido(id)) {
    try {
      await apagarMissao(supabase, id);
    } catch (erro) {
      if (erro instanceof ErroDeMissao) {
        registrarEvento('erro', 'supabase_falhou', {
          operacao: erro.operacao,
          codigo: erro.codigo ?? 'desconhecido',
        });
      }
      throw erro;
    }
  }
  revalidatePath(ROTA_INICIAL, 'layout');
  redirect(ROTA_INICIAL);
}
