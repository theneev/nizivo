// DonutChart's server markup and maths (ARCHITECTURE.md §14.1, §16.4, §16.5; Figma 03 "Donut
// Chart"): the documented fold to three categories plus "Other", fixed colours that never cycle,
// flat-ended segments with real gaps, the legend and table through ChartFrame, the centre, status
// passthrough, locale formatting, no inline style, and the ChartInteraction island's item mode in
// the server markup by default (M41 item 2), none with interaction="none".
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { donutPath } from '../../src/donut-chart/donut-chart';
import {
  DonutChart,
  donutChartLabels,
  foldCategories,
  type DonutChartProps,
} from '../../src/donut-chart/index';

interface Channel {
  name: string;
  sales: number;
}

const CHANNELS: Channel[] = [
  { name: 'Wholesale', sales: 17263 },
  { name: 'Online store', sales: 64120 },
  { name: 'Marketplace', sales: 5210 },
  { name: 'Point of sale', sales: 34526 },
  { name: 'Pop-up', sales: 2188 },
];

const USD: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
};

function html(props: Partial<DonutChartProps<Channel>> = {}): string {
  return renderToStaticMarkup(
    <DonutChart
      title="Sales by channel"
      data={CHANNELS}
      category={(d) => d.name}
      value={(d) => d.sales}
      format={USD}
      {...props}
    />,
  );
}

const item = (label: string, value: number): { label: string; value: number } => ({ label, value });

describe('foldCategories', () => {
  test('largest first, three kept in cat-1…cat-3, the rest summed into "Other"', () => {
    expect(
      foldCategories(
        CHANNELS.map((c) => item(c.name, c.sales)),
        3,
        'Other',
      ),
    ).toEqual([
      { label: 'Online store', value: 64120, series: 'cat-1' },
      { label: 'Point of sale', value: 34526, series: 'cat-2' },
      { label: 'Wholesale', value: 17263, series: 'cat-3' },
      { label: 'Other', value: 7398, series: 'other' },
    ]);
  });

  test('ties keep their input order; sort="none" keeps the input order throughout', () => {
    const items = [item('b', 5), item('a', 5), item('c', 9)];
    expect(foldCategories(items, 3, 'Other').map((s) => s.label)).toEqual(['c', 'b', 'a']);
    expect(foldCategories(items, 3, 'Other', 'none').map((s) => s.label)).toEqual(['b', 'a', 'c']);
  });

  test('a single remainder keeps its own label, in the Other colour', () => {
    expect(
      foldCategories([item('a', 4), item('b', 3), item('c', 2), item('d', 1)], 3, 'Other').at(-1),
    ).toEqual({ label: 'd', value: 1, series: 'other' });
  });

  test('values that are not finite or not above zero are left out; colours never cycle', () => {
    const slices = foldCategories(
      [item('a', 0), item('b', -2), item('c', Number.NaN), item('d', 1), item('e', 2)],
      3,
      'Other',
    );
    expect(slices).toEqual([
      { label: 'e', value: 2, series: 'cat-1' },
      { label: 'd', value: 1, series: 'cat-2' },
    ]);
  });

  test('maxCategories is clamped to 1–3', () => {
    const items = [item('a', 4), item('b', 3), item('c', 2), item('d', 1), item('e', 1)];
    expect(foldCategories(items, 1, 'Other').map((s) => s.series)).toEqual(['cat-1', 'other']);
    expect(foldCategories(items, 9, 'Other').map((s) => s.series)).toEqual([
      'cat-1',
      'cat-2',
      'cat-3',
      'other',
    ]);
  });
});

describe('donutPath', () => {
  test('a quarter: outer arc clockwise, inner arc back, flat ends, trimmed by the gap', () => {
    const d = donutPath(0, Math.PI / 2);
    // 1.5 units (half the 3-unit gap) in from 12 o'clock on both radii: parallel sides
    expect(d).toBe('M1.5 -99.99A100 100 0 0 1 99.99 -1.5L73.98 -1.5A74 74 0 0 0 1.5 -73.98Z');
  });

  test('a segment over half the ring takes the large arc', () => {
    expect(donutPath(0, Math.PI * 1.2)).toMatch(/^M\S+ \S+A100 100 0 1 1 /);
  });

  test('a lone category is the whole ring with no gap; a sliver thinner than the gap is dropped', () => {
    expect(donutPath(0, Math.PI * 2)).toBe(
      'M0 -100A100 100 0 1 1 0 100A100 100 0 1 1 0 -100M0 -74A74 74 0 1 0 0 74A74 74 0 1 0 0 -74Z',
    );
    expect(donutPath(0, 0.03)).toBe('');
  });
});

describe('DonutChart', () => {
  test('renders inside a ChartFrame, server-only and without inline style', () => {
    const out = html();
    expect(out).toMatch(/^<figure data-slot="chart-frame" class="nz-chart-frame nz-donut-chart"/);
    expect(out).not.toContain('style=');
    expect(out).toContain(
      '<svg class="nz-donut-chart-svg" viewBox="-100 -100 200 200" aria-hidden="true">',
    );
    // no axes: no tick label gutters
    expect(out).not.toContain('nz-chart-frame-y-ticks');
  });

  test('segments in the fixed colour order, never cycled', () => {
    const series = [
      ...html().matchAll(/class="nz-donut-chart-segment" data-series="([^"]+)"/g),
    ].map((m) => m[1]);
    expect(series).toEqual(['cat-1', 'cat-2', 'cat-3', 'other']);
  });

  test('the legend (through ChartFrame) and the table carry values and shares', () => {
    const out = html({ labels: { category: 'Channel', value: 'Sales' } });
    expect(out).toContain('<div class="nz-chart-frame-legend" data-slot="chart-frame-legend"><ul');
    expect(out).toContain('data-orientation="vertical"');
    expect(out).toContain(
      '<span class="nz-legend-mark" data-series="cat-1" aria-hidden="true"></span><span class="nz-legend-label">Online store</span><span class="nz-legend-value">$64,120</span><span class="nz-legend-share">52%</span>',
    );
    expect(out).toContain(
      '<th scope="col">Channel</th><th scope="col">Sales</th><th scope="col">Share</th>',
    );
    expect(out).toContain('<tr><th scope="row">Other</th><td>$7,398</td><td>6%</td></tr>');
  });

  test('the centre shows the compact total; each segment has an aria-hidden share for hover', () => {
    const out = html({ labels: { total: 'Total sales' } });
    expect(out).toContain(
      '<div class="nz-donut-chart-center"><span class="nz-donut-chart-value">$123.3K</span><span class="nz-donut-chart-label">Total sales</span></div>',
    );
    expect(out).toContain(
      '<div class="nz-donut-chart-center" data-series="cat-2" aria-hidden="true"><span class="nz-donut-chart-value">28%</span><span class="nz-donut-chart-label">Point of sale</span></div>',
    );
  });

  test('the centre slot replaces the total', () => {
    const out = html({ center: <strong>4 channels</strong> });
    expect(out).toContain('<div class="nz-donut-chart-center"><strong>4 channels</strong></div>');
  });

  test('formats per locale, once, on the server', () => {
    const out = html({
      locale: 'de-DE',
      format: { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 },
      labels: { other: 'Andere' },
    });
    expect(out).toContain('<span class="nz-legend-value">64.120 €</span>');
    expect(out).toContain('<span class="nz-legend-share">52 %</span>');
    expect(out).toContain('<span class="nz-legend-label">Andere</span>');
  });

  test('status passes through; the legend keeps its rows (the box), its values only when ready', () => {
    for (const status of ['loading', 'error'] as const) {
      const out = html({ status });
      expect(out).toContain(`data-${status}=""`);
      expect(out.match(/data-slot="legend-item"/g)).toHaveLength(4);
      expect(out).not.toContain('nz-legend-value');
      expect(out).not.toContain('nz-donut-chart-segment');
    }
    expect(html({ pending: true })).toContain('aria-busy="true"');
  });

  test('no data, or nothing above zero, is empty', () => {
    expect(html({ data: [] })).toContain('data-empty=""');
    expect(html({ data: [{ name: 'a', sales: 0 }] })).toContain('data-empty=""');
  });

  test('by default the island is in the server markup: one tab stop, one empty polite region', () => {
    const out = html();
    expect(out.match(/tabindex="0"/g)).toHaveLength(1);
    expect(out).toContain('role="application"');
    expect(out).toContain('aria-label="Sales by channel"');
    expect(out).toContain('aria-roledescription="interactive chart"');
    expect(out).toContain(
      'Arrow keys move between slices; Home and End go to the first and last</span>',
    );
    expect(out).toContain('aria-live="polite" aria-atomic="true"></span>');
    // nothing shown or highlighted before a key or a pointer, and no inline style
    expect(out).not.toContain('nz-chart-tooltip');
    expect(out).not.toContain('data-highlighted');
    expect(out).not.toContain('style=');
    // the island lies over the ring: last in the plot
    expect(out).toMatch(
      /<div aria-label="Sales by channel"[^>]*class="nz-chart-interaction nz-chart-interaction-columns"[^]*<\/div><\/div><\/div>/,
    );
  });

  test('every slice has a segment for the island, a sliver thinner than the gap an empty one', () => {
    const out = html({
      data: [
        { name: 'Big', sales: 1000 },
        { name: 'Tiny', sales: 1 },
      ],
    });
    expect(
      [
        ...out.matchAll(
          /<path class="nz-donut-chart-segment" data-series="([^"]+)" data-slot="donut-chart-segment" d="([^"]*)"/g,
        ),
      ].map((m) => [m[1], m[2] === '']),
    ).toEqual([
      ['cat-1', false],
      ['cat-2', true],
    ]);
    // the sliver is in the legend and the table as before
    expect(out).toContain('<span class="nz-legend-label">Tiny</span>');
  });

  test('interaction="none": no tab stop, no live region; tableView="details" shows the values', () => {
    const out = html({ interaction: 'none' });
    expect(out).not.toContain('tabindex');
    expect(out).not.toContain('aria-live');
    expect(out).not.toContain('nz-chart-interaction');
    expect(html({ interaction: 'none', tableView: 'details' })).toContain('<details');
    expect(html({ tableView: 'details' })).toContain('<details');
  });
});

describe("DonutChart props: the charts' one API shape (M40 item 9)", () => {
  interface Row {
    name: string;
    sales: number | null;
  }
  const NONE: Row[] = [];
  const ROWS: Row[] = [
    { name: 'Card', sales: 812.5 },
    { name: 'Invoice', sales: null },
    { name: 'Cash', sales: 198 },
  ];

  test('category and value take a key of the datum or a (datum, index) function, alike', () => {
    const byKey = renderToStaticMarkup(
      <DonutChart title="Payments" data={ROWS} category="name" value="sales" />,
    );
    const byFunction = renderToStaticMarkup(
      <DonutChart
        title="Payments"
        data={ROWS}
        category={(d, i) => (i < 0 ? '' : d.name)}
        value={(d) => d.sales}
      />,
    );
    expect(byKey).toBe(byFunction);
  });

  test("a null value is left out; format defaults to Intl's own (fractions show)", () => {
    const out = renderToStaticMarkup(
      <DonutChart title="Payments" data={ROWS} category="name" value="sales" />,
    );
    expect(out.match(/class="nz-donut-chart-segment"/g)).toHaveLength(2);
    expect(out).not.toContain('Invoice');
    expect(out).toContain('<span class="nz-legend-value">812.5</span>');
    // the total in the centre: compactOf(format), at most one fraction digit
    expect(out).toContain('<span class="nz-donut-chart-value">1K</span>');
  });

  test('totalFormat overrides the compact total', () => {
    const out = renderToStaticMarkup(
      <DonutChart
        title="Payments"
        data={ROWS}
        category="name"
        value="sales"
        totalFormat={{ maximumFractionDigits: 1 }}
      />,
    );
    expect(out).toContain('<span class="nz-donut-chart-value">1,010.5</span>');
  });

  test("labels: ChartFrame's strings and DonutChart's in one Partial<DonutChartLabels>", () => {
    const out = renderToStaticMarkup(
      <DonutChart
        title="Payments"
        data={NONE}
        category="name"
        value="sales"
        labels={{ empty: 'Keine Daten', other: 'Andere' }}
      />,
    );
    expect(out).toContain('Keine Daten');
    expect(donutChartLabels.empty).toBe('No data to show');
  });
});
