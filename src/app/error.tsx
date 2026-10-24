'use client';

import Link from 'next/link';

import { CLASSES_ACAO_PRINCIPAL, CLASSES_ACAO_SECUNDARIA, TelaSistema } from '@/componentes/tela-sistema';

/**
 * Tela de erro inesperado. A mensagem é genérica de propósito: o detalhe fica
 * no log do servidor, nunca na tela.
 *
 * @param props - `retry` busca o conteúdo de novo e re-renderiza (Next 16).
 */
export default function Erro({ retry }: { error: unknown; retry: () => void }) {
  return (
    <TelaSistema
      rotulo="[ SISTEMA ] · FALHA"
      titulo="O Sistema tropeçou"
      acoes={
        <>
          <button type="button" onClick={() => retry()} className={CLASSES_ACAO_PRINCIPAL}>
            Tentar de novo
          </button>
          <Link href="/" className={CLASSES_ACAO_SECUNDARIA}>
            Voltar ao Quadro
          </Link>
        </>
      }
    >
      <p>Algo deu errado ao carregar esta tela. Tente de novo em instantes.</p>
    </TelaSistema>
  );
}
