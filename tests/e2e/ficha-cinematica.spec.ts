import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import {
  definirPersonagemDoUsuarioDeTeste,
  inserirConclusaoDoUsuarioDeTeste,
  retrocederDesenvolvimento,
  zerarXpDoUsuarioDeTeste,
} from './apoio/banco-local';
import { cadastrarMissao, excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';

/** Critérios WCAG verificados automaticamente (o axe cobre só uma parte da WCAG). */
const NIVEIS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const tituloFicha = (pagina: Page) => pagina.getByRole('heading', { level: 1, name: 'Ficha' });

async function semViolacoesAxe(pagina: Page, onde: string): Promise<void> {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(NIVEIS_WCAG).analyze();
  expect(
    resultado.violations.map((v) => `${v.id}: ${v.help}`),
    `axe em ${onde}`,
  ).toEqual([]);
}

async function mudarStatusNaFicha(pagina: Page, nome: string, status: string): Promise<void> {
  const grupo = pagina.getByRole('group', { name: `Status de ${nome}` });
  await grupo.getByRole('button', { name: status }).click();
  await expect(grupo.getByRole('button', { name: status })).toHaveAttribute('aria-pressed', 'true');
}

function idDaUrl(pagina: Page): string {
  const id = /\/missoes\/([0-9a-f-]{36})$/.exec(pagina.url())?.[1];
  if (!id) throw new Error(`Sem id na URL: ${pagina.url()}`);
  return id;
}

// Ledger e personagem são do usuário de teste, compartilhados entre os specs
// (em série): cada teste começa sem XP e termina como o setup deixou.
test.beforeEach(() => {
  zerarXpDoUsuarioDeTeste();
});

test.afterEach(() => {
  definirPersonagemDoUsuarioDeTeste({ classe: 'arquimago_dados' });
});

test.describe('Ficha e atalho C (RF-19, RN-12)', () => {
  test('C abre a Ficha de outra tela e Esc volta para ela', async ({ page }) => {
    await page.goto('/tags');
    await expect(page.getByRole('heading', { level: 1, name: 'Tags' })).toBeVisible();

    await page.keyboard.press('c');
    await expect(page).toHaveURL(/\/personagem$/);
    await expect(tituloFicha(page)).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Ficha' }),
    ).toHaveAttribute('aria-current', 'page');

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/tags$/);
  });

  test('Esc na Ficha aberta direto pelo endereço vai para o Quadro', async ({ page }) => {
    await page.goto('/personagem');
    await expect(tituloFicha(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/$/);
  });

  test('em campo de texto, C digita; Ctrl+C não abre; desligado, C não abre', async ({ page }) => {
    await page.goto('/');
    const busca = page.getByRole('searchbox');
    await busca.fill('');
    await busca.press('c');
    await expect(busca, 'a letra foi digitada no campo').toHaveValue('c');
    await busca.press('Control+c');
    await expect(page, 'nem a letra nem o Ctrl+C abrem a Ficha').toHaveURL(/\/(\?.*)?$/);

    await page.goto('/personagem');
    const caixa = page.getByRole('checkbox', { name: 'Atalho C abre a Ficha' });
    await expect(caixa, 'ligado por padrão').toBeChecked();
    await caixa.uncheck();

    await page.goto('/tags');
    await expect(page.getByRole('heading', { level: 1, name: 'Tags' })).toBeVisible();
    await page.keyboard.press('c');
    // Asserção negativa: dá tempo para uma navegação que não deve acontecer.
    await page.waitForTimeout(500);
    await expect(page, 'com o atalho desligado, C não abre a Ficha').toHaveURL(/\/tags$/);

    await page.goto('/personagem');
    await expect(
      page.getByRole('checkbox', { name: 'Atalho C abre a Ficha' }),
      'a escolha ficou salva',
    ).not.toBeChecked();
  });

  test('Maestria por stack e Domínio por ferramenta, do maior XP ao menor (RN-10, RN-18)', async ({
    page,
  }) => {
    // Stacks sem cadastro no usuário de teste: a Ficha mostra a grafia do snapshot.
    inserirConclusaoDoUsuarioDeTeste({ trilha: 'desenvolvedor', xp: 150, stacks: ['zig', 'nim'] });
    inserirConclusaoDoUsuarioDeTeste({ trilha: 'desenvolvedor', xp: 40, stacks: ['zig'] });
    inserirConclusaoDoUsuarioDeTeste({ trilha: 'produtividade', xp: 60, stacks: ['figma'] });

    await page.goto('/personagem');
    const maestria = page.getByRole('region', { name: 'MAESTRIA POR STACK · DESENVOLVEDOR' });
    const itens = maestria.getByRole('listitem');
    await expect(itens).toHaveCount(2);
    await expect(itens.nth(0)).toContainText('zig');
    await expect(itens.nth(0)).toContainText('NV 5');
    await expect(itens.nth(0)).toContainText('2 projetos · 190 XP');
    // Nível 5 começa em 160 XP e o 6 em 224.
    await expect(maestria.getByRole('progressbar', { name: 'Maestria em zig' })).toHaveAttribute(
      'aria-valuetext',
      '30 de 64 XP rumo ao nível 6',
    );
    await expect(itens.nth(1)).toContainText('nim');
    await expect(itens.nth(1)).toContainText('1 projeto · 150 XP');

    const dominio = page.getByRole('region', { name: 'DOMÍNIO POR FERRAMENTA · PRODUTIVIDADE' });
    await expect(dominio.getByRole('progressbar', { name: 'Domínio em figma' })).toHaveAttribute(
      'aria-valuetext',
      '3 de 47 XP rumo ao nível 4',
    );
    await semViolacoesAxe(page, '/personagem com Maestria');

    zerarXpDoUsuarioDeTeste();
    await page.reload();
    await expect(maestria, 'sem conclusões, o estado vazio explica').toContainText(
      'Conclua um Projeto de Desenvolvimento para ganhar Maestria nas stacks dele.',
    );
    await expect(dominio).toContainText(
      'Conclua um Projeto Geral com ferramentas para ganhar Domínio nelas.',
    );
  });

  test('no celular (360 px), a Ficha com Maestria não rola na horizontal', async ({ page }) => {
    inserirConclusaoDoUsuarioDeTeste({
      trilha: 'desenvolvedor',
      xp: 150,
      stacks: ['uma stack bem comprida aqui'],
    });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/personagem');
    await expect(tituloFicha(page)).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      '/personagem em 360 px',
    ).toBe(true);
  });
});

test.describe('Cinemática de level up (RF-16, RN-08)', () => {
  const cinematica = (pagina: Page, nivel: number) =>
    pagina.getByRole('dialog', { name: `Nível ${nivel} alcançado` });

  test('com menos movimento, mostra direto o estado final; toca uma vez só', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    definirPersonagemDoUsuarioDeTeste({ classe: 'arquimago_dados', nivelMaximo: 20, nivelVisto: 19 });

    await page.goto('/');
    const janela = cinematica(page, 20);
    await expect(janela).toBeVisible();
    await expect(janela, 'o leitor de tela recebe um resumo só').toHaveAccessibleDescription(
      'Você subiu do nível 19 para o 20. Medalha II · Prata conquistada, título Desenvolvedor Aprendiz. Rank E para D.',
    );
    await expect(janela.getByRole('button', { name: 'Continuar' })).toBeFocused();
    const animacoes = await page.evaluate(() =>
      [...document.querySelectorAll('dialog[open] :is(.cinematica-passo, .cinematica-destaque)')].map(
        (elemento) => getComputedStyle(elemento).animationName,
      ),
    );
    expect(animacoes, 'nenhum passo anima (RNF-02)').toEqual(['none', 'none', 'none', 'none']);
    await semViolacoesAxe(page, 'cinemática aberta');

    // A marcação de "vista" é uma Server Action (POST): espera a resposta antes
    // de recarregar. O networkidle não serve: volta na hora se a página já
    // tinha ficado ociosa antes.
    const marcacao = page.waitForResponse((resposta) => resposta.request().method() === 'POST');
    await page.keyboard.press('Escape');
    await expect(janela).toBeHidden();
    await marcacao;
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(cinematica(page, 20), 'não toca de novo (RN-08)').toHaveCount(0);
  });

  test('com efeitos completos, Continuar fecha antes de a animação acabar', async ({ page }) => {
    definirPersonagemDoUsuarioDeTeste({ classe: 'arquimago_dados', nivelMaximo: 4, nivelVisto: 3 });
    await page.goto('/tags');
    const janela = cinematica(page, 4);
    await expect(janela).toBeVisible();
    await expect(janela, 'sem medalha nem troca de Rank').toHaveAccessibleDescription(
      'Você subiu do nível 3 para o 4.',
    );
    await janela.getByRole('button', { name: 'Continuar' }).click();
    await expect(janela).toBeHidden();
  });

  test('a Janela do Sistema da conclusão vem antes da cinemática', async ({ page }) => {
    definirPersonagemDoUsuarioDeTeste({ classe: 'arquimago_dados', nivelMaximo: 1, nivelVisto: 1 });
    const nome = nomeUnico('Projeto que sobe de nível');
    await cadastrarMissao(page, { nome, stacks: 'Go,' });
    await mudarStatusNaFicha(page, nome, 'Desenvolvimento');
    retrocederDesenvolvimento(idDaUrl(page), 25);
    await mudarStatusNaFicha(page, nome, 'Concluído');

    // 10 (criação) + 40 (conclusão, Rank E) = 50 XP: nível 2.
    const conclusao = page.getByRole('dialog', { name: nome });
    await expect(conclusao).toBeVisible();
    await expect(cinematica(page, 2), 'a cinemática espera a Janela').toBeHidden();

    await conclusao.getByRole('button', { name: 'Continuar' }).click();
    await expect(conclusao).toBeHidden();
    await expect(cinematica(page, 2)).toBeVisible();
    await cinematica(page, 2).getByRole('button', { name: 'Continuar' }).click();
    await expect(cinematica(page, 2)).toBeHidden();

    await excluirMissaoAberta(page);
  });
});
