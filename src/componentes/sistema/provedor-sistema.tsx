'use client';

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import type { Recompensa } from '@/dominio/gamificacao/recompensa';

import { JanelaSistema } from './janela-sistema';

/** Conclusão de Projeto a mostrar na Janela do Sistema. */
export type JanelaConclusao = {
  nome: string;
  recompensa: Recompensa;
  /** Id do elemento que recebe o foco quando a janela fecha (o botão Mover, por exemplo). */
  idRetorno?: string;
};

type ContextoSistema = {
  /** Chame antes de pedir uma mudança que pode render XP: a cinemática espera. */
  reservar: () => void;
  /** Libera a reserva e, se houver conclusão, abre a Janela do Sistema. */
  mostrarConclusao: (janela: JanelaConclusao | null) => void;
  /** Há uma reserva ou uma janela aberta: a cinemática não abre agora. */
  ocupado: boolean;
};

const Contexto = createContext<ContextoSistema | null>(null);

/**
 * Fila das janelas do Sistema nas telas do jogo: uma de cada vez, a Janela do
 * Sistema da conclusão antes da cinemática de level up. Sem a fila, os dois
 * diálogos modais disputariam o foco.
 *
 * Por que reservar: a resposta da ação traz o layout novo (com a cinemática
 * pendente) junto com o resultado da conclusão. A reserva, feita antes de
 * chamar a ação, segura a cinemática até a Janela abrir e fechar.
 *
 * @param props - Conteúdo das telas do jogo.
 */
export function ProvedorSistema({ children }: { children: ReactNode }) {
  const [reservas, setReservas] = useState(0);
  const [janela, setJanela] = useState<JanelaConclusao | null>(null);

  const reservar = useCallback(() => setReservas((atual) => atual + 1), []);
  const mostrarConclusao = useCallback((proxima: JanelaConclusao | null) => {
    setReservas((atual) => Math.max(0, atual - 1));
    if (proxima) setJanela(proxima);
  }, []);
  const fechar = useCallback(() => {
    const idRetorno = janela?.idRetorno;
    setJanela(null);
    if (idRetorno) document.getElementById(idRetorno)?.focus();
  }, [janela]);

  const valor = useMemo(
    () => ({ reservar, mostrarConclusao, ocupado: reservas > 0 || janela !== null }),
    [reservar, mostrarConclusao, reservas, janela],
  );

  return (
    <Contexto value={valor}>
      {children}
      <JanelaSistema janela={janela} aoFechar={fechar} />
    </Contexto>
  );
}

/**
 * Acesso à fila do Sistema.
 *
 * @throws {Error} Fora do `ProvedorSistema` (erro de montagem, não de uso).
 */
export function useSistema(): ContextoSistema {
  const contexto = use(Contexto);
  if (!contexto) throw new Error('useSistema precisa do ProvedorSistema no layout do jogo.');
  return contexto;
}
