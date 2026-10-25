import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { criarMissao } from '@/acoes/missoes';
import { CarregandoMissao } from '@/componentes/missoes/carregando-missao';
import { FormularioMissao, VALORES_NOVA_MISSAO } from '@/componentes/missoes/formulario-missao';
import { JanelaMissao } from '@/componentes/missoes/janela-missao';
import { ErroDeMissao, listarNomesDeStacks } from '@/dados/missoes';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

export const metadata: Metadata = { title: 'Nova missão' };

async function FormularioNovaMissao() {
  await connection();
  const supabase = await criarClienteServidor();
  let sugestoes: string[] = [];
  try {
    sugestoes = await listarNomesDeStacks(supabase);
  } catch (erro) {
    // Sem o autocompletar, o cadastro continua possível: registra e segue.
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
  }
  return (
    <FormularioMissao
      acao={criarMissao}
      inicial={VALORES_NOVA_MISSAO}
      sugestoesStacks={sugestoes}
      rotuloEnviar="Registrar missão"
      rotuloEnviando="Registrando…"
      hrefCancelar="/"
    />
  );
}

/**
 * Cadastro de Missão (RF-01).
 *
 * @returns Página com o formulário de nova Missão.
 */
export default function PaginaNovaMissao() {
  return (
    <JanelaMissao
      rotulo="[ SISTEMA ] · NOVA MISSÃO"
      titulo="Registrar missão"
      voltarPara="/"
      textoVoltar="Quadro de Missões"
    >
      <Suspense fallback={<CarregandoMissao />}>
        <FormularioNovaMissao />
      </Suspense>
    </JanelaMissao>
  );
}
