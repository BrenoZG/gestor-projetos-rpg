import { describe, expect, it } from 'vitest';

import { mensagemDoErroDaAtualizacao, validarFormularioAtualizacao } from '@/acoes/atualizacoes-validacao';

const MISSAO = '00000000-0000-4000-8000-000000000001';

const VALIDA = {
  titulo: '  Corrige o login no Safari ',
  descricao: ' O cookie de sessão não era renovado.\n\nAgora é. ',
  projetoId: MISSAO,
};

function erroDe(campo: string, valor: unknown): string | undefined {
  const resultado = validarFormularioAtualizacao({ ...VALIDA, [campo]: valor });
  return resultado.ok ? undefined : resultado.erros[campo as keyof typeof resultado.erros];
}

describe('validarFormularioAtualizacao', () => {
  it('aceita uma Atualização válida e devolve os dados limpos', () => {
    expect(validarFormularioAtualizacao(VALIDA)).toEqual({
      ok: true,
      dados: {
        titulo: 'Corrige o login no Safari',
        descricao: 'O cookie de sessão não era renovado.\n\nAgora é.',
        projetoId: MISSAO,
      },
    });
  });

  it.each([
    ['Ab', 'O título precisa ter de 3 a 120 caracteres.'],
    ['   ab  ', 'O título precisa ter de 3 a 120 caracteres.'],
    ['t'.repeat(121), 'O título precisa ter de 3 a 120 caracteres.'],
    [undefined, 'O título precisa ter de 3 a 120 caracteres.'],
  ])('recusa o título %j', (titulo, mensagem) => {
    expect(erroDe('titulo', titulo)).toBe(mensagem);
  });

  it.each(['Abc', 't'.repeat(120)])('aceita título nas fronteiras (%j)', (titulo) => {
    expect(validarFormularioAtualizacao({ ...VALIDA, titulo }).ok).toBe(true);
  });

  it.each([
    ['', 'Descreva o que foi feito.'],
    ['   ', 'Descreva o que foi feito.'],
    [undefined, 'Descreva o que foi feito.'],
    ['d'.repeat(5001), 'A descrição aceita até 5.000 caracteres.'],
  ])('recusa a descrição %j', (descricao, mensagem) => {
    expect(erroDe('descricao', descricao)).toBe(mensagem);
  });

  it.each(['nao-e-uuid', '', undefined, 42])('recusa a Missão %j', (projetoId) => {
    expect(erroDe('projetoId', projetoId)).toBe('Escolha uma das suas missões.');
  });

  it('junta os erros de todos os campos inválidos', () => {
    const resultado = validarFormularioAtualizacao({});
    expect(resultado.ok ? [] : Object.keys(resultado.erros).sort()).toEqual([
      'descricao',
      'projetoId',
      'titulo',
    ]);
  });
});

describe('mensagemDoErroDaAtualizacao', () => {
  it('Missão de outro usuário ou inexistente (RLS, 42501) vira erro no campo da Missão', () => {
    expect(mensagemDoErroDaAtualizacao('42501')).toEqual({
      campo: 'projetoId',
      mensagem: 'Escolha uma das suas missões.',
    });
  });

  it('Missão apagada no meio do caminho (FK, 23503) também', () => {
    expect(mensagemDoErroDaAtualizacao('23503')).toEqual({
      campo: 'projetoId',
      mensagem: 'Escolha uma das suas missões.',
    });
  });

  it('regra violada no banco (23514) pede revisão dos campos', () => {
    expect(mensagemDoErroDaAtualizacao('23514')).toEqual({
      campo: null,
      mensagem: 'Algum campo está fora das regras. Revise e tente de novo.',
    });
  });

  it.each(['08006', undefined])('erro inesperado (%s) vira mensagem genérica', (codigo) => {
    expect(mensagemDoErroDaAtualizacao(codigo)).toEqual({
      campo: null,
      mensagem: 'Não foi possível salvar agora. Tente de novo em instantes.',
    });
  });
});
