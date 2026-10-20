// The percent-space paths (src/_core/path.ts) are d3-shape's: only the curve is bundled, drawn
// through a string context, so a line must be the very path d3's line generator writes, at the
// same precision: PATH_DIGITS (2 decimals since M40, 2026-10-20; d3's `.digits(PATH_DIGITS)`).
import { area, curveLinear, curveMonotoneX, curveStep, line } from 'd3-shape';
import { describe, expect, test } from 'vitest';
import { areaPath, dotPath, linePath, PATH_DIGITS, type PathPoint } from '../../src/_core/path';

const SERIES: PathPoint[] = [
  [0, 73.25],
  [16.667, 62.25],
  [33.333, 65.5],
  [50, 46.125],
  [66.667, 51.5],
  [83.333, 34.5],
  [100, 21.5],
];

const d3Line = (points: PathPoint[], curve = curveMonotoneX): string | null =>
  line<PathPoint>()
    .defined((p) => p !== null)
    .x((p) => p?.[0] ?? 0)
    .y((p) => p?.[1] ?? 0)
    .curve(curve)
    .digits(PATH_DIGITS)(points);

const tokens = (d: string): string[] => d.match(/[A-Za-z]|-?[\d.]+(?:e-?\d+)?/g) ?? [];
const isCommand = (token: string): boolean => /[A-Za-z]/.test(token);

/**
 * Whether two paths are the same commands with numbers equal to the last decimal written. num()
 * rounds through toFixed and d3-path through Math.round, so a value exactly on a half-hundredth
 * (41.665) can differ in its last digit.
 */
function samePath(actual: string, expected: string | null): boolean {
  const a = tokens(actual);
  const b = tokens(expected ?? '');
  return (
    a.length === b.length &&
    a.every((t, i) => (isCommand(t) ? t === b[i] : Math.abs(Number(t) - Number(b[i])) < 0.011))
  );
}

describe('linePath', () => {
  test.each([
    ['curveMonotoneX', curveMonotoneX],
    ['curveLinear', curveLinear],
  ])('is exactly d3 line().curve(%s).digits(PATH_DIGITS)', (_name, curve) => {
    expect(linePath(SERIES, curve)).toBe(d3Line(SERIES, curve));
  });

  test('any curve factory plugs in (curveStep), the same path as d3 to the last decimal', () => {
    expect(PATH_DIGITS).toBe(2);
    expect(samePath(linePath(SERIES, curveStep), d3Line(SERIES, curveStep))).toBe(true);
    expect(samePath('M0,1L2,3', 'M0,1L2,3.05')).toBe(false);
  });

  test('a gap splits the line into subpaths, as d3 line().defined() does', () => {
    const gapped: PathPoint[] = [...SERIES.slice(0, 3), null, ...SERIES.slice(4)];
    expect(linePath(gapped)).toBe(d3Line(gapped));
    expect(linePath(gapped).match(/M/g)).toHaveLength(2);
  });

  test('a lone point is a closed zero-length subpath (a dot under a round cap), as in d3', () => {
    const lone: PathPoint[] = [[10, 20], null, [30, 40], [50, 60]];
    expect(linePath(lone)).toBe(d3Line(lone));
    expect(linePath(lone)).toMatch(/^M10,20Z/);
  });

  test('defaults to curveMonotoneX; no points, no path', () => {
    expect(linePath(SERIES)).toBe(d3Line(SERIES));
    expect(linePath([])).toBe('');
    expect(linePath([null, null])).toBe('');
  });

  test('coordinates are written through num(): at most PATH_DIGITS decimals, no -0', () => {
    expect(
      linePath(
        [
          [0, -0.0001],
          [33.33333333, 50],
        ],
        curveLinear,
      ),
    ).toBe('M0,0L33.33,50');
  });
});

describe('areaPath', () => {
  test('the line, then straight down to the baseline and back: the same region as d3 area()', () => {
    const top = linePath(SERIES);
    expect(areaPath(SERIES, 100)).toBe(`${top}L100,100L0,100Z`);
    // d3's area draws the baseline back as a curve over constant y; the region is identical
    const d3 = area<PathPoint>()
      .x((p) => p?.[0] ?? 0)
      .y0(100)
      .y1((p) => p?.[1] ?? 0)
      .curve(curveMonotoneX)
      .digits(PATH_DIGITS)(SERIES);
    expect(d3?.startsWith(top)).toBe(true);
  });

  test('one closed region per defined run', () => {
    const gapped: PathPoint[] = [...SERIES.slice(0, 3), null, ...SERIES.slice(4)];
    const d = areaPath(gapped, 80);
    expect(d.match(/Z/g)).toHaveLength(2);
    expect(d).toContain('L33.33,80L0,80Z');
    expect(d.endsWith('L100,80L66.67,80Z')).toBe(true);
  });
});

test('dotPath is a zero-length subpath at the point', () => {
  expect(dotPath(100, 21.5)).toBe('M100,21.5h0');
  expect(dotPath(33.33333, 0)).toBe('M33.33,0h0');
});
