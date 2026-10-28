'use client';

import { useOptimistic, useState, useTransition } from 'react';

import { mudarStatusDaAtualizacao } from '@/acoes/atualizacoes';
import type { ResultadoMovimento } from '@/acoes/missoes-estado';
import { AvisoErro } from '@/componentes/aviso-erro';
import type { Atualizacao } from '@/dados/atualizacoes';
import type { ResumoMissao } from '@/dados/missoes';
import { ROTULOS_STATUS, type StatusMissao } from '@/dominio/missoes/campos';

import { ItemAtualizacao } from './item-atualizacao';

const FALHA_DE_REDE: ResultadoMovimento = {
  ok: false,
  mensagem: 'Não foi possível salvar agora. Confira a conexão e tente de novo.',
};

type MudancaStatus = { id: string; status: StatusMissao };

/**
 * Lista de Atualizações com os três botões de status, usada na ficha da
 * Missão e na página geral. O status muda na hora (atualização otimista) e
 * volta se o servidor recusar; a mudança é anunciada ao leitor de tela.
 *
 * @param props - Atualizações, Missões para mover (RN-01), nome acessível da
 *   lista e se cada item mostra o link para a Missão dele.
 */
export function ListaAtualizacoes({
  atualizacoes,
  missoes,
  rotulo,
  mostrarMissao = false,
}: {
  atualizacoes: Atualizacao[];
  missoes: readonly ResumoMissao[];
  rotulo: string;
  mostrarMissao?: boolean;
}) {
  const [otimistas, aplicarMudanca] = useOptimistic(atualizacoes, (atuais, { id, status }: MudancaStatus) =>
    atuais.map((item) => (item.id === id ? { ...item, status } : item)),
  );
  const [, iniciarTransicao] = useTransition();
  const [anuncio, setAnuncio] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function mudarStatus(atualizacao: Atualizacao, status: StatusMissao): void {
    setErro(null);
    iniciarTransicao(async () => {
      aplicarMudanca({ id: atualizacao.id, status });
      let resultado: ResultadoMovimento;
      try {
        resultado = await mudarStatusDaAtualizacao(atualizacao.id, status);
      } catch {
        resultado = FALHA_DE_REDE;
      }
      if (resultado.ok) setAnuncio(`${atualizacao.titulo}: ${ROTULOS_STATUS[status]}.`);
      else setErro(resultado.mensagem);
    });
  }

  return (
    <>
      <p role="status" className="sr-only">
        {anuncio}
      </p>
      {erro && <AvisoErro titulo="A atualização não foi alterada.">{erro}</AvisoErro>}
      <ol aria-label={rotulo} className="flex flex-col gap-3">
        {otimistas.map((atualizacao) => (
          <ItemAtualizacao
            key={atualizacao.id}
            atualizacao={atualizacao}
            missoes={missoes}
            mostrarMissao={mostrarMissao}
            aoMudarStatus={(status) => mudarStatus(atualizacao, status)}
            aoFalhar={setErro}
          />
        ))}
      </ol>
    </>
  );
}
