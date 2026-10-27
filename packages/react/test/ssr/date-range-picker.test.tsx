// DateRangePicker on the server (ARCHITECTURE.md §16.3; D-dg): the trigger and the hidden form input
// only (a closed overlay emits no popup HTML, so nothing that depends on the clock is rendered), the
// range read the same on the server and in the browser (each end formatted on its own), the presets
// counted back from "today", and the engine reached only through engine.ts.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, rekey } from '../helpers/graph';
import { Field } from '../../src/field/field';
import { DateRangePicker } from '../../src/unstable/date-range-picker/index';
import {
  formatDateRange,
  presetRange,
  todayIn,
} from '../../src/unstable/date-range-picker/date-range-picker.client';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

describe('formatDateRange', () => {
  test('one year: the start drops it, as Figma reads "Oct 1 – Oct 7, 2026"', () => {
    expect(
      formatDateRange({ start: '2026-10-01', end: '2026-10-07' }, 'en-US', '{start} – {end}'),
    ).toBe('Oct 1 – Oct 7, 2026');
  });

  test('two years: both ends carry theirs; the locale formats each end', () => {
    expect(
      formatDateRange({ start: '2025-12-29', end: '2026-01-04' }, 'en-US', '{start} – {end}'),
    ).toBe('Dec 29, 2025 – Jan 4, 2026');
    expect(
      formatDateRange({ start: '2026-10-01', end: '2026-10-07' }, 'de-DE', '{start} bis {end}'),
    ).toBe('1. Okt. bis 7. Okt. 2026');
  });
});

describe('todayIn', () => {
  test('the date in the time zone, not the machine’s: 23:30 UTC on the 8th is the 9th in Berlin', () => {
    const now = new Date('2026-10-08T23:30:00Z');
    expect(todayIn('UTC', now)).toBe('2026-10-08');
    expect(todayIn('Europe/Berlin', now)).toBe('2026-10-09');
    expect(todayIn('America/Los_Angeles', now)).toBe('2026-10-08');
  });
});

describe('presetRange', () => {
  test.each([
    ['today', '2026-10-08', '2026-10-08'],
    ['yesterday', '2026-10-07', '2026-10-07'],
    ['last-7-days', '2026-10-02', '2026-10-08'],
    ['last-30-days', '2026-09-09', '2026-10-08'],
    ['this-quarter', '2026-10-01', '2026-10-08'],
    ['year-to-date', '2026-01-01', '2026-10-08'],
  ] as const)('%s, counted back from 8 Oct 2026', (preset, start, end) => {
    expect(presetRange(preset, '2026-10-08')).toEqual({ start, end });
  });

  test('this quarter in May starts on 1 April; days count across months and leap years', () => {
    expect(presetRange('this-quarter', '2026-05-20').start).toBe('2026-04-01');
    expect(presetRange('last-7-days', '2028-03-02').start).toBe('2028-02-25');
    expect(presetRange('yesterday', '2026-01-01').start).toBe('2025-12-31');
  });
});

describe('server markup', () => {
  const html = renderToString(
    <Field label="Report period">
      <DateRangePicker
        name="period"
        timeZone="UTC"
        defaultValue={{ start: '2026-10-01', end: '2026-10-07' }}
      />
    </Field>,
  );

  test('the trigger: its slot, Select’s look, the range as its value, no popup', () => {
    expect(html).toContain('data-slot="date-range-picker-trigger"');
    expect(html).toContain(
      'class="nz-date-range-picker-trigger nz-select-trigger nz-popover-trigger"',
    );
    expect(html).toContain('>Oct 1 – Oct 7, 2026</span>');
    expect(html).not.toContain('nz-date-range-picker-popup');
    expect(html).not.toContain('Last 7 days');
  });

  test('the form gets one ISO interval', () => {
    expect(html).toContain('<input type="hidden" name="period" value="2026-10-01/2026-10-07"/>');
  });

  test('no range: the placeholder, marked as one', () => {
    const empty = renderToString(<DateRangePicker aria-label="Window" timeZone="UTC" />);
    expect(empty).toContain('data-placeholder="">Select dates</span>');
  });
});

describe('module graph', () => {
  test('React Aria only through engine.ts; the engine module is the one adapter', () => {
    const { modules } = graph(SRC, 'src/unstable/date-range-picker/index.ts');
    expect(modules).toContain('src/_engines/react-aria/date-range-picker.client.tsx');
    const leaf = SRC.get('src/unstable/date-range-picker/date-range-picker.client.tsx') ?? '';
    expect(leaf).not.toMatch(/from 'react-aria/);
  });
});
