import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { definirPersonagemDoUsuarioDeTeste, zerarXpDoUsuarioDeTeste } from './apoio/banco-local';
import { cadastrarMissao, excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';

/** Critérios WCAG verificados automaticamente (o axe cobre só uma parte da WCAG). */
const NIVEIS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const hud = (pagina: Page) => pagina.getByRole('banner');

/** Marca a Classe clicando no cartão, como a pessoa faz (o rádio nativo fica visualmente oculto). */
async function marcarClasse(pagina: Page, nome: string): Promise<void> {
  await pagina.locator('label').filter({ hasText: nome }).click();
  await expect(pagina.getByRole('radio', { name: new RegExp(`^${nome}`) })).toBeChecked();
}

async function semViolacoesAxe(pagina: Page, onde: string): Promise<void> {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(NIVEIS_WCAG).analyze();
  expect(
    resultado.violations.map((v) => `${v.id}: ${v.help}`),
    `axe em ${onde}`,
  ).toEqual([]);
}

async function semRolagemHorizontal(pagina: Page): Promise<boolean> {
  return pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

// O personagem é do usuário de teste, compartilhado entre os specs (em série):
// cada teste daqui deixa a Classe e o nível máximo como o setup os criou.
test.afterEach(() => {
  definirPersonagemDoUsuarioDeTeste({ classe: 'arquimago_dados' });
});

test.describe('Classe (RF-17, RF-18, RN-11)', () => {
  test('no 1º acesso, sem Classe, o Quadro manda para a escolha; confirmar abre o Quadro', async ({
    page,
  }) => {
    definirPersonagemDoUsuarioDeTeste({ classe: null });

    await page.goto('/');
    await expect(page).toHaveURL(/\/classe$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Escolha sua classe' })).toBeVisible();
    await expect(page.getByRole('banner'), 'a escolha vem antes do HUD').toHaveCount(0);
    await expect(page.getByRole('radio')).toHaveCount(8);
    await semViolacoesAxe(page, '/classe');

    await marcarClasse(page, 'Sombra da Segurança');
    await page.getByRole('button', { name: 'Confirmar classe' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(hud(page).getByText('Sombra da Segurança')).toBeVisible();
  });

  test('confirmar sem escolher não sai da tela', async ({ page }) => {
    definirPersonagemDoUsuarioDeTeste({ classe: null });
    await page.goto('/classe');
    await page.getByRole('button', { name: 'Confirmar classe' }).click();
    await expect(page).toHaveURL(/\/classe$/);
  });

  test('quem já tem Classe e abre /classe volta ao Quadro', async ({ page }) => {
    await page.goto('/classe');
    await expect(page).toHaveURL(/\/$/);
  });

  test('trocar pela página do Personagem é livre e não muda XP, nível nem Rank', async ({ page }) => {
    zerarXpDoUsuarioDeTeste();
    const nome = nomeUnico('Troca de classe');
    await cadastrarMissao(page, { nome, stacks: 'TypeScript,' });

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Personagem' })
      .click();
    await expect(page).toHaveURL(/\/personagem$/);
    const progressoAntes = await hud(page).getByRole('progressbar').first().getAttribute('aria-valuenow');
    const rankAntes = await hud(page)
      .getByText(/^RANK [EDCBAS] · AVENTUREIRO$/)
      .textContent();
    await expect(page.getByRole('heading', { level: 2, name: 'Arquimago de Dados' })).toBeVisible();

    await page.getByText('Trocar classe', { exact: true }).click();
    await expect(page.getByRole('radio', { name: /^Arquimago de Dados/ })).toBeChecked();
    await marcarClasse(page, 'Invocador de IA');
    await page.getByRole('button', { name: 'Salvar nova classe' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Classe trocada' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Invocador de IA' })).toBeVisible();
    await expect(hud(page).getByText('Invocador de IA')).toBeVisible();
    await expect(hud(page).getByRole('progressbar').first()).toHaveAttribute(
      'aria-valuenow',
      progressoAntes ?? '',
    );
    await expect(hud(page).getByText(/^RANK [EDCBAS] · AVENTUREIRO$/)).toHaveText(rankAntes ?? '');

    await page.goto('/');
    await page.getByRole('link', { name: nome }).first().click();
    await excluirMissaoAberta(page);
  });
});

test.describe('Medalhas (RF-15, RN-08)', () => {
  test('o nível máximo vale mesmo com o XP zerado: Bronze e Prata conquistadas, Ouro bloqueada', async ({
    page,
  }) => {
    zerarXpDoUsuarioDeTeste();
    definirPersonagemDoUsuarioDeTeste({ classe: 'arquimago_dados', nivelMaximo: 23 });

    await page.goto('/personagem');
    await expect(page.getByRole('heading', { level: 2, name: 'MEDALHAS · 2 DE 10' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Medalha Bronze, nível 10, conquistada' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Medalha Prata, nível 20, conquistada' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Medalha Ouro, nível 30, bloqueada' })).toBeVisible();
    await expect(page.getByText('Bloqueada · faltam 7 níveis')).toBeVisible();
    await expect(page.getByRole('img', { name: /, bloqueada$/ })).toHaveCount(8);
    await semViolacoesAxe(page, '/personagem');

    await page.goto('/');
    await expect(page.getByRole('definition').filter({ hasText: '2 / 10' })).toBeVisible();
  });

  test('no celular (360 px), Personagem e escolha da Classe não rolam na horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/personagem');
    await expect(page.getByRole('heading', { level: 1, name: 'Personagem' })).toBeVisible();
    expect(await semRolagemHorizontal(page), '/personagem').toBe(true);

    definirPersonagemDoUsuarioDeTeste({ classe: null });
    await page.goto('/classe');
    await expect(page.getByRole('radio')).toHaveCount(8);
    expect(await semRolagemHorizontal(page), '/classe').toBe(true);
  });
});
