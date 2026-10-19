// NO directive. The three scales charts need (ARCHITECTURE.md §14.1), a few lines each, behind
// structural interfaces that d3-scale's objects satisfy unchanged (`scaleLinear()`, `scaleBand()`,
// `scalePoint()`). No Nizivo chart takes a scale prop (D-bd): the interfaces are the seam for a
// custom renderer inside <ChartFrame>, which may use these scales or d3's. Pure and server-safe; the
// only dependency is d3-array's tick maths.
import { nice as niceRange, ticks as tickValues } from 'd3-array';

/**
 * The renderer seam for scales (seam ledger K9): callable plus `domain()`. A continuous scale also
 * has `ticks()`; d3's band and point scales have none, so it is optional here.
 */
export interface ScaleLike<D> {
  (value: D): number | undefined;
  domain(): D[];
  ticks?(count?: number): D[];
}

/** A continuous numeric scale (a y scale). `scaleLinear()` from d3-scale satisfies it. */
export interface LinearScaleLike extends ScaleLike<number> {
  (value: number): number;
  ticks(count?: number): number[];
}

/** A categorical scale with a width per category: what a bar's x takes. d3's `scaleBand()` fits. */
export interface BandScaleLike extends ScaleLike<string> {
  bandwidth(): number;
  step(): number;
}

/** A categorical scale of positions: what a line's x takes. d3's `scalePoint()` fits. */
export interface PointScaleLike extends ScaleLike<string> {
  step(): number;
}

export interface LinearScale extends LinearScaleLike {
  domain(): [number, number];
  range(): [number, number];
  /** A copy whose domain is extended to round values (d3-array `nice`), so the last tick is the top. */
  nice(count?: number): LinearScale;
}

/** Linear interpolation from `domain` to `range`. A zero-width domain maps to the range's middle. */
export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const scale = (value: number): number =>
    span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0);
  return Object.assign(scale, {
    domain: (): [number, number] => [d0, d1],
    range: (): [number, number] => [r0, r1],
    ticks: (count = 10): number[] => tickValues(Math.min(d0, d1), Math.max(d0, d1), count),
    nice: (count = 10): LinearScale => linear(niceRange(d0, d1, count), range),
  });
}

export interface BandOptions {
  /** Share of each step left empty between bands, 0–1. @default 0 */
  paddingInner?: number;
  /** Space before the first and after the last band, in steps. @default 0 */
  paddingOuter?: number;
  /** Where leftover space goes, 0 (start) to 1 (end). @default 0.5 */
  align?: number;
}

export interface BandScale extends BandScaleLike {
  domain(): string[];
  range(): [number, number];
}

export interface PointScale extends PointScaleLike {
  domain(): string[];
  range(): [number, number];
}

/** d3's band layout: `domain` (duplicates dropped, first kept) as equal bands across `range`. */
export function band(
  domain: readonly string[],
  range: readonly [number, number],
  { paddingInner = 0, paddingOuter = 0, align = 0.5 }: BandOptions = {},
): BandScale {
  const keys = [...new Set(domain)];
  const index = new Map(keys.map((key, i) => [key, i]));
  const n = keys.length;
  const [r0, r1] = range;
  const reverse = r1 < r0;
  let start = reverse ? r1 : r0;
  const stop = reverse ? r0 : r1;
  const step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
  start += (stop - start - step * (n - paddingInner)) * align;
  const width = step * (1 - paddingInner);
  const scale = (value: string): number | undefined => {
    const i = index.get(value);
    if (i === undefined) return undefined;
    return start + step * (reverse ? n - 1 - i : i);
  };
  return Object.assign(scale, {
    domain: (): string[] => [...keys],
    range: (): [number, number] => [r0, r1],
    bandwidth: (): number => width,
    step: (): number => step,
  });
}

export interface PointOptions {
  /** Space before the first and after the last point, in steps. @default 0 */
  padding?: number;
  /** @default 0.5 */
  align?: number;
}

/**
 * d3's point layout: evenly spaced positions, the first at the range start and the last at its end
 * (with `padding` 0). One value sits in the middle. ISO plain dates of daily or weekly buckets are
 * points (§14.1); irregular timestamps need a time scale (the opt-in `./d3` adapter, later).
 */
export function point(
  domain: readonly string[],
  range: readonly [number, number],
  { padding = 0, align = 0.5 }: PointOptions = {},
): PointScale {
  const inner = band(domain, range, { paddingInner: 1, paddingOuter: padding, align });
  const scale = (value: string): number | undefined => inner(value);
  return Object.assign(scale, {
    domain: (): string[] => inner.domain(),
    range: (): [number, number] => inner.range(),
    step: (): number => inner.step(),
  });
}

export interface ValueDomainOptions {
  /** Include 0, so bars and areas grow from a true baseline. @default true */
  zero?: boolean;
  /** About how many ticks; the domain is niced for this count. @default 4 */
  count?: number;
}

/**
 * The y domain of a chart, niced BEFORE ticks are taken (§14.1; fixes Figma 03's "bar above the
 * top tick"): every value lies inside it and its ends are tick values. Empty or all-zero data gives
 * [0, 1], so a flat series still has a baseline and a top.
 */
export function valueDomain(
  values: Iterable<number>,
  { zero = true, count = 4 }: ValueDomainOptions = {},
): [number, number] {
  let lo = zero ? 0 : Infinity;
  let hi = zero ? 0 : -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < lo) lo = value;
    if (value > hi) hi = value;
  }
  if (lo === Infinity) return [0, 1];
  if (lo === hi) {
    if (lo === 0) return [0, 1];
    if (zero) return lo > 0 ? niceRange(0, lo, count) : niceRange(lo, 0, count);
    const pad = Math.abs(lo) / 2;
    return niceRange(lo - pad, hi + pad, count);
  }
  return niceRange(lo, hi, count);
}
