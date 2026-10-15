import { defineConfig, type ViteUserConfig } from 'vitest/config';

// Run from packages/react after a build: `pnpm check:dist`. (Not test/dist: .gitignore drops every dist/.)
const config: ViteUserConfig = defineConfig({
  test: {
    environment: 'node',
    include: ['test/built/**/*.test.ts'],
    // Vitest's 5 s default failed a gate run on a loaded machine in week 5 (the tooling tests, now at
    // 120 s). Here the slowest test takes under 0.3 s unloaded, so 30 s is about 100 times that: room
    // for a machine running other lanes beside the gate, while a real hang still fails in half a
    // minute. Tests that build or spawn set their own, longer limit.
    testTimeout: 30_000,
  },
});

export default config;
