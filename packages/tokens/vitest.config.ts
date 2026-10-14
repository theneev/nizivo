import { defineConfig } from 'vitest/config';

// Node only: the normalizer, the Terrazzo build and the a11y gate. test/golden/** holds the dist
// goldens, not tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
