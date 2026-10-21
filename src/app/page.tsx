/**
 * Quadro de Missões — estado vazio do M0. O quadro real nasce no M1.
 *
 * @returns Página inicial.
 */
export default function PaginaInicial() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-24" aria-labelledby="titulo-quadro">
      <span className="font-mono text-sm tracking-[0.14em] text-acento">[ SISTEMA ] · MISSÕES</span>
      <h1 id="titulo-quadro" className="font-display text-4xl font-extrabold">
        Quadro de Missões
      </h1>
      <p className="text-texto-suave">Nenhuma missão registrada ainda.</p>
    </section>
  );
}
