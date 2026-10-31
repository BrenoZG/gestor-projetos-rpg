import { textoDaRecompensa, type ItemConcluido, type Recompensa } from '@/dominio/gamificacao/recompensa';

/**
 * Aviso visível do resultado de uma conclusão: XP ganho, trava de 24 h ou XP
 * já recebido (RN-06). Não é região viva: o mesmo texto vai para o
 * `role="status"` de quem o usa, que já existe na página e é anunciado uma vez.
 *
 * A cor fica na borda e no ícone (contraste de componente, 3:1); o texto usa
 * `texto`. O resultado não depende só da cor: ícone e título dizem o que houve.
 *
 * @param props - Recompensa e o tipo de item concluído.
 */
export function AvisoRecompensa({ recompensa, item }: { recompensa: Recompensa; item: ItemConcluido }) {
  const { titulo, detalhe } = textoDaRecompensa(recompensa, item);
  const ganhou = recompensa.tipo === 'xp';

  return (
    <div
      className={`flex gap-3 rounded-md border bg-superficie px-4 py-3 text-sm text-texto ${
        ganhou ? 'border-positivo' : 'border-atencao'
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        className={`mt-px shrink-0 ${ganhou ? 'text-positivo' : 'text-atencao'}`}
      >
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {ganhou ? (
          <path
            d="M6 10.5l2.75 2.75L14 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M10 5.5V10l3 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        )}
      </svg>
      <p>
        <strong className="font-bold">{titulo} </strong>
        {detalhe}
      </p>
    </div>
  );
}

/**
 * Mesmo texto do aviso, em uma linha, para o anúncio do leitor de tela.
 *
 * @param recompensa - Resultado da conclusão.
 * @param item - O que foi concluído.
 */
export function anuncioDaRecompensa(recompensa: Recompensa, item: ItemConcluido): string {
  const { titulo, detalhe } = textoDaRecompensa(recompensa, item);
  return `${titulo} ${detalhe}`;
}
