// Server-first (ARCHITECTURE.md §14.1): BarChart loads and renders with React's react-server build,
// as in a Server Component (this file runs in the `react-server` project, vitest.config.ts). A
// hook other than useId, or a client-only module in its graph, would throw here. Its one client
// module, the ChartInteraction island (column mode, M40 item 2), is replaced by what an RSC bundler
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

const { BarChart } = await import('../../src/bar-chart/index');

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

const DATA = [
  { d: '2026-10-14', v: 3 },
  { d: '2026-10-15', v: -1 },
  { d: '2026-10-16', v: null },
  { d: '2026-10-17', v: 1250 },
];

/** The island's props for DATA at one xDirection. */
const islandProps = (xDirection: 'ltr' | 'rtl' | 'auto'): unknown =>
  clients(
    withUseId(() =>
      serverRender(<BarChart title="Orders" data={DATA} x="d" y="v" xDirection={xDirection} />),
    ),
  )[0]?.props;

describe('BarChart under react-server', () => {
  test('renders to host elements in every status; the island only while ready', () => {
    for (const status of ['ready', 'loading', 'empty', 'error'] as const) {
      const tree = withUseId(() =>
        serverRender(<BarChart title="Orders" status={status} data={DATA} x="d" y="v" />),
      );
      const json = JSON.stringify(tree);
      expect(json).toContain('"type":"figure"');
      expect(json.includes('"type":"rect"')).toBe(status === 'ready');
      expect(clients(tree).map((c) => c.client)).toEqual(
        status === 'ready' ? ['chart-interaction.client#ChartInteraction'] : [],
      );
    }
  });

  test("the island's props are plain JSON: column mode, one point per band, pre-formatted", () => {
    const [island] = clients(
      withUseId(() =>
        serverRender(
          <BarChart
            title="Orders"
            data={DATA}
            x={(datum) => datum.d}
            y={(datum) => datum.v}
            format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
          />,
        ),
      ),
    );
    const props = island?.props ?? {};
    expect(isPlainJson(props)).toBe(true);
    expect(JSON.parse(JSON.stringify(props))).toEqual(props);
    expect(props['columns']).toBe('bar-chart-band');
    expect(props['aria-label']).toBe('Orders');
    expect(props['aria-roledescription']).toBe('interactive chart');
    expect(props['aria-describedby']).toMatch(/^_S_/);
    expect(props['series']).toEqual([{ label: 'Value', series: 'current' }]);
    expect(props['separators']).toEqual([', ', ', ']);
    // no comparison in a bar chart: no change, no delta label
    expect(props).not.toHaveProperty('delta');
    // every datum is a band, so a point, the one with no value too; no dots in column mode
    expect(props['points']).toEqual([
      ['Wed, Oct 14', ['$3'], []],
      ['Thu, Oct 15', ['-$1'], []],
      ['Fri, Oct 16', ['No value'], []],
      ['Sat, Oct 17', ['$1,250'], []],
    ]);
  });

  test('translated: the labels and the locale reach the island', () => {
    const [island] = clients(
      withUseId(() =>
        serverRender(
          <BarChart
            title={<span>Bestellungen</span>}
            data={DATA}
            x="d"
            y="v"
            locale="de-DE"
            labels={{
              value: 'Bestellungen',
              missing: 'Kein Wert',
              points: 'Balken',
              interaction: 'interaktives Diagramm',
            }}
          />,
        ),
      ),
    );
    const props = island?.props ?? {};
    expect(props['aria-label']).toBe('Balken');
    expect(props['aria-roledescription']).toBe('interaktives Diagramm');
    expect(props['separators']).toEqual([', ', ' und ']);
    expect(props['series']).toEqual([{ label: 'Bestellungen', series: 'current' }]);
    const points: unknown = props['points'];
    if (!Array.isArray(points)) throw new Error('no points');
    expect(points[2]).toEqual(['Fr., 16. Okt.', ['Kein Wert'], []]);
    expect(points[3]).toEqual(['Sa., 17. Okt.', ['1.250'], []]);
  });

  test.each(['ltr', 'rtl', 'auto'] as const)(
    'xDirection="%s": the same island props (it reads the resolved direction itself)',
    (xDirection) => {
      expect(islandProps(xDirection)).toEqual(islandProps('ltr'));
    },
  );

  test('interaction="none": no island, a server-only chart', () => {
    const tree = withUseId(() =>
      serverRender(<BarChart title="Orders" data={DATA} x="d" y="v" interaction="none" />),
    );
    expect(clients(tree)).toEqual([]);
    expect(JSON.stringify(tree)).toContain('nz-bar-chart-tooltip');
  });
});
