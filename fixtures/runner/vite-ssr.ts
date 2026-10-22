// Runs the Vite SSR fixture (fixtures/vite-ssr) end to end (ARCHITECTURE.md §18.1, §21.2 "Vite SSR
// fixture"; r1 §5.2, §11.5). With --record it writes the committed fixtures/vite-ssr/results/build.json;
// otherwise a temporary copy, so a lane run leaves the tree clean.
//
//   node fixtures/runner/vite-ssr.ts [--skip-pack] [--skip-install] [--record]
//
// 1. pack.ts: build the monorepo, pack the packages (--fixture vite-ssr).
// 2. pnpm install --frozen-lockfile in fixtures/vite-ssr (its own workspace root and lockfile).
// 3. `vite build` (the client) and `vite build --ssr src/entry-server.jsx` (the server), with no
//    `ssr.noExternal`: the server build must import @nizivo/* from node_modules, and Node must load it
//    as published. Any warning or error either build prints fails the run.
// 4. server.js (node:http), then spec.ts in Chromium on every page, reading the server's HTML:
//    hydration with no console message (the client entry logs every recoverable error), axe in four
//    modes, and the same interactions as the Next fixture's pages.
//
// Per-page tree-shaking is not measured here: the pages share one client bundle, because
// renderToString does not wait for lazy chunks. fixtures/vite and fixtures/next measure it.
import { readFileSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { packInto, REPO_ROOT } from './pack.ts';
import { resultsFile, run, serve, version, writeResults } from './serve.ts';
import { loadMarkers, PAGES, runSpec, type PageSpec } from './spec.ts';

const FIXTURE_DIR = join(REPO_ROOT, 'fixtures', 'vite-ssr');
const PORT = 3420;
const BASE = `http://localhost:${PORT}`;
const VITE = join(FIXTURE_DIR, 'node_modules', '.bin', 'vite');
const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' };

function nextPage(path: string): PageSpec {
  const spec = PAGES[path];
  if (spec === undefined) throw new Error(`no Next page ${path} to reuse`);
  return spec;
}

/** The Next fixture's checks where the page is the same (fixtures/vite's pages, server-rendered). */
const SSR_PAGES: Record<string, PageSpec> = {
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

  rmSync(join(FIXTURE_DIR, 'dist'), { recursive: true, force: true });
  const started = performance.now();
  const client = run(VITE, ['build', '--outDir', 'dist/client'], FIXTURE_DIR, env);
  const server = run(
    VITE,
    ['build', '--ssr', 'src/entry-server.jsx', '--outDir', 'dist/server'],
    FIXTURE_DIR,
    env,
  );
  const buildSeconds = Math.round((performance.now() - started) / 100) / 10;
  const buildWarnings = [...warnings(client), ...warnings(server)];
  // The server bundle keeps every @nizivo import external: Node loads the published files.
  const serverBundle = readFileSync(join(FIXTURE_DIR, 'dist', 'server', 'entry-server.js'), 'utf8');
  const external = [...serverBundle.matchAll(/from "(@nizivo\/[^"]+)"/g)].map((m) => m[1] ?? '');
  const entry = /src="\/assets\/(index-[^"]+\.js)"/.exec(
    readFileSync(join(FIXTURE_DIR, 'dist', 'client', 'index.html'), 'utf8'),
  )?.[1];
  if (entry === undefined) throw new Error('no entry chunk in dist/client/index.html');

  const stop = await serve('node', ['server.js', String(PORT)], FIXTURE_DIR, env, BASE);
  let spec: Awaited<ReturnType<typeof runSpec>>;
  try {
    spec = await runSpec(BASE, markers, {
      buildId: entry,
      leakExpected: false,
      // one client bundle for every page (above): which client modules a page ships is not measured
      markerChecks: false,
      pages: SSR_PAGES,
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
    fixture: 'vite-ssr',
    command: 'vite build; vite build --ssr src/entry-server.jsx; node server.js',
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
    serverExternal: [...new Set(external)].toSorted(),
    pass: failures.length === 0,
    failures,
    pages: spec.pages,
  };
  writeResults(resultsFile(FIXTURE_DIR, 'build.json', values.record === true), result);
  console.log(`vite-ssr: ${result.pass ? 'pass' : `FAIL\n  ${failures.join('\n  ')}`}`);
  return result.pass ? 0 : 1;
}

process.exitCode = await main();
