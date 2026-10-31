import type { Metadata } from 'next';
import { Suspense } from 'react';

import { criarMissao } from '@/acoes/missoes';
import { CarregandoMissao } from '@/componentes/missoes/carregando-missao';
import { FormularioMissao, VALORES_NOVA_MISSAO } from '@/componentes/missoes/formulario-missao';
import { JanelaMissao } from '@/componentes/missoes/janela-missao';

import { carregarSugestoes } from '../carregar-sugestoes';

export const metadata: Metadata = { title: 'Novo projeto' };

async function FormularioNovaMissao() {
  const sugestoes = await carregarSugestoes();
  return (
    <FormularioMissao
      acao={criarMissao}
      modo="criar"
      inicial={VALORES_NOVA_MISSAO}
      sugestoesStacks={sugestoes.stacks}
      sugestoesTags={sugestoes.tags}
      rotuloEnviar="Registrar projeto"
      rotuloEnviando="Registrando…"
      hrefCancelar="/"
    />
  );
}

/**
 * Cadastro de Missão (RF-01, RF-23).
 *
 * @returns Página com o formulário de nova Missão.
 */
export default function PaginaNovaMissao() {
  return (
    <JanelaMissao
      rotulo="[ SISTEMA ] · NOVA MISSÃO"
      titulo="Registrar projeto"
      voltarPara="/"
      textoVoltar="Quadro de Projetos"
    >
      <Suspense fallback={<CarregandoMissao />}>
        <FormularioNovaMissao />
      </Suspense>
    </JanelaMissao>
  );
}
