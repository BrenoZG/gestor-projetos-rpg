import { describe, expect, it } from 'vitest';

import { ehUuid } from '@/lib/uuid';

describe('ehUuid', () => {
  it.each(['8b9cad0e-1d2f-4a3b-9c4d-5e6f7a8b9c0d', '8B9CAD0E-1D2F-4A3B-9C4D-5E6F7A8B9C0D'])(
    'aceita %s',
    (valor) => {
      expect(ehUuid(valor)).toBe(true);
    },
  );

  it.each([
    '',
    'nova',
    '8b9cad0e-1d2f-4a3b-9c4d-5e6f7a8b9c0',
    '8b9cad0e-1d2f-4a3b-9c4d-5e6f7a8b9c0dx',
    '8b9cad0e1d2f4a3b9c4d5e6f7a8b9c0d',
    "8b9cad0e-1d2f-4a3b-9c4d-5e6f7a8b9c0d' or '1'='1",
  ])('recusa %j', (valor) => {
    expect(ehUuid(valor)).toBe(false);
  });
});
