import { describe, expect, it } from 'vitest';

import { lerAmbiente, lerAmbientePublico } from '@/lib/ambiente';

const ambienteValido = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_chave-de-teste-com-tamanho-valido',
  ALLOWLIST_GITHUB_IDS: '123,456',
};

describe('lerAmbiente', () => {
  it('aceita um ambiente completo e converte a allowlist em lista de IDs', () => {
    const ambiente = lerAmbiente(ambienteValido);
    expect(ambiente.ALLOWLIST_GITHUB_IDS).toEqual(['123', '456']);
  });

  it('rejeita URL ausente citando o nome do campo', () => {
    const { NEXT_PUBLIC_SUPABASE_URL: _removida, ...semUrl } = ambienteValido;
    expect(() => lerAmbiente(semUrl)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('rejeita publishable key ausente citando o nome do campo', () => {
    const { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: _removida, ...semChave } = ambienteValido;
    expect(() => lerAmbiente(semChave)).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it('rejeita allowlist com valor não numérico', () => {
    expect(() => lerAmbiente({ ...ambienteValido, ALLOWLIST_GITHUB_IDS: 'abc' })).toThrow(
      /ALLOWLIST_GITHUB_IDS/,
    );
  });

  it('nunca expõe o valor de um segredo na mensagem de erro', () => {
    const segredo = 'curto';
    try {
      lerAmbiente({ ...ambienteValido, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: segredo, CRON_SECRET: segredo });
      expect.unreachable();
    } catch (erro) {
      expect(String(erro)).not.toContain(segredo);
    }
  });

  it('aceita CRON_SECRET ausente (só é exigido no deploy)', () => {
    expect(lerAmbiente(ambienteValido).CRON_SECRET).toBeUndefined();
  });

  it('trata CRON_SECRET vazio como ausente (linha "CRON_SECRET=" copiada do .env.example)', () => {
    expect(lerAmbiente({ ...ambienteValido, CRON_SECRET: '' }).CRON_SECRET).toBeUndefined();
  });
});

describe('lerAmbientePublico', () => {
  const ambientePublico = {
    NEXT_PUBLIC_SUPABASE_URL: ambienteValido.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ambienteValido.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  it('aceita só as variáveis públicas, sem exigir a allowlist', () => {
    expect(lerAmbientePublico(ambientePublico)).toEqual(ambientePublico);
  });

  it('descarta variáveis privadas presentes na fonte', () => {
    expect(lerAmbientePublico(ambienteValido)).not.toHaveProperty('ALLOWLIST_GITHUB_IDS');
  });

  it('rejeita URL inválida citando o nome do campo', () => {
    expect(() => lerAmbientePublico({ ...ambientePublico, NEXT_PUBLIC_SUPABASE_URL: 'nao-e-url' })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});
