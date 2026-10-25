import { CLASSES_ERRO_CAMPO } from './estilos';

/**
 * Erro de um campo, logo abaixo dele e ligado por `aria-describedby`. O ícone
 * vermelho, além do texto, evita depender só da cor (WCAG 1.4.1).
 *
 * @param props - Id referenciado pelo campo e a mensagem (causa e correção).
 */
export function MensagemErroCampo({ id, mensagem }: { id: string; mensagem: string }) {
  return (
    <p id={id} className={CLASSES_ERRO_CAMPO}>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        width="18"
        height="18"
        className="mt-0.5 shrink-0 text-negativo"
      >
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 5.5v5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="10" cy="14.25" r="1.1" fill="currentColor" />
      </svg>
      <span>{mensagem}</span>
    </p>
  );
}
