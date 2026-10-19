// Packs @nizivo/tokens, @nizivo/react, @nizivo/icons and @nizivo/charts and unpacks each tarball
// into <fixture>/.packed/{tokens,react,icons,charts}
// (ARCHITECTURE.md §18.1: fixtures install packed tarballs, never workspace links). A fixture depends
// on those folders with `file:`, which pnpm copies into its store: the files are exactly the
// tarball's, and the fixture's lockfile stays the same across library builds (a tarball's integrity
// hash would change with every build).
//
//   node fixtures/runner/pack.ts [--fixture next] [--no-build]
//
// It builds the monorepo (turbo; skipped with --no-build), runs `pnpm pack` in each package, unpacks,
// then appends one marker statement to every 'use client' module of the react package. Nothing else
// changes. The marker is a side effect, so a minifier keeps it whenever the bundler keeps the module;
// spec.ts greps a page's client chunks for it to see which client modules the page ships (§21.1 exit
// criterion 2). The marker map is written to <fixture>/.packed/markers.json.
// Icon modules have no directive, so they get their own markers (`nzim[icons/calendar]`), in
// <fixture>/.packed/icon-markers.json: spec.ts checks that a page ships exactly the icons it imports.
// @nizivo/charts is private until v0.2 (it is packed here, never published from here); its 'use
// client' modules (the ChartInteraction island) get `nzcm[...]` markers in
// <fixture>/.packed/chart-markers.json, so spec.ts can check that a server chart ships only the
// island and a third-party child inside ChartFrame ships no charts module at all.
//
// `pack` and `unpack` are also the pack step of the release checks (packages/tooling/release), which
// lint the tarballs themselves and never plant markers.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';

export const REPO_ROOT = join(import.meta.dirname, '..', '..');
const DIRECTIVE = '"use client";\n';

/** `nzfm[select/select.client]`: unique per module, and never a substring of another marker. */
export function markerFor(distPath: string): string {
  return `nzfm[${distPath.replace(/^dist\//, '').replace(/\.js$/, '')}]`;
}

function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' },
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`);
}

function pnpm(args: string[], cwd: string): void {
  run('corepack', ['pnpm@12.11.2', ...args], cwd);
}

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/** Packs one package (a folder relative to the repo root) into `stage`; returns the tarball path. */
export function pack(packageDir: string, stage: string): string {
  const before = new Set(readdirSync(stage));
  pnpm(['pack', '--pack-destination', stage], join(REPO_ROOT, packageDir));
  const made = readdirSync(stage).filter((name) => name.endsWith('.tgz') && !before.has(name));
  if (made.length !== 1 || made[0] === undefined) {
    throw new Error(`pack of ${packageDir} made ${made.length} tarballs: ${made.join(', ')}`);
  }
  return join(stage, made[0]);
}

/** Unpacks a tarball's `package/` folder to `to`. */
export function unpack(tarball: string, to: string): string {
  const scratch = `${tarball}.unpacked`;
  mkdirSync(scratch);
  run('tar', ['-xzf', tarball, '-C', scratch], REPO_ROOT);
  renameSync(join(scratch, 'package'), to);
  return to;
}

/** `nzcm[_island/chart-interaction.client]`: a @nizivo/charts client module. */
export function chartMarkerFor(distPath: string): string {
  return `nzcm[${distPath.replace(/^dist\//, '').replace(/\.js$/, '')}]`;
}

/** Plants the markers in an unpacked package; returns { marker: dist path }. */
export function plantMarkers(
  packageDir: string,
  markerOf: (distPath: string) => string = markerFor,
): Record<string, string> {
  const markers: Record<string, string> = {};
  for (const file of files(join(packageDir, 'dist')).toSorted()) {
    if (!file.endsWith('.js')) continue;
    const source = readFileSync(file, 'utf8');
    if (!source.startsWith(DIRECTIVE)) continue;
    const distPath = relative(packageDir, file).split(sep).join('/');
    const marker = markerOf(distPath);
    const plant = `globalThis.__NZ_FIXTURE_MARKERS__ = [...(globalThis.__NZ_FIXTURE_MARKERS__ ?? []), ${JSON.stringify(marker)}];\n`;
    writeFileSync(file, source + plant);
    markers[marker] = distPath;
  }
  return markers;
}

/** `nzim[icons/calendar]`: an @nizivo/icons module, never a substring of another marker. */
export function iconMarkerFor(distPath: string): string {
  return `nzim[${distPath.replace(/^dist\//, '').replace(/\.js$/, '')}]`;
}

/** Plants a marker in every icon module and the shared base of unpacked @nizivo/icons. */
export function plantIconMarkers(packageDir: string): Record<string, string> {
  const markers: Record<string, string> = {};
  for (const file of files(join(packageDir, 'dist')).toSorted()) {
    const distPath = relative(packageDir, file).split(sep).join('/');
    if (!/^dist\/(icons\/|brands\/|_internal\/icon\.js$)/.test(distPath) || !file.endsWith('.js'))
      continue;
    const marker = iconMarkerFor(distPath);
    const plant = `globalThis.__NZ_FIXTURE_MARKERS__ = [...(globalThis.__NZ_FIXTURE_MARKERS__ ?? []), ${JSON.stringify(marker)}];\n`;
    writeFileSync(file, readFileSync(file, 'utf8') + plant);
    markers[marker] = distPath;
  }
  return markers;
}

/** Builds (unless told not to), packs, unpacks and marks; returns the marker map. */
export function packInto(fixtureDir: string, options: { build: boolean }): Record<string, string> {
  if (options.build) pnpm(['build'], REPO_ROOT);
  const packed = join(fixtureDir, '.packed');
  rmSync(packed, { recursive: true, force: true });
  const stage = join(packed, 'stage');
  mkdirSync(stage, { recursive: true });

  unpack(pack('packages/tokens', stage), join(packed, 'tokens'));
  const markers = plantMarkers(unpack(pack('packages/react', stage), join(packed, 'react')));
  if (Object.keys(markers).length === 0) throw new Error('no "use client" module found in dist');
  writeFileSync(join(packed, 'markers.json'), `${JSON.stringify(markers, null, 2)}\n`);
  const icons = plantIconMarkers(unpack(pack('packages/icons', stage), join(packed, 'icons')));
  if (Object.keys(icons).length === 0)
    throw new Error('no icon module found in @nizivo/icons dist');
  writeFileSync(join(packed, 'icon-markers.json'), `${JSON.stringify(icons, null, 2)}\n`);
  const charts = plantMarkers(
    unpack(pack('packages/charts', stage), join(packed, 'charts')),
    chartMarkerFor,
  );
  if (Object.keys(charts).length === 0)
    throw new Error('no "use client" module in @nizivo/charts dist');
  writeFileSync(join(packed, 'chart-markers.json'), `${JSON.stringify(charts, null, 2)}\n`);

  rmSync(stage, { recursive: true, force: true });
  return markers;
}

if (import.meta.main) {
  const { values } = parseArgs({
    options: { fixture: { type: 'string', default: 'next' }, 'no-build': { type: 'boolean' } },
  });
  const fixtureDir = join(REPO_ROOT, 'fixtures', values.fixture);
  const markers = packInto(fixtureDir, { build: values['no-build'] !== true });
  console.log(
    `packed fixtures/${values.fixture}/.packed/{tokens,react,icons,charts} (${Object.keys(markers).length} client modules marked)`,
  );
}
