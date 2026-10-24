import { createClient } from '@supabase/supabase-js';
import { connection } from 'next/server';

import { lerAmbientePublico } from '@/lib/ambiente';
import { registrarEvento } from '@/lib/log';
import { verificarSaude } from '@/lib/saude';

/** Health check nunca vem de cache: a resposta tem de refletir o agora. */
const SEM_CACHE = { 'Cache-Control': 'no-store' } as const;

/**
 * Health check: `200 {"status":"ok"}` se a aplicação alcança o banco,
 * `503 {"status":"indisponivel"}` se não. Público (o deploy o usa como smoke
 * test), por isso a resposta não traz versão, causa nem nenhum outro detalhe;
 * a causa vai só para o log.
 *
 * Usa um cliente sem sessão (papel `anon`), que só pode executar a função
 * `verificar_saude`, que não lê nenhuma tabela.
 */
export async function GET(): Promise<Response> {
  await connection();
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = lerAmbientePublico();
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const resultado = await verificarSaude(async (sinal) => {
    const { data, error } = await supabase.rpc('verificar_saude').abortSignal(sinal);
    if (error) throw new Error(`verificar_saude falhou: ${error.code}`);
    return data === true;
  });

  if (resultado.status === 'ok') {
    return Response.json({ status: 'ok' }, { headers: SEM_CACHE });
  }
  registrarEvento('erro', 'saude_indisponivel', { causa: resultado.causa });
  return Response.json({ status: 'indisponivel' }, { status: 503, headers: SEM_CACHE });
}
