import { playwright } from '@vitest/browser-playwright';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

// The overlay conformance lane (ARCHITECTURE.md §9.6 case 8, §12.5): every overlay adapter of the
// react-aria family runs the same cases in a real browser. Run from packages/react:
// `vitest run --config test/overlay/vitest.config.ts`. The node-side cases (SSR, the engine-free
// contracts, the OverlayEngine shape) are *.test.tsx files in this folder and run with `pnpm test`.
// Needs the built @nizivo/tokens dist/tokens.css and the generated styles/base.css.
// `NZ_BROWSER=webkit` (or `firefox`) runs the same cases in another engine; the Chromium-only cases
// (forced colours through the DevTools protocol) skip themselves there.
declare const process: { env: Record<string, string | undefined> };
const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
const browser = BROWSERS.find((name) => name === process.env['NZ_BROWSER']) ?? 'chromium';
const config: ViteUserConfig = defineConfig({
  // Pre-bundled up front, as in test/browser: a mid-run re-bundle loads a second React copy.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-dom/server',
      'react-aria-components',
      'react-aria/PortalProvider',
      'react-aria/useFocusable',
      'react-aria/useObjectRef',
    ],
  },
  resolve: { dedupe: ['react', 'react-dom'] },
  test: {
    include: ['test/overlay/**/*.spec.tsx'],
    // Spring transitions run up to 493 ms; a case waits for an exit to finish.
    testTimeout: 15_000,
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright(),
      instances: [{ browser }],
    },
  },
});

export default config;
