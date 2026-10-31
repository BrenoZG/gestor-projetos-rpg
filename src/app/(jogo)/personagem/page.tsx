import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BarraXp } from '@/componentes/barra-xp';
import { ExportarDados } from '@/componentes/personagem/exportar-dados';
import { BrasaoClasse } from '@/componentes/brasao-classe';
import { EmblemaRank } from '@/componentes/emblema-rank';
import { Medalha } from '@/componentes/medalha';
import { FormularioClasse } from '@/componentes/personagem/formulario-classe';
import { ListaMaestria } from '@/componentes/personagem/lista-maestria';
import { PreferenciaAtalho } from '@/componentes/personagem/preferencia-atalho';
import { CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import { CLASSES } from '@/dominio/personagem/classes';
import {
  medalhasDoPersonagem,
  nivelConquistado,
  type MedalhaDoPersonagem,
} from '@/dominio/progressao/medalhas';
import {
  progressoDoNivel,
  rankDoAventureiro,
  tituloDoNivel,
  type ProgressoNivel,
} from '@/dominio/progressao/progressao';
import { obterAtalhoLigado } from '@/lib/atalho-ficha-servidor';

import { carregarPersonagem, type PersonagemDoJogo } from '../carregar-personagem';
import { carregarMaestria } from './carregar-maestria';

export const metadata: Metadata = { title: 'Ficha' };

function textoDoXp({ xpNoNivel, xpParaProximo }: ProgressoNivel): string {
  return xpParaProximo === null ? 'NÍVEL MÁXIMO' : `${xpNoNivel} / ${xpParaProximo} XP`;
}

function textoDoBloqueio({ niveisFaltando }: MedalhaDoPersonagem): string {
  return niveisFaltando === 1 ? 'Bloqueada · falta 1 nível' : `Bloqueada · faltam ${niveisFaltando} níveis`;
}

function textoDaProximaMedalha(medalhas: readonly MedalhaDoPersonagem[]): string {
  const proxima = medalhas.find((medalha) => !medalha.conquistada);
  if (!proxima) return 'Todas as medalhas conquistadas.';
  const faltam = proxima.niveisFaltando === 1 ? 'falta 1 nível' : `faltam ${proxima.niveisFaltando} níveis`;
  return `${proxima.numeral} · ${proxima.nome}, no nível ${proxima.nivel} (${faltam}).`;
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

/** Resumo do personagem: Rank, título, Classe, nível nas duas trilhas e a próxima medalha. */
function ResumoPersonagem({
  personagem,
  medalhas,
}: {
  personagem: PersonagemDoJogo;
  medalhas: readonly MedalhaDoPersonagem[];
}) {
  const progresso = progressoDoNivel(personagem.xp.desenvolvedor);
  const produtividade =
    personagem.xp.produtividade > 0 ? progressoDoNivel(personagem.xp.produtividade) : null;
  const rank = rankDoAventureiro(progresso.nivel);
  const classe = CLASSES.find(({ chave }) => chave === personagem.classe)!;

  return (
    <section
      aria-labelledby="titulo-resumo"
      className="flex flex-wrap items-center gap-4 rounded-md border border-borda-forte bg-superficie px-4 py-4"
    >
      <div className="flex shrink-0 items-center gap-2">
        <BrasaoClasse classe={classe.chave} className="h-16 w-14" />
        <EmblemaRank rank={rank} className="h-14 w-12" />
      </div>
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
        <span className="font-mono text-[0.6875rem] tracking-[0.2em] text-acento">
          RANK {rank} · AVENTUREIRO · {classe.nome.toUpperCase()}
        </span>
        <h2 id="titulo-resumo" className="font-display text-xl font-extrabold">
          {tituloDoNivel(progresso.nivel)}
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs whitespace-nowrap text-texto-suave">
            NV <span className="font-display text-lg font-extrabold text-texto">{progresso.nivel}</span>
          </span>
          <BarraXp
            progresso={progresso}
            rotulo="XP de Desenvolvedor no nível atual"
            className="min-w-16 flex-1"
          />
          <span className="font-mono text-xs whitespace-nowrap text-texto-suave">{textoDoXp(progresso)}</span>
        </div>
        {produtividade && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[0.6875rem] whitespace-nowrap text-texto-suave">
              PRODUTIVIDADE · NV {produtividade.nivel}
            </span>
            <BarraXp
              progresso={produtividade}
              rotulo="XP de Produtividade no nível atual"
              variante="secundaria"
              className="min-w-12 flex-1"
            />
            <span className="font-mono text-[0.6875rem] whitespace-nowrap text-texto-suave">
              {textoDoXp(produtividade)}
            </span>
          </div>
        )}
      </div>
      <p className="basis-full rounded-md border border-borda bg-fundo/60 px-3 py-2 text-sm sm:basis-56">
        <span className="block font-mono text-[0.6875rem] tracking-[0.2em] text-texto-suave">
          PRÓXIMA MEDALHA
        </span>
        {textoDaProximaMedalha(medalhas)}
      </p>
    </section>
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

async function ConteudoFicha() {
  const [personagem, maestria, atalhoLigado] = await Promise.all([
    carregarPersonagem(),
    carregarMaestria(),
    obterAtalhoLigado(),
  ]);
  const nivel = nivelConquistado(personagem.nivelMaximo, progressoDoNivel(personagem.xp.desenvolvedor).nivel);
  const medalhas = medalhasDoPersonagem(nivel);
  const classe = CLASSES.find(({ chave }) => chave === personagem.classe)!;

  return (
    <>
      <ResumoPersonagem personagem={personagem} medalhas={medalhas} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ListaMaestria
          id="titulo-maestria"
          titulo="MAESTRIA POR STACK · DESENVOLVEDOR"
          termo="Maestria"
          linhas={maestria.filter(({ trilha }) => trilha === 'desenvolvedor')}
          vazio="Conclua um Projeto de Desenvolvimento para ganhar Maestria nas stacks dele. O nível máximo é 50."
          variante="principal"
        />
        <ListaMaestria
          id="titulo-dominio"
          titulo="DOMÍNIO POR FERRAMENTA · PRODUTIVIDADE"
          termo="Domínio"
          linhas={maestria.filter(({ trilha }) => trilha === 'produtividade')}
          vazio="Conclua um Projeto Geral com ferramentas para ganhar Domínio nelas. O nível máximo é 50."
          variante="secundaria"
        />
      </div>

      <GaleriaMedalhas medalhas={medalhas} />

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

      <PreferenciaAtalho inicial={atalhoLigado} />
      <ExportarDados />
    </>
  );
}

function FichaCarregando() {
  return (
    <div role="status" aria-label="Carregando a Ficha" className="flex flex-col gap-6">
      <div className="h-32 animate-pulse rounded-md border border-borda bg-superficie/60 motion-reduce:animate-none" />
      <div className="h-80 animate-pulse rounded-md border border-borda bg-superficie/60 motion-reduce:animate-none" />
    </div>
  );
}

/**
 * Ficha do Personagem (RF-19): resumo das trilhas e da próxima medalha,
 * Maestria por stack e Domínio por ferramenta (RN-10, RN-18), galeria das 10
 * medalhas (RF-15), troca livre de Classe (RF-18, RN-11), o liga/desliga do
 * atalho `C` (RN-12) e o export JSON (RF-14). A rota continua `/personagem`.
 */
export default function PaginaFicha() {
  return (
    <div className="flex flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="entrada-suave flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.2em] text-acento sm:text-sm">
          [ SISTEMA ] · FICHA DO PERSONAGEM
        </span>
        <h1 className="titulo-jogo font-display text-[clamp(2rem,5vw,3.5rem)] leading-none font-extrabold">
          Ficha
        </h1>
      </div>
      <Suspense fallback={<FichaCarregando />}>
        <ConteudoFicha />
      </Suspense>
    </div>
  );
}
