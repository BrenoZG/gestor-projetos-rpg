import { describe, expect, it } from 'vitest';

import { mensagemDoErroDoBanco, validarFormularioMissao } from '@/acoes/missoes-validacao';

const VALIDA = {
  tipo: 'dev',
  nome: '  Gestor de Projetos ',
  descricao: ' Um lugar para todas as ideias. ',
  arquitetura: ' Monolito Next.js com Supabase. ',
  estilo: 'monolito',
  capacidades: ['ci_cd', 'autenticacao', 'ci_cd'],
  status: 'backlog',
  stacks: ['Next.js', ' next.js', 'Supabase'],
  tags: [],
  link_url: [],
  link_titulo: [],
};

const GERAL = {
  tipo: 'geral',
  nome: 'Revenda na Shopee',
  descricao: 'Testar a revenda de acessórios.',
  status: 'backlog',
  stacks: [],
  tags: ['Revenda'],
  link_url: [],
  link_titulo: [],
};

function comCampo(campo: string, valor: unknown) {
  return validarFormularioMissao({ ...VALIDA, [campo]: valor }, 'criar');
}

function erroDe(campo: string, valor: unknown): string | undefined {
  const resultado = comCampo(campo, valor);
  return resultado.ok ? undefined : resultado.erros[campo as keyof typeof resultado.erros];
}

function geralCom(campo: string, valor: unknown) {
  return validarFormularioMissao({ ...GERAL, [campo]: valor }, 'criar');
}

function erroGeralDe(campo: string, valor: unknown): string | undefined {
  const resultado = geralCom(campo, valor);
  return resultado.ok ? undefined : resultado.erros[campo as keyof typeof resultado.erros];
}

describe('validarFormularioMissao', () => {
  it('aceita uma Missão válida e devolve os dados limpos', () => {
    expect(validarFormularioMissao(VALIDA, 'criar')).toEqual({
      ok: true,
      dados: {
        tipo: 'dev',
        nome: 'Gestor de Projetos',
        descricao: 'Um lugar para todas as ideias.',
        arquitetura: 'Monolito Next.js com Supabase.',
        estilo: 'monolito',
        capacidades: ['autenticacao', 'ci_cd'],
        status: 'backlog',
        stacks: ['Next.js', 'Supabase'],
        tags: [],
        links: [],
      },
    });
  });

  it('mantém a estrutura preenchida', () => {
    const resultado = comCampo('arquitetura', '# Camadas\n- domínio');
    expect(resultado.ok && resultado.dados.tipo === 'dev' && resultado.dados.arquitetura).toBe(
      '# Camadas\n- domínio',
    );
  });

  it.each([
    ['Ab', 'O nome precisa ter de 3 a 80 caracteres.'],
    ['   ab   ', 'O nome precisa ter de 3 a 80 caracteres.'],
    ['x'.repeat(81), 'O nome precisa ter de 3 a 80 caracteres.'],
    [undefined, 'O nome precisa ter de 3 a 80 caracteres.'],
  ])('recusa o nome %j', (nome, mensagem) => {
    expect(erroDe('nome', nome)).toBe(mensagem);
  });

  it.each(['Abc', 'x'.repeat(80)])('aceita nome nas fronteiras (%j)', (nome) => {
    expect(comCampo('nome', nome).ok).toBe(true);
  });

  it.each([
    ['', 'A descrição é obrigatória.'],
    ['   ', 'A descrição é obrigatória.'],
    ['x'.repeat(2001), 'A descrição aceita até 2.000 caracteres.'],
  ])('recusa a descrição %j', (descricao, mensagem) => {
    expect(erroDe('descricao', descricao)).toBe(mensagem);
  });

  it('recusa estrutura com mais de 20.000 caracteres', () => {
    expect(erroDe('arquitetura', 'x'.repeat(20001))).toBe('A estrutura aceita até 20.000 caracteres.');
  });

  it.each(['', '   ', undefined])('recusa a estrutura vazia %j (RN-14)', (arquitetura) => {
    expect(erroDe('arquitetura', arquitetura)).toBe('Descreva a estrutura e a arquitetura da missão.');
  });

  it.each(['monolitico', 'Monolito', '', undefined])('recusa o estilo %j', (estilo) => {
    expect(erroDe('estilo', estilo)).toBe('Escolha o estilo arquitetural da missão.');
  });

  it.each([[['blockchain']], [['ia', 'IA']]])('recusa as capacidades %j', (capacidades) => {
    expect(erroDe('capacidades', capacidades)).toBe('Marque só capacidades da lista.');
  });

  it.each([
    [undefined, []],
    [[], []],
    ['ia', ['ia']],
    [
      ['mobile', 'filas', 'mobile'],
      ['filas', 'mobile'],
    ],
  ])('aceita as capacidades %j e devolve %j (sem repetição, em ordem)', (capacidades, esperadas) => {
    const resultado = comCampo('capacidades', capacidades);
    expect(resultado.ok && resultado.dados.tipo === 'dev' && resultado.dados.capacidades).toEqual(esperadas);
  });

  it.each(['arquivado', 'Backlog', ''])('recusa o status %j', (status) => {
    expect(erroDe('status', status)).toBe('Escolha Backlog, Desenvolvimento ou Concluído.');
  });

  it.each([
    [[], 'Adicione de 1 a 20 stacks.'],
    [['  ', ''], 'Adicione de 1 a 20 stacks.'],
    [Array.from({ length: 21 }, (_, i) => `s${i}`), 'Adicione de 1 a 20 stacks.'],
  ])('recusa a lista de stacks %j', (stacks, mensagem) => {
    expect(erroDe('stacks', stacks)).toBe(mensagem);
  });

  it('conta as stacks depois de remover as repetidas', () => {
    const vinteMaisRepetida = [...Array.from({ length: 20 }, (_, i) => `s${i}`), 'S0'];
    expect(comCampo('stacks', vinteMaisRepetida).ok).toBe(true);
  });

  it('aponta a stack longa demais pelo nome', () => {
    const longa = 'x'.repeat(41);
    expect(erroDe('stacks', ['Go', longa])).toBe(`Cada stack aceita até 40 caracteres: "${longa}".`);
  });

  it('aceita uma única stack como texto (formulário com um só campo)', () => {
    const resultado = comCampo('stacks', 'Go');
    expect(resultado.ok && resultado.dados.stacks).toEqual(['Go']);
  });

  it('junta os erros de todos os campos inválidos de uma Missão de Desenvolvimento', () => {
    const resultado = validarFormularioMissao({ tipo: 'dev' }, 'criar');
    expect(resultado.ok).toBe(false);
    expect(Object.keys(resultado.ok ? {} : resultado.erros).sort()).toEqual(
      ['arquitetura', 'descricao', 'estilo', 'nome', 'stacks', 'status'].sort(),
    );
  });

  it('sem tipo, aponta o tipo e os campos comuns', () => {
    const resultado = validarFormularioMissao({}, 'criar');
    expect(resultado.ok ? {} : resultado.erros).toEqual({
      tipo: 'Escolha o tipo da missão: Desenvolvimento ou Geral.',
      nome: 'O nome precisa ter de 3 a 80 caracteres.',
      descricao: 'A descrição é obrigatória.',
      status: 'Escolha Backlog, Desenvolvimento ou Concluído.',
    });
  });

  it.each(['DEV', 'vendas', ''])('recusa o tipo %j', (tipo) => {
    expect(erroDe('tipo', tipo)).toBe('Escolha o tipo da missão: Desenvolvimento ou Geral.');
  });
});

describe('validarFormularioMissao: Missão Geral (RN-15)', () => {
  it('aceita sem stacks e sem arquitetura, e ignora os campos técnicos enviados', () => {
    const resultado = validarFormularioMissao(
      { ...GERAL, arquitetura: 'sobra do formulário', estilo: 'monolito', capacidades: ['ia'] },
      'criar',
    );
    expect(resultado).toEqual({
      ok: true,
      dados: {
        tipo: 'geral',
        nome: 'Revenda na Shopee',
        descricao: 'Testar a revenda de acessórios.',
        status: 'backlog',
        stacks: [],
        tags: ['Revenda'],
        links: [],
      },
    });
  });

  it('aceita até 20 ferramentas', () => {
    const vinte = Array.from({ length: 20 }, (_, i) => `f${i}`);
    const resultado = geralCom('stacks', vinte);
    expect(resultado.ok && resultado.dados.stacks).toEqual(vinte);
  });

  it('recusa 21 ferramentas', () => {
    const vinteEUma = Array.from({ length: 21 }, (_, i) => `f${i}`);
    expect(erroGeralDe('stacks', vinteEUma)).toBe('Adicione até 20 ferramentas.');
  });

  it('aponta a ferramenta longa demais pelo nome', () => {
    const longa = 'x'.repeat(41);
    expect(erroGeralDe('stacks', ['Canva', longa])).toBe(
      `Cada ferramenta aceita até 40 caracteres: "${longa}".`,
    );
  });

  it('junta os erros de uma Missão Geral sem os campos técnicos', () => {
    const resultado = validarFormularioMissao({ tipo: 'geral' }, 'criar');
    expect(Object.keys(resultado.ok ? {} : resultado.erros).sort()).toEqual(['descricao', 'nome', 'status']);
  });
});

describe('validarFormularioMissao: tags (RF-24)', () => {
  it('remove repetidas mantendo a primeira grafia', () => {
    const resultado = comCampo('tags', ['IA', 'ia', ' Vendas ']);
    expect(resultado.ok && resultado.dados.tags).toEqual(['IA', 'Vendas']);
  });

  it('aceita uma única tag como texto', () => {
    const resultado = comCampo('tags', 'Vídeo');
    expect(resultado.ok && resultado.dados.tags).toEqual(['Vídeo']);
  });

  it('sem o campo, a Missão fica sem tags', () => {
    const resultado = comCampo('tags', undefined);
    expect(resultado.ok && resultado.dados.tags).toEqual([]);
  });

  it('recusa 11 tags', () => {
    expect(
      erroDe(
        'tags',
        Array.from({ length: 11 }, (_, i) => `t${i}`),
      ),
    ).toBe('Use até 10 tags.');
  });

  it('aponta a tag longa demais pelo nome', () => {
    const longa = 'x'.repeat(31);
    expect(erroDe('tags', ['IA', longa])).toBe(`Cada tag aceita até 30 caracteres: "${longa}".`);
  });
});

describe('validarFormularioMissao: links (RF-26, RN-17)', () => {
  function comLinks(urls: unknown, titulos: unknown) {
    return validarFormularioMissao({ ...VALIDA, link_url: urls, link_titulo: titulos }, 'criar');
  }

  function erroDosLinks(urls: unknown, titulos: unknown): string | undefined {
    const resultado = comLinks(urls, titulos);
    return resultado.ok ? undefined : resultado.erros.links;
  }

  it('junta endereço e título pela posição, normaliza o endereço e troca título vazio por null', () => {
    const resultado = comLinks([' HTTPS://Exemplo.com ', 'https://youtu.be/abc'], ['  ', ' Vídeo base ']);
    expect(resultado.ok && resultado.dados.links).toEqual([
      { url: 'https://exemplo.com/', titulo: null },
      { url: 'https://youtu.be/abc', titulo: 'Vídeo base' },
    ]);
  });

  it('descarta a linha sem endereço, mesmo com título', () => {
    const resultado = comLinks(['', 'https://exemplo.com/'], ['título solto', '']);
    expect(resultado.ok && resultado.dados.links).toEqual([{ url: 'https://exemplo.com/', titulo: null }]);
  });

  it('aceita um único link como texto e título ausente', () => {
    const resultado = comLinks('https://exemplo.com/', undefined);
    expect(resultado.ok && resultado.dados.links).toEqual([{ url: 'https://exemplo.com/', titulo: null }]);
  });

  it.each(['javascript:alert(1)', 'http://exemplo.com', 'exemplo.com'])('recusa o endereço %j', (url) => {
    expect(erroDosLinks(['https://ok.com/', url], [])).toBe(
      'Link 2: o endereço precisa começar com https:// e ser válido.',
    );
  });

  it('recusa endereço com usuário ou senha', () => {
    expect(erroDosLinks(['https://u:s@exemplo.com'], [])).toBe(
      'Link 1: tire o usuário e a senha do endereço.',
    );
  });

  it('recusa endereço longo demais', () => {
    expect(erroDosLinks([`https://exemplo.com/${'a'.repeat(2000)}`], [])).toBe(
      'Link 1: o endereço aceita até 2.000 caracteres.',
    );
  });

  it('recusa título com mais de 80 caracteres', () => {
    expect(erroDosLinks(['https://exemplo.com/'], ['x'.repeat(81)])).toBe(
      'Link 1: o título aceita até 80 caracteres.',
    );
  });

  it('recusa 21 links', () => {
    const urls = Array.from({ length: 21 }, (_, i) => `https://exemplo.com/${i}`);
    expect(erroDosLinks(urls, [])).toBe('Adicione até 20 links.');
  });
});

describe('validarFormularioMissao: modo editar', () => {
  it('não lê o status: a edição não muda o status', () => {
    const resultado = validarFormularioMissao({ ...VALIDA, status: 'concluido' }, 'editar');
    expect(resultado.ok && resultado.dados.status).toBeNull();
  });

  it('aceita a edição sem o campo status', () => {
    const { status: _status, ...semStatus } = VALIDA;
    expect(validarFormularioMissao(semStatus, 'editar').ok).toBe(true);
  });
});

describe('mensagemDoErroDoBanco', () => {
  it('nome repetido vira erro no campo nome', () => {
    expect(mensagemDoErroDoBanco('23505')).toEqual({
      campo: 'nome',
      mensagem: 'Já existe uma missão com esse nome. Escolha outro.',
    });
  });

  it('Missão inexistente ou de outro usuário vira aviso geral', () => {
    expect(mensagemDoErroDoBanco('P0002')).toEqual({
      campo: null,
      mensagem: 'Esta missão não existe mais.',
    });
  });

  it.each(['23514', '22023'])('regra violada no banco (%s) pede revisão dos campos', (codigo) => {
    expect(mensagemDoErroDoBanco(codigo)).toEqual({
      campo: null,
      mensagem: 'Algum campo está fora das regras. Revise e tente de novo.',
    });
  });

  it.each(['08006', undefined])('erro inesperado (%s) vira mensagem genérica', (codigo) => {
    expect(mensagemDoErroDoBanco(codigo)).toEqual({
      campo: null,
      mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.',
    });
  });
});
