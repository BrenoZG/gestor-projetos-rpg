import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { ehChaveClasse } from '../../../src/dominio/personagem/classes';
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

function exigirNivel(nivel: number): void {
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 100) throw new Error('Nível inválido.');
}

/**
 * Estado do personagem do usuário de teste. O `nivel_maximo` e o `nivel_visto`
 * só são gravados pelas funções do banco, e a Classe nula simula o 1º acesso
 * (RF-17). O `nivelVisto` padrão (100) desliga a cinemática de level up (M5):
 * só os testes dela pedem um valor menor.
 *
 * @param estado - Classe (ou `null`), nível máximo e último nível exibido, de 1 a 100.
 */
export function definirPersonagemDoUsuarioDeTeste({
  classe,
  nivelMaximo = 1,
  nivelVisto = 100,
}: {
  classe: string | null;
  nivelMaximo?: number;
  nivelVisto?: number;
}): void {
  if (classe !== null && !ehChaveClasse(classe)) throw new Error('Classe inválida.');
  exigirNivel(nivelMaximo);
  exigirNivel(nivelVisto);
  const valorClasse = classe === null ? 'null' : `'${classe}'`;
  executarSql(
    `insert into public.personagem (user_id, classe, nivel_maximo, nivel_visto)
     select id, ${valorClasse}, ${nivelMaximo}, ${nivelVisto} from auth.users where email = '${EMAIL_TESTE}'
     on conflict (user_id) do update set classe = excluded.classe, nivel_maximo = excluded.nivel_maximo,
       nivel_visto = excluded.nivel_visto`,
  );
}

/** Stack ou ferramenta de teste: só letras, números, ponto e espaço (vai direto no SQL). */
const NOME_STACK_SEGURO = /^[\p{L}\p{N}. ]{1,40}$/u;

/**
 * Grava no ledger uma conclusão de Projeto fictícia, para a Maestria (RN-10):
 * mais rápido e exato que cumprir a trava de 24 h pela interface.
 *
 * @param conclusao - Trilha, XP (inteiro positivo) e stacks já normalizadas.
 */
export function inserirConclusaoDoUsuarioDeTeste({
  trilha,
  xp,
  stacks,
}: {
  trilha: 'desenvolvedor' | 'produtividade';
  xp: number;
  stacks: string[];
}): void {
  if (!Number.isInteger(xp) || xp < 1) throw new Error('XP inválido.');
  if (!stacks.every((stack) => NOME_STACK_SEGURO.test(stack))) throw new Error('Stack inválida.');
  const lista = stacks.map((stack) => `'${stack}'`).join(', ');
  executarSql(
    `insert into public.eventos_xp (user_id, tipo, trilha, referencia_id, xp, nome_snapshot, stacks_snapshot)
     select id, 'conclusao_projeto', '${trilha}', gen_random_uuid(), ${xp}, 'Projeto de teste', array[${lista}]::text[]
     from auth.users where email = '${EMAIL_TESTE}'`,
  );
}
