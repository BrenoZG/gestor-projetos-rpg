import 'server-only';

import type { ClienteSupabase } from '@/acoes/checagens';
import { ErroDeMissao } from '@/dados/missoes';
import { registrarNivelMaximo } from '@/dados/personagem';
import { obterXpPorTrilha } from '@/dados/progressao';
import { calcularNivel } from '@/dominio/progressao/progressao';
import { registrarEvento } from '@/lib/log';

/**
 * Depois de uma ação que deu XP, guarda o nível de Desenvolvedor como máximo
 * (RN-08). O XP já está gravado: uma falha aqui só vai para o log, porque a
 * tela usa o maior entre o máximo e o nível atual e nenhuma medalha some.
 * A trilha Produtividade não tem medalha (RN-18), então não entra.
 *
 * @param supabase - Cliente com a sessão do usuário.
 */
export async function sincronizarNivelMaximo(supabase: ClienteSupabase): Promise<void> {
  try {
    const xp = await obterXpPorTrilha(supabase);
    await registrarNivelMaximo(supabase, calcularNivel(xp.desenvolvedor));
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
  }
}
