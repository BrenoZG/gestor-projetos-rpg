'use server';

import { revalidatePath } from 'next/cache';

import { clienteComSessao, ehIdValido } from '@/acoes/checagens';
import type { ResultadoMovimento } from '@/acoes/missoes-estado';
import { quantidadeDeProjetos, type ResultadoRenomeacaoTag } from '@/acoes/tags-estado';
import { mensagemDoErroDaTag, validarNomeDaTag } from '@/acoes/tags-validacao';
import { ErroDeMissao } from '@/dados/missoes';
import { apagarTag, gravarNomeDaTag } from '@/dados/tags';
import { ROTA_INICIAL } from '@/dominio/acesso/rotas';
import { registrarEvento } from '@/lib/log';

/**
 * Server Actions das tags (RF-28, RF-29). São chamadas pelo cliente, não por
 * `<form action>`: a linha de uma tag juntada desmonta, e o aviso de sucesso
 * vive na lista. Cada uma é alcançável por um POST direto, então conferem a
 * sessão e validam a entrada antes de tocar no banco.
 */

/** SQLSTATEs que são erro de uso (a tela explica), não falha a investigar. */
const ERROS_ESPERADOS = new Set(['P0002', '23514']);

const TAG_INEXISTENTE = 'Esta tag não existe mais.';

/**
 * Renomeia uma tag ou, se o nome já é de outra tag, devolve o conflito; com
 * `juntar`, junta as duas (RN-19).
 *
 * @param id - Tag a renomear (vem do cliente; validado aqui).
 * @param nome - Nome novo, como digitado.
 * @param juntar - Se o usuário já confirmou a junção.
 * @returns A mensagem de sucesso, o conflito a confirmar ou o erro para a tela.
 */
export async function renomearTag(
  id: string,
  nome: string,
  juntar: boolean,
): Promise<ResultadoRenomeacaoTag> {
  const supabase = await clienteComSessao();
  if (!ehIdValido(id)) return { tipo: 'erro', mensagem: TAG_INEXISTENTE };
  const validacao = validarNomeDaTag(nome);
  if (!validacao.ok) return { tipo: 'erro', mensagem: validacao.mensagem };

  const resultado = await gravarNomeDaTag(supabase, id, validacao.nome, juntar === true);
  if (!resultado.ok) {
    if (!ERROS_ESPERADOS.has(resultado.codigo ?? '')) {
      registrarEvento('erro', 'supabase_falhou', {
        operacao: 'renomear_tag',
        codigo: resultado.codigo ?? 'desconhecido',
      });
    }
    return { tipo: 'erro', mensagem: mensagemDoErroDaTag(resultado.codigo) };
  }

  if (resultado.resultado === 'conflito') {
    return { tipo: 'conflito', destino: resultado.destino, missoes: resultado.missoes };
  }
  revalidatePath(ROTA_INICIAL, 'layout');
  const mensagem =
    resultado.resultado === 'juntada'
      ? `Tags juntadas: ${quantidadeDeProjetos(resultado.missoes)} agora em “${resultado.destino}”.`
      : `Tag renomeada para “${resultado.destino}”.`;
  return { tipo: 'concluida', mensagem };
}

/**
 * Exclui uma tag que nenhuma Missão usa (RF-29). O banco recusa a tag que
 * voltou a ser usada depois que a página abriu.
 *
 * @param id - Tag a excluir (vem do cliente; validado aqui).
 * @returns `ok`, ou a mensagem para a tela; sem sessão, redireciona para a entrada.
 */
export async function excluirTag(id: string): Promise<ResultadoMovimento> {
  const supabase = await clienteComSessao();
  const recusada: ResultadoMovimento = {
    ok: false,
    mensagem: 'Esta tag não pode ser excluída: ela voltou a ser usada ou não existe mais.',
  };
  if (!ehIdValido(id)) return recusada;

  try {
    if (!(await apagarTag(supabase, id))) return recusada;
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    return { ok: false, mensagem: 'Não foi possível excluir agora. Tente de novo em instantes.' };
  }
  revalidatePath(ROTA_INICIAL, 'layout');
  return { ok: true };
}
