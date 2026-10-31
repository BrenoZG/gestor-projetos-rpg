import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import type { Download, Page } from '@playwright/test';

import { cadastrarMissao, excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';
import { EMAIL_TESTE } from './apoio/supabase-local';

/** Critérios WCAG verificados automaticamente (o axe cobre só uma parte da WCAG). */
const NIVEIS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const NOME_DO_ARQUIVO = /^gestor-projetos-\d{4}-\d{2}-\d{2}\.json$/;

const linkExportar = (pagina: Page) => pagina.getByRole('link', { name: 'Baixar JSON' });

async function lerDownload(download: Download): Promise<string> {
  return readFile(await download.path(), 'utf8');
}

test.describe('Export JSON (RF-14)', () => {
  test('baixa o arquivo com os dados do usuário e sem a identificação da conta', async ({ page }) => {
    const nome = nomeUnico('Export');
    await cadastrarMissao(page, { nome, stacks: 'Python' });
    const urlDaMissao = page.url();

    await page.goto('/personagem');
    const [download] = await Promise.all([page.waitForEvent('download'), linkExportar(page).click()]);

    expect(download.suggestedFilename()).toMatch(NOME_DO_ARQUIVO);
    const texto = await lerDownload(download);
    const arquivo = JSON.parse(texto);
    expect(arquivo).toMatchObject({ formato: 'gestor-projetos-rpg/export', versao_formato: 1 });
    expect(arquivo.dados.projetos.map((projeto: { nome: string }) => projeto.nome)).toContain(nome);
    expect(arquivo.dados.stacks.map((stack: { nome: string }) => stack.nome)).toContain('Python');
    expect(texto).not.toContain(EMAIL_TESTE);
    expect(texto).not.toContain('"user_id"');
    test
      .info()
      .annotations.push({ type: 'tamanho do arquivo', description: `${Buffer.byteLength(texto)} bytes` });

    await expect(page.getByRole('status').filter({ hasText: 'baixado' })).toContainText(
      `${arquivo.dados.projetos.length} Projeto`,
    );

    await page.goto(urlDaMissao);
    await excluirMissaoAberta(page);
  });

  test('funciona só com o teclado', async ({ page }) => {
    await page.goto('/personagem');
    await linkExportar(page).focus();
    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    expect(download.suggestedFilename()).toMatch(NOME_DO_ARQUIVO);
  });

  test.describe('com o servidor falhando', () => {
    // O navegador registra a resposta 500 no console; é a falha provocada aqui.
    test.use({ errosEsperados: [/status of 500/] });

    test('mostra a mensagem genérica e não baixa nada', async ({ page }) => {
      await page.route('**/api/exportar', (rota) =>
        rota.fulfill({ status: 500, json: { erro: 'falha-ao-exportar' } }),
      );
      let baixou = false;
      page.on('download', () => {
        baixou = true;
      });

      await page.goto('/personagem');
      await linkExportar(page).click();

      await expect(page.getByRole('alert').filter({ hasText: 'Falha no export.' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Tentar de novo' })).toBeVisible();
      expect(baixou).toBe(false);
    });
  });

  test('em 360 px, o botão ocupa a largura e a seção passa no axe', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/personagem');
    const [download] = await Promise.all([page.waitForEvent('download'), linkExportar(page).click()]);
    await download.path();
    await expect(page.getByRole('status').filter({ hasText: 'baixado' })).toBeVisible();

    const secao = page.getByRole('region', { name: 'BACKUP' });
    const [caixaSecao, caixaLink] = await Promise.all([
      secao.boundingBox(),
      linkExportar(page).boundingBox(),
    ]);
    expect(caixaLink!.width).toBeGreaterThan(caixaSecao!.width - 40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

    const resultado = await new AxeBuilder({ page }).withTags(NIVEIS_WCAG).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
