'use server';

import { revalidatePath } from 'next/cache';

import type { EstadoFormularioAtualizacao } from '@/acoes/atualizacoes-estado';
import { mensagemDoErroDaAtualizacao, validarFormularioAtualizacao } from '@/acoes/atualizacoes-validacao';
import { clienteComSessao, ehIdValido } from '@/acoes/checagens';
import { prepararConclusaoDaAtualizacao } from '@/acoes/conclusao';
import type { ResultadoMovimento } from '@/acoes/missoes-estado';
import {
  apagarAtualizacao,
  criarAtualizacao as gravarAtualizacaoNova,
  editarAtualizacao as gravarEdicaoDaAtualizacao,
  mudarStatusDaAtualizacao as gravarStatusDaAtualizacao,
} from '@/dados/atualizacoes';
import { ErroDeMissao, type ResultadoGravacao } from '@/dados/missoes';
import { ROTA_INICIAL } from '@/dominio/acesso/rotas';
import { recompensaDaConclusao, type Recompensa } from '@/dominio/gamificacao/recompensa';
import { ehStatusMissao } from '@/dominio/missoes/campos';
import { registrarEvento } from '@/lib/log';

/**
 * Server Actions das Atualizações (RF-05 a RF-08). Cada uma confere a sessão
 * e valida a entrada antes do banco; o RLS garante que a Atualização e a
 * Missão vinculada sejam do próprio usuário (RN-01).
 */

/** SQLSTATEs que são erro de uso (a tela explica), não falha a investigar. */
const ERROS_ESPERADOS = new Set(['42501', '23503', 'P0002']);

const ATUALIZACAO_INEXISTENTE = 'Esta atualização não existe mais.';
const FALHA_AO_GRAVAR: ResultadoMovimento = {
  ok: false,
  mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.',
};

function lerFormulario(formulario: FormData): Record<string, unknown> {
  return {
    titulo: formulario.get('titulo'),
    descricao: formulario.get('descricao'),
    projetoId: formulario.get('projetoId'),
  };
}

/** Ficha da Missão, página geral e Quadro leem Atualizações: o layout inteiro é revalidado. */
function revalidarTelas(): void {
  revalidatePath(ROTA_INICIAL, 'layout');
}

function registrarFalha(operacao: string, codigo: string | undefined): void {
  if (ERROS_ESPERADOS.has(codigo ?? '')) return;
  registrarEvento('erro', 'supabase_falhou', { operacao, codigo: codigo ?? 'desconhecido' });
}

/** Resposta do formulário depois de gravar (ou de falhar ao gravar). */
function respostaDaGravacao(
  estadoAnterior: EstadoFormularioAtualizacao,
  resultado: ResultadoGravacao,
  operacao: string,
): EstadoFormularioAtualizacao {
  if (resultado.ok) {
    revalidarTelas();
    return { erros: {}, mensagem: null, enviado: estadoAnterior.enviado + 1 };
  }
  registrarFalha(operacao, resultado.codigo);
  if (resultado.codigo === 'P0002')
    return { ...estadoAnterior, erros: {}, mensagem: ATUALIZACAO_INEXISTENTE };
  const { campo, mensagem } = mensagemDoErroDaAtualizacao(resultado.codigo);
  return campo
    ? { ...estadoAnterior, erros: { [campo]: mensagem }, mensagem: null }
    : { ...estadoAnterior, erros: {}, mensagem };
}

/**
 * Registra uma Atualização na Missão do formulário (RF-05). Fica na ficha da
 * Missão: em caso de sucesso, `enviado` muda e o formulário se limpa.
 *
 * @param estadoAnterior - Estado do envio anterior (`useActionState`).
 * @param formulario - Título, descrição e a Missão (campo oculto).
 * @returns Erros a exibir, ou o estado de sucesso.
 */
export async function criarAtualizacao(
  estadoAnterior: EstadoFormularioAtualizacao,
  formulario: FormData,
): Promise<EstadoFormularioAtualizacao> {
  const supabase = await clienteComSessao();
  const validacao = validarFormularioAtualizacao(lerFormulario(formulario));
  if (!validacao.ok) return { ...estadoAnterior, erros: validacao.erros, mensagem: null };
  return respostaDaGravacao(
    estadoAnterior,
    await gravarAtualizacaoNova(supabase, validacao.dados),
    'criar_atualizacao',
  );
}

/**
 * Edita título, descrição e a Missão vinculada (RF-07, RN-01).
 *
 * @param id - Atualização a editar (ligado com `.bind`; validado aqui).
 * @param estadoAnterior - Estado do envio anterior.
 * @param formulario - Título, descrição e a Missão escolhida.
 * @returns Erros a exibir, ou o estado de sucesso.
 */
export async function editarAtualizacao(
  id: string,
  estadoAnterior: EstadoFormularioAtualizacao,
  formulario: FormData,
): Promise<EstadoFormularioAtualizacao> {
  const supabase = await clienteComSessao();
  if (!ehIdValido(id)) return { ...estadoAnterior, erros: {}, mensagem: ATUALIZACAO_INEXISTENTE };
  const validacao = validarFormularioAtualizacao(lerFormulario(formulario));
  if (!validacao.ok) return { ...estadoAnterior, erros: validacao.erros, mensagem: null };
  return respostaDaGravacao(
    estadoAnterior,
    await gravarEdicaoDaAtualizacao(supabase, id, validacao.dados),
    'editar_atualizacao',
  );
}

/**
 * Muda o status de uma Atualização sem abrir a edição. Repetir o status atual
 * não muda nada. Ao concluir, o XP é gravado junto com o status (RN-06).
 *
 * @param id - Atualização (vem do cliente; validado aqui).
 * @param status - Novo status (só os 3 valores valem).
 * @returns `ok` (com a recompensa, se concluiu agora), ou a mensagem para a tela.
 */
export async function mudarStatusDaAtualizacao(id: string, status: string): Promise<ResultadoMovimento> {
  const supabase = await clienteComSessao();
  if (!ehIdValido(id) || typeof status !== 'string' || !ehStatusMissao(status)) {
    return { ok: false, mensagem: ATUALIZACAO_INEXISTENTE };
  }
  let recompensa: Recompensa | undefined;
  try {
    const preparo = status === 'concluido' ? await prepararConclusaoDaAtualizacao(supabase, id) : null;
    if (status === 'concluido' && !preparo) return { ok: false, mensagem: ATUALIZACAO_INEXISTENTE };
    const { situacao, xpGanho } = await gravarStatusDaAtualizacao(
      supabase,
      id,
      status,
      preparo?.recompensa ?? null,
    );
    if (situacao === 'inexistente') return { ok: false, mensagem: ATUALIZACAO_INEXISTENTE };
    if (situacao === 'movida' && preparo) {
      recompensa = recompensaDaConclusao(preparo.avaliacao, xpGanho, preparo.trilha);
    }
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarFalha(erro.operacao, erro.codigo);
    return FALHA_AO_GRAVAR;
  }
  revalidarTelas();
  return recompensa ? { ok: true, recompensa } : { ok: true };
}

/**
 * Exclui uma Atualização (RF-08). Excluir o que já não existe dá o mesmo resultado final.
 *
 * @param id - Atualização (vem do cliente; validado aqui).
 * @returns `ok`, ou a mensagem para a tela.
 */
export async function excluirAtualizacao(id: string): Promise<ResultadoMovimento> {
  const supabase = await clienteComSessao();
  if (!ehIdValido(id)) return { ok: true };
  try {
    await apagarAtualizacao(supabase, id);
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarFalha(erro.operacao, erro.codigo);
    return FALHA_AO_GRAVAR;
  }
  revalidarTelas();
  return { ok: true };
}
