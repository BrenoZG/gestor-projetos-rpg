'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { deduplicarNomes, separarNomesDigitados } from '@/dominio/missoes/normalizacao';

import { CLASSES_AJUDA, CLASSES_CAMPO, CLASSES_CHIP, CLASSES_ROTULO } from './estilos';
import { MensagemErroCampo } from './mensagem-erro-campo';

/**
 * Campo de etiquetas em "chips" (stacks, ferramentas ou tags): Enter ou vírgula
 * adiciona, cada chip tem um botão de remover. As etiquetas vão no envio como
 * campos ocultos com o `nome` dado; o texto ainda não confirmado também vai,
 * para não se perder se o usuário enviar direto.
 *
 * @param props - Etiquetas atuais (controladas pelo formulário), nome do campo
 *   no envio, rótulos, limite, sugestões para o autocompletar, id do campo e
 *   erro vindo do servidor.
 */
export function CampoEtiquetas({
  id,
  nome,
  rotulo,
  rotuloLista,
  exemplo,
  maximo,
  itens,
  aoMudar,
  sugestoes,
  erro,
}: {
  id: string;
  nome: 'stacks' | 'tags';
  rotulo: ReactNode;
  /** Nome acessível da lista de chips (ex.: "Stacks adicionadas"). */
  rotuloLista: string;
  exemplo: string;
  maximo: number;
  itens: readonly string[];
  aoMudar: (itens: string[]) => void;
  sugestoes: readonly string[];
  erro?: string;
}) {
  const [rascunho, setRascunho] = useState('');
  const campo = useRef<HTMLInputElement>(null);
  const base = useId();
  const idAjuda = `${base}-ajuda`;
  const idErro = `${base}-erro`;
  const idSugestoes = `${base}-sugestoes`;
  const cheio = itens.length >= maximo;

  function incluir(texto: string): void {
    aoMudar(deduplicarNomes([...itens, ...separarNomesDigitados(texto)]).slice(0, maximo));
  }

  function adicionar(): void {
    incluir(rascunho);
    setRascunho('');
  }

  // A vírgula fecha a etiqueta, digitada ou colada ("a, b, c" vira 3 chips); só
  // o pedaço depois da última vírgula continua no campo. Sem `maxLength` aqui:
  // ele cortaria em silêncio uma lista colada. O limite por nome é do servidor.
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
    // Enter aqui confirma a etiqueta; sem isto, enviaria o formulário inteiro.
    if (evento.key === 'Enter') {
      evento.preventDefault();
      if (rascunho.trim() && !cheio) adicionar();
    }
  }

  function remover(alvo: string): void {
    aoMudar(itens.filter((item) => item !== alvo));
    campo.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={CLASSES_ROTULO}>
        {rotulo}
      </label>

      {itens.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={rotuloLista}>
          {itens.map((item) => (
            <li key={item} className={`${CLASSES_CHIP} py-0.5 pr-1 text-sm text-texto`}>
              {item}
              <button
                type="button"
                onClick={() => remover(item)}
                aria-label={`Remover ${item}`}
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
              <input type="hidden" name={nome} value={item} />
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
          placeholder={exemplo}
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
          <input key={`${indice}-${parte}`} type="hidden" name={nome} value={parte} />
        ))}
      </div>
      <datalist id={idSugestoes}>
        {sugestoes.map((sugestao) => (
          <option key={sugestao} value={sugestao} />
        ))}
      </datalist>

      <p id={idAjuda} className={CLASSES_AJUDA} aria-live="polite">
        {cheio ? 'Limite atingido' : 'Enter ou vírgula para adicionar'} · {itens.length} de {maximo}
      </p>
      {erro && <MensagemErroCampo id={idErro} mensagem={erro} />}
    </div>
  );
}
