// Runs the TanStack Start fixture (fixtures/tanstack-start) end to end (ARCHITECTURE.md §11.1, §18.1;
// v0.3). With --record it writes the committed fixtures/tanstack-start/results/build.json; otherwise a
// temporary copy.
//
//   node fixtures/runner/tanstack-start.ts [--skip-pack] [--skip-install] [--record]
//
// 1. pack.ts: build the monorepo, pack the packages (--fixture tanstack-start).
// 2. pnpm install --frozen-lockfile in fixtures/tanstack-start (its own workspace root and lockfile).
// 3. `vite build` (Start's plugin: a client and a server build), with no `ssr.noExternal`: the server
//    imports @nizivo/* from node_modules. Any warning or error the build prints fails the run.
// 4. `vite preview` (Start's production server), then spec.ts in Chromium on every route, reading the
//    server's HTML: hydration with no console message, axe in four modes, the Next fixture's
//    interactions, and the client modules each route ships (Start splits a chunk per route).
// The plan's experimental RSC lane (§11.1: whether @vitejs/plugin-rsc honours 'use client' inside
// node_modules) is not built yet; this is the server-rendering lane.
import { readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { packInto, REPO_ROOT } from './pack.ts';
import { resultsFile, run, serve, version, writeResults } from './serve.ts';
import { loadMarkers, PAGES, runSpec, type PageSpec } from './spec.ts';

const FIXTURE_DIR = join(REPO_ROOT, 'fixtures', 'tanstack-start');
const PORT = 3425;
const BASE = `http://localhost:${PORT}`;
const VITE = join(FIXTURE_DIR, 'node_modules', '.bin', 'vite');
const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' };

function nextPage(path: string): PageSpec {
  const spec = PAGES[path];
  if (spec === undefined) throw new Error(`no Next page ${path} to reuse`);
  return spec;
}

/** The Next fixture's checks where the page is the same (fixtures/vite's pages, as file routes). */
const ROUTES: Record<string, PageSpec> = {
  '/': { renders: [] },
  '/button-only': nextPage('/button-only'),
  '/t0-barrel': nextPage('/t0-barrel'),
  '/alert-dismiss': nextPage('/alert-dismiss'),
  '/overlays': nextPage('/namespace'),
  '/forms': nextPage('/forms'),
  '/menu': nextPage('/menu'),
  '/tabs': nextPage('/tabs'),
};

/** Warning and error lines of a build's output, not its asset listing. */
const warnings = (output: string): string[] =>
  output.split('\n').filter(
    (line) =>
      /warn|error|MODULE_LEVEL/i.test(line) &&
      !/│ gzip:/.test(line) &&
      // an asset listing line (`dist/client/assets/inline-error-….css  0.4 kB`), not a message
      !/^\s*(?:build|dist)\//.test(line),
  );

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
  const buildWarnings = warnings(output);
  // The server build keeps every @nizivo import external: Node loads the published files.
  const serverDir = join(FIXTURE_DIR, 'dist', 'server');
  const external: string[] = [];
  for (const file of readdirSync(serverDir, { recursive: true, encoding: 'utf8' })) {
    if (!file.endsWith('.js')) continue;
    for (const m of readFileSync(join(serverDir, file), 'utf8').matchAll(
      /from "(@nizivo\/[^"]+)"/g,
    )) {
      external.push(m[1] ?? '');
    }
  }
  // The served HTML must name this build's client entry.
  const entry = readdirSync(join(FIXTURE_DIR, 'dist', 'client', 'assets')).find((file) =>
    /^index-.+\.js$/.test(file),
  );
  if (entry === undefined) throw new Error('no index chunk in dist/client/assets');

  const stop = await serve(
    VITE,
    ['preview', '--port', String(PORT), '--strictPort'],
    FIXTURE_DIR,
    env,
    BASE,
  );
  let spec: Awaited<ReturnType<typeof runSpec>>;
  try {
    spec = await runSpec(BASE, markers, {
      buildId: entry,
      leakExpected: false,
      markerChecks: true,
      pages: ROUTES,
      initialHtml: 'server',
      chunks: 'imports',
    });
  } finally {
    await stop();
  }

  const failures = Object.entries(spec.pages).flatMap(([path, result]) =>
    result.failures.map((failure) => `${path} ${failure}`),
  );
  for (const line of buildWarnings) failures.push(`build: ${line.trim()}`);
  if (external.length === 0) failures.push('server bundle: no @nizivo import left external');
  const real = realpathSync(join(FIXTURE_DIR, 'node_modules', '@nizivo', 'react'));
  const result = {
    fixture: 'tanstack-start',
    command: 'vite build; vite preview',
    versions: {
      '@tanstack/react-start': version(FIXTURE_DIR, '@tanstack/react-start'),
      '@tanstack/react-router': version(FIXTURE_DIR, '@tanstack/react-router'),
      vite: version(FIXTURE_DIR, 'vite'),
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
    serverExternal: [...new Set(external)].toSorted(),
    pass: failures.length === 0,
    failures,
    pages: spec.pages,
  };
  writeResults(resultsFile(FIXTURE_DIR, 'build.json', values.record === true), result);
  console.log(`tanstack-start: ${result.pass ? 'pass' : `FAIL\n  ${failures.join('\n  ')}`}`);
  return result.pass ? 0 : 1;
}

process.exitCode = await main();
