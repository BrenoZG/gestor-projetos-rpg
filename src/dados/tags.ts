import { ErroDeMissao } from '@/dados/missoes';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

/**
 * Acesso às tags no Postgres (RF-27 a RF-29), sempre com a sessão do usuário:
 * o RLS garante que cada consulta só enxerga e altera as tags do próprio dono.
 */

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Tag com a quantidade de Missões que a usam (RF-27). */
export type TagComUso = { id: string; nome: string; missoes: number };

type LinhaTagComUso = { id: string; nome: string; projeto_tags: ReadonlyArray<{ projeto_id: string }> };

/**
 * Tags do usuário em ordem alfabética, com a quantidade de Missões de cada uma.
 * A contagem vem dos vínculos embutidos, sem depender de agregação no PostgREST.
 *
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function listarTagsComUso(supabase: ClienteSupabase): Promise<TagComUso[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, nome, projeto_tags(projeto_id)')
    .order('nome');
  if (error) throw new ErroDeMissao('listar_tags_uso', error.code);
  return (data as LinhaTagComUso[]).map(({ id, nome, projeto_tags }) => ({
    id,
    nome,
    missoes: projeto_tags.length,
  }));
}

export type ResultadoRenomeacao = 'renomeada' | 'conflito' | 'juntada';

export type ResultadoGravacaoTag =
  | { ok: true; resultado: ResultadoRenomeacao; missoes: number; destino: string }
  | { ok: false; codigo: string | undefined };

type LinhaRenomeacao = { resultado: ResultadoRenomeacao; projetos: number; destino: string };

/**
 * Renomeia uma tag pela `renomear_tag` (RN-19). Se o nome já é de outra tag,
 * sem `juntar` devolve o conflito; com `juntar`, junta as duas numa transação.
 *
 * @param id - Tag a renomear.
 * @param nome - Nome novo, já validado.
 * @param juntar - Se o usuário já confirmou a junção.
 * @returns O resultado, as Missões que tinham a tag e a grafia final (no
 *   conflito, a da tag existente); ou o código do erro do banco.
 */
export async function gravarNomeDaTag(
  supabase: ClienteSupabase,
  id: string,
  nome: string,
  juntar: boolean,
): Promise<ResultadoGravacaoTag> {
  const { data, error } = await supabase
    .rpc('renomear_tag', { p_id: id, p_nome: nome, p_juntar: juntar })
    .single();
  if (error) return { ok: false, codigo: error.code };
  const { resultado, projetos, destino } = data as LinhaRenomeacao;
  return { ok: true, resultado, missoes: projetos, destino };
}

/**
 * Exclui uma tag do usuário que nenhuma Missão usa (RF-29). O RLS não alcança
 * a tag em uso, a inexistente e a de outro usuário: o delete afeta 0 linhas.
 *
 * @returns `true` se excluiu; `false` se a tag está em uso, não existe ou é de outro usuário.
 * @throws {ErroDeMissao} Se a exclusão falhar.
 */
export async function apagarTag(supabase: ClienteSupabase, id: string): Promise<boolean> {
  const { data, error } = await supabase.from('tags').delete().eq('id', id).select('id');
  if (error) throw new ErroDeMissao('excluir_tag', error.code);
  return data.length > 0;
}
