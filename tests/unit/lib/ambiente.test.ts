import { describe, expect, it } from 'vitest';

import { lerAmbiente } from '@/lib/ambiente';

const ambienteValido = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'chave-anon-de-teste-com-mais-de-20-caracteres',
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

  it('rejeita allowlist com valor não numérico', () => {
    expect(() => lerAmbiente({ ...ambienteValido, ALLOWLIST_GITHUB_IDS: 'abc' })).toThrow(
      /ALLOWLIST_GITHUB_IDS/,
    );
  });

  it('nunca expõe o valor de um segredo na mensagem de erro', () => {
    const segredo = 'curto';
    try {
      lerAmbiente({ ...ambienteValido, NEXT_PUBLIC_SUPABASE_ANON_KEY: segredo, CRON_SECRET: segredo });
      expect.unreachable();
    } catch (erro) {
      expect(String(erro)).not.toContain(segredo);
    }
  });

  it('aceita CRON_SECRET ausente (só é exigido no deploy)', () => {
    expect(lerAmbiente(ambienteValido).CRON_SECRET).toBeUndefined();
  });
});
