import { describe, expect, test } from 'vitest';
import { barRect, num, pct, plotPoints, VIEWBOX } from '../../src/_core/geometry';
import { linear, point } from '../../src/_core/scale';

describe('percent-space geometry', () => {
  test('the viewBox is percent space', () => {
    expect(VIEWBOX).toBe('0 0 100 100');
  });

  test('num: compact, deterministic attribute text', () => {
    expect(num(16.666666666)).toBe('16.667');
    expect(num(50)).toBe('50');
    expect(num(-0.0001)).toBe('0');
    expect(pct(12.5)).toBe('12.5%');
    expect(() => num(Number.NaN)).toThrow(RangeError);
  });

  test('a bar from the baseline, up or down', () => {
    const y = linear([-50, 100], [100, 0]);
    const base = y(0);
    expect(barRect(10, 5, y(100), base)).toEqual({
      x: '10%',
      y: '0%',
      width: '5%',
      height: '66.667%',
    });
    expect(barRect(10, 5, y(-50), base)).toEqual({
      x: '10%',
      y: '66.667%',
      width: '5%',
      height: '33.333%',
    });
  });

  test('plotPoints skips data a scale cannot place', () => {
    const x = point(['a', 'b'], [0, 100]);
    const y = linear([0, 10], [100, 0]);
    const data = [
      { k: 'a', v: 5 },
      { k: 'zz', v: 1 },
      { k: 'b', v: 10 },
    ];
    expect(
      plotPoints(
        data,
        (d) => x(d.k),
        (d) => y(d.v),
      ),
    ).toEqual([
      { x: 0, y: 50 },
      { x: 100, y: 0 },
    ]);
  });
});
