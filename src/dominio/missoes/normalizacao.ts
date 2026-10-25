/**
 * Normalização de textos da Missão (RN-05 e unicidade do nome, requisitos.md §3).
 * O banco aplica a mesma regra (`lower(trim(...))`) nas colunas `nome_normalizado`.
 */

/**
 * Forma usada para comparar nomes e stacks: sem espaços nas pontas e em minúsculas.
 *
 * @param texto - Texto como digitado.
 * @returns Chave de comparação.
 */
export function chaveDeComparacao(texto: string): string {
  return texto.trim().toLowerCase();
}

/**
 * Separa o texto digitado no campo de stacks: a vírgula é separador, nunca parte do nome.
 *
 * @param texto - Texto como digitado (ex.: "Next.js, Supabase,").
 * @returns Stacks sem espaços nas pontas e sem pedaços vazios.
 */
export function separarStacksDigitadas(texto: string): string[] {
  return texto
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean);
}

/**
 * Remove stacks repetidas ou vazias, mantendo a primeira grafia de cada uma e a ordem de entrada.
 *
 * @param stacks - Stacks como digitadas.
 * @returns Stacks sem espaços nas pontas e sem repetição.
 */
export function deduplicarStacks(stacks: readonly string[]): string[] {
  const vistas = new Map<string, string>();
  for (const stack of stacks) {
    const limpa = stack.trim();
    const chave = chaveDeComparacao(limpa);
    if (chave && !vistas.has(chave)) vistas.set(chave, limpa);
  }
  return [...vistas.values()];
}
