// The measuring method shared by the size budgets (checks.ts, run by size-limit) and the seam harness
// (seam/seam.ts, which drives the same esbuild binary directly for its metafile). ARCHITECTURE.md §17:
// min + gzip -9, ESM, the `production` condition, React and ReactDOM external, every React Aria locale
// included (no locale plugin), r3's esbuild method. Plain data and pure functions: no imports beyond
// node built-ins, so Node runs this file directly through type stripping.
import { join } from 'node:path';

export const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
export const PACKAGES_DIR = join(REPO_ROOT, 'packages');
export const REACT_DIR = join(PACKAGES_DIR, 'react');
export const SIZE_DIR = import.meta.dirname;

/** The packages whose public entries carry budgets, in report order. */
export const PACKAGE_NAMES = ['react', 'tokens', 'icons', 'charts'] as const;
export type PackageName = (typeof PACKAGE_NAMES)[number];

/**
 * The esbuild options both runners add to a plain minified bundle. size-limit's esbuild plugin
 * already sets `bundle`, the three `minify*` flags and `treeShaking`, and passes the package's peer
 * dependencies as `external`; with every minify flag on and the default `browser` platform, esbuild
 * defines `process.env.NODE_ENV` as "production" itself. ESM keeps the entry's exports alive (the
 * default IIFE would tree-shake an entry that only exports). `conditions` adds `production` to the
 * default `browser`/`import`/`default` set.
 */
export const ESBUILD_METHOD = {
  format: 'esm',
  conditions: ['production'],
  // A hand-written seam baseline (seam/direct/*.tsx) is compiled the way a consumer's app would be.
  jsx: 'automatic',
} as const;

/** Peer dependencies that are never counted; `react` also covers `react/jsx-runtime` (esbuild treats
 * a package name in `external` as covering its subpaths). */
export const PEERS = ['react', 'react-dom'] as const;

/** The engine, kept external only where a check measures Nizivo's own code over it. */
export const ENGINE = ['react-aria-components', 'react-aria'] as const;

/**
 * Limit = measured + 10%, rounded UP: to 0.1 KiB below 10 KiB, to 1 KiB from 10 KiB (the precision
 * of §17's tables; KiB = 1,024 B, as component.json and the W*-RESULTS files count). Integer maths,
 * so 1.1 × measured never rounds through a float. A measurement at or below zero (an empty module:
 * size-limit subtracts its empty-bundle constant) gets a 0 limit: it must stay empty.
 */
export function limitKiB(measuredBytes: number): number {
  if (measuredBytes <= 0) return 0;
  // measured × 1.1 / 1024 = measured × 11 / 10,240 KiB
  const tenths = Math.ceil((measuredBytes * 11) / 1024);
  if (tenths < 100) return tenths / 10;
  return Math.ceil((measuredBytes * 11) / 10240);
}

/**
 * The hard limits of ARCHITECTURE.md §17.1 (KiB) for the entries that have one. A budget never sits
 * above its plan limit: measured + 10% applies only below it (§17: "limits only go up through a
 * labelled PR", and the plan's limits are where that happens). Every limit is KiB; M17 (2026-10-16)
 * raised Dialog from 31 to 32 and the dashboard set from 75 to 76.
 */
export const PLAN_LIMITS_KIB: Readonly<Record<string, number>> = {
  '@nizivo/react/tooltip': 16,
  '@nizivo/react/dialog': 32,
  '@nizivo/react/tabs': 35,
  '@nizivo/react/menu': 57,
  '@nizivo/react/select': 66,
  '@nizivo/react dashboard set': 76,
};

/**
 * The @nizivo/charts limits (KiB) while v0.2 builds it: §17.2's figures, plus scaffold defaults
 * where §17.2 has none. An entry named here needs no budgets.json record: its limit is this figure
 * until `measure.ts --write` records measured + 10%, which is then never above it (as with
 * PLAN_LIMITS_KIB). Unlike PLAN_LIMITS_KIB, a name may be a part that is not built yet: its check
 * starts when its `exports` entry (or its `*.client.tsx` module) does.
 */
export const CHART_TARGETS_KIB: Readonly<Record<string, number>> = {
  // §17.2's figures (M40, 2026-10-20). AreaChart is the framed ./area-chart subpath (everything in,
  // the island graph included) at its week 11 measurement + 10 %; the island's figure applies to its
  // client graph (the island with ChartTooltip and cx: what a page downloads), 1.2 KiB for W10's
  // 1,080 B, then + 10 % over 1,457 B with the approved Escape, column mode, island-side direction,
  // compact payload and the week 11 review's fixes, then 1.7 KiB for DonutChart's item mode (M41
  // item 2, 2026-10-20: 1,457 B + 10 items + 20 centre + 71 element hit test + 11 swatch = 1,569 B,
  // + 10 %; 1,580 B after the week 12 review's Escape stop, still 1.7); Donut 3.2, then 5.3 KiB for
  // its keyboard through the island (M41 item 2: 4,845 B with the island graph inside, + 10 %; 4,856
  // B after the review); Sparkline ≤ 2, all charts together ≤ 12 (the barrel).
  '@nizivo/charts/area-chart': 7.1,
  '@nizivo/charts island with its imports': 1.7,
  '@nizivo/charts/donut-chart': 5.3,
  '@nizivo/charts/sparkline': 2,
  '@nizivo/charts': 12,
  // The scaffold defaults, confirmed as §17.2 figures by M40 item 3: BarChart 3.6 (then raised by
  // item 2 for the island's column mode, measured + 10 % with the island graph inside), ChartFrame
  // 2, Legend and ChartTooltip 1 each, the one stylesheet 5.
  '@nizivo/charts/bar-chart': 5.7,
  '@nizivo/charts/chart-tooltip': 1,
  '@nizivo/charts/chart-frame': 2,
  '@nizivo/charts/legend': 1,
  '@nizivo/charts/styles.css': 5,
  // Barrel tree-shaking, as react's `{ Button } from the barrel`: AreaChart through the barrel never
  // costs more than the ./area-chart figure.
  '@nizivo/charts { AreaChart } from the barrel': 7.1,
};

/** A KiB figure as size-limit parses it (`KiB` is 1,024; `KB` would be 1,000). */
export function limitString(limit: number): string {
  return `${limit} KiB`;
}

/** The byte count size-limit compares against for a `limitString(kib)`. */
export function limitBytes(limit: number): number {
  return Math.floor(limit * 1024);
}

/** Formats bytes as KiB with one decimal, for reports. */
export function kib(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}
