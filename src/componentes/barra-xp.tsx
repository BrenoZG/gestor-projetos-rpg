import type { ProgressoNivel } from '@/dominio/progressao/progressao';

/**
 * Barra de XP do nível atual. O preenchimento "enche" ao carregar (camada de
 * recompensa) e um brilho percorre o trilho (camada de ambiente).
 *
 * Desenhada em SVG porque a largura vem de um dado: atributo SVG é permitido
 * pela CSP; `style="width: …"` seria bloqueado.
 *
 * @param props - Progresso do nível (`progressoDoNivel`).
 */
export function BarraXp({ progresso, className = '' }: { progresso: ProgressoNivel; className?: string }) {
  const { nivel, xpNoNivel, xpParaProximo, fracao } = progresso;
  const percentual = Math.round(fracao * 1000) / 10;
  const descricao =
    xpParaProximo === null
      ? `Nível máximo alcançado`
      : `${xpNoNivel} de ${xpParaProximo} XP rumo ao nível ${nivel + 1}`;

  return (
    <div
      role="progressbar"
      aria-label="Progresso de XP no nível atual"
      aria-valuemin={0}
      aria-valuemax={xpParaProximo ?? 1}
      aria-valuenow={xpParaProximo === null ? 1 : xpNoNivel}
      aria-valuetext={descricao}
      className={`trilho-xp relative h-2.5 overflow-hidden rounded-full border border-borda-forte bg-fundo ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="preenchimento-xp" x1="0" x2="1">
            <stop offset="0" className="parada-acento-forte" />
            <stop offset="1" className="parada-acento" />
          </linearGradient>
        </defs>
        <rect width={percentual} height="10" fill="url(#preenchimento-xp)" className="preenchimento-xp" />
      </svg>
    </div>
  );
}
