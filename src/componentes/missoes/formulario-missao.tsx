'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useRef, useState } from 'react';

import {
  ESTADO_INICIAL_FORMULARIO,
  type CampoMissao,
  type EstadoFormularioMissao,
} from '@/acoes/missoes-estado';
import { AvisoErro } from '@/componentes/aviso-erro';
import { EmblemaRank } from '@/componentes/emblema-rank';
import { CLASSES_ACAO_PRINCIPAL, CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import {
  LIMITES_MISSAO,
  ROTULOS_DIFICULDADE,
  ROTULOS_STATUS,
  STATUS_MISSAO,
  type Dificuldade,
  type StatusMissao,
} from '@/dominio/missoes/campos';
import { pontosDaMissao, rankDaMissao } from '@/dominio/missoes/rank';

import { CampoStacks } from './campo-stacks';
import { CLASSES_AJUDA, CLASSES_CAMPO, CLASSES_ROTULO } from './estilos';
import { MensagemErroCampo } from './mensagem-erro-campo';

export type ValoresMissao = {
  nome: string;
  descricao: string;
  arquitetura: string;
  dificuldade: Dificuldade | null;
  status: StatusMissao;
  stacks: string[];
};

export const VALORES_NOVA_MISSAO: ValoresMissao = {
  nome: '',
  descricao: '',
  arquitetura: '',
  dificuldade: null,
  status: 'backlog',
  stacks: [],
};

/** Ordem dos campos na tela: o foco vai para o primeiro inválido. */
const ORDEM_CAMPOS: readonly CampoMissao[] = [
  'nome',
  'descricao',
  'stacks',
  'dificuldade',
  'status',
  'arquitetura',
];

const DIFICULDADES: readonly Dificuldade[] = [1, 2, 3, 4, 5];

const numero = new Intl.NumberFormat('pt-BR');

type AcaoMissao = (estado: EstadoFormularioMissao, formulario: FormData) => Promise<EstadoFormularioMissao>;

/**
 * Formulário de cadastro e edição de Missão. Os campos são controlados (nada
 * se perde quando o servidor devolve erros), e a validação que vale é a do
 * servidor; aqui só há limites de digitação e a prévia do Rank.
 *
 * @param props - Server Action, valores iniciais, sugestões de stacks e textos dos botões.
 */
export function FormularioMissao({
  acao,
  inicial,
  sugestoesStacks,
  rotuloEnviar,
  rotuloEnviando,
  hrefCancelar,
}: {
  acao: AcaoMissao;
  inicial: ValoresMissao;
  sugestoesStacks: readonly string[];
  rotuloEnviar: string;
  rotuloEnviando: string;
  hrefCancelar: string;
}) {
  const [estado, acaoFormulario, pendente] = useActionState(acao, ESTADO_INICIAL_FORMULARIO);
  const [valores, setValores] = useState(inicial);
  const base = useId();
  const id = (campo: string) => `${base}-${campo}`;
  const avisoGeral = useRef<HTMLDivElement>(null);
  const { erros } = estado;

  // Depois de um envio com erro, leva o foco ao primeiro campo inválido.
  useEffect(() => {
    const primeiro = ORDEM_CAMPOS.find((campo) => erros[campo]);
    if (primeiro) {
      const alvo = primeiro === 'dificuldade' ? `${base}-dificuldade-1` : `${base}-${primeiro}`;
      document.getElementById(alvo)?.focus();
    } else if (estado.mensagem) {
      avisoGeral.current?.focus();
    }
  }, [estado, erros, base]);

  function mudar<Campo extends keyof ValoresMissao>(campo: Campo, valor: ValoresMissao[Campo]): void {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
  }

  const descricaoDe = (campo: CampoMissao, ajuda?: string) =>
    [ajuda, erros[campo] ? id(`${campo}-erro`) : undefined].filter(Boolean).join(' ') || undefined;

  const rank = valores.dificuldade ? rankDaMissao(valores.dificuldade, valores.stacks.length) : null;

  return (
    <form action={acaoFormulario} noValidate className="flex flex-col gap-7">
      {estado.mensagem && (
        <div ref={avisoGeral} tabIndex={-1} className="outline-none">
          <AvisoErro titulo="Não foi salvo.">{estado.mensagem}</AvisoErro>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={id('nome')} className={CLASSES_ROTULO}>
          Nome
        </label>
        <input
          id={id('nome')}
          name="nome"
          type="text"
          value={valores.nome}
          onChange={(evento) => mudar('nome', evento.target.value)}
          maxLength={LIMITES_MISSAO.nome.maximo}
          autoComplete="off"
          aria-invalid={erros.nome ? true : undefined}
          aria-describedby={descricaoDe('nome', id('nome-ajuda'))}
          className={CLASSES_CAMPO}
        />
        <p id={id('nome-ajuda')} className={CLASSES_AJUDA}>
          De {LIMITES_MISSAO.nome.minimo} a {LIMITES_MISSAO.nome.maximo} caracteres, único entre as suas
          missões.
        </p>
        {erros.nome && <MensagemErroCampo id={id('nome-erro')} mensagem={erros.nome} />}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={id('descricao')} className={CLASSES_ROTULO}>
          Descrição
        </label>
        <textarea
          id={id('descricao')}
          name="descricao"
          rows={4}
          value={valores.descricao}
          onChange={(evento) => mudar('descricao', evento.target.value)}
          maxLength={LIMITES_MISSAO.descricao.maximo}
          aria-invalid={erros.descricao ? true : undefined}
          aria-describedby={descricaoDe('descricao', id('descricao-ajuda'))}
          className={`${CLASSES_CAMPO} resize-y`}
        />
        <p id={id('descricao-ajuda')} className={CLASSES_AJUDA}>
          O que é a missão e qual problema ela resolve · {numero.format(valores.descricao.length)} de{' '}
          {numero.format(LIMITES_MISSAO.descricao.maximo)}
        </p>
        {erros.descricao && <MensagemErroCampo id={id('descricao-erro')} mensagem={erros.descricao} />}
      </div>

      <CampoStacks
        id={id('stacks')}
        stacks={valores.stacks}
        aoMudar={(stacks) => mudar('stacks', stacks)}
        sugestoes={sugestoesStacks}
        erro={erros.stacks}
      />

      <fieldset
        className="flex flex-col gap-3"
        aria-invalid={erros.dificuldade ? true : undefined}
        aria-describedby={descricaoDe('dificuldade', id('rank'))}
      >
        <legend className={`${CLASSES_ROTULO} mb-2`}>Dificuldade</legend>
        <div className="grid grid-cols-5 gap-2">
          {DIFICULDADES.map((nivel) => (
            <label key={nivel} className="relative">
              <input
                id={id(`dificuldade-${nivel}`)}
                type="radio"
                name="dificuldade"
                value={nivel}
                checked={valores.dificuldade === nivel}
                onChange={() => mudar('dificuldade', nivel)}
                className="peer sr-only"
              />
              <span className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border border-borda-campo px-1 py-2 text-center transition-colors duration-200 peer-checked:border-acento peer-checked:bg-acento-suave/40 peer-checked:text-texto peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento hover:border-texto-suave">
                <span className="font-display text-lg font-extrabold">{nivel}</span>
                <span className="text-[0.6875rem] leading-tight text-texto-suave sm:text-xs">
                  {ROTULOS_DIFICULDADE[nivel]}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div id={id('rank')} aria-live="polite" className="flex min-h-14 items-center gap-3">
          {rank ? (
            <>
              <EmblemaRank rank={rank} rotulo={`Rank de Missão ${rank}`} className="h-12 w-11 shrink-0" />
              <p className="text-sm text-texto-suave">
                Rank de Missão <strong className="text-texto">{rank}</strong> ·{' '}
                {pontosDaMissao(valores.dificuldade!, valores.stacks.length)} pontos (dificuldade e stacks)
              </p>
            </>
          ) : (
            <p className="text-sm text-texto-suave">Escolha a dificuldade para ver o Rank da missão.</p>
          )}
        </div>
        {erros.dificuldade && <MensagemErroCampo id={id('dificuldade-erro')} mensagem={erros.dificuldade} />}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={id('status')} className={CLASSES_ROTULO}>
          Status
        </label>
        <select
          id={id('status')}
          name="status"
          value={valores.status}
          onChange={(evento) => mudar('status', evento.target.value as StatusMissao)}
          aria-invalid={erros.status ? true : undefined}
          aria-describedby={descricaoDe('status')}
          className={`${CLASSES_CAMPO} cursor-pointer`}
        >
          {STATUS_MISSAO.map((status) => (
            <option key={status} value={status}>
              {ROTULOS_STATUS[status]}
            </option>
          ))}
        </select>
        {erros.status && <MensagemErroCampo id={id('status-erro')} mensagem={erros.status} />}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={id('arquitetura')} className={CLASSES_ROTULO}>
          Estrutura e arquitetura <span className="normal-case tracking-normal">(opcional)</span>
        </label>
        <textarea
          id={id('arquitetura')}
          name="arquitetura"
          rows={6}
          value={valores.arquitetura}
          onChange={(evento) => mudar('arquitetura', evento.target.value)}
          maxLength={LIMITES_MISSAO.arquitetura.maximo}
          aria-invalid={erros.arquitetura ? true : undefined}
          aria-describedby={descricaoDe('arquitetura', id('arquitetura-ajuda'))}
          className={`${CLASSES_CAMPO} resize-y font-mono text-sm`}
        />
        <p id={id('arquitetura-ajuda')} className={CLASSES_AJUDA}>
          Markdown · {numero.format(valores.arquitetura.length)} de{' '}
          {numero.format(LIMITES_MISSAO.arquitetura.maximo)}
        </p>
        {erros.arquitetura && <MensagemErroCampo id={id('arquitetura-erro')} mensagem={erros.arquitetura} />}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-borda pt-6">
        <button
          type="submit"
          disabled={pendente}
          className={`${CLASSES_ACAO_PRINCIPAL} disabled:cursor-wait disabled:opacity-70`}
        >
          {pendente ? rotuloEnviando : rotuloEnviar}
        </button>
        <Link href={hrefCancelar} className={CLASSES_ACAO_SECUNDARIA}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
