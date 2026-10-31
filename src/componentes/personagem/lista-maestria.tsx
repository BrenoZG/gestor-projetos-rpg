import { BarraXp } from '@/componentes/barra-xp';
import type { LinhaMaestria } from '@/dados/progressao';
import { NIVEL_MAXIMO_MAESTRIA, progressoDaMaestria } from '@/dominio/progressao/maestria';

function textoDosProjetos(projetos: number): string {
  return projetos === 1 ? '1 projeto' : `${projetos} projetos`;
}

/**
 * Maestria por stack (trilha Desenvolvedor) ou Domínio por ferramenta (trilha
 * Produtividade), do maior XP ao menor (RN-10, RN-18). O XP de um Projeto conta
 * inteiro para cada stack dele, por isso a soma passa do XP do personagem.
 *
 * @param props - Título, linhas de uma trilha, texto do estado vazio e o termo
 *   usado no nome acessível das barras ("Maestria" ou "Domínio").
 */
export function ListaMaestria({
  id,
  titulo,
  termo,
  linhas,
  vazio,
  variante,
}: {
  id: string;
  titulo: string;
  termo: 'Maestria' | 'Domínio';
  linhas: readonly LinhaMaestria[];
  vazio: string;
  variante: 'principal' | 'secundaria';
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-md border border-borda-forte bg-superficie px-4 py-4"
    >
      <h2
        id={id}
        className={`font-mono text-xs tracking-[0.2em] ${variante === 'principal' ? 'text-acento' : 'text-texto-suave'}`}
      >
        {titulo}
      </h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-texto-suave">{vazio}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-borda">
          {linhas.map(({ nome, xp, projetos }) => {
            const progresso = progressoDaMaestria(xp);
            return (
              <li
                key={nome}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2.5"
              >
                <span className="truncate font-display text-sm font-bold">{nome}</span>
                <span className="font-mono text-xs text-texto-suave">
                  NV <span className="text-texto">{progresso.nivel}</span>
                  {progresso.nivel === NIVEL_MAXIMO_MAESTRIA && ' · MÁXIMO'}
                </span>
                <BarraXp
                  progresso={progresso}
                  rotulo={`${termo} em ${nome}`}
                  variante={variante}
                  className="col-span-2"
                />
                <span className="col-span-2 text-xs text-texto-suave">
                  {textoDosProjetos(projetos)} · {xp} XP
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
