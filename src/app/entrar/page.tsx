import type { Metadata } from 'next';

import type { MotivoRecusa } from '@/dominio/acesso/retorno-oauth';
import { VALIDADE_MAXIMA_SESSAO_SEGUNDOS } from '@/dominio/acesso/sessao';

import { AvisoErro } from '@/componentes/aviso-erro';
import { ConteudoPrincipal } from '@/componentes/conteudo-principal';
import { BotaoEntrarGithub } from './botao-entrar-github';
import { Particulas } from '@/componentes/particulas';
import { SeletorEfeitos } from '@/componentes/seletor-efeitos';
import { SigiloRunico } from '@/componentes/sigilo-runico';
import { obterPreferenciaEfeitos } from '@/lib/efeitos-servidor';

export const metadata: Metadata = { title: 'Entrar' };

type Mensagem = { titulo: string; texto: string };

/** Motivos que chegam em `?erro=`: recusas do login e o fim da validade da sessão. */
type MotivoAviso = MotivoRecusa | 'sessao-expirada';

const HORAS_DE_VALIDADE = VALIDADE_MAXIMA_SESSAO_SEGUNDOS / 3600;

/** Mensagens por motivo. O parâmetro da URL só escolhe uma delas; nunca é exibido. */
const MENSAGENS_RECUSA: Readonly<Record<MotivoAviso, Mensagem>> = {
  'sessao-expirada': {
    titulo: 'Sessão encerrada.',
    texto: `Por segurança, cada login vale por ${HORAS_DE_VALIDADE} horas. Entre de novo para continuar.`,
  },
  'acesso-negado': {
    titulo: 'Acesso recusado.',
    texto: 'Esta conta do GitHub não tem acesso a este sistema.',
  },
  'falha-login': {
    titulo: 'Login não concluído.',
    texto: 'Não foi possível concluir o login. Tente de novo.',
  },
};

/** O que espera o aventureiro do outro lado do portão (gamificacao.md). */
const DESTAQUES = ['Missões Rank E → S', 'XP até o Nível 100', 'Medalhas I → X', '8 Classes'] as const;

/** Atraso de entrada de cada destaque: entram em cascata depois do título. */
const ATRASOS_CASCATA = [
  '[animation-delay:360ms]',
  '[animation-delay:420ms]',
  '[animation-delay:480ms]',
  '[animation-delay:540ms]',
] as const;

function lerMensagem(erro: string | string[] | undefined): Mensagem | null {
  return typeof erro === 'string' && Object.hasOwn(MENSAGENS_RECUSA, erro)
    ? MENSAGENS_RECUSA[erro as MotivoAviso]
    : null;
}

/**
 * Tela de título: à esquerda, o "jogo" (sigilo, nome e destaques); à direita,
 * a Janela do Sistema com a missão de acesso. No celular, empilha.
 *
 * @param props - `searchParams.erro` traz o motivo de uma recusa anterior.
 * @returns Página de login.
 */
export default async function PaginaEntrar({ searchParams }: PageProps<'/entrar'>) {
  const [{ erro }, efeitos] = await Promise.all([searchParams, obterPreferenciaEfeitos()]);
  const mensagem = lerMensagem(erro);

  return (
    <div className="portal-sistema relative min-h-dvh">
      <Particulas />
      {/* Sigilo gigante de fundo: preenche o lado do título nas telas largas. */}
      <SigiloRunico className="pointer-events-none absolute top-1/2 -left-48 hidden h-[60rem] w-[60rem] -translate-y-1/2 opacity-[0.06] lg:block" />

      {/* Controle de Efeitos: também é a pausa de movimento exigida pelo WCAG 2.2.2. */}
      <div className="absolute top-4 right-4 z-40 sm:top-6 sm:right-6">
        <SeletorEfeitos inicial={efeitos} />
      </div>

      <ConteudoPrincipal className="relative mx-auto grid min-h-dvh w-full max-w-[110rem] grid-cols-[minmax(0,1fr)] items-center gap-10 px-4 pt-20 pb-10 sm:px-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:px-16 lg:py-16 xl:gap-24 xl:px-24">
        <header className="entrada-suave flex flex-col items-start gap-6">
          <SigiloRunico className="h-24 w-24 sm:h-36 sm:w-36 lg:h-60 lg:w-60 xl:h-72 xl:w-72" />

          <div className="flex flex-col gap-3">
            <p className="font-mono text-xs tracking-[0.3em] text-acento sm:text-sm">
              ◆ O RPG DO DESENVOLVEDOR
            </p>
            <h1 className="titulo-jogo font-display text-[clamp(1.75rem,9vw,4rem)] lg:text-[clamp(2.5rem,4.6vw,3.75rem)] xl:text-[clamp(3rem,4.2vw,5.125rem)] leading-[0.95] font-extrabold uppercase">
              Gestor de
              <span className="block">Projetos</span>
            </h1>
          </div>

          <p className="max-w-xl text-base leading-relaxed text-texto-suave sm:text-lg xl:text-xl">
            Transforme cada projeto em uma missão. Conclua, ganhe XP, suba de Rank e desbloqueie medalhas.
          </p>

          <ul className="hidden flex-wrap gap-2 sm:flex" aria-label="O que você encontra lá dentro">
            {DESTAQUES.map((destaque, indice) => (
              <li
                key={destaque}
                className={`entrada-suave ${ATRASOS_CASCATA[indice]} rounded-full border border-borda-forte bg-superficie/80 px-3 py-1.5 font-mono text-xs text-texto-suave xl:px-4 xl:py-2 xl:text-sm`}
              >
                {destaque}
              </li>
            ))}
          </ul>
        </header>

        <section
          aria-labelledby="titulo-entrar"
          className="flex w-full flex-col gap-5 lg:max-w-lg lg:justify-self-end xl:max-w-xl"
        >
          <div className="aura-sistema entrada-janela w-full [animation-delay:200ms]">
            <div className="janela-sistema">
              <div className="janela-sistema-conteudo flex flex-col gap-7 p-5 sm:p-9">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-borda pb-4 font-mono text-xs tracking-[0.14em]">
                  <span className="text-acento">[ SISTEMA ] · NOVA MISSÃO</span>
                  <span className="rounded-sm border border-borda-forte px-2 py-0.5 text-texto-suave">
                    RANK ?
                  </span>
                </div>

                <div className="flex flex-col gap-4">
                  <p className="font-mono text-sm text-texto-suave">
                    › Presença desconhecida detectada<span className="cursor-piscante">_</span>
                  </p>
                  <h2
                    id="titulo-entrar"
                    className="font-display text-[clamp(1.25rem,6.6vw,2.25rem)] lg:text-[clamp(1.5rem,2.6vw,2.25rem)] xl:text-[clamp(2rem,2.4vw,2.625rem)] leading-tight font-extrabold"
                  >
                    <span className="whitespace-nowrap">Identifique-se,</span>
                    <span className="block text-acento">Dev Aventureiro</span>
                  </h2>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 border-l-2 border-acento-forte pl-4 text-base leading-snug">
                  <dt className="font-mono text-sm text-texto-tenue">Objetivo</dt>
                  <dd>Confirmar sua identidade pelo GitHub</dd>
                  <dt className="font-mono text-sm text-texto-tenue">Recompensa</dt>
                  <dd>Acesso ao Quadro de Missões</dd>
                  <dt className="font-mono text-sm text-texto-tenue">Penalidade</dt>
                  <dd className="text-texto-suave">Acesso negado a quem não é da guilda</dd>
                </dl>

                {mensagem && <AvisoErro titulo={mensagem.titulo}>{mensagem.texto}</AvisoErro>}

                <BotaoEntrarGithub />
              </div>
            </div>
          </div>

          <p className="text-center font-mono text-xs leading-relaxed text-texto-tenue">
            Autenticação pelo GitHub · nenhuma senha é guardada aqui
          </p>
        </section>
      </ConteudoPrincipal>
    </div>
  );
}
