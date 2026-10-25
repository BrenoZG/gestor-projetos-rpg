import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { CartaoMissao } from '@/componentes/missoes/cartao-missao';
import { SigiloRunico } from '@/componentes/sigilo-runico';
import { CLASSES_ACAO_PRINCIPAL } from '@/componentes/tela-sistema';
import { ErroDeMissao, listarMissoes, type Missao } from '@/dados/missoes';
import type { StatusMissao } from '@/dominio/missoes/campos';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

/** As três colunas do Quadro seguem os status da Missão (RN-02). */
const COLUNAS: ReadonlyArray<{ id: StatusMissao; titulo: string; vazio: string; detalhe: string }> = [
  {
    id: 'backlog',
    titulo: 'Backlog',
    vazio: 'Nenhuma missão no backlog.',
    detalhe: 'Registre uma ideia para ela não ficar só na cabeça.',
  },
  {
    id: 'desenvolvimento',
    titulo: 'Em desenvolvimento',
    vazio: 'Nenhuma missão em andamento.',
    detalhe: 'Mude o status de uma missão para Desenvolvimento.',
  },
  {
    id: 'concluido',
    titulo: 'Concluídas',
    vazio: 'Nenhuma missão concluída ainda.',
    detalhe: 'Cada conclusão vai render XP ao personagem.',
  },
];

/** Atrasos de entrada em cascata (camada de transição); depois do 6º item, sem atraso. */
const ATRASOS = [
  '[animation-delay:80ms]',
  '[animation-delay:160ms]',
  '[animation-delay:240ms]',
  '[animation-delay:320ms]',
  '[animation-delay:400ms]',
  '[animation-delay:480ms]',
];

const atraso = (indice: number) => ATRASOS[indice] ?? '';

async function carregarMissoes(): Promise<Missao[]> {
  await connection();
  try {
    return await listarMissoes(await criarClienteServidor());
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    throw new Error('Não foi possível carregar as missões.');
  }
}

function Estatisticas({ missoes }: { missoes: readonly Missao[] }) {
  const concluidas = missoes.filter((missao) => missao.status === 'concluido').length;
  // XP e medalhas chegam com o ledger (M3); até lá, zero é o valor real.
  const itens = [
    { rotulo: 'Missões ativas', valor: String(missoes.length - concluidas) },
    { rotulo: 'Concluídas', valor: String(concluidas) },
    { rotulo: 'XP total', valor: '0' },
    { rotulo: 'Medalhas', valor: '0 / 10' },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {itens.map((item, indice) => (
        <div
          key={item.rotulo}
          className={`entrada-suave ${atraso(indice)} flex min-w-36 flex-col gap-1 rounded-md border border-borda-forte bg-superficie/80 px-4 py-3`}
        >
          <dt className="font-mono text-[0.6875rem] tracking-[0.14em] text-texto-suave uppercase">
            {item.rotulo}
          </dt>
          <dd className="font-display text-2xl font-extrabold">{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function Coluna({
  coluna,
  missoes,
  indice,
}: {
  coluna: (typeof COLUNAS)[number];
  missoes: readonly Missao[];
  indice: number;
}) {
  return (
    <section
      aria-labelledby={`coluna-${coluna.id}`}
      className={`aura-sistema entrada-janela ${atraso(indice)} flex min-h-80`}
    >
      <div className="janela-sistema flex w-full">
        <div className="janela-sistema-conteudo flex w-full flex-col gap-4 p-5">
          <header className="flex items-center justify-between gap-3 border-b border-borda pb-3">
            <h2 id={`coluna-${coluna.id}`} className="flex items-center gap-2 font-display text-lg font-bold">
              <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-acento" />
              {coluna.titulo}
            </h2>
            <span className="rounded-full border border-borda-forte px-2.5 py-0.5 font-mono text-xs text-texto-suave">
              {missoes.length}
              <span className="sr-only"> {missoes.length === 1 ? 'missão' : 'missões'}</span>
            </span>
          </header>

          {missoes.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {missoes.map((missao, posicao) => (
                <CartaoMissao
                  key={missao.id}
                  missao={missao}
                  className={`entrada-suave ${atraso(posicao)}`}
                />
              ))}
            </ul>
          ) : (
            <div className="slot-vazio flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-dashed border-borda-campo px-6 py-10 text-center">
              <SigiloRunico className="h-20 w-20 opacity-60 lg:h-32 lg:w-32" />
              <p className="font-medium text-texto">{coluna.vazio}</p>
              <p className="text-sm text-texto-suave">{coluna.detalhe}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

async function ConteudoQuadro() {
  const missoes = await carregarMissoes();
  return (
    <>
      <Estatisticas missoes={missoes} />
      <div className="grid flex-1 gap-5 lg:grid-cols-3">
        {COLUNAS.map((coluna, indice) => (
          <Coluna
            key={coluna.id}
            coluna={coluna}
            missoes={missoes.filter((missao) => missao.status === coluna.id)}
            indice={indice}
          />
        ))}
      </div>
    </>
  );
}

function QuadroCarregando() {
  return (
    <div role="status" aria-label="Carregando as missões" className="grid flex-1 gap-5 lg:grid-cols-3">
      {COLUNAS.map((coluna) => (
        <div
          key={coluna.id}
          className="min-h-80 animate-pulse rounded-md border border-borda bg-superficie/60 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

/**
 * Quadro de Missões (RF-02): estatísticas e as três colunas de status, com as
 * Missões do usuário; cada cartão leva ao detalhe.
 *
 * @returns Tela inicial do jogo.
 */
export default function PaginaQuadro() {
  return (
    <div className="flex flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="entrada-suave flex flex-col gap-2">
          <span className="font-mono text-xs tracking-[0.2em] text-acento sm:text-sm">
            [ SISTEMA ] · QUADRO DE MISSÕES
          </span>
          <h1 className="titulo-jogo font-display text-[clamp(2rem,5vw,3.5rem)] leading-none font-extrabold">
            Quadro de Missões
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-texto-suave sm:text-lg">
            Suas missões, do backlog à conclusão. Cada etapa vencida aproxima o próximo nível.
          </p>
        </div>
        <Link
          href="/missoes/nova"
          className={`${CLASSES_ACAO_PRINCIPAL} entrada-suave [animation-delay:120ms] gap-2`}
        >
          <span aria-hidden="true">+</span> Nova missão
        </Link>
      </div>

      <Suspense fallback={<QuadroCarregando />}>
        <ConteudoQuadro />
      </Suspense>
    </div>
  );
}
