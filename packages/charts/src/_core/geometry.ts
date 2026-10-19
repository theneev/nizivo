// NO directive. Percent-space geometry shared by the renderers (ARCHITECTURE.md §14.1, §10.8).
// Lines and areas draw in a `0 0 100 100` viewBox with preserveAspectRatio="none", strokes kept at
// their CSS width by `vector-effect: non-scaling-stroke` (verified in Chromium, Firefox and WebKit
// on 2026-10-19; test/browser/stroke.spec.tsx). Bars are <rect>s with percentage attributes. Every
// number written into markup goes through `num()`, so server and client print the same string.

/** The plot's coordinate system: x 0→100 left to right, y 0→100 top to bottom. */
export const VIEWBOX = '0 0 100 100';
export const PLOT_SIZE = 100;

/** Up to `digits` decimals, no trailing zeros, no `-0`: compact and deterministic attribute text. */
export function num(value: number, digits = 3): string {
  if (!Number.isFinite(value)) throw new RangeError(`not a finite coordinate: ${value}`);
  const rounded = Number(value.toFixed(digits));
  return String(rounded === 0 ? 0 : rounded);
}

/** `num(value)` with a `%` sign, for <rect> and <line> attributes in percent space. */
export function pct(value: number, digits = 3): string {
  return `${num(value, digits)}%`;
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Percentage attributes of one bar (SVG <rect>), so no inline style is needed (CSP Profile B). */
export interface BarRect {
  x: string;
  y: string;
  width: string;
  height: string;
}

/**
 * A vertical bar from `baseline` to `value` (both already in percent space, y down), `start` and
 * `width` along x. A negative bar hangs below the baseline; a zero bar has no height.
 */
export function barRect(start: number, width: number, value: number, baseline: number): BarRect {
  const top = Math.min(value, baseline);
  return {
    x: pct(start),
    y: pct(top),
    width: pct(Math.max(0, width)),
    height: pct(Math.abs(baseline - value)),
  };
}

/** A point in percent space, plus the strings ChartInteraction shows for it (pre-formatted). */
export interface PlotPoint {
  /** 0–100 along x. */
  x: number;
  /** 0–100 along y, top down. */
  y: number;
}

/** `(x, y)` of every datum whose scales return a position; a datum outside a scale is skipped. */
export function plotPoints<T>(
  data: readonly T[],
  x: (datum: T, index: number) => number | undefined,
  y: (datum: T, index: number) => number | undefined,
): PlotPoint[] {
  const out: PlotPoint[] = [];
  data.forEach((datum, index) => {
    const px = x(datum, index);
    const py = y(datum, index);
    if (px !== undefined && py !== undefined && Number.isFinite(px) && Number.isFinite(py)) {
      out.push({ x: px, y: py });
    }
  });
  return out;
}
