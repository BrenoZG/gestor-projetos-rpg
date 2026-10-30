'use client';

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from 'react';

import type { ResultadoMovimento } from '@/acoes/missoes-estado';
import { excluirTag, renomearTag } from '@/acoes/tags';
import { quantidadeDeProjetos, type ResultadoRenomeacaoTag } from '@/acoes/tags-estado';
import { ConfirmarExclusao } from '@/componentes/missoes/confirmar-exclusao';
import { CLASSES_CAMPO, CLASSES_ROTULO } from '@/componentes/missoes/estilos';
import { MensagemErroCampo } from '@/componentes/missoes/mensagem-erro-campo';
import { CLASSES_ACAO_PRINCIPAL, CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import type { TagComUso } from '@/dados/tags';

const FALHA_DE_REDE = 'Não foi possível salvar agora. Verifique a conexão e tente de novo.';

const CLASSES_BOTAO_LINHA =
  'inline-flex min-h-11 cursor-pointer items-center rounded-md px-3 text-sm text-texto-suave underline-offset-4 hover:text-texto hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento';

/** Aviso da junção (RN-19), com a quantidade que o banco acabou de contar. */
function textoDaJuncao(origem: string, destino: string, missoes: number): string {
  const movidos =
    missoes === 1
      ? `O ${quantidadeDeProjetos(missoes)} de “${origem}” passa`
      : `Os ${quantidadeDeProjetos(missoes)} de “${origem}” passam`;
  return `“${destino}” já existe. ${movidos} para “${destino}”, e “${origem}” deixa de existir. Isso não pode ser desfeito.`;
}

type Modo =
  | { tipo: 'leitura' }
  | { tipo: 'edicao'; erro: string | null }
  | { tipo: 'conflito'; destino: string; missoes: number };

/**
 * Uma tag na página Tags: nome e quantidade de projetos, renomear no próprio
 * lugar (RF-28) e excluir quando nenhum projeto a usa (RF-29). Renomear para
 * um nome existente pede confirmação antes de juntar (RN-19).
 *
 * @param props - A tag, o que fazer quando uma ação termina (a lista anuncia a
 *   mensagem, porque a linha juntada ou excluída desmonta) e quando a exclusão falha.
 */
export function ItemTag({
  tag,
  aoConcluir,
  aoFalhar,
}: {
  tag: TagComUso;
  aoConcluir: (mensagem: string) => void;
  aoFalhar: (mensagem: string) => void;
}) {
  const base = useId();
  const [modo, setModo] = useState<Modo>({ tipo: 'leitura' });
  const [nome, setNome] = useState(tag.nome);
  const [pendente, iniciarTransicao] = useTransition();
  const botaoRenomear = useRef<HTMLButtonElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const cancelarJuncao = useRef<HTMLButtonElement>(null);
  const voltarFocoAoBotao = useRef(false);
  const selecionarAoAbrir = useRef(false);

  // O foco acompanha o modo: campo na edição (e no erro), "Cancelar" no
  // conflito (a opção segura) e o botão "Renomear" ao cancelar.
  useEffect(() => {
    if (modo.tipo === 'edicao') {
      campo.current?.focus();
      if (selecionarAoAbrir.current) campo.current?.select();
      selecionarAoAbrir.current = false;
    } else if (modo.tipo === 'conflito') {
      cancelarJuncao.current?.focus();
    } else if (voltarFocoAoBotao.current) {
      botaoRenomear.current?.focus();
      voltarFocoAoBotao.current = false;
    }
  }, [modo]);

  function abrirEdicao(): void {
    setNome(tag.nome);
    selecionarAoAbrir.current = true;
    setModo({ tipo: 'edicao', erro: null });
  }

  function cancelarEdicao(): void {
    voltarFocoAoBotao.current = true;
    setModo({ tipo: 'leitura' });
  }

  function aoTeclar(evento: KeyboardEvent<HTMLElement>): void {
    if (evento.key !== 'Escape') return;
    evento.preventDefault();
    if (modo.tipo === 'conflito') setModo({ tipo: 'edicao', erro: null });
    else cancelarEdicao();
  }

  function enviar(juntar: boolean): void {
    iniciarTransicao(async () => {
      let resultado: ResultadoRenomeacaoTag;
      try {
        resultado = await renomearTag(tag.id, nome, juntar);
      } catch {
        resultado = { tipo: 'erro', mensagem: FALHA_DE_REDE };
      }
      if (resultado.tipo === 'concluida') {
        setModo({ tipo: 'leitura' });
        aoConcluir(resultado.mensagem);
      } else if (resultado.tipo === 'conflito') {
        setModo({ tipo: 'conflito', destino: resultado.destino, missoes: resultado.missoes });
      } else {
        setModo({ tipo: 'edicao', erro: resultado.mensagem });
      }
    });
  }

  async function excluir(): Promise<void> {
    let resultado: ResultadoMovimento;
    try {
      resultado = await excluirTag(tag.id);
    } catch {
      resultado = { ok: false, mensagem: FALHA_DE_REDE };
    }
    if (resultado.ok) aoConcluir(`Tag “${tag.nome}” excluída.`);
    else aoFalhar(resultado.mensagem);
  }

  if (modo.tipo === 'leitura') {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-borda-forte bg-superficie/80 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-display font-bold break-words">{tag.nome}</span>
          <span className="font-mono text-xs text-texto-suave">{quantidadeDeProjetos(tag.missoes)}</span>
        </div>
        <div className="flex gap-1">
          <button
            ref={botaoRenomear}
            type="button"
            aria-label={`Renomear ${tag.nome}`}
            onClick={abrirEdicao}
            className={CLASSES_BOTAO_LINHA}
          >
            Renomear
          </button>
          {tag.missoes === 0 && (
            <ConfirmarExclusao
              compacto
              rotuloGatilho={`Excluir ${tag.nome}`}
              pergunta={`Excluir a tag “${tag.nome}”?`}
              detalhe="Nenhum projeto usa esta tag. Ela sai das sugestões do campo Tags. Esta ação não pode ser desfeita."
              rotuloConfirmar="Excluir tag"
              acao={excluir}
            />
          )}
        </div>
      </li>
    );
  }

  const idCampo = `${base}-nome`;
  const idErro = `${base}-erro`;
  const erro = modo.tipo === 'edicao' ? modo.erro : null;

  return (
    <li
      className="flex flex-col gap-3 rounded-md border border-borda-forte bg-superficie/80 p-4"
      onKeyDown={aoTeclar}
    >
      <form
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          if (modo.tipo === 'edicao') enviar(false);
        }}
        className="flex flex-col gap-3"
      >
        <label htmlFor={idCampo} className={CLASSES_ROTULO}>
          Novo nome de {tag.nome}
        </label>
        <input
          ref={campo}
          id={idCampo}
          name="nome"
          type="text"
          autoComplete="off"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          readOnly={modo.tipo === 'conflito'}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          className={CLASSES_CAMPO}
        />
        {erro && <MensagemErroCampo id={idErro} mensagem={erro} />}

        {modo.tipo === 'edicao' ? (
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={pendente} className={CLASSES_ACAO_PRINCIPAL}>
              {pendente ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" onClick={cancelarEdicao} className={CLASSES_ACAO_SECUNDARIA}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-md border border-negativo p-4">
            <p className="text-sm text-texto">{textoDaJuncao(tag.nome, modo.destino, modo.missoes)}</p>
            <div className="flex flex-wrap gap-3">
              <button
                ref={cancelarJuncao}
                type="button"
                onClick={() => setModo({ tipo: 'edicao', erro: null })}
                className={CLASSES_ACAO_SECUNDARIA}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pendente}
                onClick={() => enviar(true)}
                className={CLASSES_ACAO_PRINCIPAL}
              >
                {pendente ? 'Juntando…' : `Juntar em “${modo.destino}”`}
              </button>
            </div>
          </div>
        )}
      </form>
    </li>
  );
}
