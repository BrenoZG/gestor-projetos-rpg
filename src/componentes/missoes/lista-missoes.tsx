import Link from 'next/link';

import { EmblemaRank } from '@/componentes/emblema-rank';
import type { Missao } from '@/dados/missoes';
import { ROTULOS_STATUS } from '@/dominio/missoes/campos';
import { formatarDataHora } from '@/lib/datas';

const CLASSES_CABECALHO =
  'px-3 py-2 text-left font-mono text-xs font-normal tracking-[0.14em] text-texto-suave uppercase';
const CLASSES_CELULA = 'px-3 py-3 align-top';

/**
 * Visão Lista (RF-22): resumo de todas as Missões numa tabela, na ordem da
 * última edição. Em tela estreita a tabela rola dentro da própria área, nunca
 * a página.
 *
 * @param props - Missões já filtradas e o total carregado (para a legenda).
 */
export function ListaMissoes({ missoes, total }: { missoes: readonly Missao[]; total: number }) {
  if (total === 0) {
    return (
      <p className="rounded-md border border-dashed border-borda-campo px-6 py-10 text-center text-texto">
        Nenhum projeto cadastrado ainda. Use “Novo projeto” para registrar o primeiro.
      </p>
    );
  }
  // Com filtro e nenhum resultado, o Quadro já mostra o aviso e o "Limpar filtros".
  if (missoes.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Tabela de projetos (rola na horizontal em telas estreitas)"
      tabIndex={0}
      className="overflow-x-auto rounded-md border border-borda-forte bg-superficie/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
    >
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <caption className="px-3 pt-3 pb-1 text-left font-display text-base font-bold">
          Projetos · {missoes.length === total ? total : `${missoes.length} de ${total}`}
        </caption>
        <thead className="border-b border-borda">
          <tr>
            <th scope="col" className={CLASSES_CABECALHO}>
              Projeto
            </th>
            <th scope="col" className={CLASSES_CABECALHO}>
              Status
            </th>
            <th scope="col" className={CLASSES_CABECALHO}>
              Rank
            </th>
            <th scope="col" className={`${CLASSES_CABECALHO} text-right`}>
              Pontos
            </th>
            <th scope="col" className={CLASSES_CABECALHO}>
              Stacks
            </th>
            <th scope="col" className={CLASSES_CABECALHO}>
              Última edição
            </th>
          </tr>
        </thead>
        <tbody>
          {missoes.map((missao) => (
            <tr key={missao.id} className="border-b border-borda last:border-b-0 hover:bg-superficie-alta">
              <th scope="row" className={`${CLASSES_CELULA} text-left font-medium`}>
                <Link
                  href={`/missoes/${missao.id}`}
                  className="break-words text-texto underline-offset-4 hover:text-acento-titulo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
                >
                  {missao.nome}
                </Link>
              </th>
              <td className={CLASSES_CELULA}>{ROTULOS_STATUS[missao.status]}</td>
              {missao.tipo === 'dev' ? (
                <>
                  <td className={CLASSES_CELULA}>
                    <span className="inline-flex items-center gap-2">
                      <EmblemaRank
                        rank={missao.rank}
                        rotulo={`Rank do Projeto ${missao.rank}`}
                        className="h-7 w-6"
                      />
                    </span>
                  </td>
                  <td className={`${CLASSES_CELULA} text-right font-mono tabular-nums`}>
                    {missao.pontuacao.total}
                  </td>
                </>
              ) : (
                <>
                  {/* Missão Geral não tem Rank nem pontos (RN-15). */}
                  <td className={`${CLASSES_CELULA} text-texto-suave`}>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">Sem Rank (Geral)</span>
                  </td>
                  <td className={`${CLASSES_CELULA} text-right text-texto-suave`}>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">Sem pontos</span>
                  </td>
                </>
              )}
              <td className={`${CLASSES_CELULA} text-texto-suave`}>{missao.stacks.join(', ')}</td>
              <td className={`${CLASSES_CELULA} whitespace-nowrap text-texto-suave tabular-nums`}>
                {formatarDataHora(missao.atualizadoEm)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
