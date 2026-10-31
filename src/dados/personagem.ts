import { ehChaveClasse, type ChaveClasse } from '@/dominio/personagem/classes';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

import { ErroDeMissao } from './missoes';

/**
 * Acesso à tabela `personagem` com a sessão do usuário: o RLS só deixa ler e
 * alterar a própria linha; o GRANT por coluna só deixa alterar `classe`.
 */

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

export type DadosPersonagem = {
  /** `null` até a primeira escolha (RF-17). */
  classe: ChaveClasse | null;
  /** Maior nível já alcançado (RN-08). */
  nivelMaximo: number;
};

type LinhaPersonagem = { classe: string | null; nivel_maximo: number };

/**
 * Classe e nível máximo do usuário logado.
 *
 * @returns Os dados, ou `null` se a linha não existe (o login a cria).
 * @throws {ErroDeMissao} Se a consulta falhar.
 */
export async function obterPersonagem(supabase: ClienteSupabase): Promise<DadosPersonagem | null> {
  const { data, error } = await supabase.from('personagem').select('classe, nivel_maximo').maybeSingle();
  if (error) throw new ErroDeMissao('ler_personagem', error.code);
  if (!data) return null;
  const { classe, nivel_maximo } = data as LinhaPersonagem;
  return { classe: classe !== null && ehChaveClasse(classe) ? classe : null, nivelMaximo: nivel_maximo };
}

/**
 * Grava a Classe escolhida (RF-17, RF-18). O filtro por `user_id` repete o RLS
 * de propósito: um UPDATE sem filtro dependeria só da política.
 *
 * @returns `true` se a linha foi alterada; `false` se o personagem não existe.
 * @throws {ErroDeMissao} Se o banco recusar ou falhar.
 */
export async function gravarClasse(
  supabase: ClienteSupabase,
  idUsuario: string,
  classe: ChaveClasse,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('personagem')
    .update({ classe })
    .eq('user_id', idUsuario)
    .select('user_id');
  if (error) throw new ErroDeMissao('gravar_classe', error.code);
  return (data ?? []).length > 0;
}

/**
 * Guarda o nível como máximo, se for maior que o registrado (RN-08). A função
 * do banco ignora um nível menor.
 *
 * @throws {ErroDeMissao} Se o banco recusar ou falhar.
 */
export async function registrarNivelMaximo(supabase: ClienteSupabase, nivel: number): Promise<void> {
  const { error } = await supabase.rpc('registrar_nivel_maximo', { p_nivel: nivel });
  if (error) throw new ErroDeMissao('registrar_nivel_maximo', error.code);
}
