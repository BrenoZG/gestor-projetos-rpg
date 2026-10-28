import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { cadastrarMissao, excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';
import { semearAtualizacoes } from './apoio/semear';

const lista = (pagina: Page) => pagina.getByRole('list', { name: 'Atualizações encontradas' });
const titulos = (pagina: Page) => lista(pagina).getByRole('heading', { level: 4 });

/** Registra uma Atualização pela ficha da Missão aberta. */
async function registrar(pagina: Page, titulo: string) {
  const formulario = pagina.getByRole('form', { name: 'Nova atualização' });
  await formulario.getByRole('textbox', { name: 'Título' }).fill(titulo);
  await formulario.getByRole('textbox', { name: 'Descrição' }).fill(`Detalhes de ${titulo}.`);
  await formulario.getByRole('button', { name: 'Registrar atualização' }).click();
  await expect(pagina.getByRole('heading', { level: 4, name: titulo })).toBeVisible();
}

const idDaUrl = (url: string) => new URL(url).pathname.split('/').pop()!;

test.describe('Página geral de Atualizações (RF-10)', () => {
  test('reúne as Atualizações de todas as Missões e filtra por Missão e por status', async ({ page }) => {
    const gestor = nomeUnico('Gestor geral');
    const agenda = nomeUnico('Agenda geral');
    await cadastrarMissao(page, { nome: gestor, stacks: 'Go,' });
    const urlGestor = page.url();
    await registrar(page, 'Ajuste do Gestor');
    await cadastrarMissao(page, { nome: agenda, stacks: 'Go,' });
    const urlAgenda = page.url();
    await registrar(page, 'Ajuste da Agenda');

    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Atualizações' })
      .click();
    await expect(page).toHaveURL(/\/atualizacoes$/);
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Atualizações' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(titulos(page)).toHaveText(['Ajuste da Agenda', 'Ajuste do Gestor']);
    await expect(page.getByRole('form', { name: 'Nova atualização' }), 'aqui não se cadastra').toHaveCount(0);
    await expect(
      lista(page).getByRole('link', { name: agenda }),
      'cada item leva à Missão dele',
    ).toHaveAttribute('href', new URL(urlAgenda).pathname);

    const filtros = page.getByRole('search', { name: 'Filtrar atualizações' });
    await filtros.getByRole('combobox', { name: 'Missão' }).selectOption({ label: gestor });
    await filtros.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page).toHaveURL(new RegExp(`missao=${idDaUrl(urlGestor)}`));
    await expect(titulos(page)).toHaveText(['Ajuste do Gestor']);

    await page.reload();
    await expect(titulos(page), 'o filtro volta da URL').toHaveText(['Ajuste do Gestor']);
    await expect(filtros.getByRole('combobox', { name: 'Missão' })).toHaveValue(idDaUrl(urlGestor));

    await filtros.getByRole('combobox', { name: 'Status' }).selectOption('concluido');
    await filtros.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page.getByText('Nenhuma atualização com esses filtros.')).toBeVisible();
    await page.getByRole('link', { name: 'Limpar filtros' }).click();
    await expect(titulos(page)).toHaveText(['Ajuste da Agenda', 'Ajuste do Gestor']);

    await page.goto(urlGestor);
    await excluirMissaoAberta(page);
    await page.goto(urlAgenda);
    await excluirMissaoAberta(page);
  });

  test('muda o status na página geral e a ficha da Missão reflete', async ({ page }) => {
    await cadastrarMissao(page, { nome: nomeUnico('Missão do status geral'), stacks: 'Go,' });
    const urlMissao = page.url();
    await registrar(page, 'Status pela página geral');

    await page.goto('/atualizacoes');
    await lista(page)
      .getByRole('group', { name: 'Status de Status pela página geral' })
      .getByRole('button', { name: 'Desenvolvimento' })
      .click();
    await expect(
      lista(page).getByRole('group', { name: 'Status de Status pela página geral' }).getByRole('button', {
        name: 'Desenvolvimento',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.goto(urlMissao);
    await expect(
      page.getByRole('group', { name: 'Status de Status pela página geral' }).getByRole('button', {
        name: 'Desenvolvimento',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    await excluirMissaoAberta(page);
  });

  test('pagina de 50 em 50, sem repetir nem pular itens', async ({ page }) => {
    await cadastrarMissao(page, { nome: nomeUnico('Missão com muitas'), stacks: 'Go,' });
    const urlMissao = page.url();
    await semearAtualizacoes(idDaUrl(urlMissao), 51, 'Lote');

    await page.goto(`/atualizacoes?missao=${idDaUrl(urlMissao)}`);
    await expect(titulos(page)).toHaveCount(50);
    await expect(page.getByRole('navigation', { name: 'Paginação' }).getByText('Página 1 de 2')).toBeVisible();
    const primeiraPagina = await titulos(page).allTextContents();

    await page.getByRole('link', { name: 'Próxima página' }).click();
    await expect(page).toHaveURL(/pagina=2/);
    await expect(titulos(page)).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Paginação' }).getByText('Página 2 de 2')).toBeVisible();
    const segundaPagina = await titulos(page).allTextContents();
    expect(new Set([...primeiraPagina, ...segundaPagina]).size, 'as 51, sem repetição').toBe(51);
    await expect(page.getByRole('link', { name: 'Próxima página' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Página anterior' }).click();
    await expect(titulos(page)).toHaveCount(50);

    await page.goto(urlMissao);
    await excluirMissaoAberta(page);
  });

  test('sem violações de acessibilidade (axe) e sem rolagem horizontal a 360 px', async ({ page }) => {
    await cadastrarMissao(page, { nome: nomeUnico('Missão auditada no geral'), stacks: 'Go,' });
    const urlMissao = page.url();
    await registrar(page, 'Atualização auditada no geral');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/atualizacoes');
    await expect(titulos(page).first()).toBeVisible();
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await page.setViewportSize({ width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.goto(urlMissao);
    await excluirMissaoAberta(page);
  });
});
