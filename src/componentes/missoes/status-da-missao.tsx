'use client';

import { useOptimistic, useState, useTransition } from 'react';

import { moverMissao } from '@/acoes/missoes';
import type { ResultadoMovimento } from '@/acoes/missoes-estado';
import { SeletorStatus } from '@/componentes/atualizacoes/seletor-status';
import { AvisoErro } from '@/componentes/aviso-erro';
import { anuncioDaRecompensa, AvisoRecompensa } from '@/componentes/aviso-recompensa';
import type { Recompensa } from '@/dominio/gamificacao/recompensa';
import { ROTULOS_STATUS, type StatusMissao } from '@/dominio/missoes/campos';

const FALHA_DE_REDE: ResultadoMovimento = {
  ok: false,
  mensagem: 'Não foi possível mudar o status agora. Confira a conexão e tente de novo.',
};

/**
 * Status da Missão na ficha, com troca em um toque. Desde que a edição deixou
 * de mudar o status, ele muda por aqui ou pelo Quadro (RF-20). A troca aparece
 * na hora e volta atrás se o servidor recusar.
 *
 * @param props - Id e nome da Missão e o status gravado.
 */
export function StatusDaMissao({ id, nome, status }: { id: string; nome: string; status: StatusMissao }) {
  const [atual, aplicar] = useOptimistic(status, (_anterior, novo: StatusMissao) => novo);
  const [, iniciarTransicao] = useTransition();
  const [anuncio, setAnuncio] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [recompensa, setRecompensa] = useState<Recompensa | null>(null);

  function mudar(novo: StatusMissao): void {
    setErro(null);
    setRecompensa(null);
    iniciarTransicao(async () => {
      aplicar(novo);
      let resultado: ResultadoMovimento;
      try {
        resultado = await moverMissao(id, novo);
      } catch {
        resultado = FALHA_DE_REDE;
      }
      if (resultado.ok) {
        setRecompensa(resultado.recompensa ?? null);
        const extra = resultado.recompensa ? ` ${anuncioDaRecompensa(resultado.recompensa, 'projeto')}` : '';
        setAnuncio(`${nome}: ${ROTULOS_STATUS[novo]}.${extra}`);
      } else setErro(resultado.mensagem);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="sr-only">
        {anuncio}
      </p>
      <SeletorStatus rotulo={`Status de ${nome}`} status={atual} aoMudar={mudar} />
      {erro && <AvisoErro titulo="O status não foi alterado.">{erro}</AvisoErro>}
      {recompensa && <AvisoRecompensa recompensa={recompensa} item="projeto" />}
    </div>
  );
}
