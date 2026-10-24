/**
 * Roda uma vez quando o servidor Next sobe, antes de aceitar requisições.
 *
 * Valida todas as variáveis de ambiente: se faltar alguma, o servidor recusa
 * subir com o nome do campo (nunca o valor), em vez de falhar depois, no meio
 * de uma requisição, com um erro vago.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { lerAmbiente } = await import('@/lib/ambiente');
  lerAmbiente();
}
