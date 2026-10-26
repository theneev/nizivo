// Runs the Next fixture (fixtures/next) end to end. With --record it writes the committed
// fixtures/next/results/<variant>.json; otherwise temporary copies, so a lane run leaves the tree clean.
//
//   node fixtures/runner/next.ts [--skip-pack] [--skip-install] [--variants turbopack,webpack,webpack-opi] [--dev] [--record]
//
// 1. pack.ts: build the monorepo, pack @nizivo/tokens and @nizivo/react, plant the markers.
// 2. pnpm install --frozen-lockfile in fixtures/next (its own workspace root with its own lockfile; the
//    @nizivo packages are unpacked `file:` folders, which pnpm re-copies whenever their files change).
// 3. Per variant: delete .next/<variant>, next build into it, next start, then spec.ts in Chromium
//    (axe on every page) and the theme flash check (theme.ts) on the home page.
//    --dev adds an informational `next dev` pass: development React reports hydration mismatches
//    (attribute differences included) that production React does not log.
/* oxlint-disable no-await-in-loop -- variants share one port (each has its own distDir), so they run one after another */
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, realpathSync, rmSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { status } from './http.ts';
import { packInto, REPO_ROOT } from './pack.ts';
import { resultsFile, writeResults } from './serve.ts';
import { loadMarkers, runSpec, type PageResult } from './spec.ts';
import { checkThemeFlash, type ThemeFlashResult } from './theme.ts';

const FIXTURE_DIR = join(REPO_ROOT, 'fixtures', 'next');
const VARIANTS = ['turbopack', 'webpack', 'webpack-opi'] as const;
type Variant = (typeof VARIANTS)[number] | 'dev';
const PORT = 3417;
// localhost, not 127.0.0.1: `next dev` blocks its HMR and dev resources for other origins.
const BASE = `http://localhost:${PORT}`;
const NEXT = join(FIXTURE_DIR, 'node_modules', '.bin', 'next');
const env = (variant: Variant) => ({
  ...process.env,
  NZ_VARIANT: variant,
  NEXT_TELEMETRY_DISABLED: '1',
  COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
});

function isVariant(value: string): value is (typeof VARIANTS)[number] {
  return VARIANTS.some((variant) => variant === value);
}

function sync(command: string, args: string[], variant: Variant): string {
  const result = spawnSync(command, args, {
    cwd: FIXTURE_DIR,
    env: env(variant),
    encoding: 'utf8',
  });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${output}`);
  return output;
}

async function answers(): Promise<boolean> {
  return (await status(BASE)) !== undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts `next start` (or `next dev`) and returns its stop function. */
async function serve(variant: Variant): Promise<() => Promise<void>> {
  if (await answers()) throw new Error(`${BASE} already answers; stop that server first`);
  const args = variant === 'dev' ? ['dev', '-p', String(PORT)] : ['start', '-p', String(PORT)];
  // Its own process group: `next start` forks a next-server child that outlives a plain kill.
  const child = spawn(NEXT, args, {
    cwd: FIXTURE_DIR,
    env: env(variant),
    stdio: 'ignore',
    detached: true,
  });
  const stop = async () => {
    if (child.pid !== undefined) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // already gone
      }
    }
    for (let attempt = 0; attempt < 40 && (await answers()); attempt++) await sleep(250);
    if (await answers()) throw new Error(`next ${args[0]} still answers on ${BASE}`);
  };
  for (let attempt = 0; attempt < 120; attempt++) {
    const code = await status(BASE);
    if (code !== undefined && code >= 200 && code < 300) return stop;
    await sleep(500);
  }
  await stop();
  throw new Error(`next ${args[0]} did not answer on ${BASE}`);
}

/** The version of an installed package: a name under node_modules, or an absolute folder. */
function version(name: string): string {
  const file = join(
    isAbsolute(name) ? name : join(FIXTURE_DIR, 'node_modules', name),
    'package.json',
  );
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  return typeof parsed === 'object' && parsed !== null && 'version' in parsed
    ? String(parsed.version)
    : 'unknown';
}

/** react-aria-components as resolved for @nizivo/react: pnpm links it beside the package's real path. */
function engineVersion(): string {
  const real = realpathSync(join(FIXTURE_DIR, 'node_modules', '@nizivo', 'react'));
  return version(join(real, '..', '..', 'react-aria-components'));
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      'skip-pack': { type: 'boolean' },
      'skip-install': { type: 'boolean' },
      variants: { type: 'string' },
      dev: { type: 'boolean' },
      record: { type: 'boolean' },
    },
  });
  const requested = (values.variants ?? VARIANTS.join(',')).split(',');
  const variants: Variant[] = requested.filter(isVariant);
  if (variants.length !== requested.length)
    throw new Error(`unknown variant in ${values.variants}`);
  if (values.dev === true) variants.push('dev');

  if (values['skip-pack'] !== true) packInto(FIXTURE_DIR, { build: true });
  if (values['skip-install'] !== true) {
    sync('corepack', ['pnpm@12.11.2', 'install', '--frozen-lockfile'], 'turbopack');
  }
  const packageRoot = join(FIXTURE_DIR, 'node_modules', '@nizivo', 'react');
  const markers = loadMarkers(packageRoot, join(FIXTURE_DIR, '.packed', 'markers.json'));

  let failed = 0;
  for (const variant of variants) {
    // A fresh distDir every time: webpack's persistent cache treats node_modules packages as immutable
    // by name and version, and @nizivo/react is always 0.0.0, so a cached build ships the old library.
    rmSync(join(FIXTURE_DIR, '.next', variant), { recursive: true, force: true });
    let buildWarnings: string[] = [];
    if (variant !== 'dev') {
      const output = sync(
        NEXT,
        variant === 'turbopack' ? ['build'] : ['build', '--webpack'],
        variant,
      );
      buildWarnings = output.split('\n').filter((line) => /warn|error/i.test(line));
    }
    const stop = await serve(variant);
    let spec: { browser: string; pages: Record<string, PageResult> };
    let themeFlash: ThemeFlashResult;
    try {
      spec = await runSpec(BASE, markers, {
        // Every page must come from this variant's build, never from a server left running.
        buildId:
          variant === 'dev'
            ? undefined
            : readFileSync(join(FIXTURE_DIR, '.next', variant, 'BUILD_ID'), 'utf8').trim(),
        // Spike S2c: plain webpack bundles every client module reachable through the barrel.
        leakExpected: variant === 'webpack',
        // Development chunks are unminified and per-module; the marker checks are for builds.
        markerChecks: variant !== 'dev',
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
    const failures = Object.entries(spec.pages).flatMap(([path, page]) =>
      page.failures.map((failure) => `${path} ${failure}`),
    );
    if (!themeFlash.ok) failures.push(`theme flash: ${JSON.stringify(themeFlash)}`);
    // A clean build is part of the claim (no MODULE_LEVEL_DIRECTIVE or any other warning), so any
    // warning or error line the build printed fails the run.
    for (const line of buildWarnings) failures.push(`build: ${line.trim()}`);
    const result = {
      variant,
      command:
        variant === 'dev'
          ? 'next dev'
          : `next build${variant === 'turbopack' ? '' : ' --webpack'} && next start`,
      versions: {
        next: version('next'),
        react: version('react'),
        'react-dom': version('react-dom'),
        'react-aria-components': engineVersion(),
        browser: spec.browser,
      },
      buildWarnings,
      pass: failures.length === 0,
      failures,
      themeFlash,
      pages: spec.pages,
    };
    writeResults(resultsFile(FIXTURE_DIR, `${variant}.json`, values.record === true), result);
    console.log(`${variant}: ${result.pass ? 'pass' : `FAIL\n  ${failures.join('\n  ')}`}`);
    if (!result.pass && variant !== 'dev') failed++;
  }
  return failed === 0 ? 0 : 1;
}

process.exitCode = await main();
