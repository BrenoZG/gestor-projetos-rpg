import type { Metadata } from 'next';
import Link from 'next/link';

import { CLASSES_ACAO_PRINCIPAL, TelaSistema } from '@/componentes/tela-sistema';

export const metadata: Metadata = { title: 'Área desconhecida' };

/** Página não encontrada (404), no tema do Sistema. */
export default function NaoEncontrada() {
  return (
    <TelaSistema
      rotulo="[ SISTEMA ] · ERRO 404"
      titulo="Área desconhecida"
      acoes={
        <Link href="/" className={CLASSES_ACAO_PRINCIPAL}>
          Voltar ao Quadro de Projetos
        </Link>
      }
    >
      <p>
        Este caminho não existe no mapa. Talvez o projeto tenha sido movido ou o endereço esteja incompleto.
      </p>
    </TelaSistema>
  );
}
