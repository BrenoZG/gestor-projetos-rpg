import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { retrocederDesenvolvimento, zerarXpDoUsuarioDeTeste } from './apoio/banco-local';
import { cadastrarMissao, excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';

/** Critérios WCAG verificados automaticamente (o axe cobre só uma parte da WCAG). */
const NIVEIS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const hud = (pagina: Page) => pagina.getByRole('banner');
const barraDesenvolvedor = (pagina: Page) =>
  hud(pagina).getByRole('progressbar', { name: 'Progresso de XP no nível atual' });
const barraProdutividade = (pagina: Page) =>
  hud(pagina).getByRole('progressbar', { name: 'Progresso de XP de Produtividade no nível atual' });

/** Janela do Sistema da conclusão (M5): um dialog modal com o nome do Projeto. */
const janelaDoSistema = (pagina: Page, nome: string) => pagina.getByRole('dialog', { name: nome });

function idDaUrl(pagina: Page): string {
  const id = /\/missoes\/([0-9a-f-]{36})$/.exec(pagina.url())?.[1];
  if (!id) throw new Error(`Sem id na URL: ${pagina.url()}`);
  return id;
}

async function mudarStatusNaFicha(pagina: Page, nome: string, status: string): Promise<void> {
  const grupo = pagina.getByRole('group', { name: `Status de ${nome}` });
  await grupo.getByRole('button', { name: status }).click();
  await expect(grupo.getByRole('button', { name: status })).toHaveAttribute('aria-pressed', 'true');
}

async function cadastrarGeral(pagina: Page, nome: string): Promise<void> {
  await pagina.goto('/missoes/nova');
  await pagina.getByRole('radio', { name: /^Geral/ }).check();
  await pagina.getByRole('textbox', { name: 'Nome' }).fill(nome);
  await pagina.getByRole('textbox', { name: 'Descrição' }).fill(`Descrição de ${nome}.`);
  await pagina.getByRole('button', { name: 'Registrar projeto' }).click();
  await pagina.waitForURL(/\/missoes\/[0-9a-f-]{36}$/);
}

// O ledger é do usuário de teste, compartilhado entre os specs (em série): cada
// teste daqui começa do zero para os números do HUD serem exatos.
test.beforeEach(() => {
  zerarXpDoUsuarioDeTeste();
});

test.describe('XP e níveis (M3)', () => {
  test('o HUD mostra a Produtividade só quando ela tem XP (RF-12, RN-18)', async ({ page }) => {
    await page.goto('/');
    await expect(hud(page)).toContainText('RANK E · AVENTUREIRO');
    await expect(barraDesenvolvedor(page)).toHaveAttribute('aria-valuetext', '0 de 20 XP rumo ao nível 2');
    await expect(barraProdutividade(page), 'sem XP de Produtividade, sem a linha').toHaveCount(0);

    await cadastrarGeral(page, nomeUnico('Canal de vídeos'));
    await expect(hud(page)).toContainText('PRODUTIVIDADE · NV 1');
    await expect(barraProdutividade(page)).toHaveAttribute('aria-valuetext', '10 de 20 XP rumo ao nível 2');
    await expect(barraDesenvolvedor(page), 'a trilha Desenvolvedor não muda').toHaveAttribute(
      'aria-valuetext',
      '0 de 20 XP rumo ao nível 2',
    );

    await excluirMissaoAberta(page);
    await expect(barraProdutividade(page), 'excluir sem concluir revoga a criação (RN-06c)').toHaveCount(0);
  });

  test('concluir depois de 24 h em Desenvolvimento mostra o XP e sobe o nível; reconcluir não dá XP de novo (RN-06)', async ({
    page,
  }) => {
    const nome = nomeUnico('API de pedidos');
    await cadastrarMissao(page, { nome, stacks: 'Go,' });
    await expect(barraDesenvolvedor(page), 'criar rende 10 XP').toHaveAttribute(
      'aria-valuetext',
      '10 de 20 XP rumo ao nível 2',
    );

    await mudarStatusNaFicha(page, nome, 'Desenvolvimento');
    retrocederDesenvolvimento(idDaUrl(page), 25);
    await mudarStatusNaFicha(page, nome, 'Concluído');

    // Monolito (5) + 1 stack (2) = 7 pontos, Rank E: 40 XP, sem Atualizações.
    const janela = janelaDoSistema(page, nome);
    await expect(janela).toContainText('[ SISTEMA ] · PROJETO CONCLUÍDO');
    await expect(janela, 'o leitor de tela ouve o XP na descrição da janela').toHaveAccessibleDescription(
      '+40 XP Trilha Desenvolvedor.',
    );
    await expect(janela.getByRole('button', { name: 'Continuar' }), 'o foco vai ao botão').toBeFocused();

    const resultado = await new AxeBuilder({ page }).withTags(NIVEIS_WCAG).analyze();
    expect(
      resultado.violations.map((v) => `${v.id}: ${v.help}`),
      'axe na ficha com a Janela do Sistema aberta',
    ).toEqual([]);

    await page.keyboard.press('Enter');
    await expect(janela, 'Enter fecha a janela').toBeHidden();
    await expect(
      page.getByRole('group', { name: `Status de ${nome}` }).getByRole('button', { name: 'Concluído' }),
      'o foco volta ao botão que concluiu',
    ).toBeFocused();
    await expect(hud(page)).toContainText('NV 2');
    await expect(barraDesenvolvedor(page), '50 XP: nível 2, 30 dos 37 até o 3').toHaveAttribute(
      'aria-valuetext',
      '30 de 37 XP rumo ao nível 3',
    );

    await mudarStatusNaFicha(page, nome, 'Desenvolvimento');
    await expect(janela, 'sair de Concluído não abre janela').toBeHidden();
    await mudarStatusNaFicha(page, nome, 'Concluído');
    await expect(janela).toHaveAccessibleDescription('Concluído. O XP deste projeto já foi recebido antes.');
    await page.keyboard.press('Escape');
    await expect(janela, 'Esc fecha a janela').toBeHidden();
    await expect(barraDesenvolvedor(page)).toHaveAttribute('aria-valuetext', '30 de 37 XP rumo ao nível 3');

    await excluirMissaoAberta(page);
    await expect(
      barraDesenvolvedor(page),
      'excluir Projeto concluído preserva o XP (RN-06b)',
    ).toHaveAttribute('aria-valuetext', '30 de 37 XP rumo ao nível 3');
  });

  test('concluir antes da trava não dá XP e diz quantas horas faltaram (RN-06d)', async ({ page }) => {
    const nome = nomeUnico('Projeto apressado');
    await cadastrarMissao(page, { nome, stacks: 'Go,' });
    await mudarStatusNaFicha(page, nome, 'Desenvolvimento');
    await mudarStatusNaFicha(page, nome, 'Concluído');

    const janela = janelaDoSistema(page, nome);
    await expect(janela).toContainText('[ SISTEMA ] · RECOMPENSA BLOQUEADA');
    await expect(janela).toHaveAccessibleDescription(
      'Concluído, sem XP. A recompensa exige 24 h em Desenvolvimento e faltaram 24 h. Para ganhar o XP, volte o projeto para Desenvolvimento e conclua depois de 24 h.',
    );
    await janela.getByRole('button', { name: 'Entendi' }).click();
    await expect(janela).toBeHidden();
    await expect(barraDesenvolvedor(page), 'só o XP de criação').toHaveAttribute(
      'aria-valuetext',
      '10 de 20 XP rumo ao nível 2',
    );
    await excluirMissaoAberta(page);
  });

  test('concluir uma Atualização de Projeto Geral rende 20 XP de Produtividade (RN-18)', async ({ page }) => {
    await cadastrarGeral(page, nomeUnico('Revenda'));
    const secao = page.getByRole('region', { name: 'Atualizações' });
    const formulario = secao.getByRole('form', { name: 'Nova atualização' });
    await formulario.getByRole('textbox', { name: 'Título' }).fill('Primeira venda');
    await formulario.getByRole('textbox', { name: 'Descrição' }).fill('Vendi o primeiro lote.');
    await formulario.getByRole('button', { name: 'Registrar atualização' }).click();
    await expect(barraProdutividade(page), '10 do Projeto + 5 da Atualização').toHaveAttribute(
      'aria-valuetext',
      '15 de 20 XP rumo ao nível 2',
    );

    await secao
      .getByRole('group', { name: 'Status de Primeira venda' })
      .getByRole('button', { name: 'Concluído' })
      .click();
    await expect(secao.getByText('+20 XP Trilha Produtividade.', { exact: true })).toBeVisible();
    await expect(barraProdutividade(page), '35 XP: nível 2').toHaveAttribute(
      'aria-valuetext',
      '15 de 37 XP rumo ao nível 3',
    );
    await excluirMissaoAberta(page);
  });

  test('o HUD com as duas trilhas cabe em 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await cadastrarGeral(page, nomeUnico('Celular'));
    await expect(barraProdutividade(page)).toBeVisible();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura, 'sem rolagem horizontal').toBeLessThanOrEqual(360);
    await excluirMissaoAberta(page);
  });
});
