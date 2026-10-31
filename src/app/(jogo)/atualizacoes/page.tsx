import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { ListaAtualizacoes } from '@/componentes/atualizacoes/lista-atualizacoes';
import { AvisoErro } from '@/componentes/aviso-erro';
import { CarregandoMissao } from '@/componentes/missoes/carregando-missao';
import { CLASSES_CAMPO, CLASSES_ROTULO } from '@/componentes/missoes/estilos';
import { JanelaMissao } from '@/componentes/missoes/janela-missao';
import { CLASSES_ACAO_PRINCIPAL, CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import { listarAtualizacoes, type Atualizacao } from '@/dados/atualizacoes';
import { ErroDeMissao, listarResumoDasMissoes, type ResumoMissao } from '@/dados/missoes';
import {
  escreverFiltrosAtualizacoes,
  lerFiltrosAtualizacoes,
  totalDePaginas,
  type FiltrosAtualizacoes,
} from '@/dominio/atualizacoes/filtros';
import { ROTULOS_STATUS, STATUS_MISSAO } from '@/dominio/missoes/campos';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

export const metadata: Metadata = { title: 'Atualizações' };

const CAMINHO = '/atualizacoes';

type Consulta = { itens: Atualizacao[]; total: number; missoes: ResumoMissao[] } | null;

/** Converte os `searchParams` do Next (texto ou lista) em `URLSearchParams`. */
function paraParametros(entrada: Record<string, string | string[] | undefined>): URLSearchParams {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(entrada)) {
    const primeiro = Array.isArray(valor) ? valor[0] : valor;
    if (primeiro !== undefined) parametros.set(chave, primeiro);
  }
  return parametros;
}

async function consultar(filtros: FiltrosAtualizacoes): Promise<Consulta> {
  await connection();
  const supabase = await criarClienteServidor();
  try {
    const [{ itens, total }, missoes] = await Promise.all([
      listarAtualizacoes(supabase, filtros),
      listarResumoDasMissoes(supabase),
    ]);
    return { itens, total, missoes };
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    return null;
  }
}

const urlDaPagina = (filtros: FiltrosAtualizacoes, pagina: number) => {
  const consulta = escreverFiltrosAtualizacoes({ ...filtros, pagina });
  return consulta ? `${CAMINHO}?${consulta}` : CAMINHO;
};

async function ConteudoAtualizacoes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filtros = lerFiltrosAtualizacoes(paraParametros(await searchParams));
  const resultado = await consultar(filtros);
  if (!resultado) {
    return (
      <AvisoErro titulo="Atualizações indisponíveis.">
        Não foi possível carregar as atualizações. Recarregue a página em instantes.
      </AvisoErro>
    );
  }

  const { itens, total, missoes } = resultado;
  const filtrado = filtros.status !== null || filtros.missao !== null;
  const paginas = totalDePaginas(total);

  return (
    <div className="flex flex-col gap-6">
      <Form
        action={CAMINHO}
        role="search"
        aria-label="Filtrar atualizações"
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="filtro-status" className={CLASSES_ROTULO}>
            Status
          </label>
          <select
            id="filtro-status"
            name="status"
            defaultValue={filtros.status ?? ''}
            className={`${CLASSES_CAMPO} cursor-pointer`}
          >
            <option value="">Todos</option>
            {STATUS_MISSAO.map((status) => (
              <option key={status} value={status}>
                {ROTULOS_STATUS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="filtro-missao" className={CLASSES_ROTULO}>
            Projeto
          </label>
          <select
            id="filtro-missao"
            name="missao"
            defaultValue={filtros.missao ?? ''}
            className={`${CLASSES_CAMPO} cursor-pointer`}
          >
            <option value="">Todas</option>
            {missoes.map((missao) => (
              <option key={missao.id} value={missao.id}>
                {missao.nome}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={CLASSES_ACAO_PRINCIPAL}>
          Filtrar
        </button>
      </Form>

      <div className="flex min-h-8 flex-wrap items-center gap-3">
        <p className="font-mono text-xs text-texto-suave">
          {total} {total === 1 ? 'atualização' : 'atualizações'}
          {total > 0 && ` · Página ${filtros.pagina} de ${paginas}`}
        </p>
        {filtrado && (
          <Link
            href={CAMINHO}
            className="min-h-8 rounded px-2 text-sm text-acento underline underline-offset-4 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
          >
            Limpar filtros
          </Link>
        )}
      </div>

      {itens.length > 0 ? (
        <ListaAtualizacoes
          atualizacoes={itens}
          missoes={missoes}
          rotulo="Atualizações encontradas"
          mostrarMissao
        />
      ) : (
        <p className="rounded-md border border-dashed border-borda-campo px-6 py-8 text-center text-texto">
          {filtrado
            ? 'Nenhuma atualização com esses filtros.'
            : 'Nenhuma atualização registrada ainda. Elas são registradas na ficha de cada projeto.'}
        </p>
      )}

      {paginas > 1 && (
        <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3">
          {filtros.pagina > 1 ? (
            <Link
              href={urlDaPagina(filtros, filtros.pagina - 1)}
              aria-label="Página anterior"
              className={CLASSES_ACAO_SECUNDARIA}
            >
              <span aria-hidden="true">←</span>&nbsp;Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-xs text-texto-suave">
            Página {filtros.pagina} de {paginas}
          </span>
          {filtros.pagina < paginas ? (
            <Link
              href={urlDaPagina(filtros, filtros.pagina + 1)}
              aria-label="Próxima página"
              className={CLASSES_ACAO_SECUNDARIA}
            >
              Próxima&nbsp;<span aria-hidden="true">→</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

/**
 * Página geral de Atualizações (RF-10): todas as do usuário, com filtros por
 * status e por Missão e 50 por página. Só consulta e muda status; o registro
 * fica na ficha de cada Missão.
 *
 * @param props - `searchParams` com `status`, `missao` e `pagina`.
 * @returns A página.
 */
export default function PaginaAtualizacoes({ searchParams }: PageProps<'/atualizacoes'>) {
  return (
    <JanelaMissao
      rotulo="[ SISTEMA ] · ATUALIZAÇÕES"
      titulo="Atualizações"
      voltarPara="/"
      textoVoltar="Quadro de Projetos"
    >
      <Suspense fallback={<CarregandoMissao />}>
        <ConteudoAtualizacoes searchParams={searchParams} />
      </Suspense>
    </JanelaMissao>
  );
}
