// FunnelChart's server markup and maths (ARCHITECTURE.md §14.1, §16.4, §16.5; Figma 03 "Funnel
// Chart"): the documented step rule, bars as long as each step's share of the first (SVG
// attributes, no inline style), counts and shares as text, the rows hidden from assistive
// technology and the frame's table carrying step, count and % of previous, locale formatting and
// status passthrough.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { FunnelChart, funnelSteps, type FunnelChartProps } from '../../src/funnel-chart/index';

interface Step {
  name: string;
  n: number | null;
}

const CHECKOUT: Step[] = [
  { name: 'Sessions', n: 48210 },
  { name: 'Added to cart', n: 9642 },
  { name: 'Reached checkout', n: 4628 },
  { name: 'Purchased', n: 2914 },
];

function html(props: Partial<FunnelChartProps<Step>> = {}): string {
  return renderToStaticMarkup(
    <FunnelChart title="Checkout funnel" data={CHECKOUT} step="name" value="n" {...props} />,
  );
}

describe('funnelSteps', () => {
  test('share of the first and of the previous step', () => {
    const steps = funnelSteps([
      { label: 'a', value: 200 },
      { label: 'b', value: 50 },
      { label: 'c', value: 25 },
    ]);
    expect(steps.map((s) => [s.ofFirst, s.ofPrevious])).toEqual([
      [1, null],
      [0.25, 0.25],
      [0.125, 0.5],
    ]);
  });

  test('not finite or negative counts as 0; after a zero step there is no share', () => {
    const steps = funnelSteps([
      { label: 'a', value: 10 },
      { label: 'b', value: Number.NaN },
      { label: 'c', value: -3 },
      { label: 'd', value: 5 },
    ]);
    expect(steps.map((s) => s.value)).toEqual([10, 0, 0, 5]);
    expect(steps.map((s) => s.ofPrevious)).toEqual([null, 0, null, null]);
  });

  test('a first step of 0 draws no bars; a later step above the first draws a full one', () => {
    expect(
      funnelSteps([
        { label: 'a', value: 0 },
        { label: 'b', value: 4 },
      ]).map((s) => s.ofFirst),
    ).toEqual([0, 0]);
    expect(
      funnelSteps([
        { label: 'a', value: 4 },
        { label: 'b', value: 8 },
      ]).map((s) => s.ofFirst),
    ).toEqual([1, 1]);
  });
});

describe('markup', () => {
  test('one row per step, hidden from assistive technology, bars by SVG width', () => {
    const out = html();
    expect(out).toContain('<ol class="nz-funnel-chart-steps" aria-hidden="true">');
    expect(out.match(/data-slot="funnel-chart-step"/g)).toHaveLength(4);
    expect(out).toContain('width="100%"');
    expect(out).toContain('width="20%"');
    expect(out).toContain('width="9.6%"');
    expect(out).not.toContain('style=');
  });

  test('counts and shares as text; the first step has none', () => {
    const out = html();
    expect(out).toContain('<span class="nz-funnel-chart-value">48,210</span>');
    expect(out).toContain('<span class="nz-funnel-chart-share">—</span>');
    expect(out).toContain('<span class="nz-funnel-chart-share">20.0%</span>');
    expect(out).toContain('<span class="nz-funnel-chart-share">48.0%</span>');
    expect(out).toContain('<span class="nz-funnel-chart-share">63.0%</span>');
  });

  test('the table: step, count and % of previous', () => {
    const out = html();
    expect(out).toContain(
      '<th scope="col">Step</th><th scope="col">Count</th><th scope="col">% of previous</th>',
    );
    expect(out).toContain('<th scope="row">Added to cart</th><td>9,642</td><td>20.0%</td>');
  });

  test('locale and labels', () => {
    const out = html({ locale: 'de-DE', labels: { step: 'Schritt' } });
    expect(out).toContain('48.210');
    expect(out).toContain('20,0');
    expect(out).toContain('<th scope="col">Schritt</th>');
  });

  test('no rows while loading; the frame keeps its slots', () => {
    const out = html({ status: 'loading' });
    expect(out).not.toContain('nz-funnel-chart-steps');
    expect(out).toContain('data-loading=""');
  });
});
