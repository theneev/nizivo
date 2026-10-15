import { configDefaults, defineConfig } from 'vitest/config';

// Node environment for week 1: SSR, contracts and module-graph checks. Browser projects
// (Playwright, conformance) join when the testkit suites land. test/built runs after a build,
// through `check:dist` and test/built/vitest.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,tsx}'],
    // Vitest's 5 s default failed a gate run on a loaded machine in week 5 (the tooling tests, now at
    // 120 s). Here the slowest test takes under 0.3 s unloaded, so 30 s is about 100 times that: room
    // for a machine running other lanes beside the gate, while a real hang still fails in half a
    // minute. Tests that build or spawn set their own, longer limit.
    testTimeout: 30_000,
    exclude: [...configDefaults.exclude, 'test/built/**'],
  },
});
