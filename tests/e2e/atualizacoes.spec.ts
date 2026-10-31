import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

import { cadastrarMissao, excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';

const secao = (pagina: Page) => pagina.getByRole('region', { name: 'Atualizações' });
const historico = (pagina: Page) => secao(pagina).getByRole('list', { name: 'Histórico de atualizações' });
const item = (pagina: Page, titulo: string): Locator =>
  historico(pagina)
    .getByRole('listitem')
    .filter({ has: pagina.getByRole('heading', { level: 4, name: titulo }) });

/** Registra uma Atualização pelo formulário da ficha do Projeto aberta. */
async function registrar(pagina: Page, titulo: string, descricao = `O que foi feito em ${titulo}.`) {
  const formulario = secao(pagina).getByRole('form', { name: 'Nova atualização' });
  await formulario.getByRole('textbox', { name: 'Título' }).fill(titulo);
  await formulario.getByRole('textbox', { name: 'Descrição' }).fill(descricao);
  await formulario.getByRole('button', { name: 'Registrar atualização' }).click();
  await expect(item(pagina, titulo)).toBeVisible();
}

test.describe('Atualizações', () => {
  test('registra no fim da ficha e mostra o histórico, mais recente primeiro (RF-05, RF-06, RF-09)', async ({
    page,
  }) => {
    await cadastrarMissao(page, { nome: nomeUnico('Projeto com histórico'), stacks: 'Go,' });
    await expect(secao(page).getByText('Nenhuma atualização registrada ainda.')).toBeVisible();

    await registrar(page, 'Primeira atualização', 'Linha 1\nLinha 2');
    await registrar(page, 'Segunda atualização');
    const formulario = secao(page).getByRole('form', { name: 'Nova atualização' });
    await expect(formulario.getByRole('textbox', { name: 'Título' }), 'o formulário se limpa').toHaveValue(
      '',
    );

    await expect(historico(page).getByRole('heading', { level: 4 })).toHaveText([
      'Segunda atualização',
      'Primeira atualização',
    ]);
    await expect(secao(page).getByRole('heading', { level: 3 })).toContainText('Atualizações · 2');
    await expect(item(page, 'Primeira atualização'), 'quebras de linha preservadas').toContainText(
      'Linha 1\nLinha 2',
    );

    const ordem = await page.evaluate(() => {
      const posicao = (rotulo: string) =>
        [...document.querySelectorAll('dt, h3, a, button')].findIndex(
          (el) => el.textContent?.trim() === rotulo,
        );
      return {
        datas: posicao('Conclusão'),
        atualizacoes: posicao('Atualizações · 2'),
        editar: posicao('Editar projeto'),
      };
    });
    expect(ordem.atualizacoes, 'depois dos dados do Projeto').toBeGreaterThan(ordem.datas);
    expect(ordem.editar, 'antes de Editar e Excluir').toBeGreaterThan(ordem.atualizacoes);

    await page.reload();
    await expect(item(page, 'Segunda atualização'), 'gravado no banco').toBeVisible();
    await excluirMissaoAberta(page);
  });

  test('mostra os erros por campo e leva o foco ao título', async ({ page }) => {
    await cadastrarMissao(page, { nome: nomeUnico('Projeto com erro'), stacks: 'Go,' });
    const formulario = secao(page).getByRole('form', { name: 'Nova atualização' });
    await formulario.getByRole('textbox', { name: 'Título' }).fill('Ab');
    await formulario.getByRole('button', { name: 'Registrar atualização' }).click();

    await expect(formulario.getByText('O título precisa ter de 3 a 120 caracteres.')).toBeVisible();
    await expect(formulario.getByText('Descreva o que foi feito.')).toBeVisible();
    await expect(formulario.getByRole('textbox', { name: 'Título' })).toBeFocused();
    await expect(formulario.getByRole('textbox', { name: 'Título' }), 'nada se perde').toHaveValue('Ab');
    await excluirMissaoAberta(page);
  });

  test('muda o status pelos três botões, sem abrir a edição', async ({ page }) => {
    await cadastrarMissao(page, { nome: nomeUnico('Projeto com status'), stacks: 'Go,' });
    await registrar(page, 'Atualização com status');
    const status = item(page, 'Atualização com status').getByRole('group', {
      name: 'Status de Atualização com status',
    });
    await expect(status.getByRole('button', { name: 'Backlog' })).toHaveAttribute('aria-pressed', 'true');

    await status.getByRole('button', { name: 'Concluído' }).click();
    await expect(status.getByRole('button', { name: 'Concluído' })).toHaveAttribute('aria-pressed', 'true');
    await expect(status.getByRole('button', { name: 'Backlog' })).toHaveAttribute('aria-pressed', 'false');
    await expect(item(page, 'Atualização com status')).toContainText(/Concluída em \d{2}\/\d{2}\/\d{4}/);

    await page.reload();
    await expect(
      item(page, 'Atualização com status').getByRole('button', { name: 'Concluído' }),
      'gravado no banco',
    ).toHaveAttribute('aria-pressed', 'true');
    await excluirMissaoAberta(page);
  });

  test('edita e move a Atualização para outro Projeto (RF-07, RN-01)', async ({ page }) => {
    const destino = nomeUnico('Projeto de destino');
    await cadastrarMissao(page, { nome: destino, stacks: 'Go,' });
    const urlDestino = page.url();
    await cadastrarMissao(page, { nome: nomeUnico('Projeto de origem'), stacks: 'Go,' });
    const urlOrigem = page.url();
    await registrar(page, 'Atualização viajante');

    await item(page, 'Atualização viajante')
      .getByRole('button', { name: 'Editar Atualização viajante' })
      .click();
    const edicao = item(page, 'Atualização viajante').getByRole('form', { name: 'Editar atualização' });
    await edicao.getByRole('textbox', { name: 'Título' }).fill('Atualização que mudou de projeto');
    await edicao.getByRole('combobox', { name: 'Projeto' }).selectOption({ label: destino });
    await edicao.getByRole('button', { name: 'Salvar' }).click();

    await expect(historico(page)).toHaveCount(0);
    await expect(secao(page).getByText('Nenhuma atualização registrada ainda.')).toBeVisible();
    await page.goto(urlDestino);
    await expect(item(page, 'Atualização que mudou de projeto')).toBeVisible();

    await excluirMissaoAberta(page);
    await page.goto(urlOrigem);
    await excluirMissaoAberta(page);
  });

  test('exclui uma Atualização com confirmação (RF-08)', async ({ page }) => {
    await cadastrarMissao(page, { nome: nomeUnico('Projeto que perde uma'), stacks: 'Go,' });
    await registrar(page, 'Atualização descartável');

    await item(page, 'Atualização descartável')
      .getByRole('button', { name: 'Excluir Atualização descartável' })
      .click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('button', { name: 'Cancelar' }), 'foco no caminho seguro').toBeFocused();
    await dialogo.getByRole('button', { name: 'Excluir atualização' }).click();
    await expect(item(page, 'Atualização descartável')).toHaveCount(0);
    await excluirMissaoAberta(page);
  });

  test('excluir o Projeto avisa quantas Atualizações vão junto (RN-04)', async ({ page }) => {
    await cadastrarMissao(page, { nome: nomeUnico('Projeto com duas'), stacks: 'Go,' });
    await registrar(page, 'Uma');
    await registrar(page, 'Outra');

    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('2 atualizações');
    await page.keyboard.press('Escape');
    await excluirMissaoAberta(page);
  });

  test('ficha com Atualizações, edição aberta e diálogo sem violações de acessibilidade (axe)', async ({
    page,
  }) => {
    const niveis = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
    const violacoes = async () =>
      (await new AxeBuilder({ page }).withTags(niveis).analyze()).violations.map((v) => `${v.id}: ${v.help}`);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await cadastrarMissao(page, { nome: nomeUnico('Projeto auditado'), stacks: 'Go,' });
    await registrar(page, 'Atualização auditada');
    await item(page, 'Atualização auditada')
      .getByRole('group')
      .getByRole('button', { name: 'Concluído' })
      .click();
    expect(await violacoes(), 'ficha com histórico').toEqual([]);

    await item(page, 'Atualização auditada')
      .getByRole('button', { name: 'Editar Atualização auditada' })
      .click();
    expect(await violacoes(), 'edição aberta').toEqual([]);
    await item(page, 'Atualização auditada').getByRole('button', { name: 'Cancelar' }).click();

    await item(page, 'Atualização auditada')
      .getByRole('button', { name: 'Excluir Atualização auditada' })
      .click();
    expect(await violacoes(), 'diálogo de exclusão').toEqual([]);
    await page.keyboard.press('Escape');
    await excluirMissaoAberta(page);
  });
});
