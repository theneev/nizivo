// The size budgets of every public entry of @nizivo/react, @nizivo/tokens, @nizivo/icons and
// @nizivo/charts, as size-limit 14.2 checks (ARCHITECTURE.md §17, §18.1 "Performance").
// packages/react/.size-limit.ts exports sizeLimitChecks(); `pnpm --filter @nizivo/react size` runs it
// against the built dist/ of every package (size-limit loads its plugins from the package it runs
// in, and only @nizivo/react has them). Budgets live in budgets.json, written by measure.ts; the
// method is in method.ts. A charts entry without a budget is limited by its CHART_TARGETS_KIB figure.
//
// Families (SIZES.md explains each):
//   entry      a public JS subpath, bundled with what it imports (React Aria included)
//   composite  several imports in one bundle: the §17.1 dashboard set, barrel tree-shaking, icon sets
//   own        one `*.client` module minified alone, imports not counted (§17.2's own-code caps and
//              the component.json `measuredKB` method)
//   seam       the shared adapter helpers of seam ledger K6 and K7, React Aria external
//   file       a CSS or JSON entry, gzipped as published (no bundler)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { isSecondAdapter } from '../gen/adapter.ts';
import budgets from './budgets.json' with { type: 'json' };
import {
  CHART_TARGETS_KIB,
  ENGINE,
  ESBUILD_METHOD,
  limitString,
  PACKAGE_NAMES,
  PACKAGES_DIR,
  SIZE_DIR,
  type PackageName,
} from './method.ts';

export type Family = 'entry' | 'composite' | 'own' | 'seam' | 'file';

export interface SizeEntry {
  /** The size-limit check name and the budgets.json key. */
  name: string;
  pkg: PackageName;
  family: Family;
  /** Absolute path of the measured file or bundle entry. */
  path: string;
  /** The package.json `exports` key this entry measures, if it is a public entry. */
  exportKey?: string;
  /** React Aria stays external: the check measures Nizivo's code over the engine. */
  engineExternal?: boolean;
}

export interface Budget {
  /** Bytes, gzip, as size-limit reports them. */
  measured: number;
  /** measured + 10%, rounded up (method.ts limitKiB). */
  limitKiB: number;
}

export const BUDGETS: Readonly<Record<string, Budget>> = budgets.entries;

/** Wildcard exports have no single file: each is covered by the entries named here. */
export const WILDCARD_REPRESENTATIVES: Readonly<Record<string, readonly string[]>> = {
  '@nizivo/icons ./*': ['@nizivo/icons/calendar', '@nizivo/icons/hop'],
  '@nizivo/icons ./brands/*': ['@nizivo/icons/brands/instagram'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Public export keys (minus `./package.json`) with their published file (the `default` target). */
export function publicExports(pkg: PackageName): Array<{ key: string; file: string }> {
  const json: unknown = JSON.parse(readFileSync(join(PACKAGES_DIR, pkg, 'package.json'), 'utf8'));
  const exports = isRecord(json) ? json['exports'] : undefined;
  if (!isRecord(exports)) throw new Error(`packages/${pkg}/package.json has no exports map`);
  return Object.entries(exports)
    .filter(([key]) => key !== './package.json')
    .map(([key, value]) => {
      const file =
        typeof value === 'string' ? value : isRecord(value) ? value['default'] : undefined;
      if (typeof file !== 'string')
        throw new Error(`packages/${pkg}: export ${key} has no default`);
      return { key, file };
    });
}

/** Every shipped `*.client.tsx` module under packages/<pkg>/src, as its dist path relative to dist/. */
export function clientModules(pkg: 'react' | 'charts' = 'react'): string[] {
  const src = join(PACKAGES_DIR, pkg, 'src');
  if (!existsSync(src)) return [];
  return readdirSync(src, { recursive: true, withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.client.tsx') &&
        !isSecondAdapter(join(entry.parentPath, entry.name)),
    )
    .map((entry) =>
      relative(src, join(entry.parentPath, entry.name))
        .split(sep)
        .join('/')
        .replace(/\.tsx$/, ''),
    )
    .toSorted();
}

const entry = (name: string): string => join(SIZE_DIR, 'entries', name);

/** Every measured entry, in report order. */
export function sizeEntries(): SizeEntry[] {
  const out: SizeEntry[] = [];
  for (const pkg of PACKAGE_NAMES) {
    const dir = join(PACKAGES_DIR, pkg);
    const files: SizeEntry[] = [];
    for (const { key, file } of publicExports(pkg)) {
      if (key.includes('*')) continue;
      const name = `@nizivo/${pkg}${key.slice(1)}`;
      const path = join(dir, file);
      const family: Family = /\.(css|json)$/.test(file) ? 'file' : 'entry';
      (family === 'file' ? files : out).push({ name, pkg, family, path, exportKey: key });
    }
    if (pkg === 'react') {
      out.push(
        {
          name: '@nizivo/react dashboard set',
          pkg,
          family: 'composite',
          path: entry('react-dashboard.js'),
        },
        {
          name: '@nizivo/react { Button } from the barrel',
          pkg,
          family: 'composite',
          path: entry('react-barrel-button.js'),
        },
        {
          name: '@nizivo/react { Select } from the barrel',
          pkg,
          family: 'composite',
          path: entry('react-barrel-select.js'),
        },
      );
      for (const module of clientModules()) {
        out.push({
          name: `@nizivo/react own: ${module}`,
          pkg,
          family: 'own',
          path: join(dir, 'dist', `${module}.js`),
        });
      }
      for (const chunk of LAZY_CHUNKS) {
        out.push({
          name: chunk.name,
          pkg,
          family: 'composite',
          path: join(dir, 'dist', `${chunk.module}.js`),
        });
      }
      out.push(
        {
          name: '@nizivo/react seam K6 (stateAttrs, details, EngineLocale, engineDom)',
          pkg,
          family: 'seam',
          path: entry('seam-k6.js'),
          engineExternal: true,
        },
        {
          name: '@nizivo/react seam K7 (renderElement, toRenderFn, mergeProps)',
          pkg,
          family: 'seam',
          path: entry('seam-k7.js'),
        },
      );
    }
    if (pkg === 'charts') {
      out.push(
        {
          name: '@nizivo/charts { AreaChart } from the barrel',
          pkg,
          family: 'composite',
          path: entry('charts-barrel-area-chart.js'),
        },
        {
          name: '@nizivo/charts island with its imports',
          pkg,
          family: 'composite',
          path: entry('charts-island.js'),
        },
      );
      // §17.2's island figure gates the client graph above (M40, 2026-10-20), not the island's own
      // code: own ≈ graph − ChartTooltip − cx, and ./chart-tooltip has its own entry, so an `own:`
      // entry would add a budget and no information. The graph entry names one module, so a second
      // client module in charts must come with its own entry first.
      const islands = clientModules('charts');
      if (islands.join(',') !== '_island/chart-interaction.client')
        throw new Error(
          `@nizivo/charts client modules ${islands.join(', ')}: only the ChartInteraction island has a size entry (entries/charts-island.js)`,
        );
    }
    if (pkg === 'icons') {
      out.push(
        {
          name: '@nizivo/icons { Calendar } from the barrel',
          pkg,
          family: 'composite',
          path: entry('icons-one.js'),
        },
        {
          name: '@nizivo/icons 10 icons from the barrel',
          pkg,
          family: 'composite',
          path: entry('icons-ten.js'),
        },
        {
          name: '@nizivo/icons/calendar',
          pkg,
          family: 'entry',
          path: join(dir, 'dist', 'icons', 'calendar.js'),
          exportKey: './*',
        },
        {
          // The largest icon module (1,879 measured standalone, W5).
          name: '@nizivo/icons/hop',
          pkg,
          family: 'entry',
          path: join(dir, 'dist', 'icons', 'hop.js'),
          exportKey: './*',
        },
        {
          name: '@nizivo/icons/brands/instagram',
          pkg,
          family: 'entry',
          path: join(dir, 'dist', 'brands', 'instagram.js'),
          exportKey: './brands/*',
        },
      );
    }
    out.push(...files);
  }
  return out;
}

/** Public export keys that no entry measures, as `<package> <key>`. */
export function uncoveredExports(entries: readonly SizeEntry[] = sizeEntries()): string[] {
  const covered = new Set(entries.map((e) => `@nizivo/${e.pkg} ${e.exportKey ?? ''}`));
  return PACKAGE_NAMES.flatMap((pkg) =>
    publicExports(pkg)
      .map(({ key }) => `@nizivo/${pkg} ${key}`)
      .filter((id) => !covered.has(id)),
  );
}

// The slice of esbuild's plugin API the own-code check uses (esbuild is size-limit's dependency, not
// this package's, so its types are not reachable from here).
interface ResolveArgs {
  path: string;
  kind: string;
}
interface PluginBuild {
  onResolve(
    options: { filter: RegExp },
    callback: (args: ResolveArgs) => { path: string; external: boolean } | undefined,
  ): void;
}

/** Marks every import external, so the bundle is the one module minified alone. */
export const ownCodeOnly = {
  name: 'nizivo-own-code-only',
  setup(build: PluginBuild): void {
    build.onResolve({ filter: /.*/ }, (args) =>
      args.kind === 'entry-point' ? undefined : { path: args.path, external: true },
    );
  },
};

/**
 * Leaves `import()` targets out of an entry's bundle: a lazy chunk (M71, M72) loads on first use,
 * not with the entry, and LAZY_CHUNKS measures it on its own. Not in method.ts, so the seam harness
 * (seam/seam.ts) measures exactly as before.
 */
export const lazyChunksExternal = {
  name: 'nizivo-lazy-chunks-external',
  setup(build: PluginBuild): void {
    build.onResolve({ filter: /.*/ }, (args) =>
      args.kind === 'dynamic-import' ? { path: args.path, external: true } : undefined,
    );
  },
};

/**
 * The lazy chunks of @nizivo/react: the module a leaf imports with `import()`, measured with what it
 * pulls in (React external), which is what the first open loads at most.
 */
export const LAZY_CHUNKS: readonly { name: string; module: string }[] = [
  {
    name: '@nizivo/react lazy: the DateRangePicker calendar',
    module: 'unstable/date-range-picker/engine',
  },
  { name: '@nizivo/react lazy: the CommandMenu search', module: 'unstable/command-menu/engine' },
  // loaded only for a `virtualized` list (D-dt), from inside the search chunk
  {
    name: '@nizivo/react lazy: the CommandMenu virtualizer',
    module: '_engines/react-aria/command-menu-virtual.client',
  },
];

type EsbuildConfig = Record<string, unknown>;

export interface SizeLimitCheck {
  name: string;
  path: string;
  gzip?: boolean;
  limit?: string;
  ignore?: string[];
  disablePlugins?: string[];
  modifyEsbuildConfig?: (config: EsbuildConfig) => EsbuildConfig;
}

export interface CheckOptions {
  /** Measuring (measure.ts): no limits, and entries without a budget are allowed. */
  measure?: boolean;
  /** Brotli instead of gzip (a report-only column; budgets are gzip, §17). Implies `measure`. */
  brotli?: boolean;
}

/** The limit of an entry: its recorded budget, else its CHART_TARGETS_KIB figure. */
export function limitOf(name: string): number | undefined {
  return BUDGETS[name]?.limitKiB ?? CHART_TARGETS_KIB[name];
}

/** The size-limit config. Throws when an entry has no limit or a budget names no entry. */
export function sizeLimitChecks({
  measure = false,
  brotli = false,
}: CheckOptions = {}): SizeLimitCheck[] {
  const entries = sizeEntries();
  const limited = !measure && !brotli;
  if (limited) {
    const names = new Set(entries.map((e) => e.name));
    const missing = entries.filter((e) => limitOf(e.name) === undefined).map((e) => e.name);
    const stale = Object.keys(BUDGETS).filter((name) => !names.has(name));
    const uncovered = uncoveredExports(entries);
    if (missing.length > 0 || stale.length > 0 || uncovered.length > 0) {
      throw new Error(
        [
          'packages/tooling/size/budgets.json is out of date; run `node packages/tooling/size/measure.ts --write`.',
          ...missing.map((name) => `  no budget: ${name}`),
          ...stale.map((name) => `  budget for no entry: ${name}`),
          ...uncovered.map((id) => `  public export with no entry: ${id}`),
        ].join('\n'),
      );
    }
  }
  return entries.map((e) => {
    const check: SizeLimitCheck = { name: e.name, path: e.path };
    if (!brotli) check.gzip = true;
    const limit = limitOf(e.name);
    if (limited && limit !== undefined) check.limit = limitString(limit);
    if (e.family === 'file') {
      check.disablePlugins = ['@size-limit/esbuild'];
      return check;
    }
    if (e.engineExternal === true) check.ignore = [...ENGINE];
    const own = e.family === 'own';
    check.modifyEsbuildConfig = (config) => ({
      ...config,
      ...ESBUILD_METHOD,
      plugins: [own ? ownCodeOnly : lazyChunksExternal],
    });
    return check;
  });
}
