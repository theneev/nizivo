import { defineConfig, type ViteUserConfig } from 'vitest/config';

// Run from packages/react after a build: `pnpm check:dist`. (Not test/dist: .gitignore drops every dist/.)
const config: ViteUserConfig = defineConfig({
  test: {
    environment: 'node',
    include: ['test/built/**/*.test.ts'],
  },
});

export default config;
