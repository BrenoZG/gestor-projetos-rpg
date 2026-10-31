import { headers } from 'next/headers';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { atraso, COLUNAS } from '@/componentes/missoes/colunas';
import { QuadroMissoes } from '@/componentes/missoes/quadro-missoes';
import { CLASSES_ACAO_PRINCIPAL } from '@/componentes/tela-sistema';
import { ErroDeMissao, listarMissoes, type Missao } from '@/dados/missoes';
import { registrarEvento } from '@/lib/log';
import { extrairNonce } from '@/lib/seguranca/csp';
import { criarClienteServidor } from '@/lib/supabase/servidor';

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

/** Nonce da CSP desta requisição (o proxy o grava no cabeçalho da requisição). */
async function lerNonce(): Promise<string | undefined> {
  return extrairNonce((await headers()).get('content-security-policy'));
}

function Estatisticas({ missoes }: { missoes: readonly Missao[] }) {
  const concluidas = missoes.filter((missao) => missao.status === 'concluido').length;
  // XP e medalhas chegam com o ledger (M3); até lá, zero é o valor real.
  const itens = [
    { rotulo: 'Projetos ativos', valor: String(missoes.length - concluidas) },
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

async function ConteudoQuadro() {
  const [missoes, nonce] = await Promise.all([carregarMissoes(), lerNonce()]);
  return (
    <>
      <Estatisticas missoes={missoes} />
      <QuadroMissoes missoes={missoes} nonce={nonce} />
    </>
  );
}

function QuadroCarregando() {
  return (
    <div role="status" aria-label="Carregando os projetos" className="grid flex-1 gap-5 lg:grid-cols-3">
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
 * Quadro de Missões (RF-02): estatísticas, filtros, as três colunas de status
 * com arrasto (ou a visão Lista) e o atalho para cadastrar.
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
            Quadro de Projetos
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-texto-suave sm:text-lg">
            Seus projetos, do backlog à conclusão. Cada etapa vencida aproxima o próximo nível.
          </p>
        </div>
        <Link
          href="/missoes/nova"
          className={`${CLASSES_ACAO_PRINCIPAL} entrada-suave [animation-delay:120ms] gap-2`}
        >
          <span aria-hidden="true">+</span> Novo projeto
        </Link>
      </div>

      <Suspense fallback={<QuadroCarregando />}>
        <ConteudoQuadro />
      </Suspense>
    </div>
  );
}
