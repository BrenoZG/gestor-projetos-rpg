import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { cadastrarMissao, coluna, excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';

/** Critérios WCAG verificados automaticamente (o axe cobre só uma parte da WCAG). */
const NIVEIS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function semViolacoes(pagina: Page, tela: string): Promise<void> {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(NIVEIS_WCAG).analyze();
  const resumo = resultado.violations.map((v) => `${v.id}: ${v.nodes.length} nó(s) — ${v.help}`);
  expect(resumo, `violações de acessibilidade em ${tela}`).toEqual([]);
}

/** Preenche o cadastro de um Projeto Geral com tags e links, sem enviar. */
async function preencherGeral(
  pagina: Page,
  { nome, tags, links }: { nome: string; tags: string[]; links: { url: string; titulo?: string }[] },
): Promise<void> {
  await pagina.goto('/missoes/nova');
  await pagina.getByRole('radio', { name: /^Geral/ }).check();
  await pagina.getByRole('textbox', { name: 'Nome' }).fill(nome);
  await pagina.getByRole('textbox', { name: 'Descrição' }).fill(`Descrição de ${nome}.`);
  const campoTags = pagina.getByRole('combobox', { name: /Tags/ });
  for (const tag of tags) {
    await campoTags.fill(tag);
    await campoTags.press('Enter');
  }
  for (const [indice, link] of links.entries()) {
    await pagina.getByRole('button', { name: 'Adicionar link' }).click();
    const endereco = pagina.getByRole('textbox', { name: `Endereço do link ${indice + 1}` });
    await expect(endereco, 'a linha nova recebe o foco').toBeFocused();
    await endereco.fill(link.url);
    if (link.titulo) {
      await pagina
        .getByRole('textbox', { name: `Título do link ${indice + 1} (opcional)` })
        .fill(link.titulo);
    }
  }
}

test.describe('Tipos de projeto, tags e links (RF-23 a RF-26)', () => {
  // Movimento reduzido: o axe mede contraste no estado final, não no meio de uma animação de entrada.
  test.use({ reducedMotion: 'reduce' });

  test('cadastra um Projeto Geral com tags e link, sem a parte técnica', async ({ page }) => {
    const nome = nomeUnico('Revenda na Shopee');
    await preencherGeral(page, {
      nome,
      tags: ['Revenda', 'revenda', 'Renda extra'],
      links: [{ url: 'https://www.youtube.com/watch?v=abc', titulo: 'Vídeo de estratégia' }],
    });
    await expect(
      page.getByRole('combobox', { name: /Ferramentas/ }),
      'stacks viram ferramentas',
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Estrutura e arquitetura' })).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Estilo arquitetural' })).toHaveCount(0);
    await semViolacoes(page, 'cadastro Geral com link');

    await page.getByRole('button', { name: 'Registrar projeto' }).click();
    await expect(page).toHaveURL(/\/missoes\/[0-9a-f-]{36}$/);
    await expect(page.getByText('Geral · Backlog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cálculo do Rank' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Estrutura e arquitetura' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Tags' }).getByText('Renda extra')).toBeVisible();
    await expect(page.getByText('revenda', { exact: true }), 'tag repetida vira uma só (RN-05)').toHaveCount(
      0,
    );

    const link = page.getByRole('link', { name: /Vídeo de estratégia/ });
    await expect(link).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toContainText('YouTube');
    await semViolacoes(page, 'ficha Geral');
    const urlMissao = page.url();

    await page.goto('/');
    const cartao = coluna(page, 'Backlog')
      .getByRole('listitem')
      .filter({ has: page.getByRole('link', { name: new RegExp(nome) }) });
    await expect(cartao).toContainText('Geral');
    await expect(cartao.getByRole('img', { name: /Rank do Projeto/ }), 'Geral não tem Rank').toHaveCount(0);

    await page.goto(urlMissao);
    await excluirMissaoAberta(page);
  });

  test('recusa link que não é https e não grava nada (RN-17)', async ({ page }) => {
    const nome = nomeUnico('Link perigoso');
    await preencherGeral(page, { nome, tags: [], links: [{ url: 'javascript:alert(1)' }] });
    await page.getByRole('button', { name: 'Registrar projeto' }).click();

    await expect(
      page.getByText('Link 1: o endereço precisa começar com https:// e ser válido.'),
    ).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Endereço do link 1' }),
      'foco no link inválido',
    ).toBeFocused();
    await expect(page).toHaveURL(/\/missoes\/nova$/);
    await page.goto('/');
    await expect(page.getByRole('link', { name: new RegExp(nome) })).toHaveCount(0);
  });

  test('trocar de Desenvolvimento para Geral pede confirmação e apaga a parte técnica (RN-16)', async ({
    page,
  }) => {
    const nome = nomeUnico('Projeto que vira Geral');
    await cadastrarMissao(page, { nome, stacks: 'Python,' });
    const urlMissao = page.url();

    await page.goto(`${urlMissao}/editar`);
    await page.getByRole('radio', { name: /^Geral/ }).check();
    await expect(
      page.getByText(
        'Ao salvar como Geral, o estilo, as capacidades e a arquitetura deste projeto serão apagados.',
      ),
    ).toBeVisible();
    const salvar = page.getByRole('button', { name: 'Salvar alterações' });
    await expect(salvar, 'sem confirmar, não salva').toBeDisabled();
    await page.getByRole('checkbox', { name: 'Entendi' }).check();
    await salvar.click();

    await expect(page).toHaveURL(urlMissao);
    await expect(page.getByText('Geral · Backlog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Estrutura e arquitetura' })).toHaveCount(0);
    // Dentro da seção: o Next mantém a tela de edição anterior no DOM, oculta, com o chip "Python".
    await expect(
      page.getByRole('region', { name: 'Ferramentas' }).getByText('Python', { exact: true }),
      'as stacks continuam como ferramentas',
    ).toBeVisible();

    await excluirMissaoAberta(page);
  });

  test('no celular (360 px), cadastro com link e ficha Geral não rolam na horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const semRolagemHorizontal = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

    await preencherGeral(page, {
      nome: nomeUnico('Vídeos estilo Pixar para o Instagram'),
      tags: ['Conteúdo'],
      links: [{ url: `https://drive.google.com/file/d/${'x'.repeat(120)}`, titulo: 'Roteiro no Drive' }],
    });
    expect(await semRolagemHorizontal(), 'cadastro').toBe(true);
    await page.getByRole('button', { name: 'Registrar projeto' }).click();
    await expect(page).toHaveURL(/\/missoes\/[0-9a-f-]{36}$/);
    expect(await semRolagemHorizontal(), 'ficha').toBe(true);

    await excluirMissaoAberta(page);
  });
});
