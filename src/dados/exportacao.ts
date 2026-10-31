import { z } from 'zod';

import { TABELAS_EM_LISTA, type DadosExportados } from '@/dominio/exportacao/arquivo';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

import { ErroDeMissao } from './missoes';

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

const esquemaRegistro = z.record(z.string(), z.unknown());

/**
 * Formato devolvido pela `exportar_dados`. Estrito de propósito: uma tabela
 * faltando ou sobrando é erro, porque um backup incompleto ou com uma tabela
 * descartada em silêncio é pior que nenhum.
 */
const esquemaDados = z.strictObject({
  personagem: esquemaRegistro.nullable(),
  ...Object.fromEntries(TABELAS_EM_LISTA.map((tabela) => [tabela, z.array(esquemaRegistro)])),
});

/**
 * Todos os dados do usuário, pela função `exportar_dados`, que devolve um valor
 * só: escapa do corte de linhas da Data API e lê uma foto consistente do banco.
 * O RLS só deixa ler as linhas do próprio dono.
 *
 * @throws {ErroDeMissao} Se a consulta falhar ou o formato não for o esperado.
 */
export async function obterDadosExportados(supabase: ClienteSupabase): Promise<DadosExportados> {
  const { data, error } = await supabase.rpc('exportar_dados');
  if (error) throw new ErroDeMissao('exportar_dados', error.code);
  const resultado = esquemaDados.safeParse(data);
  if (!resultado.success) throw new ErroDeMissao('exportar_dados', 'formato-inesperado');
  // O esquema já conferiu cada tabela; o `Object.fromEntries` só não preserva os nomes no tipo.
  return resultado.data as DadosExportados;
}
