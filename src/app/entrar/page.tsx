import type { Metadata } from 'next';

import type { MotivoRecusa } from '@/dominio/acesso/retorno-oauth';

import { AvisoErro } from './aviso-erro';
import { BotaoEntrarGithub } from './botao-entrar-github';

export const metadata: Metadata = { title: 'Entrar' };

type Mensagem = { titulo: string; texto: string };

/** Mensagens por motivo. O parâmetro da URL só escolhe uma delas; nunca é exibido. */
const MENSAGENS_RECUSA: Readonly<Record<MotivoRecusa, Mensagem>> = {
  'acesso-negado': {
    titulo: 'Acesso recusado.',
    texto: 'Esta conta do GitHub não tem acesso a este sistema.',
  },
  'falha-login': {
    titulo: 'Login não concluído.',
    texto: 'Não foi possível concluir o login. Tente de novo.',
  },
};

function lerMensagem(erro: string | string[] | undefined): Mensagem | null {
  return typeof erro === 'string' && Object.hasOwn(MENSAGENS_RECUSA, erro)
    ? MENSAGENS_RECUSA[erro as MotivoRecusa]
    : null;
}

/** Sigilo decorativo do portal: hexágono duplo com o glifo de código. */
function Sigilo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width="64"
      height="64"
      fill="none"
      className="text-acento brilho-sigilo"
    >
      <path d="M32 3 57 17.5v29L32 61 7 46.5v-29Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M32 11 50 21.5v21L32 53 14 42.5v-21Z" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <path
        d="m25 25-7 7 7 7M39 25l7 7-7 7M34.5 22l-5 20"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Tela de entrada: uma "Janela do Sistema" com a missão de identificação.
 *
 * @param props - `searchParams.erro` traz o motivo de uma recusa anterior.
 * @returns Página de login.
 */
export default async function PaginaEntrar({ searchParams }: PageProps<'/entrar'>) {
  const mensagem = lerMensagem((await searchParams).erro);

  return (
    <div className="portal-sistema flex min-h-dvh items-center justify-center px-4 py-12">
      <section aria-labelledby="titulo-entrar" className="flex w-full max-w-lg flex-col items-center gap-6">
        <Sigilo />

        <div className="aura-sistema entrada-janela w-full">
          <div className="janela-sistema">
            <div className="janela-sistema-conteudo flex flex-col gap-6 p-5 sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-borda pb-4 font-mono text-xs tracking-[0.14em]">
                <span className="text-acento">[ SISTEMA ] · ACESSO</span>
                <span className="text-texto-tenue">RESTRITO</span>
              </div>

              <header className="flex flex-col gap-3">
                <p className="font-mono text-sm text-texto-suave">› Presença desconhecida detectada.</p>
                <h1
                  id="titulo-entrar"
                  className="font-display text-[clamp(1.25rem,6.4vw,2.375rem)] leading-tight font-extrabold"
                >
                  <span className="whitespace-nowrap">Identifique-se,</span>
                  <span className="block text-acento">Dev Aventureiro</span>
                </h1>
                <p className="text-texto-suave">Só aventureiros autorizados acessam o Quadro de Missões.</p>
              </header>

              <div className="rounded-md border border-borda bg-fundo/60 p-4">
                <p className="mb-3 font-mono text-xs tracking-[0.14em] text-acento">◆ MISSÃO DE ACESSO</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="font-mono text-texto-tenue">Objetivo</dt>
                  <dd>Confirmar sua identidade pelo GitHub</dd>
                  <dt className="font-mono text-texto-tenue">Recompensa</dt>
                  <dd>Acesso ao Quadro de Missões</dd>
                </dl>
              </div>

              {mensagem && <AvisoErro titulo={mensagem.titulo}>{mensagem.texto}</AvisoErro>}

              <BotaoEntrarGithub />
            </div>
          </div>
        </div>

        <p className="text-center font-mono text-xs text-texto-tenue">
          Autenticação pelo GitHub · nenhuma senha é guardada aqui
        </p>
      </section>
    </div>
  );
}
