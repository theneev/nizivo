import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  parseFigmaSpring,
  settleTime,
  springPosition,
  springToCss,
  type SpringCss,
} from '../spring/spring.ts';

interface Golden {
  springs: Record<string, SpringCss & { figma: string }>;
}
type SpikeResults = Record<
  string,
  { overshootPct: number } & Record<
    string,
    { durationMs: number; points: number; maxErr: number; bytes: number; css: string }
  >
>;

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const golden: Golden = JSON.parse(read('../spring/spring.golden.json'));

describe('spring golden', () => {
  test.each(Object.entries(golden.springs))('%s', (_token, { figma, ...expected }) => {
    expect(springToCss(parseFigmaSpring(figma))).toEqual(expected);
  });

  test('pins the plan durations: 493 ms and 702 ms at ±0.1%', () => {
    expect(springToCss(parseFigmaSpring('spring(1, 260, 24, 0)')).durationMs).toBe(493);
    expect(springToCss(parseFigmaSpring('spring(1, 170, 26, 0)')).durationMs).toBe(702);
  });

  test('reproduces spike S4 (adaptive ε = 0.004, ±0.1%) exactly', () => {
    const spike: SpikeResults = JSON.parse(
      read('../../../docs/research/phase2/spikes/s4-spring/spring-results.json'),
    );
    for (const [figma, result] of Object.entries(spike)) {
      const adaptive = result['linear_adaptive_eps0.004_0p1'];
      const css = springToCss(parseFigmaSpring(figma));
      expect(css).toEqual({
        durationMs: adaptive?.durationMs,
        easing: adaptive?.css,
        points: adaptive?.points,
        maxError: adaptive?.maxErr,
        overshootPct: result.overshootPct,
      });
      expect(css.easing).toHaveLength(adaptive?.bytes ?? 0);
    }
  });
});

describe('springPosition', () => {
  test('starts at 0 and settles at 1 for under-, critically and over-damped springs', () => {
    for (const damping of [10, 20, 40]) {
      const x = springPosition({ mass: 1, stiffness: 100, damping, velocity: 0 });
      expect(x(0)).toBeCloseTo(0, 10);
      expect(x(5)).toBeCloseTo(1, 4);
    }
  });

  test('an over-damped spring never overshoots', () => {
    expect(springToCss({ mass: 1, stiffness: 100, damping: 40, velocity: 0 }).overshootPct).toBe(0);
  });

  test('an initial velocity changes the curve', () => {
    const still = springPosition({ mass: 1, stiffness: 260, damping: 24, velocity: 0 });
    const moving = springPosition({ mass: 1, stiffness: 260, damping: 24, velocity: 5 });
    expect(moving(0.05)).toBeGreaterThan(still(0.05));
  });

  test('rejects impossible springs', () => {
    expect(() => springPosition({ mass: 0, stiffness: 1, damping: 1, velocity: 0 })).toThrow(
      'mass > 0',
    );
    expect(() => springPosition({ mass: 1, stiffness: 1, damping: -1, velocity: 0 })).toThrow(
      'damping >= 0',
    );
  });

  test('refuses a spring that never settles', () => {
    expect(() =>
      settleTime(springPosition({ mass: 1, stiffness: 100, damping: 0, velocity: 0 })),
    ).toThrow('does not settle within 5 s');
  });
});

describe('parseFigmaSpring', () => {
  test('reads (mass, stiffness, damping, velocity)', () => {
    expect(parseFigmaSpring('spring(1, 260, 24, 0)')).toEqual({
      mass: 1,
      stiffness: 260,
      damping: 24,
      velocity: 0,
    });
  });

  test.each(['spring(1, 260, 24)', 'spring(1, 260, x, 0)', 'cubic-bezier(0, 0, 1, 1)', 'spring()'])(
    'rejects %s',
    (text) => {
      expect(() => parseFigmaSpring(text)).toThrow('Not a spring');
    },
  );
});
