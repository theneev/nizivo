import { defineConfig, type ViteUserConfig } from 'vitest/config';
import { engine, provider } from '../browser-engine.ts';

// Browser lane (Chromium through Playwright): hydration and native validation, which need a real
// DOM. Run from packages/react: `vitest run --config test/browser/vitest.config.ts`. Kept out of the
// node suite (vitest.config.ts includes only *.test.ts[x]). Script: `pnpm test:browser`. Needs the
// built @nizivo/tokens dist/tokens.css and the generated styles/base.css. `NZ_BROWSER=webkit` (or
// `firefox`) runs the same specs in another engine (test/browser-engine.ts); the release lanes run
// Chromium.
const config: ViteUserConfig = defineConfig({
  // Pre-bundled up front: found mid-run on a cold cache, react-aria is re-bundled and a second React
  // copy loads ("reading 'useRef'" of null) until the cache is warm.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-aria-components',
      'react-aria/PortalProvider',
      'react-aria/useFocusable',
      'react-aria/useObjectRef',
      'react-aria/useToast',
    ],
  },
  resolve: { dedupe: ['react', 'react-dom'] },
  test: {
    include: ['test/browser/**/*.spec.tsx'],
    // Each case renders, waits a few frames and drives real input: well under a second alone, but
    // vitest's 5 s default is too close under a loaded machine. A real hang still fails.
    testTimeout: 15_000,
    browser: {
      enabled: true,
      headless: true,
      // no failure screenshots written into the package
      screenshotFailures: false,
      provider: provider(),
      instances: [{ browser: engine }],
    },
  },
});

export default config;
