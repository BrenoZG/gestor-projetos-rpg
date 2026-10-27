import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * `test` com uma verificação automática em todos os testes: nenhum erro de
 * console, nenhuma exceção na página e nenhuma violação de CSP. Uma violação
 * de CSP não quebra a tela na hora, por isso é cobrada aqui, em todo teste.
 *
 * `errosEsperados` serve só ao teste que provoca uma falha de propósito (ex.:
 * derrubar a requisição de uma Server Action): cada padrão precisa ser estreito,
 * e a CSP nunca entra nele.
 */
export const test = base.extend<{ errosEsperados: RegExp[]; problemasNaPagina: string[] }>({
  errosEsperados: [[], { option: true }],
  problemasNaPagina: [
    async ({ page, errosEsperados }, usar) => {
      const problemas: string[] = [];
      page.on('console', (mensagem) => {
        if (mensagem.type() !== 'error') return;
        const texto = mensagem.text();
        if (!texto.startsWith('CSP:') && errosEsperados.some((padrao) => padrao.test(texto))) return;
        problemas.push(texto);
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

/** Opção de estilo arquitetural pelo rótulo; o nome acessível termina nos pontos ("Monolito +5"). */
export function opcaoDeEstilo(pagina: Page, rotulo: string): Locator {
  const rotuloEscapado = rotulo.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return pagina.getByRole('radio', { name: new RegExp(`^${rotuloEscapado} \\+\\d+$`) });
}

/** Preenche e envia o formulário de nova Missão. */
export async function cadastrarMissao(
  pagina: Page,
  { nome, stacks, estilo = 'Monolito' }: { nome: string; stacks: string; estilo?: string },
): Promise<void> {
  await pagina.goto('/missoes/nova');
  await pagina.getByRole('textbox', { name: 'Nome' }).fill(nome);
  await pagina.getByRole('textbox', { name: 'Descrição' }).fill(`Descrição de ${nome}.`);
  await pagina.getByRole('combobox', { name: 'Stacks' }).fill(stacks);
  await opcaoDeEstilo(pagina, estilo).check();
  await pagina.getByRole('textbox', { name: 'Estrutura e arquitetura' }).fill(`Arquitetura de ${nome}.`);
  await pagina.getByRole('button', { name: 'Registrar missão' }).click();
  await pagina.waitForURL(/\/missoes\/[0-9a-f-]{36}$/);
}

/** Exclui a Missão aberta no detalhe, confirmando no diálogo. */
export async function excluirMissaoAberta(pagina: Page): Promise<void> {
  await pagina.getByRole('button', { name: 'Excluir', exact: true }).click();
  await pagina.getByRole('dialog').getByRole('button', { name: 'Excluir missão' }).click();
  await pagina.waitForURL('/');
}
