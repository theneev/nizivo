// A narrow chart in a real layout engine (week 22): ChartFrame is a size container, so a chart lays
// itself out by its own width, never the viewport's. Under 31rem a body with axes is at least 12rem
// tall (the plot keeps about 10rem; wider, the aspect ratio alone sizes it), never wider than the
// chart. Under 25rem the x axis
// shows every other label, counting only the positions that have one, and always the first and the
// last; the labels it hides keep their boxes (visibility, so the last stays at its cell's end), and
// the visible ones never overlap. AreaChart (point labels) and BarChart (band labels), left to right
// and mirrored. Styled by the shipped stylesheets only (tokens.css and dist/styles.css), so build
// first. Every engine: `NZ_BROWSER=webkit pnpm test:browser` (or firefox).
import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { AreaChart } from '../../src/area-chart/index';
import { BarChart } from '../../src/bar-chart/index';

const STYLES = import.meta.glob(['../../../tokens/dist/tokens.css', '../../dist/styles.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
if (Object.keys(STYLES).length !== 2) {
  throw new Error('a stylesheet is missing: build @nizivo/tokens and @nizivo/charts first');
}
const sheet = document.createElement('style');
// test scaffolding only: a white page and three chart widths (a phone's card, a 384 px one, a wide one)
sheet.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe-narrow { inline-size: 300px; }
.probe-mid { inline-size: 384px; }
.probe-wide { inline-size: 640px; }`;
document.head.append(sheet);

type Probe = 'probe-narrow' | 'probe-mid' | 'probe-wide';

// Figma 03's thirty days (labels Oct 1, 8, 15, 22 and the forced 30) and fourteen bars (Oct 17–30)
const DAYS = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  sales: 2000 + i * 120,
}));
const ORDERS = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-10-${String(17 + i)}`,
  orders: 180 + i * 9,
}));

let root: Root | undefined;
let host: HTMLElement | undefined;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
});

function mount(node: ReactElement, probe: Probe, dir?: 'rtl'): HTMLElement {
  host = document.createElement('div');
  host.className = probe;
  if (dir !== undefined) host.dir = dir;
  document.body.append(host);
  root = createRoot(host);
  const into = root;
  flushSync(() => into.render(node));
  return host;
}

function one(selector: string): Element {
  const found = host?.querySelector(selector);
  if (found === null || found === undefined) throw new Error(`no ${selector}`);
  return found;
}

/** The x labels a reader sees, left to right on screen, with their boxes. */
function shown(): Array<{ text: string; box: DOMRect }> {
  return [...(host?.querySelectorAll('.nz-chart-frame-x-ticks .nz-chart-frame-tick') ?? [])]
    .filter((tick) => tick.textContent !== '' && getComputedStyle(tick).visibility === 'visible')
    .map((tick) => {
      // the tick is a zero-size box: its text overflows it, so measure the text
      const range = document.createRange();
      range.selectNodeContents(tick);
      return { text: tick.textContent ?? '', box: range.getBoundingClientRect() };
    })
    .toSorted((a, b) => a.box.left - b.box.left);
}

function apart(labels: Array<{ box: DOMRect }>): void {
  for (let i = 1; i < labels.length; i += 1) {
    expect(labels[i]?.box.left ?? 0).toBeGreaterThan(labels[i - 1]?.box.right ?? 0);
  }
}

const area = (xDirection: 'ltr' | 'auto' = 'ltr'): ReactElement => (
  <AreaChart
    title="Sales"
    data={DAYS}
    x="date"
    y="sales"
    interaction="none"
    xDirection={xDirection}
  />
);
const bars = <BarChart title="Orders" data={ORDERS} x="date" y="orders" interaction="none" />;

describe('the plot of a narrow chart', () => {
  test('under 31rem a body with axes is at least 12rem tall; wider, the aspect ratio sizes it', () => {
    mount(area(), 'probe-narrow');
    // 300 × 7 / 18 would be 117 px; and the minimum height never widens the body (Firefox and
    // WebKit carry it through the aspect ratio into a minimum width, unless capped)
    expect(one('.nz-chart-frame-body').getBoundingClientRect().height).toBeGreaterThanOrEqual(192);
    expect(one('.nz-chart-frame-body').getBoundingClientRect().width).toBe(300);
    expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
    expect(one('.nz-chart-frame-plot').getBoundingClientRect().height).toBeGreaterThanOrEqual(150);
    root?.unmount();
    host?.remove();
    mount(area(), 'probe-wide');
    // the aspect ratio's 640 × 7 / 18 (content box: the body's half-line top padding is outside it)
    const body = one('.nz-chart-frame-body');
    const padding = Number.parseFloat(getComputedStyle(body).paddingBlockStart);
    expect(body.getBoundingClientRect().height - padding).toBeCloseTo((640 * 7) / 18, 0);
  });
});

describe('the x labels of a narrow chart', () => {
  test('AreaChart: every other label under 25rem, the first and the last always', () => {
    mount(area(), 'probe-wide');
    expect(shown().map((l) => l.text)).toEqual(['Oct 1', 'Oct 8', 'Oct 15', 'Oct 22', 'Oct 30']);
    root?.unmount();
    host?.remove();
    mount(area(), 'probe-narrow');
    const labels = shown();
    expect(labels.map((l) => l.text)).toEqual(['Oct 1', 'Oct 15', 'Oct 30']);
    apart(labels);
    // the last label keeps its place, clamped to the plot's end
    const plot = one('.nz-chart-frame-plot').getBoundingClientRect();
    expect(labels.at(-1)?.box.right ?? 0).toBeCloseTo(plot.right, 0);
    expect(labels[0]?.box.left ?? 0).toBeCloseTo(plot.left, 0);
  });

  test('AreaChart mirrored (xDirection="auto" on a right-to-left page): the same labels, first on the right', () => {
    mount(area('auto'), 'probe-narrow', 'rtl');
    const labels = shown();
    expect(labels.map((l) => l.text)).toEqual(['Oct 30', 'Oct 15', 'Oct 1']);
    apart(labels);
  });

  test('BarChart: every other band label under 25rem, the last always, none overlapping', () => {
    mount(bars, 'probe-mid');
    // 384 px: the default "Oct 17" labels on every other band would touch, so they thin
    const labels = shown();
    expect(labels.map((l) => l.text)).toEqual(['Oct 17', 'Oct 21', 'Oct 25', 'Oct 30']);
    apart(labels);
    root?.unmount();
    host?.remove();
    mount(bars, 'probe-wide');
    expect(shown()).toHaveLength(7);
    apart(shown());
  });

  test('the data table keeps every value', () => {
    mount(area(), 'probe-narrow');
    expect(host?.querySelectorAll('.nz-chart-frame-table tbody tr')).toHaveLength(30);
  });
});
