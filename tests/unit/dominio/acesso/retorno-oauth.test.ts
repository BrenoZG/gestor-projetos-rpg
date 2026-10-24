import { describe, expect, it } from 'vitest';

import type { Identidade } from '@/dominio/acesso/allowlist';
import { processarRetornoOAuth, type PortaAutenticacao } from '@/dominio/acesso/retorno-oauth';

const ALLOWLIST = ['123'];
const IDENTIDADE_DO_DONO: Identidade = { provider: 'github', id: '123' };

type Configuracao = {
  trocaOk?: boolean;
  identidades?: readonly Identidade[] | null;
  personagemOk?: boolean;
};

/** Implementação falsa da porta: devolve o configurado e registra as chamadas. */
function criarPortaFalsa({
  trocaOk = true,
  identidades = [IDENTIDADE_DO_DONO],
  personagemOk = true,
}: Configuracao = {}) {
  const chamadas: string[] = [];
  const porta: PortaAutenticacao = {
    async trocarCodigoPorSessao(codigo) {
      chamadas.push(`trocar:${codigo}`);
      return trocaOk;
    },
    async lerIdentidades() {
      chamadas.push('identidades');
      return identidades;
    },
    async garantirPersonagem() {
      chamadas.push('personagem');
      return personagemOk;
    },
    async encerrarSessao() {
      chamadas.push('encerrar');
    },
  };
  return { porta, chamadas };
}

describe('processarRetornoOAuth', () => {
  it('autoriza o dono e garante o personagem', async () => {
    const { porta, chamadas } = criarPortaFalsa();
    const resultado = await processarRetornoOAuth({ codigo: 'abc', codigoErro: null }, ALLOWLIST, porta);

    expect(resultado).toEqual({ tipo: 'autorizado' });
    expect(chamadas).toEqual(['trocar:abc', 'identidades', 'personagem']);
  });

  it('nega quem está fora da allowlist, encerra a sessão e não cria personagem', async () => {
    const { porta, chamadas } = criarPortaFalsa({ identidades: [{ provider: 'github', id: '999' }] });
    const resultado = await processarRetornoOAuth({ codigo: 'abc', codigoErro: null }, ALLOWLIST, porta);

    expect(resultado).toEqual({ tipo: 'recusado', motivo: 'acesso-negado', causa: 'fora-da-allowlist' });
    expect(chamadas).toEqual(['trocar:abc', 'identidades', 'encerrar']);
  });

  it('trata cadastro desligado no Supabase como acesso negado, sem chamar o Supabase', async () => {
    const { porta, chamadas } = criarPortaFalsa();
    const resultado = await processarRetornoOAuth(
      { codigo: null, codigoErro: 'signup_disabled' },
      ALLOWLIST,
      porta,
    );

    expect(resultado).toEqual({ tipo: 'recusado', motivo: 'acesso-negado', causa: 'cadastro-desligado' });
    expect(chamadas).toEqual([]);
  });

  it('trata outro erro do provedor como falha de login', async () => {
    const { porta, chamadas } = criarPortaFalsa();
    const resultado = await processarRetornoOAuth(
      { codigo: null, codigoErro: 'access_denied' },
      ALLOWLIST,
      porta,
    );

    expect(resultado).toEqual({ tipo: 'recusado', motivo: 'falha-login', causa: 'erro-do-provedor' });
    expect(chamadas).toEqual([]);
  });

  it.each([null, ''])('recusa retorno sem código (%j) sem chamar o Supabase', async (codigo) => {
    const { porta, chamadas } = criarPortaFalsa();
    const resultado = await processarRetornoOAuth({ codigo, codigoErro: null }, ALLOWLIST, porta);

    expect(resultado).toEqual({ tipo: 'recusado', motivo: 'falha-login', causa: 'sem-codigo' });
    expect(chamadas).toEqual([]);
  });

  it('recusa quando a troca do código falha, sem ler identidades', async () => {
    const { porta, chamadas } = criarPortaFalsa({ trocaOk: false });
    const resultado = await processarRetornoOAuth({ codigo: 'abc', codigoErro: null }, ALLOWLIST, porta);

    expect(resultado).toEqual({ tipo: 'recusado', motivo: 'falha-login', causa: 'troca-falhou' });
    expect(chamadas).toEqual(['trocar:abc']);
  });

  it('encerra a sessão quando não consegue ler o usuário', async () => {
    const { porta, chamadas } = criarPortaFalsa({ identidades: null });
    const resultado = await processarRetornoOAuth({ codigo: 'abc', codigoErro: null }, ALLOWLIST, porta);

    expect(resultado).toEqual({ tipo: 'recusado', motivo: 'falha-login', causa: 'usuario-indisponivel' });
    expect(chamadas).toEqual(['trocar:abc', 'identidades', 'encerrar']);
  });

  it('encerra a sessão quando não consegue criar o personagem', async () => {
    const { porta, chamadas } = criarPortaFalsa({ personagemOk: false });
    const resultado = await processarRetornoOAuth({ codigo: 'abc', codigoErro: null }, ALLOWLIST, porta);

    expect(resultado).toEqual({ tipo: 'recusado', motivo: 'falha-login', causa: 'personagem-falhou' });
    expect(chamadas).toEqual(['trocar:abc', 'identidades', 'personagem', 'encerrar']);
  });
});
