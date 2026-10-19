// NO directive. Line and area paths in percent space (ARCHITECTURE.md §10.8, §14.1), drawn by any
// d3-shape curve factory (`curveMonotoneX` by default) through a string context. Only the curve is
// bundled: d3's line() and area() generators and d3-path cost about 1.6 KB gzip more than the curve
// (measured 2026-10-19), and a line through this context is the same path d3's
// `line().curve(curve).digits(3)` writes (test/unit/path.test.ts).
import { curveMonotoneX, type CurveFactory } from 'd3-shape';
import { num } from './geometry';

export type { CurveFactory } from 'd3-shape';

/** A point in percent space (x 0→100, y 0→100 top down), or `null` for a gap in the series. */
export type PathPoint = readonly [x: number, y: number] | null;

/** The slice of CanvasPath every d3-shape curve draws through. */
interface PathContext {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(x1: number, y1: number, x2: number, y2: number, x: number, y: number): void;
  closePath(): void;
}

/** The defined runs of `points`, split at each gap. */
function runs(points: readonly PathPoint[]): Array<Array<readonly [number, number]>> {
  const out: Array<Array<readonly [number, number]>> = [];
  let run: Array<readonly [number, number]> = [];
  for (const point of points) {
    if (point === null) {
      if (run.length > 0) out.push(run);
      run = [];
    } else run.push(point);
  }
  if (run.length > 0) out.push(run);
  return out;
}

const at = (x: number, y: number): string => `${num(x)},${num(y)}`;

function draw(
  points: readonly PathPoint[],
  curve: CurveFactory,
  baseline: number | undefined,
): string {
  let d = '';
  const context: PathContext = {
    moveTo: (x, y) => (d += `M${at(x, y)}`),
    lineTo: (x, y) => (d += `L${at(x, y)}`),
    bezierCurveTo: (x1, y1, x2, y2, x, y) => (d += `C${at(x1, y1)},${at(x2, y2)},${at(x, y)}`),
    closePath: () => (d += 'Z'),
  };
  // d3's curve types name CanvasRenderingContext2D | Path; a curve only calls the four methods above
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the curve protocol is these four methods
  const generator = curve(context as Parameters<CurveFactory>[0]);
  for (const run of runs(points)) {
    if (baseline !== undefined) generator.areaStart();
    generator.lineStart();
    for (const [x, y] of run) generator.point(x, y);
    generator.lineEnd();
    if (baseline !== undefined) {
      generator.areaEnd();
      const first = run[0];
      const last = run.at(-1);
      // the wash closes straight down to the baseline and back (no curve along a constant y)
      if (first !== undefined && last !== undefined)
        d += `L${at(last[0], baseline)}L${at(first[0], baseline)}Z`;
    }
  }
  return d;
}

/**
 * The `d` of a line through `points`, one subpath per defined run. A run of one point is `M x,y Z`,
 * a dot under a round cap.
 */
export function linePath(
  points: readonly PathPoint[],
  curve: CurveFactory = curveMonotoneX,
): string {
  return draw(points, curve, undefined);
}

/** The `d` of the area between the line through `points` and `baseline` (a y in percent space). */
export function areaPath(
  points: readonly PathPoint[],
  baseline: number,
  curve: CurveFactory = curveMonotoneX,
): string {
  return draw(points, curve, baseline);
}

/**
 * A dot at `(x, y)`: a zero-length subpath, drawn round and at its CSS stroke width by
 * `stroke-linecap: round` and `vector-effect: non-scaling-stroke` whatever the plot's aspect ratio
 * (a `<circle>` would stretch under preserveAspectRatio="none"; verified in Chromium, Firefox and
 * WebKit, test/browser/marks.spec.ts).
 */
export function dotPath(x: number, y: number): string {
  return `M${num(x)},${num(y)}h0`;
}
