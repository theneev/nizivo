import { defineConfig } from 'vitest/config';

// Node only: the normalizer and the Terrazzo dry run. test/golden/** holds no test files yet.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
