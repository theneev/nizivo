// Server-first (ARCHITECTURE.md §14.1): DonutChart loads and renders with React's react-server build,
// as in a Server Component (this file runs in the `react-server` project, vitest.config.ts). A
// hook other than useId, or a client-only module in its graph, would throw here. Its one client
// module, the ChartInteraction island (item mode, M41 item 2), is replaced by what an RSC bundler
// puts in its place, a client reference: the server never runs it, it only serialises its props,
// so they must be plain JSON, every string pre-formatted here (§16.4).
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

const { DonutChart } = await import('../../src/donut-chart/index');

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

// Figma 03's numbers: three channels and Other (5,210 + 2,188 = 7,398), 123,307 in all
const DATA = [
  { c: 'Online store', v: 64120 },
  { c: 'Point of sale', v: 34526 },
  { c: 'Wholesale', v: 17263 },
  { c: 'Marketplace', v: 5210 },
  { c: 'Pop-up', v: 2188 },
];

describe('DonutChart under react-server', () => {
  test('renders to host elements in every status; the island only while ready', () => {
    for (const status of ['ready', 'loading', 'empty', 'error'] as const) {
      const tree = withUseId(() =>
        serverRender(
          <DonutChart
            title="Sales"
            status={status}
            data={[
              { c: 'a', v: 3 },
              { c: 'b', v: 1 },
            ]}
            category={(d) => d.c}
            value={(d) => d.v}
          />,
        ),
      );
      const json = JSON.stringify(tree);
      expect(json).toContain('"type":"figure"');
      expect(json.includes('"type":"path"')).toBe(status === 'ready');
      expect(clients(tree).map((c) => c.client)).toEqual(
        status === 'ready' ? ['chart-interaction.client#ChartInteraction'] : [],
      );
    }
  });

  test("the island's props are plain JSON: item mode, one point per slice, pre-formatted", () => {
    const [island] = clients(
      withUseId(() =>
        serverRender(
          <DonutChart
            title="Sales by channel"
            data={DATA}
            category="c"
            value="v"
            format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
            labels={{ value: 'Sales' }}
          />,
        ),
      ),
    );
    const props = island?.props ?? {};
    expect(isPlainJson(props)).toBe(true);
    expect(JSON.parse(JSON.stringify(props))).toEqual(props);
    expect(props['columns']).toBe('donut-chart-segment');
    expect(props['aria-label']).toBe('Sales by channel');
    expect(props['aria-roledescription']).toBe('interactive chart');
    expect(props['aria-describedby']).toMatch(/^_S_/);
    // one row, whose swatch each item recolours; the share is the card's "change", "of total"
    expect(props['series']).toEqual([{ label: 'Sales', series: 'cat-1' }]);
    expect(props['delta']).toBe('of total');
    expect(props['separators']).toEqual([', ', ', ']);
    expect(props['points']).toEqual([
      ['Online store', ['$64,120'], [], '52%'],
      ['Point of sale', ['$34,526'], [], '28%'],
      ['Wholesale', ['$17,263'], [], '14%'],
      ['Other', ['$7,398'], [], '6%'],
    ]);
    // each slice's centre half-way through the ring (43.5 % of the plot from its centre), in
    // percent from the plot's top left, and its colour role
    const items: unknown = props['items'];
    if (!Array.isArray(items)) throw new Error('no items');
    const tuples = items.map((item: unknown) => {
      if (!Array.isArray(item)) throw new Error('not a tuple');
      const [x, y, series]: unknown[] = item;
      if (typeof x !== 'number' || typeof y !== 'number') throw new Error('not a centre');
      return { x, y, series };
    });
    expect(tuples.map((t) => t.series)).toEqual(['cat-1', 'cat-2', 'cat-3', 'other']);
    let start = 0;
    for (const [i, value] of [64120, 34526, 17263, 7398].entries()) {
      const middle = (start + value / 2 / 123307) * Math.PI * 2;
      start += value / 123307;
      const { x, y } = tuples[i] ?? { x: Number.NaN, y: Number.NaN };
      expect(x).toBeCloseTo(50 + 43.5 * Math.sin(middle), 2);
      expect(y).toBeCloseTo(50 - 43.5 * Math.cos(middle), 2);
      // two decimals at most: a compact payload
      expect(String(x)).toMatch(/^\d+(\.\d{1,2})?$/);
    }
  });

  test('translated: the labels and the locale reach the island', () => {
    const [island] = clients(
      withUseId(() =>
        serverRender(
          <DonutChart
            title={<span>Umsatz</span>}
            data={DATA}
            category="c"
            value="v"
            locale="de-DE"
            labels={{
              value: 'Umsatz',
              other: 'Andere',
              ofTotal: 'vom Gesamtumsatz',
              points: 'Segmente',
              interaction: 'interaktives Diagramm',
            }}
          />,
        ),
      ),
    );
    const props = island?.props ?? {};
    expect(props['aria-label']).toBe('Segmente');
    expect(props['aria-roledescription']).toBe('interaktives Diagramm');
    expect(props['separators']).toEqual([', ', ' und ']);
    expect(props['delta']).toBe('vom Gesamtumsatz');
    const points: unknown = props['points'];
    if (!Array.isArray(points)) throw new Error('no points');
    const percent = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 0 });
    expect(points[0]).toEqual(['Online store', ['64.120'], [], percent.format(0.52)]);
    expect(points[3]).toEqual(['Andere', ['7.398'], [], percent.format(0.06)]);
  });

  test('interaction="none": no island, a server-only chart', () => {
    const tree = withUseId(() =>
      serverRender(
        <DonutChart title="Sales" data={DATA} category="c" value="v" interaction="none" />,
      ),
    );
    expect(clients(tree)).toEqual([]);
    expect(JSON.stringify(tree)).not.toContain('Arrow keys');
    expect(JSON.stringify(tree)).toContain('nz-donut-chart-segment');
  });
});
