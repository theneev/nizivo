// BarChart's geometry in a real layout engine (ARCHITECTURE.md §14.1; Figma 03 "Bar Chart"): bars
// are at most 22 px wide however wide the plot is, narrow with their band when it is small, sit
// centred under their band, are rounded only at the data end (a negative bar at its bottom), and,
// with interaction="none", hover dims the other bars by opacity and shows the band's tooltip in CSS
// alone (the island's column mode is bar-chart-interaction.spec.tsx). The bar is a
// <rect> with percentage attributes in an <svg> with no viewBox, clipped at the baseline by a nested
// <svg>: this spec is what proves that technique in Chromium, Firefox and WebKit
// (`NZ_BROWSER=webkit pnpm test:browser`, or firefox). Styled by the shipped stylesheets only
// (tokens.css and this package's dist/styles.css), so build first.
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { BarChart } from '../../src/bar-chart/index';
import type { ChartInteractionMode, ChartXDirection } from '../../src/chart-frame/index';

const STYLES = import.meta.glob(['../../../tokens/dist/tokens.css', '../../dist/styles.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
if (Object.keys(STYLES).length !== 2) {
  throw new Error('a stylesheet is missing: build @nizivo/tokens and @nizivo/charts first');
}
const sheet = document.createElement('style');
// Test scaffolding only: a white page and two frame widths. The y gutter is 2.75rem plus its 8 px
// padding (52 px), so a 1252 px frame has a 1200 px plot: four 300 px bands, whole-pixel centres.
sheet.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe-wide { inline-size: 1252px; }
.probe-narrow { inline-size: 212px; }`;
document.head.append(sheet);

interface Datum {
  day: string;
  value: number;
}

const DATA: Datum[] = [
  { day: 'Mon', value: 120 },
  { day: 'Tue', value: 300 },
  { day: 'Wed', value: -80 },
  { day: 'Thu', value: 210 },
];

let root: Root | undefined;
let host: HTMLElement | undefined;

afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
});

async function mount(
  probe: 'probe-wide' | 'probe-narrow',
  xDirection: ChartXDirection = 'ltr',
  interaction: ChartInteractionMode = 'nizivo',
): Promise<HTMLElement> {
  host = document.createElement('div');
  host.className = probe;
  document.body.append(host);
  root = createRoot(host);
  const into = root;
  flushSync(() => {
    into.render(
      <BarChart
        title="Orders"
        data={DATA}
        x={(d) => d.day}
        y={(d) => d.value}
        xDirection={xDirection}
        interaction={interaction}
      />,
    );
  });
  await settled();
  return host;
}

async function settled(): Promise<void> {
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function all(selector: string): HTMLElement[] {
  return [...(host?.querySelectorAll<HTMLElement>(selector) ?? [])];
}

function one(selector: string): HTMLElement {
  const found = host?.querySelector<HTMLElement>(selector);
  if (found === null || found === undefined) throw new Error(`no ${selector}`);
  return found;
}

/** The plot as RGBA pixels, from the browser's own screenshot of it. */
async function pixels(): Promise<ImageData> {
  const base64 = await page.screenshot({ element: one('.nz-chart-frame-plot'), save: false });
  const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d context');
  context.drawImage(bitmap, 0, 0);
  return context.getImageData(0, 0, bitmap.width, bitmap.height);
}

/** A computed colour (any CSS syntax) as sRGB bytes, through a canvas. */
function rgb(color: string): [number, number, number] {
  const canvas = new OffscreenCanvas(1, 1);
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('no 2d context');
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** How much of a pixel the bar covers, 0–1, against the white page (on its deepest channel). */
function coverage(image: ImageData, x: number, y: number, ink: [number, number, number]): number {
  const o = (y * image.width + x) * 4;
  let channel = 0;
  for (const c of [1, 2]) if ((ink[c] ?? 0) < (ink[channel] ?? 0)) channel = c;
  const depth = 255 - (ink[channel] ?? 0);
  return Math.min(1, Math.max(0, (255 - (image.data[o + channel] ?? 255)) / depth));
}

/**
 * The first and last rows of one pixel column the bar paints (over half covered), `x` and the
 * result in CSS pixels: the screenshot is in device pixels, so at `NZ_DPR=2` it is twice the plot.
 */
function extent(
  image: ImageData,
  x: number,
  ink: [number, number, number],
): { top: number; bottom: number } {
  const dpr = image.width / one('.nz-chart-frame-plot').getBoundingClientRect().width;
  const column = Math.round(x * dpr);
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    if (coverage(image, column, y, ink) > 0.5) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  return top < 0 ? { top, bottom } : { top: top / dpr, bottom: (bottom + 1) / dpr - 1 };
}

/** Each bar's box relative to the plot, in CSS pixels. */
function bars(): DOMRect[] {
  const plot = one('.nz-chart-frame-plot').getBoundingClientRect();
  return all('.nz-bar-chart-svg').map((svg) => {
    const box = svg.getBoundingClientRect();
    return new DOMRect(box.x - plot.x, box.y - plot.y, box.width, box.height);
  });
}

describe('BarChart geometry', () => {
  test('bars are 22 px wide on a wide plot, centred in their band', async () => {
    await mount('probe-wide');
    expect(one('.nz-chart-frame-plot').getBoundingClientRect().width).toBe(1200);
    const boxes = bars();
    expect(boxes).toHaveLength(4);
    boxes.forEach((box, i) => {
      expect(box.width).toBeCloseTo(22, 1);
      expect(box.x + box.width / 2).toBeCloseTo(150 + i * 300, 1);
    });
    // the <rect> fills its svg's width: one user unit is one CSS pixel (no viewBox)
    for (const rect of all('.nz-bar-chart-bar')) {
      expect(rect.getBoundingClientRect().width).toBeCloseTo(22, 1);
    }
  });

  test('on a narrow plot a bar narrows with its band (52 % of it), keeping a gap', async () => {
    await mount('probe-narrow');
    const plot = one('.nz-chart-frame-plot').getBoundingClientRect().width;
    expect(plot).toBe(160);
    const height = one('.nz-chart-frame-plot').getBoundingClientRect().height;
    expect(height).toBeLessThan(150); // under an svg's intrinsic height, which must not leak in
    for (const box of bars()) {
      expect(box.width).toBeCloseTo((plot / 4) * 0.52, 1);
      expect(box.height).toBeCloseTo(height, 1);
    }
  });

  test('rounded at the data end only, a negative bar at its bottom', async () => {
    await mount('probe-wide');
    const image = await pixels();
    const ink = rgb(getComputedStyle(one('.nz-bar-chart-bar')).fill);
    const zero = one('.nz-chart-baseline').getBoundingClientRect().y;
    const plotTop = one('.nz-chart-frame-plot').getBoundingClientRect().y;
    const base = Math.round(zero - plotTop);
    // Per bar: how far the corner column falls short of the middle column at the data end (the
    // 4 px radius cuts it) and at the baseline end (square: no shortfall), and whether the bar
    // stays on its side of the baseline. A negative bar's data end is its bottom.
    const measured = bars().map((box, i) => {
      const edge = extent(image, box.x, ink);
      const middle = extent(image, box.x + box.width / 2, ink);
      const up = (DATA[i]?.value ?? 0) > 0;
      const dataEnd = up ? edge.top - middle.top : middle.bottom - edge.bottom;
      const baseEnd = up ? middle.bottom - edge.bottom : edge.top - middle.top;
      return {
        paints: middle.top >= 0,
        roundedAtDataEnd: dataEnd >= 1.5,
        squareAtBaseline: Math.abs(baseEnd) <= 1,
        onItsSide: up ? middle.bottom <= base : middle.top >= base - 1,
      };
    });
    const ok = { paints: true, roundedAtDataEnd: true, squareAtBaseline: true, onItsSide: true };
    expect(measured).toEqual([ok, ok, ok, ok]);
  });

  test('the niced domain keeps the tallest bar at or under the top tick', async () => {
    await mount('probe-wide');
    const image = await pixels();
    const ink = rgb(getComputedStyle(one('.nz-bar-chart-bar')).fill);
    const tallest = bars()[1];
    if (tallest === undefined) throw new Error('no bar');
    const { top } = extent(image, tallest.x + tallest.width / 2, ink);
    // 300 on a 0–300 domain touches the top gridline; the y labels end at the domain's top
    expect(top).toBeGreaterThanOrEqual(0);
    expect(all('.nz-chart-frame-y-ticks .nz-chart-frame-tick')[0]?.textContent).toBe('300');
  });

  test('xDirection="rtl" mirrors the bands with their labels', async () => {
    await mount('probe-wide', 'rtl');
    const [first, , , last] = bars();
    expect(first?.x).toBeGreaterThan(last?.x ?? Infinity);
    const labels = all('.nz-chart-frame-x-ticks .nz-chart-frame-tick');
    const mon = labels.find((label) => label.textContent === 'Mon')?.getBoundingClientRect();
    const plot = one('.nz-chart-frame-plot').getBoundingClientRect();
    expect((mon?.x ?? 0) + (mon?.width ?? 0) / 2 - plot.x).toBeCloseTo(1050, 0);
  });
});

describe('BarChart in a narrow container', () => {
  test.each(['nizivo', 'none'] as const)(
    'interaction="%s": the island layer or the hidden tooltips add no scrollable overflow',
    async (interaction) => {
      await mount('probe-narrow', 'ltr', interaction);
      // test scaffolding: make the probe its own scroll container, as a phone viewport is
      if (host === undefined) throw new Error('no host');
      host.style.overflow = 'auto';
      expect(host.scrollWidth).toBe(host.clientWidth);
      expect(host.scrollHeight).toBe(host.clientHeight);
    },
  );
});

describe('BarChart hover with interaction="none" (CSS only)', () => {
  test('hovering a band dims the other bars by opacity and shows its tooltip', async () => {
    await mount('probe-wide', 'ltr', 'none');
    const bands = all('.nz-bar-chart-band');
    const tooltip = (i: number): CSSStyleDeclaration =>
      getComputedStyle(bands[i]?.querySelector('.nz-bar-chart-tooltip') ?? document.body);
    expect(tooltip(1).display).toBe('none');
    const target = bands[1];
    if (target === undefined) throw new Error('no band');
    // anywhere in the column counts: hover its top edge, far above the bar
    await userEvent.hover(target, { position: { x: 20, y: 2 } });
    await settled();
    const opacity = all('.nz-bar-chart-bar').map((rect) => Number(getComputedStyle(rect).opacity));
    expect(opacity).toEqual([0.35, 1, 0.35, 0.35]);
    expect(tooltip(1).display).toBe('grid');
    expect(tooltip(1).opacity).toBe('1');
    expect(tooltip(0).display).toBe('none');
    // the tooltip opens beside the band, never over its bar
    const tip = bands[1]?.querySelector('.nz-bar-chart-tooltip')?.getBoundingClientRect();
    const bar = bars()[1];
    const plotX = one('.nz-chart-frame-plot').getBoundingClientRect().x;
    expect((tip?.x ?? 0) - plotX).toBeGreaterThanOrEqual((bar?.x ?? 0) + (bar?.width ?? 0));
    await userEvent.unhover(target);
  });
});
