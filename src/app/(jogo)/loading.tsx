import { SigiloRunico } from '@/componentes/sigilo-runico';

/**
 * Estado de carregamento das telas do jogo (o HUD já aparece; o conteúdo carrega).
 * `role="status"` anuncia a espera ao leitor de tela sem roubar o foco.
 */
export default function Carregando() {
  return (
    <div
      role="status"
      className="entrada-suave flex flex-1 flex-col items-center justify-center gap-5 px-4 py-24"
    >
      <SigiloRunico className="h-28 w-28" />
      <p className="font-mono text-sm tracking-[0.2em] text-texto-suave">
        CARREGANDO O SISTEMA<span className="cursor-piscante">_</span>
      </p>
    </div>
  );
}
