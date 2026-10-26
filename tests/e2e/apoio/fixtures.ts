import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * `test` com uma verificação automática em todos os testes: nenhum erro de
 * console, nenhuma exceção na página e nenhuma violação de CSP. Uma violação
 * de CSP não quebra a tela na hora, por isso é cobrada aqui, em todo teste.
 */
export const test = base.extend<{ problemasNaPagina: string[] }>({
  problemasNaPagina: [
    async ({ page }, usar) => {
      const problemas: string[] = [];
      page.on('console', (mensagem) => {
        if (mensagem.type() === 'error') problemas.push(mensagem.text());
      });
      page.on('pageerror', (erro) => problemas.push(`pageerror: ${erro.message}`));
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (evento) =>
          console.error(`CSP: ${evento.violatedDirective} ${evento.blockedURI}`),
        );
      });
      await usar(problemas);
      expect(problemas, 'erros de console ou violações de CSP').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Nome único por teste: os dados do usuário de teste são compartilhados. */
export function nomeUnico(prefixo: string): string {
  return `${prefixo} ${Date.now().toString(36)}`;
}

/** Coluna do Quadro pelo título (Backlog, Em desenvolvimento, Concluídas). */
export function coluna(pagina: Page, titulo: string): Locator {
  return pagina.locator('section', { has: pagina.getByRole('heading', { level: 2, name: titulo }) });
}

/** Preenche e envia o formulário de nova Missão. */
export async function cadastrarMissao(
  pagina: Page,
  { nome, stacks, dificuldade = 'Média' }: { nome: string; stacks: string; dificuldade?: string },
): Promise<void> {
  await pagina.goto('/missoes/nova');
  await pagina.getByRole('textbox', { name: 'Nome' }).fill(nome);
  await pagina.getByRole('textbox', { name: 'Descrição' }).fill(`Descrição de ${nome}.`);
  await pagina.getByRole('combobox', { name: 'Stacks' }).fill(stacks);
  await pagina.getByText(dificuldade, { exact: true }).click();
  await pagina.getByRole('button', { name: 'Registrar missão' }).click();
  await pagina.waitForURL(/\/missoes\/[0-9a-f-]{36}$/);
}

/** Exclui a Missão aberta no detalhe, confirmando no diálogo. */
export async function excluirMissaoAberta(pagina: Page): Promise<void> {
  await pagina.getByRole('button', { name: 'Excluir', exact: true }).click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Excluir missão' }).click();
  await pagina.waitForURL('/');
}
