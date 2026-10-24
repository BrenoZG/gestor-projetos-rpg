import { ConteudoPrincipal } from '@/componentes/conteudo-principal';
import { Particulas } from '@/componentes/particulas';

import { Hud } from './hud';

/**
 * Casca das telas do jogo (usuário logado): fundo vivo, HUD fixo no topo e o
 * conteúdo ocupando a largura toda da janela.
 *
 * @param props - Tela ativa.
 */
export default function LayoutJogo({ children }: LayoutProps<'/'>) {
  return (
    <div className="portal-sistema relative flex min-h-dvh flex-col">
      <Particulas lentas />
      <Hud />
      <ConteudoPrincipal className="relative flex flex-1 flex-col">{children}</ConteudoPrincipal>
    </div>
  );
}
