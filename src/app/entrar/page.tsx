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

/**
 * Tela de entrada: o único caminho é o login com GitHub.
 *
 * @param props - `searchParams.erro` traz o motivo de uma recusa anterior.
 * @returns Página de login.
 */
export default async function PaginaEntrar({ searchParams }: PageProps<'/entrar'>) {
  const mensagem = lerMensagem((await searchParams).erro);

  return (
    <section
      aria-labelledby="titulo-entrar"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-16 sm:px-6"
    >
      <header className="flex flex-col gap-3">
        <span className="font-mono text-sm tracking-[0.14em] text-acento">[ SISTEMA ] · ACESSO</span>
        <h1 id="titulo-entrar" className="font-display text-4xl font-extrabold text-balance">
          Identifique-se, Caçador
        </h1>
        <p className="text-texto-suave">O Quadro de Missões é restrito. Entre com a sua conta do GitHub.</p>
      </header>

      {mensagem && <AvisoErro titulo={mensagem.titulo}>{mensagem.texto}</AvisoErro>}

      <div className="rounded-lg border border-borda bg-superficie p-6">
        <BotaoEntrarGithub />
      </div>
    </section>
  );
}
