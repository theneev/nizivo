// The Playwright engine of the browser and overlay lanes (test/browser, test/overlay). `NZ_BROWSER`
// picks it: chromium (the default), firefox or webkit. Chromium-only cases (forced colours through
// the DevTools protocol) skip themselves elsewhere.
//
// Firefox on macOS: Playwright's Firefox (Nightly, revision 1555 for Playwright 1.64.0) reads
// ~/Library/Application Support/Firefox before it opens the profile it is given. Where macOS denies
// that folder to the terminal's processes (Darwin 27 here: "Operation not permitted", even outside
// any sandbox), it exits at once with "Could not find profile folder." CFFIXED_USER_HOME moves the
// home folder Firefox resolves through Core Foundation to a folder of our own; HOME stays, so
// Playwright still finds its browser cache. The folder is reused across runs and left in the
// system temporary directory: macOS puts a "deny delete" ACL on the Library and Downloads folders
// Firefox creates in it (`chmod -R -N` lifts it), and the next run needs them anyway.
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { playwright } from '@vitest/browser-playwright';

declare const process: { env: Record<string, string | undefined>; platform: string };

const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
export type Engine = (typeof BROWSERS)[number];

/** The engine `NZ_BROWSER` names, or Chromium. */
export const engine: Engine =
  BROWSERS.find((name) => name === process.env['NZ_BROWSER']) ?? 'chromium';

/** Playwright's browser-context options (`locale`, …), as the provider takes them. */
export type ContextOptions = NonNullable<Parameters<typeof playwright>[0]>['contextOptions'];

/**
 * The provider, with Firefox's own home folder on macOS. `contextOptions` set the page's context:
 * the locale-determinism spec (test/browser/locale) runs with `{ locale: 'de-DE' }`.
 */
export function provider(contextOptions?: ContextOptions): ReturnType<typeof playwright> {
  const context = contextOptions === undefined ? {} : { contextOptions };
  if (engine !== 'firefox' || process.platform !== 'darwin') return playwright(context);
  const home = `${tmpdir().replace(/\/$/, '')}/nizivo-firefox-home`;
  mkdirSync(home, { recursive: true });
  // Playwright passes `env` to the browser as it is, so the rest of the environment is spread in.
  return playwright({
    ...context,
    launchOptions: { env: { ...process.env, CFFIXED_USER_HOME: home } },
  });
}
