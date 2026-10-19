// The charts-only fixture's pages (ARCHITECTURE.md §4.1 L6, §14.1): markup only, rendered on the
// server by the BUILT package (dist/, the files `pnpm pack` ships) with react-dom/server, as a
// Server Component would emit it. fixtures/runner/charts.ts spawns this script, serves each page
// with tokens.css and @nizivo/charts/styles.css from the packed tarballs and nothing of
// @nizivo/react, and runs axe, focus-visible, visually-hidden and CSP Profile B checks on it.
//
//   node packages/charts/test/charts-only/pages.ts   prints { "<path>": "<body markup>", … } as JSON
//
// Plain `createElement` calls: Node runs this file with type stripping, which has no JSX. Every
// framed part (AreaChart, BarChart, DonutChart) is on `/parts`, imported through its own dist entry;
// a new framed part adds one section there with its sample props.
import { Fragment, createElement as h, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const charts: typeof import('../../src/index') = await import(
  new URL('../../dist/index.js', import.meta.url).href
);
const { ChartFrame, Legend } = charts;
const dist = (part: string): string => new URL(`../../dist/${part}/index.js`, import.meta.url).href;
const { AreaChart }: typeof import('../../src/area-chart/index') = await import(dist('area-chart'));
const { BarChart }: typeof import('../../src/bar-chart/index') = await import(dist('bar-chart'));
const { DonutChart }: typeof import('../../src/donut-chart/index') = await import(
  dist('donut-chart')
);
const { Sparkline }: typeof import('../../src/sparkline/index') = await import(dist('sparkline'));
const { ChartTooltip }: typeof import('../../src/chart-tooltip/index') = await import(
  dist('chart-tooltip')
);

const DAYS = [2140, 3020, 2760, 4310, 3880, 5240, 6280].map((sales, i) => ({
  date: `2026-10-0${String(i + 1)}`,
  sales,
  previous: Math.round(sales * 0.8 + 300),
}));
const CHANNELS = [
  { name: 'Online store', sales: 64120 },
  { name: 'Point of sale', sales: 34526 },
  { name: 'Wholesale', sales: 17263 },
  { name: 'Marketplace', sales: 5210 },
  { name: 'Pop-up', sales: 2188 },
];
const USD: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
};

const TABLE = {
  columns: ['Day', 'This period', 'Previous'],
  rows: [
    ['Oct 1', '$2,140', '$1,980'],
    ['Oct 2', '$3,020', '$2,210'],
    ['Oct 3', '$2,760', '$2,450'],
    ['Oct 4', '$4,310', '$2,900'],
    ['Oct 5', '$3,880', '$3,120'],
    ['Oct 6', '$5,240', '$3,060'],
    ['Oct 7', '$6,280', '$3,410'],
  ],
};
const TICKS = {
  x: ['Oct 1', '', '', 'Oct 4', '', '', 'Oct 7'],
  y: ['$8k', '$6k', '$4k', '$2k', '$0'],
};

const legend = (): ReactNode =>
  h(Legend, {
    items: [
      { label: 'This period', series: 'current' },
      { label: 'Previous', series: 'previous' },
    ],
  });

/** A renderer-shaped plot, as AreaChart draws it: percent space and the shared mark classes. */
const plot = (): ReactNode =>
  h(
    'svg',
    {
      className: 'nz-chart-svg',
      viewBox: '0 0 100 100',
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
    },
    ...[0, 25, 50, 75].map((y) =>
      h('line', { key: y, className: 'nz-chart-grid', x1: 0, x2: 100, y1: y, y2: y }),
    ),
    h('line', { key: 'base', className: 'nz-chart-baseline', x1: 0, x2: 100, y1: 100, y2: 100 }),
    h('path', {
      key: 'area',
      className: 'nz-chart-area',
      'data-series': 'current',
      d: 'M0,73.25L16.667,62.25L33.333,65.5L50,46.125L66.667,51.5L83.333,34.5L100,21.5V100H0Z',
    }),
    h('path', {
      key: 'previous',
      className: 'nz-chart-line',
      'data-series': 'previous',
      d: 'M0,75.25L16.667,72.375L33.333,69.375L50,63.75L66.667,61L83.333,61.75L100,57.375',
    }),
    h('path', {
      key: 'current',
      className: 'nz-chart-line',
      'data-series': 'current',
      d: 'M0,73.25L16.667,62.25L33.333,65.5L50,46.125L66.667,51.5L83.333,34.5L100,21.5',
    }),
  );

/** What a third-party renderer emits inside the frame (Recharts' shape; not a dependency). */
const thirdParty = (): ReactNode =>
  h(
    'svg',
    {
      className: 'recharts-surface',
      viewBox: '0 0 720 280',
      width: '100%',
      height: '100%',
      'aria-hidden': 'true',
    },
    h('path', { d: 'M0,180L360,120L720,60L720,280L0,280Z', fill: 'currentColor', opacity: 0.1 }),
    h('path', { d: 'M0,180L360,120L720,60', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }),
  );

const frame = (props: Record<string, unknown>, child: ReactNode = plot()): ReactNode =>
  h(
    ChartFrame,
    {
      title: 'Sales',
      summary: 'Daily sales, Oct 1–7, vs previous period',
      table: TABLE,
      ticks: TICKS,
      legend: legend(),
      ...props,
    } as Parameters<typeof ChartFrame>[0],
    child,
  );

const section = (heading: string, ...children: ReactNode[]): ReactNode =>
  h('section', { className: 'page-section' }, h('h2', null, heading), ...children);

export const PAGES: Record<string, { title: string; body: ReactNode }> = {
  // The table is visually hidden (the default) in one frame and a native disclosure in the other,
  // whose <summary> is the page's one tab stop: the focus-visible check runs on it.
  '/frame': {
    title: 'ChartFrame',
    body: h(
      Fragment,
      null,
      section('Hidden data table', frame({ id: 'hidden-table' })),
      section(
        'Data table on demand',
        frame({ id: 'details-table', title: 'Orders', tableView: 'details' }),
      ),
    ),
  },
  '/statuses': {
    title: 'Statuses',
    body: h(
      Fragment,
      null,
      section('Loading', frame({ id: 'loading', status: 'loading' })),
      section('Empty', frame({ id: 'empty', status: 'empty' })),
      section('Error', frame({ id: 'error', status: 'error' })),
      section('Refreshing', frame({ id: 'pending', pending: true })),
    ),
  },
  '/third-party': {
    title: 'Third-party renderer',
    body: section(
      'A third-party SVG inside ChartFrame',
      frame({ id: 'third-party', interaction: 'none', axes: 'none' }, thirdParty()),
    ),
  },
  // The shipped renderers, as a Server Component renders them: AreaChart's island markup (its
  // focusable layer) is in the HTML, so Tab reaches it with no JavaScript on the page at all.
  '/parts': {
    title: 'Chart parts',
    body: h(
      Fragment,
      null,
      section(
        'AreaChart',
        h(AreaChart<(typeof DAYS)[number]>, {
          id: 'area',
          title: 'Sales',
          summary: 'Daily sales, Oct 1–7, vs previous period',
          data: DAYS,
          x: 'date',
          y: 'sales',
          compare: 'previous',
          format: USD,
        }),
      ),
      section(
        'BarChart',
        h(BarChart<(typeof DAYS)[number]>, {
          id: 'bar',
          title: 'Orders',
          data: DAYS,
          x: (d) => d.date,
          y: (d) => Math.round(d.sales / 20),
        }),
      ),
      section(
        'DonutChart',
        h(DonutChart<(typeof CHANNELS)[number]>, {
          id: 'donut',
          title: 'Sales by channel',
          data: CHANNELS,
          category: (d) => d.name,
          value: (d) => d.sales,
          format: USD,
        }),
      ),
      section(
        'Sparkline',
        h(Sparkline, {
          id: 'sparkline',
          label: 'Sales, last 7 days, up',
          data: DAYS.map((d) => d.sales),
        }),
      ),
      // Every series' swatch, for the forced-colours check (the island draws this card on hover)
      section(
        'ChartTooltip',
        h(ChartTooltip, {
          id: 'tooltip',
          title: 'Wed, Oct 7',
          rows: (['current', 'previous', 'cat-1', 'cat-2', 'cat-3', 'other'] as const).map(
            (series, i) => ({ label: series, value: `$${String(1000 * (i + 1))}`, series }),
          ),
          delta: { value: '+12.0%', label: 'vs previous', trend: 'up' },
        }),
      ),
    ),
  },
  // Chart chrome follows dir; the plot and x ticks stay left to right unless asked (xDirection).
  '/rtl': {
    title: 'Right to left',
    body: h(
      'div',
      { dir: 'rtl', lang: 'ar' },
      section('xDirection ltr (default)', frame({ id: 'rtl-default', title: 'المبيعات' })),
      section(
        'xDirection rtl',
        frame({ id: 'rtl-mirrored', title: 'المبيعات', xDirection: 'rtl' }),
      ),
    ),
  },
};

/** One page's body markup (the runner wraps it in the document with the stylesheets). */
export function render(path: string): string {
  const page = PAGES[path];
  if (page === undefined) throw new Error(`no charts-only page ${path}`);
  return renderToStaticMarkup(h('main', null, h('h1', null, page.title), page.body));
}

if (import.meta.main) {
  const out: Record<string, { title: string; body: string }> = {};
  for (const [path, page] of Object.entries(PAGES))
    out[path] = { title: page.title, body: render(path) };
  process.stdout.write(`${JSON.stringify(out)}\n`);
}
