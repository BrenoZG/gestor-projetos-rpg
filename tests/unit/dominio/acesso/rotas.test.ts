import { describe, expect, it } from 'vitest';

import { decidirRedirecionamento } from '@/dominio/acesso/rotas';

describe('decidirRedirecionamento', () => {
  it.each(['/', '/projetos', '/ficha', '/entrarx', '/autenticar', '/api/saude/detalhe'])(
    'manda quem não está logado de %s para /entrar',
    (caminho) => {
      expect(decidirRedirecionamento({ caminho, logado: false })).toBe('/entrar');
    },
  );

  it.each(['/entrar', '/auth/callback', '/api/saude'])(
    'deixa %s aberto para quem não está logado',
    (caminho) => {
      expect(decidirRedirecionamento({ caminho, logado: false })).toBeNull();
    },
  );

  it('manda quem já está logado de /entrar para o Quadro de Missões', () => {
    expect(decidirRedirecionamento({ caminho: '/entrar', logado: true })).toBe('/');
  });

  it.each(['/', '/projetos', '/auth/callback', '/api/saude'])(
    'não redireciona quem está logado em %s',
    (caminho) => {
      expect(decidirRedirecionamento({ caminho, logado: true })).toBeNull();
    },
  );
});
