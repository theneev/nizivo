// The v0.2 stroke check as a spec (ARCHITECTURE.md §10.8, §14.1, R14): in a percent-space viewBox
// (0 0 100 100, preserveAspectRatio="none") a 2 px `vector-effect: non-scaling-stroke` line stays
// 2 px wide whatever the plot's aspect ratio, after a resize, mirrored for xDirection="rtl"
// (scale: -1 1) and after the clip-path reveal; a 1 px grid line stays 1 px; a diagonal line's ink
// down one column is 2 / cos θ (θ its on-screen slope), where a scaling stroke would be far thicker.
//
// It is the 2026-10-19 scratch check (stroke-check.ts and diag.ts) on the real thing: React renders
// a <ChartFrame> around a renderer-shaped SVG, styled by the shipped stylesheets only (tokens.css and
// this package's dist/styles.css, the charts-only route), and the plot is sized through the frame's
// own hook (--nz-chart-frame-aspect), so a change to the frame, .nz-chart-svg, .nz-chart-line or
// .nz-chart-grid that breaks a stroke fails here. Every engine: `NZ_BROWSER=webkit pnpm test:browser`
// (or firefox). `NZ_DPR=2` runs it at DPR 2 (test/browser-engine.ts; the lane's default is 1), and
// every measure here is in device pixels over the DPR.
import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { ChartFrame, type ChartXDirection } from '../../src/chart-frame/index';

const STYLES = import.meta.glob(['../../../tokens/dist/tokens.css', '../../dist/styles.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
if (Object.keys(STYLES).length !== 2) {
  throw new Error('a stylesheet is missing: build @nizivo/tokens and @nizivo/charts first');
}

const SIZES = [
  [600, 160],
  [300, 300],
  [1200, 120],
  [160, 600],
] as const;
type Size = readonly [number, number];

// Test scaffolding only: a white page, and each probe size as a rule on the wrapper. The plot's
// height comes from the frame's own aspect hook, as a consumer sets it.
const scaffold = [...SIZES, [900, 150] as const, [200, 400] as const]
  .map(
    ([w, h]) =>
      `[data-probe="${w}x${h}"] { inline-size: ${w}px; --nz-chart-frame-aspect: ${w} / ${h}; }`,
  )
  .join('\n');
const style = document.createElement('style');
style.textContent = `${Object.values(STYLES).join('\n')}\nbody { margin: 0; background: #fff; }\n${scaffold}`;
document.head.append(style);

let root: Root | undefined;
let host: HTMLElement | undefined;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
});

const TABLE = { columns: ['x', 'y'], rows: [['0', '50']] };

/** A renderer-shaped plot: percent space, the shared mark classes, the frame's own reveal. */
function Probe({ marks, direction }: { marks: ReactElement; direction: ChartXDirection }) {
  return (
    <ChartFrame title="Stroke probe" table={TABLE} axes="none" xDirection={direction}>
      <svg
        className="nz-chart-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {marks}
      </svg>
    </ChartFrame>
  );
}

const CROSS = (
  <>
    <path className="nz-chart-line" data-series="current" d="M0,50H100" />
    <path className="nz-chart-line" data-series="current" d="M50,0V100" />
  </>
);
const GRID = <line className="nz-chart-grid" x1="0" x2="100" y1="50" y2="50" />;
const DIAGONAL = <path className="nz-chart-line" data-series="current" d="M0,100L100,0" />;

function mount(
  [width, height]: Size,
  marks: ReactElement = CROSS,
  direction: ChartXDirection = 'ltr',
): void {
  host = document.createElement('div');
  host.dataset['probe'] = `${width}x${height}`;
  document.body.append(host);
  const r = createRoot(host);
  root = r;
  flushSync(() => r.render(<Probe marks={marks} direction={direction} />));
  align();
}

function resize([width, height]: Size): void {
  if (host === undefined) throw new Error('nothing mounted');
  host.dataset['probe'] = `${width}x${height}`;
  align();
}

/**
 * The caption above the plot is text, so the plot may start at a fractional y, which would spread
 * a crisp 2 px line over three rows. The wrapper is nudged down to the next whole pixel.
 */
function align(): void {
  if (host === undefined) return;
  host.style.marginBlockStart = '0px';
  const top = plot().getBoundingClientRect().top;
  host.style.marginBlockStart = `${Math.ceil(top) - top}px`;
}

function plot(): HTMLElement {
  const found = host?.querySelector<HTMLElement>('[data-slot="chart-frame-plot"]');
  if (found === null || found === undefined) throw new Error('no plot');
  return found;
}

function svg(): SVGSVGElement {
  const found = plot().querySelector('svg');
  if (found === null) throw new Error('no svg');
  return found;
}

async function settled(): Promise<void> {
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/** The plot as RGBA pixels, from the browser's own screenshot of it. */
async function pixels(): Promise<ImageData> {
  const base64 = await page.screenshot({ element: plot(), save: false });
  const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d context');
  context.drawImage(bitmap, 0, 0);
  return context.getImageData(0, 0, bitmap.width, bitmap.height);
}

/** A computed stroke colour (any CSS colour syntax) as sRGB bytes, through a canvas. */
function rgb(color: string): [number, number, number] {
  const canvas = new OffscreenCanvas(1, 1);
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d context');
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/**
 * How much of a pixel the stroke covers, 0–1, against the white page: measured on the channel where
 * the stroke differs most from white, so a light grid colour reads as well as the dark line.
 */
function coverage(image: ImageData, x: number, y: number, ink: [number, number, number]): number {
  const o = (y * image.width + x) * 4;
  const channel = [0, 1, 2].reduce(
    (best, c) => (255 - (ink[c] ?? 0) > 255 - (ink[best] ?? 0) ? c : best),
    0,
  );
  const depth = 255 - (ink[channel] ?? 0);
  return Math.min(1, Math.max(0, (255 - (image.data[o + channel] ?? 255)) / depth));
}

/** Pixels the stroke clearly paints (over half covered) along one column or row, and their ink. */
function run(
  image: ImageData,
  axis: 'column' | 'row',
  at: number,
  ink: [number, number, number],
): { count: number; sum: number } {
  let count = 0;
  let sum = 0;
  const length = axis === 'column' ? image.height : image.width;
  for (let i = 0; i < length; i += 1) {
    const [x, y] = axis === 'column' ? [at, i] : [i, at];
    const c = coverage(image, x, y, ink);
    sum += c;
    if (c > 0.5) count += 1;
  }
  return { count, sum };
}

function stroke(selector: string): [number, number, number] {
  const mark = svg().querySelector(selector);
  if (mark === null) throw new Error(`no ${selector}`);
  return rgb(getComputedStyle(mark).stroke);
}

/** Thickness, in CSS px, of the horizontal line (a column at 25 %), the vertical one (a row at
 * 25 %), and the horizontal line near the end (the reveal finished; the mirror clipped nothing). */
async function strokes(): Promise<{ horizontal: number; vertical: number; end: number }> {
  await settled();
  const image = await pixels();
  const dpr = image.width / plot().getBoundingClientRect().width;
  const ink = stroke('.nz-chart-line');
  return {
    horizontal: run(image, 'column', Math.floor(image.width * 0.25), ink).count / dpr,
    vertical: run(image, 'row', Math.floor(image.height * 0.25), ink).count / dpr,
    end: run(image, 'column', Math.floor(image.width * 0.97), ink).count / dpr,
  };
}

const TWO = { horizontal: 2, vertical: 2, end: 2 };

describe('non-scaling strokes in percent space (R14), in a real ChartFrame', () => {
  test.each(SIZES)('a 2 px line stays 2 px in a %i × %i plot', async (width, height) => {
    mount([width, height]);
    const box = plot().getBoundingClientRect();
    expect([box.width, box.height]).toEqual([width, height]);
    expect(await strokes()).toEqual(TWO);
  });

  test('after a resize from 300 × 300 to 900 × 150', async () => {
    mount([300, 300]);
    expect(await strokes()).toEqual(TWO);
    resize([900, 150]);
    expect(plot().getBoundingClientRect().height).toBe(150);
    expect(await strokes()).toEqual(TWO);
  });

  test('mirrored for xDirection="rtl" (scale: -1 1)', async () => {
    mount([600, 160], CROSS, 'rtl');
    expect(getComputedStyle(svg()).scale).toBe('-1 1');
    expect(await strokes()).toEqual(TWO);
  });

  test('after the clip-path reveal', async () => {
    mount([600, 160]);
    expect(
      svg()
        .getAnimations()
        .map((a) => (a instanceof CSSAnimation ? a.animationName : '')),
    ).toEqual(['nz-chart-reveal']);
    expect(await strokes()).toEqual(TWO);
  });

  test.each(SIZES)('a 1 px grid line stays 1 px in a %i × %i plot', async (width, height) => {
    mount([width, height], GRID);
    await settled();
    const image = await pixels();
    const dpr = image.width / width;
    const ink = stroke('.nz-chart-grid');
    // a 1 px line centred on a pixel edge spreads over two rows: its ink still sums to 1 px
    const { sum } = run(image, 'column', Math.floor(image.width * 0.25), ink);
    expect(sum / dpr).toBeGreaterThan(0.85);
    expect(sum / dpr).toBeLessThan(1.15);
  });

  test.each([
    [600, 160],
    [1200, 120],
    [200, 400],
  ] as const)(
    'a diagonal in a %i × %i plot inks 2 / cos θ down a column',
    async (width, height) => {
      mount([width, height], DIAGONAL);
      await settled();
      const image = await pixels();
      const dpr = image.width / width;
      const ink = stroke('.nz-chart-line');
      const { sum } = run(image, 'column', Math.floor(image.width / 2), ink);
      const want = (2 * dpr) / Math.cos(Math.atan(height / width));
      // the 2026-10-19 check measured all three engines within 6 %
      expect(Math.abs(sum - want) / want).toBeLessThan(0.1);
    },
  );
});
