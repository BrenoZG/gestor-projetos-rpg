'use client';

import { ROTULOS_STATUS, STATUS_MISSAO, type StatusMissao } from '@/dominio/missoes/campos';

/**
 * Os três status como botões alternáveis: o atual fica "pressionado"
 * (`aria-pressed`), e um toque muda o status sem abrir a edição. O leitor de
 * tela ouve o nome do grupo ("Status de …") e qual botão está pressionado.
 *
 * @param props - Rótulo do grupo, status atual e a ação de mudar.
 */
export function SeletorStatus({
  rotulo,
  status,
  aoMudar,
}: {
  rotulo: string;
  status: StatusMissao;
  aoMudar: (status: StatusMissao) => void;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {STATUS_MISSAO.map((opcao) => {
        const atual = opcao === status;
        return (
          <button
            key={opcao}
            type="button"
            aria-pressed={atual}
            onClick={() => {
              if (!atual) aoMudar(opcao);
            }}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border px-3 font-mono text-xs transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento ${
              atual
                ? 'border-acento bg-acento-suave/60 text-texto'
                : 'border-borda-campo text-texto-suave hover:border-texto-suave hover:text-texto'
            }`}
          >
            {atual && (
              <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10">
                <path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
              </svg>
            )}
            {ROTULOS_STATUS[opcao]}
          </button>
        );
      })}
    </div>
  );
}
