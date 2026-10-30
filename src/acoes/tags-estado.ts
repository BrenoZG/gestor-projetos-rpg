/**
 * Formatos compartilhados entre as Server Actions de tags e os componentes de
 * cliente. Fica separado da validação para que o Zod não entre no bundle do
 * navegador (ver `missoes-estado.ts`).
 */

/** Resposta de renomear uma tag; as mensagens já vêm prontas para a tela. */
export type ResultadoRenomeacaoTag =
  | { tipo: 'concluida'; mensagem: string }
  | { tipo: 'conflito'; destino: string; missoes: number }
  | { tipo: 'erro'; mensagem: string };

/**
 * Quantidade de projetos por extenso, no singular ou no plural.
 *
 * @param quantidade - Número de projetos.
 * @returns Ex.: "1 projeto", "3 projetos".
 */
export function quantidadeDeProjetos(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'projeto' : 'projetos'}`;
}
