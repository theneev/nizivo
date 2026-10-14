import { configDefaults, defineConfig } from 'vitest/config';

// Node environment for week 1: SSR, contracts and module-graph checks. Browser projects
// (Playwright, conformance) join when the testkit suites land. test/built runs after a build,
// through `check:dist` and test/built/vitest.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'test/built/**'],
  },
});
