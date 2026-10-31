import { describe, expect, it } from 'vitest';

import { conquistaPendente } from '@/dominio/progressao/conquista';

describe('conquistaPendente', () => {
  it('sem nível novo, não há cinemática (RN-08: toca uma vez)', () => {
    expect(conquistaPendente(23, 23)).toBeNull();
  });

  it('nível conquistado abaixo do visto também não toca de novo', () => {
    expect(conquistaPendente(23, 9)).toBeNull();
  });

  it('subir um nível sem medalha nem troca de Rank', () => {
    expect(conquistaPendente(3, 4)).toEqual({
      de: 3,
      para: 4,
      rankAntes: 'E',
      rankDepois: 'E',
      medalha: null,
    });
  });

  it('chegar ao 20 traz a medalha Prata e o Rank D', () => {
    const conquista = conquistaPendente(19, 20);
    expect(conquista).toMatchObject({ de: 19, para: 20, rankAntes: 'E', rankDepois: 'D' });
    expect(conquista?.medalha).toMatchObject({ nome: 'Prata', nivel: 20, titulo: 'Desenvolvedor Aprendiz' });
  });

  it('vários níveis de uma vez viram uma conquista só, com a medalha mais alta', () => {
    const conquista = conquistaPendente(8, 31);
    expect(conquista).toMatchObject({ de: 8, para: 31, rankAntes: 'E', rankDepois: 'C' });
    expect(conquista?.medalha?.nome).toBe('Ouro');
  });

  it('a medalha do nível visto não conta de novo', () => {
    expect(conquistaPendente(10, 11)?.medalha).toBeNull();
  });

  it('recusa nível fora de 1..100', () => {
    expect(() => conquistaPendente(0, 5)).toThrow(RangeError);
    expect(() => conquistaPendente(5, 101)).toThrow(RangeError);
  });
});
