// The own scales (ARCHITECTURE.md §14.1): d3's layout rules, and the structural ScaleLike seam.
import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  band,
  linear,
  point,
  valueDomain,
  type BandScaleLike,
  type LinearScaleLike,
  type PointScaleLike,
  type ScaleLike,
} from '../../src/_core/scale';

describe('linear', () => {
  test('maps the domain onto the range, y flipped for percent space', () => {
    const y = linear([0, 8000], [100, 0]);
    expect(y(0)).toBe(100);
    expect(y(8000)).toBe(0);
    expect(y(2000)).toBe(75);
    expect(y.domain()).toEqual([0, 8000]);
    expect(y.range()).toEqual([100, 0]);
  });

  test('a zero-width domain maps to the middle of the range', () => {
    expect(linear([5, 5], [0, 100])(5)).toBe(50);
  });

  test('ticks are d3-array ticks; nice() ends the domain on a tick', () => {
    const y = linear([0, 313], [100, 0]);
    expect(y.ticks(4)).toEqual([0, 100, 200, 300]);
    const niced = y.nice(4);
    expect(niced.domain()).toEqual([0, 400]);
    expect(niced.ticks(4).at(-1)).toBe(400);
  });
});

describe('band (d3 scaleBand layout)', () => {
  test('equal bands with inner and outer padding, centred', () => {
    const x = band(['a', 'b', 'c', 'd'], [0, 100], { paddingInner: 0.5, paddingOuter: 0.25 });
    // step = 100 / (4 - 0.5 + 0.5) = 25; start = (100 - 25 × 3.5) × 0.5 = 6.25
    expect(x.step()).toBe(25);
    expect(x.bandwidth()).toBe(12.5);
    expect(['a', 'b', 'c', 'd'].map((k) => x(k))).toEqual([6.25, 31.25, 56.25, 81.25]);
    expect(x('z')).toBeUndefined();
  });

  test('a reversed range lays the bands out from the end; duplicates are dropped', () => {
    const x = band(['a', 'b', 'a'], [100, 0]);
    expect(x.domain()).toEqual(['a', 'b']);
    expect([x('a'), x('b')]).toEqual([50, 0]);
  });
});

describe('point (d3 scalePoint layout)', () => {
  test('the first point at the range start and the last at its end', () => {
    const x = point(
      ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'],
      [0, 100],
    );
    expect(x.domain().map((d) => x(d))).toEqual([0, 25, 50, 75, 100]);
    expect(x.step()).toBe(25);
  });

  test('one point sits in the middle; padding insets both ends', () => {
    expect(point(['only'], [0, 100])('only')).toBe(50);
    const padded = point(['a', 'b', 'c'], [0, 100], { padding: 0.5 });
    expect(padded('a')).toBeCloseTo(100 / 6);
    expect(padded('b')).toBe(50);
    expect(padded('c')).toBeCloseTo(500 / 6);
  });
});

describe('valueDomain: niced before ticks (Figma 03 "bar above the top tick")', () => {
  test('the top is a tick at or above every value', () => {
    expect(valueDomain([120, 313, 280])).toEqual([0, 400]);
    expect(valueDomain([6284, 4910], { count: 4 })).toEqual([0, 8000]);
  });

  test('negative values extend below zero; zero: false fits the data', () => {
    expect(valueDomain([-30, 70])).toEqual([-40, 80]);
    expect(valueDomain([52, 58], { zero: false })).toEqual([52, 58]);
  });

  test('no data, all zeros or non-finite values give [0, 1]', () => {
    expect(valueDomain([])).toEqual([0, 1]);
    expect(valueDomain([0, 0])).toEqual([0, 1]);
    expect(valueDomain([Number.NaN])).toEqual([0, 1]);
  });
});

describe('ScaleLike: the structural seam (K9)', () => {
  test('our scales satisfy the interfaces a chart takes', () => {
    expectTypeOf(linear([0, 1], [0, 100])).toExtend<LinearScaleLike>();
    expectTypeOf(band(['a'], [0, 100])).toExtend<BandScaleLike>();
    expectTypeOf(point(['a'], [0, 100])).toExtend<PointScaleLike>();
  });

  test("a d3-shaped scale fits unchanged (d3's overloaded domain/ticks, NumberValue input)", () => {
    type NumberValue = number | { valueOf(): number };
    interface D3Linear {
      (value: NumberValue): number;
      domain(): number[];
      domain(domain: Iterable<NumberValue>): this;
      ticks(count?: number): number[];
      range(): number[];
    }
    interface D3Point {
      (value: string): number | undefined;
      domain(): string[];
      domain(domain: Iterable<string>): this;
      step(): number;
    }
    expectTypeOf<D3Linear>().toExtend<LinearScaleLike>();
    expectTypeOf<D3Point>().toExtend<PointScaleLike>();
    expectTypeOf<D3Point>().toExtend<ScaleLike<string>>();
  });
});
