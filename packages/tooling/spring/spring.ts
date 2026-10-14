/**
 * The one place a spring becomes CSS (ARCHITECTURE.md §13.1): a port of spike S4's closed-form damped
 * oscillator. A spring gives a duration (settled to within 0.1% of travel) and a CSS `linear()` easing
 * whose points are placed adaptively (Ramer–Douglas–Peucker, ε = 0.004).
 */

/**
 * Figma's `spring(a, b, c, d)` read as (mass, stiffness, damping, velocity). This ORDER IS ASSUMED
 * until design confirms it (decision 8h, figma-handoff Q1); a wrong order is a token-value patch.
 */
export interface Spring {
  mass: number;
  stiffness: number;
  damping: number;
  /** Initial velocity in progress units per second. */
  velocity: number;
}

export interface SpringCss {
  /** Settle time at ±0.1% of travel, rounded up to a whole millisecond. */
  durationMs: number;
  /** `linear(…)` over `durationMs`. */
  easing: string;
  points: number;
  /** Largest gap between the easing and the true curve, in progress units. */
  maxError: number;
  overshootPct: number;
}

export const SETTLE_THRESHOLD = 0.001;
export const RDP_EPSILON = 0.004;
const MAX_SECONDS = 5;
const STEP_SECONDS = 1e-4;

const round = (value: number, digits = 3): number => Number(value.toFixed(digits));

/** Parses `spring(1, 260, 24, 0)` in the assumed (mass, stiffness, damping, velocity) order. */
export function parseFigmaSpring(text: string): Spring {
  const match = /^\s*spring\(([^)]*)\)\s*$/.exec(text);
  const numbers = match?.[1]?.split(',').map((part) => Number(part.trim())) ?? [];
  const [mass, stiffness, damping, velocity] = numbers;
  if (
    numbers.length !== 4 ||
    mass === undefined ||
    stiffness === undefined ||
    damping === undefined ||
    velocity === undefined ||
    numbers.some((n) => !Number.isFinite(n))
  ) {
    throw new Error(`Not a spring(mass, stiffness, damping, velocity) value: "${text}"`);
  }
  return { mass, stiffness, damping, velocity };
}

/** Progress x(t) of a unit step from 0 to 1 (t in seconds). */
export function springPosition({
  mass,
  stiffness,
  damping,
  velocity,
}: Spring): (t: number) => number {
  if (!(mass > 0) || !(stiffness > 0) || !(damping >= 0)) {
    throw new Error('A spring needs mass > 0, stiffness > 0 and damping >= 0');
  }
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const b = (zeta * w0 - velocity) / wd;
    return (t) => 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + b * Math.sin(wd * t));
  }
  if (zeta === 1) return (t) => 1 - Math.exp(-w0 * t) * (1 + (w0 - velocity) * t);
  const s = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * w0 + s;
  const r2 = -zeta * w0 - s;
  const a = (-velocity - r2) / (r1 - r2);
  return (t) => 1 - (a * Math.exp(r1 * t) + (1 - a) * Math.exp(r2 * t));
}

/** The last instant (seconds, 0.1 ms sweep) at which |x − 1| exceeds the threshold. */
export function settleTime(x: (t: number) => number, threshold = SETTLE_THRESHOLD): number {
  let last = 0;
  // Accumulating t (rather than i * step) keeps the spike's exact sample instants.
  for (let t = 0; t <= MAX_SECONDS; t += STEP_SECONDS) {
    if (Math.abs(x(t) - 1) > threshold) last = t;
  }
  if (Math.abs(x(MAX_SECONDS) - 1) > threshold) {
    throw new Error(`The spring does not settle within ${MAX_SECONDS} s`);
  }
  return last;
}

/** Ramer–Douglas–Peucker over 1001 samples of (progress, value); returns the kept points. */
function adaptivePoints(
  x: (t: number) => number,
  seconds: number,
  epsilon: number,
): [number, number][] {
  const samples = 1000;
  const p: [number, number][] = [];
  for (let i = 0; i <= samples; i++)
    p.push([i / samples, i === samples ? 1 : x((i / samples) * seconds)]);
  const at = (i: number): [number, number] => p[i] ?? [0, 0];

  const simplify = (from: number, to: number): number[] => {
    const [x1, y1] = at(from);
    const [x2, y2] = at(to);
    let index = -1;
    let max = 0;
    for (let i = from + 1; i < to; i++) {
      const [xi, yi] = at(i);
      const distance = Math.abs(yi - (y1 + ((y2 - y1) * (xi - x1)) / (x2 - x1)));
      if (distance > max) {
        max = distance;
        index = i;
      }
    }
    return max > epsilon
      ? [...simplify(from, index).slice(0, -1), ...simplify(index, to)]
      : [from, to];
  };
  return simplify(0, samples).map((i) => [at(i)[0], round(at(i)[1])]);
}

function maxError(x: (t: number) => number, seconds: number, points: [number, number][]): number {
  let error = 0;
  for (let i = 0; i <= 2000; i++) {
    const progress = i / 2000;
    let j = points.findIndex(([px]) => px >= progress);
    if (j <= 0) j = 1;
    const [x1, y1] = points[j - 1] ?? [0, 0];
    const [x2, y2] = points[j] ?? [1, 1];
    const linear = y1 + ((y2 - y1) * (progress - x1)) / (x2 - x1 || 1);
    error = Math.max(error, Math.abs(linear - x(progress * seconds)));
  }
  return error;
}

function overshoot(x: (t: number) => number): number {
  let peak = 0;
  for (let t = 0; t < 3; t += STEP_SECONDS) peak = Math.max(peak, x(t));
  return Math.max(0, round((peak - 1) * 100, 2));
}

/** Turns a spring into its CSS pair: `--nz-duration-*` (durationMs) and `--nz-easing-*` (easing). */
export function springToCss(spring: Spring): SpringCss {
  const x = springPosition(spring);
  const durationMs = Math.ceil(settleTime(x) * 1000);
  const seconds = durationMs / 1000;
  const points = adaptivePoints(x, seconds, RDP_EPSILON);
  const stops = points.map(([progress, value], i) =>
    i === 0 || i === points.length - 1 ? String(value) : `${value} ${round(progress * 100, 1)}%`,
  );
  return {
    durationMs,
    easing: `linear(${stops.join(', ')})`,
    points: points.length,
    maxError: round(maxError(x, seconds, points), 4),
    overshootPct: overshoot(x),
  };
}
