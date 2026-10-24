export type NivelLog = 'info' | 'aviso' | 'erro';

/**
 * Só valores primitivos: impede, já no tipo, passar um objeto inteiro (como o
 * usuário do Supabase, que traz e-mail e nome) para o log.
 */
export type ContextoLog = Readonly<Record<string, string | number | boolean>>;

const SAIDA_POR_NIVEL = {
  info: (linha: string) => console.info(linha),
  aviso: (linha: string) => console.warn(linha),
  erro: (linha: string) => console.error(linha),
} satisfies Record<NivelLog, (linha: string) => void>;

/**
 * Registra um evento como uma linha JSON (log estruturado), que a Vercel guarda
 * e permite filtrar por campo. Nunca passar dado pessoal no contexto (LGPD).
 *
 * @param nivel - Gravidade do evento.
 * @param evento - Nome estável em snake_case, para filtrar e alertar.
 * @param contexto - Campos extras, sem dado pessoal.
 */
export function registrarEvento(nivel: NivelLog, evento: string, contexto: ContextoLog = {}): void {
  const linha = JSON.stringify({ ...contexto, em: new Date().toISOString(), nivel, evento });
  SAIDA_POR_NIVEL[nivel](linha);
}
