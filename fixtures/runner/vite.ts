// Runs the Vite fixture (fixtures/vite) end to end. With --record it writes the
// committed fixtures/vite/results/build.json; otherwise a temporary copy, so a lane run leaves the tree clean.
//
//   node fixtures/runner/vite.ts [--skip-pack] [--skip-install] [--record]
//
// 1. pack.ts: build the monorepo, pack the three packages, plant the markers (--fixture vite).
// 2. pnpm install --frozen-lockfile in fixtures/vite (its own workspace root and lockfile).
// 3. vite build (a fresh dist/), vite preview, then spec.ts in Chromium on every page, and the theme
//    flash check (theme.ts) on the home page.
import { readFileSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { packInto, REPO_ROOT } from './pack.ts';
import { resultsFile, run, serve, version, writeResults } from './serve.ts';
import { loadMarkers, PAGES, runSpec, type PageSpec } from './spec.ts';
import { checkThemeFlash } from './theme.ts';

const FIXTURE_DIR = join(REPO_ROOT, 'fixtures', 'vite');
const PORT = 3418;
const BASE = `http://localhost:${PORT}`;
const VITE = join(FIXTURE_DIR, 'node_modules', '.bin', 'vite');
const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' };

function nextPage(path: string): PageSpec {
  const spec = PAGES[path];
  if (spec === undefined) throw new Error(`no Next page ${path} to reuse`);
  return spec;
}

/**
 * The Next fixture's checks where the page is the same. In a single-page app every page is client
 * code, so "no client module" means the bundler dropped every 'use client' module the page does not
 * render, barrel imports included: that is the tree-shaking measurement.
 */
const VITE_PAGES: Record<string, PageSpec> = {
  // The app shell: React, the router and no @nizivo module (the baseline for the bytes per page).
  '/': { renders: [] },
  '/button-only': nextPage('/button-only'),
  '/button-subpath': nextPage('/button-subpath'),
  '/t0-barrel': nextPage('/t0-barrel'),
  '/alert-dismiss': nextPage('/alert-dismiss'),
  '/overlays': nextPage('/namespace'),
  '/barrel-select': nextPage('/barrel-select'),
  '/forms': nextPage('/forms'),
  '/menu': nextPage('/menu'),
  '/tabs': nextPage('/tabs'),
  '/tab-nav': nextPage('/tab-nav'),
  '/icons': nextPage('/icons-client'),
};

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      'skip-pack': { type: 'boolean' },
      'skip-install': { type: 'boolean' },
      record: { type: 'boolean' },
    },
  });
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
  const output = run(VITE, ['build'], FIXTURE_DIR, env);
  const buildSeconds = Math.round((performance.now() - started) / 100) / 10;
  // Warnings and errors, not the asset listing (`dist/assets/inline-error-….js  0.71 kB │ gzip: …`).
  const buildWarnings = output
    .split('\n')
    .filter((line) => /warn|error|MODULE_LEVEL/i.test(line) && !/│ gzip:/.test(line));
  // The served index.html must name this build's entry chunk.
  const entry = /src="\/assets\/(index-[^"]+\.js)"/.exec(
    readFileSync(join(FIXTURE_DIR, 'dist', 'index.html'), 'utf8'),
  )?.[1];
  if (entry === undefined) throw new Error('no entry chunk in dist/index.html');

  const stop = await serve(
    VITE,
    ['preview', '--port', String(PORT), '--strictPort'],
    FIXTURE_DIR,
    env,
    BASE,
  );
  let spec: Awaited<ReturnType<typeof runSpec>>;
  let themeFlash: Awaited<ReturnType<typeof checkThemeFlash>>;
  try {
    spec = await runSpec(BASE, markers, {
      buildId: entry,
      leakExpected: false,
      markerChecks: true,
      pages: VITE_PAGES,
      initialHtml: 'rendered',
      chunks: 'imports',
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
    fixture: 'vite',
    command: 'vite build && vite preview',
    versions: {
      vite: version(FIXTURE_DIR, 'vite'),
      '@vitejs/plugin-react': version(FIXTURE_DIR, '@vitejs/plugin-react'),
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
  writeResults(resultsFile(FIXTURE_DIR, 'build.json', values.record === true), result);
  console.log(`vite: ${result.pass ? 'pass' : `FAIL\n  ${failures.join('\n  ')}`}`);
  return result.pass ? 0 : 1;
}

process.exitCode = await main();
