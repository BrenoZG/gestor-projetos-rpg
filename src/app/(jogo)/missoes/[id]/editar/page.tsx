import type { Metadata } from 'next';
import { Suspense } from 'react';

import { editarMissao } from '@/acoes/missoes';
import { CarregandoMissao } from '@/componentes/missoes/carregando-missao';
import {
  FormularioMissao,
  VALORES_NOVA_MISSAO,
  type ValoresMissao,
} from '@/componentes/missoes/formulario-missao';
import { JanelaMissao } from '@/componentes/missoes/janela-missao';
import type { Missao } from '@/dados/missoes';

import { carregarSugestoes } from '../../carregar-sugestoes';
import { carregarMissaoDaUrl } from '../carregar-missao';

export const metadata: Metadata = { title: 'Editar projeto' };

/** Valores do formulário a partir da Missão gravada; numa Geral, a parte técnica começa vazia. */
function valoresDaMissao(missao: Missao): ValoresMissao {
  const tecnicos =
    missao.tipo === 'dev'
      ? { arquitetura: missao.arquitetura, estilo: missao.estilo, capacidades: missao.capacidades }
      : {
          arquitetura: VALORES_NOVA_MISSAO.arquitetura,
          estilo: VALORES_NOVA_MISSAO.estilo,
          capacidades: VALORES_NOVA_MISSAO.capacidades,
        };
  return {
    tipo: missao.tipo,
    nome: missao.nome,
    descricao: missao.descricao,
    ...tecnicos,
    status: missao.status,
    stacks: missao.stacks,
    tags: missao.tags,
    links: missao.links.map((link, indice) => ({
      chave: `gravado-${indice}`,
      url: link.url,
      titulo: link.titulo ?? '',
    })),
  };
}

async function FormularioEdicao({ params }: { params: Promise<{ id: string }> }) {
  const [missao, sugestoes] = await Promise.all([carregarMissaoDaUrl(params), carregarSugestoes()]);

  return (
    <FormularioMissao
      acao={editarMissao.bind(null, missao.id)}
      modo="editar"
      inicial={valoresDaMissao(missao)}
      sugestoesStacks={sugestoes.stacks}
      sugestoesTags={sugestoes.tags}
      rotuloEnviar="Salvar alterações"
      rotuloEnviando="Salvando…"
      hrefCancelar={`/missoes/${missao.id}`}
    />
  );
}

/**
 * Edição de Missão (RF-03), inclusive o tipo (RN-16). O status muda pela
 * ficha e pelo Quadro, não por aqui.
 *
 * @param props - `params.id` da Missão.
 * @returns Página com o formulário preenchido.
 */
export default function PaginaEditarMissao({ params }: PageProps<'/missoes/[id]/editar'>) {
  return (
    <JanelaMissao
      rotulo="[ SISTEMA ] · EDITAR PROJETO"
      titulo="Editar projeto"
      voltarPara="/"
      textoVoltar="Quadro de Projetos"
    >
      <Suspense fallback={<CarregandoMissao />}>
        <FormularioEdicao params={params} />
      </Suspense>
    </JanelaMissao>
  );
}
