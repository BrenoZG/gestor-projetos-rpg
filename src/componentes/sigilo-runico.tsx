/** Centro e tamanho do viewBox: os anéis giram em torno de (CENTRO, CENTRO). */
const TAMANHO = 240;
const CENTRO = TAMANHO / 2;

const MARCAS_EXTERNAS = Array.from({ length: 12 }, (_, i) => i * 30);
const TRACOS_EXTERNOS = Array.from({ length: 36 }, (_, i) => i * 10);
const RUNAS_INTERNAS = Array.from({ length: 6 }, (_, i) => i * 60);

/** Pontos de um hexágono de raio `raio`, com uma ponta para cima. */
function hexagono(raio: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angulo = (Math.PI / 3) * i - Math.PI / 2;
    return `${(CENTRO + raio * Math.cos(angulo)).toFixed(1)},${(CENTRO + raio * Math.sin(angulo)).toFixed(1)}`;
  }).join(' ');
}

/**
 * Sigilo da tela de título: anel externo de marcas girando no sentido horário,
 * anel de runas no anti-horário e núcleo hexagonal com o glifo de código.
 * Decorativo (`aria-hidden`). O giro e o pulso vêm de classes do `globals.css`;
 * com `prefers-reduced-motion`, o sigilo fica parado.
 */
export function SigiloRunico({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
      fill="none"
      className={`brilho-sigilo text-acento ${className}`}
    >
      <circle cx={CENTRO} cy={CENTRO} r="58" fill="currentColor" className="pulso-nucleo" />

      <g className="anel-runico anel-horario">
        <circle cx={CENTRO} cy={CENTRO} r="108" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle
          cx={CENTRO}
          cy={CENTRO}
          r="100"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 7"
          opacity="0.6"
        />
        {TRACOS_EXTERNOS.map((angulo) => (
          <path
            key={angulo}
            d={`M${CENTRO} 18v${angulo % 30 === 0 ? 9 : 4}`}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
            transform={`rotate(${angulo} ${CENTRO} ${CENTRO})`}
          />
        ))}
        {MARCAS_EXTERNAS.map((angulo) => (
          <path
            key={angulo}
            d={`M${CENTRO} 5l4 4-4 4-4-4Z`}
            fill="currentColor"
            transform={`rotate(${angulo + 15} ${CENTRO} ${CENTRO})`}
          />
        ))}
      </g>

      <g className="anel-runico anel-anti-horario">
        <circle cx={CENTRO} cy={CENTRO} r="80" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        {RUNAS_INTERNAS.map((angulo, indice) => (
          <path
            key={angulo}
            d={
              indice % 2 === 0
                ? `M${CENTRO} 32v16M${CENTRO - 5} 37l5 5 5-5`
                : `M${CENTRO - 5} 34h10M${CENTRO} 34v12M${CENTRO - 5} 46h10`
            }
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`rotate(${angulo} ${CENTRO} ${CENTRO})`}
          />
        ))}
      </g>

      <polygon points={hexagono(56)} stroke="currentColor" strokeWidth="2" />
      <polygon points={hexagono(44)} stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <path
        d={`M${CENTRO - 13} ${CENTRO - 13}l-13 13 13 13M${CENTRO + 13} ${CENTRO - 13}l13 13-13 13M${CENTRO + 5} ${CENTRO - 18}l-10 36`}
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-texto"
      />
    </svg>
  );
}
