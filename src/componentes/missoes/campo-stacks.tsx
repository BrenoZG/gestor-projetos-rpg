'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';

import { LIMITES_MISSAO } from '@/dominio/missoes/campos';
import { deduplicarNomes, separarNomesDigitados } from '@/dominio/missoes/normalizacao';

import { CLASSES_AJUDA, CLASSES_CAMPO, CLASSES_CHIP, CLASSES_ROTULO } from './estilos';
import { MensagemErroCampo } from './mensagem-erro-campo';

const { maximo: MAXIMO_STACKS } = LIMITES_MISSAO.stacks;

/**
 * Campo de stacks em "chips": Enter ou vírgula adiciona, cada chip tem um botão
 * de remover. As stacks vão no envio como campos ocultos `stacks`; o texto ainda
 * não confirmado também vai, para não se perder se o usuário enviar direto.
 *
 * @param props - Stacks atuais (controladas pelo formulário), sugestões para o
 *   autocompletar, id do campo e erro vindo do servidor.
 */
export function CampoStacks({
  id,
  stacks,
  aoMudar,
  sugestoes,
  erro,
}: {
  id: string;
  stacks: readonly string[];
  aoMudar: (stacks: string[]) => void;
  sugestoes: readonly string[];
  erro?: string;
}) {
  const [rascunho, setRascunho] = useState('');
  const campo = useRef<HTMLInputElement>(null);
  const base = useId();
  const idAjuda = `${base}-ajuda`;
  const idErro = `${base}-erro`;
  const idSugestoes = `${base}-sugestoes`;
  const cheio = stacks.length >= MAXIMO_STACKS;

  function incluir(texto: string): void {
    aoMudar(deduplicarNomes([...stacks, ...separarNomesDigitados(texto)]).slice(0, MAXIMO_STACKS));
  }

  function adicionar(): void {
    incluir(rascunho);
    setRascunho('');
  }

  // A vírgula fecha a stack, digitada ou colada ("a, b, c" vira 3 chips); só o
  // pedaço depois da última vírgula continua no campo. Sem `maxLength` aqui:
  // ele cortaria em silêncio uma lista colada. O limite por stack é do servidor.
  function aoDigitar(valor: string): void {
    const ultimaVirgula = valor.lastIndexOf(',');
    if (ultimaVirgula === -1) {
      setRascunho(valor);
      return;
    }
    incluir(valor.slice(0, ultimaVirgula));
    setRascunho(valor.slice(ultimaVirgula + 1).trimStart());
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>): void {
    // Enter aqui confirma a stack; sem isto, enviaria o formulário inteiro.
    if (evento.key === 'Enter') {
      evento.preventDefault();
      if (rascunho.trim() && !cheio) adicionar();
    }
  }

  function remover(alvo: string): void {
    aoMudar(stacks.filter((stack) => stack !== alvo));
    campo.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={CLASSES_ROTULO}>
        Stacks
      </label>

      {stacks.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Stacks adicionadas">
          {stacks.map((stack) => (
            <li key={stack} className={`${CLASSES_CHIP} py-0.5 pr-1 text-sm text-texto`}>
              {stack}
              <button
                type="button"
                onClick={() => remover(stack)}
                aria-label={`Remover ${stack}`}
                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-texto-suave hover:bg-borda-forte hover:text-texto focus-visible:outline-2 focus-visible:outline-acento"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12">
                  <path
                    d="M3 3l10 10M13 3 3 13"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <input type="hidden" name="stacks" value={stack} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          ref={campo}
          id={id}
          type="text"
          value={rascunho}
          onChange={(evento) => aoDigitar(evento.target.value)}
          onKeyDown={aoTeclar}
          list={idSugestoes}
          placeholder="Ex.: Next.js"
          autoComplete="off"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${idAjuda} ${idErro}` : idAjuda}
          className={CLASSES_CAMPO}
        />
        <button
          type="button"
          onClick={adicionar}
          disabled={cheio || !rascunho.trim()}
          className="min-h-12 shrink-0 cursor-pointer rounded-md border border-borda-campo px-4 text-texto-suave transition-colors duration-200 enabled:hover:border-texto-suave enabled:hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:cursor-not-allowed disabled:opacity-50"
        >
          Adicionar
        </button>
        {/* Texto digitado e não confirmado também vai no envio. */}
        {separarNomesDigitados(rascunho).map((parte, indice) => (
          <input key={`${indice}-${parte}`} type="hidden" name="stacks" value={parte} />
        ))}
      </div>
      <datalist id={idSugestoes}>
        {sugestoes.map((sugestao) => (
          <option key={sugestao} value={sugestao} />
        ))}
      </datalist>

      <p id={idAjuda} className={CLASSES_AJUDA} aria-live="polite">
        {cheio ? 'Limite atingido' : 'Enter ou vírgula para adicionar'} · {stacks.length} de {MAXIMO_STACKS}
      </p>
      {erro && <MensagemErroCampo id={idErro} mensagem={erro} />}
    </div>
  );
}
