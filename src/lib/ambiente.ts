import { z } from 'zod';

/**
 * Contrato das variáveis de ambiente, validado na fronteira.
 *
 * Falhar cedo e com o nome do campo evita o erro tardio e vago
 * ("fetch failed") quando uma variável some no deploy. A mensagem
 * lista apenas NOMES de campos, nunca valores: um segredo inválido
 * não pode vazar para log.
 */
const esquemaAmbiente = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  ALLOWLIST_GITHUB_IDS: z
    .string()
    .regex(/^\d+(,\d+)*$/)
    .transform((valor) => valor.split(',')),
  CRON_SECRET: z.string().min(32).optional(),
});

export type Ambiente = z.infer<typeof esquemaAmbiente>;

/**
 * Lê e valida as variáveis de ambiente.
 *
 * @param fonte - Origem dos valores; `process.env` por padrão, injetável em teste.
 * @returns Ambiente tipado e normalizado.
 * @throws Error com a lista de campos inválidos (sem valores).
 */
export function lerAmbiente(fonte: Record<string, string | undefined> = process.env): Ambiente {
  const resultado = esquemaAmbiente.safeParse(fonte);
  if (!resultado.success) {
    const campos = [...new Set(resultado.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Variáveis de ambiente inválidas: ${campos.join(', ')}`);
  }
  return resultado.data;
}
