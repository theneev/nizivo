// Heatmap's server markup and maths (ARCHITECTURE.md §14.1, §16.4, §16.5; Figma 03 "Heatmap"): the
// documented five-step ramp over 0 to the largest value, rows and columns in first-seen order, a
// cell with no value, every other column labelled by default, the grid hidden from assistive
// technology and the frame's table holding every value, no inline style, locale and status.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Heatmap, heatmapGrid, heatmapStep, type HeatmapProps } from '../../src/heatmap/index';

interface Slot {
  day: string;
  hour: string;
  n: number | null;
}

const DATA: Slot[] = [
  { day: 'Mon', hour: '00', n: 0 },
  { day: 'Mon', hour: '06', n: 10 },
  { day: 'Mon', hour: '12', n: 1000 },
  { day: 'Mon', hour: '18', n: 50 },
  { day: 'Tue', hour: '00', n: null },
  { day: 'Tue', hour: '06', n: 20 },
  { day: 'Tue', hour: '12', n: 400 },
  { day: 'Tue', hour: '18', n: 800 },
];

function html(props: Partial<HeatmapProps<Slot>> = {}): string {
  return renderToStaticMarkup(
    <Heatmap title="Orders" data={DATA} x="hour" y="day" value="n" {...props} />,
  );
}

describe('heatmapStep', () => {
  test('five equal widths over 0 to max', () => {
    expect([0, 1, 20, 21, 40, 41, 60, 80, 81, 100].map((v) => heatmapStep(v, 100))).toEqual([
      1, 1, 1, 2, 2, 3, 3, 4, 5, 5,
    ]);
  });

  test('no value is null; a max of 0 makes every value step 1; negatives are step 1', () => {
    expect(heatmapStep(null, 10)).toBeNull();
    expect(heatmapStep(0, 0)).toBe(1);
    expect(heatmapStep(-4, 10)).toBe(1);
  });
});

describe('heatmapGrid', () => {
  test('rows and columns in the order they first appear; the largest value', () => {
    const grid = heatmapGrid([
      { row: 'b', column: '2', value: 3 },
      { row: 'a', column: '1', value: 9 },
      { row: 'b', column: '1', value: null },
    ]);
    expect(grid.rows).toEqual(['b', 'a']);
    expect(grid.columns).toEqual(['2', '1']);
    expect(grid.max).toBe(9);
  });
});

describe('markup', () => {
  test('a hidden grid of cells, steps by data attribute, no inline style', () => {
    const out = html();
    expect(out).toContain('<div class="nz-heatmap-grid" aria-hidden="true">');
    expect(out.match(/data-slot="heatmap-cell"/g)).toHaveLength(8);
    expect(out).toContain('data-slot="heatmap-cell" data-step="5"');
    expect(out).toMatch(/data-slot="heatmap-cell"><\/span>/);
    expect(out).not.toContain('style=');
  });

  test('the table: one row per row, every value as text, no value as —', () => {
    const out = html({ labels: { row: 'Day' } });
    expect(out).toContain(
      '<th scope="col">Day</th><th scope="col">00</th><th scope="col">06</th><th scope="col">12</th><th scope="col">18</th>',
    );
    expect(out).toContain('<th scope="row">Mon</th><td>0</td><td>10</td><td>1,000</td><td>50</td>');
    expect(out).toContain('<th scope="row">Tue</th><td>—</td>');
  });

  test('column labels: every other one by default for 12 columns, every one for 4', () => {
    expect(html().match(/<span class="nz-heatmap-column">\d\d<\/span>/g)).toHaveLength(4);
    const twelve = Array.from({ length: 12 }, (_, i) => ({
      day: 'Mon',
      hour: String(i * 2).padStart(2, '0'),
      n: i,
    }));
    const out = renderToStaticMarkup(
      <Heatmap title="Orders" data={twelve} x="hour" y="day" value="n" />,
    );
    expect(out.match(/<span class="nz-heatmap-column">\d\d<\/span>/g)).toHaveLength(6);
    expect(out.match(/<span class="nz-heatmap-column"><\/span>/g)).toHaveLength(6);
  });

  test('the scale: Fewer, five swatches, More', () => {
    const out = html({ labels: { fewer: 'Weniger' } });
    expect(out.match(/class="nz-heatmap-swatch"/g)).toHaveLength(5);
    expect(out).toContain('<span>Weniger</span>');
  });

  test('locale', () => {
    expect(html({ locale: 'de-DE' })).toContain('<td>1.000</td>');
  });

  test('no grid while loading', () => {
    const out = html({ status: 'loading' });
    expect(out).not.toContain('nz-heatmap-grid');
    expect(out).toContain('data-loading=""');
  });
});
