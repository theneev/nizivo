// Runs the Astro fixture (fixtures/astro) end to end. With --record it writes the
// committed fixtures/astro/results/static.json; otherwise a temporary copy, so a lane run leaves the tree clean.
//
//   node fixtures/runner/astro.ts [--skip-pack] [--skip-install] [--record]
//
// 1. pack.ts: build the monorepo, pack the three packages, plant the markers (--fixture astro).
// 2. pnpm install --frozen-lockfile in fixtures/astro (its own workspace root and lockfile).
// 3. astro build (static output, a fresh dist/), astro preview, then spec.ts in Chromium on every page,
//    and the theme flash check (theme.ts) on the home page.
//
// Astro 7 runs `astro preview` in the background when it detects a coding agent (am-i-vibing);
// `--ignore-lock` keeps it in the foreground, in the process group serve.ts stops, for a person and an
// agent alike. ASTRO_TELEMETRY_DISABLED keeps the run offline.
/* oxlint-disable no-await-in-loop -- islands scroll into view one after another */
import { randomUUID } from 'node:crypto';
import { realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium, type Page } from 'playwright';
import { packInto, REPO_ROOT } from './pack.ts';
import { resultsFile, run, serve, version, writeResults } from './serve.ts';
import { loadMarkers, PAGES, runSpec, type PageSpec } from './spec.ts';
import { checkThemeFlash } from './theme.ts';

const FIXTURE_DIR = join(REPO_ROOT, 'fixtures', 'astro');
const PORT = 3419;
const BASE = `http://localhost:${PORT}`;
const ASTRO = join(FIXTURE_DIR, 'node_modules', '.bin', 'astro');

function nextPage(path: string): PageSpec {
  const spec = PAGES[path];
  if (spec === undefined) throw new Error(`no Next page ${path} to reuse`);
  return spec;
}

/**
 * The Next fixture's checks where the page is the same. A page whose components carry no client
 * directive must load no script at all (serverOnlyNoScript); an island ships its client leaves.
 */
const ASTRO_PAGES: Record<string, PageSpec> = {
  '/': { renders: [] },
  '/button-only': nextPage('/button-only'),
  '/t0-barrel': nextPage('/t0-barrel'),
  // Static output cannot read the query string, so there is no navigation step here.
  '/tab-nav': { renders: [], slots: ['tab-nav', 'tab-nav-link'] },
  '/icons-server': nextPage('/icons-server'),
  '/alert-dismiss': nextPage('/alert-dismiss'),
  '/overlays': nextPage('/namespace'),
  '/forms': nextPage('/forms'),
  '/menu': nextPage('/menu'),
  '/tabs': { ...nextPage('/tabs'), scrollToIslands: true },
  '/icons-client': nextPage('/icons-client'),
  '/two-islands': {
    renders: ['field', 'input'],
    islandIds: true,
    slots: ['field', 'field-label', 'field-description', 'input', 'input-control'],
  },
};

/**
 * Every island hydrated: Astro drops an island's `ssr` attribute once it hands it to React, and React
 * has attached a fiber to its first element. `client:visible` islands are scrolled into view first.
 */
async function islandsHydrated(page: Page, spec: PageSpec): Promise<void> {
  if (spec.scrollToIslands === true) {
    // An island is `display: contents`, with no box of its own: scroll to its first element.
    for (const island of await page.locator('astro-island').all()) {
      await island.locator(':scope > :not(astro-slot, template)').first().scrollIntoViewIfNeeded();
    }
  }
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('astro-island')].every((island) => {
        const first = island.querySelector(':scope > :not(astro-slot, template)');
        return (
          !island.hasAttribute('ssr') &&
          first !== null &&
          Object.keys(first).some((key) => key.startsWith('__reactFiber'))
        );
      }),
    undefined,
    { timeout: 30_000 },
  );
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      'skip-pack': { type: 'boolean' },
      'skip-install': { type: 'boolean' },
      record: { type: 'boolean' },
    },
  });
  const buildId = randomUUID();
  const env = {
    ...process.env,
    COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
    ASTRO_TELEMETRY_DISABLED: '1',
    NZ_BUILD_ID: buildId,
  };
  if (values['skip-pack'] !== true) packInto(FIXTURE_DIR, { build: true });
  if (values['skip-install'] !== true) {
    run('corepack', ['pnpm@12.11.2', 'install', '--frozen-lockfile'], FIXTURE_DIR, env);
  }
  const markers = loadMarkers(
    join(FIXTURE_DIR, 'node_modules', '@nizivo', 'react'),
    join(FIXTURE_DIR, '.packed', 'markers.json'),
  );

  rmSync(join(FIXTURE_DIR, 'dist'), { recursive: true, force: true });
  const started = performance.now();
  const output = run(ASTRO, ['build'], FIXTURE_DIR, env);
  const buildSeconds = Math.round((performance.now() - started) / 100) / 10;
  // Warnings and errors, not the asset listing (`dist/assets/inline-error-….js  0.71 kB │ gzip: …`).
  const buildWarnings = output
    .split('\n')
    .filter((line) => /warn|error|MODULE_LEVEL/i.test(line) && !/│ gzip:/.test(line));

  const stop = await serve(
    ASTRO,
    ['preview', '--port', String(PORT), '--ignore-lock'],
    FIXTURE_DIR,
    env,
    BASE,
  );
  let spec: Awaited<ReturnType<typeof runSpec>>;
  let themeFlash: Awaited<ReturnType<typeof checkThemeFlash>>;
  try {
    spec = await runSpec(BASE, markers, {
      // The base layout writes NZ_BUILD_ID into a meta tag at build time.
      buildId,
      leakExpected: false,
      markerChecks: true,
      pages: ASTRO_PAGES,
      initialHtml: 'server',
      ready: islandsHydrated,
      chunks: 'imports',
      serverOnlyNoScript: true,
    });
    const browser = await chromium.launch();
    try {
      themeFlash = await checkThemeFlash(
        browser,
        BASE,
        '/',
        join(FIXTURE_DIR, '.packed', 'tokens', 'dist', 'tokens.css'),
      );
    } finally {
      await browser.close();
    }
  } finally {
    await stop();
  }

  const failures = Object.entries(spec.pages).flatMap(([path, result]) =>
    result.failures.map((failure) => `${path} ${failure}`),
  );
  if (!themeFlash.ok) failures.push(`theme flash: ${JSON.stringify(themeFlash)}`);
  // A clean build is part of the claim (no MODULE_LEVEL_DIRECTIVE or any other warning), so any
  // warning or error line the build printed fails the run.
  for (const line of buildWarnings) failures.push(`build: ${line.trim()}`);
  const real = realpathSync(join(FIXTURE_DIR, 'node_modules', '@nizivo', 'react'));
  const result = {
    fixture: 'astro',
    command: 'astro build && astro preview --ignore-lock',
    versions: {
      astro: version(FIXTURE_DIR, 'astro'),
      '@astrojs/react': version(FIXTURE_DIR, '@astrojs/react'),
      react: version(FIXTURE_DIR, 'react'),
      'react-dom': version(FIXTURE_DIR, 'react-dom'),
      'react-aria-components': version(
        FIXTURE_DIR,
        join(real, '..', '..', 'react-aria-components'),
      ),
      browser: spec.browser,
    },
    buildSeconds,
    buildWarnings,
    pass: failures.length === 0,
    failures,
    themeFlash,
    pages: spec.pages,
  };
  writeResults(resultsFile(FIXTURE_DIR, 'static.json', values.record === true), result);
  console.log(`astro: ${result.pass ? 'pass' : `FAIL\n  ${failures.join('\n  ')}`}`);
  return result.pass ? 0 : 1;
}

process.exitCode = await main();
