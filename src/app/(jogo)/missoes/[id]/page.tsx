import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';

import { excluirMissao } from '@/acoes/missoes';
import { EmblemaRank } from '@/componentes/emblema-rank';
import { CarregandoMissao } from '@/componentes/missoes/carregando-missao';
import { ConfirmarExclusao } from '@/componentes/missoes/confirmar-exclusao';
import { CLASSES_CHIP, CLASSES_ROTULO } from '@/componentes/missoes/estilos';
import { JanelaMissao } from '@/componentes/missoes/janela-missao';
import { CLASSES_ACAO_PRINCIPAL } from '@/componentes/tela-sistema';
import { ROTULOS_CAPACIDADE, ROTULOS_ESTILO, ROTULOS_STATUS } from '@/dominio/missoes/campos';
import { STACKS_QUE_PONTUAM } from '@/dominio/missoes/rank';
import { formatarDataHora } from '@/lib/datas';

import { carregarMissaoDaUrl } from './carregar-missao';

export const metadata: Metadata = { title: 'Missão' };

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={CLASSES_ROTULO}>{rotulo}</dt>
      <dd className="text-texto">{children}</dd>
    </div>
  );
}

async function DetalheMissao({ params }: { params: Promise<{ id: string }> }) {
  const missao = await carregarMissaoDaUrl(params);

  return (
    <article className="flex flex-col gap-7">
      <header className="flex flex-wrap items-center gap-4">
        <EmblemaRank
          rank={missao.rank}
          rotulo={`Rank de Missão ${missao.rank}`}
          className="h-16 w-14 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-display text-2xl font-extrabold break-words">{missao.nome}</h2>
          <p className="font-mono text-sm text-texto-suave">
            Rank {missao.rank} · {ROTULOS_STATUS[missao.status]} · {missao.pontuacao.total} pontos
          </p>
        </div>
      </header>

      <section aria-labelledby="titulo-descricao" className="flex flex-col gap-2">
        <h3 id="titulo-descricao" className={CLASSES_ROTULO}>
          Descrição
        </h3>
        <p className="leading-relaxed whitespace-pre-line break-words">{missao.descricao}</p>
      </section>

      <section aria-labelledby="titulo-stacks" className="flex flex-col gap-2">
        <h3 id="titulo-stacks" className={CLASSES_ROTULO}>
          Stacks
        </h3>
        <ul className="flex flex-wrap gap-2">
          {missao.stacks.map((stack) => (
            <li key={stack} className={`${CLASSES_CHIP} text-sm text-texto`}>
              {stack}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-calculo" className="flex flex-col gap-2">
        <h3 id="titulo-calculo" className={CLASSES_ROTULO}>
          Cálculo do Rank
        </h3>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr_auto]">
          <dt className="text-texto-suave">Estilo</dt>
          <dd>{ROTULOS_ESTILO[missao.estilo]}</dd>
          <dd className="font-mono text-texto-suave sm:text-right">+{missao.pontuacao.estilo}</dd>
          <dt className="text-texto-suave">Capacidades</dt>
          <dd>
            {missao.capacidades.length > 0
              ? missao.capacidades.map((capacidade) => ROTULOS_CAPACIDADE[capacidade]).join(', ')
              : 'Nenhuma'}
          </dd>
          <dd className="font-mono text-texto-suave sm:text-right">+{missao.pontuacao.capacidades}</dd>
          <dt className="text-texto-suave">Stacks</dt>
          <dd>
            {missao.stacks.length} (até {STACKS_QUE_PONTUAM} pontuam)
          </dd>
          <dd className="font-mono text-texto-suave sm:text-right">+{missao.pontuacao.stacks}</dd>
        </dl>
      </section>

      <section aria-labelledby="titulo-estrutura" className="flex flex-col gap-2">
        <h3 id="titulo-estrutura" className={CLASSES_ROTULO}>
          Estrutura e arquitetura
        </h3>
        {missao.arquitetura ? (
          <pre className="max-h-[32rem] overflow-auto rounded-md border border-borda bg-fundo/70 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
            {missao.arquitetura}
          </pre>
        ) : (
          <p className="text-texto-suave">Nenhuma estrutura registrada.</p>
        )}
      </section>

      <dl className="grid gap-4 border-t border-borda pt-6 sm:grid-cols-2">
        <Dado rotulo="Criada em">{formatarDataHora(missao.criadoEm)}</Dado>
        <Dado rotulo="Última edição">{formatarDataHora(missao.atualizadoEm)}</Dado>
        <Dado rotulo="Início em desenvolvimento">{formatarDataHora(missao.inicioDesenvolvimentoEm)}</Dado>
        <Dado rotulo="Conclusão">{formatarDataHora(missao.concluidoEm)}</Dado>
      </dl>

      <div className="flex flex-wrap gap-3 border-t border-borda pt-6">
        <Link href={`/missoes/${missao.id}/editar`} className={CLASSES_ACAO_PRINCIPAL}>
          Editar missão
        </Link>
        <ConfirmarExclusao nome={missao.nome} acao={excluirMissao.bind(null, missao.id)} />
      </div>
    </article>
  );
}

/**
 * Detalhe de uma Missão: campos, datas (fuso de São Paulo) e as ações de
 * editar e excluir.
 *
 * @param props - `params.id` da Missão.
 * @returns Página de detalhe.
 */
export default function PaginaMissao({ params }: PageProps<'/missoes/[id]'>) {
  return (
    <JanelaMissao
      rotulo="[ SISTEMA ] · MISSÃO"
      titulo="Ficha da missão"
      voltarPara="/"
      textoVoltar="Quadro de Missões"
    >
      <Suspense fallback={<CarregandoMissao />}>
        <DetalheMissao params={params} />
      </Suspense>
    </JanelaMissao>
  );
}
