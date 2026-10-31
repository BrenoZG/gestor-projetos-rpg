'use client';

import { useState, type MouseEvent } from 'react';

import { AvisoErro } from '@/componentes/aviso-erro';
import { CLASSES_ACAO_SECUNDARIA } from '@/componentes/tela-sistema';
import { ROTA_EXPORTAR } from '@/dominio/acesso/rotas';
import {
  nomeDoArquivoNoCabecalho,
  resumoDoArquivo,
  type ResumoDoArquivo,
} from '@/dominio/exportacao/arquivo';

type Estado =
  | { tipo: 'parado' }
  | { tipo: 'gerando' }
  | { tipo: 'sucesso'; nome: string; resumo: ResumoDoArquivo | null }
  | { tipo: 'erro' };

/** Nome de reserva, se o cabeçalho não trouxer um (não deve acontecer). */
const NOME_RESERVA = 'gestor-projetos.json';

function plural(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

function textoDoSucesso(nome: string, resumo: ResumoDoArquivo | null): string {
  if (!resumo) return `Arquivo ${nome} baixado.`;
  const projetos = plural(resumo.projetos, 'Projeto', 'Projetos');
  const atualizacoes = plural(resumo.atualizacoes, 'Atualização', 'Atualizações');
  return `Arquivo ${nome} baixado: ${projetos}, ${atualizacoes}.`;
}

/**
 * Aviso de sucesso: o verde fica na borda e no ícone (3:1 de componente), o
 * texto usa `texto`, como no aviso de recompensa; ícone e texto dizem o resultado.
 */
function AvisoSucesso({ texto }: { texto: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-positivo bg-superficie px-4 py-3 text-sm text-texto">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        width="20"
        height="20"
        className="mt-px shrink-0 text-positivo"
      >
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6 10.5l2.75 2.75L14 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p>{texto}</p>
    </div>
  );
}

/** Entrega o conteúdo como download, por um link temporário. */
function salvarArquivo(conteudo: Blob, nome: string): void {
  const url = URL.createObjectURL(conteudo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  // Revogar no mesmo instante pode cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Seção Backup da Ficha: baixa todos os dados do usuário em JSON (RF-14).
 *
 * É um link para `/api/exportar`: sem JavaScript, o navegador baixa direto.
 * Com JavaScript, o clique busca o arquivo para mostrar "gerando", o sucesso
 * com as contagens e a falha. Uma sessão vencida volta como redirecionamento
 * para a entrada, tratado como falha (nenhum arquivo é baixado).
 */
export function ExportarDados() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'parado' });
  const gerando = estado.tipo === 'gerando';

  async function baixar(evento: MouseEvent<HTMLAnchorElement>) {
    evento.preventDefault();
    if (gerando) return;
    setEstado({ tipo: 'gerando' });
    try {
      const resposta = await fetch(ROTA_EXPORTAR, { cache: 'no-store' });
      if (!resposta.ok || resposta.redirected) throw new Error(`export respondeu ${resposta.status}`);
      const conteudo = await resposta.blob();
      const nome = nomeDoArquivoNoCabecalho(resposta.headers.get('Content-Disposition')) ?? NOME_RESERVA;
      salvarArquivo(conteudo, nome);
      setEstado({ tipo: 'sucesso', nome, resumo: resumoDoArquivo(await conteudo.text()) });
    } catch {
      // Rede, sessão vencida ou falha do servidor (esta fica no log): a pessoa vê só a mensagem genérica.
      setEstado({ tipo: 'erro' });
    }
  }

  return (
    <section
      aria-labelledby="titulo-backup"
      className="flex flex-col gap-3 rounded-md border border-borda-forte bg-superficie px-4 py-4"
    >
      <h2 id="titulo-backup" className="font-mono text-xs tracking-[0.2em] text-texto-suave">
        BACKUP
      </h2>
      <p className="font-display text-lg font-extrabold">Exportar meus dados</p>
      <p id="ajuda-backup" className="text-sm text-texto-suave">
        Baixa um arquivo JSON com seus Projetos, Atualizações, stacks, tags, links, personagem e o histórico
        de XP. Guarde em local seguro: o arquivo não tem senha.
      </p>
      <a
        href={ROTA_EXPORTAR}
        download
        onClick={baixar}
        aria-describedby="ajuda-backup"
        aria-disabled={gerando || undefined}
        aria-busy={gerando || undefined}
        className={`${CLASSES_ACAO_SECUNDARIA} w-full sm:w-fit ${gerando ? 'cursor-wait opacity-70' : ''}`}
      >
        {gerando ? 'Gerando o arquivo…' : estado.tipo === 'erro' ? 'Tentar de novo' : 'Baixar JSON'}
      </a>
      {/* Sempre montada: o leitor de tela só anuncia mudança numa região que já existia. */}
      <div role="status">
        {estado.tipo === 'sucesso' && <AvisoSucesso texto={textoDoSucesso(estado.nome, estado.resumo)} />}
      </div>
      {estado.tipo === 'erro' && (
        <AvisoErro titulo="Falha no export.">
          Não foi possível gerar o arquivo agora. Tente de novo em instantes.
        </AvisoErro>
      )}
    </section>
  );
}
