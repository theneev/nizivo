// Server-first (ARCHITECTURE.md §10.8, §14.1): AreaChart, Sparkline and ChartTooltip load and render
// with React's react-server build, as in a Server Component (this file runs in the `react-server`
// project, vitest.config.ts). AreaChart's one client module, the ChartInteraction island, is
// replaced here by what an RSC bundler puts in its place, a client reference: the server never runs
// it, it only serialises its props. So those props must be plain JSON: no functions, no Dates, no
// class instances, no undefined, no React elements (they would not survive the RSC payload).
import * as React from 'react';
import { isValidElement, type ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';

const CLIENT_REFERENCE = Symbol.for('react.client.reference');

vi.mock('../../src/_island/chart-interaction.client', () => ({
  ChartInteraction: Object.assign(() => null, {
    $$typeof: Symbol.for('react.client.reference'),
    $$id: 'chart-interaction.client#ChartInteraction',
  }),
}));

const { AreaChart } = await import('../../src/area-chart/index');
const { Sparkline } = await import('../../src/sparkline/index');
const { ChartTooltip } = await import('../../src/chart-tooltip/index');

interface ClientNode {
  client: string;
  props: Record<string, unknown>;
}

const isClientReference = (type: unknown): boolean =>
  typeof type === 'function' && Reflect.get(type, '$$typeof') === CLIENT_REFERENCE;

/**
 * Calls server components until only host elements and client references remain, as RSC does: a
 * client reference is not called, its props are what crosses to the browser.
 */
function serverRender(node: ReactNode): unknown {
  if (Array.isArray(node)) return node.map((child: ReactNode) => serverRender(child));
  if (!isValidElement<Record<string, unknown> & { children?: ReactNode }>(node)) return node;
  const { type, props } = node;
  if (typeof type === 'function' && isClientReference(type)) {
    return { client: String(Reflect.get(type, '$$id')), props } satisfies ClientNode;
  }
  if (typeof type === 'function') return serverRender(Reflect.apply(type, undefined, [props]));
  return { type, props: { ...props, children: serverRender(props.children) } };
}

/** A minimal hook dispatcher serving only `useId`, the one hook a server part may call. */
function withUseId<T>(render: () => T): T {
  const react: Record<string, unknown> = { ...React };
  expect(react).not.toHaveProperty('useState');
  const internals = react['__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE'];
  if (typeof internals !== 'object' || internals === null)
    throw new Error('not the react-server build');
  let id = 0;
  Reflect.set(internals, 'H', { useId: () => `_S_${(id += 1).toString(32)}_` });
  try {
    return render();
  } finally {
    Reflect.set(internals, 'H', null);
  }
}

const isClientNode = (value: object): value is ClientNode =>
  typeof Reflect.get(value, 'client') === 'string';

/** Every client reference in a rendered tree. */
function clients(tree: unknown): ClientNode[] {
  if (Array.isArray(tree)) return tree.flatMap((child) => clients(child));
  if (typeof tree !== 'object' || tree === null) return [];
  if (isClientNode(tree)) return [tree];
  const props: unknown = Reflect.get(tree, 'props');
  return typeof props === 'object' && props !== null ? clients(Reflect.get(props, 'children')) : [];
}

/** Whether `value` is exactly what JSON carries (so JSON.parse(JSON.stringify(v)) equals it). */
function isPlainJson(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => isPlainJson(item));
  if (typeof value !== 'object') return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Object.values(value).every((item) => isPlainJson(item));
}

const DAYS = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-10-${String(14 + i)}`,
  current: 4000 + i * 300,
  previous: i === 3 ? null : 3800 + i * 100,
}));

/** The island's props for DAYS at one xDirection. */
const islandProps = (xDirection: 'ltr' | 'rtl' | 'auto'): unknown =>
  clients(
    withUseId(() =>
      serverRender(
        <AreaChart title="Sales" data={DAYS} x="date" y="current" xDirection={xDirection} />,
      ),
    ),
  )[0]?.props;

describe('AreaChart under react-server', () => {
  test('renders to host elements and one client reference, the island, in the ready status', () => {
    const tree = withUseId(() =>
      serverRender(<AreaChart title="Sales" data={DAYS} x="date" y="current" compare="previous" />),
    );
    expect(JSON.stringify(tree)).toContain('"type":"svg"');
    const islands = clients(tree);
    expect(islands.map((c) => c.client)).toEqual(['chart-interaction.client#ChartInteraction']);
  });

  test("the island's props are plain JSON, every string pre-formatted on the server", () => {
    const [island] = clients(
      withUseId(() =>
        serverRender(
          <AreaChart
            title="Sales"
            data={DAYS}
            x="date"
            y="current"
            compare="previous"
            format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
          />,
        ),
      ),
    );
    const props = island?.props ?? {};
    expect(isPlainJson(props)).toBe(true);
    expect(JSON.parse(JSON.stringify(props))).toEqual(props);
    expect(props['aria-label']).toBe('Sales');
    // M40 item 10: the series once, the change's label once, the list separators once
    expect(props['series']).toEqual([
      { label: 'This period', series: 'current' },
      { label: 'Previous', series: 'previous' },
    ]);
    expect(props['delta']).toBe('vs previous');
    expect(props['separators']).toEqual([', ', ', ']);
    // nothing about direction: the island reads the plot's resolved direction after hydration
    expect(props).not.toHaveProperty('mirror');
    expect(props).not.toHaveProperty('columns');
    const points: unknown = props['points'];
    if (!Array.isArray(points)) throw new Error('no points');
    expect(points).toHaveLength(7);
    // [title, values, y per series, change, trend]: no x (points are evenly spaced), no announce
    // (the island joins the card's strings), y at the paths' two decimals
    expect(points[0]).toEqual([
      'Wed, Oct 14',
      ['$4,000', '$3,800'],
      [expect.any(Number), expect.any(Number)],
      '+5.3%',
      'up',
    ]);
    const ys = points
      .flatMap((p: [string, string[], Array<number | null>]) => p[2])
      .filter((y) => y !== null);
    expect(ys.map((y) => Number(y.toFixed(2)))).toEqual(ys);
    // no comparison value: no dot for it, no change, and the table's missing label
    expect(points[3]).toEqual(['Sat, Oct 17', ['$4,900', 'No value'], [expect.any(Number), null]]);
  });

  test('a flat change carries no trend (the island reads it as flat)', () => {
    const flat = [
      { date: '2026-10-01', current: 10, previous: 10 },
      { date: '2026-10-02', current: 12, previous: 6 },
    ];
    const [island] = clients(
      withUseId(() =>
        serverRender(
          <AreaChart title="Sales" data={flat} x="date" y="current" compare="previous" />,
        ),
      ),
    );
    const points: unknown = island?.props['points'];
    if (!Array.isArray(points)) throw new Error('no points');
    expect(points[0]).toHaveLength(4);
    expect(points[0][3]).toBe('0.0%');
    expect(points[1].slice(3)).toEqual(['+100.0%', 'up']);
  });

  test('the separators are the locale\'s list separators ("und" before the last in German)', () => {
    const [island] = clients(
      withUseId(() =>
        serverRender(<AreaChart title="Umsatz" locale="de-DE" data={DAYS} x="date" y="current" />),
      ),
    );
    expect(island?.props['separators']).toEqual([', ', ' und ']);
  });

  test("a year of daily points: the island's JSON grows linearly, about 64 B a point", () => {
    // What crosses to the browser for a long series (R2-4; M40 item 10, 2026-10-20): the compact
    // payload sends each series' name once and a short tuple per point, so a year of daily points
    // with a comparison is about 23 KB of island JSON (W10's per-point objects with an `announce`
    // string were about 122 KB). Measured with the HTML and the RSC payload in W11's LONG-SERIES
    // table; bucketing a daily series weekly above about 90 points still halves the HTML.
    const year = Array.from({ length: 365 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      current: 2000 + ((i * 37) % 900),
      previous: 1900 + ((i * 53) % 800),
    }));
    const [island] = clients(
      withUseId(() =>
        serverRender(
          <AreaChart
            title="Sales"
            data={year}
            x="date"
            y="current"
            compare="previous"
            format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
          />,
        ),
      ),
    );
    const bytes = JSON.stringify(island?.props ?? {}).length;
    expect(bytes / 365).toBeGreaterThan(50);
    expect(bytes / 365).toBeLessThan(80);
  });

  test.each(['ltr', 'rtl', 'auto'] as const)(
    'xDirection="%s": the same island props (it reads the resolved direction itself)',
    (xDirection) => {
      expect(islandProps(xDirection)).toEqual(islandProps('ltr'));
    },
  );

  test.each(['loading', 'empty', 'error'] as const)('%s: no island', (status) => {
    const tree = withUseId(() =>
      serverRender(<AreaChart title="Sales" status={status} data={DAYS} x="date" y="current" />),
    );
    expect(JSON.stringify(tree)).toContain('"type":"figure"');
    expect(clients(tree)).toEqual([]);
  });

  test('interaction="none": no island, a server-only chart', () => {
    const tree = withUseId(() =>
      serverRender(<AreaChart title="Sales" data={DAYS} x="date" y="current" interaction="none" />),
    );
    expect(clients(tree)).toEqual([]);
  });
});

test('Sparkline and ChartTooltip render to host elements under react-server', () => {
  const spark = JSON.stringify(serverRender(<Sparkline data={[1, 3, 2, 5]} />));
  expect(spark).toContain('"type":"span"');
  expect(spark).toContain('"type":"svg"');
  const tip = JSON.stringify(
    serverRender(
      <ChartTooltip title="Oct 14" rows={[{ label: 'Sales', value: '$1', series: 'current' }]} />,
    ),
  );
  expect(tip).toContain('"type":"dl"');
});
