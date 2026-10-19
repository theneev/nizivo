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
    expect(props['mirror']).toBe(false);
    const points: unknown = props['points'];
    if (!Array.isArray(points)) throw new Error('no points');
    expect(points).toHaveLength(7);
    expect(points[0]).toEqual({
      x: 0,
      y: [expect.any(Number), expect.any(Number)],
      card: {
        title: 'Wed, Oct 14',
        rows: [
          { label: 'This period', value: '$4,000', series: 'current' },
          { label: 'Previous', value: '$3,800', series: 'previous' },
        ],
        delta: { value: '+5.3%', label: 'vs previous', trend: 'up' },
      },
      announce: 'Wed, Oct 14, This period, $4,000, Previous, $3,800, +5.3%, vs previous',
    });
    // no comparison value: no dot for it, no change, and the table's missing label
    expect(points[3]).toMatchObject({
      y: [expect.any(Number), null],
      card: { rows: [{ value: '$4,900' }, { value: 'No value' }] },
    });
    expect(points[3]).not.toHaveProperty('card.delta');
    expect(points.at(-1)).toHaveProperty('x', 100);
  });

  test("a year of daily points: the island's JSON grows linearly, about 335 B a point", () => {
    // What crosses to the browser for a long series (R2-4, 2026-10-19): 122 KB of island JSON at
    // 365 points (15 KB gzip), on top of the server HTML. Bucket long daily series weekly; a compact
    // payload (series names once, `announce` joined on the client) waits on the island's budget.
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
    expect(bytes / 365).toBeGreaterThan(300);
    expect(bytes / 365).toBeLessThan(350);
  });

  test('xDirection="rtl" tells the island the plot is mirrored', () => {
    const [island] = clients(
      withUseId(() =>
        serverRender(<AreaChart title="Sales" data={DAYS} x="date" y="current" xDirection="rtl" />),
      ),
    );
    expect(island?.props['mirror']).toBe(true);
  });

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
