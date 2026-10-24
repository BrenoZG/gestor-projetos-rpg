import { SigiloRunico } from '@/componentes/sigilo-runico';

/** As três colunas do Quadro seguem os status de Projeto (modelo-de-dados.md). */
const COLUNAS = [
  {
    id: 'backlog',
    titulo: 'Backlog',
    vazio: 'Nenhuma missão no backlog.',
    detalhe: 'O registro de missões chega no próximo marco.',
  },
  {
    id: 'desenvolvimento',
    titulo: 'Em desenvolvimento',
    vazio: 'Nenhuma missão em andamento.',
    detalhe: 'Missões iniciadas aparecem aqui.',
  },
  {
    id: 'concluido',
    titulo: 'Concluídas',
    vazio: 'Nenhuma missão concluída ainda.',
    detalhe: 'Cada conclusão rende XP ao personagem.',
  },
] as const;

/** Números reais de hoje: sem missões nem ledger, tudo começa em zero. */
const ESTATISTICAS = [
  { rotulo: 'Missões ativas', valor: '0' },
  { rotulo: 'Concluídas', valor: '0' },
  { rotulo: 'XP total', valor: '0' },
  { rotulo: 'Medalhas', valor: '0 / 10' },
] as const;

/** Atrasos de entrada em cascata (camada de transição). */
const ATRASOS = [
  '[animation-delay:80ms]',
  '[animation-delay:160ms]',
  '[animation-delay:240ms]',
  '[animation-delay:320ms]',
];

/**
 * Quadro de Missões em tela cheia: cabeçalho com estatísticas e as três
 * colunas de status, com estados vazios animados.
 *
 * @returns Tela inicial do jogo.
 */
export default function PaginaQuadro() {
  return (
    <div className="flex flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="grid items-end gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
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

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ESTATISTICAS.map((estatistica, indice) => (
            <div
              key={estatistica.rotulo}
              className={`entrada-suave ${ATRASOS[indice]} flex min-w-36 flex-col gap-1 rounded-md border border-borda-forte bg-superficie/80 px-4 py-3`}
            >
              <dt className="font-mono text-[0.6875rem] tracking-[0.14em] text-texto-suave uppercase">
                {estatistica.rotulo}
              </dt>
              <dd className="font-display text-2xl font-extrabold">{estatistica.valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid flex-1 gap-5 lg:grid-cols-3">
        {COLUNAS.map((coluna, indice) => (
          <section
            key={coluna.id}
            aria-labelledby={`coluna-${coluna.id}`}
            className={`aura-sistema entrada-janela ${ATRASOS[indice]} flex min-h-80`}
          >
            <div className="janela-sistema flex w-full">
              <div className="janela-sistema-conteudo flex w-full flex-col gap-4 p-5">
                <header className="flex items-center justify-between gap-3 border-b border-borda pb-3">
                  <h2
                    id={`coluna-${coluna.id}`}
                    className="flex items-center gap-2 font-display text-lg font-bold"
                  >
                    <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-acento" />
                    {coluna.titulo}
                  </h2>
                  <span className="rounded-full border border-borda-forte px-2.5 py-0.5 font-mono text-xs text-texto-suave">
                    0<span className="sr-only"> missões</span>
                  </span>
                </header>

                <div className="slot-vazio flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-dashed border-borda-campo px-6 py-10 text-center">
                  <SigiloRunico className="h-20 w-20 opacity-60 lg:h-32 lg:w-32" />
                  <p className="font-medium text-texto">{coluna.vazio}</p>
                  <p className="text-sm text-texto-suave">{coluna.detalhe}</p>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
