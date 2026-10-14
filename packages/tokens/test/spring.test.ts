// The token build derives the spring easings with the one generator in @nizivo/tooling (plan §13.1),
// imported through its `./spring` export by scripts/spring.ts. These pin that import path, the
// committed src/code-owned/motion-derived.tokens.json and its agreement with the tooling golden.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { parseFigmaSpring, springToCss } from '@nizivo/tooling/spring';
import { describe, expect, test } from 'vitest';
import { MOTION_DERIVED, renderDerived } from '../scripts/spring.ts';

const require = createRequire(import.meta.url);
const golden: { springs: Record<string, { figma: string; durationMs: number; easing: string }> } =
  JSON.parse(
    readFileSync(
      join(require.resolve('@nizivo/tooling/package.json'), '../spring/spring.golden.json'),
      'utf8',
    ),
  );

describe('@nizivo/tooling/spring', () => {
  test('resolves from @nizivo/tokens and derives the plan durations', () => {
    const spring = springToCss(parseFigmaSpring('spring(1, 260, 24, 0)'));
    const soft = springToCss(parseFigmaSpring('spring(1, 170, 26, 0)'));
    expect([spring.durationMs, soft.durationMs]).toEqual([493, 702]);
    expect(spring.easing).toMatch(/^linear\(0, .*, 1\)$/);
  });
});

describe('src/code-owned/motion-derived.tokens.json', () => {
  test('is what the generator derives from the Figma springs (pnpm tokens:spring:check)', () => {
    expect(readFileSync(MOTION_DERIVED, 'utf8')).toBe(renderDerived());
  });

  test('equals the tooling golden for every Figma spring, in the assumed (m, k, c, v) order', () => {
    const derived: {
      easing: Record<string, { $value: string; $extensions: Record<string, { spring: object }> }>;
      duration: Record<string, { $value: { value: number; unit: string } }>;
    } = JSON.parse(readFileSync(MOTION_DERIVED, 'utf8'));
    for (const [figma, expected] of Object.entries(golden.springs)) {
      const name = figma.replace('easing/', '');
      const easing = derived.easing[name];
      expect(easing?.$value).toBe(expected.easing);
      expect(derived.duration[name]?.$value).toEqual({ value: expected.durationMs, unit: 'ms' });
      expect(easing?.$extensions['app.nizivo.derived']?.spring).toEqual(
        parseFigmaSpring(expected.figma),
      );
    }
    expect(Object.keys(derived.easing)).toEqual(['spring', 'spring-soft']);
  });
});
