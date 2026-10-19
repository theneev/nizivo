// DonutChart in a real layout engine (ARCHITECTURE.md §14.1; Figma 03 "Donut Chart"): the ring is a
// 200 px square beside its legend (40 % of a narrow chart), the gaps between segments are real gaps
// (the page shows through), and hover works in CSS alone: a segment, or its legend row, dims the
// other segments to 35 % and the other legend rows to 45 %, and the centre swaps the total for the
// segment's share and name. Those rules lean on `:has()`; this spec is what shows WebKit re-styles
// them on hover. Every engine: `NZ_BROWSER=webkit pnpm test:browser` (or firefox). Styled by the
// shipped stylesheets only (tokens.css and dist/styles.css), so build first.
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { DonutChart } from '../../src/donut-chart/index';

const STYLES = import.meta.glob(['../../../tokens/dist/tokens.css', '../../dist/styles.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
if (Object.keys(STYLES).length !== 2) {
  throw new Error('a stylesheet is missing: build @nizivo/tokens and @nizivo/charts first');
}
const sheet = document.createElement('style');
// test scaffolding only: a white page and two chart widths
sheet.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe-wide { inline-size: 640px; }
.probe-narrow { inline-size: 300px; }`;
document.head.append(sheet);

// Figma 03's numbers: 64,120 + 34,526 + 17,263 + 7,398 (Other) = 123,307
const DATA = [
  { name: 'Online store', sales: 64120 },
  { name: 'Point of sale', sales: 34526 },
  { name: 'Wholesale', sales: 17263 },
  { name: 'Marketplace', sales: 5210 },
  { name: 'Pop-up', sales: 2188 },
];
const TOTAL = 123307;
const SHARES = [64120, 34526, 17263, 7398].map((value) => value / TOTAL);

let root: Root | undefined;
let host: HTMLElement | undefined;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
});

async function mount(probe: 'probe-wide' | 'probe-narrow'): Promise<void> {
  host = document.createElement('div');
  host.className = probe;
  document.body.append(host);
  root = createRoot(host);
  const into = root;
  flushSync(() => {
    into.render(
      <DonutChart
        title="Sales by channel"
        data={DATA}
        category={(d) => d.name}
        value={(d) => d.sales}
        format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
      />,
    );
  });
  await settled();
}

async function settled(): Promise<void> {
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function all(selector: string): HTMLElement[] {
  return [...(host?.querySelectorAll<HTMLElement>(selector) ?? [])];
}

function one(selector: string): Element {
  const found = host?.querySelector(selector);
  if (found === null || found === undefined) throw new Error(`no ${selector}`);
  return found;
}

/** A point on the middle of the ring at `turn` (0–1 clockwise from 12 o'clock), inside the svg box. */
function onRing(turn: number): { x: number; y: number } {
  const box = one('.nz-donut-chart-svg').getBoundingClientRect();
  const r = (87 / 200) * box.width;
  const angle = turn * Math.PI * 2;
  return { x: box.width / 2 + r * Math.sin(angle), y: box.height / 2 - r * Math.cos(angle) };
}

/** The turn in the middle of segment `i`. */
function middleOf(i: number): number {
  const before = SHARES.slice(0, i).reduce((sum, share) => sum + share, 0);
  return before + (SHARES[i] ?? 0) / 2;
}

const opacities = (selector: string): number[] =>
  all(selector).map((el) => Number(getComputedStyle(el).opacity));

const shownCentres = (): string[] =>
  all('.nz-donut-chart-center')
    .filter((el) => getComputedStyle(el).visibility === 'visible')
    .map((el) => el.textContent ?? '');

describe('DonutChart geometry', () => {
  test('a 200 px ring beside the legend; 40 % of a narrow chart', async () => {
    await mount('probe-wide');
    const ring = one('.nz-chart-frame-plot').getBoundingClientRect();
    expect([ring.width, ring.height]).toEqual([200, 200]);
    const legend = one('.nz-legend').getBoundingClientRect();
    expect(legend.x).toBeGreaterThanOrEqual(ring.right + 31);
    expect(legend.y).toBeLessThan(ring.bottom);
    root?.unmount();
    host?.remove();
    await mount('probe-narrow');
    const small = one('.nz-chart-frame-plot').getBoundingClientRect();
    expect(small.width).toBeCloseTo(120, 0);
    expect(small.height).toBeCloseTo(small.width, 0);
    // the legend (Figma's 120 px name column at most) still fits beside the ring: no overflow
    const figure = one('.nz-donut-chart');
    expect(one('.nz-legend').getBoundingClientRect().right).toBeLessThanOrEqual(
      figure.getBoundingClientRect().right + 0.5,
    );
    expect(figure.scrollWidth).toBeLessThanOrEqual(figure.clientWidth);
  });

  test('the gaps between segments show the page', async () => {
    await mount('probe-wide');
    const base64 = await page.screenshot({ element: one('.nz-chart-frame-plot'), save: false });
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('no 2d context');
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
    // onRing is in CSS pixels; the screenshot is in device pixels (NZ_DPR=2 doubles it)
    const dpr = image.width / one('.nz-chart-frame-plot').getBoundingClientRect().width;
    const at = (turn: number): number => {
      const { x, y } = onRing(turn);
      const o = (Math.round(y * dpr) * image.width + Math.round(x * dpr)) * 4;
      return (image.data[o] ?? 0) + (image.data[o + 1] ?? 0) + (image.data[o + 2] ?? 0);
    };
    // the boundary at 12 o'clock and between the first two segments: white; their middles: ink
    expect(at(0)).toBeGreaterThan(700);
    expect(at(SHARES[0] ?? 0)).toBeGreaterThan(700);
    expect(at(middleOf(0))).toBeLessThan(400);
    expect(at(middleOf(1))).toBeLessThan(600);
  });
});

describe('DonutChart hover (CSS only)', () => {
  test('a segment dims the others, its legend row stays, the centre shows its share', async () => {
    await mount('probe-wide');
    expect(shownCentres()).toEqual(['$123.3KTotal']);
    await userEvent.hover(one('.nz-donut-chart-svg'), { position: onRing(middleOf(1)) });
    await settled();
    expect(opacities('.nz-donut-chart-segment')).toEqual([0.35, 1, 0.35, 0.35]);
    expect(opacities('.nz-legend-item')).toEqual([0.45, 1, 0.45, 0.45]);
    expect(shownCentres()).toEqual(['28%Point of sale']);
    await userEvent.unhover(one('.nz-donut-chart-svg'));
    await settled();
    expect(opacities('.nz-donut-chart-segment')).toEqual([1, 1, 1, 1]);
    expect(shownCentres()).toEqual(['$123.3KTotal']);
  });

  test('a legend row focuses its segment', async () => {
    await mount('probe-wide');
    const row = all('.nz-legend-item')[3];
    if (row === undefined) throw new Error('no row');
    await userEvent.hover(row);
    await settled();
    expect(opacities('.nz-donut-chart-segment')).toEqual([0.35, 0.35, 0.35, 1]);
    expect(shownCentres()).toEqual(['6%Other']);
  });
});
