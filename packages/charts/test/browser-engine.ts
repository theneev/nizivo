// The Playwright engine of the charts browser lane (test/browser). `NZ_BROWSER` picks it: chromium
// (the default), firefox or webkit.
//
// A copy of packages/react/test/browser-engine.ts, kept in step by hand: charts imports nothing
// from @nizivo/react (ARCHITECTURE.md §14.1), and sharing a test helper through @nizivo/testkit
// would change how react's browser configs load theirs. Why Firefox needs its own home folder on
// macOS (CFFIXED_USER_HOME): see that file's header.
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { playwright } from '@vitest/browser-playwright';

const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
export type Engine = (typeof BROWSERS)[number];

/** The engine `NZ_BROWSER` names, or Chromium. */
export const engine: Engine =
  BROWSERS.find((name) => name === process.env['NZ_BROWSER']) ?? 'chromium';

/**
 * The device pixel ratio `NZ_DPR` names (charts only: `NZ_DPR=2` repeats the stroke check of R14 at
 * DPR 2), or Playwright's default of 1.
 */
export const dpr: number = Number(process.env['NZ_DPR'] ?? '') || 1;

/** The provider, with Firefox's own home folder on macOS and the `NZ_DPR` device scale. */
export function provider(): ReturnType<typeof playwright> {
  const contextOptions = dpr === 1 ? {} : { contextOptions: { deviceScaleFactor: dpr } };
  if (engine !== 'firefox' || process.platform !== 'darwin') return playwright(contextOptions);
  const home = `${tmpdir().replace(/\/$/, '')}/nizivo-firefox-home`;
  mkdirSync(home, { recursive: true });
  // Playwright passes `env` to the browser as it is, so the rest of the environment is spread in.
  return playwright({
    ...contextOptions,
    launchOptions: { env: { ...process.env, CFFIXED_USER_HOME: home } },
  });
}
