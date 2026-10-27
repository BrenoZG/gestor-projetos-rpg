import {
  cadastrarMissao,
  coluna,
  excluirMissaoAberta,
  expect,
  nomeUnico,
  opcaoDeEstilo,
  test,
} from './apoio/fixtures';

test.describe('Missões', () => {
  test('cadastra, muda o status e exclui uma missão (RF-01 a RF-04)', async ({ page }) => {
    const nome = nomeUnico('Missão do fluxo');

    await page.goto('/');
    await page.getByRole('link', { name: /Nova missão/ }).click();
    await page.getByRole('textbox', { name: 'Nome' }).fill(nome);
    await page.getByRole('textbox', { name: 'Descrição' }).fill('Prova do fluxo completo.');
    const stacks = page.getByRole('combobox', { name: 'Stacks' });
    await stacks.fill('Next.js');
    await stacks.press('Enter');
    await expect(page, 'Enter nas stacks não envia o formulário').toHaveURL(/\/missoes\/nova$/);
    await stacks.fill('next.js ');
    await stacks.press('Enter');
    await stacks.fill('Supabase');
    await stacks.press('Enter');
    await expect(page.getByRole('button', { name: /^Remover / }), 'repetida vira uma só (RN-05)').toHaveCount(
      2,
    );
    await opcaoDeEstilo(page, 'Hexagonal / Clean').check();
    for (const capacidade of ['Autenticação', 'Banco de dados', 'CI/CD e deploy']) {
      await page.getByRole('checkbox', { name: capacidade }).check();
    }
    await expect(page.getByText(/Rank de Missão\s*C · 31 pontos/), 'prévia do Rank (RN-14)').toBeVisible();
    await expect(page.getByText('Estilo +12 · Capacidades +15 · Stacks +4 (até 10 pontuam)')).toBeVisible();
    await page
      .getByRole('textbox', { name: 'Estrutura e arquitetura' })
      .fill('Camadas: domínio, dados e telas.');

    await page.getByRole('button', { name: 'Registrar missão' }).click();
    await expect(page).toHaveURL(/\/missoes\/[0-9a-f-]{36}$/);
    const urlMissao = page.url();
    await expect(page.getByRole('heading', { level: 2, name: nome })).toBeVisible();
    await expect(page.getByText('Rank C · Backlog · 31 pontos')).toBeVisible();
    await expect(page.getByText('Autenticação, Banco de dados, CI/CD e deploy')).toBeVisible();

    await page.goto('/');
    const cartao = coluna(page, 'Backlog').getByRole('link', { name: new RegExp(nome) });
    await expect(cartao).toBeVisible();
    await expect(cartao).toContainText('Hexagonal / Clean · 31 pontos');

    await page.goto(`${urlMissao}/editar`);
    await expect(page.getByRole('textbox', { name: 'Nome' })).toHaveValue(nome);
    await page.getByRole('combobox', { name: 'Status' }).selectOption('desenvolvimento');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page).toHaveURL(urlMissao);
    await expect(page.getByText(/Rank C · Desenvolvimento/)).toBeVisible();
    const inicio = page
      .locator('dt', { hasText: 'Início em desenvolvimento' })
      .locator('xpath=following-sibling::dd');
    await expect(inicio, 'data de início gravada (RN-02)').toHaveText(/\d{2}\/\d{2}\/\d{4}/);

    await page.goto('/');
    await expect(
      coluna(page, 'Em desenvolvimento').getByRole('link', { name: new RegExp(nome) }),
    ).toBeVisible();

    await page.goto(urlMissao);
    await page.getByRole('button', { name: 'Excluir', exact: true }).click();
    const dialogo = page.getByRole('dialog');
    await expect(
      dialogo.getByRole('button', { name: 'Cancelar' }),
      'foco começa no caminho seguro',
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
    await excluirMissaoAberta(page);
    await expect(page.getByRole('link', { name: new RegExp(nome) })).toHaveCount(0);
  });

  test('mostra os erros por campo e leva o foco ao primeiro', async ({ page }) => {
    await page.goto('/missoes/nova');
    await page.getByRole('button', { name: 'Registrar missão' }).click();

    const campoNome = page.getByRole('textbox', { name: 'Nome' });
    await expect(page.getByText('O nome precisa ter de 3 a 80 caracteres.')).toBeVisible();
    await expect(campoNome).toBeFocused();
    await expect(campoNome).toHaveAttribute('aria-invalid', 'true');
    for (const mensagem of [
      'A descrição é obrigatória.',
      'Adicione de 1 a 20 stacks.',
      'Escolha o estilo arquitetural da missão.',
      'Descreva a estrutura e a arquitetura da missão.',
    ]) {
      await expect(page.getByText(mensagem)).toBeVisible();
    }
  });

  test('barra nome repetido sem perder o que foi digitado', async ({ page }) => {
    const nome = nomeUnico('Missão original');
    await cadastrarMissao(page, { nome, stacks: 'Go,' });
    const urlOriginal = page.url();

    await page.goto('/missoes/nova');
    await page.getByRole('textbox', { name: 'Nome' }).fill(`  ${nome.toUpperCase()} `);
    await page.getByRole('textbox', { name: 'Descrição' }).fill('Duplicada.');
    await page.getByRole('combobox', { name: 'Stacks' }).fill('Go');
    await opcaoDeEstilo(page, 'Script ou automação').check();
    await page.getByRole('textbox', { name: 'Estrutura e arquitetura' }).fill('Um script.');
    await page.getByRole('button', { name: 'Registrar missão' }).click();

    await expect(page.getByText('Já existe uma missão com esse nome. Escolha outro.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Descrição' })).toHaveValue('Duplicada.');

    await page.goto(urlOriginal);
    await excluirMissaoAberta(page);
  });

  test('lista de stacks colada vira chips sem cortar nada', async ({ page }) => {
    await page.goto('/missoes/nova');
    const stacks = page.getByRole('combobox', { name: 'Stacks' });
    await stacks.fill('Next.js,Supabase,Tailwind,Playwright,Vitest,Go');

    await expect(page.getByRole('button', { name: /^Remover / })).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Remover Vitest' })).toBeVisible();
    await expect(stacks, 'o pedaço depois da última vírgula fica no campo').toHaveValue('Go');
  });

  test('stack digitada sem Enter vai no envio, sem a vírgula', async ({ page }) => {
    await cadastrarMissao(page, { nome: nomeUnico('Missão com rascunho'), stacks: 'Rascunho pendente' });
    await expect(page.getByText('Rascunho pendente', { exact: true })).toBeVisible();
    await excluirMissaoAberta(page);
  });

  for (const caminho of ['/missoes/00000000-0000-4000-8000-000000000000', '/missoes/nao-e-uuid']) {
    test(`id inexistente ou malformado mostra a página 404 (${caminho})`, async ({ page }) => {
      await page.goto(caminho);
      await expect(page.getByRole('heading', { level: 1, name: 'Área desconhecida' })).toBeVisible();
    });
  }

  test('no celular (360 px), Quadro, cadastro e detalhe não rolam na horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const semRolagemHorizontal = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

    await cadastrarMissao(page, {
      nome: nomeUnico('Missão com um nome bem comprido para o celular'),
      stacks: 'Uma stack com nome bem comprido,Outra,',
    });
    expect(await semRolagemHorizontal(), 'detalhe').toBe(true);
    const urlMissao = page.url();

    await page.goto('/missoes/nova');
    expect(await semRolagemHorizontal(), 'cadastro').toBe(true);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Backlog' })).toBeVisible();
    expect(await semRolagemHorizontal(), 'Quadro').toBe(true);

    await page.goto(urlMissao);
    await excluirMissaoAberta(page);
  });
});
