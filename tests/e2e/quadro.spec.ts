import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

import { cadastrarMissao, coluna, excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';

/** Cartão de uma Missão numa coluna do Quadro. */
function cartao(pagina: Page, titulo: string, nome: string): Locator {
  return coluna(pagina, titulo)
    .getByRole('listitem')
    .filter({ has: pagina.getByRole('link', { name: new RegExp(nome) }) });
}

type Ponto = { x: number; y: number };

async function caixaDe(alvo: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const caixa = await alvo.boundingBox();
  if (!caixa) throw new Error('elemento sem caixa (invisível?)');
  return caixa;
}

/**
 * Pontos de partida e de soltura, ambos dentro da tela: eventos de ponteiro
 * fora da área visível não chegam ao app. O cartão vai para o centro da tela;
 * a soltura é o ponto da coluna de destino mais próximo da altura do cartão
 * (colunas lado a lado no computador, empilhadas no celular).
 */
async function pontosDoArrasto(pagina: Page, origem: Locator, destino: Locator): Promise<[Ponto, Ponto]> {
  await origem.evaluate((elemento) => elemento.scrollIntoView({ block: 'center' }));
  const caixaOrigem = await caixaDe(origem);
  const caixaDestino = await caixaDe(destino);
  const altura = pagina.viewportSize()?.height ?? 720;
  const de = { x: caixaOrigem.x + caixaOrigem.width / 2, y: caixaOrigem.y + caixaOrigem.height / 2 };
  const margem = 24;
  const para = {
    x: caixaDestino.x + caixaDestino.width / 2,
    y: Math.min(
      Math.max(de.y, caixaDestino.y + margem, margem),
      caixaDestino.y + caixaDestino.height - margem,
      altura - margem,
    ),
  };
  return [de, para];
}

/**
 * Espera a coluna virar o alvo do arrasto antes de soltar: a biblioteca
 * recalcula o alvo a cada quadro, e soltar antes disso cai na coluna de origem.
 */
const esperarAlvo = (destino: Locator) => expect(destino).toHaveAttribute('data-alvo-arrasto', 'true');

/** Arrasto com o mouse, em passos, como uma pessoa faria (o sensor exige 5 px de movimento). */
async function arrastarComMouse(pagina: Page, origem: Locator, destino: Locator): Promise<void> {
  const [de, para] = await pontosDoArrasto(pagina, origem, destino);
  await pagina.mouse.move(de.x, de.y);
  await pagina.mouse.down();
  await pagina.mouse.move(de.x + 10, de.y + 10, { steps: 5 });
  await pagina.mouse.move(para.x, para.y, { steps: 15 });
  await esperarAlvo(destino);
  await pagina.mouse.up();
}

/**
 * Arrasto com o dedo: toque longo (o sensor espera 250 ms parado) e depois o
 * movimento. O Playwright só tem `tap`, então os eventos vão pelo protocolo do
 * Chromium (`Input.dispatchTouchEvent`), que gera ponteiros do tipo "touch".
 */
async function arrastarPorToque(pagina: Page, origem: Locator, destino: Locator): Promise<void> {
  const [de, para] = await pontosDoArrasto(pagina, origem, destino);
  const cdp = await pagina.context().newCDPSession(pagina);
  const tocar = (type: 'touchStart' | 'touchMove' | 'touchEnd', ponto?: { x: number; y: number }) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: ponto ? [ponto] : [] });

  await tocar('touchStart', de);
  await pagina.waitForTimeout(400);
  const passos = 15;
  for (let passo = 1; passo <= passos; passo++) {
    await tocar('touchMove', {
      x: de.x + ((para.x - de.x) * passo) / passos,
      y: de.y + ((para.y - de.y) * passo) / passos,
    });
  }
  await esperarAlvo(destino);
  await tocar('touchEnd');
  await cdp.detach();
}

test.describe('Quadro de Projetos', () => {
  test('arrasta um cartão com o mouse para outra coluna (RF-20)', async ({ page }) => {
    const nome = nomeUnico('Projeto arrastado');
    await cadastrarMissao(page, { nome, stacks: 'Go,' });
    const urlMissao = page.url();

    await page.goto('/');
    await arrastarComMouse(page, cartao(page, 'Backlog', nome), coluna(page, 'Em desenvolvimento'));
    await expect(cartao(page, 'Em desenvolvimento', nome)).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: `${nome} movido para Em desenvolvimento` }),
    ).toBeAttached();
    await expect(page, 'soltar o cartão não abre o detalhe').toHaveURL(/\/$/);

    await page.reload();
    await expect(cartao(page, 'Em desenvolvimento', nome), 'gravado no banco').toBeVisible();
    await page.goto(urlMissao);
    await expect(page.getByText(/Rank \w · Desenvolvimento/)).toBeVisible();
    const inicio = page
      .locator('dt', { hasText: 'Início em desenvolvimento' })
      .locator('xpath=following-sibling::dd');
    await expect(inicio, 'data de início gravada (RN-02)').toHaveText(/\d{2}\/\d{2}\/\d{4}/);
    await excluirMissaoAberta(page);
  });

  test('clicar no cartão continua abrindo o detalhe', async ({ page }) => {
    const nome = nomeUnico('Projeto clicado');
    await cadastrarMissao(page, { nome, stacks: 'Go,' });

    await page.goto('/');
    await cartao(page, 'Backlog', nome).getByRole('link').click();
    await expect(page.getByRole('heading', { level: 2, name: nome })).toBeVisible();
    await excluirMissaoAberta(page);
  });

  test('move pelo botão, só com o teclado (WCAG 2.5.7 e 2.1.1)', async ({ page }) => {
    const nome = nomeUnico('Projeto pelo teclado');
    await cadastrarMissao(page, { nome, stacks: 'Go,' });
    const urlMissao = page.url();

    await page.goto('/');
    const botao = cartao(page, 'Backlog', nome).getByRole('button', { name: `Mover ${nome}` });
    await botao.focus();
    await page.keyboard.press('Enter');
    await expect(botao).toHaveAttribute('aria-expanded', 'true');
    const opcoes = page.getByRole('button', { name: /^Para / });
    await expect(opcoes, 'só as outras colunas').toHaveText(['Para Em desenvolvimento', 'Para Concluídas']);

    await page.keyboard.press('Escape');
    await expect(botao).toHaveAttribute('aria-expanded', 'false');
    await expect(botao, 'Esc devolve o foco ao botão').toBeFocused();

    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Para Concluídas' }).focus();
    await page.keyboard.press('Enter');
    await expect(cartao(page, 'Concluídas', nome)).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: `${nome} movido para Concluídas` }),
    ).toBeAttached();
    // Concluir abre a Janela do Sistema (M5); Enter fecha.
    const janela = page.getByRole('dialog', { name: nome });
    await expect(janela.getByRole('button', { name: 'Entendi' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(janela).toBeHidden();
    await expect(
      cartao(page, 'Concluídas', nome).getByRole('button', { name: `Mover ${nome}` }),
      'ao fechar a janela, o foco volta ao botão do cartão, na coluna nova',
    ).toBeFocused();

    await page.goto(urlMissao);
    await expect(page.getByText(/Rank \w · Concluído/)).toBeVisible();
    await excluirMissaoAberta(page);
  });

  test.describe('com falha no servidor', () => {
    test.use({ errosEsperados: [/Failed to load resource|Failed to fetch|ERR_FAILED/] });

    test('o cartão volta para a coluna de origem e o erro aparece', async ({ page }) => {
      const nome = nomeUnico('Projeto sem rede');
      await cadastrarMissao(page, { nome, stacks: 'Go,' });
      const urlMissao = page.url();

      await page.goto('/');
      await page.route('**/*', (rota) =>
        rota.request().method() === 'POST' && rota.request().headers()['next-action']
          ? rota.abort('failed')
          : rota.fallback(),
      );
      await cartao(page, 'Backlog', nome)
        .getByRole('button', { name: `Mover ${nome}` })
        .click();
      await page.getByRole('button', { name: 'Para Em desenvolvimento' }).click();

      await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível mover' })).toBeVisible();
      await expect(cartao(page, 'Backlog', nome)).toBeVisible();
      await expect(cartao(page, 'Em desenvolvimento', nome)).toHaveCount(0);

      await page.unroute('**/*');
      await page.goto(urlMissao);
      await excluirMissaoAberta(page);
    });
  });

  test('filtra por texto, stack e Rank, e o filtro fica na URL (RF-21)', async ({ page }) => {
    const sufixo = Date.now().toString(36);
    const gestor = `Gestor filtrável ${sufixo}`;
    const agenda = `Agenda filtrável ${sufixo}`;
    await cadastrarMissao(page, { nome: gestor, stacks: 'Next.js,' });
    const urlGestor = page.url();
    await cadastrarMissao(page, { nome: agenda, stacks: `Elixir ${sufixo},` });
    const urlAgenda = page.url();

    await page.goto('/');
    const busca = page.getByRole('searchbox', { name: 'Buscar' });
    await busca.fill(`GESTÕR FILTRÁVEL ${sufixo}`);
    await expect(cartao(page, 'Backlog', gestor), 'sem diferenciar maiúsculas nem acentos').toBeVisible();
    await expect(cartao(page, 'Backlog', agenda)).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: /Mostrando 1 de \d+ projetos/ })).toBeAttached();
    await expect(page).toHaveURL(/busca=/);

    await page.reload();
    await expect(page.getByRole('searchbox', { name: 'Buscar' }), 'o filtro volta da URL').toHaveValue(
      `GESTÕR FILTRÁVEL ${sufixo}`,
    );
    await expect(cartao(page, 'Backlog', agenda)).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('');
    await page.getByRole('combobox', { name: 'Stack' }).selectOption(`Elixir ${sufixo}`);
    await expect(cartao(page, 'Backlog', agenda)).toBeVisible();
    await expect(cartao(page, 'Backlog', gestor)).toHaveCount(0);

    await page.getByRole('combobox', { name: 'Rank' }).selectOption('S');
    await expect(page.getByText('Nenhum projeto com esses filtros.')).toBeVisible();
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto(urlGestor);
    await excluirMissaoAberta(page);
    await page.goto(urlAgenda);
    await excluirMissaoAberta(page);
  });

  test('filtra por tipo e por tag, e o filtro fica na URL (RF-25)', async ({ page }) => {
    const sufixo = Date.now().toString(36);
    const geral = `Revenda filtrável ${sufixo}`;
    const dev = `Sistema filtrável ${sufixo}`;
    const tag = `Revenda ${sufixo}`;
    await page.goto('/missoes/nova');
    await page.getByRole('radio', { name: /^Geral/ }).check();
    await page.getByRole('textbox', { name: 'Nome' }).fill(geral);
    await page.getByRole('textbox', { name: 'Descrição' }).fill(`Descrição de ${geral}.`);
    await page.getByRole('combobox', { name: /Tags/ }).fill(tag);
    await page.getByRole('combobox', { name: /Tags/ }).press('Enter');
    await page.getByRole('button', { name: 'Registrar projeto' }).click();
    await page.waitForURL(/\/missoes\/[0-9a-f-]{36}$/);
    const urlGeral = page.url();
    await cadastrarMissao(page, { nome: dev, stacks: 'Next.js,' });
    const urlDev = page.url();

    await page.goto('/');
    const campoTipo = page.getByRole('combobox', { name: 'Tipo', exact: true });
    const campoTag = page.getByRole('combobox', { name: 'Tag', exact: true });
    await campoTag.selectOption(tag);
    await expect(cartao(page, 'Backlog', geral)).toBeVisible();
    await expect(cartao(page, 'Backlog', dev)).toHaveCount(0);
    await expect(page).toHaveURL(/tag=/);

    await page.reload();
    await expect(campoTag, 'o filtro de tag volta da URL').toHaveValue(tag);
    await expect(cartao(page, 'Backlog', geral)).toBeVisible();
    await expect(cartao(page, 'Backlog', dev)).toHaveCount(0);

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await campoTipo.selectOption('geral');
    await expect(page).toHaveURL(/tipo=geral/);
    await expect(cartao(page, 'Backlog', geral)).toBeVisible();
    await expect(cartao(page, 'Backlog', dev), 'o tipo Geral esconde os Projetos DEV').toHaveCount(0);

    await campoTag.selectOption(tag);
    const niveis = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const violacoes = (await new AxeBuilder({ page }).withTags(niveis).analyze()).violations;
    expect(
      violacoes.map((v) => `${v.id}: ${v.help}`),
      'Quadro com os filtros de tipo e tag',
    ).toEqual([]);

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    await expect(page, '"Limpar filtros" zera tudo').toHaveURL(/\/$/);
    await expect(campoTipo).toHaveValue('');
    await expect(campoTag).toHaveValue('');
    await expect(cartao(page, 'Backlog', dev)).toBeVisible();

    await page.goto(urlGeral);
    await excluirMissaoAberta(page);
    await page.goto(urlDev);
    await excluirMissaoAberta(page);
  });

  test('a vista Lista resume todos os Projetos numa tabela (RF-22)', async ({ page }) => {
    const nome = nomeUnico('Projeto na lista');
    await cadastrarMissao(page, { nome, stacks: 'Go,Rust,' });
    const urlMissao = page.url();

    await page.goto('/');
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page).toHaveURL(/vista=lista/);
    const tabela = page.getByRole('table', { name: /Projetos/ });
    const linha = tabela.getByRole('row').filter({ hasText: nome });
    await expect(linha).toContainText('Backlog');
    await expect(linha).toContainText('Go, Rust');
    await expect(linha.getByRole('link', { name: nome })).toHaveAttribute(
      'href',
      new URL(urlMissao).pathname,
    );

    await page.reload();
    await expect(page.getByRole('table', { name: /Projetos/ }), 'a vista volta da URL').toBeVisible();

    await page.goto(urlMissao);
    await excluirMissaoAberta(page);
  });

  test('Quadro com o menu aberto e a Lista sem violações de acessibilidade (axe)', async ({ page }) => {
    const nome = nomeUnico('Projeto auditado');
    await cadastrarMissao(page, { nome, stacks: 'Go,' });
    const urlMissao = page.url();
    const niveis = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
    const violacoes = async () =>
      (await new AxeBuilder({ page }).withTags(niveis).analyze()).violations.map((v) => `${v.id}: ${v.help}`);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await cartao(page, 'Backlog', nome)
      .getByRole('button', { name: `Mover ${nome}` })
      .click();
    expect(await violacoes(), 'Quadro com o menu aberto').toEqual([]);

    await page.goto('/?vista=lista');
    await expect(page.getByRole('table', { name: /Projetos/ })).toBeVisible();
    expect(await violacoes(), 'Lista').toEqual([]);

    await page.goto(urlMissao);
    await excluirMissaoAberta(page);
  });
});

test.describe('no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test.describe('toque longo', () => {
    // Quarentena temporária (issue #47): o teste é instável e a causa ainda não
    // foi achada. Uma nova tentativa só para ele; o relatório o marca como
    // "flaky", então a instabilidade continua visível. Sai quando a issue fechar.
    test.describe.configure({ retries: 1 });

    test('arrasta um cartão com o dedo (toque longo)', async ({ page }) => {
      const nome = nomeUnico('Projeto no dedo');
      await cadastrarMissao(page, { nome, stacks: 'Go,' });
      const urlMissao = page.url();

      await page.goto('/');
      const destino = coluna(page, 'Em desenvolvimento');
      await arrastarPorToque(page, cartao(page, 'Backlog', nome), destino);
      await expect(cartao(page, 'Em desenvolvimento', nome)).toBeVisible();

      await page.goto(urlMissao);
      await excluirMissaoAberta(page);
    });
  });

  test('filtros e Lista não rolam a página na horizontal (360 px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const semRolagemHorizontal = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await cadastrarMissao(page, {
      nome: nomeUnico('Projeto estreito com um nome bem comprido'),
      stacks: 'Go,',
    });
    const urlMissao = page.url();
    await page.goto('/');
    await expect(page.getByRole('searchbox', { name: 'Buscar' })).toBeVisible();
    expect(await semRolagemHorizontal(), 'Quadro com filtros').toBe(true);
    await page.goto('/?vista=lista');
    await expect(page.getByRole('table', { name: /Projetos/ })).toBeVisible();
    expect(await semRolagemHorizontal(), 'Lista').toBe(true);

    await page.goto(urlMissao);
    await excluirMissaoAberta(page);
  });
});
