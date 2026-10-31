/**
 * Esqueleto enquanto os dados de uma Missão chegam: reserva o espaço do
 * conteúdo (sem salto de layout) e anuncia a espera sem roubar o foco.
 */
export function CarregandoMissao() {
  return (
    <div role="status" className="flex flex-col gap-5" aria-label="Carregando o projeto">
      {[0, 1, 2, 3].map((linha) => (
        <div
          key={linha}
          className="h-12 animate-pulse rounded-md bg-superficie-alta motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
