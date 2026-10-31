'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { sessaoDoUsuario } from '@/acoes/checagens';
import type { EstadoFormularioClasse } from '@/acoes/personagem-estado';
import { validarClasse } from '@/acoes/personagem-validacao';
import { ErroDeMissao } from '@/dados/missoes';
import { gravarClasse } from '@/dados/personagem';
import { ROTA_INICIAL } from '@/dominio/acesso/rotas';
import { registrarEvento } from '@/lib/log';

/**
 * Server Actions da Classe (RF-17, RF-18). A Classe é só identidade visual
 * (RN-11): gravar não toca em XP, nível nem Rank.
 */

const FALHA_AO_GRAVAR = 'Não foi possível salvar a classe agora. Tente de novo em instantes.';
const SEM_PERSONAGEM = 'Seu personagem não foi encontrado. Saia e entre de novo.';

/** Valida e grava; devolve a mensagem de erro para a tela, ou `null` se gravou. */
async function gravar(formulario: FormData): Promise<string | null> {
  const { supabase, idUsuario } = await sessaoDoUsuario();
  const validacao = validarClasse(formulario.get('classe'));
  if (!validacao.ok) return validacao.mensagem;
  try {
    const gravou = await gravarClasse(supabase, idUsuario, validacao.classe);
    if (!gravou) return SEM_PERSONAGEM;
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    return FALHA_AO_GRAVAR;
  }
  // O HUD mostra a Classe em todas as telas do jogo.
  revalidatePath(ROTA_INICIAL, 'layout');
  return null;
}

/**
 * Primeira escolha da Classe (RF-17); em caso de sucesso, abre o Quadro.
 *
 * @param estadoAnterior - Estado do envio anterior (`useActionState`).
 * @param formulario - Campo `classe`.
 * @returns A mensagem de erro; em caso de sucesso, redireciona e não retorna.
 */
export async function escolherClasse(
  estadoAnterior: EstadoFormularioClasse,
  formulario: FormData,
): Promise<EstadoFormularioClasse> {
  const mensagem = await gravar(formulario);
  if (mensagem) return { ...estadoAnterior, mensagem };
  redirect(ROTA_INICIAL);
}

/**
 * Troca de Classe pela página do Personagem (RF-18), livre e sem custo (RN-11).
 *
 * @param estadoAnterior - Estado do envio anterior.
 * @param formulario - Campo `classe`.
 * @returns A mensagem de erro, ou o estado de sucesso (`salvo` + 1).
 */
export async function trocarClasse(
  estadoAnterior: EstadoFormularioClasse,
  formulario: FormData,
): Promise<EstadoFormularioClasse> {
  const mensagem = await gravar(formulario);
  return mensagem ? { ...estadoAnterior, mensagem } : { mensagem: null, salvo: estadoAnterior.salvo + 1 };
}
