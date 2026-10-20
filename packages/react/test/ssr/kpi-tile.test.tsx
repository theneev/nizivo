import type { JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { serverRender, underReactServer, withDispatcher } from '../helpers/rsc';
import { KpiTile } from '../../src/kpi-tile/kpi-tile';
import { KpiTileExample, KpiTileStatesExample } from '../../src/kpi-tile/kpi-tile.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('KpiTile is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/kpi-tile/kpi-tile.tsx');

  test("no 'use client' module in its graph; it imports only react, never charts", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test('the examples render with the react-server build of React', async () => {
    const { loaded, react } = await underReactServer(
      () => import('../../src/kpi-tile/kpi-tile.example'),
    );
    for (const Example of Object.values(loaded) as Array<() => JSX.Element>) {
      const tree = JSON.stringify(withDispatcher(react, () => serverRender(Example())));
      expect(tree).toContain('"data-slot":"kpi-tile"');
      expect(tree).toContain('"aria-labelledby":"_S_');
    }
  });
});

describe('KpiTile markup', () => {
  test("Card's surface, a group named by the label, Metric inside with the change row kept", () => {
    const html = renderToString(
      <KpiTile
        label="Total sales"
        value={48290}
        delta={0.124}
        comparison="vs last week"
        chart={<svg />}
      />,
    );
    const id = /aria-labelledby="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(id).not.toBe('');
    expect(html).toMatch(
      new RegExp(
        '^<div data-slot="kpi-tile" data-tone="surface" data-padding="sm" role="group" ' +
          `aria-labelledby="${id}" class="nz-card nz-kpi-tile"><div data-slot="metric" data-size="default" class="nz-metric">` +
          `<div class="nz-metric-label" data-slot="metric-label" id="${id}">Total sales</div>`,
      ),
    );
    expect(html).toContain(
      '<div class="nz-metric-chart" data-slot="metric-chart"><svg></svg></div>',
    );
    expect(html).not.toContain('data-elevation');
  });

  test('tone: surface, brand or accent, decoupled from the trend', () => {
    expect(renderToString(<KpiTile label="A" value={1} delta={-0.2} tone="brand" />)).toMatch(
      /^<div data-slot="kpi-tile" data-tone="brand"/,
    );
    expect(renderToString(<KpiTile label="A" value={1} delta={0.2} tone="accent" />)).toMatch(
      /^<div data-slot="kpi-tile" data-tone="accent"/,
    );
  });

  test('the change row is reserved even when a fallback passes no delta', () => {
    expect(renderToString(<KpiTile label="A" status="loading" />)).toContain(
      '<div class="nz-metric-change" data-slot="metric-change"></div>',
    );
  });

  test('the four statuses on the root: data-* and aria-busy, static hidden text, no live region', () => {
    const loading = renderToString(<KpiTile label="Revenue" status="loading" />);
    expect(loading).toMatch(
      /^<div data-slot="kpi-tile"[^>]* data-loading="" aria-busy="true" role="group"/,
    );
    expect(loading).toContain('Loading <!-- -->Revenue');
    expect(loading).not.toMatch(/aria-live|role="status"|role="alert"/);
    expect(renderToString(<KpiTile label="Revenue" />)).toMatch(/^<div [^>]*data-empty=""/);
    expect(renderToString(<KpiTile label="Revenue" status="error" />)).toMatch(
      /^<div [^>]*data-error=""/,
    );
    const pending = renderToString(<KpiTile label="Revenue" value={2} pending />);
    expect(pending).toMatch(/^<div [^>]*data-pending="" aria-busy="true"/);
    expect(pending).toContain('>2</data>');
  });

  test('render: the element keeps its props, the part its slot and tone; the function gets the state', () => {
    expect(
      renderToString(
        <KpiTile
          label="A"
          value={1}
          tone="brand"
          render={<section data-tone="surface" title="t" />}
        />,
      ),
    ).toMatch(/^<section data-tone="brand" title="t" data-slot="kpi-tile"/);
    expect(
      renderToString(
        <KpiTile
          label="A"
          status="loading"
          render={(props, state) => (
            <article {...props} data-state={`${state.status}/${state.tone}`} />
          )}
        />,
      ),
    ).toMatch(/^<article [^>]*data-state="loading\/surface"/);
  });

  test('the examples render', () => {
    expect(renderToString(<KpiTileExample />).match(/data-slot="kpi-tile"/g)).toHaveLength(4);
    expect(renderToString(<KpiTileStatesExample />).match(/data-slot="kpi-tile"/g)).toHaveLength(4);
  });
});
