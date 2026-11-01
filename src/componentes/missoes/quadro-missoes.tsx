'use client';

import { Accessibility, StyleInjector } from '@dnd-kit/dom';
import { DragDropProvider, PointerSensor, type DragEndEvent } from '@dnd-kit/react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
} from 'react';

import { moverMissao } from '@/acoes/missoes';
import type { ResultadoMovimento } from '@/acoes/missoes-estado';
import { AvisoErro } from '@/componentes/aviso-erro';
import { useSistema } from '@/componentes/sistema/provedor-sistema';
import type { Missao } from '@/dados/missoes';
import { ehStatusMissao, type StatusMissao } from '@/dominio/missoes/campos';
import {
  dicaSemResultado,
  escreverParametros,
  filtrarMissoes,
  haFiltroAtivo,
  lerParametros,
  type FiltrosMissao,
  type Vista,
} from '@/dominio/missoes/filtros';

import { idBotaoMover } from './cartao-missao';
import { ColunaMissoes } from './coluna-quadro';
import { COLUNAS, TITULOS_COLUNA } from './colunas';
import { FiltrosQuadro } from './filtros-quadro';
import { ListaMissoes } from './lista-missoes';

/**
 * Só o ponteiro (mouse, dedo, caneta). O sensor de teclado da biblioteca fica
 * de fora: o cartão é um link, e quem usa teclado move pelo botão Mover.
 */
const SENSORES = [PointerSensor];

/** Quando a requisição nem chega ao servidor (rede caiu), a ação não responde. */
const FALHA_DE_REDE: ResultadoMovimento = {
  ok: false,
  mensagem: 'Não foi possível mover agora. Confira a conexão e tente de novo.',
};

type Movimento = { id: string; status: StatusMissao };

type PluginsDoQuadro = NonNullable<ComponentProps<typeof DragDropProvider>['plugins']>;

/**
 * Nomes sem repetição, em ordem alfabética do português (sem diferenciar maiúsculas).
 *
 * @param nomes - Nomes, com possíveis repetições.
 * @returns A lista ordenada para um select de filtro.
 */
function nomesOrdenados(nomes: readonly string[]): string[] {
  return [...new Set(nomes)].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

/**
 * Quadro de Missões interativo: filtros e vista na URL, arrasto entre colunas
 * (RF-20) com atualização otimista (o cartão muda na hora e volta se o
 * servidor recusar) e a visão Lista (RF-22).
 *
 * @param props - Missões do usuário (ordem da última edição) e o nonce da CSP
 *   da requisição, usado pelos estilos que a biblioteca de arrasto injeta.
 */
export function QuadroMissoes({ missoes, nonce }: { missoes: Missao[]; nonce: string | undefined }) {
  const caminho = usePathname();
  const parametrosDaUrl = useSearchParams();
  const [{ filtros, vista }, setParametros] = useState(() =>
    lerParametros(new URLSearchParams(parametrosDaUrl.toString())),
  );
  const [missoesOtimistas, aplicarMovimento] = useOptimistic(missoes, (atuais, { id, status }: Movimento) =>
    atuais.map((missao) => (missao.id === id ? { ...missao, status } : missao)),
  );
  const [pendente, iniciarTransicao] = useTransition();
  const [anuncio, setAnuncio] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const sistema = useSistema();
  /** Missão movida pelo botão: o foco volta ao botão dela, na coluna nova (ou na antiga, se falhar). */
  const focoPendente = useRef<string | null>(null);

  const plugins = useMemo<PluginsDoQuadro>(
    () => (padroes) => [
      // Os avisos da biblioteca são em inglês e citam o teclado, que aqui não arrasta.
      ...padroes.filter((plugin) => plugin !== Accessibility),
      StyleInjector.configure({ nonce }),
    ],
    [nonce],
  );

  useEffect(() => {
    if (focoPendente.current === null) return;
    document.getElementById(idBotaoMover(focoPendente.current))?.focus();
    if (!pendente) focoPendente.current = null;
  }, [missoesOtimistas, pendente]);

  function mudarParametros(proximosFiltros: FiltrosMissao, proximaVista: Vista): void {
    setParametros({ filtros: proximosFiltros, vista: proximaVista });
    // History API nativa: o Next sincroniza a URL sem buscar a página de novo no servidor.
    const consulta = escreverParametros(proximosFiltros, proximaVista);
    window.history.replaceState(null, '', consulta ? `${caminho}?${consulta}` : caminho);
  }

  function mover(id: string, status: StatusMissao, peloBotao: boolean): void {
    const missao = missoesOtimistas.find((item) => item.id === id);
    if (!missao || missao.status === status) return;
    if (peloBotao) focoPendente.current = id;
    setErro(null);
    // Fora da transição: a reserva vale antes de a resposta trazer a cinemática.
    sistema.reservar();
    iniciarTransicao(async () => {
      aplicarMovimento({ id, status });
      let resultado: ResultadoMovimento;
      try {
        resultado = await moverMissao(id, status);
      } catch {
        resultado = FALHA_DE_REDE;
      }
      const recompensa = resultado.ok ? resultado.recompensa : undefined;
      sistema.mostrarConclusao(
        recompensa
          ? { nome: missao.nome, recompensa, idRetorno: peloBotao ? idBotaoMover(id) : undefined }
          : null,
      );
      // O resultado da conclusão é lido na Janela do Sistema; o anúncio diz só o movimento.
      if (resultado.ok) setAnuncio(`${missao.nome} movido para ${TITULOS_COLUNA[status]}.`);
      else setErro(resultado.mensagem);
    });
  }

  function aoSoltar({ canceled, operation }: DragEndEvent): void {
    if (canceled || !operation.source || !operation.target) return;
    const status = String(operation.target.id);
    if (ehStatusMissao(status)) mover(String(operation.source.id), status, false);
  }

  const filtradas = filtrarMissoes(missoesOtimistas, filtros);
  const filtroAtivo = haFiltroAtivo(filtros);
  const stacks = useMemo(() => nomesOrdenados(missoes.flatMap((missao) => missao.stacks)), [missoes]);
  const tags = useMemo(() => nomesOrdenados(missoes.flatMap((missao) => missao.tags)), [missoes]);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <FiltrosQuadro
        filtros={filtros}
        vista={vista}
        stacks={stacks}
        tags={tags}
        exibidas={filtradas.length}
        total={missoesOtimistas.length}
        aoMudarFiltros={(proximos) => mudarParametros(proximos, vista)}
        aoMudarVista={(proxima) => mudarParametros(filtros, proxima)}
      />

      <p role="status" className="sr-only">
        {anuncio}
      </p>
      {erro && <AvisoErro titulo="O projeto não foi movido.">{erro}</AvisoErro>}

      {filtroAtivo && filtradas.length === 0 && (
        <p className="rounded-md border border-dashed border-borda-campo px-6 py-6 text-center text-texto">
          {dicaSemResultado(filtros) ?? 'Nenhum projeto com esses filtros.'}
        </p>
      )}

      {vista === 'lista' ? (
        <ListaMissoes missoes={filtradas} total={missoesOtimistas.length} />
      ) : (
        <DragDropProvider sensors={SENSORES} plugins={plugins} onDragEnd={aoSoltar}>
          <div className="grid flex-1 gap-5 lg:grid-cols-3">
            {COLUNAS.map((coluna, indice) => (
              <ColunaMissoes
                key={coluna.id}
                coluna={coluna}
                missoes={filtradas.filter((missao) => missao.status === coluna.id)}
                filtrada={filtroAtivo}
                indice={indice}
                aoMover={(id, status) => mover(id, status, true)}
              />
            ))}
          </div>
        </DragDropProvider>
      )}
    </div>
  );
}
