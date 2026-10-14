import { playwright } from '@vitest/browser-playwright';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

// Browser lane (Chromium through Playwright): hydration and native validation, which need a real
// DOM. Run from packages/react: `vitest run --config test/browser/vitest.config.ts`. Kept out of the
// node suite (vitest.config.ts includes only *.test.ts[x]). Script: `pnpm test:browser`. Needs the
// built @nizivo/tokens dist/tokens.css and the generated styles/base.css.
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
    ],
  },
  resolve: { dedupe: ['react', 'react-dom'] },
  test: {
    include: ['test/browser/**/*.spec.tsx'],
    browser: {
      enabled: true,
      headless: true,
      // no failure screenshots written into the package
      screenshotFailures: false,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});

export default config;
