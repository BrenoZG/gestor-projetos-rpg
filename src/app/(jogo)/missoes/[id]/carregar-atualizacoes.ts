import 'server-only';

import { listarAtualizacoesDaMissao, type Atualizacao } from '@/dados/atualizacoes';
import { ErroDeMissao, listarResumoDasMissoes, type ResumoMissao } from '@/dados/missoes';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

export type HistoricoDaMissao = {
  atualizacoes: Atualizacao[];
  missoes: ResumoMissao[];
  falhou: boolean;
};

/**
 * Histórico de Atualizações da Missão e as Missões para onde movê-las (RN-01).
 * Se o banco falhar, a ficha continua de pé: a seção mostra o aviso e o
 * código do erro vai para o log.
 *
 * @param projetoId - Missão já validada pela página.
 * @returns O histórico e as Missões, ou `falhou` com listas vazias.
 */
export async function carregarHistoricoDaMissao(projetoId: string): Promise<HistoricoDaMissao> {
  const supabase = await criarClienteServidor();
  try {
    const [atualizacoes, missoes] = await Promise.all([
      listarAtualizacoesDaMissao(supabase, projetoId),
      listarResumoDasMissoes(supabase),
    ]);
    return { atualizacoes, missoes, falhou: false };
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    return { atualizacoes: [], missoes: [], falhou: true };
  }
}
