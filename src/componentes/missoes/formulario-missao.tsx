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
  CAPACIDADES,
  ESTILOS_ARQUITETURAIS,
  LIMITES_MISSAO,
  ROTULOS_CAPACIDADE,
  ROTULOS_ESTILO,
  ROTULOS_STATUS,
  STATUS_MISSAO,
  type Capacidade,
  type EstiloArquitetural,
  type StatusMissao,
  type TipoProjeto,
} from '@/dominio/missoes/campos';
import {
  PONTOS_POR_CAPACIDADE,
  PONTOS_POR_ESTILO,
  STACKS_QUE_PONTUAM,
  pontuacaoDaMissao,
  rankPorPontos,
} from '@/dominio/missoes/rank';

import { CampoEtiquetas } from './campo-etiquetas';
import { CampoLinks, type LinhaDeLink } from './campo-links';
import { CampoTipo } from './campo-tipo';
import { CLASSES_AJUDA, CLASSES_CAMPO, CLASSES_ROTULO } from './estilos';
import { MensagemErroCampo } from './mensagem-erro-campo';

export type ValoresMissao = {
  tipo: TipoProjeto;
  nome: string;
  descricao: string;
  arquitetura: string;
  estilo: EstiloArquitetural | null;
  capacidades: Capacidade[];
  status: StatusMissao;
  stacks: string[];
  tags: string[];
  links: LinhaDeLink[];
};

export const VALORES_NOVA_MISSAO: ValoresMissao = {
  tipo: 'dev',
  nome: '',
  descricao: '',
  arquitetura: '',
  estilo: null,
  capacidades: [],
  status: 'backlog',
  stacks: [],
  tags: [],
  links: [],
};

/** Ordem dos campos na tela: o foco vai para o primeiro inválido. */
const ORDEM_CAMPOS: readonly CampoMissao[] = [
  'tipo',
  'nome',
  'descricao',
  'stacks',
  'tags',
  'estilo',
  'capacidades',
  'arquitetura',
  'links',
  'status',
];

/** Num grupo de opções, o foco vai para a primeira opção do grupo; nos links, para o primeiro endereço. */
const ALVO_DO_FOCO: Partial<Record<CampoMissao, string>> = {
  tipo: 'tipo-dev',
  estilo: `estilo-${ESTILOS_ARQUITETURAIS[0]}`,
  capacidades: `capacidade-${CAPACIDADES[0]}`,
  links: 'links-url-0',
};

/** Opção de escolha (radio ou checkbox) com a borda acesa quando marcada. */
const CLASSES_OPCAO =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-borda-campo px-3 py-2 text-sm transition-colors duration-200 hover:border-texto-suave has-checked:border-acento has-checked:bg-acento-suave/40';
const CLASSES_MARCADOR = 'size-4 shrink-0 cursor-pointer accent-acento';
const CLASSES_PONTOS = 'ml-auto shrink-0 font-mono text-xs text-texto-suave';

const numero = new Intl.NumberFormat('pt-BR');

type AcaoMissao = (estado: EstadoFormularioMissao, formulario: FormData) => Promise<EstadoFormularioMissao>;

/**
 * Formulário de cadastro e edição de Missão. Os campos são controlados (nada
 * se perde quando o servidor devolve erros), e a validação que vale é a do
 * servidor; aqui só há limites de digitação e a prévia do Rank.
 *
 * O tipo (RN-15) mostra ou esconde a parte técnica; os valores técnicos
 * escondidos ficam guardados e voltam se o tipo voltar a Desenvolvimento.
 * Na edição o status não aparece: ele muda pelo Quadro e pela ficha.
 *
 * @param props - Server Action, modo, valores iniciais, sugestões e textos dos botões.
 */
export function FormularioMissao({
  acao,
  modo,
  inicial,
  sugestoesStacks,
  sugestoesTags,
  rotuloEnviar,
  rotuloEnviando,
  hrefCancelar,
}: {
  acao: AcaoMissao;
  modo: 'criar' | 'editar';
  inicial: ValoresMissao;
  sugestoesStacks: readonly string[];
  sugestoesTags: readonly string[];
  rotuloEnviar: string;
  rotuloEnviando: string;
  hrefCancelar: string;
}) {
  const [estado, acaoFormulario, pendente] = useActionState(acao, ESTADO_INICIAL_FORMULARIO);
  const [valores, setValores] = useState(inicial);
  const [entendeuPerda, setEntendeuPerda] = useState(false);
  const base = useId();
  const id = (campo: string) => `${base}-${campo}`;
  const avisoGeral = useRef<HTMLDivElement>(null);
  const { erros } = estado;
  const desenvolvimento = valores.tipo === 'dev';
  // RN-16: salvar como Geral uma Missão que era de Desenvolvimento apaga a parte técnica.
  const apagaParteTecnica = modo === 'editar' && inicial.tipo === 'dev' && !desenvolvimento;

  // Depois de um envio com erro, leva o foco ao primeiro campo inválido.
  useEffect(() => {
    const primeiro = ORDEM_CAMPOS.find((campo) => erros[campo]);
    if (primeiro) {
      document.getElementById(`${base}-${ALVO_DO_FOCO[primeiro] ?? primeiro}`)?.focus();
    } else if (estado.mensagem) {
      avisoGeral.current?.focus();
    }
  }, [estado, erros, base]);

  function mudar<Campo extends keyof ValoresMissao>(campo: Campo, valor: ValoresMissao[Campo]): void {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
  }

  const descricaoDe = (campo: CampoMissao, ajuda?: string) =>
    [ajuda, erros[campo] ? id(`${campo}-erro`) : undefined].filter(Boolean).join(' ') || undefined;

  function alternarCapacidade(capacidade: Capacidade, marcada: boolean): void {
    // Mantém a ordem da lista (a mesma da tela), sem repetir.
    const conjunto = new Set(valores.capacidades);
    if (marcada) conjunto.add(capacidade);
    else conjunto.delete(capacidade);
    mudar(
      'capacidades',
      CAPACIDADES.filter((item) => conjunto.has(item)),
    );
  }

  const pontuacao =
    desenvolvimento && valores.estilo
      ? pontuacaoDaMissao({
          estilo: valores.estilo,
          capacidades: valores.capacidades,
          quantidadeStacks: valores.stacks.length,
        })
      : null;
  const rank = pontuacao ? rankPorPontos(pontuacao.total) : null;

  return (
    <form action={acaoFormulario} noValidate className="flex flex-col gap-7">
      {estado.mensagem && (
        <div ref={avisoGeral} tabIndex={-1} className="outline-none">
          <AvisoErro titulo="Não foi salvo.">{estado.mensagem}</AvisoErro>
        </div>
      )}

      <CampoTipo id={id} tipo={valores.tipo} aoMudar={(tipo) => mudar('tipo', tipo)} erro={erros.tipo} />

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

      <CampoEtiquetas
        id={id('stacks')}
        nome="stacks"
        rotulo={
          desenvolvimento ? (
            'Stacks'
          ) : (
            <>
              Ferramentas <span className="normal-case tracking-normal">(opcional)</span>
            </>
          )
        }
        rotuloLista={desenvolvimento ? 'Stacks adicionadas' : 'Ferramentas adicionadas'}
        exemplo={desenvolvimento ? 'Ex.: Next.js' : 'Ex.: Canva'}
        maximo={desenvolvimento ? LIMITES_MISSAO.stacks.maximo : LIMITES_MISSAO.ferramentas.maximo}
        itens={valores.stacks}
        aoMudar={(stacks) => mudar('stacks', stacks)}
        sugestoes={sugestoesStacks}
        erro={erros.stacks}
      />

      <CampoEtiquetas
        id={id('tags')}
        nome="tags"
        rotulo={
          <>
            Tags <span className="normal-case tracking-normal">(opcional)</span>
          </>
        }
        rotuloLista="Tags adicionadas"
        exemplo="Ex.: Revenda"
        maximo={LIMITES_MISSAO.tags.maximo}
        itens={valores.tags}
        aoMudar={(tags) => mudar('tags', tags)}
        sugestoes={sugestoesTags}
        erro={erros.tags}
      />

      {desenvolvimento && (
        <>
          <fieldset
            className="flex flex-col gap-3"
            aria-invalid={erros.estilo ? true : undefined}
            aria-describedby={descricaoDe('estilo', id('estilo-ajuda'))}
          >
            <legend className={`${CLASSES_ROTULO} mb-2`}>Estilo arquitetural</legend>
            <p id={id('estilo-ajuda')} className={`${CLASSES_AJUDA} -mt-1`}>
              Como o sistema se organiza. Escolha o mais próximo; os pontos entram no Rank.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ESTILOS_ARQUITETURAIS.map((estilo) => (
                <label key={estilo} className={CLASSES_OPCAO}>
                  <input
                    id={id(`estilo-${estilo}`)}
                    type="radio"
                    name="estilo"
                    value={estilo}
                    checked={valores.estilo === estilo}
                    onChange={() => mudar('estilo', estilo)}
                    className={CLASSES_MARCADOR}
                  />
                  <span>{ROTULOS_ESTILO[estilo]}</span>
                  <span className={CLASSES_PONTOS}>+{PONTOS_POR_ESTILO[estilo]}</span>
                </label>
              ))}
            </div>
            {erros.estilo && <MensagemErroCampo id={id('estilo-erro')} mensagem={erros.estilo} />}
          </fieldset>

          <fieldset
            className="flex flex-col gap-3"
            aria-invalid={erros.capacidades ? true : undefined}
            aria-describedby={descricaoDe('capacidades', id('capacidades-ajuda'))}
          >
            <legend className={`${CLASSES_ROTULO} mb-2`}>
              Capacidades <span className="normal-case tracking-normal">(opcional)</span>
            </legend>
            <p id={id('capacidades-ajuda')} className={`${CLASSES_AJUDA} -mt-1`}>
              O que a missão precisa entregar · +{PONTOS_POR_CAPACIDADE} pontos cada
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CAPACIDADES.map((capacidade) => (
                <label key={capacidade} className={CLASSES_OPCAO}>
                  <input
                    id={id(`capacidade-${capacidade}`)}
                    type="checkbox"
                    name="capacidades"
                    value={capacidade}
                    checked={valores.capacidades.includes(capacidade)}
                    onChange={(evento) => alternarCapacidade(capacidade, evento.target.checked)}
                    className={CLASSES_MARCADOR}
                  />
                  <span>{ROTULOS_CAPACIDADE[capacidade]}</span>
                </label>
              ))}
            </div>
            {erros.capacidades && (
              <MensagemErroCampo id={id('capacidades-erro')} mensagem={erros.capacidades} />
            )}
          </fieldset>

          <div id={id('rank')} aria-live="polite" className="flex min-h-14 items-center gap-3">
            {rank && pontuacao ? (
              <>
                <EmblemaRank rank={rank} rotulo={`Rank de Missão ${rank}`} className="h-12 w-11 shrink-0" />
                <p className="text-sm text-texto-suave">
                  Rank de Missão <strong className="text-texto">{rank}</strong> · {pontuacao.total} pontos
                  <span className="block font-mono text-xs">
                    Estilo +{pontuacao.estilo} · Capacidades +{pontuacao.capacidades} · Stacks +
                    {pontuacao.stacks} (até {STACKS_QUE_PONTUAM} pontuam)
                  </span>
                </p>
              </>
            ) : (
              <p className="text-sm text-texto-suave">
                Escolha o estilo arquitetural para ver o Rank da missão.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={id('arquitetura')} className={CLASSES_ROTULO}>
              Estrutura e arquitetura
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
              Camadas, módulos e decisões, em Markdown · {numero.format(valores.arquitetura.length)} de{' '}
              {numero.format(LIMITES_MISSAO.arquitetura.maximo)}
            </p>
            {erros.arquitetura && (
              <MensagemErroCampo id={id('arquitetura-erro')} mensagem={erros.arquitetura} />
            )}
          </div>
        </>
      )}

      <CampoLinks
        prefixo={id('links')}
        linhas={valores.links}
        aoMudar={(links) => mudar('links', links)}
        erro={erros.links}
      />

      {modo === 'criar' && (
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
      )}

      {apagaParteTecnica && (
        <div className="flex flex-col gap-3 rounded-md border border-atencao/70 bg-superficie-alta p-4">
          <p id={id('aviso-perda')} className="text-sm text-texto">
            Ao salvar como Geral, o estilo, as capacidades e a arquitetura desta missão serão apagados.
          </p>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-texto">
            <input
              type="checkbox"
              checked={entendeuPerda}
              onChange={(evento) => setEntendeuPerda(evento.target.checked)}
              aria-describedby={id('aviso-perda')}
              className={CLASSES_MARCADOR}
            />
            Entendi
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-borda pt-6">
        <button
          type="submit"
          disabled={pendente || (apagaParteTecnica && !entendeuPerda)}
          className={`${CLASSES_ACAO_PRINCIPAL} disabled:opacity-70 ${pendente ? 'disabled:cursor-wait' : 'disabled:cursor-not-allowed'}`}
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
