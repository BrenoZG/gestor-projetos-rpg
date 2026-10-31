'use client';

import { useEffect, useRef, useState } from 'react';

import { montarCookieEfeitos, montarCookieRemocaoEfeitos, type PreferenciaEfeitos } from '@/lib/efeitos';

type Opcao = { valor: PreferenciaEfeitos | null; rotulo: string; descricao: string };

const OPCOES: readonly Opcao[] = [
  { valor: null, rotulo: 'Automático', descricao: 'Segue o sistema' },
  { valor: 'completo', rotulo: 'Completo', descricao: 'Ambiente, transições e recompensas' },
  { valor: 'reduzido', rotulo: 'Reduzido', descricao: 'Sem animação contínua' },
  { valor: 'desligado', rotulo: 'Desligado', descricao: 'Nenhuma animação' },
];

/** Aplica a escolha: cookie (para o servidor) e atributo no <html> (efeito imediato). */
function aplicar(valor: PreferenciaEfeitos | null): void {
  const raiz = document.documentElement;
  if (valor) {
    document.cookie = montarCookieEfeitos(valor, window.location.protocol === 'https:');
    raiz.dataset.efeitos = valor;
  } else {
    document.cookie = montarCookieRemocaoEfeitos();
    delete raiz.dataset.efeitos;
  }
}

/**
 * Menu "Efeitos visuais", como o de gráficos de um jogo. É também o controle
 * de pausa exigido pelo WCAG 2.2.2 para o movimento automático da interface.
 *
 * @param props - `inicial`: preferência lida do cookie no servidor (`null` = automático).
 */
export function SeletorEfeitos({ inicial }: { inicial: PreferenciaEfeitos | null }) {
  const [escolha, setEscolha] = useState<PreferenciaEfeitos | null>(inicial);
  const menu = useRef<HTMLDetailsElement>(null);
  const rotuloAtual = OPCOES.find((opcao) => opcao.valor === escolha)?.rotulo ?? 'Automático';

  // Esc fecha o menu e devolve o foco ao botão que o abriu. O preventDefault
  // avisa o atalho da Ficha que o Esc já foi usado (não volta de tela).
  useEffect(() => {
    const elemento = menu.current;
    if (!elemento) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && elemento.open) {
        evento.preventDefault();
        elemento.open = false;
        elemento.querySelector('summary')?.focus();
      }
    };
    elemento.addEventListener('keydown', aoTeclar);
    return () => elemento.removeEventListener('keydown', aoTeclar);
  }, []);

  return (
    <details ref={menu} className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-borda-campo bg-superficie/80 px-3 font-mono text-xs tracking-[0.08em] text-texto-suave transition-colors duration-200 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          width="16"
          height="16"
          fill="none"
          className="text-acento"
        >
          <path
            d="M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm7.2 2.3-1.6-.4a5.8 5.8 0 0 0-.6-1.5l.9-1.4-1.4-1.4-1.4.9a5.8 5.8 0 0 0-1.5-.6l-.4-1.6h-2l-.4 1.6a5.8 5.8 0 0 0-1.5.6l-1.4-.9L4.5 5.5l.9 1.4a5.8 5.8 0 0 0-.6 1.5l-1.6.4v2l1.6.4c.1.5.3 1 .6 1.5l-.9 1.4 1.4 1.4 1.4-.9c.5.3 1 .5 1.5.6l.4 1.6h2l.4-1.6c.5-.1 1-.3 1.5-.6l1.4.9 1.4-1.4-.9-1.4c.3-.5.5-1 .6-1.5l1.6-.4v-2Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          Efeitos: <span className="text-texto">{rotuloAtual}</span>
        </span>
      </summary>

      <fieldset className="entrada-suave fixed inset-x-4 z-40 mt-2 rounded-md sm:absolute sm:inset-x-auto sm:right-0 sm:w-72 border border-borda-forte bg-superficie-alta p-2 shadow-2xl shadow-fundo">
        <legend className="sr-only">Efeitos visuais</legend>
        {OPCOES.map((opcao) => (
          <label
            key={opcao.rotulo}
            className="flex cursor-pointer items-start gap-3 rounded px-3 py-2.5 hover:bg-superficie has-[:checked]:bg-acento-suave has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-acento"
          >
            <input
              type="radio"
              name="efeitos-visuais"
              value={opcao.valor ?? 'automatico'}
              checked={escolha === opcao.valor}
              onChange={() => {
                setEscolha(opcao.valor);
                aplicar(opcao.valor);
              }}
              className="mt-1 accent-acento"
            />
            <span className="flex flex-col">
              <span className="text-sm text-texto">{opcao.rotulo}</span>
              <span className="text-xs text-texto-suave">{opcao.descricao}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}
