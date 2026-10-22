// Runs the React Router 8 framework-mode fixture (fixtures/react-router) end to end (ARCHITECTURE.md
// §18.1, §21.2 "React Router 8 fixture"; r1 §5.4). With --record it writes the committed
// fixtures/react-router/results/build.json; otherwise a temporary copy.
//
//   node fixtures/runner/react-router.ts [--skip-pack] [--skip-install] [--record]
//
// 1. pack.ts: build the monorepo, pack the packages (--fixture react-router).
// 2. pnpm install --frozen-lockfile in fixtures/react-router (its own workspace root and lockfile).
// 3. `react-router build` (Vite 8, the Environment API: a client and an SSR build), with no
//    `ssr.noExternal`: the server build imports @nizivo/* from node_modules. Any warning or error the
//    build prints fails the run.
// 4. server.js (node:http and @react-router/node's request listener), then spec.ts in Chromium on
//    every route, reading the server's HTML: hydration with no console message, axe in four modes,
//    the Next fixture's interactions, and the client modules each route ships (one chunk per route).
import { readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { packInto, REPO_ROOT } from './pack.ts';
import { resultsFile, run, serve, version, writeResults } from './serve.ts';
import { loadMarkers, PAGES, runSpec, type PageSpec } from './spec.ts';

const FIXTURE_DIR = join(REPO_ROOT, 'fixtures', 'react-router');
const PORT = 3421;
const BASE = `http://localhost:${PORT}`;
const REACT_ROUTER = join(FIXTURE_DIR, 'node_modules', '.bin', 'react-router');
const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' };

function nextPage(path: string): PageSpec {
  const spec = PAGES[path];
  if (spec === undefined) throw new Error(`no Next page ${path} to reuse`);
  return spec;
}

/** The Next fixture's checks where the page is the same (fixtures/vite's pages, as routes). */
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
      // an asset listing line (`build/client/assets/inline-error-….css  0.4 kB`), not a message
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

  rmSync(join(FIXTURE_DIR, 'build'), { recursive: true, force: true });
  const started = performance.now();
  const output = run(REACT_ROUTER, ['build'], FIXTURE_DIR, env);
  const buildSeconds = Math.round((performance.now() - started) / 100) / 10;
  const buildWarnings = warnings(output);
  // The server bundle keeps every @nizivo import external: Node loads the published files.
  const serverBundle = readFileSync(join(FIXTURE_DIR, 'build', 'server', 'index.js'), 'utf8');
  const external = [...serverBundle.matchAll(/from "(@nizivo\/[^"]+)"/g)].map((m) => m[1] ?? '');
  // The served HTML must name this build's client entry.
  const entry = readdirSync(join(FIXTURE_DIR, 'build', 'client', 'assets')).find((file) =>
    /^entry\.client-.+\.js$/.test(file),
  );
  if (entry === undefined) throw new Error('no entry.client chunk in build/client/assets');

  const stop = await serve('node', ['server.js', String(PORT)], FIXTURE_DIR, env, BASE);
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
    fixture: 'react-router',
    command: 'react-router build; node server.js',
    versions: {
      'react-router': version(FIXTURE_DIR, 'react-router'),
      '@react-router/dev': version(FIXTURE_DIR, '@react-router/dev'),
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
  console.log(`react-router: ${result.pass ? 'pass' : `FAIL\n  ${failures.join('\n  ')}`}`);
  return result.pass ? 0 : 1;
}

process.exitCode = await main();
