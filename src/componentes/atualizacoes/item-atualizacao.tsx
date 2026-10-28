'use client';

import Link from 'next/link';
import { useState } from 'react';

import { editarAtualizacao, excluirAtualizacao } from '@/acoes/atualizacoes';
import { ConfirmarExclusao } from '@/componentes/missoes/confirmar-exclusao';
import type { Atualizacao } from '@/dados/atualizacoes';
import type { ResumoMissao } from '@/dados/missoes';
import type { StatusMissao } from '@/dominio/missoes/campos';
import { formatarDataHora } from '@/lib/datas';

import { FormularioAtualizacao } from './formulario-atualizacao';
import { SeletorStatus } from './seletor-status';

/**
 * Uma Atualização no histórico: título, datas, descrição como digitada, os três
 * botões de status e as ações de editar (no próprio lugar) e excluir.
 *
 * @param props - Atualização, Missões para mover (RN-01), se mostra o link
 *   para a Missão (página geral), ação de mudar o status e o que fazer se a
 *   exclusão falhar.
 */
export function ItemAtualizacao({
  atualizacao,
  missoes,
  mostrarMissao = false,
  aoMudarStatus,
  aoFalhar,
}: {
  atualizacao: Atualizacao;
  missoes: readonly ResumoMissao[];
  mostrarMissao?: boolean;
  aoMudarStatus: (status: StatusMissao) => void;
  aoFalhar: (mensagem: string) => void;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <li className="flex flex-col gap-3 rounded-md border border-borda-forte bg-superficie/80 p-4">
      <div className="flex flex-col gap-1">
        <h4 className="font-display text-base leading-snug font-bold break-words">{atualizacao.titulo}</h4>
        {mostrarMissao && (
          <p className="text-sm text-texto-suave">
            Missão:{' '}
            <Link
              href={`/missoes/${atualizacao.projetoId}`}
              className="break-words text-texto underline underline-offset-4 hover:text-acento-titulo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
            >
              {atualizacao.nomeMissao}
            </Link>
          </p>
        )}
        <p className="font-mono text-xs text-texto-suave">
          Criada em {formatarDataHora(atualizacao.criadoEm)}
          {atualizacao.concluidoEm && <> · Concluída em {formatarDataHora(atualizacao.concluidoEm)}</>}
        </p>
      </div>

      {editando ? (
        <FormularioAtualizacao
          rotulo="Editar atualização"
          acao={editarAtualizacao.bind(null, atualizacao.id)}
          inicial={{
            titulo: atualizacao.titulo,
            descricao: atualizacao.descricao,
            projetoId: atualizacao.projetoId,
          }}
          missoes={missoes}
          rotuloEnviar="Salvar"
          aoGravar={() => setEditando(false)}
          aoCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <p className="text-sm leading-relaxed whitespace-pre-line break-words text-texto">
            {atualizacao.descricao}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SeletorStatus
              rotulo={`Status de ${atualizacao.titulo}`}
              status={atualizacao.status}
              aoMudar={aoMudarStatus}
            />
            <div className="flex gap-1">
              <button
                type="button"
                aria-label={`Editar ${atualizacao.titulo}`}
                onClick={() => setEditando(true)}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-md px-3 text-sm text-texto-suave underline-offset-4 hover:text-texto hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
              >
                Editar
              </button>
              <ConfirmarExclusao
                compacto
                rotuloGatilho={`Excluir ${atualizacao.titulo}`}
                pergunta={`Excluir a atualização “${atualizacao.titulo}”?`}
                detalhe="A atualização sai do histórico da missão. Esta ação não pode ser desfeita."
                rotuloConfirmar="Excluir atualização"
                acao={async () => {
                  const resultado = await excluirAtualizacao(atualizacao.id);
                  if (!resultado.ok) aoFalhar(resultado.mensagem);
                }}
              />
            </div>
          </div>
        </>
      )}
    </li>
  );
}
