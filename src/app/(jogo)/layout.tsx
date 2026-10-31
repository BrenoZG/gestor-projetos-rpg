import { AtalhoFicha } from '@/componentes/atalho-ficha';
import { ConteudoPrincipal } from '@/componentes/conteudo-principal';
import { Particulas } from '@/componentes/particulas';
import { ProvedorSistema } from '@/componentes/sistema/provedor-sistema';

import { Hud } from './hud';

/**
 * Casca das telas do jogo (usuário logado): fundo vivo, HUD fixo no topo e o
 * conteúdo ocupando a largura toda da janela. O atalho `C` da Ficha vale em
 * todas as telas do jogo, e a fila do Sistema mostra uma janela de cada vez
 * (Janela do Sistema da conclusão, depois a cinemática de level up).
 *
 * @param props - Tela ativa.
 */
export default function LayoutJogo({ children }: LayoutProps<'/'>) {
  return (
    <div className="portal-sistema relative flex min-h-dvh flex-col">
      <Particulas lentas />
      <AtalhoFicha />
      <ProvedorSistema>
        <Hud />
        <ConteudoPrincipal className="relative flex flex-1 flex-col">{children}</ConteudoPrincipal>
      </ProvedorSistema>
    </div>
  );
}
