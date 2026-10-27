import { defineConfig, type ViteUserConfig } from 'vitest/config';
import { engine, provider } from '../browser-engine.ts';
import { adapterSwap } from '../adapters.ts';
import { reactMatrix } from '../react-matrix.ts';

// The overlay conformance lane (ARCHITECTURE.md §9.6 case 8, §12.5): every overlay adapter of the
// react-aria family runs the same cases in a real browser. Run from packages/react:
// `vitest run --config test/overlay/vitest.config.ts`. The node-side cases (SSR, the engine-free
// contracts, the OverlayEngine shape) are *.test.tsx files in this folder and run with `pnpm test`.
// Needs the built @nizivo/tokens dist/tokens.css and the generated styles/base.css.
// `NZ_BROWSER=webkit` (or `firefox`) runs the same cases in another engine; the Chromium-only cases
// (forced colours through the DevTools protocol) skip themselves there. test/browser-engine.ts has
// the engine switch and the Firefox launch fix.
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
      'react-aria/useToast',
      // the hooks Tooltip adapter (NZ_ADAPTER=hooks)
      'react-aria/I18nProvider',
      'react-aria/SSRProvider',
      'react-aria/useOverlayPosition',
      'react-aria/useTooltipTrigger',
      'react-stately/useTooltipTriggerState',
      // the Base UI canary (NZ_ADAPTER=base-ui, D-dk)
      '@base-ui/react/dialog',
      '@base-ui/react/select',
    ],
  },
  // `NZ_REACT=19.2`: React 19.2 instead of the workspace's 19.3 (test/react-matrix.ts).
  ...reactMatrix(),
  // `NZ_ADAPTER=hooks`: the hooks Tooltip adapter instead of the default (test/adapters.ts).
  plugins: adapterSwap(),
  test: {
    // The Base UI canary (NZ_ADAPTER=base-ui, D-dk) swaps only Dialog and Select, so it runs their
    // specs and the nesting cases between them; nesting.spec skips its mixed-family cases.
    include:
      process.env['NZ_ADAPTER'] === 'base-ui'
        ? ['dialog', 'select', 'select-field', 'nesting'].map((s) => `test/overlay/${s}.spec.tsx`)
        : ['test/overlay/**/*.spec.tsx'],
    // Spring transitions run up to 493 ms; a case waits for an exit to finish.
    testTimeout: 15_000,
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      // no sourcemaps for dependencies (1 to 3 s a lane); our own code's stacks stay mapped
      dependencySourcemaps: false,
      provider: provider(),
      instances: [{ browser: engine }],
    },
  },
});

export default config;
