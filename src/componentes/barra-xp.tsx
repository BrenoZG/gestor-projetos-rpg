import type { ProgressoNivel } from '@/dominio/progressao/progressao';

/**
 * Barra de XP do nível atual. O preenchimento "enche" ao carregar (camada de
 * recompensa) e um brilho percorre o trilho (camada de ambiente).
 *
 * Desenhada em SVG porque a largura vem de um dado: atributo SVG é permitido
 * pela CSP; `style="width: …"` seria bloqueado. A variante `secundaria` (trilha
 * Produtividade) é mais fina e de cor sólida: sem gradiente, não repete o `id`
 * do SVG quando as duas barras estão na mesma página.
 *
 * @param props - Progresso do nível (`progressoDoNivel`), nome acessível e variante.
 */
export function BarraXp({
  progresso,
  rotulo = 'Progresso de XP no nível atual',
  variante = 'principal',
  className = '',
}: {
  progresso: ProgressoNivel;
  rotulo?: string;
  variante?: 'principal' | 'secundaria';
  className?: string;
}) {
  const { nivel, xpNoNivel, xpParaProximo, fracao } = progresso;
  const percentual = Math.round(fracao * 1000) / 10;
  const descricao =
    xpParaProximo === null
      ? `Nível máximo alcançado`
      : `${xpNoNivel} de ${xpParaProximo} XP rumo ao nível ${nivel + 1}`;

  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={xpParaProximo ?? 1}
      aria-valuenow={xpParaProximo === null ? 1 : xpNoNivel}
      aria-valuetext={descricao}
      className={`trilho-xp relative overflow-hidden rounded-full border border-borda-forte bg-fundo ${
        variante === 'principal' ? 'h-2.5' : 'h-1.5'
      } ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {variante === 'principal' ? (
          <>
            <defs>
              <linearGradient id="preenchimento-xp" x1="0" x2="1">
                <stop offset="0" className="parada-acento-forte" />
                <stop offset="1" className="parada-acento" />
              </linearGradient>
            </defs>
            <rect width={percentual} height="10" fill="url(#preenchimento-xp)" className="preenchimento-xp" />
          </>
        ) : (
          <rect
            width={percentual}
            height="10"
            fill="currentColor"
            className="preenchimento-xp text-texto-suave"
          />
        )}
      </svg>
    </div>
  );
}
