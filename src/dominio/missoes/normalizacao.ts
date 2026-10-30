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
 * Separa o texto digitado num campo de stacks, ferramentas ou tags: a vírgula é separador, nunca parte do nome.
 *
 * @param texto - Texto como digitado (ex.: "Next.js, Supabase,").
 * @returns Nomes sem espaços nas pontas e sem pedaços vazios.
 */
export function separarNomesDigitados(texto: string): string[] {
  return texto
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean);
}

/**
 * Remove nomes (stacks, ferramentas ou tags) repetidos ou vazios, mantendo a primeira grafia de cada um e a ordem de entrada (RN-05).
 *
 * @param nomes - Nomes como digitados.
 * @returns Nomes sem espaços nas pontas e sem repetição.
 */
export function deduplicarNomes(nomes: readonly string[]): string[] {
  const vistas = new Map<string, string>();
  for (const nome of nomes) {
    const limpa = nome.trim();
    const chave = chaveDeComparacao(limpa);
    if (chave && !vistas.has(chave)) vistas.set(chave, limpa);
  }
  return [...vistas.values()];
}
