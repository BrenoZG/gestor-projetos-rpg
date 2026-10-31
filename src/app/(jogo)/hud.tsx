import { sair } from '@/acoes/sessao';
import { BarraXp } from '@/componentes/barra-xp';
import { EmblemaRank } from '@/componentes/emblema-rank';
import { NavegacaoPrincipal } from '@/componentes/navegacao-principal';
import { SeletorEfeitos } from '@/componentes/seletor-efeitos';
import { CinematicaNivel } from '@/componentes/sistema/cinematica-nivel';
import { nomeDaClasse } from '@/dominio/personagem/classes';
import { conquistaPendente } from '@/dominio/progressao/conquista';
import { nivelConquistado } from '@/dominio/progressao/medalhas';
import {
  progressoDoNivel,
  rankDoAventureiro,
  tituloDoNivel,
  type ProgressoNivel,
} from '@/dominio/progressao/progressao';
import { obterPreferenciaEfeitos } from '@/lib/efeitos-servidor';

import { carregarPersonagem } from './carregar-personagem';

function textoDoXp({ xpNoNivel, xpParaProximo }: ProgressoNivel): string {
  return xpParaProximo === null ? 'NÍVEL MÁXIMO' : `${xpNoNivel} / ${xpParaProximo} XP`;
}

/**
 * HUD do Aventureiro: barra superior com Rank, título, classe, nível e XP
 * (RF-12). O XP é a soma do ledger por trilha; a trilha Produtividade (RN-18)
 * só aparece quando tem XP, sem medalha, título nem Rank. Os dados vêm do
 * usuário logado (RLS: só as próprias linhas); sem Classe, o carregador manda
 * para a escolha (RF-17). Também traz a cinemática de level up, quando há um
 * nível ainda não exibido (RF-16): o HUD já tem o nível e é renderizado de novo
 * depois de toda ação que dá XP.
 *
 * @throws {Error} Se o personagem ou o XP não puderem ser lidos; a tela de erro assume.
 */
export async function Hud() {
  const [{ classe: chaveClasse, xp, nivelMaximo, nivelVisto }, efeitos] = await Promise.all([
    carregarPersonagem(),
    obterPreferenciaEfeitos(),
  ]);

  const progresso = progressoDoNivel(xp.desenvolvedor);
  const produtividade = xp.produtividade > 0 ? progressoDoNivel(xp.produtividade) : null;
  const rank = rankDoAventureiro(progresso.nivel);
  const classe = nomeDaClasse(chaveClasse);
  const conquista = conquistaPendente(nivelVisto, nivelConquistado(nivelMaximo, progresso.nivel));

  return (
    <header className="hud-sistema entrada-hud sticky top-0 z-30">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <EmblemaRank rank={rank} className="h-12 w-11 shrink-0 drop-shadow-[0_0_10px_rgb(0_0_0/0.6)]" />
          <div className="flex min-w-0 flex-col">
            <span className="font-mono text-[0.6875rem] tracking-[0.2em] text-acento">
              RANK {rank} · AVENTUREIRO
            </span>
            <span className="truncate font-display text-base font-extrabold sm:text-lg">
              {tituloDoNivel(progresso.nivel)}
            </span>
            <span className="truncate text-xs text-texto-suave">{classe}</span>
          </div>
        </div>

        <div className="order-last flex basis-full flex-col gap-1.5 sm:order-none sm:flex-1 sm:basis-auto">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-texto-suave">
              NV <span className="font-display text-xl font-extrabold text-texto">{progresso.nivel}</span>
            </span>
            <BarraXp progresso={progresso} className="min-w-24 flex-1" />
            <span className="font-mono text-xs whitespace-nowrap text-texto-suave">
              {textoDoXp(progresso)}
            </span>
          </div>
          {produtividade && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.6875rem] whitespace-nowrap text-texto-suave">
                PRODUTIVIDADE · NV {produtividade.nivel}
              </span>
              <BarraXp
                progresso={produtividade}
                rotulo="Progresso de XP de Produtividade no nível atual"
                variante="secundaria"
                className="min-w-16 flex-1"
              />
              <span className="font-mono text-[0.6875rem] whitespace-nowrap text-texto-suave">
                {textoDoXp(produtividade)}
              </span>
            </div>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <NavegacaoPrincipal />
          <SeletorEfeitos inicial={efeitos} />
          <form action={sair}>
            <button
              type="submit"
              className="min-h-11 cursor-pointer rounded-md border border-borda-campo px-4 text-sm text-texto-suave transition-colors duration-200 hover:border-texto-suave hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
      {/* A key recria o componente a cada conquista nova (estado "fechada" zerado). */}
      {conquista && <CinematicaNivel key={`${conquista.de}-${conquista.para}`} conquista={conquista} />}
    </header>
  );
}
