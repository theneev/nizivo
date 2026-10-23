// formatLabel (@nizivo/react/i18n, ARCHITECTURE.md §16.4): CLDR plural categories through
// Intl.PluralRules, `{name}` placeholders, numbers formatted per locale, nothing concatenated.
import { describe, expect, test } from 'vitest';
import { graph, isClient, rekey } from '../helpers/graph';
import { formatLabel, type PluralLabel } from '../../src/i18n/index';

const SRC = rekey(
  import.meta.glob('../../src/i18n/*.ts', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

const EN: PluralLabel = { one: '{count} file', other: '{count} files' };
const PL: PluralLabel = {
  one: '{count} plik',
  few: '{count} pliki',
  many: '{count} plików',
  other: '{count} pliku',
};
const AR: PluralLabel = {
  zero: 'zero:{count}',
  one: 'one:{count}',
  two: 'two:{count}',
  few: 'few:{count}',
  many: 'many:{count}',
  other: 'other:{count}',
};

describe('plural selection', () => {
  test('en-US: one and other; en-US is the default locale', () => {
    expect(formatLabel(EN, { count: 1 })).toBe('1 file');
    expect(formatLabel(EN, { count: 0 })).toBe('0 files');
    expect(formatLabel(EN, { count: 2 }, 'en-US')).toBe('2 files');
  });

  test('pl: one, few, many and other', () => {
    expect(formatLabel(PL, { count: 1 }, 'pl')).toBe('1 plik');
    expect(formatLabel(PL, { count: 3 }, 'pl')).toBe('3 pliki');
    expect(formatLabel(PL, { count: 22 }, 'pl')).toBe('22 pliki');
    expect(formatLabel(PL, { count: 5 }, 'pl')).toBe('5 plików');
    expect(formatLabel(PL, { count: 12 }, 'pl')).toBe('12 plików');
    expect(formatLabel(PL, { count: 1.5 }, 'pl')).toBe('1,5 pliku');
  });

  test('ar: zero, one, two, few, many and other', () => {
    const latn = 'ar-u-nu-latn';
    expect(formatLabel(AR, { count: 0 }, latn)).toBe('zero:0');
    expect(formatLabel(AR, { count: 1 }, latn)).toBe('one:1');
    expect(formatLabel(AR, { count: 2 }, latn)).toBe('two:2');
    expect(formatLabel(AR, { count: 3 }, latn)).toBe('few:3');
    expect(formatLabel(AR, { count: 11 }, latn)).toBe('many:11');
    expect(formatLabel(AR, { count: 100 }, latn)).toBe('other:100');
  });

  test('a missing category, or no numeric count, falls back to other', () => {
    expect(formatLabel({ other: '{count} more' }, { count: 1 })).toBe('1 more');
    expect(formatLabel(PL, {}, 'pl')).toBe('{count} pliku');
    expect(formatLabel(EN, { count: '1' })).toBe('1 files');
  });
});

describe('placeholders', () => {
  test('every {name} is replaced from values; a string is used as is', () => {
    expect(formatLabel('Remove {name}', { name: 'q3.pdf' })).toBe('Remove q3.pdf');
    expect(formatLabel('{a}, {b} and {a}', { a: 'x', b: 'y' })).toBe('x, y and x');
    expect(formatLabel('No placeholder')).toBe('No placeholder');
  });

  test('numbers are formatted with Intl.NumberFormat(locale)', () => {
    expect(formatLabel('+{count}', { count: 1200 })).toBe('+1,200');
    expect(formatLabel('+{count}', { count: 1200 }, 'de-DE')).toBe(
      `+${new Intl.NumberFormat('de-DE').format(1200)}`,
    );
    expect(formatLabel('{count}', { count: 1234567 }, 'ar-EG')).toBe(
      new Intl.NumberFormat('ar-EG').format(1234567),
    );
    expect(formatLabel('{count} of {total}', { count: 3, total: 1000 }, 'fr-FR')).toBe(
      `3 of ${new Intl.NumberFormat('fr-FR').format(1000)}`,
    );
  });

  test('an unknown placeholder stays as written, an inherited key included', () => {
    expect(formatLabel('Page {page} of {total}', { page: 2 })).toBe('Page 2 of {total}');
    expect(formatLabel('{constructor} {toString}', {})).toBe('{constructor} {toString}');
  });
});

describe('module', () => {
  test("no 'use client' module; it imports nothing", () => {
    const { modules, externals } = graph(SRC, 'src/i18n/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual([]);
  });
});
