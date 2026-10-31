'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { ROTA_INICIAL, ROTA_PERSONAGEM } from '@/dominio/acesso/rotas';
import { acaoDoAtalho, atalhoLigado, ehCampoDeTexto } from '@/lib/atalho-ficha';

function alvoEhCampo(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  return ehCampoDeTexto({
    tagName: alvo.tagName,
    type: alvo instanceof HTMLInputElement ? alvo.type : undefined,
    isContentEditable: alvo.isContentEditable,
  });
}

/**
 * Atalho de teclado da Ficha (RF-19, RN-12): `C` abre de qualquer tela do jogo
 * e `Esc` volta para a tela anterior (ou para o Quadro, se a Ficha foi aberta
 * direto pelo endereço). Fica no layout do jogo, que não desmonta na
 * navegação, e por isso lembra a rota anterior. Não desenha nada.
 */
export function AtalhoFicha() {
  const router = useRouter();
  const caminho = usePathname();
  const atual = useRef(caminho);
  const anterior = useRef<string | null>(null);

  useEffect(() => {
    if (atual.current === caminho) return;
    anterior.current = atual.current;
    atual.current = caminho;
  }, [caminho]);

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent): void {
      const acao = acaoDoAtalho({
        tecla: {
          key: evento.key,
          ctrlKey: evento.ctrlKey,
          altKey: evento.altKey,
          metaKey: evento.metaKey,
          repeat: evento.repeat,
          defaultPrevented: evento.defaultPrevented,
          emCampoDeTexto: alvoEhCampo(evento.target),
          janelaAberta: document.querySelector('dialog[open]') !== null,
        },
        caminho: atual.current,
        anterior: anterior.current,
        // Lido a cada tecla: a caixa da Ficha muda o cookie e vale na hora.
        ligado: atalhoLigado(document.cookie),
      });
      if (acao === null) return;
      evento.preventDefault();
      if (acao === 'abrir') router.push(ROTA_PERSONAGEM);
      else if (acao === 'voltar') router.back();
      else router.push(ROTA_INICIAL);
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [router]);

  return null;
}
