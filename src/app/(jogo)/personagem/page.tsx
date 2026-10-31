import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BrasaoClasse } from '@/componentes/brasao-classe';
import { Medalha } from '@/componentes/medalha';
import { FormularioClasse } from '@/componentes/personagem/formulario-classe';
import { CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import { CLASSES } from '@/dominio/personagem/classes';
import {
  medalhasDoPersonagem,
  nivelConquistado,
  type MedalhaDoPersonagem,
} from '@/dominio/progressao/medalhas';
import { calcularNivel } from '@/dominio/progressao/progressao';

import { carregarPersonagem } from '../carregar-personagem';

export const metadata: Metadata = { title: 'Personagem' };

function textoDoBloqueio({ niveisFaltando }: MedalhaDoPersonagem): string {
  return niveisFaltando === 1 ? 'Bloqueada · falta 1 nível' : `Bloqueada · faltam ${niveisFaltando} níveis`;
}

function rotuloDaMedalha(medalha: MedalhaDoPersonagem): string {
  const base = `Medalha ${medalha.nome}, nível ${medalha.nivel}`;
  return medalha.conquistada ? `${base}, conquistada` : `${base}, bloqueada`;
}

/** Cadeado do texto "Bloqueada": reforça o estado ao lado da palavra (não só cor). */
function IconeCadeado() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" className="shrink-0">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function GaleriaMedalhas({ medalhas }: { medalhas: readonly MedalhaDoPersonagem[] }) {
  const conquistadas = medalhas.filter((medalha) => medalha.conquistada).length;
  return (
    <section aria-labelledby="titulo-medalhas" className="flex flex-col gap-4">
      <h2 id="titulo-medalhas" className="font-mono text-xs tracking-[0.2em] text-acento">
        MEDALHAS · {conquistadas} DE {medalhas.length}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {medalhas.map((medalha) => (
          <li
            key={medalha.tier}
            className="flex flex-col items-center gap-1.5 rounded-md border border-borda-forte bg-superficie px-3 py-4 text-center"
          >
            <Medalha
              tier={medalha.tier}
              material={medalha.material}
              bloqueada={!medalha.conquistada}
              rotulo={rotuloDaMedalha(medalha)}
              className="h-24 w-24"
            />
            <span className="font-display text-sm font-bold">
              {medalha.numeral} · {medalha.nome}
            </span>
            <span className="text-xs text-texto-suave">
              Nível {medalha.nivel} · {medalha.titulo}
            </span>
            {medalha.conquistada ? (
              <span className="font-mono text-[0.6875rem] tracking-[0.14em] text-positivo">CONQUISTADA</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-texto-suave">
                <IconeCadeado />
                {textoDoBloqueio(medalha)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

async function ConteudoPersonagem() {
  const personagem = await carregarPersonagem();
  const nivel = nivelConquistado(personagem.nivelMaximo, calcularNivel(personagem.xp.desenvolvedor));
  const classe = CLASSES.find(({ chave }) => chave === personagem.classe)!;

  return (
    <>
      <section aria-labelledby="titulo-classe" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 rounded-md border border-borda-forte bg-superficie px-4 py-4">
          <BrasaoClasse classe={classe.chave} className="h-16 w-14 shrink-0" />
          <div className="flex min-w-40 flex-1 flex-col gap-0.5">
            <span className="font-mono text-[0.6875rem] tracking-[0.2em] text-acento">CLASSE</span>
            <h2 id="titulo-classe" className="font-display text-lg font-extrabold">
              {classe.nome}
            </h2>
            <span className="text-sm text-texto-suave">{classe.area}</span>
          </div>
        </div>
        {/* <details> nativo: abre com Enter/Espaço e funciona sem JavaScript. */}
        <details className="group flex flex-col gap-4">
          <summary
            className={`${CLASSES_ACAO_SECUNDARIA} w-fit list-none [&::-webkit-details-marker]:hidden`}
          >
            <span className="group-open:hidden">Trocar classe</span>
            <span className="hidden group-open:inline">Fechar a troca de classe</span>
          </summary>
          <p className="pt-4 text-sm text-texto-suave">
            A troca é livre e sem custo: XP, nível, Rank e medalhas continuam iguais.
          </p>
          <div className="pt-4">
            <FormularioClasse modo="trocar" classeAtual={personagem.classe} />
          </div>
        </details>
      </section>

      <GaleriaMedalhas medalhas={medalhasDoPersonagem(nivel)} />
    </>
  );
}

function PersonagemCarregando() {
  return (
    <div role="status" aria-label="Carregando o personagem" className="flex flex-col gap-6">
      <div className="h-24 animate-pulse rounded-md border border-borda bg-superficie/60 motion-reduce:animate-none" />
      <div className="h-80 animate-pulse rounded-md border border-borda bg-superficie/60 motion-reduce:animate-none" />
    </div>
  );
}

/**
 * Página do Personagem: Classe com troca livre (RF-18, RN-11) e a galeria das
 * 10 medalhas, conquistadas e bloqueadas (RF-15). Semente da Ficha completa
 * (RF-19, M5: tecla C, Maestria e animações).
 */
export default function PaginaPersonagem() {
  return (
    <div className="flex flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="entrada-suave flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.2em] text-acento sm:text-sm">
          [ SISTEMA ] · PERSONAGEM
        </span>
        <h1 className="titulo-jogo font-display text-[clamp(2rem,5vw,3.5rem)] leading-none font-extrabold">
          Personagem
        </h1>
      </div>
      <Suspense fallback={<PersonagemCarregando />}>
        <ConteudoPersonagem />
      </Suspense>
    </div>
  );
}
