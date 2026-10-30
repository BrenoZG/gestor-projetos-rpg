import 'server-only';

import { connection } from 'next/server';

import { ErroDeMissao, listarNomesDeStacks, listarNomesDeTags } from '@/dados/missoes';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

export type Sugestoes = { stacks: string[]; tags: string[] };

async function semFalhar(consulta: Promise<string[]>): Promise<string[]> {
  try {
    return await consulta;
  } catch (erro) {
    // Sem o autocompletar, o formulário continua possível: registra e segue.
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    return [];
  }
}

/**
 * Stacks (e ferramentas) e tags já cadastradas, para o autocompletar do
 * formulário de Missão. As duas consultas correm em paralelo.
 *
 * @returns As listas de nomes; a que falhar vem vazia.
 */
export async function carregarSugestoes(): Promise<Sugestoes> {
  // Só na requisição real (ver docs/arquitetura.md §7): o supabase-js usa Date.now().
  await connection();
  const supabase = await criarClienteServidor();
  const [stacks, tags] = await Promise.all([
    semFalhar(listarNomesDeStacks(supabase)),
    semFalhar(listarNomesDeTags(supabase)),
  ]);
  return { stacks, tags };
}
