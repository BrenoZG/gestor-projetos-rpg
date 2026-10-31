import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { excluirMissaoAberta, expect, nomeUnico, test } from './apoio/fixtures';

/** Critérios WCAG verificados automaticamente (o axe cobre só uma parte da WCAG). */
const NIVEIS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function semViolacoes(pagina: Page, tela: string): Promise<void> {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(NIVEIS_WCAG).analyze();
  const resumo = resultado.violations.map((v) => `${v.id}: ${v.nodes.length} nó(s) — ${v.help}`);
  expect(resumo, `violações de acessibilidade em ${tela}`).toEqual([]);
}

/** Sufixo comum às tags de um teste: os dados do usuário de teste são compartilhados. */
function sufixoUnico(): string {
  return Date.now().toString(36);
}

/** Cadastra um Projeto Geral com as tags dadas e devolve o endereço da ficha. */
async function cadastrarComTags(pagina: Page, tags: string[]): Promise<string> {
  const nome = nomeUnico('Tags');
  await pagina.goto('/missoes/nova');
  await pagina.getByRole('radio', { name: /^Geral/ }).check();
  await pagina.getByRole('textbox', { name: 'Nome' }).fill(nome);
  await pagina.getByRole('textbox', { name: 'Descrição' }).fill(`Descrição de ${nome}.`);
  const campoTags = pagina.getByRole('combobox', { name: /Tags/ });
  for (const tag of tags) {
    await campoTags.fill(tag);
    await campoTags.press('Enter');
  }
  await pagina.getByRole('button', { name: 'Registrar projeto' }).click();
  await pagina.waitForURL(/\/missoes\/[0-9a-f-]{36}$/);
  return pagina.url();
}

async function excluirMissao(pagina: Page, endereco: string): Promise<void> {
  await pagina.goto(endereco);
  await excluirMissaoAberta(pagina);
}

const linhaDaTag = (pagina: Page, nome: string) =>
  pagina.getByRole('list', { name: 'Suas tags' }).getByRole('listitem').filter({ hasText: nome });

test.describe('Página Tags (RF-27 a RF-29, RN-19)', () => {
  // Movimento reduzido: o axe mede contraste no estado final, não no meio de uma animação de entrada.
  test.use({ reducedMotion: 'reduce' });

  test('renomear para um nome existente pede confirmação e junta as tags', async ({ page }) => {
    const sufixo = sufixoUnico();
    const errada = `Revnda ${sufixo}`;
    const certa = `Revenda ${sufixo}`;
    const primeira = await cadastrarComTags(page, [errada]);
    const segunda = await cadastrarComTags(page, [errada, certa]);

    await page.goto('/tags');
    await expect(linhaDaTag(page, errada)).toContainText('2 projetos');
    await semViolacoes(page, 'lista de tags');

    await page.getByRole('button', { name: `Renomear ${errada}` }).click();
    const campo = page.getByRole('textbox', { name: `Novo nome de ${errada}` });
    await expect(campo, 'abrir a edição leva o foco ao campo').toBeFocused();
    await semViolacoes(page, 'edição de tag');
    await campo.fill(certa);
    await page.getByRole('button', { name: 'Salvar' }).click();

    await expect(linhaDaTag(page, errada)).toContainText(
      `“${certa}” já existe. Os 2 projetos de “${errada}” passam para “${certa}”, e “${errada}” deixa de existir. Isso não pode ser desfeito.`,
    );
    await expect(
      linhaDaTag(page, errada).getByRole('button', { name: 'Cancelar' }),
      'o foco fica na opção segura',
    ).toBeFocused();
    await semViolacoes(page, 'confirmação de junção');

    await page.getByRole('button', { name: `Juntar em “${certa}”` }).click();
    const aviso = page.getByRole('status').filter({ hasText: 'Tags juntadas' });
    await expect(aviso).toHaveText(`Tags juntadas: 2 projetos agora em “${certa}”.`);
    await expect(aviso, 'o foco vai para o aviso, já que a linha sumiu').toBeFocused();
    await expect(page.getByRole('button', { name: `Renomear ${errada}` })).toHaveCount(0);
    await expect(linhaDaTag(page, certa)).toContainText('2 projetos');

    await page.goto(segunda);
    const tagsDaFicha = page.getByRole('region', { name: 'Tags' });
    await expect(tagsDaFicha.getByText(certa, { exact: true })).toHaveCount(1);
    await expect(tagsDaFicha.getByText(errada)).toHaveCount(0);

    await excluirMissao(page, primeira);
    await excluirMissao(page, segunda);
  });

  test('renomeia pelo teclado, cancela com Esc e recusa nome inválido', async ({ page }) => {
    const sufixo = sufixoUnico();
    const antes = `Vidos ${sufixo}`;
    const depois = `Vídeos ${sufixo}`;
    const missao = await cadastrarComTags(page, [antes]);

    await page.goto('/tags');
    const renomear = page.getByRole('button', { name: `Renomear ${antes}` });
    await renomear.focus();
    await page.keyboard.press('Enter');
    const campo = page.getByRole('textbox', { name: `Novo nome de ${antes}` });
    await expect(campo).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(campo).toHaveCount(0);
    await expect(renomear, 'Esc devolve o foco ao botão').toBeFocused();

    await page.keyboard.press('Enter');
    await campo.fill('   ');
    await page.keyboard.press('Enter');
    await expect(linhaDaTag(page, antes)).toContainText('A tag precisa ter de 1 a 30 caracteres.');
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
    await expect(campo).toBeFocused();

    await campo.fill(depois);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: 'renomeada' })).toHaveText(
      `Tag renomeada para “${depois}”.`,
    );

    await page.goto(missao);
    await expect(page.getByRole('region', { name: 'Tags' }).getByText(depois, { exact: true })).toBeVisible();
    await excluirMissaoAberta(page);
  });

  test('exclui só a tag sem uso, pelo menu, sem rolagem horizontal em 360 px', async ({ page }) => {
    const sufixo = sufixoUnico();
    const sobra = `Sobra ${sufixo}`;
    const fica = `Fica ${sufixo}`;
    await excluirMissao(page, await cadastrarComTags(page, [sobra]));
    const missao = await cadastrarComTags(page, [fica]);

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Tags' }).click();
    await page.waitForURL('/tags');
    await expect(page.getByRole('link', { name: 'Tags' })).toHaveAttribute('aria-current', 'page');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'sem rolagem horizontal em 360 px',
    ).toBe(true);

    await expect(linhaDaTag(page, fica)).toContainText('1 projeto');
    await expect(
      page.getByRole('button', { name: `Excluir ${fica}` }),
      'tag em uso não oferece excluir',
    ).toHaveCount(0);
    await expect(linhaDaTag(page, sobra)).toContainText('0 projetos');

    await page.getByRole('button', { name: `Excluir ${sobra}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir tag' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'excluída' })).toHaveText(
      `Tag “${sobra}” excluída.`,
    );
    await expect(linhaDaTag(page, sobra)).toHaveCount(0);

    await excluirMissao(page, missao);
  });
});
