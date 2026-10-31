'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { EstadoFormularioMissao, ResultadoMovimento } from '@/acoes/missoes-estado';
import { mensagemDoErroDoBanco, validarFormularioMissao } from '@/acoes/missoes-validacao';
import { clienteComSessao, ehIdValido } from '@/acoes/checagens';
import { apagarMissao, ErroDeMissao, mudarStatusDaMissao, salvarMissao } from '@/dados/missoes';
import { ROTA_INICIAL } from '@/dominio/acesso/rotas';
import { ehStatusMissao } from '@/dominio/missoes/campos';
import { registrarEvento } from '@/lib/log';

/**
 * Server Actions das Missões. Cada uma é alcançável por um POST direto, então
 * todas conferem a sessão e validam a entrada antes de tocar no banco; o RLS
 * garante que só as Missões do próprio usuário sejam alteradas.
 */

/** SQLSTATEs que são erro de uso (a tela explica), não falha a investigar. */
const ERROS_ESPERADOS = new Set(['23505', 'P0002']);

const MISSAO_INEXISTENTE: EstadoFormularioMissao = { erros: {}, mensagem: 'Este projeto não existe mais.' };

function lerFormulario(formulario: FormData): Record<string, unknown> {
  return {
    tipo: formulario.get('tipo'),
    nome: formulario.get('nome'),
    descricao: formulario.get('descricao'),
    arquitetura: formulario.get('arquitetura'),
    estilo: formulario.get('estilo'),
    capacidades: formulario.getAll('capacidades'),
    status: formulario.get('status'),
    stacks: formulario.getAll('stacks'),
    tags: formulario.getAll('tags'),
    link_url: formulario.getAll('link_url'),
    link_titulo: formulario.getAll('link_titulo'),
  };
}

async function gravar(id: string | null, formulario: FormData): Promise<EstadoFormularioMissao> {
  const supabase = await clienteComSessao();
  const validacao = validarFormularioMissao(lerFormulario(formulario), id === null ? 'criar' : 'editar');
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
 * Edita uma Missão (RF-03), inclusive o tipo (RN-16). O status não muda por
 * aqui: só pelo Quadro (RF-20) e pela ficha.
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

const MOVIMENTO_INVALIDO: ResultadoMovimento = { ok: false, mensagem: 'Este projeto não existe mais.' };
const MOVIMENTO_FALHOU: ResultadoMovimento = {
  ok: false,
  mensagem: 'Não foi possível mover agora. Tente de novo em instantes.',
};

/**
 * Move uma Missão para outra coluna do Quadro (RF-20), sem abrir a edição.
 * Mover para a coluna em que ela já está não muda nada.
 *
 * @param id - Missão a mover (vem do cliente; validado aqui).
 * @param status - Coluna de destino (vem do cliente; só os 3 status valem).
 * @returns `ok`, ou a mensagem para a tela; sem sessão, redireciona para a entrada.
 */
export async function moverMissao(id: string, status: string): Promise<ResultadoMovimento> {
  const supabase = await clienteComSessao();
  if (!ehIdValido(id) || typeof status !== 'string' || !ehStatusMissao(status)) return MOVIMENTO_INVALIDO;

  try {
    const resultado = await mudarStatusDaMissao(supabase, id, status);
    if (resultado === 'inexistente') return MOVIMENTO_INVALIDO;
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    return MOVIMENTO_FALHOU;
  }
  revalidatePath(ROTA_INICIAL, 'layout');
  return { ok: true };
}
