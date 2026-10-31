'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';

import {
  ESTADO_INICIAL_ATUALIZACAO,
  type CampoAtualizacao,
  type EstadoFormularioAtualizacao,
} from '@/acoes/atualizacoes-estado';
import { AvisoErro } from '@/componentes/aviso-erro';
import { CLASSES_AJUDA, CLASSES_CAMPO, CLASSES_ROTULO } from '@/componentes/missoes/estilos';
import { MensagemErroCampo } from '@/componentes/missoes/mensagem-erro-campo';
import { CLASSES_ACAO_PRINCIPAL, CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import type { ResumoMissao } from '@/dados/missoes';
import { LIMITES_ATUALIZACAO } from '@/dominio/atualizacoes/campos';

type AcaoAtualizacao = (
  estado: EstadoFormularioAtualizacao,
  formulario: FormData,
) => Promise<EstadoFormularioAtualizacao>;

/** Ordem dos campos na tela: o foco vai para o primeiro inválido. */
const ORDEM_CAMPOS: readonly CampoAtualizacao[] = ['titulo', 'descricao', 'projetoId'];

const numero = new Intl.NumberFormat('pt-BR');

/**
 * Formulário de Atualização, usado para registrar (na ficha da Missão) e para
 * editar (dentro do item do histórico). Na edição, a lista de Missões permite
 * mover a Atualização (RN-01). A validação que vale é a do servidor.
 *
 * @param props - Nome acessível do formulário, Server Action, valores iniciais,
 *   Missões para escolher (só na edição), textos do botão e o que fazer depois
 *   de gravar (limpar ou fechar) e ao cancelar.
 */
export function FormularioAtualizacao({
  rotulo,
  acao,
  inicial,
  missoes,
  rotuloEnviar,
  aoGravar,
  aoCancelar,
}: {
  rotulo: string;
  acao: AcaoAtualizacao;
  inicial: { titulo: string; descricao: string; projetoId: string };
  missoes?: readonly ResumoMissao[];
  rotuloEnviar: string;
  aoGravar?: () => void;
  aoCancelar?: () => void;
}) {
  const [estado, acaoFormulario, pendente] = useActionState(acao, ESTADO_INICIAL_ATUALIZACAO);
  const [valores, setValores] = useState(inicial);
  const [enviadoVisto, setEnviadoVisto] = useState(0);
  const base = useId();
  const id = (campo: string) => `${base}-${campo}`;
  const avisoGeral = useRef<HTMLDivElement>(null);
  const { erros } = estado;

  // Gravou: limpa o formulário (ajuste de estado durante a renderização, sem efeito).
  if (estado.enviado !== enviadoVisto) {
    setEnviadoVisto(estado.enviado);
    setValores(inicial);
  }

  useEffect(() => {
    if (estado.enviado > 0) aoGravar?.();
    // Só reage a um envio novo; aoGravar muda a cada renderização do pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.enviado]);

  // Depois de um envio com erro, leva o foco ao primeiro campo inválido.
  useEffect(() => {
    const primeiro = ORDEM_CAMPOS.find((campo) => erros[campo]);
    if (primeiro) document.getElementById(`${base}-${primeiro}`)?.focus();
    else if (estado.mensagem) avisoGeral.current?.focus();
  }, [estado, erros, base]);

  const descricaoDe = (campo: CampoAtualizacao, ajuda?: string) =>
    [ajuda, erros[campo] ? id(`${campo}-erro`) : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <form action={acaoFormulario} aria-label={rotulo} noValidate className="flex flex-col gap-4">
      {estado.mensagem && (
        <div ref={avisoGeral} tabIndex={-1} className="outline-none">
          <AvisoErro titulo="Não foi salva.">{estado.mensagem}</AvisoErro>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={id('titulo')} className={CLASSES_ROTULO}>
          Título
        </label>
        <input
          id={id('titulo')}
          name="titulo"
          type="text"
          value={valores.titulo}
          onChange={(evento) => setValores({ ...valores, titulo: evento.target.value })}
          maxLength={LIMITES_ATUALIZACAO.titulo.maximo}
          autoComplete="off"
          aria-invalid={erros.titulo ? true : undefined}
          aria-describedby={descricaoDe('titulo')}
          className={CLASSES_CAMPO}
        />
        {erros.titulo && <MensagemErroCampo id={id('titulo-erro')} mensagem={erros.titulo} />}
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
          onChange={(evento) => setValores({ ...valores, descricao: evento.target.value })}
          maxLength={LIMITES_ATUALIZACAO.descricao.maximo}
          aria-invalid={erros.descricao ? true : undefined}
          aria-describedby={descricaoDe('descricao', id('descricao-ajuda'))}
          className={`${CLASSES_CAMPO} resize-y`}
        />
        <p id={id('descricao-ajuda')} className={CLASSES_AJUDA}>
          O que foi feito · {numero.format(valores.descricao.length)} de{' '}
          {numero.format(LIMITES_ATUALIZACAO.descricao.maximo)}
        </p>
        {erros.descricao && <MensagemErroCampo id={id('descricao-erro')} mensagem={erros.descricao} />}
      </div>

      {missoes ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={id('projetoId')} className={CLASSES_ROTULO}>
            Projeto
          </label>
          <select
            id={id('projetoId')}
            name="projetoId"
            value={valores.projetoId}
            onChange={(evento) => setValores({ ...valores, projetoId: evento.target.value })}
            aria-invalid={erros.projetoId ? true : undefined}
            aria-describedby={descricaoDe('projetoId')}
            className={`${CLASSES_CAMPO} cursor-pointer`}
          >
            {missoes.map((missao) => (
              <option key={missao.id} value={missao.id}>
                {missao.nome}
              </option>
            ))}
          </select>
          {erros.projetoId && <MensagemErroCampo id={id('projetoId-erro')} mensagem={erros.projetoId} />}
        </div>
      ) : (
        <>
          <input type="hidden" name="projetoId" value={valores.projetoId} />
          {erros.projetoId && <MensagemErroCampo id={id('projetoId-erro')} mensagem={erros.projetoId} />}
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pendente}
          className={`${CLASSES_ACAO_PRINCIPAL} disabled:cursor-wait disabled:opacity-70`}
        >
          {pendente ? 'Salvando…' : rotuloEnviar}
        </button>
        {aoCancelar && (
          <button type="button" onClick={aoCancelar} className={CLASSES_ACAO_SECUNDARIA}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
