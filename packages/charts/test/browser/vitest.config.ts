import { defineConfig, type ViteUserConfig } from 'vitest/config';
import { engine, provider } from '../browser-engine.ts';

// Browser lane: what needs a real rasteriser and layout (the non-scaling-stroke check, focus,
// grid-track labels). Run from packages/charts: `pnpm test:browser`; `NZ_BROWSER=webkit` (or
// `firefox`) runs the same specs in another engine (test/browser-engine.ts). Needs the built
// @nizivo/tokens dist/tokens.css and this package's dist/styles.css (`pnpm build` first).
const config: ViteUserConfig = defineConfig({
  // react/jsx-dev-runtime too: without it a cold cache reloads the page once mid-run
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime'] },
  resolve: { dedupe: ['react', 'react-dom'] },
  test: {
    include: ['test/browser/**/*.spec.{ts,tsx}'],
    // the react lane's limit (packages/react/test/browser/vitest.config.ts)
    testTimeout: 15_000,
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      // wide enough for the widest plot the stroke spec draws (1200 px); the default is a phone
      viewport: { width: 1400, height: 900 },
      provider: provider(),
      instances: [{ browser: engine }],
    },
  },
});

export default config;
