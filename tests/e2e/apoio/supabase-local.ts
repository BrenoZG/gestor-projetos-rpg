import { execSync } from 'node:child_process';

/**
 * Endereço e chaves do Supabase LOCAL, lidos da própria CLI (`supabase status`).
 * As chaves são as de demonstração, iguais em toda instalação local.
 */
export type SupabaseLocal = { url: string; chavePublica: string; chaveSecreta: string };

/** Usuário fictício do Supabase local; domínio reservado, nunca recebe e-mail. */
export const EMAIL_TESTE = 'e2e@exemplo.invalid';

/** Só estes hosts são aceitos: o E2E apaga dados do usuário de teste. */
const HOSTS_LOCAIS = new Set(['127.0.0.1', 'localhost']);

/**
 * Lê a configuração do Supabase local.
 *
 * @returns URL da API e as chaves pública e secreta.
 * @throws {Error} Se a stack local não estiver no ar ou se a URL não for local
 *   (proteção contra rodar a limpeza de dados num banco de verdade).
 */
export function lerSupabaseLocal(): SupabaseLocal {
  const saida = execSync('npx supabase status -o json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const status = JSON.parse(saida) as Record<string, string>;
  const url = status.API_URL;
  if (!url || !HOSTS_LOCAIS.has(new URL(url).hostname)) {
    throw new Error(`E2E recusado: o Supabase precisa ser local (recebido: ${url ?? 'nenhum'}).`);
  }
  if (!status.PUBLISHABLE_KEY || !status.SECRET_KEY) {
    throw new Error('E2E recusado: a CLI não informou as chaves do Supabase local.');
  }
  return { url, chavePublica: status.PUBLISHABLE_KEY, chaveSecreta: status.SECRET_KEY };
}
