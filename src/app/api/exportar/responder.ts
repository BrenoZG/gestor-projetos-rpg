import { obterDadosExportados } from '@/dados/exportacao';
import { ErroDeMissao } from '@/dados/missoes';
import { contarRegistros, montarArquivoExport, nomeDoArquivoExport } from '@/dominio/exportacao/arquivo';
import { registrarEvento } from '@/lib/log';
import type { criarClienteServidor } from '@/lib/supabase/servidor';

type ClienteSupabase = Awaited<ReturnType<typeof criarClienteServidor>>;

/** O arquivo traz todos os dados do usuário: nenhum cache guarda cópia. */
const SEM_CACHE = { 'Cache-Control': 'no-store' } as const;

/** Corpo máximo de resposta de uma Vercel Function; acima, ela devolve 413. */
const LIMITE_RESPOSTA_BYTES = 4_500_000;

/** A partir daqui o log avisa, antes de o export começar a falhar. */
const AVISO_RESPOSTA_BYTES = 3_500_000;

/**
 * Resposta do `GET /api/exportar` (RF-14), separada da rota para ser testada
 * com um cliente falso.
 *
 * O proxy já barra quem não está logado; a sessão é conferida de novo aqui,
 * como em toda Server Action. Os erros são genéricos para o navegador; o log
 * leva só contagens, tamanho e código do banco, nunca o conteúdo.
 *
 * @param supabase - Cliente com a sessão da requisição.
 * @param agora - Hora do export (data do nome do arquivo e `exportado_em`).
 * @returns 200 com o arquivo para baixar, 401 sem sessão ou 500 se o banco falhar.
 * @throws {Error} Erro inesperado (não do banco): a rota devolve 500 pelo Next.
 */
export async function responderExport(supabase: ClienteSupabase, agora: Date): Promise<Response> {
  const { data: sessao, error: erroSessao } = await supabase.auth.getClaims();
  if (erroSessao || !sessao?.claims) {
    return Response.json({ erro: 'sem-sessao' }, { status: 401, headers: SEM_CACHE });
  }

  try {
    const dados = await obterDadosExportados(supabase);
    // Indentado: o arquivo é para o dono ler e guardar, não só para máquinas.
    const corpo = JSON.stringify(montarArquivoExport(dados, agora), null, 2);
    const bytes = new TextEncoder().encode(corpo).byteLength;
    registrarEvento('info', 'exportacao_dados', { ...contarRegistros(dados), bytes });
    if (bytes > AVISO_RESPOSTA_BYTES) {
      registrarEvento('aviso', 'exportacao_perto_do_limite', { bytes, limite_bytes: LIMITE_RESPOSTA_BYTES });
    }
    return new Response(corpo, {
      headers: {
        ...SEM_CACHE,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeDoArquivoExport(agora)}"`,
      },
    });
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'exportacao_falhou', { codigo: erro.codigo ?? 'sem-codigo' });
    return Response.json({ erro: 'falha-ao-exportar' }, { status: 500, headers: SEM_CACHE });
  }
}
