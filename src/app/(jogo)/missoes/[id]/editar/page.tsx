import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { editarMissao } from '@/acoes/missoes';
import { CarregandoMissao } from '@/componentes/missoes/carregando-missao';
import { FormularioMissao } from '@/componentes/missoes/formulario-missao';
import { JanelaMissao } from '@/componentes/missoes/janela-missao';
import { ErroDeMissao, listarNomesDeStacks } from '@/dados/missoes';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

import { carregarMissaoDaUrl } from '../carregar-missao';

export const metadata: Metadata = { title: 'Editar missão' };

async function sugestoesDeStacks(): Promise<string[]> {
  // Só na requisição real (ver docs/arquitetura.md §7): o supabase-js usa Date.now().
  await connection();
  try {
    return await listarNomesDeStacks(await criarClienteServidor());
  } catch (erro) {
    // Sem o autocompletar, a edição continua possível: registra e segue.
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    return [];
  }
}

async function FormularioEdicao({ params }: { params: Promise<{ id: string }> }) {
  const [missao, sugestoes] = await Promise.all([carregarMissaoDaUrl(params), sugestoesDeStacks()]);

  return (
    <FormularioMissao
      acao={editarMissao.bind(null, missao.id)}
      inicial={{
        nome: missao.nome,
        descricao: missao.descricao,
        arquitetura: missao.arquitetura ?? '',
        estilo: missao.estilo,
        capacidades: missao.capacidades,
        status: missao.status,
        stacks: missao.stacks,
      }}
      sugestoesStacks={sugestoes}
      rotuloEnviar="Salvar alterações"
      rotuloEnviando="Salvando…"
      hrefCancelar={`/missoes/${missao.id}`}
    />
  );
}

/**
 * Edição de Missão (RF-03), inclusive o status (RN-02).
 *
 * @param props - `params.id` da Missão.
 * @returns Página com o formulário preenchido.
 */
export default function PaginaEditarMissao({ params }: PageProps<'/missoes/[id]/editar'>) {
  return (
    <JanelaMissao
      rotulo="[ SISTEMA ] · EDITAR MISSÃO"
      titulo="Editar missão"
      voltarPara="/"
      textoVoltar="Quadro de Missões"
    >
      <Suspense fallback={<CarregandoMissao />}>
        <FormularioEdicao params={params} />
      </Suspense>
    </JanelaMissao>
  );
}
