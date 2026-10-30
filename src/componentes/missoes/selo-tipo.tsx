/**
 * Selo da Missão Geral (RN-15), no lugar do emblema de Rank: a Missão Geral não
 * tem Rank. Do mesmo tamanho do emblema (as classes de tamanho vêm de fora),
 * com o texto legível pelo leitor de tela.
 *
 * @param props - Classes de tamanho.
 */
export function SeloGeral({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border border-borda-campo bg-superficie-alta font-mono text-[0.625rem] tracking-[0.12em] text-texto-suave uppercase ${className}`}
    >
      Geral
    </span>
  );
}
