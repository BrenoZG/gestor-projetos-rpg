'use client';

import { useEffect, useRef } from 'react';

import { CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import type { ChaveClasse } from '@/dominio/personagem/classes';

import { FormularioClasse } from './formulario-classe';

/**
 * Painel "Trocar classe" da Ficha. É um `<details>` nativo: abre com Enter ou
 * Espaço e funciona sem JavaScript.
 *
 * @param props - `classeAtual` marca a Classe atual no formulário.
 */
export function TrocaDeClasse({ classeAtual }: { classeAtual: ChaveClasse | null }) {
  const painel = useRef<HTMLDetailsElement>(null);

  // Esc fecha o painel e devolve o foco ao botão que o abriu. O preventDefault
  // avisa o atalho da Ficha que o Esc já foi usado (não volta de tela).
  useEffect(() => {
    const elemento = painel.current;
    if (!elemento) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && elemento.open) {
        evento.preventDefault();
        elemento.open = false;
        elemento.querySelector('summary')?.focus();
      }
    };
    elemento.addEventListener('keydown', aoTeclar);
    return () => elemento.removeEventListener('keydown', aoTeclar);
  }, []);

  return (
    <details ref={painel} className="group flex flex-col gap-4">
      <summary className={`${CLASSES_ACAO_SECUNDARIA} w-fit list-none [&::-webkit-details-marker]:hidden`}>
        <span className="group-open:hidden">Trocar classe</span>
        <span className="hidden group-open:inline">Fechar a troca de classe</span>
      </summary>
      <p className="pt-4 text-sm text-texto-suave">
        A troca é livre e sem custo: XP, nível, Rank e medalhas continuam iguais.
      </p>
      <div className="pt-4">
        <FormularioClasse modo="trocar" classeAtual={classeAtual} />
      </div>
    </details>
  );
}
