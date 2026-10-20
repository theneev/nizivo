// The one API shape of the charts (src/_core/api.ts; M40 item 9) and the list separators the
// island joins its spoken text with (M40 item 10).
import { describe, expect, test } from 'vitest';
import { accessor, compactOf, finite, listSeparators, LONG_DATE } from '../../src/_core/api';

describe('accessor', () => {
  test('a key reads the field; a function gets the datum and its index', () => {
    const data = [
      { day: 'Mon', sales: 3 },
      { day: 'Tue', sales: 5 },
    ];
    expect(data.map(accessor<(typeof data)[number], number>('sales'))).toEqual([3, 5]);
    expect(data.map(accessor((d: (typeof data)[number], i) => `${d.day}${i}`))).toEqual([
      'Mon0',
      'Tue1',
    ]);
  });

  test('finite: a finite number or null', () => {
    expect([1, 0, -2.5, Number.NaN, Infinity, null, undefined, '3'].map(finite)).toEqual([
      1,
      0,
      -2.5,
      null,
      null,
      null,
      null,
      null,
    ]);
  });
});

test('the format defaults: compact axis labels from `format`, the long date', () => {
  expect(compactOf({ style: 'currency', currency: 'USD', maximumFractionDigits: 0 })).toEqual({
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  expect(new Intl.NumberFormat('en-US', compactOf({})).format(8000)).toBe('8K');
  expect(new Intl.DateTimeFormat('en-US', { ...LONG_DATE, timeZone: 'UTC' }).format(0)).toBe(
    'Thu, Jan 1',
  );
});

/** The island's join (src/_island/chart-interaction.client.tsx `show`), on its own. */
const join = (items: string[], [between, last]: [string, string]): string =>
  items.reduce((text, item, k) => text + (k < items.length - 1 ? between : last) + item);

describe('listSeparators: what the island joins with is what Intl.ListFormat writes', () => {
  const LOCALES = ['en-US', 'de-DE', 'fr-FR', 'ar-EG', 'ja-JP', 'zh-CN', 'th-TH', 'fa-IR', 'he-IL'];
  test.each(LOCALES)('%s, 3 to 7 items', (locale) => {
    const list = new Intl.ListFormat(locale, { type: 'unit', style: 'short' });
    const separators = listSeparators(locale);
    for (let n = 3; n <= 7; n += 1) {
      const items = Array.from({ length: n }, (_, i) => `item${i}`);
      expect(join(items, separators)).toBe(list.format(items));
    }
  });

  test('English and German', () => {
    expect(listSeparators('en-US')).toEqual([', ', ', ']);
    expect(listSeparators('de-DE')).toEqual([', ', ' und ']);
  });
});
