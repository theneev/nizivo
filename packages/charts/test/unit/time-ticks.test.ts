// Time axes over ISO plain dates (ARCHITECTURE.md §14.1, §16.3).
import { describe, expect, test } from 'vitest';
import {
  dateTicks,
  everyNth,
  isPlainDate,
  plainDateFormat,
  plainDateValue,
  tickEvery,
  tickLabels,
} from '../../src/_core/time-ticks';

const october = Array.from({ length: 30 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);

describe('plain dates', () => {
  test('real ISO calendar dates only', () => {
    expect(isPlainDate('2026-10-19')).toBe(true);
    expect(isPlainDate('2026-02-30')).toBe(false);
    expect(isPlainDate('2026-10-19T00:00:00Z')).toBe(false);
    expect(isPlainDate('19/10/2026')).toBe(false);
    expect(plainDateValue('1970-01-02')).toBe(86_400_000);
  });

  test('formatting reads the date as a UTC day, whatever the time zone', () => {
    const format = plainDateFormat('en-US');
    expect(format('2026-10-01')).toBe('Oct 1');
    expect(plainDateFormat('de-DE', { day: 'numeric', month: 'long' })('2026-10-30')).toBe(
      '30. Oktober',
    );
    expect(() => format('2026-13-01')).toThrow(RangeError);
  });
});

describe('every Nth tick, last forced', () => {
  test("Figma 03's area chart: 30 daily points, weekly ticks, the last forced", () => {
    expect(everyNth(30, 7)).toEqual([0, 7, 14, 21, 29]);
    expect(dateTicks(october, { every: 7 })).toEqual([0, 7, 14, 21, 29]);
  });

  test("a middle tick that would crowd the forced last one is dropped (Figma's '29' and '30')", () => {
    expect(everyNth(30, 2)).toEqual([...Array.from({ length: 14 }, (_, i) => i * 2), 29]);
    expect(everyNth(30, 4)).toEqual([0, 4, 8, 12, 16, 20, 24, 29]);
    expect(everyNth(30, 4, { minGap: 6 })).toEqual([0, 4, 8, 12, 16, 20, 29]);
  });

  test('few points: both ends; one point: itself; none: nothing', () => {
    expect(everyNth(2, 7)).toEqual([0, 1]);
    expect(everyNth(1, 7)).toEqual([0]);
    expect(everyNth(0, 7)).toEqual([]);
  });

  test('tickEvery keeps the count at or under max', () => {
    expect(tickEvery(30, 5)).toBe(8);
    expect(dateTicks(october).length).toBeLessThanOrEqual(5);
    expect(tickEvery(1, 5)).toBe(1);
  });

  test('dateTicks refuses timestamps', () => {
    expect(() => dateTicks(['2026-10-01', '2026-10-01T12:00'])).toThrow(RangeError);
  });

  test("tickLabels: one label per point, '' between ticks", () => {
    expect(tickLabels(['a', 'b', 'c', 'd'], [0, 3])).toEqual(['a', '', '', 'd']);
  });
});
