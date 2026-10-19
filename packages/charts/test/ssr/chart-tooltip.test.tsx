// ChartTooltip's markup (Figma 03 "Chart Tooltip", Series=1|2): a title, one row per series as a
// description list (swatch and name, then the value), and the change with its sign. Server-safe:
// the island shows it, and a third-party renderer can render the same card.
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { ChartTooltip } from '../../src/chart-tooltip/index';

const ROWS = [
  { label: 'This period', value: '$6,284', series: 'current' },
  { label: 'Previous', value: '$4,910', series: 'previous' },
] as const;

test('Series=1: a title and one row, as a description list', () => {
  expect(renderToStaticMarkup(<ChartTooltip title="Tue, Oct 14" rows={ROWS.slice(0, 1)} />)).toBe(
    '<div data-slot="chart-tooltip" class="nz-chart-tooltip">' +
      '<p class="nz-chart-tooltip-title">Tue, Oct 14</p>' +
      '<dl class="nz-chart-tooltip-rows"><div class="nz-chart-tooltip-row">' +
      '<dt class="nz-chart-tooltip-label"><span class="nz-chart-tooltip-swatch" data-series="current" aria-hidden="true"></span>This period</dt>' +
      '<dd class="nz-chart-tooltip-value">$6,284</dd></div></dl></div>',
  );
});

test('Series=2 with the change: data-trend on the delta, its label after a space', () => {
  const out = renderToStaticMarkup(
    <ChartTooltip
      title="Tue, Oct 14"
      rows={ROWS}
      delta={{ value: '+28.0%', label: 'vs previous', trend: 'up' }}
    />,
  );
  expect(out.match(/class="nz-chart-tooltip-row"/g)).toHaveLength(2);
  expect(out).toContain('data-series="previous"');
  expect(out).toContain(
    '<p class="nz-chart-tooltip-delta" data-trend="up"><span class="nz-chart-tooltip-change">+28.0%</span> <span class="nz-chart-tooltip-comparison">vs previous</span></p>',
  );
});

test('a delta without a label; attributes and className reach the card; no inline style', () => {
  const out = renderToStaticMarkup(
    <ChartTooltip
      title="Oct 15"
      rows={ROWS}
      delta={{ value: '−13.9%', trend: 'down' }}
      className="mine"
      id="tip"
      aria-hidden="true"
    />,
  );
  expect(out).toMatch(
    /^<div data-slot="chart-tooltip" id="tip" aria-hidden="true" class="nz-chart-tooltip mine">/,
  );
  expect(out).toContain(
    'data-trend="down"><span class="nz-chart-tooltip-change">−13.9%</span></p>',
  );
  expect(out).not.toContain('style=');
});
