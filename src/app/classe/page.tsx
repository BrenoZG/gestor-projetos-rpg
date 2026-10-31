import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { ConteudoPrincipal } from '@/componentes/conteudo-principal';
import { Particulas } from '@/componentes/particulas';
import { FormularioClasse } from '@/componentes/personagem/formulario-classe';
import { ErroDeMissao } from '@/dados/missoes';
import { obterPersonagem } from '@/dados/personagem';
import { ROTA_INICIAL } from '@/dominio/acesso/rotas';
import { registrarEvento } from '@/lib/log';
import { criarClienteServidor } from '@/lib/supabase/servidor';

export const metadata: Metadata = { title: 'Escolha sua classe' };

/**
 * Formulário da primeira escolha. Quem já tem Classe volta ao Quadro: a troca
 * é pela página do Personagem (RF-18). Esta tela não usa o `carregarPersonagem`
 * do jogo, que mandaria de volta para cá.
 *
 * @throws {Error} Mensagem genérica se o banco falhar (a tela de erro assume).
 */
async function EscolhaDaClasse() {
  await connection();
  let personagem: Awaited<ReturnType<typeof obterPersonagem>>;
  try {
    personagem = await obterPersonagem(await criarClienteServidor());
  } catch (erro) {
    if (!(erro instanceof ErroDeMissao)) throw erro;
    registrarEvento('erro', 'supabase_falhou', {
      operacao: erro.operacao,
      codigo: erro.codigo ?? 'desconhecido',
    });
    throw new Error('Não foi possível carregar o personagem.');
  }
  if (personagem?.classe) redirect(ROTA_INICIAL);
  return <FormularioClasse modo="escolher" />;
}

function CarregandoClasses() {
  return (
    <div role="status" aria-label="Carregando as classes" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-md border border-borda bg-superficie/60 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

/**
 * Primeiro acesso (RF-17): o novo Aventureiro escolhe a Classe antes de ver o
 * Quadro. Tela cheia, sem HUD: ainda não há personagem completo para mostrar.
 */
export default function PaginaEscolherClasse() {
  return (
    <div className="portal-sistema relative min-h-dvh">
      <Particulas />
      <ConteudoPrincipal className="relative mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8 sm:py-14">
        <div className="entrada-suave flex flex-col items-center gap-3 text-center">
          <span className="font-mono text-xs tracking-[0.2em] text-acento">SISTEMA · NOVO AVENTUREIRO</span>
          <h1 className="titulo-jogo font-display text-[clamp(1.75rem,6vw,3rem)] leading-tight font-extrabold">
            Escolha sua classe
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-texto-suave">
            A classe é a sua identidade no jogo e não muda XP, nível nem Rank. Dá para trocar depois, na
            página do Personagem.
          </p>
        </div>
        <Suspense fallback={<CarregandoClasses />}>
          <EscolhaDaClasse />
        </Suspense>
      </ConteudoPrincipal>
    </div>
  );
}
