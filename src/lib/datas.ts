/** Fuso de exibição (RNF-05). O banco guarda em UTC (`timestamptz`). */
const FUSO_EXIBICAO = 'America/Sao_Paulo';

const FORMATO_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_EXIBICAO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Data e hora para exibir, no fuso de São Paulo.
 *
 * @param iso - Data em ISO 8601 vinda do banco, ou `null`.
 * @returns Ex.: "25/10/2026, 09:00"; "—" quando não há data.
 */
export function formatarDataHora(iso: string | null): string {
  return iso === null ? '—' : FORMATO_DATA_HORA.format(new Date(iso));
}
