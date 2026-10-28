'use client';

import { useOptimistic, useState, useTransition } from 'react';

import { criarAtualizacao, mudarStatusDaAtualizacao } from '@/acoes/atualizacoes';
import type { ResultadoMovimento } from '@/acoes/missoes-estado';
import { AvisoErro } from '@/componentes/aviso-erro';
import { CLASSES_ROTULO } from '@/componentes/missoes/estilos';
import type { Atualizacao } from '@/dados/atualizacoes';
import type { ResumoMissao } from '@/dados/missoes';
import { ROTULOS_STATUS, type StatusMissao } from '@/dominio/missoes/campos';

import { FormularioAtualizacao } from './formulario-atualizacao';
import { ItemAtualizacao } from './item-atualizacao';

const FALHA_DE_REDE: ResultadoMovimento = {
  ok: false,
  mensagem: 'Não foi possível salvar agora. Confira a conexão e tente de novo.',
};

type MudancaStatus = { id: string; status: StatusMissao };

/**
 * Seção "Atualizações" no fim da ficha da Missão (RF-05 a RF-09): o
 * formulário de registro e o histórico, da mais recente para a mais antiga
 * pela data de criação. O status muda na hora (atualização otimista) e volta
 * se o servidor recusar.
 *
 * @param props - Missão dona, histórico, Missões para mover e se o histórico falhou ao carregar.
 */
export function SecaoAtualizacoes({
  projetoId,
  atualizacoes,
  missoes,
  falhouAoCarregar,
}: {
  projetoId: string;
  atualizacoes: Atualizacao[];
  missoes: readonly ResumoMissao[];
  falhouAoCarregar: boolean;
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
    <section aria-labelledby="titulo-atualizacoes" className="flex flex-col gap-5 border-t border-borda pt-6">
      <h3 id="titulo-atualizacoes" className={CLASSES_ROTULO}>
        Atualizações · {otimistas.length}
      </h3>

      <div className="rounded-md border border-borda bg-fundo/40 p-4">
        <FormularioAtualizacao
          rotulo="Nova atualização"
          acao={criarAtualizacao}
          inicial={{ titulo: '', descricao: '', projetoId }}
          rotuloEnviar="Registrar atualização"
        />
      </div>

      <p role="status" className="sr-only">
        {anuncio}
      </p>
      {erro && <AvisoErro titulo="A atualização não foi alterada.">{erro}</AvisoErro>}

      {falhouAoCarregar ? (
        <AvisoErro titulo="Histórico indisponível.">
          Não foi possível carregar as atualizações. Recarregue a página em instantes.
        </AvisoErro>
      ) : otimistas.length === 0 ? (
        <p className="rounded-md border border-dashed border-borda-campo px-6 py-8 text-center text-sm text-texto-suave">
          Nenhuma atualização registrada ainda.
        </p>
      ) : (
        <ol aria-label="Histórico de atualizações" className="flex flex-col gap-3">
          {otimistas.map((atualizacao) => (
            <ItemAtualizacao
              key={atualizacao.id}
              atualizacao={atualizacao}
              missoes={missoes}
              aoMudarStatus={(status) => mudarStatus(atualizacao, status)}
              aoFalhar={setErro}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
