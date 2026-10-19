// The end dot in percent space (src/_core/path.ts dotPath; Figma 03: 8 px with a 2 px bg/surface
// halo): a zero-length subpath, drawn round at its CSS stroke width by stroke-linecap: round and
// vector-effect: non-scaling-stroke, whatever the plot's aspect ratio (a <circle> would stretch to
// an ellipse under preserveAspectRatio="none"). Measured in pixels from the browser's own screenshot,
// on AreaChart at three plot shapes and on Sparkline at its Figma size, and the halo is checked to
// cut the line under the dot. Styled by the shipped stylesheets only: build first. Every engine:
// `NZ_BROWSER=webkit pnpm test:browser` (or firefox).
import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { AreaChart } from '../../src/area-chart/index';
import { Sparkline } from '../../src/sparkline/index';

const STYLES = import.meta.glob(['../../../tokens/dist/tokens.css', '../../dist/styles.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
if (Object.keys(STYLES).length !== 2) {
  throw new Error('a stylesheet is missing: build @nizivo/tokens and @nizivo/charts first');
}
const SHAPES = [
  [720, 280],
  [300, 300],
  [1200, 120],
] as const;
// Test scaffolding only: a white page; each shape is the frame's own aspect hook, as a consumer sets it
const style = document.createElement('style');
style.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe { padding: 24px; }
${SHAPES.map(([w, h]) => `[data-shape="${w}x${h}"] { inline-size: ${w}px; --nz-chart-frame-aspect: ${w} / ${h}; }`).join('\n')}`;
document.head.append(style);

let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
});

function mount(node: ReactElement, shape?: string): HTMLElement {
  host = document.createElement('div');
  host.className = 'probe';
  if (shape !== undefined) host.dataset['shape'] = shape;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root?.render(node));
  return host;
}

async function settled(): Promise<void> {
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function pixels(element: Element): Promise<ImageData> {
  const base64 = await page.screenshot({ element, save: false });
  const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d context');
  context.drawImage(bitmap, 0, 0);
  return context.getImageData(0, 0, bitmap.width, bitmap.height);
}

/** Whether the pixel is mostly the dot's ink (chart/primary) rather than the white page or halo. */
function inked(image: ImageData, x: number, y: number): boolean {
  const o = (y * image.width + x) * 4;
  // chart/primary is a dark green: its red channel is far below white's
  return (image.data[o] ?? 255) < 128;
}

/** The dot's painted width and height, in CSS px: the contiguous ink through its centre. */
function extent(image: ImageData, cx: number, cy: number, dpr: number): [number, number] {
  const span = (dx: number, dy: number): number => {
    let n = 0;
    for (let x = cx + dx, y = cy + dy; inked(image, x, y); x += dx, y += dy) n += 1;
    return n;
  };
  if (!inked(image, cx, cy)) return [0, 0];
  return [(span(1, 0) + span(-1, 0) + 1) / dpr, (span(0, 1) + span(0, -1) + 1) / dpr];
}

/** The dot's centre, in the element's screenshot pixels (a zero-length path's box is its point). */
function centre(element: Element, dot: Element, dpr: number): [number, number] {
  const box = element.getBoundingClientRect();
  const at = dot.getBoundingClientRect();
  return [
    Math.floor((at.left + at.width / 2 - box.left) * dpr),
    Math.floor((at.top + at.height / 2 - box.top) * dpr),
  ];
}

// The last value is the highest and the series rises to it, so the dot is clear of the grid lines.
const DATA = Array.from({ length: 12 }, (_, i) => ({
  d: `2026-10-${String(i + 1).padStart(2, '0')}`,
  v: 1000 + i * 500,
}));

describe('the end dot stays a round 8 px dot in percent space', () => {
  test.each(SHAPES)('AreaChart, a %i × %i plot', async (width, height) => {
    const probe = mount(
      <AreaChart title="Sales" data={DATA} x="d" y="v" interaction="none" axes="none" />,
      `${width}x${height}`,
    );
    await settled();
    const plot = probe.querySelector('.nz-chart-frame-plot');
    const dot = probe.querySelector('.nz-area-chart-dot');
    if (plot === null || dot === null) throw new Error('no plot or dot');
    const image = await pixels(plot);
    const dpr = image.width / plot.getBoundingClientRect().width;
    const [cx, cy] = centre(plot, dot, dpr);
    // the dot is centred on the plot's right edge: the screenshot of the plot holds its left half
    const [w, h] = extent(image, Math.min(cx, image.width - 1), cy, dpr);
    expect(h).toBeGreaterThanOrEqual(7);
    expect(h).toBeLessThanOrEqual(9);
    expect(w).toBeGreaterThanOrEqual(3.5);
    expect(w).toBeLessThanOrEqual(5);
    // and the half past the edge is painted too (the reveal's clip leaves room around the plot)
    const wide = await pixels(probe);
    const outer = probe.getBoundingClientRect();
    const [ox, oy] = centre(probe, dot, wide.width / outer.width);
    const [ow, oh] = extent(wide, ox, oy, wide.width / outer.width);
    expect([ow >= 7 && ow <= 9, oh >= 7 && oh <= 9]).toEqual([true, true]);
  });

  test('Sparkline at Figma size (112 × 36): round, and the halo cuts the line under it', async () => {
    const probe = mount(<Sparkline data={DATA.map((d) => d.v)} />);
    await settled();
    const spark = probe.querySelector('.nz-sparkline');
    const dot = probe.querySelector('.nz-sparkline-dot');
    if (spark === null || dot === null) throw new Error('no sparkline');
    const box = spark.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([112, 36]);
    const image = await pixels(spark);
    const dpr = image.width / box.width;
    const [cx, cy] = centre(spark, dot, dpr);
    const [w, h] = extent(image, cx, cy, dpr);
    expect(w).toBeGreaterThanOrEqual(7);
    expect(w).toBeLessThanOrEqual(9);
    expect(h).toBeGreaterThanOrEqual(7);
    expect(h).toBeLessThanOrEqual(9);
    // 5 px left of the centre is the halo (white over the line); 8 px left is the line again
    const left = (px: number): boolean =>
      [-1, 0, 1, 2, 3, 4].some((dy) =>
        inked(image, cx - Math.round(px * dpr), cy + Math.round(dy * dpr)),
      );
    expect(inked(image, cx - Math.round(5 * dpr), cy)).toBe(false);
    expect(left(9)).toBe(true);
  });
});
