'use client';

import { useEffect, useRef, useState } from 'react';

import { AvisoErro } from '@/componentes/aviso-erro';
import type { TagComUso } from '@/dados/tags';

import { ItemTag } from './item-tag';

/**
 * Lista da página Tags (RF-27). O aviso de sucesso fica aqui, e não na linha:
 * a linha de uma tag juntada ou excluída desmonta, e o foco iria para o nada.
 * Depois de cada ação, o foco vai para o aviso, que o leitor de tela anuncia.
 *
 * @param props - Tags do usuário em ordem alfabética, com a quantidade de projetos.
 */
export function ListaTags({ tags }: { tags: TagComUso[] }) {
  const [aviso, setAviso] = useState({ texto: '', vez: 0 });
  const [erro, setErro] = useState<string | null>(null);
  const regiaoAviso = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (aviso.vez > 0) regiaoAviso.current?.focus();
  }, [aviso]);

  function concluir(mensagem: string): void {
    setErro(null);
    setAviso((anterior) => ({ texto: mensagem, vez: anterior.vez + 1 }));
  }

  return (
    <div className="flex flex-col gap-4">
      <p
        ref={regiaoAviso}
        role="status"
        tabIndex={-1}
        className="text-sm text-texto empty:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento"
      >
        {aviso.texto}
      </p>
      {erro && <AvisoErro titulo="A tag não foi excluída.">{erro}</AvisoErro>}
      {tags.length > 0 ? (
        <ul aria-label="Suas tags" className="flex flex-col gap-3">
          {tags.map((tag) => (
            <ItemTag key={tag.id} tag={tag} aoConcluir={concluir} aoFalhar={setErro} />
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-borda-campo px-6 py-8 text-center text-texto">
          Nenhuma tag cadastrada ainda. Elas são criadas no cadastro ou na edição de um projeto.
        </p>
      )}
    </div>
  );
}
