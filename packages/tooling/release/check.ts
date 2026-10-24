// `pnpm check:release`: release hygiene on the PACKED tarballs of @nizivo/tokens, @nizivo/react and
// @nizivo/icons (ARCHITECTURE.md §18.1 "Package correctness", §19.3, §21.1 exit criterion 3). Run
// after `pnpm build`.
//
//   node packages/tooling/release/check.ts [--keep]
//
// Per package: `pnpm pack` (the fixture runner's pack step, without markers), then
// 1. the tarball allowlist and the published package.json rules (tarball.ts);
// 2. publint on the tarball, strict, so warnings fail too;
// 3. attw on the tarball, profile esm-only, with the CSS entries excluded;
// 4. the directive guard and the `export * as` lint on the unpacked dist/ against src/ (directives.ts).
// --keep leaves the tarballs and their unpacked folders in the temporary directory it prints.
// The local release script (release.ts) calls checkPackages() and publishes the tarballs it checked.
/* oxlint-disable no-await-in-loop -- one package at a time: they share the stage folder, and each report prints whole */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { publint } from 'publint';
import { formatMessage } from 'publint/utils';
import { pack, REPO_ROOT, unpack } from '../../../fixtures/runner/pack.ts';
import { checkDirectives } from './directives.ts';
import { checkTarball } from './tarball.ts';

export const PACKAGES = [
  { name: '@nizivo/tokens', dir: 'packages/tokens', partsOnly: false },
  { name: '@nizivo/react', dir: 'packages/react', partsOnly: true },
  // ~1,900 icon modules behind two wildcard subpaths (`./*`, `./brands/*`). attw checks only '.':
  // it does not expand wildcard subpaths, so their types are not covered here (§14.2).
  { name: '@nizivo/icons', dir: 'packages/icons', partsOnly: false },
  // v0.2 (§14.1): one 'use client' island; no namespace objects, so no *.parts.js rule
  { name: '@nizivo/charts', dir: 'packages/charts', partsOnly: false },
];
const ATTW = join(import.meta.dirname, '..', 'node_modules', '.bin', 'attw');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Every file under `dir`, keyed by its path relative to `base` with forward slashes. */
function readTree(dir: string, base: string, keep: (file: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = join(entry.parentPath, entry.name);
    const key = relative(base, file).split(sep).join('/');
    if (keep(key)) out.set(key, readFileSync(file, 'utf8'));
  }
  return out;
}

/** Component folders (`button`, `unstable/<name>`) and their component.json tier. */
function components(srcDir: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const parent of [srcDir, join(srcDir, 'unstable')]) {
    if (!existsSync(parent)) continue;
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      const file = join(parent, entry.name, 'component.json');
      if (!entry.isDirectory() || !existsSync(file)) continue;
      const config: unknown = JSON.parse(readFileSync(file, 'utf8'));
      const folder = relative(srcDir, join(parent, entry.name)).split(sep).join('/');
      out.set(folder, isRecord(config) ? String(config['tier']) : 'unknown');
    }
  }
  return out;
}

function tarEntries(tarball: string): string[] {
  const result = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`tar -tzf ${tarball} failed:\n${result.stderr}`);
  return result.stdout.split('\n').filter((line) => line !== '' && !line.endsWith('/'));
}

export async function runPublint(
  tarball: string,
): Promise<{ failures: string[]; notes: string[] }> {
  const bytes = readFileSync(tarball);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const { messages, pkg } = await publint({ pack: { tarball: buffer }, strict: true });
  const text = (m: (typeof messages)[number]) =>
    `${m.code}: ${formatMessage(m, pkg, { color: false }) ?? m.path.join('.')}`;
  return {
    failures: messages.filter((m) => m.type !== 'suggestion').map(text),
    notes: messages.filter((m) => m.type === 'suggestion').map(text),
  };
}

/** Exports keys whose target is a stylesheet: attw resolves types, and CSS has none (r4 §3). */
function cssEntries(manifest: Record<string, unknown>): string[] {
  const exports = manifest['exports'];
  if (!isRecord(exports)) return [];
  return Object.entries(exports)
    .filter(([, target]) => {
      const file = isRecord(target) ? target['default'] : target;
      return typeof file === 'string' && file.endsWith('.css');
    })
    .map(([key]) => key);
}

export function runAttw(tarball: string, manifest: Record<string, unknown>): string[] {
  const exclude = cssEntries(manifest);
  const args = [tarball, '--profile', 'esm-only', '--format', 'ascii', '--no-color', '--no-emoji'];
  if (exclude.length > 0) args.push('--exclude-entrypoints', ...exclude);
  const result = spawnSync(ATTW, args, { encoding: 'utf8' });
  if (result.status === 0) return [];
  return [`exit ${result.status ?? result.signal}\n${result.stdout}${result.stderr}`];
}

export interface CheckedPackage {
  name: string;
  dir: string;
  /** The tarball the checks ran on; release.ts publishes exactly this file. */
  tarball: string;
  /** Its package.json. */
  manifest: Record<string, unknown>;
}

/**
 * Packs each published package into `stage` and runs every check on the tarball. The tarballs and
 * their unpacked folders stay in `stage`. Prints one report per package; returns the problem count.
 */
export async function checkPackages(
  stage: string,
): Promise<{ failed: number; packages: CheckedPackage[] }> {
  let failed = 0;
  const packages: CheckedPackage[] = [];
  for (const { name, dir, partsOnly } of PACKAGES) {
    const tarball = pack(dir, stage);
    const unpacked = unpack(tarball, join(stage, name.replace('@nizivo/', '')));
    const manifest: unknown = JSON.parse(readFileSync(join(unpacked, 'package.json'), 'utf8'));
    if (!isRecord(manifest)) throw new Error(`${name}: package.json is not an object`);
    const entries = tarEntries(tarball);
    const srcDir = join(REPO_ROOT, dir, 'src');

    const { failures: publintFailures, notes } = await runPublint(tarball);
    const checks: [string, string[]][] = [
      [
        `tarball allowlist (${entries.length} files)`,
        checkTarball(name, entries, manifest, (path) => readFileSync(join(unpacked, path)).length),
      ],
      ['publint (strict)', publintFailures],
      ['attw (esm-only)', runAttw(tarball, manifest)],
      [
        'directive guard and export * as lint',
        checkDirectives({
          dist: readTree(join(unpacked, 'dist'), unpacked, (file) => /\.(js|d\.ts)$/.test(file)),
          src: readTree(srcDir, join(REPO_ROOT, dir), (file) => /\.(tsx?|json)$/.test(file)),
          components: components(srcDir),
          partsOnly,
        }),
      ],
    ];
    console.log(`\n${name}`);
    for (const [label, failures] of checks) {
      console.log(`  ${failures.length === 0 ? 'ok  ' : 'FAIL'} ${label}`);
      for (const failure of failures)
        console.log(`       ${failure.replaceAll('\n', '\n       ')}`);
      failed += failures.length;
    }
    for (const note of notes) console.log(`       publint suggestion: ${note}`);
    packages.push({ name, dir, tarball, manifest });
  }
  return { failed, packages };
}

/** Whether every published package has been built. */
export function missingBuilds(): string[] {
  return PACKAGES.filter(({ dir }) => !existsSync(join(REPO_ROOT, dir, 'dist', 'index.js'))).map(
    ({ dir }) => dir,
  );
}

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { keep: { type: 'boolean' } } });
  for (const dir of missingBuilds()) {
    console.error(`check:release: ${dir}/dist/index.js is missing; run \`pnpm build\` first`);
    return 1;
  }
  const stage = mkdtempSync(join(tmpdir(), 'nz-release-'));
  let failed = 0;
  try {
    ({ failed } = await checkPackages(stage));
  } finally {
    if (values.keep === true) console.log(`\nkept ${stage}`);
    else rmSync(stage, { recursive: true, force: true });
  }
  console.log(failed === 0 ? '\ncheck:release: ok' : `\ncheck:release: ${failed} problem(s)`);
  return failed === 0 ? 0 : 1;
}

if (import.meta.main) process.exitCode = await main();
