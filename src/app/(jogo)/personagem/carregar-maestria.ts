import 'server-only';
import { connection } from 'next/server';

import { ErroDeMissao } from '@/dados/missoes';
import { obterMaestria, type LinhaMaestria } from '@/dados/progressao';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

/**
 * Maestria e Domínio do usuário logado, para a Ficha (RN-10, RN-18).
 *
 * @throws {Error} Mensagem genérica se o banco falhar (a tela de erro assume; o código vai para o log).
 */
export async function carregarMaestria(): Promise<LinhaMaestria[]> {
  // Só na requisição real: o partialPrefetching pré-renderiza em tempo de
  // execução e proíbe Date.now(), que o supabase-js usa ao ler a sessão.
  await connection();
  const supabase = await criarClienteServidor();
  try {
    return await obterMaestria(supabase);
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    throw new Error('Não foi possível carregar a Maestria.');
  }
}
