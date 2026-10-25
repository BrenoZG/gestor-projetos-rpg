import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolução nativa dos `paths` do tsconfig (alias `@/`), disponível desde o
    // Vite 8. Substitui o plugin vite-tsconfig-paths e sua dependência tsconfck,
    // que ficou sem manutenção e não aceita o TypeScript 6.
    tsconfigPaths: true,
    // O `server-only` do Next lança erro fora do servidor de componentes;
    // nos testes unitários vira um módulo vazio (tests/unit/apoio/server-only.ts).
    alias: { 'server-only': fileURLToPath(new URL('./tests/unit/apoio/server-only.ts', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
