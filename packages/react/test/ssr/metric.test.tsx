import type { JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { serverRender, underReactServer, withDispatcher } from '../helpers/rsc';
import { Delta } from '../../src/delta/delta';
import { Metric, metricLabels } from '../../src/metric/metric';
import { MetricExample, MetricStatesExample } from '../../src/metric/metric.example';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('Metric is server-safe', () => {
  const { modules, externals } = graph(SRC, 'src/metric/metric.tsx');

  test("no 'use client' module in its graph; it imports only react", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test('the examples render with the react-server build of React', async () => {
    const { loaded, react } = await underReactServer(
      () => import('../../src/metric/metric.example'),
    );
    for (const Example of Object.values(loaded) as Array<() => JSX.Element>) {
      const tree = JSON.stringify(withDispatcher(react, () => serverRender(Example())));
      expect(tree).toContain('"data-slot":"metric"');
    }
  });
});

describe('Metric markup', () => {
  test('ready: label, value, the change row with a visible comparison', () => {
    expect(
      renderToString(
        <Metric label="Total sales" value={48290} delta={0.124} comparison="vs last week" />,
      ),
    ).toBe(
      '<div data-slot="metric" data-size="default" class="nz-metric">' +
        '<div class="nz-metric-label" data-slot="metric-label">Total sales</div>' +
        '<div class="nz-metric-value-row" data-slot="metric-value-row">' +
        '<data data-slot="number-value" value="48290" class="nz-number-value nz-metric-value">48,290</data></div>' +
        '<div class="nz-metric-change" data-slot="metric-change">' +
        '<span data-slot="delta" data-tone="success" class="nz-delta">' +
        '<span class="nz-delta-value" data-slot="delta-value">+12.4%</span></span>' +
        '<span class="nz-metric-comparison" data-slot="metric-comparison">vs last week</span>' +
        '</div></div>',
    );
  });

  test('the comparison is read once: Delta does not repeat it visually hidden', () => {
    const html = renderToString(
      <Metric label="Orders" value={3} delta={0.1} comparison="vs last week" />,
    );
    expect(html.match(/vs last week/g)).toHaveLength(1);
    expect(html).not.toContain('nz-visually-hidden');
  });

  test('display puts the change in the value row; format and locale reach the number and the delta', () => {
    const html = renderToString(
      <Metric
        size="display"
        label="Total sales"
        value={1250}
        format={{ style: 'currency', currency: 'EUR' }}
        locale="de-DE"
        delta={0.5}
      />,
    );
    expect(html).toContain('data-size="display"');
    expect(html).toMatch(
      /<div class="nz-metric-value-row" data-slot="metric-value-row"><data [^>]*>[^<]+<\/data><div class="nz-metric-change"/,
    );
    expect(html).toContain(
      `>${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(1250)}</data>`,
    );
    expect(html).toContain(
      `>${new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(0.5)}</span>`,
    );
  });

  test('a Delta element replaces the default one', () => {
    const html = renderToString(
      <Metric label="Refunds" value={2} delta={<Delta value={0.08} tone="critical" />} />,
    );
    expect(html).toContain('data-tone="critical"');
  });

  test('loading: aria-busy, data-loading, skeletons and static hidden text, no live region', () => {
    const html = renderToString(
      <Metric label="Orders" status="loading" comparison="vs last week" />,
    );
    expect(html).toMatch(
      /^<div data-slot="metric" data-size="default" data-loading="" aria-busy="true" class="nz-metric">/,
    );
    expect(html).toContain(
      '<span data-slot="skeleton" data-shape="block" class="nz-skeleton nz-metric-value-skeleton" aria-hidden="true"></span>',
    );
    expect(html).toContain('<span class="nz-visually-hidden">Loading <!-- -->Orders</span>');
    expect(html).toContain('nz-metric-change-skeleton');
    expect(html).not.toContain('vs last week');
    expect(html).not.toMatch(/aria-live|role="status"|role="alert"/);
  });

  test('ready with no value is empty: a dash and hidden text, or the empty slot', () => {
    for (const value of [null, undefined, Number.NaN]) {
      const html = renderToString(<Metric label="Orders" value={value} />);
      expect(html).toContain('data-empty=""');
      expect(html).not.toContain('aria-busy');
      expect(html).toContain(
        '<span class="nz-metric-empty" data-slot="metric-empty"><span aria-hidden="true">—</span><span class="nz-visually-hidden">No data</span></span>',
      );
    }
    expect(renderToString(<Metric label="Orders" empty={<i>none yet</i>} />)).toContain(
      '<i>none yet</i>',
    );
    expect(renderToString(<Metric label="Orders" value={0} />)).toContain('>0</data>');
  });

  test('error: data-error and an InlineError naming the label, or the error slot', () => {
    const html = renderToString(<Metric label="Orders" value={5} status="error" />);
    expect(html).toContain('data-error=""');
    expect(html).toContain('data-slot="inline-error"');
    expect(html).toContain('Could not load <!-- -->Orders');
    expect(html).not.toContain('data-slot="number-value"');
    expect(renderToString(<Metric label="Orders" status="error" error={<p>Retry</p>} />)).toContain(
      '<p>Retry</p>',
    );
  });

  test('pending shows the value with data-pending and aria-busy; only while ready', () => {
    const html = renderToString(<Metric label="Orders" value={5} pending />);
    expect(html).toMatch(/data-pending="" aria-busy="true"/);
    expect(html).toContain('>5</data>');
    expect(renderToString(<Metric label="Orders" status="error" pending />)).not.toContain(
      'data-pending',
    );
  });

  test('labels translate the status texts; {label} may be anywhere', () => {
    const html = renderToString(
      <Metric label="Umsatz" status="loading" labels={{ loading: '{label} wird geladen' }} />,
    );
    expect(html).toContain('<span class="nz-visually-hidden">Umsatz<!-- --> wird geladen</span>');
    expect(metricLabels).toEqual({
      loading: 'Loading {label}',
      empty: 'No data',
      error: 'Could not load {label}',
    });
  });

  test('the change row: only with a delta or comparison, unless reserved; the chart only while ready', () => {
    expect(renderToString(<Metric label="A" value={1} />)).not.toContain('metric-change');
    expect(renderToString(<Metric label="A" value={1} reserveChange />)).toContain(
      '<div class="nz-metric-change" data-slot="metric-change"></div>',
    );
    expect(renderToString(<Metric label="A" value={1} chart={<svg />} />)).toContain(
      '<div class="nz-metric-chart" data-slot="metric-chart"><svg></svg></div>',
    );
    expect(renderToString(<Metric label="A" status="loading" chart={<svg />} />)).not.toContain(
      'metric-chart',
    );
  });

  test('labelId names the label; render keeps the slot and receives the status', () => {
    expect(renderToString(<Metric label="A" value={1} labelId="kpi" />)).toContain(
      '<div class="nz-metric-label" data-slot="metric-label" id="kpi">A</div>',
    );
    const html = renderToString(
      <Metric
        label="A"
        render={(props, state) => <section {...props} data-state={state.status} />}
      />,
    );
    expect(html).toMatch(/^<section data-slot="metric"[^>]*data-state="empty"/);
  });

  test('the examples render', () => {
    expect(renderToString(<MetricExample />).match(/data-slot="metric"/g)).toHaveLength(3);
    const states = renderToString(<MetricStatesExample />);
    for (const attr of ['data-loading', 'data-empty', 'data-error', 'data-pending']) {
      expect(states).toContain(`${attr}=""`);
    }
  });
});
