import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { ehUuid } from '../../../src/lib/uuid';

import { EMAIL_TESTE, lerSupabaseLocal } from './supabase-local';

/**
 * SQL direto no Postgres LOCAL, para o que nem o usuário nem a chave secreta
 * alcançam pela API: as datas de status são gravadas só pelo trigger, e o
 * ledger de XP nasce sem privilégio para o `service_role`. Roda no contêiner
 * da CLI do Supabase (`docker exec`), aqui e na CI.
 */

/** Contêiner do banco: `supabase_db_<project_id>` (supabase/config.toml). */
function contenedorDoBanco(): string {
  const configuracao = readFileSync('supabase/config.toml', 'utf8');
  const projeto = /^project_id\s*=\s*"([a-z0-9-]+)"/m.exec(configuracao)?.[1];
  if (!projeto) throw new Error('project_id não encontrado em supabase/config.toml.');
  return `supabase_db_${projeto}`;
}

function executarSql(sql: string): void {
  lerSupabaseLocal(); // recusa se a stack não for local
  execFileSync(
    'docker',
    ['exec', '-i', contenedorDoBanco(), 'psql', '-U', 'postgres', '-q', '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
}

/** Zera o ledger do usuário de teste: o XP de conclusão é permanente e se acumularia entre execuções. */
export function zerarXpDoUsuarioDeTeste(): void {
  executarSql(
    `delete from public.eventos_xp where user_id = (select id from auth.users where email = '${EMAIL_TESTE}')`,
  );
}

/**
 * Faz o Projeto parecer estar em Desenvolvimento há `horas`, para a trava de
 * 24 h (RN-06d). O trigger só regrava a data quando o status muda.
 *
 * @param projetoId - Projeto do usuário de teste, já em Desenvolvimento.
 * @param horas - Inteiro de horas no passado.
 */
export function retrocederDesenvolvimento(projetoId: string, horas: number): void {
  if (!ehUuid(projetoId) || !Number.isInteger(horas)) throw new Error('Id ou horas inválidos.');
  executarSql(
    `update public.projetos set inicio_desenvolvimento_em = now() - interval '${horas} hours' where id = '${projetoId}'`,
  );
}
