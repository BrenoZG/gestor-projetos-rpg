import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { CHAVES_CLASSE, CLASSES, ehChaveClasse, nomeDaClasse } from '@/dominio/personagem/classes';

/** Chaves aceitas pelo CHECK `personagem_classe_valida` da migration. */
function chavesDoBanco(): string[] {
  const pasta = join(process.cwd(), 'supabase', 'migrations');
  const arquivo = readdirSync(pasta).find((nome) => nome.endsWith('_criar_personagem.sql'));
  if (!arquivo) throw new Error('migration criar_personagem não encontrada');
  const sql = readFileSync(join(pasta, arquivo), 'utf8');
  const lista = /classe in \(([^)]*)\)/.exec(sql)?.[1] ?? '';
  return [...lista.matchAll(/'([a-z_]+)'/g)].map((m) => m[1] as string);
}

describe('classes do personagem', () => {
  it('tem exatamente as 8 chaves aceitas pelo banco', () => {
    expect([...CHAVES_CLASSE].sort()).toEqual(chavesDoBanco().sort());
    expect(CHAVES_CLASSE).toHaveLength(8);
  });

  it('traduz a chave para o nome exibido', () => {
    expect(nomeDaClasse('sombra_seguranca')).toBe('Sombra da Segurança');
    expect(nomeDaClasse('lamina_arcana_fullstack')).toBe('Lâmina Arcana Full Stack');
  });

  it.each([null, '', 'mago_inexistente', 'constructor'])('devolve null sem classe válida (%j)', (chave) => {
    expect(nomeDaClasse(chave)).toBeNull();
  });
});

describe('CLASSES', () => {
  it('lista as 8 na ordem de requisitos.md §6, com nome e área', () => {
    expect(CLASSES.map((c) => c.chave)).toEqual([...CHAVES_CLASSE]);
    expect(CLASSES[0]).toEqual({
      chave: 'arquimago_dados',
      nome: 'Arquimago de Dados',
      area: 'Dados, BI, engenharia e análise de dados',
    });
    expect(CLASSES[7]?.area).toBe('UI/UX, design de produto');
  });
});

describe('ehChaveClasse', () => {
  it('aceita uma chave do banco', () => {
    expect(ehChaveClasse('invocador_ia')).toBe(true);
  });

  it.each(['', 'mago_inexistente', 'toString', 'INVOCADOR_IA'])('recusa %j', (valor) => {
    expect(ehChaveClasse(valor)).toBe(false);
  });
});
