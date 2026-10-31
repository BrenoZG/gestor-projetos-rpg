import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { cadastrarMissao, excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';

/** Critérios WCAG verificados automaticamente (o axe cobre só uma parte da WCAG). */
const NIVEIS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function semViolacoes(pagina: Page, tela: string): Promise<void> {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(NIVEIS_WCAG).analyze();
  const resumo = resultado.violations.map((v) => `${v.id}: ${v.nodes.length} nó(s) — ${v.help}`);
  expect(resumo, `violações de acessibilidade em ${tela}`).toEqual([]);
}

// Movimento reduzido: o axe mede contraste no estado final, não no meio de uma animação de entrada.
test.use({ reducedMotion: 'reduce' });

test('telas dos Projetos sem violações de acessibilidade (axe, WCAG 2.2 AA)', async ({ page }) => {
  await cadastrarMissao(page, { nome: nomeUnico('Projeto acessível'), stacks: 'Next.js,Supabase,' });
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  await semViolacoes(page, 'detalhe');
  const urlMissao = page.url();

  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await semViolacoes(page, 'diálogo de exclusão');
  await page.keyboard.press('Escape');

  await page.goto(`${urlMissao}/editar`);
  await expect(page.getByRole('textbox', { name: 'Nome' })).toBeVisible();
  await semViolacoes(page, 'edição');

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Backlog' })).toBeVisible();
  await semViolacoes(page, 'Quadro');

  await page.goto('/missoes/nova');
  await page.getByRole('button', { name: 'Registrar projeto' }).click();
  await expect(page.getByText('A descrição é obrigatória.')).toBeVisible();
  await semViolacoes(page, 'cadastro com erros');

  await page.goto(urlMissao);
  await excluirMissaoAberta(page);
});
