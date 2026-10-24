/** Quantidade casada com as regras `.particulas > span:nth-child(n)` do globals.css. */
const QUANTIDADE_PARTICULAS = 14;

/**
 * Brasas subindo pela tela de título. Posição, duração e atraso de cada uma
 * vêm do CSS (`nth-child`), porque estilo inline seria bloqueado pela CSP.
 * Decorativo e sem captura de clique.
 */
export function Particulas() {
  return (
    <div aria-hidden="true" className="particulas pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: QUANTIDADE_PARTICULAS }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
