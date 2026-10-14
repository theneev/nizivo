// Damped harmonic oscillator, unit step 0 -> 1, Figma spring(mass, stiffness, damping, velocity) — ORDER ASSUMED (S-b 7 open).
import { spring as motionSpring } from "motion";

export function springFn({ mass: m, stiffness: k, damping: c, velocity: v0 = 0 }) {
  const w0 = Math.sqrt(k / m), zeta = c / (2 * Math.sqrt(k * m));
  // x(t) = 1 - y(t), y(0)=1, y'(0) = -v0 (v0 in progress-units/s)
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const B = (zeta * w0 * 1 - v0) / wd;
    return { w0, zeta, f: (t) => 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + B * Math.sin(wd * t)) };
  } else if (zeta === 1) {
    return { w0, zeta, f: (t) => 1 - Math.exp(-w0 * t) * (1 + (w0 - v0) * t) };
  } else {
    const s = w0 * Math.sqrt(zeta * zeta - 1), r1 = -zeta * w0 + s, r2 = -zeta * w0 - s;
    const A = (-v0 - r2) / (r1 - r2), Bc = 1 - A;
    return { w0, zeta, f: (t) => 1 - (A * Math.exp(r1 * t) + Bc * Math.exp(r2 * t)) };
  }
}
export function settleTime(f, thr, maxT = 5, dt = 1e-4) {
  let last = 0;
  for (let t = 0; t <= maxT; t += dt) if (Math.abs(f(t) - 1) > thr) last = t;
  return last; // seconds: last instant outside the band
}
const r = (x, d = 3) => +x.toFixed(d);
export function uniformLinear(f, T, n) {
  const pts = []; for (let i = 0; i < n; i++) pts.push(i === n - 1 ? 1 : r(f((i / (n - 1)) * T)));
  return { str: `linear(${pts.join(", ")})`, pts: pts.map((y, i) => [i / (n - 1), y]) };
}
// Ramer-Douglas-Peucker on (progress, value) — adaptive point placement
export function adaptiveLinear(f, T, eps) {
  const N = 1000, P = []; for (let i = 0; i <= N; i++) P.push([i / N, i === N ? 1 : f((i / N) * T)]);
  const rdp = (a, b) => { let idx = -1, dmax = 0; const [x1, y1] = P[a], [x2, y2] = P[b];
    for (let i = a + 1; i < b; i++) { const [x, y] = P[i]; const yl = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1); const d = Math.abs(y - yl); if (d > dmax) { dmax = d; idx = i; } }
    return dmax > eps ? [...rdp(a, idx).slice(0, -1), ...rdp(idx, b)] : [a, b]; };
  const keep = rdp(0, N).map((i) => [P[i][0], r(P[i][1])]);
  const str = "linear(" + keep.map(([x, y], i) => (i === 0 || i === keep.length - 1) ? String(y) : `${y} ${r(x * 100, 1)}%`).join(", ") + ")";
  return { str, pts: keep };
}
export function maxErr(f, T, pts) {
  let e = 0; for (let i = 0; i <= 2000; i++) { const x = i / 2000; let j = pts.findIndex((p) => p[0] >= x); if (j <= 0) j = 1;
    const [x1, y1] = pts[j - 1], [x2, y2] = pts[j]; const yl = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1 || 1); e = Math.max(e, Math.abs(yl - f(x * T))); }
  return e;
}

const springs = { "spring(1, 260, 24, 0)": { mass: 1, stiffness: 260, damping: 24, velocity: 0 }, "spring(1, 170, 26, 0)": { mass: 1, stiffness: 170, damping: 26, velocity: 0 } };
const out = {};
for (const [name, p] of Object.entries(springs)) {
  const { w0, zeta, f } = springFn(p);
  let peak = 0, tPeak = 0; for (let t = 0; t < 3; t += 1e-4) { const v = f(t); if (v > peak) { peak = v; tPeak = t; } }
  const s01 = settleTime(f, 0.001), s05 = settleTime(f, 0.005), s2 = settleTime(f, 0.02);
  const T01 = Math.ceil(s01 * 1000) / 1000, T05 = Math.ceil(s05 * 1000) / 1000;
  const u25_01 = uniformLinear(f, T01, 25), u30_05 = uniformLinear(f, T05, 30), u40_01 = uniformLinear(f, T01, 40);
  const a01 = adaptiveLinear(f, T01, 0.004), a05 = adaptiveLinear(f, T05, 0.004);
  const m = motionSpring({ keyframes: [0, 1], ...p });
  const mStr = m.toString();
  // Motion's own done-time at 1 ms resolution
  let mDone = null; for (let t = 0; t <= 5000; t++) if (m.next(t).done) { mDone = t; break; }
  out[name] = {
    omega0: r(w0, 4), zeta: r(zeta, 4), overshootPct: r((peak - 1) * 100, 2), peakAtMs: Math.round(tPeak * 1000),
    settle_0p1pct_ms: r(s01 * 1000, 1), settle_0p5pct_ms: r(s05 * 1000, 1), settle_2pct_ms: r(s2 * 1000, 1),
    linear_uniform25_0p1: { durationMs: T01 * 1000, points: 25, maxErr: r(maxErr(f, T01, u25_01.pts), 4), css: u25_01.str },
    linear_uniform40_0p1: { durationMs: T01 * 1000, points: 40, maxErr: r(maxErr(f, T01, u40_01.pts), 4), css: u40_01.str },
    linear_uniform30_0p5: { durationMs: T05 * 1000, points: 30, maxErr: r(maxErr(f, T05, u30_05.pts), 4), css: u30_05.str },
    "linear_adaptive_eps0.004_0p1": { durationMs: T01 * 1000, points: a01.pts.length, maxErr: r(maxErr(f, T01, a01.pts), 4), bytes: a01.str.length, css: a01.str },
    "linear_adaptive_eps0.004_0p5": { durationMs: T05 * 1000, points: a05.pts.length, maxErr: r(maxErr(f, T05, a05.pts), 4), bytes: a05.str.length, css: a05.str },
    motion_14_2_0: { doneAtMs_1msScan: mDone, toStringDurationAndPoints: mStr.split(" ")[0], points: (mStr.match(/,/g) || []).length + 1, css: mStr.slice(mStr.indexOf("linear")) },
  };
}
console.log(JSON.stringify(out, null, 2));
