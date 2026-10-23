/** Nome do provedor GitHub como o Supabase Auth o registra em cada identidade. */
const PROVEDOR_GITHUB = 'github';

/**
 * Parte de uma identidade do Supabase Auth que a autorização usa.
 *
 * `id` é o ID da conta no provedor (`provider_id`), não o UUID interno do
 * Supabase: para o GitHub, o ID numérico da conta, sempre como string.
 * Compatível por estrutura com `UserIdentity` do `@supabase/supabase-js`.
 */
export type Identidade = {
  readonly provider: string;
  readonly id: string;
};

/**
 * Decide se o usuário pode entrar no sistema.
 *
 * Usa só a identidade do GitHub, que vem do provedor e não pode ser editada
 * pelo usuário (ao contrário do `user_metadata`). A comparação é exata e entre
 * strings: converter para número perderia precisão em IDs grandes e aceitaria
 * variações como `0123`.
 *
 * @param identidades - Identidades vinculadas ao usuário (`user.identities`).
 * @param allowlist - IDs do GitHub autorizados; vazia nega todos.
 * @returns `true` se alguma identidade do GitHub estiver na allowlist.
 */
export function estaAutorizado(identidades: readonly Identidade[], allowlist: readonly string[]): boolean {
  return identidades.some(
    (identidade) => identidade.provider === PROVEDOR_GITHUB && allowlist.includes(identidade.id),
  );
}
