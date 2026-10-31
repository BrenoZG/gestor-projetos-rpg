import 'server-only';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';

import { ErroDeMissao } from '@/dados/missoes';
import { obterPersonagem } from '@/dados/personagem';
import { obterXpPorTrilha, type XpPorTrilha } from '@/dados/progressao';
import { ROTA_ESCOLHER_CLASSE } from '@/dominio/acesso/rotas';
import type { ChaveClasse } from '@/dominio/personagem/classes';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

export type PersonagemDoJogo = {
  classe: ChaveClasse;
  /** Maior nível já registrado no banco (RN-08). */
  nivelMaximo: number;
  /** Último nível cuja cinemática já tocou (RF-16). */
  nivelVisto: number;
  xp: XpPorTrilha;
};

/**
 * Personagem e XP do usuário logado, lidos uma vez por requisição (`cache`):
 * HUD, Quadro e página do Personagem usam a mesma leitura.
 *
 * Sem Classe, manda para a escolha (RF-17). A checagem fica aqui, junto da
 * leitura, e não no layout: o layout não renderiza de novo na navegação e não
 * impede a página de rodar (docs do Next, "Layouts and auth checks").
 *
 * @throws {Error} Mensagem genérica se o banco falhar (a tela de erro assume; o código vai para o log).
 */
export const carregarPersonagem = cache(async (): Promise<PersonagemDoJogo> => {
  // Só na requisição real: o partialPrefetching pré-renderiza em tempo de
  // execução e proíbe Date.now(), que o supabase-js usa ao ler a sessão.
  await connection();
  const supabase = await criarClienteServidor();
  let leitura: Awaited<ReturnType<typeof lerTudo>>;
  try {
    leitura = await lerTudo(supabase);
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    throw new Error('Não foi possível carregar o personagem.');
  }
  const [personagem, xp] = leitura;
  if (!personagem?.classe) redirect(ROTA_ESCOLHER_CLASSE);
  return {
    classe: personagem.classe,
    nivelMaximo: personagem.nivelMaximo,
    nivelVisto: personagem.nivelVisto,
    xp,
  };
});

function lerTudo(supabase: Awaited<ReturnType<typeof criarClienteServidor>>) {
  return Promise.all([obterPersonagem(supabase), obterXpPorTrilha(supabase)]);
}
