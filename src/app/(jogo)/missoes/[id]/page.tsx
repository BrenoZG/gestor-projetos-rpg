import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';

import { excluirMissao } from '@/acoes/missoes';
import { SecaoAtualizacoes } from '@/componentes/atualizacoes/secao-atualizacoes';
import { EmblemaRank } from '@/componentes/emblema-rank';
import { CarregandoMissao } from '@/componentes/missoes/carregando-missao';
import { ConfirmarExclusao } from '@/componentes/missoes/confirmar-exclusao';
import { CLASSES_CHIP, CLASSES_ROTULO } from '@/componentes/missoes/estilos';
import { JanelaMissao } from '@/componentes/missoes/janela-missao';
import { LinksDaMissao } from '@/componentes/missoes/links-da-missao';
import { SeloGeral } from '@/componentes/missoes/selo-tipo';
import { StatusDaMissao } from '@/componentes/missoes/status-da-missao';
import { CLASSES_ACAO_PRINCIPAL } from '@/componentes/tela-sistema';
import type { MissaoDesenvolvimento } from '@/dados/missoes';
import { ROTULOS_CAPACIDADE, ROTULOS_ESTILO, ROTULOS_STATUS, ROTULOS_TIPO } from '@/dominio/missoes/campos';
import { STACKS_QUE_PONTUAM } from '@/dominio/missoes/rank';
import { formatarDataHora } from '@/lib/datas';

import { carregarHistoricoDaMissao } from './carregar-atualizacoes';
import { carregarMissaoDaUrl } from './carregar-missao';

export const metadata: Metadata = { title: 'Projeto' };

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={CLASSES_ROTULO}>{rotulo}</dt>
      <dd className="text-texto">{children}</dd>
    </div>
  );
}

/** RN-04: o que mais sai junto com a Missão, para a confirmação dizer. */
function detalheDaExclusao(quantidadeAtualizacoes: number): string {
  const atualizacoes =
    quantidadeAtualizacoes === 0
      ? ''
      : ` e ${quantidadeAtualizacoes} ${quantidadeAtualizacoes === 1 ? 'atualização' : 'atualizações'}`;
  return `O projeto, os vínculos com stacks e tags, os links${atualizacoes} serão apagados. Esta ação não pode ser desfeita.`;
}

function ListaDeChips({ id, titulo, itens }: { id: string; titulo: string; itens: readonly string[] }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className={CLASSES_ROTULO}>
        {titulo}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {itens.map((item) => (
          <li key={item} className={`${CLASSES_CHIP} text-sm text-texto`}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Parte técnica (RN-14): só Missões de Desenvolvimento têm. */
function ParteTecnica({ missao }: { missao: MissaoDesenvolvimento }) {
  return (
    <>
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
        <pre className="max-h-[32rem] overflow-auto rounded-md border border-borda bg-fundo/70 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
          {missao.arquitetura}
        </pre>
      </section>
    </>
  );
}

async function DetalheMissao({ params }: { params: Promise<{ id: string }> }) {
  const missao = await carregarMissaoDaUrl(params);
  const historico = await carregarHistoricoDaMissao(missao.id);
  const desenvolvimento = missao.tipo === 'dev';

  return (
    <article className="flex flex-col gap-7">
      <header className="flex flex-wrap items-center gap-4">
        {desenvolvimento ? (
          <EmblemaRank
            rank={missao.rank}
            rotulo={`Rank do Projeto ${missao.rank}`}
            className="h-16 w-14 shrink-0"
          />
        ) : (
          <SeloGeral className="h-16 w-14 shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-display text-2xl font-extrabold break-words">{missao.nome}</h2>
          <p className="font-mono text-sm text-texto-suave">
            {desenvolvimento
              ? `Rank ${missao.rank} · ${ROTULOS_STATUS[missao.status]} · ${missao.pontuacao.total} pontos`
              : `${ROTULOS_TIPO.geral} · ${ROTULOS_STATUS[missao.status]}`}
          </p>
        </div>
      </header>

      <section aria-labelledby="titulo-status" className="flex flex-col gap-2">
        <h3 id="titulo-status" className={CLASSES_ROTULO}>
          Status
        </h3>
        <StatusDaMissao id={missao.id} nome={missao.nome} status={missao.status} />
      </section>

      <section aria-labelledby="titulo-descricao" className="flex flex-col gap-2">
        <h3 id="titulo-descricao" className={CLASSES_ROTULO}>
          Descrição
        </h3>
        <p className="leading-relaxed whitespace-pre-line break-words">{missao.descricao}</p>
      </section>

      {missao.stacks.length > 0 && (
        <ListaDeChips
          id="titulo-stacks"
          titulo={desenvolvimento ? 'Stacks' : 'Ferramentas'}
          itens={missao.stacks}
        />
      )}
      {missao.tags.length > 0 && <ListaDeChips id="titulo-tags" titulo="Tags" itens={missao.tags} />}
      <LinksDaMissao links={missao.links} />

      {missao.tipo === 'dev' && <ParteTecnica missao={missao} />}

      <dl className="grid gap-4 border-t border-borda pt-6 sm:grid-cols-2">
        <Dado rotulo="Criada em">{formatarDataHora(missao.criadoEm)}</Dado>
        <Dado rotulo="Última edição">{formatarDataHora(missao.atualizadoEm)}</Dado>
        <Dado rotulo="Início em desenvolvimento">{formatarDataHora(missao.inicioDesenvolvimentoEm)}</Dado>
        <Dado rotulo="Conclusão">{formatarDataHora(missao.concluidoEm)}</Dado>
      </dl>

      <SecaoAtualizacoes
        projetoId={missao.id}
        atualizacoes={historico.atualizacoes}
        missoes={historico.missoes}
        falhouAoCarregar={historico.falhou}
      />

      <div className="flex flex-wrap gap-3 border-t border-borda pt-6">
        <Link href={`/missoes/${missao.id}/editar`} className={CLASSES_ACAO_PRINCIPAL}>
          Editar projeto
        </Link>
        <ConfirmarExclusao
          pergunta={`Excluir o projeto “${missao.nome}”?`}
          detalhe={detalheDaExclusao(historico.atualizacoes.length)}
          rotuloConfirmar="Excluir projeto"
          acao={excluirMissao.bind(null, missao.id)}
        />
      </div>
    </article>
  );
}

/**
 * Detalhe de uma Missão: campos, datas (fuso de São Paulo), o histórico de
 * Atualizações e as ações de editar e excluir.
 *
 * @param props - `params.id` da Missão.
 * @returns Página de detalhe.
 */
export default function PaginaMissao({ params }: PageProps<'/missoes/[id]'>) {
  return (
    <JanelaMissao
      rotulo="[ SISTEMA ] · MISSÃO"
      titulo="Ficha do projeto"
      voltarPara="/"
      textoVoltar="Quadro de Projetos"
    >
      <Suspense fallback={<CarregandoMissao />}>
        <DetalheMissao params={params} />
      </Suspense>
    </JanelaMissao>
  );
}
