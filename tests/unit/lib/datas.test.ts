import { describe, expect, it } from 'vitest';

import { formatarDataHora } from '@/lib/datas';

describe('formatarDataHora', () => {
  it('exibe no fuso de São Paulo (RNF-05): 12:00 UTC vira 09:00', () => {
    expect(formatarDataHora('2026-10-25T12:00:00+00:00')).toMatch(/25\/10\/2026.*09:00/);
  });

  it('vira o dia certo perto da meia-noite UTC', () => {
    expect(formatarDataHora('2026-10-26T01:30:00Z')).toMatch(/25\/10\/2026.*22:30/);
  });

  it('mostra um travessão quando não há data', () => {
    expect(formatarDataHora(null)).toBe('—');
  });
});
