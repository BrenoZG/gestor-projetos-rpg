import { describe, expect, it } from 'vitest';

import {
  CAPACIDADES,
  ESTILOS_ARQUITETURAIS,
  LIMITES_MISSAO,
  ROTULOS_CAPACIDADE,
  ROTULOS_ESTILO,
  ROTULOS_STATUS,
  STATUS_MISSAO,
  ehCapacidade,
  ehEstiloArquitetural,
  ehStatusMissao,
} from '@/dominio/missoes/campos';

describe('LIMITES_MISSAO', () => {
  it('segue a seção 3 de requisitos.md', () => {
    expect(LIMITES_MISSAO).toEqual({
      nome: { minimo: 3, maximo: 80 },
      descricao: { minimo: 1, maximo: 2000 },
      arquitetura: { minimo: 1, maximo: 20000 },
      stacks: { minimo: 1, maximo: 20 },
      nomeStack: { minimo: 1, maximo: 40 },
    });
  });
});

describe('status da Missão', () => {
  it('tem os três status, na ordem das colunas do Quadro', () => {
    expect(STATUS_MISSAO).toEqual(['backlog', 'desenvolvimento', 'concluido']);
  });

  it('tem rótulo para cada status', () => {
    expect(ROTULOS_STATUS).toEqual({
      backlog: 'Backlog',
      desenvolvimento: 'Desenvolvimento',
      concluido: 'Concluído',
    });
  });

  it.each(['backlog', 'desenvolvimento', 'concluido'])('reconhece "%s"', (valor) => {
    expect(ehStatusMissao(valor)).toBe(true);
  });

  it.each(['Backlog', 'concluído', '', 'arquivado'])('rejeita "%s"', (valor) => {
    expect(ehStatusMissao(valor)).toBe(false);
  });
});

describe('estilo arquitetural', () => {
  it('tem os 7 estilos da RN-14, do mais simples ao mais distribuído', () => {
    expect(ESTILOS_ARQUITETURAIS).toEqual([
      'script',
      'monolito',
      'monolito_modular',
      'hexagonal',
      'serverless',
      'eventos',
      'microsservicos',
    ]);
  });

  it('tem rótulo para cada estilo', () => {
    expect(ROTULOS_ESTILO).toEqual({
      script: 'Script ou automação',
      monolito: 'Monolito',
      monolito_modular: 'Monolito modular',
      hexagonal: 'Hexagonal / Clean',
      serverless: 'Serverless',
      eventos: 'Orientado a eventos',
      microsservicos: 'Microsserviços',
    });
  });

  it.each(['script', 'microsservicos'])('reconhece "%s"', (valor) => {
    expect(ehEstiloArquitetural(valor)).toBe(true);
  });

  it.each(['Monolito', 'monolitico', ''])('rejeita "%s"', (valor) => {
    expect(ehEstiloArquitetural(valor)).toBe(false);
  });
});

describe('capacidades', () => {
  it('tem as 8 capacidades da RN-14', () => {
    expect(CAPACIDADES).toEqual([
      'autenticacao',
      'banco_de_dados',
      'api_externa',
      'tempo_real',
      'filas',
      'ia',
      'ci_cd',
      'mobile',
    ]);
  });

  it('tem rótulo para cada capacidade', () => {
    expect(ROTULOS_CAPACIDADE).toEqual({
      autenticacao: 'Autenticação',
      banco_de_dados: 'Banco de dados',
      api_externa: 'Integração com API externa',
      tempo_real: 'Tempo real',
      filas: 'Filas e processamento assíncrono',
      ia: 'IA ou machine learning',
      ci_cd: 'CI/CD e deploy',
      mobile: 'App mobile',
    });
  });

  it.each(['autenticacao', 'mobile'])('reconhece "%s"', (valor) => {
    expect(ehCapacidade(valor)).toBe(true);
  });

  it.each(['Autenticação', 'blockchain', ''])('rejeita "%s"', (valor) => {
    expect(ehCapacidade(valor)).toBe(false);
  });
});
