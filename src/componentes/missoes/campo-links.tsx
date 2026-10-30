'use client';

import { useEffect, useRef } from 'react';

import { LIMITES_MISSAO } from '@/dominio/missoes/campos';

import { CLASSES_AJUDA, CLASSES_CAMPO, CLASSES_ROTULO } from './estilos';
import { MensagemErroCampo } from './mensagem-erro-campo';

/** Uma linha do campo: `chave` só identifica a linha na tela (estável ao remover outra). */
export type LinhaDeLink = { chave: string; url: string; titulo: string };

const { maximo: MAXIMO_LINKS } = LIMITES_MISSAO.links;

const CLASSES_BOTAO =
  'min-h-11 cursor-pointer rounded-md border border-borda-campo px-4 text-sm text-texto-suave transition-colors duration-200 enabled:hover:border-texto-suave enabled:hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Links de referência da Missão (RF-26): cada linha tem endereço e título
 * opcional, enviados como `link_url` e `link_titulo` na mesma posição. Tudo
 * funciona pelo teclado: a linha nova recebe o foco, e remover devolve o foco
 * ao "Adicionar link". A validação que vale é a do servidor (RN-17).
 *
 * @param props - Prefixo dos ids, linhas (controladas pelo formulário), ação de
 *   mudar e erro do servidor.
 */
export function CampoLinks({
  prefixo,
  linhas,
  aoMudar,
  erro,
}: {
  prefixo: string;
  linhas: readonly LinhaDeLink[];
  aoMudar: (linhas: LinhaDeLink[]) => void;
  erro?: string;
}) {
  const proximaChave = useRef(0);
  const focarUltima = useRef(false);
  const botaoAdicionar = useRef<HTMLButtonElement>(null);
  const cheio = linhas.length >= MAXIMO_LINKS;
  const idAjuda = `${prefixo}-ajuda`;
  const idErro = `${prefixo}-erro`;

  useEffect(() => {
    if (!focarUltima.current) return;
    focarUltima.current = false;
    document.getElementById(`${prefixo}-url-${linhas.length - 1}`)?.focus();
  }, [linhas.length, prefixo]);

  function adicionar(): void {
    proximaChave.current += 1;
    focarUltima.current = true;
    aoMudar([...linhas, { chave: `novo-${proximaChave.current}`, url: '', titulo: '' }]);
  }

  function alterar(chave: string, campo: 'url' | 'titulo', valor: string): void {
    aoMudar(linhas.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)));
  }

  function remover(chave: string): void {
    aoMudar(linhas.filter((linha) => linha.chave !== chave));
    botaoAdicionar.current?.focus();
  }

  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-invalid={erro ? true : undefined}
      aria-describedby={erro ? `${idAjuda} ${idErro}` : idAjuda}
    >
      <legend className={`${CLASSES_ROTULO} mb-2`}>
        Links de referência <span className="normal-case tracking-normal">(opcional)</span>
      </legend>
      <p id={idAjuda} className={`${CLASSES_AJUDA} -mt-1`}>
        Google Drive, páginas, vídeos do YouTube ou do Instagram · endereço começando com https:// ·{' '}
        {linhas.length} de {MAXIMO_LINKS}
      </p>

      {linhas.length > 0 && (
        <ol className="flex flex-col gap-3">
          {linhas.map((linha, indice) => (
            <li
              key={linha.chave}
              className="flex flex-col gap-2 rounded-md border border-borda p-3 sm:flex-row sm:items-end"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor={`${prefixo}-url-${indice}`} className={CLASSES_AJUDA}>
                  Endereço do link {indice + 1}
                </label>
                <input
                  id={`${prefixo}-url-${indice}`}
                  name="link_url"
                  type="url"
                  inputMode="url"
                  value={linha.url}
                  onChange={(evento) => alterar(linha.chave, 'url', evento.target.value)}
                  maxLength={LIMITES_MISSAO.url.maximo}
                  placeholder="https://"
                  autoComplete="off"
                  className={CLASSES_CAMPO}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor={`${prefixo}-titulo-${indice}`} className={CLASSES_AJUDA}>
                  Título do link {indice + 1} (opcional)
                </label>
                <input
                  id={`${prefixo}-titulo-${indice}`}
                  name="link_titulo"
                  type="text"
                  value={linha.titulo}
                  onChange={(evento) => alterar(linha.chave, 'titulo', evento.target.value)}
                  maxLength={LIMITES_MISSAO.tituloLink.maximo}
                  autoComplete="off"
                  className={CLASSES_CAMPO}
                />
              </div>
              <button type="button" onClick={() => remover(linha.chave)} className={CLASSES_BOTAO}>
                Remover<span className="sr-only"> o link {indice + 1}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <div>
        <button
          ref={botaoAdicionar}
          type="button"
          onClick={adicionar}
          disabled={cheio}
          className={CLASSES_BOTAO}
        >
          Adicionar link
        </button>
      </div>
      {erro && <MensagemErroCampo id={idErro} mensagem={erro} />}
    </fieldset>
  );
}
