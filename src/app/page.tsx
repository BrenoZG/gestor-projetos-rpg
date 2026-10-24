import { sair } from '@/acoes/sessao';

/**
 * Quadro de Missões — estado vazio. As missões chegam no M1b.
 *
 * @returns Página inicial.
 */
export default function PaginaInicial() {
  return (
    <section
      className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-24 sm:px-6"
      aria-labelledby="titulo-quadro"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-sm tracking-[0.14em] text-acento">[ SISTEMA ] · MISSÕES</span>
        <form action={sair}>
          <button
            type="submit"
            className="min-h-11 cursor-pointer rounded-md border border-borda-campo px-4 text-sm text-texto-suave transition-colors duration-200 ease-suave hover:border-texto-suave hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
          >
            Sair
          </button>
        </form>
      </div>
      <h1 id="titulo-quadro" className="font-display text-4xl font-extrabold">
        Quadro de Missões
      </h1>
      <p className="text-texto-suave">Nenhuma missão registrada ainda.</p>
    </section>
  );
}
