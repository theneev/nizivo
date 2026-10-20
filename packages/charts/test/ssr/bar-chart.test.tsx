// BarChart's server markup (ARCHITECTURE.md §14.1, §16.4, §16.5; Figma 03 "Bar Chart"): a niced
// domain, bars as percentage <rect>s clipped at the baseline, HTML tick labels, a pre-formatted data
// table, status passthrough, locale formatting and no inline style; the ChartInteraction island's
// layer by default (column mode, M40 item 2), the CSS-only tooltips with interaction="none"; and
// the charts' one API shape (keys or `(datum, index)` functions, Intl-only formats, M40 item 9).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { BarChart, barChartLabels, type BarChartProps } from '../../src/bar-chart/index';

interface Day {
  date: string;
  orders: number;
}

// Figma 03: 14 days, Oct 17–30; the last bar (313) rose above Figma's top tick (300)
const ORDERS: Day[] = [183, 214, 196, 241, 269, 232, 205, 228, 251, 279, 263, 299, 287, 313].map(
  (orders, i) => ({ date: `2026-10-${String(17 + i)}`, orders }),
);

function html(props: Partial<BarChartProps<Day>> = {}): string {
  return renderToStaticMarkup(
    <BarChart title="Orders" data={ORDERS} x={(d) => d.date} y={(d) => d.orders} {...props} />,
  );
}

/** The text of every element with `className`, in order. */
function texts(markup: string, className: string): string[] {
  const out: string[] = [];
  const pattern = new RegExp(`<span class="${className}">([^<]*)</span>`, 'g');
  for (const match of markup.matchAll(pattern)) out.push(match[1] ?? '');
  return out;
}

/** The `y` attribute of every bar <rect>. */
function barTops(markup: string): string[] {
  return [...markup.matchAll(/<rect class="nz-bar-chart-bar"[^>]* y="([^"]+)"/g)].map(
    (match) => match[1] ?? '',
  );
}

describe('BarChart', () => {
  test('renders inside a ChartFrame, server-only and without inline style', () => {
    const out = html();
    expect(out).toMatch(/^<figure data-slot="chart-frame" class="nz-chart-frame nz-bar-chart"/);
    expect(out).not.toContain('style=');
    expect(out).toContain('data-x-direction="ltr"');
    // the bands and tooltips are presentation: the data table is the accessible alternative
    expect(out).toContain('<div class="nz-bar-chart-bands" aria-hidden="true">');
    expect(out.match(/data-slot="bar-chart-band"/g)).toHaveLength(14);
  });

  test('the domain is niced before its ticks: no bar rises above the top tick', () => {
    const out = html();
    expect(texts(out, 'nz-chart-frame-tick').slice(0, 5)).toEqual([
      '400',
      '300',
      '200',
      '100',
      '0',
    ]);
    // 313 of 400 → the data end sits 21.75 % below the top, inside the plot
    const tops = barTops(out).map((y) => Number.parseFloat(y));
    expect(tops.at(-1)).toBe(21.75);
    expect(Math.min(...tops)).toBeGreaterThanOrEqual(0);
  });

  test('bars are percentage rects in a no-viewBox svg, clipped at the baseline', () => {
    const out = html();
    expect(out).toContain(
      '<svg class="nz-bar-chart-svg"><svg y="0" height="100%"><rect class="nz-bar-chart-bar" data-series="current" width="100%" height="200%" y="54.25%" rx="4"></rect></svg></svg>',
    );
    expect(out).not.toContain('viewBox');
  });

  test('compact y labels keep one fraction digit, so 1.5K and 2K never both read "2K"', () => {
    const out = renderToStaticMarkup(
      <BarChart title="Sales" data={[{ d: 'A', v: 2300 }]} x={(d) => d.d} y={(d) => d.v} />,
    );
    expect(texts(out, 'nz-chart-frame-tick').slice(0, 6)).toEqual([
      '2.5K',
      '2K',
      '1.5K',
      '1K',
      '500',
      '0',
    ]);
    // a format with fixed fraction digits does not clash with the axis's compact default
    expect(() =>
      renderToStaticMarkup(
        <BarChart
          title="Sales"
          data={[{ d: 'A', v: 2300 }]}
          x={(d) => d.d}
          y={(d) => d.v}
          format={{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 }}
        />,
      ),
    ).not.toThrow();
  });

  test('gridlines at every tick, the zero tick as the baseline', () => {
    const out = html();
    expect(out.match(/class="nz-chart-grid"/g)).toHaveLength(4);
    expect(out).toContain('<line class="nz-chart-baseline" x1="0" x2="100%" y1="100%" y2="100%">');
  });

  test('x labels: ISO dates formatted, thinned, the last forced, centred on bands', () => {
    const out = html({ dateFormat: { day: 'numeric' } });
    expect(out).toContain('nz-chart-frame-x-ticks nz-chart-frame-x-ticks-band');
    const x = out.slice(out.indexOf('nz-chart-frame-x-ticks'));
    // 14 bars, at most 8 labels: every 2nd, and "29" dropped next to the forced "30" (Figma's crowding)
    expect(texts(x, 'nz-chart-frame-tick')).toEqual([
      '17',
      '',
      '19',
      '',
      '21',
      '',
      '23',
      '',
      '25',
      '',
      '27',
      '',
      '',
      '30',
    ]);
  });

  test('the data table and the CSS tooltips carry long dates and formatted values', () => {
    const out = html({ labels: { category: 'Day', value: 'Orders' }, interaction: 'none' });
    expect(out).toContain('<th scope="col">Day</th><th scope="col">Orders</th>');
    expect(out).toContain('<tr><th scope="row">Sat, Oct 17</th><td>183</td></tr>');
    expect(out).toContain('<span class="nz-bar-chart-tooltip-title">Fri, Oct 30</span>');
    expect(out).toContain('Orders<span class="nz-bar-chart-tooltip-value">313</span>');
  });

  test('interaction="none": the second half of the bands opens its tooltip toward the start', () => {
    const out = html({ interaction: 'none' });
    expect(out.match(/class="nz-bar-chart-band"/g)).toHaveLength(7);
    expect(out.match(/class="nz-bar-chart-band nz-bar-chart-band-end"/g)).toHaveLength(7);
    expect(out.match(/class="nz-bar-chart-tooltip"/g)).toHaveLength(14);
  });

  test('negative values hang from the zero baseline, rounded at their data end', () => {
    const out = renderToStaticMarkup(
      <BarChart
        title="Net"
        data={[
          { m: 'Jan', v: 300 },
          { m: 'Feb', v: -100 },
        ]}
        x={(d) => d.m}
        y={(d) => d.v}
      />,
    );
    // domain [-100, 300], ticks every 100: zero is 75 % down
    expect(texts(out, 'nz-chart-frame-tick').slice(0, 5)).toEqual([
      '300',
      '200',
      '100',
      '0',
      '-100',
    ]);
    expect(out).toContain('<line class="nz-chart-baseline" x1="0" x2="100%" y1="75%" y2="75%">');
    // the negative bar's clip is below the baseline; its rect ends at the data end (the clip's bottom)
    expect(out).toContain(
      '<svg y="75%" height="25%"><rect class="nz-bar-chart-bar" data-series="current" width="100%" height="200%" y="-100%" rx="4">',
    );
  });

  test('a value that is not finite draws no bar and reads as missing; zero draws none', () => {
    const out = renderToStaticMarkup(
      <BarChart
        title="Orders"
        data={[
          { d: 'A', v: 5 },
          { d: 'B', v: Number.NaN },
          { d: 'C', v: 0 },
        ]}
        x={(d) => d.d}
        y={(d) => d.v}
      />,
    );
    expect(barTops(out)).toHaveLength(1);
    expect(out).toContain(`<tr><th scope="row">B</th><td>${barChartLabels.missing}</td></tr>`);
    expect(out).toContain('<tr><th scope="row">C</th><td>0</td></tr>');
  });

  test('formats per locale, once, on the server', () => {
    const out = renderToStaticMarkup(
      <BarChart
        title="Umsatz"
        data={[{ d: '2026-10-14', v: 12345.6 }]}
        x={(d) => d.d}
        y={(d) => d.v}
        locale="de-DE"
        format={{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }}
      />,
    );
    // German grouping and a no-break space before the euro sign
    expect(out).toContain('<tr><th scope="row">Mi., 14. Okt.</th><td>12.346\u00a0€</td></tr>');
  });

  test('status passes through to the frame; ready with no data is empty', () => {
    expect(html({ status: 'loading' })).toContain('data-loading=""');
    expect(html({ status: 'loading' })).not.toContain('nz-bar-chart-bands');
    expect(html({ status: 'error' })).toContain('data-error=""');
    expect(html({ data: [] })).toContain('data-empty=""');
    expect(html({ pending: true })).toContain('aria-busy="true"');
  });

  test('mirrors only on request', () => {
    expect(html()).toContain('data-x-direction="ltr"');
    expect(html({ xDirection: 'rtl' })).toContain('data-x-direction="rtl"');
    expect(html({ xDirection: 'auto' })).toContain('data-x-direction="auto"');
  });
});

describe('BarChart and the ChartInteraction island (column mode)', () => {
  test('by default: one named tab stop over the plot, described by the hint, and no CSS tooltip', () => {
    const out = html();
    expect(out.match(/tabindex="0"/g)).toHaveLength(1);
    const layer =
      /<div ([^>]*)class="nz-chart-interaction nz-chart-interaction-columns"[^>]*>/.exec(out)?.[0];
    if (layer === undefined) throw new Error('no island layer');
    expect(layer).toContain('role="application"');
    expect(layer).toContain('aria-label="Orders"');
    expect(layer).toContain(`aria-roledescription="${barChartLabels.interaction}"`);
    const hint = /aria-describedby="([^"]+)"/.exec(layer)?.[1];
    expect(out).toContain(
      `<span id="${String(hint)}" class="nz-chart-visually-hidden">${barChartLabels.hint}</span>`,
    );
    // one polite region, empty in the server HTML (§16.5)
    expect(out.match(/aria-live="polite"/g)).toHaveLength(1);
    expect(out).toContain('aria-live="polite" aria-atomic="true"></span>');
    // the island draws the card: no per-band tooltip, no band-end class, nothing highlighted yet
    expect(out).not.toContain('nz-bar-chart-tooltip');
    expect(out).not.toContain('nz-bar-chart-band-end');
    expect(out).not.toContain('data-highlighted');
    expect(out).not.toContain('style=');
    // the layer follows the bands, so it paints over them
    expect(out.indexOf('nz-chart-interaction')).toBeGreaterThan(out.lastIndexOf('bar-chart-band'));
  });

  test("the layer's name falls back to labels.points when the title is not a string", () => {
    const out = html({ title: <span>Orders</span>, labels: { points: 'Bestellungen' } });
    expect(out).toContain('aria-label="Bestellungen"');
  });

  test('interaction="none": no tab stop, no live region, no island', () => {
    const out = html({ interaction: 'none' });
    expect(out).not.toContain('tabindex');
    expect(out).not.toContain('aria-live');
    expect(out).not.toContain('nz-chart-interaction');
  });

  test.each(['loading', 'empty', 'error'] as const)('%s: no island', (status) => {
    const out = html({ status, ...(status === 'empty' ? { data: [] } : {}) });
    expect(out).not.toContain('nz-chart-interaction');
    expect(out).not.toContain('tabindex');
  });
});

describe("BarChart props: the charts' one API shape (M40 item 9)", () => {
  interface Row {
    day: string;
    orders: number | null;
  }
  const NONE: Row[] = [];
  const ROWS: Row[] = [
    { day: 'Mon', orders: 12.5 },
    { day: 'Tue', orders: null },
    { day: 'Wed', orders: 30 },
  ];

  test('x and y take a key of the datum or a (datum, index) function, alike', () => {
    const byKey = renderToStaticMarkup(<BarChart title="Orders" data={ROWS} x="day" y="orders" />);
    const byFunction = renderToStaticMarkup(
      <BarChart
        title="Orders"
        data={ROWS}
        x={(d, i) => `${d.day}${i < 0 ? '?' : ''}`}
        y={(d) => d.orders}
      />,
    );
    expect(byKey).toBe(byFunction);
    // the index is the datum's position
    const indexed = renderToStaticMarkup(
      <BarChart title="Orders" data={ROWS} x={(_, i) => `#${String(i + 1)}`} y="orders" />,
    );
    expect(indexed).toContain('<tr><th scope="row">#2</th><td>No value</td></tr>');
  });

  test("a null value is a band with no bar; format defaults to Intl's own (fractions show)", () => {
    const out = renderToStaticMarkup(<BarChart title="Orders" data={ROWS} x="day" y="orders" />);
    expect(barTops(out)).toHaveLength(2);
    expect(out.match(/data-slot="bar-chart-band"/g)).toHaveLength(3);
    expect(out).toContain('<tr><th scope="row">Mon</th><td>12.5</td></tr>');
    expect(out).toContain('<tr><th scope="row">Tue</th><td>No value</td></tr>');
  });

  test('xTicks: { every, max } and yTicks', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ d: `L${String(i)}`, v: i }));
    const ticksOf = (props: Partial<BarChartProps<(typeof many)[number]>>): string[] => {
      const out = renderToStaticMarkup(<BarChart title="T" data={many} x="d" y="v" {...props} />);
      return texts(out.slice(out.indexOf('nz-chart-frame-x-ticks')), 'nz-chart-frame-tick');
    };
    expect(ticksOf({ xTicks: { every: 3 } }).filter(Boolean)).toEqual(['L0', 'L3', 'L6', 'L9']);
    expect(ticksOf({ xTicks: { max: 2 } }).filter(Boolean)).toEqual(['L0', 'L9']);
    const y = (count: number): string[] => {
      const out = renderToStaticMarkup(
        <BarChart title="T" data={many} x="d" y="v" yTicks={count} />,
      );
      return texts(out.slice(out.indexOf('nz-chart-frame-y-ticks')), 'nz-chart-frame-tick');
    };
    expect(y(2).length).toBeLessThan(y(8).length);
  });

  test("labels: ChartFrame's strings and BarChart's in one Partial<BarChartLabels>", () => {
    const out = renderToStaticMarkup(
      <BarChart
        title="Orders"
        data={NONE}
        x="day"
        y="orders"
        labels={{ empty: 'Keine Daten', category: 'Tag' }}
      />,
    );
    expect(out).toContain('Keine Daten');
    expect(barChartLabels.empty).toBe('No data to show');
  });
});
