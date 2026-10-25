import { describe, expect, it } from 'vitest';

import { mensagemDoErroDoBanco, validarFormularioMissao } from '@/acoes/missoes-validacao';

const VALIDA = {
  nome: '  Gestor de Projetos ',
  descricao: ' Um lugar para todas as ideias. ',
  arquitetura: '',
  dificuldade: '3',
  status: 'backlog',
  stacks: ['Next.js', ' next.js', 'Supabase'],
};

function comCampo(campo: string, valor: unknown) {
  return validarFormularioMissao({ ...VALIDA, [campo]: valor });
}

function erroDe(campo: string, valor: unknown): string | undefined {
  const resultado = comCampo(campo, valor);
  return resultado.ok ? undefined : resultado.erros[campo as keyof typeof resultado.erros];
}

describe('validarFormularioMissao', () => {
  it('aceita uma Missão válida e devolve os dados limpos', () => {
    expect(validarFormularioMissao(VALIDA)).toEqual({
      ok: true,
      dados: {
        nome: 'Gestor de Projetos',
        descricao: 'Um lugar para todas as ideias.',
        arquitetura: null,
        dificuldade: 3,
        status: 'backlog',
        stacks: ['Next.js', 'Supabase'],
      },
    });
  });

  it('mantém a estrutura preenchida', () => {
    const resultado = comCampo('arquitetura', '# Camadas\n- domínio');
    expect(resultado.ok && resultado.dados.arquitetura).toBe('# Camadas\n- domínio');
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

  it.each(['0', '6', '2.5', 'abc', ''])('recusa a dificuldade %j', (dificuldade) => {
    expect(erroDe('dificuldade', dificuldade)).toBe('Escolha uma dificuldade de 1 (Trivial) a 5 (Extremo).');
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

  it('junta os erros de todos os campos inválidos', () => {
    const resultado = validarFormularioMissao({});
    expect(resultado.ok).toBe(false);
    expect(Object.keys(resultado.ok ? {} : resultado.erros).sort()).toEqual(
      ['descricao', 'dificuldade', 'nome', 'stacks', 'status'].sort(),
    );
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
