import type { StatusMissao } from '@/dominio/missoes/campos';

export type ColunaQuadro = { id: StatusMissao; titulo: string; vazio: string; detalhe: string };

/** As três colunas do Quadro seguem os status da Missão (RN-02), na ordem da tela. */
export const COLUNAS: readonly ColunaQuadro[] = [
  {
    id: 'backlog',
    titulo: 'Backlog',
    vazio: 'Nenhum projeto no backlog.',
    detalhe: 'Registre uma ideia para ela não ficar só na cabeça.',
  },
  {
    id: 'desenvolvimento',
    titulo: 'Em desenvolvimento',
    vazio: 'Nenhum projeto em andamento.',
    detalhe: 'Arraste um projeto para cá ou use o botão Mover.',
  },
  {
    id: 'concluido',
    titulo: 'Concluídas',
    vazio: 'Nenhum projeto concluído ainda.',
    detalhe: 'Cada conclusão vai render XP ao personagem.',
  },
];

export const TITULOS_COLUNA = Object.fromEntries(
  COLUNAS.map((coluna) => [coluna.id, coluna.titulo]),
) as Readonly<Record<StatusMissao, string>>;

/** Atrasos de entrada em cascata (camada de transição); depois do 6º item, sem atraso. */
const ATRASOS = [
  '[animation-delay:80ms]',
  '[animation-delay:160ms]',
  '[animation-delay:240ms]',
  '[animation-delay:320ms]',
  '[animation-delay:400ms]',
  '[animation-delay:480ms]',
];

export const atraso = (indice: number) => ATRASOS[indice] ?? '';
