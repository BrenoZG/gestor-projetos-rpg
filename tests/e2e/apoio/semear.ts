import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

import { ARQUIVO_TOKEN } from './caminhos';
import { lerSupabaseLocal } from './supabase-local';

/**
 * Cria Atualizações em lote como o usuário de teste (token do setup), sob o
 * RLS: o mesmo caminho de permissão do app, sem precisar da chave secreta.
 * Usado onde preencher pela tela seria lento demais (ex.: paginação).
 *
 * @param projetoId - Missão do usuário de teste.
 * @param quantidade - Quantas criar.
 * @param prefixo - Início do título; o sufixo é o número com 3 dígitos.
 */
export async function semearAtualizacoes(
  projetoId: string,
  quantidade: number,
  prefixo: string,
): Promise<void> {
  const { url, chavePublica } = lerSupabaseLocal();
  const { accessToken } = JSON.parse(readFileSync(ARQUIVO_TOKEN, 'utf8')) as { accessToken: string };
  const cliente = createClient(url, chavePublica, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const linhas = Array.from({ length: quantidade }, (_, indice) => ({
    projeto_id: projetoId,
    titulo: `${prefixo} ${String(indice + 1).padStart(3, '0')}`,
    descricao: 'Semeada pelo teste.',
  }));
  const { error } = await cliente.from('atualizacoes').insert(linhas);
  if (error) throw new Error(`Falha ao semear Atualizações: ${error.code} ${error.message}`);
}
