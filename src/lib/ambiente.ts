import { z } from 'zod';

/** Abaixo disso, o valor não é uma chave real do Supabase (provável placeholder). */
const TAMANHO_MINIMO_CHAVE_PUBLICA = 20;

/**
 * Contrato das variáveis de ambiente, validado na fronteira.
 *
 * Falhar cedo e com o nome do campo evita o erro tardio e vago
 * ("fetch failed") quando uma variável some no deploy. A mensagem
 * lista apenas NOMES de campos, nunca valores: um segredo inválido
 * não pode vazar para log.
 */
const esquemaAmbientePublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // Publishable key (`sb_publishable_...`): formato atual do Supabase, que
  // substitui a anon key em JWT. É pública por natureza; a proteção é o RLS.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(TAMANHO_MINIMO_CHAVE_PUBLICA),
});

const esquemaAmbiente = esquemaAmbientePublico.extend({
  ALLOWLIST_GITHUB_IDS: z
    .string()
    .regex(/^\d+(,\d+)*$/)
    .transform((valor) => valor.split(',')),
});

export type Ambiente = z.infer<typeof esquemaAmbiente>;
export type AmbientePublico = z.infer<typeof esquemaAmbientePublico>;

type FonteAmbiente = Record<string, string | undefined>;

function validar<Esquema extends z.ZodType>(esquema: Esquema, fonte: FonteAmbiente): z.infer<Esquema> {
  const resultado = esquema.safeParse(fonte);
  if (!resultado.success) {
    const campos = [...new Set(resultado.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Variáveis de ambiente inválidas: ${campos.join(', ')}`);
  }
  return resultado.data;
}

/**
 * Lê e valida todas as variáveis de ambiente (uso exclusivo do servidor).
 *
 * @param fonte - Origem dos valores; `process.env` por padrão, injetável em teste.
 * @returns Ambiente tipado e normalizado.
 * @throws Error com a lista de campos inválidos (sem valores).
 */
export function lerAmbiente(fonte: FonteAmbiente = process.env): Ambiente {
  return validar(esquemaAmbiente, fonte);
}

/**
 * Lê só as variáveis públicas (`NEXT_PUBLIC_*`), as únicas de que o proxy
 * precisa. Uso no servidor: no navegador, importar este módulo levaria o Zod
 * para o bundle (ver `lib/supabase/navegador.ts`).
 *
 * @param fonte - Origem dos valores; `process.env` por padrão.
 * @returns URL e publishable key validadas; demais variáveis são descartadas.
 * @throws Error com a lista de campos inválidos (sem valores).
 */
export function lerAmbientePublico(fonte: FonteAmbiente = process.env): AmbientePublico {
  return validar(esquemaAmbientePublico, fonte);
}
