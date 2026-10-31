import { describe, expect, it } from 'vitest';

import { recompensaDaConclusao } from '@/dominio/gamificacao/recompensa';

describe('recompensaDaConclusao', () => {
  it('mostra o XP que o banco gravou, com a trilha', () => {
    expect(recompensaDaConclusao({ concede: true, xp: 157 }, 157, 'desenvolvedor')).toEqual({
      tipo: 'xp',
      xp: 157,
      trilha: 'desenvolvedor',
    });
  });

  it('diz que o XP já foi recebido quando a trava passou, mas o banco não gravou evento novo (RN-06a)', () => {
    expect(recompensaDaConclusao({ concede: true, xp: 157 }, null, 'produtividade')).toEqual({
      tipo: 'ja_recebido',
    });
  });

  it('explica a trava com as horas que faltaram (RN-06d)', () => {
    expect(recompensaDaConclusao({ concede: false, horasRestantes: 21 }, null, 'desenvolvedor')).toEqual({
      tipo: 'trava',
      horasRestantes: 21,
    });
  });
});
