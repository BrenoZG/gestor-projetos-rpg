'use client';

import { useActionState } from 'react';

import { escolherClasse, trocarClasse } from '@/acoes/personagem';
import { ESTADO_INICIAL_CLASSE } from '@/acoes/personagem-estado';
import { BrasaoClasse } from '@/componentes/brasao-classe';
import { CLASSES_ACAO_PRINCIPAL } from '@/componentes/tela-sistema';
import { CLASSES, type ChaveClasse } from '@/dominio/personagem/classes';

/**
 * Grade das 8 Classes com rádios nativos (setas navegam, Espaço marca) e um
 * botão de confirmação: um toque no cartão só marca, não grava (RF-17, RF-18).
 * Funciona sem JavaScript; a marca "Selecionada" vem do CSS (`:has(:checked)`),
 * então a seleção não depende só da cor da borda.
 *
 * @param props - `modo` escolhe a ação (primeira escolha ou troca) e `classeAtual` marca a atual.
 */
export function FormularioClasse({
  modo,
  classeAtual = null,
}: {
  modo: 'escolher' | 'trocar';
  classeAtual?: ChaveClasse | null;
}) {
  const [estado, enviar, enviando] = useActionState(
    modo === 'escolher' ? escolherClasse : trocarClasse,
    ESTADO_INICIAL_CLASSE,
  );

  return (
    <form action={enviar} className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <legend className="sr-only">Classes</legend>
        {CLASSES.map(({ chave, nome, area }, indice) => (
          <label
            key={chave}
            className="group flex min-h-11 cursor-pointer flex-col items-center gap-2 rounded-md border border-borda-forte bg-superficie px-3 py-4 text-center transition-colors duration-200 hover:border-texto-suave has-checked:border-acento has-checked:bg-acento-suave has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-acento"
          >
            <input
              type="radio"
              name="classe"
              value={chave}
              defaultChecked={chave === classeAtual}
              required={indice === 0}
              className="sr-only"
            />
            <BrasaoClasse classe={chave} className="h-14 w-12" />
            <span className="font-display text-sm font-bold">{nome}</span>
            <span className="text-xs leading-snug text-texto-suave">{area}</span>
            <span className="hidden font-mono text-[0.6875rem] tracking-[0.14em] text-acento group-has-checked:inline">
              ✓ SELECIONADA
            </span>
          </label>
        ))}
      </fieldset>

      {estado.mensagem && (
        <p role="alert" className="rounded-md border border-negativo bg-superficie px-4 py-3 text-sm">
          {estado.mensagem}
        </p>
      )}
      {modo === 'trocar' && (
        <p role="status" className="text-sm text-texto-suave">
          {estado.salvo > 0 && !estado.mensagem ? 'Classe trocada. XP, nível e Rank continuam iguais.' : ''}
        </p>
      )}

      <div className="flex justify-center">
        <button type="submit" disabled={enviando} className={CLASSES_ACAO_PRINCIPAL}>
          {enviando ? 'Salvando…' : modo === 'escolher' ? 'Confirmar classe' : 'Salvar nova classe'}
        </button>
      </div>
    </form>
  );
}
