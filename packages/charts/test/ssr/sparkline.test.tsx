// Sparkline's server markup (Figma 03 "Sparkline"; 04 the KPI tile's chart slot): decorative by
// default, one named image with `label`, the trend derived from the data, a percent-space SVG with
// the shared line and wash, the end dot, gaps, and no inline style.
import { curveLinear } from 'd3-shape';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { Sparkline, type SparklineProps } from '../../src/sparkline/index';
import { all, parse, type Node } from '../conformance/markup';

const UP = [12, 14, 13, 17, 16, 19, 18, 22, 21, 24, 23, 27];

function root(props: Partial<SparklineProps> = {}): Node {
  const [node] = parse(renderToStaticMarkup(<Sparkline data={UP} {...props} />)).children;
  if (node === undefined) throw new Error('nothing rendered');
  return node;
}

const d = (node: Node, className: string): string | undefined =>
  all(node, (n) => n.attrs.get('class') === className)[0]?.attrs.get('d');

describe('Sparkline: accessibility', () => {
  test('decorative by default: the whole mark is aria-hidden, with no role and no name', () => {
    const node = root();
    expect(node.tag).toBe('span');
    expect(node.attrs.get('class')).toBe('nz-sparkline');
    expect(node.attrs.get('data-slot')).toBe('sparkline');
    expect(node.attrs.get('aria-hidden')).toBe('true');
    expect(node.attrs.has('role')).toBe(false);
    expect(node.attrs.has('aria-label')).toBe(false);
  });

  test('label makes it one image with that name; its SVG stays hidden', () => {
    const node = root({ label: 'Sales trend, up 125% over 12 weeks' });
    expect(node.attrs.get('role')).toBe('img');
    expect(node.attrs.get('aria-label')).toBe('Sales trend, up 125% over 12 weeks');
    expect(node.attrs.has('aria-hidden')).toBe(false);
    expect(node.children[0]?.attrs.get('aria-hidden')).toBe('true');
  });

  test("the consumer's own aria-label or aria-labelledby names it too, as one image", () => {
    const labelled = root({ 'aria-label': 'Sales up' });
    expect(labelled.attrs.get('role')).toBe('img');
    expect(labelled.attrs.get('aria-label')).toBe('Sales up');
    expect(labelled.attrs.has('aria-hidden')).toBe(false);
    const byId = root({ 'aria-labelledby': 'k1' });
    expect(byId.attrs.get('role')).toBe('img');
    expect(byId.attrs.get('aria-labelledby')).toBe('k1');
    expect(byId.attrs.has('aria-label')).toBe(false);
    expect(byId.attrs.has('aria-hidden')).toBe(false);
  });

  test('an empty label is no name: it stays decorative, never an image named ""', () => {
    const node = root({ label: '' });
    expect(node.attrs.get('aria-hidden')).toBe('true');
    expect(node.attrs.has('role')).toBe(false);
    expect(node.attrs.has('aria-label')).toBe(false);
  });

  test('attributes and className reach the root; no inline style', () => {
    const node = root({ id: 'trend', className: 'mine' });
    expect(node.attrs.get('id')).toBe('trend');
    expect(node.attrs.get('class')).toBe('nz-sparkline mine');
    expect(renderToStaticMarkup(<Sparkline data={UP} />)).not.toContain('style=');
  });
});

describe('Sparkline: the trend is derived, never a prop', () => {
  test.each([
    ['up', [1, 3, 2, 4]],
    ['down', [4, 2, 3, 1]],
    ['flat', [2, 5, 1, 2]],
  ] as const)('%s', (trend, data) => {
    expect(root({ data }).attrs.get('data-trend')).toBe(trend);
  });

  test('first and last defined values decide it; no values, no trend', () => {
    expect(root({ data: [null, 1, 5, null] }).attrs.get('data-trend')).toBe('up');
    expect(root({ data: [] }).attrs.has('data-trend')).toBe(false);
    expect(root({ data: [null, Number.NaN] }).attrs.has('data-trend')).toBe(false);
  });
});

describe('Sparkline: the marks', () => {
  test('a percent-space SVG: the wash, then the line, then the end dot over its halo', () => {
    const node = root();
    const [svg] = node.children;
    expect(svg?.attrs.get('class')).toBe('nz-chart-svg');
    expect(svg?.attrs.get('viewBox')).toBe('0 0 100 100');
    expect(svg?.attrs.get('preserveAspectRatio')).toBe('none');
    expect(svg?.children.map((n) => n.attrs.get('class'))).toEqual([
      'nz-chart-area',
      'nz-chart-line',
      'nz-sparkline-halo',
      'nz-sparkline-dot',
    ]);
  });

  test('the range fills the plot: the highest value at the top, the lowest 85% down', () => {
    const line = d(root({ data: [0, 10], curve: curveLinear }), 'nz-chart-line');
    expect(line).toBe('M0,85L100,0');
    expect(d(root({ data: [0, 10], curve: curveLinear }), 'nz-chart-area')).toBe(
      'M0,85L100,0L100,100L0,100Z',
    );
    expect(d(root({ data: [0, 10] }), 'nz-sparkline-dot')).toBe('M100,0h0');
    // a flat series sits in the middle of that range
    expect(d(root({ data: [3, 3, 3], curve: curveLinear }), 'nz-chart-line')).toBe(
      'M0,42.5L50,42.5L100,42.5',
    );
  });

  test('a gap breaks the line; the dot goes to the last value there is', () => {
    const node = root({ data: [1, 2, null, 4, 5, null] });
    expect(d(node, 'nz-chart-line')?.match(/M/g)).toHaveLength(2);
    expect(d(node, 'nz-sparkline-dot')).toBe('M80,0h0');
  });

  test('area={false} and dot={false} leave the line alone', () => {
    const node = root({ area: false, dot: false });
    expect(node.children[0]?.children.map((n) => n.attrs.get('class'))).toEqual(['nz-chart-line']);
  });
});
