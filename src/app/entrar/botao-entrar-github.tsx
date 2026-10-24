'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { criarClienteNavegador } from '@/lib/supabase/navegador';

import { AvisoErro } from './aviso-erro';

type Estado = 'pronto' | 'carregando' | 'erro';

/**
 * Inicia o login com GitHub (OAuth com PKCE).
 *
 * Começa no navegador porque o `@supabase/ssr` guarda o verificador do PKCE em
 * cookie e a navegação até o GitHub não passa por formulário: um redirecionamento
 * pós-formulário seria barrado pelo `form-action 'self'` da CSP.
 */
export function BotaoEntrarGithub() {
  const [estado, setEstado] = useState<Estado>('pronto');

  // Voltar do GitHub pelo botão "voltar" restaura a página do cache do
  // navegador (bfcache) ainda em "carregando"; isto devolve o botão ao normal.
  useEffect(() => {
    const restaurar = (evento: PageTransitionEvent) => {
      if (evento.persisted) setEstado('pronto');
    };
    window.addEventListener('pageshow', restaurar);
    return () => window.removeEventListener('pageshow', restaurar);
  }, []);

  async function entrar() {
    setEstado('carregando');
    const { error } = await criarClienteNavegador().auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Em caso de sucesso, o navegador já está indo para o GitHub.
    if (error) setEstado('erro');
  }

  // "Pressione Enter para começar": só quando nenhum controle tem o foco, para
  // não sequestrar o Enter de um link ou botão (que já tem o próprio Enter).
  const aoPressionarTecla = useEffectEvent((evento: KeyboardEvent) => {
    const semFoco = document.activeElement === document.body || document.activeElement === null;
    if (evento.key === 'Enter' && !evento.repeat && semFoco && estado !== 'carregando') {
      void entrar();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', aoPressionarTecla);
    return () => window.removeEventListener('keydown', aoPressionarTecla);
  }, []);

  const carregando = estado === 'carregando';

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={entrar}
        disabled={carregando}
        aria-busy={carregando}
        className="botao-sistema inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-md bg-acento-solido px-6 font-display text-base font-bold text-acento-contraste enabled:hover:bg-acento-forte focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-acento disabled:cursor-wait disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="20" height="20" fill="currentColor">
          <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
        </svg>
        {carregando ? 'Abrindo o GitHub…' : 'Entrar com GitHub'}
      </button>
      {/* Só com teclado físico (telas grandes); no toque, o botão basta. */}
      <p
        aria-hidden="true"
        className="prompt-pulsante hidden text-center font-mono text-xs tracking-[0.2em] text-texto-suave lg:block"
      >
        ▸ PRESSIONE ENTER PARA COMEÇAR ◂
      </p>
      {estado === 'erro' && (
        <AvisoErro titulo="GitHub indisponível.">
          Não foi possível abrir o GitHub. Confira a conexão e tente de novo.
        </AvisoErro>
      )}
    </div>
  );
}
