'use client';

import { ROTULOS_TIPO, TIPOS_PROJETO, type TipoProjeto } from '@/dominio/missoes/campos';

import { CLASSES_AJUDA, CLASSES_ROTULO } from './estilos';
import { MensagemErroCampo } from './mensagem-erro-campo';

/** O critério do tipo (RN-15), dito na própria opção para a escolha não depender de memória. */
const EXPLICACOES: Readonly<Record<TipoProjeto, string>> = {
  dev: 'O resultado é código que você mantém: stacks, arquitetura e Rank.',
  geral: 'Ideias e projetos fora da programação: venda, conteúdo, serviço.',
};

/**
 * Escolha do tipo da Missão (RF-23), o primeiro campo do formulário: ela mostra
 * ou esconde a parte técnica.
 *
 * @param props - Prefixo dos ids, tipo atual, ação de mudar e erro do servidor.
 */
export function CampoTipo({
  id,
  tipo,
  aoMudar,
  erro,
}: {
  id: (campo: string) => string;
  tipo: TipoProjeto;
  aoMudar: (tipo: TipoProjeto) => void;
  erro?: string;
}) {
  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-invalid={erro ? true : undefined}
      aria-describedby={erro ? id('tipo-erro') : undefined}
    >
      <legend className={`${CLASSES_ROTULO} mb-2`}>Tipo da missão</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {TIPOS_PROJETO.map((opcao) => (
          <label
            key={opcao}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-borda-campo px-3 py-3 text-sm transition-colors duration-200 hover:border-texto-suave has-checked:border-acento has-checked:bg-acento-suave/40"
          >
            <input
              id={id(`tipo-${opcao}`)}
              type="radio"
              name="tipo"
              value={opcao}
              checked={tipo === opcao}
              onChange={() => aoMudar(opcao)}
              aria-describedby={id(`tipo-${opcao}-explicacao`)}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-acento"
            />
            <span className="flex flex-col gap-1">
              <span className="font-medium text-texto">{ROTULOS_TIPO[opcao]}</span>
              <span id={id(`tipo-${opcao}-explicacao`)} className={CLASSES_AJUDA}>
                {EXPLICACOES[opcao]}
              </span>
            </span>
          </label>
        ))}
      </div>
      {erro && <MensagemErroCampo id={id('tipo-erro')} mensagem={erro} />}
    </fieldset>
  );
}
