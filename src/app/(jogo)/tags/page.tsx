import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { AvisoErro } from '@/componentes/aviso-erro';
import { CarregandoMissao } from '@/componentes/missoes/carregando-missao';
import { JanelaMissao } from '@/componentes/missoes/janela-missao';
import { ListaTags } from '@/componentes/tags/lista-tags';
import { ErroDeMissao } from '@/dados/missoes';
import { listarTagsComUso, type TagComUso } from '@/dados/tags';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

export const metadata: Metadata = { title: 'Tags' };

async function consultar(): Promise<TagComUso[] | null> {
  await connection();
  const supabase = await criarClienteServidor();
  try {
    return await listarTagsComUso(supabase);
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    return null;
  }
}

async function ConteudoTags() {
  const tags = await consultar();
  if (!tags) {
    return (
      <AvisoErro titulo="Tags indisponíveis.">
        Não foi possível carregar as tags. Recarregue a página em instantes.
      </AvisoErro>
    );
  }
  return <ListaTags tags={tags} />;
}

/**
 * Página Tags (RF-27): as tags do usuário com a quantidade de projetos de cada
 * uma, renomear (RF-28, RN-19) e excluir as sem uso (RF-29). As tags nascem no
 * cadastro e na edição dos projetos.
 *
 * @returns A página.
 */
export default function PaginaTags() {
  return (
    <JanelaMissao rotulo="[ SISTEMA ] · TAGS" titulo="Tags" voltarPara="/" textoVoltar="Quadro de Missões">
      <Suspense fallback={<CarregandoMissao />}>
        <ConteudoTags />
      </Suspense>
    </JanelaMissao>
  );
}
