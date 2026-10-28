'use client';

import { criarAtualizacao } from '@/acoes/atualizacoes';
import { AvisoErro } from '@/componentes/aviso-erro';
import { CLASSES_ROTULO } from '@/componentes/missoes/estilos';
import type { Atualizacao } from '@/dados/atualizacoes';
import type { ResumoMissao } from '@/dados/missoes';

import { FormularioAtualizacao } from './formulario-atualizacao';
import { ListaAtualizacoes } from './lista-atualizacoes';

/**
 * Seção "Atualizações" no fim da ficha da Missão (RF-05 a RF-09): o
 * formulário de registro e o histórico, da mais recente para a mais antiga
 * pela data de criação.
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
  return (
    <section aria-labelledby="titulo-atualizacoes" className="flex flex-col gap-5 border-t border-borda pt-6">
      <h3 id="titulo-atualizacoes" className={CLASSES_ROTULO}>
        Atualizações · {atualizacoes.length}
      </h3>

      <div className="rounded-md border border-borda bg-fundo/40 p-4">
        <FormularioAtualizacao
          rotulo="Nova atualização"
          acao={criarAtualizacao}
          inicial={{ titulo: '', descricao: '', projetoId }}
          rotuloEnviar="Registrar atualização"
        />
      </div>

      {falhouAoCarregar ? (
        <AvisoErro titulo="Histórico indisponível.">
          Não foi possível carregar as atualizações. Recarregue a página em instantes.
        </AvisoErro>
      ) : atualizacoes.length === 0 ? (
        <p className="rounded-md border border-dashed border-borda-campo px-6 py-8 text-center text-sm text-texto-suave">
          Nenhuma atualização registrada ainda.
        </p>
      ) : (
        <ListaAtualizacoes atualizacoes={atualizacoes} missoes={missoes} rotulo="Histórico de atualizações" />
      )}
    </section>
  );
}
