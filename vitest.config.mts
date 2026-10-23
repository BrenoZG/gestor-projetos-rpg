import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolução nativa dos `paths` do tsconfig (alias `@/`), disponível desde o
    // Vite 8. Substitui o plugin vite-tsconfig-paths e sua dependência tsconfck,
    // que ficou sem manutenção e não aceita o TypeScript 6.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
