import { describe, expect, it } from 'vitest';

import {
  contarRegistros,
  montarArquivoExport,
  nomeDoArquivoExport,
  nomeDoArquivoNoCabecalho,
  resumoDoArquivo,
  type DadosExportados,
} from '@/dominio/exportacao/arquivo';

const DADOS: DadosExportados = {
  personagem: { classe: 'guerreiro_backend', nivel_maximo: 3 },
  projetos: [{ id: 'p1' }, { id: 'p2' }],
  stacks: [{ id: 's1' }],
  projeto_stacks: [{ projeto_id: 'p1', stack_id: 's1' }],
  tags: [],
  projeto_tags: [],
  projeto_links: [],
  atualizacoes: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }],
  eventos_xp: [{ id: 'e1' }],
};

describe('montarArquivoExport', () => {
  it('envolve os dados com o formato, a versão e a hora do export', () => {
    const agora = new Date('2026-10-31T23:30:00.000Z');
    expect(montarArquivoExport(DADOS, agora)).toEqual({
      formato: 'gestor-projetos-rpg/export',
      versao_formato: 1,
      exportado_em: '2026-10-31T23:30:00.000Z',
      dados: DADOS,
    });
  });
});

describe('nomeDoArquivoExport', () => {
  it('usa a data de São Paulo', () => {
    expect(nomeDoArquivoExport(new Date('2026-10-31T15:00:00Z'))).toBe('gestor-projetos-2026-10-31.json');
  });

  it('não vira o dia antes da meia-noite de São Paulo, mesmo já sendo outro dia em UTC', () => {
    expect(nomeDoArquivoExport(new Date('2026-11-01T02:30:00Z'))).toBe('gestor-projetos-2026-10-31.json');
  });
});

describe('nomeDoArquivoNoCabecalho', () => {
  it('lê o nome do Content-Disposition', () => {
    expect(nomeDoArquivoNoCabecalho('attachment; filename="gestor-projetos-2026-10-31.json"')).toBe(
      'gestor-projetos-2026-10-31.json',
    );
  });

  it('sem cabeçalho ou sem nome, devolve null', () => {
    expect(nomeDoArquivoNoCabecalho(null)).toBeNull();
    expect(nomeDoArquivoNoCabecalho('attachment')).toBeNull();
  });
});

describe('resumoDoArquivo', () => {
  it('conta Projetos e Atualizações do texto baixado', () => {
    const texto = JSON.stringify(montarArquivoExport(DADOS, new Date()));
    expect(resumoDoArquivo(texto)).toEqual({ projetos: 2, atualizacoes: 3 });
  });

  it('texto que não é o arquivo do export devolve null, sem lançar', () => {
    expect(resumoDoArquivo('<html>')).toBeNull();
    expect(resumoDoArquivo('{"formato":"outro"}')).toBeNull();
    expect(resumoDoArquivo(JSON.stringify({ formato: 'gestor-projetos-rpg/export', dados: {} }))).toBeNull();
  });
});

describe('contarRegistros', () => {
  it('conta as linhas de cada tabela em lista', () => {
    expect(contarRegistros(DADOS)).toEqual({
      projetos: 2,
      stacks: 1,
      projeto_stacks: 1,
      tags: 0,
      projeto_tags: 0,
      projeto_links: 0,
      atualizacoes: 3,
      eventos_xp: 1,
    });
  });
});
