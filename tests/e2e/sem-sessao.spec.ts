import AxeBuilder from '@axe-core/playwright';

import { expect, test } from './apoio/fixtures';

for (const caminho of ['/', '/missoes/nova', '/missoes/00000000-0000-4000-8000-000000000000']) {
  test(`sem sessão, ${caminho} leva à tela de entrada`, async ({ page }) => {
    await page.goto(caminho);
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('heading', { name: /Identifique-se/ })).toBeVisible();
    await expect(page.getByText('[ SISTEMA ] · NOVO AVENTUREIRO', { exact: true })).toBeVisible();
  });
}

test('tela de entrada sem violações de acessibilidade (axe, WCAG 2.2 AA)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/entrar?erro=acesso-negado');
  await expect(page.getByRole('alert').filter({ hasText: 'Acesso recusado' })).toBeVisible();
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
