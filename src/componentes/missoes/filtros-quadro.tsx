'use client';

import { useId } from 'react';

import { ROTULOS_TIPO, TIPOS_PROJETO } from '@/dominio/missoes/campos';
import {
  FILTROS_VAZIOS,
  RANKS,
  VISTAS,
  dicaSemResultado,
  haFiltroAtivo,
  opcoesDoFiltro,
  type FiltrosMissao,
  type Vista,
} from '@/dominio/missoes/filtros';

import { CLASSES_CAMPO, CLASSES_ROTULO } from './estilos';

const ROTULOS_VISTA: Readonly<Record<Vista, string>> = { quadro: 'Quadro', lista: 'Lista' };

const CLASSES_BOTAO_BARRA =
  'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-md border px-4 text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento';

/**
 * Barra de filtros (RF-21, RF-25) e de vista (RF-22) do Quadro. Só exibe e
 * avisa: quem guarda o estado (e a URL) é o Quadro.
 *
 * @param props - Filtros e vista atuais, stacks e tags disponíveis, contagens e as ações de mudança.
 */
export function FiltrosQuadro({
  filtros,
  vista,
  stacks,
  tags,
  exibidas,
  total,
  aoMudarFiltros,
  aoMudarVista,
}: {
  filtros: FiltrosMissao;
  vista: Vista;
  stacks: readonly string[];
  tags: readonly string[];
  exibidas: number;
  total: number;
  aoMudarFiltros: (filtros: FiltrosMissao) => void;
  aoMudarVista: (vista: Vista) => void;
}) {
  const base = useId();
  const ativo = haFiltroAtivo(filtros);
  const dica = dicaSemResultado(filtros);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <form
          role="search"
          aria-label="Filtrar projetos"
          onSubmit={(evento) => evento.preventDefault()}
          className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]"
        >
          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 xl:col-span-1">
            <label htmlFor={`${base}-busca`} className={CLASSES_ROTULO}>
              Buscar
            </label>
            <input
              id={`${base}-busca`}
              type="search"
              value={filtros.busca}
              onChange={(evento) => aoMudarFiltros({ ...filtros, busca: evento.target.value })}
              placeholder="Nome ou descrição"
              autoComplete="off"
              maxLength={80}
              className={CLASSES_CAMPO}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${base}-tipo`} className={CLASSES_ROTULO}>
              Tipo
            </label>
            <select
              id={`${base}-tipo`}
              value={filtros.tipo ?? ''}
              onChange={(evento) =>
                aoMudarFiltros({
                  ...filtros,
                  tipo: TIPOS_PROJETO.find((tipo) => tipo === evento.target.value) ?? null,
                })
              }
              className={`${CLASSES_CAMPO} cursor-pointer`}
            >
              <option value="">Todos</option>
              {TIPOS_PROJETO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ROTULOS_TIPO[tipo]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${base}-stack`} className={CLASSES_ROTULO}>
              Stack ou ferramenta
            </label>
            <select
              id={`${base}-stack`}
              value={filtros.stack ?? ''}
              onChange={(evento) => aoMudarFiltros({ ...filtros, stack: evento.target.value || null })}
              className={`${CLASSES_CAMPO} cursor-pointer`}
            >
              <option value="">Todas</option>
              {opcoesDoFiltro(stacks, filtros.stack).map((stack) => (
                <option key={stack} value={stack}>
                  {stack}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${base}-rank`} className={CLASSES_ROTULO}>
              Rank
            </label>
            <select
              id={`${base}-rank`}
              value={filtros.rank ?? ''}
              onChange={(evento) =>
                aoMudarFiltros({
                  ...filtros,
                  rank: RANKS.find((rank) => rank === evento.target.value) ?? null,
                })
              }
              className={`${CLASSES_CAMPO} cursor-pointer`}
            >
              <option value="">Todos</option>
              {RANKS.map((rank) => (
                <option key={rank} value={rank}>
                  {rank}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={`${base}-tag`} className={CLASSES_ROTULO}>
              Tag
            </label>
            <select
              id={`${base}-tag`}
              value={filtros.tag ?? ''}
              onChange={(evento) => aoMudarFiltros({ ...filtros, tag: evento.target.value || null })}
              className={`${CLASSES_CAMPO} cursor-pointer`}
            >
              <option value="">Todas</option>
              {opcoesDoFiltro(tags, filtros.tag).map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </form>

        <div role="group" aria-label="Vista" className="flex gap-2">
          {VISTAS.map((opcao) => (
            <button
              key={opcao}
              type="button"
              aria-pressed={vista === opcao}
              onClick={() => aoMudarVista(opcao)}
              className={`${CLASSES_BOTAO_BARRA} ${
                vista === opcao
                  ? 'border-acento bg-acento-suave/60 text-texto'
                  : 'border-borda-campo text-texto-suave hover:border-texto-suave hover:text-texto'
              }`}
            >
              {ROTULOS_VISTA[opcao]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-8 flex-wrap items-center gap-3">
        <p role="status" className="font-mono text-xs text-texto-suave">
          {ativo
            ? `Mostrando ${exibidas} de ${total} projetos`
            : `${total} ${total === 1 ? 'projeto' : 'projetos'}`}
          {/* A dica visível fica fora desta região: sem isto, o leitor de tela não ouviria o motivo. */}
          {dica && <span className="sr-only"> {dica}</span>}
        </p>
        {ativo && (
          <button
            type="button"
            onClick={() => aoMudarFiltros(FILTROS_VAZIOS)}
            className="min-h-8 cursor-pointer rounded px-2 text-sm text-acento underline underline-offset-4 hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
