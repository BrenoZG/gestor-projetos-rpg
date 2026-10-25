import 'server-only';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { ErroDeMissao, obterMissao, type Missao } from '@/dados/missoes';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';
import { ehUuid } from '@/lib/uuid';

/**
 * Lê a Missão indicada na URL, para o detalhe e para a edição.
 * Id malformado, Missão inexistente ou de outro usuário (o RLS a esconde) → 404.
 *
 * @param params - Parâmetros da rota `/missoes/[id]`.
 * @returns A Missão.
 * @throws {Error} Mensagem genérica se o banco falhar (a tela de erro assume; o código vai para o log).
 */
export async function carregarMissaoDaUrl(params: Promise<{ id: string }>): Promise<Missao> {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  await connection();
  const supabase = await criarClienteServidor();

  let missao: Missao | null;
  try {
    missao = await obterMissao(supabase, id);
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    throw new Error('Não foi possível carregar a missão.');
  }
  if (!missao) notFound();
  return missao;
}
