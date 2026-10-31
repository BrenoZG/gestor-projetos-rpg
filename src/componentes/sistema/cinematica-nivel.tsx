'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import { marcarConquistaVista } from '@/acoes/personagem';
import { EmblemaRank } from '@/componentes/emblema-rank';
import { Medalha } from '@/componentes/medalha';
import { CLASSES_ACAO_PRINCIPAL, CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import { ROTA_PERSONAGEM } from '@/dominio/acesso/rotas';
import type { Conquista } from '@/dominio/progressao/conquista';

import { useSistema } from './provedor-sistema';

/** Uma frase só, para o leitor de tela: o estado final, sem o passo a passo da animação. */
function resumoDaConquista({ de, para, rankAntes, rankDepois, medalha }: Conquista): string {
  const partes = [`Você subiu do nível ${de} para o ${para}.`];
  if (medalha)
    partes.push(`Medalha ${medalha.numeral} · ${medalha.nome} conquistada, título ${medalha.titulo}.`);
  if (rankAntes !== rankDepois) partes.push(`Rank ${rankAntes} para ${rankDepois}.`);
  return partes.join(' ');
}

/**
 * Cinemática de level up (RF-16, RN-08): do último nível exibido ao nível
 * conquistado, com a medalha mais alta e a troca de Rank, se houver. Toca uma
 * vez: ao fechar (Continuar, Esc ou "Ver na Ficha"), marca o nível como visto.
 *
 * Espera a fila do Sistema (a Janela da conclusão vem antes) e qualquer outro
 * diálogo aberto. ~4,5 s de animação, mas fecha a qualquer momento; com
 * movimento reduzido ou desligado, mostra direto o estado final (RNF-02). A
 * parte visual é `aria-hidden`: o leitor de tela recebe um resumo só.
 *
 * @param props - Conquista pendente (`conquistaPendente`).
 */
export function CinematicaNivel({ conquista }: { conquista: Conquista }) {
  const { ocupado } = useSistema();
  const [fechada, setFechada] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);
  const base = useId();
  const { de, para, rankAntes, rankDepois, medalha } = conquista;
  const trocouRank = rankAntes !== rankDepois;

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento || fechada || ocupado || elemento.open) return;
    // Outro diálogo modal (ex.: confirmação de exclusão) tem a vez.
    if (document.querySelector('dialog[open]')) return;
    elemento.showModal();
  }, [ocupado, fechada]);

  function aoFechar(): void {
    setFechada(true);
    void marcarConquistaVista(para);
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${base}-titulo`}
      aria-describedby={`${base}-resumo`}
      onClose={aoFechar}
      className="cinematica m-auto w-[min(34rem,calc(100vw-2rem))] rounded-md border border-acento p-0 text-texto shadow-2xl shadow-fundo backdrop:bg-black/80"
    >
      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center sm:px-10">
        <span className="cinematica-passo font-mono text-xs tracking-[0.2em] text-acento">
          [ SISTEMA ] · SEU NÍVEL SUBIU
        </span>
        <h2 id={`${base}-titulo`} className="sr-only">
          Nível {para} alcançado
        </h2>
        <p id={`${base}-resumo`} className="sr-only">
          {resumoDaConquista(conquista)}
        </p>

        <div aria-hidden="true" className="flex flex-col items-center gap-5">
          <p className="cinematica-destaque font-display text-5xl font-extrabold [animation-delay:500ms]">
            <span className="text-texto-suave">{de}</span>
            <span className="px-3 text-texto-suave">→</span>
            <span className="titulo-jogo text-acento">{para}</span>
          </p>

          {medalha && (
            <div className="cinematica-passo flex flex-col items-center gap-1.5 [animation-delay:1800ms]">
              <Medalha
                tier={medalha.tier}
                material={medalha.material}
                bloqueada={false}
                rotulo={`Medalha ${medalha.nome}, nível ${medalha.nivel}`}
                className="h-28 w-28"
              />
              <span className="font-display font-bold">
                Medalha {medalha.numeral} · {medalha.nome}
              </span>
              <span className="text-sm text-texto-suave">Novo título: {medalha.titulo}</span>
            </div>
          )}

          {trocouRank && (
            <div className="cinematica-passo flex items-center gap-3 [animation-delay:3200ms]">
              <EmblemaRank rank={rankDepois} className="h-14 w-12" />
              <span className="font-display text-lg font-bold">
                Rank {rankAntes} → {rankDepois}
              </span>
            </div>
          )}
        </div>

        <form method="dialog" className="flex flex-wrap justify-center gap-3 pt-2">
          <button type="submit" autoFocus className={CLASSES_ACAO_PRINCIPAL}>
            Continuar
          </button>
          <Link
            href={ROTA_PERSONAGEM}
            onClick={() => dialogo.current?.close()}
            className={CLASSES_ACAO_SECUNDARIA}
          >
            Ver na Ficha
          </Link>
        </form>
      </div>
    </dialog>
  );
}
