import { defineConfig } from 'vitest/config';

// Node only: every pattern renders through react-dom/server from the built packages, as the docs
// render it. The docs smoke check runs axe over each pattern's page in a browser.
export default defineConfig({
  test: {
    environment: 'node',
    // The repo's node-lane limit (packages/react/vitest.config.ts explains the 30 s).
    testTimeout: 30_000,
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
