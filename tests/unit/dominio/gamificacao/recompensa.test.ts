import { describe, expect, it } from 'vitest';

import { recompensaDaConclusao, textoDaRecompensa } from '@/dominio/gamificacao/recompensa';

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

  it('diz que o XP já foi recebido quando o domínio já sabia disso', () => {
    expect(recompensaDaConclusao({ concede: false, motivo: 'ja_recebido' }, null, 'desenvolvedor')).toEqual({
      tipo: 'ja_recebido',
    });
  });

  it('explica a trava com as horas que faltaram (RN-06d)', () => {
    expect(
      recompensaDaConclusao({ concede: false, motivo: 'trava', horasRestantes: 21 }, null, 'desenvolvedor'),
    ).toEqual({
      tipo: 'trava',
      horasRestantes: 21,
    });
  });
});

describe('textoDaRecompensa', () => {
  it('anuncia o XP e a trilha', () => {
    expect(textoDaRecompensa({ tipo: 'xp', xp: 157, trilha: 'desenvolvedor' }, 'projeto')).toEqual({
      titulo: '+157 XP',
      detalhe: 'Trilha Desenvolvedor.',
    });
    expect(textoDaRecompensa({ tipo: 'xp', xp: 20, trilha: 'produtividade' }, 'atualizacao')).toEqual({
      titulo: '+20 XP',
      detalhe: 'Trilha Produtividade.',
    });
  });

  it('explica a trava, as horas que faltaram e que voltar para Desenvolvimento recomeça a contagem', () => {
    expect(textoDaRecompensa({ tipo: 'trava', horasRestantes: 21 }, 'projeto')).toEqual({
      titulo: 'Concluído, sem XP.',
      detalhe:
        'A recompensa exige 24 h em Desenvolvimento e faltaram 21 h. Para ganhar o XP, volte o projeto para Desenvolvimento e conclua depois de 24 h.',
    });
  });

  it('diz que o XP do item já foi recebido', () => {
    expect(textoDaRecompensa({ tipo: 'ja_recebido' }, 'projeto').detalhe).toBe(
      'O XP deste projeto já foi recebido antes.',
    );
    expect(textoDaRecompensa({ tipo: 'ja_recebido' }, 'atualizacao').detalhe).toBe(
      'O XP desta atualização já foi recebido antes.',
    );
  });
});
