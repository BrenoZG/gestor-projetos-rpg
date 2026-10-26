import { defineConfig, devices } from '@playwright/test';

import { ARQUIVO_SESSAO } from './tests/e2e/apoio/caminhos';

/**
 * Testes de ponta a ponta contra o build de produção (`next start`) e o
 * Supabase LOCAL. Rodar: `npm run build` e depois `npm run test:e2e`.
 *
 * - Um único usuário de teste e dados compartilhados: os testes rodam em série.
 * - Sem novas tentativas: teste instável tem causa a corrigir, não a esconder.
 * - Localmente usa o Chrome instalado; no CI, o Chromium do Playwright.
 */

const PORTA = 3100;
const ENDERECO = `http://127.0.0.1:${PORTA}`;

const navegador = { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' };

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: ENDERECO,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'sessao', testMatch: /sessao\.setup\.ts/ },
    {
      name: 'com-sessao',
      use: { ...navegador, storageState: ARQUIVO_SESSAO },
      dependencies: ['sessao'],
      testIgnore: /sem-sessao\.spec\.ts/,
    },
    { name: 'sem-sessao', use: navegador, testMatch: /sem-sessao\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run start -- -p ${PORTA}`,
    url: `${ENDERECO}/api/saude`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
