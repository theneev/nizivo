import type { JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { serverRender, underReactServer, withDispatcher } from '../helpers/rsc';
import { TrendCard } from '../../src/trend-card/trend-card';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('TrendCard is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/trend-card/trend-card.tsx');

  test("no 'use client' module in its graph; it imports only react, never charts", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test('the examples render with the react-server build of React (the recipe ships no client code)', async () => {
    const { loaded, react } = await underReactServer(
      () => import('../../src/trend-card/trend-card.example'),
    );
    const examples = Object.values(loaded) as Array<() => JSX.Element>;
    expect(examples).toHaveLength(2);
    for (const Example of examples) {
      const tree = JSON.stringify(withDispatcher(react, () => serverRender(Example())));
      expect(tree).toContain('"data-slot":"trend-card"');
    }
  });
});

describe('TrendCard markup', () => {
  test("Card's surface (padding md), a group named by the display Metric, then the slots in order", () => {
    const html = renderToString(
      <TrendCard
        label="Total sales"
        value={123307.4}
        delta={0.182}
        action={<select aria-label="Period" />}
        chart={<svg />}
        legend={<i>legend</i>}
        footer={<a href="/r">Report</a>}
      />,
    );
    const id = /aria-labelledby="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(html).toMatch(
      /^<div data-slot="trend-card" data-tone="surface" data-padding="md" role="group" aria-labelledby="[^"]+" class="nz-card nz-trend-card">/,
    );
    expect(html).toContain(`id="${id}">Total sales</div>`);
    expect(html).toContain('data-size="display"');
    const order = [
      'trend-card-header',
      'data-slot="metric"',
      'trend-card-action',
      'trend-card-chart',
      'trend-card-legend',
      'trend-card-footer',
    ].map((needle) => html.indexOf(needle));
    expect(order.every((at) => at > 0)).toBe(true);
    expect(order).toEqual(order.toSorted((a, b) => a - b));
  });

  test('absent slots render nothing; inverse scopes the inverse scheme', () => {
    const html = renderToString(<TrendCard label="A" value={1} />);
    for (const slot of ['action', 'chart', 'legend', 'footer']) {
      expect(html).not.toContain(`trend-card-${slot}`);
    }
    expect(renderToString(<TrendCard label="A" value={1} tone="inverse" />)).toContain(
      'data-nz-scheme="inverse"',
    );
    expect(renderToString(<TrendCard label="A" value={1} tone="brand" />)).not.toContain(
      'data-nz-scheme',
    );
  });

  test('statuses: the root carries them; the slots render as given in every status', () => {
    for (const status of ['loading', 'error'] as const) {
      const html = renderToString(
        <TrendCard label="Sales" status={status} chart={<svg />} action={<b>p</b>} />,
      );
      expect(html).toMatch(new RegExp(`^<div [^>]*data-${status}=""`));
      expect(html).toContain('trend-card-chart');
      expect(html).toContain('trend-card-action');
    }
    expect(renderToString(<TrendCard label="Sales" status="loading" />)).toContain(
      'aria-busy="true"',
    );
    expect(renderToString(<TrendCard label="Sales" />)).toMatch(/^<div [^>]*data-empty=""/);
  });
});
