// AreaChart's server markup (ARCHITECTURE.md §10.8, §14.1, §16.4, §16.5; Figma 03 "Area Chart"):
// the percent-space SVG with non-scaling marks, a niced domain whose ends are the outer ticks,
// weekly date ticks with the last one forced, the comparison drawn dashed, a pre-formatted data
// table from the same points, the island's initial markup, status passthrough, no inline style.
import { curveLinear } from 'd3-shape';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { AreaChart, areaChartLabels, type AreaChartProps } from '../../src/area-chart/index';
import { all, byClass, bySlot, parse, textOf, type Node } from '../conformance/markup';

interface Day {
  date: string;
  current: number | null;
  previous: number | null;
}

// Thirty days, Oct 1–30, as Figma 03 draws them; the top value (7,600) is below the niced top, 8,000
const DAYS: Day[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  current: i === 29 ? 7600 : 2000 + i * 120,
  previous: 2600 + i * 40,
}));

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

function html(props: Partial<AreaChartProps<Day>> = {}): string {
  return renderToStaticMarkup(
    <AreaChart title="Sales" data={DAYS} x="date" y="current" format={USD} {...props} />,
  );
}

function tree(props: Partial<AreaChartProps<Day>> = {}): Node {
  const [figure] = parse(html(props)).children;
  if (figure === undefined) throw new Error('nothing rendered');
  return figure;
}

const ticks = (figure: Node, slot: string): string[] =>
  all(figure, bySlot(slot))
    .flatMap((axis) => all(axis, byClass('nz-chart-frame-tick')))
    .map((tick) => textOf(tick))
    .filter(Boolean);

const paths = (figure: Node, className: string): Node[] =>
  all(figure, (n) => n.tag === 'path' && n.attrs.get('class') === className);

describe('AreaChart: the SVG', () => {
  test('a ChartFrame around one percent-space SVG, hidden from assistive technology', () => {
    const figure = tree();
    expect(figure.tag).toBe('figure');
    expect(figure.attrs.get('class')).toBe('nz-chart-frame nz-area-chart');
    const svgs = all(figure, (n) => n.tag === 'svg');
    expect(svgs).toHaveLength(1);
    const [svg] = svgs;
    expect(svg?.attrs.get('class')).toBe('nz-chart-svg');
    expect(svg?.attrs.get('viewBox')).toBe('0 0 100 100');
    expect(svg?.attrs.get('preserveAspectRatio')).toBe('none');
    expect(svg?.attrs.get('aria-hidden')).toBe('true');
  });

  test('marks in Figma order: grid, baseline, the wash, the line, the end dot over its halo', () => {
    const [svg] = all(tree(), (n) => n.tag === 'svg');
    const order = (svg?.children ?? []).map(
      (n) =>
        `${n.attrs.get('class') ?? ''}${n.attrs.has('data-series') ? `:${n.attrs.get('data-series') ?? ''}` : ''}`,
    );
    expect(order).toEqual([
      'nz-chart-grid',
      'nz-chart-grid',
      'nz-chart-grid',
      'nz-chart-grid',
      'nz-chart-baseline',
      'nz-chart-area:current',
      'nz-chart-line:current',
      'nz-area-chart-halo',
      'nz-area-chart-dot:current',
    ]);
  });

  test('the comparison is a dashed chart/neutral line under the current one, with a legend', () => {
    const figure = tree({ compare: 'previous' });
    const lines = paths(figure, 'nz-chart-line').map((n) => n.attrs.get('data-series'));
    expect(lines).toEqual(['previous', 'current']);
    const legend = all(figure, bySlot('legend-item')).map((n) => textOf(n));
    expect(legend).toEqual(['This period', 'Previous']);
  });

  test('the wash closes to the baseline; the line ends at the last point, where the dot sits', () => {
    const figure = tree();
    const area = paths(figure, 'nz-chart-area')[0]?.attrs.get('d') ?? '';
    const line = paths(figure, 'nz-chart-line')[0]?.attrs.get('d') ?? '';
    expect(area.startsWith(line)).toBe(true);
    expect(area.endsWith('L100,100L0,100Z')).toBe(true);
    // 7,600 on a 0–8,000 domain: 5% from the top
    expect(line.endsWith('100,5')).toBe(true);
    expect(paths(figure, 'nz-area-chart-dot')[0]?.attrs.get('d')).toBe('M100,5h0');
    expect(paths(figure, 'nz-area-chart-halo')[0]?.attrs.get('d')).toBe('M100,5h0');
  });

  test('a gap in the series breaks the line; the dot goes to the last value there is', () => {
    const gapped = DAYS.map((d, i) => ({
      date: d.date,
      current: i === 10 || i === 29 ? null : d.current,
      previous: d.previous,
    }));
    const figure = tree({ data: gapped });
    const line = paths(figure, 'nz-chart-line')[0]?.attrs.get('d') ?? '';
    expect(line.match(/M/g)).toHaveLength(2);
    expect(paths(figure, 'nz-area-chart-dot')[0]?.attrs.get('d')).toMatch(/^M96\.55,/);
  });

  test('curve takes any d3-shape curve factory', () => {
    const line = paths(tree({ curve: curveLinear }), 'nz-chart-line')[0]?.attrs.get('d') ?? '';
    expect(line).not.toContain('C');
    expect(line).toMatch(/^M0,75L3\.45,73\.5L/);
  });

  test('negative values: the domain takes them in and the wash closes at zero', () => {
    const figure = tree({
      data: [
        { date: '2026-10-01', current: -300, previous: 0 },
        { date: '2026-10-02', current: 900, previous: 0 },
      ],
    });
    // niced to -500…1,000: zero is a third of the way up
    expect(ticks(figure, 'chart-frame-y-ticks')).toEqual(['$1K', '$500', '$0', '-$500']);
    const baseline = all(figure, byClass('nz-chart-baseline'))[0];
    expect(baseline?.attrs.get('y1')).toBe('66.67');
    expect(paths(figure, 'nz-chart-area')[0]?.attrs.get('d')).toMatch(/L100,66\.67L0,66\.67Z$/);
  });
});

describe('AreaChart: ticks and formatting (§16.4)', () => {
  test('the domain is niced before ticks: the top label is above the top value', () => {
    expect(ticks(tree(), 'chart-frame-y-ticks')).toEqual(['$8K', '$6K', '$4K', '$2K', '$0']);
  });

  test('daily dates tick weekly with the last forced (Figma 03: Oct 1, 8, 15, 22, 30)', () => {
    expect(ticks(tree(), 'chart-frame-x-ticks')).toEqual([
      'Oct 1',
      'Oct 8',
      'Oct 15',
      'Oct 22',
      'Oct 30',
    ]);
  });

  test('xTicks.every sets the step, xTicks.max caps the count; labels that are not dates are used as they are', () => {
    expect(ticks(tree({ xTicks: { every: 10 } }), 'chart-frame-x-ticks')).toEqual([
      'Oct 1',
      'Oct 11',
      'Oct 21',
      'Oct 30',
    ]);
    // at most four: every 10 points, a daily series rounded up to whole weeks (14)
    expect(ticks(tree({ xTicks: { max: 4 } }), 'chart-frame-x-ticks')).toEqual([
      'Oct 1',
      'Oct 15',
      'Oct 30',
    ]);
    const weeks = ['W1', 'W2', 'W3', 'W4'].map((date, i) => ({ date, current: i, previous: 0 }));
    expect(ticks(tree({ data: weeks }), 'chart-frame-x-ticks')).toEqual(['W1', 'W2', 'W3', 'W4']);
  });

  test('locale formats every number and date, on the server', () => {
    const figure = tree({ locale: 'de-DE', format: { style: 'currency', currency: 'EUR' } });
    const [first] = all(figure, (n) => n.tag === 'tr' && n.parent?.tag === 'tbody');
    expect(first?.children.map((c) => textOf(c))).toEqual([
      new Intl.DateTimeFormat('de-DE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(Date.UTC(2026, 9, 1)),
      new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(2000),
    ]);
    expect(ticks(figure, 'chart-frame-x-ticks')[0]).toBe('1. Okt.');
  });

  test('yTicks sets about how many y labels, and the domain is niced for that count', () => {
    expect(ticks(tree({ yTicks: 2 }), 'chart-frame-y-ticks')).toEqual(['$10K', '$5K', '$0']);
  });

  test('format, axisFormat and dateFormat are Intl options (no presets)', () => {
    const figure = tree({
      format: { notation: 'compact' },
      axisFormat: { maximumFractionDigits: 0 },
      dateFormat: { day: 'numeric' },
    });
    expect(ticks(figure, 'chart-frame-y-ticks')).toEqual(['8,000', '6,000', '4,000', '2,000', '0']);
    expect(ticks(figure, 'chart-frame-x-ticks')).toEqual(['1', '8', '15', '22', '30']);
    expect(textOf(all(figure, (n) => n.tag === 'td')[0] ?? figure)).toBe('2K');
    const percent = tree({
      data: [
        { date: '2026-10-01', current: 0.25, previous: 0 },
        { date: '2026-10-02', current: 0.5, previous: 0 },
      ],
      format: { style: 'percent' },
    });
    expect(ticks(percent, 'chart-frame-y-ticks')).toEqual([
      '50%',
      '40%',
      '30%',
      '20%',
      '10%',
      '0%',
    ]);
  });
});

describe('AreaChart: the data table, from the same points', () => {
  test('one row per point, the long date heading it, values pre-formatted', () => {
    const figure = tree({ compare: 'previous' });
    const [table] = all(figure, bySlot('chart-frame-table'));
    expect(
      all(table ?? figure, (n) => n.tag === 'th' && n.attrs.get('scope') === 'col').map(textOf),
    ).toEqual(['Date', 'This period', 'Previous']);
    const rows = all(table ?? figure, (n) => n.tag === 'tr' && n.parent?.tag === 'tbody');
    expect(rows).toHaveLength(30);
    expect(rows[0]?.children.map((c) => textOf(c))).toEqual(['Thu, Oct 1', '$2,000', '$2,600']);
    expect(rows[29]?.children.map((c) => textOf(c))).toEqual(['Fri, Oct 30', '$7,600', '$3,760']);
  });

  test('labels, not dates, head the first column with labels.category ("Date" only for dates)', () => {
    const regions = ['North', 'South'].map((date, i) => ({ date, current: i, previous: 0 }));
    const [table] = all(tree({ data: regions }), bySlot('chart-frame-table'));
    const headers = (node: Node | undefined): string[] =>
      all(node ?? tree(), (n) => n.tag === 'th' && n.attrs.get('scope') === 'col').map(textOf);
    expect(headers(table)).toEqual(['Category', 'This period']);
    const [named] = all(
      tree({ data: regions, labels: { category: 'Region' } }),
      bySlot('chart-frame-table'),
    );
    expect(headers(named)).toEqual(['Region', 'This period']);
    expect(areaChartLabels.missing).toBe('No value');
  });

  test('a missing value reads labels.missing; accessor functions (datum, index) work as keys do', () => {
    const figure = tree({
      data: [
        { date: '2026-10-01', current: 1, previous: null },
        { date: '2026-10-02', current: 2, previous: 3 },
      ],
      y: (d) => (d.current ?? 0) * 10,
      compare: 'previous',
      format: {},
    });
    const rows = all(figure, (n) => n.tag === 'tr' && n.parent?.tag === 'tbody');
    expect(rows.map((r) => r.children.map((c) => textOf(c)))).toEqual([
      ['Thu, Oct 1', '10', areaChartLabels.missing],
      ['Fri, Oct 2', '20', '3'],
    ]);
  });
});

describe('AreaChart: the ChartInteraction island, as the server renders it', () => {
  test('one named tab stop over the plot, described by its keyboard hint, and an empty polite region', () => {
    const figure = tree({ compare: 'previous' });
    const [plot] = all(figure, bySlot('chart-frame-plot'));
    const stops = all(plot ?? figure, (n) => n.attrs.has('tabindex'));
    expect(stops).toHaveLength(1);
    const [layer] = stops;
    expect(layer?.attrs.get('class')).toBe('nz-chart-interaction');
    expect(layer?.attrs.get('tabindex')).toBe('0');
    expect(layer?.attrs.get('role')).toBe('application');
    expect(layer?.attrs.get('aria-label')).toBe('Sales');
    expect(layer?.attrs.get('aria-roledescription')).toBe('interactive chart');
    const hint = all(figure, (n) => n.attrs.get('id') === layer?.attrs.get('aria-describedby'));
    expect(hint.map((n) => textOf(n))).toEqual([areaChartLabels.hint]);
    const live = all(figure, (n) => n.attrs.has('aria-live'));
    expect(live).toHaveLength(1);
    expect(live[0]?.attrs.get('aria-live')).toBe('polite');
    expect(live[0]?.attrs.get('aria-atomic')).toBe('true');
    expect(textOf(live[0] ?? figure)).toBe('');
    // the crosshair, the dots and the card exist only once a point is active
    expect(all(figure, byClass('nz-chart-interaction-point'))).toEqual([]);
  });

  test('a title that is not a string names the layer with labels.points', () => {
    const figure = tree({ title: <b>Sales</b>, labels: { points: 'Umsatzpunkte' } });
    expect(all(figure, byClass('nz-chart-interaction'))[0]?.attrs.get('aria-label')).toBe(
      'Umsatzpunkte',
    );
  });

  test('interaction="none": no island, no tab stop, no live region, no hint', () => {
    const out = html({ interaction: 'none' });
    expect(out).not.toContain('tabindex');
    expect(out).not.toContain('aria-live');
    expect(out).not.toContain(areaChartLabels.hint);
  });
});

describe('AreaChart: ChartFrame passthrough', () => {
  test.each(['loading', 'error'] as const)('status="%s": no SVG, no island, no table', (status) => {
    const out = html({ status, compare: 'previous' });
    expect(out).toContain(`data-${status}=""`);
    expect(out).not.toContain('<svg');
    expect(out).not.toContain('tabindex');
    expect(out).not.toContain('<table');
    // the legend keeps the box in every status (§16.5)
    expect(out).toContain('data-slot="legend"');
  });

  test('no data is the empty status, with labels forwarded to the frame', () => {
    const out = html({ data: [], labels: { empty: 'Keine Daten' } });
    expect(out).toContain('data-empty=""');
    expect(out).toContain('Keine Daten');
  });

  test('xDirection, pending, tableView, className and attributes reach the figure', () => {
    const figure = tree({
      xDirection: 'rtl',
      pending: true,
      tableView: 'details',
      className: 'mine',
      id: 'sales',
    });
    expect(figure.attrs.get('data-x-direction')).toBe('rtl');
    expect(figure.attrs.get('data-pending')).toBe('');
    expect(figure.attrs.get('aria-busy')).toBe('true');
    expect(figure.attrs.get('class')).toBe('nz-chart-frame nz-area-chart mine');
    expect(figure.attrs.get('id')).toBe('sales');
    expect(all(figure, bySlot('chart-frame-details'))).toHaveLength(1);
  });

  test('legend: false hides it, a node replaces it, true shows it for one series', () => {
    expect(html({ compare: 'previous', legend: false })).not.toContain('data-slot="legend"');
    expect(html({ legend: <p className="nz-mine">key</p> })).toContain(
      '<p class="nz-mine">key</p>',
    );
    const single = tree({ legend: true });
    expect(all(single, bySlot('legend-item')).map((n) => textOf(n))).toEqual(['This period']);
  });

  test('no inline style anywhere, in any status (CSP Profile B)', () => {
    for (const status of ['ready', 'loading', 'empty', 'error'] as const) {
      expect(html({ status, compare: 'previous' })).not.toContain('style=');
    }
  });
});

describe('AreaChart: titleVisibility (M42, one prop in every chart)', () => {
  test('"hidden" reaches the frame: the caption visually hidden, in the HTML, naming the figure', () => {
    const out = html({ summary: 'Daily sales', titleVisibility: 'hidden' });
    expect(out).toMatch(
      /<figcaption class="nz-chart-frame-caption nz-chart-visually-hidden" data-slot="chart-frame-caption"><span class="nz-chart-frame-title" id="([^"]+)">Sales<\/span><span class="nz-chart-frame-summary">Daily sales<\/span><\/figcaption>/,
    );
    const id = /class="nz-chart-frame-title" id="([^"]+)"/.exec(out)?.[1];
    expect(out).toContain(`data-slot="chart-frame-table" aria-labelledby="${id ?? ''}"`);
    expect(html()).toContain('<figcaption class="nz-chart-frame-caption" data-slot');
  });
});
