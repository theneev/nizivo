// BarChart with the ChartInteraction island's column mode (M40 item 2, 2026-10-20), hydrated from
// the server HTML as a page gets it: one tab stop over the plot; ArrowLeft / ArrowRight / Home / End
// rove over the bars (following the screen when mirrored); the active band carries
// `data-highlighted`, which dims the other bars by opacity; the island's ChartTooltip card sits
// beside the bar, never over it; the polite region speaks "title, series, value"; a pointer does
// the same without speaking; Escape dismisses a card wherever focus is (WCAG 1.4.13); nothing in
// the layout moves; a new xDirection remounts the island. Styled by the shipped stylesheets only
// (tokens.css and dist/styles.css), so build first. Geometry is checked in CSS pixels, so `NZ_DPR=2` runs the same assertions.
import { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { BarChart } from '../../src/bar-chart/index';
import type { ChartXDirection } from '../../src/chart-frame/index';

const STYLES = import.meta.glob(['../../../tokens/dist/tokens.css', '../../dist/styles.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
if (Object.keys(STYLES).length !== 2) {
  throw new Error('a stylesheet is missing: build @nizivo/tokens and @nizivo/charts first');
}
const sheet = document.createElement('style');
// Test scaffolding only: a white page and a 1252 px frame, whose plot is 1200 px (the y gutter is
// 2.75rem plus 8 px): four 300 px bands, bars centred at 150, 450, 750 and 1050.
sheet.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe { inline-size: 1252px; }`;
document.head.append(sheet);

interface Datum {
  day: string;
  orders: number | null;
}

// Wednesday has no value: a band with no bar, still a column the keys reach
const DATA: Datum[] = [
  { day: 'Mon', orders: 120 },
  { day: 'Tue', orders: 300 },
  { day: 'Wed', orders: null },
  { day: 'Thu', orders: 210 },
];

const roots: Root[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  const before = document.querySelector<HTMLElement>('input[aria-label="Before"]');
  if (before !== null) await userEvent.hover(before);
  document.body.replaceChildren();
});

interface Mounted {
  container: HTMLElement;
  plot: HTMLElement;
  layer: HTMLElement;
  live: HTMLElement;
  bands: HTMLElement[];
  problems: unknown[];
  serverHtml: string;
}

async function hydrate(xDirection: ChartXDirection = 'ltr', dir?: 'rtl'): Promise<Mounted> {
  const app = (
    <BarChart
      title="Orders"
      data={DATA}
      x="day"
      y="orders"
      xDirection={xDirection}
      labels={{ value: 'Orders' }}
    />
  );
  const serverHtml = renderToString(app);
  const container = document.createElement('div');
  container.className = 'probe';
  container.innerHTML = serverHtml;
  const before = document.createElement('input');
  before.setAttribute('aria-label', 'Before');
  const page = document.createElement('div');
  if (dir !== undefined) page.dir = dir;
  page.append(before, container);
  document.body.append(page);
  const problems: unknown[] = [];
  await act(async () => {
    roots.push(hydrateRoot(container, app, { onRecoverableError: (e) => problems.push(e) }));
  });
  await settled();
  const plot = container.querySelector<HTMLElement>('[data-slot="chart-frame-plot"]');
  const layer = container.querySelector<HTMLElement>('.nz-chart-interaction');
  const live = container.querySelector<HTMLElement>('[aria-live]');
  if (plot === null || layer === null || live === null) throw new Error('no island');
  return {
    container,
    plot,
    layer,
    live,
    bands: [...container.querySelectorAll<HTMLElement>('[data-slot="bar-chart-band"]')],
    problems,
    serverHtml,
  };
}

/** Every running animation and transition finished, then two frames. */
async function settled(): Promise<void> {
  await Promise.all(document.getAnimations().map((animation) => animation.finished));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

const rect = (el: Element): DOMRect => el.getBoundingClientRect();
const card = (m: Mounted): HTMLElement | null =>
  m.layer.querySelector<HTMLElement>('.nz-chart-interaction-tip');
const title = (m: Mounted): string | undefined =>
  card(m)?.querySelector('.nz-chart-tooltip-title')?.textContent ?? undefined;
/** The index of every band carrying data-highlighted. */
const highlighted = (m: Mounted): number[] =>
  m.bands.flatMap((band, i) => (band.hasAttribute('data-highlighted') ? [i] : []));
/** Each band's bar opacity (a band with no bar reads as null). */
const opacities = (m: Mounted): Array<number | null> =>
  m.bands.map((band) => {
    const bar = band.querySelector('.nz-bar-chart-bar');
    return bar === null ? null : Number(getComputedStyle(bar).opacity);
  });
/** The bar's svg box in band `i`. */
const barBox = (m: Mounted, i: number): DOMRect => {
  const svg = m.bands[i]?.querySelector('.nz-bar-chart-svg');
  if (svg === null || svg === undefined) throw new Error(`no bar in band ${String(i)}`);
  return rect(svg);
};

/** The input before the chart: somewhere off the plot. */
function outside(): HTMLElement {
  const input = document.querySelector<HTMLElement>('input[aria-label="Before"]');
  if (input === null) throw new Error('no input');
  return input;
}

async function tabIn(): Promise<void> {
  document.querySelector<HTMLInputElement>('input[aria-label="Before"]')?.focus();
  await userEvent.tab();
}

/** Hover the layer over band `i`, a little inside its start edge. */
async function hoverBand(m: Mounted, i: number): Promise<void> {
  const band = m.bands[i];
  if (band === undefined) throw new Error('no band');
  const plot = rect(m.layer);
  const box = rect(band);
  await userEvent.hover(m.layer, {
    position: { x: box.left - plot.left + box.width / 2, y: plot.height / 2 },
  });
}

describe('BarChart column mode: hydration', () => {
  test('hydrates without a mismatch; the server HTML has no style, no highlight, no CSS tooltip', async () => {
    const m = await hydrate();
    expect(m.problems).toEqual([]);
    expect(m.serverHtml).not.toContain('style=');
    expect(m.serverHtml).not.toContain('data-highlighted');
    expect(m.serverHtml).not.toContain('nz-bar-chart-tooltip');
    expect(m.container.querySelector('[style]')).toBeNull();
    expect(m.bands).toHaveLength(4);
    expect(highlighted(m)).toEqual([]);
    expect(card(m)).toBeNull();
    // the layer covers the whole plot, over the bands
    expect(rect(m.layer).toJSON()).toEqual(rect(m.plot).toJSON());
    expect(document.elementFromPoint(rect(m.bands[1] ?? m.plot).x + 10, rect(m.plot).y + 10)).toBe(
      m.layer,
    );
    expect(opacities(m)).toEqual([1, 1, null, 1]);
  });
});

describe('BarChart column mode: the keyboard', () => {
  test('one tab stop: Tab highlights the last bar, dims the others and speaks it', async () => {
    const m = await hydrate();
    expect(m.container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    await tabIn();
    expect(document.activeElement).toBe(m.layer);
    expect(m.layer.getAttribute('aria-label')).toBe('Orders');
    expect(highlighted(m)).toEqual([3]);
    expect(title(m)).toBe('Thu');
    expect(m.live.textContent).toBe('Thu, Orders, 210');
    await settled();
    expect(opacities(m)).toEqual([0.35, 0.35, null, 1]);
  });

  test('the arrows, Home and End rove over every band, the one with no bar included', async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{ArrowLeft}');
    expect(highlighted(m)).toEqual([2]);
    expect(m.live.textContent).toBe('Wed, Orders, No value');
    expect(card(m)?.textContent).toContain('No value');
    await settled();
    expect(opacities(m)).toEqual([0.35, 0.35, null, 0.35]);
    await userEvent.keyboard('{Home}');
    expect(highlighted(m)).toEqual([0]);
    expect(m.live.textContent).toBe('Mon, Orders, 120');
    await userEvent.keyboard('{ArrowRight}');
    expect(highlighted(m)).toEqual([1]);
    expect(title(m)).toBe('Tue');
    await userEvent.keyboard('{End}');
    expect(highlighted(m)).toEqual([3]);
  });

  test('Escape hides the card and clears the highlight; Tab out empties the region', async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{Escape}');
    expect(card(m)).toBeNull();
    expect(highlighted(m)).toEqual([]);
    await settled();
    expect(opacities(m)).toEqual([1, 1, null, 1]);
    const next = document.createElement('input');
    next.setAttribute('aria-label', 'Next');
    document.body.append(next);
    await userEvent.tab();
    expect(m.live.textContent).toBe('');
  });
});

describe('BarChart column mode: the card', () => {
  test("Figma 03's fixed-width ChartTooltip card, beside the bar and never over it", async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{Home}');
    await settled();
    const first = card(m);
    if (first === null) throw new Error('no card');
    // the island's card, not BarChart's CSS tooltip: Figma 03's 200 px card
    expect(first.classList.contains('nz-chart-tooltip')).toBe(true);
    expect(rect(first).width).toBeCloseTo(200, 0);
    expect(first.dataset['side']).toBe('right');
    const bar = barBox(m, 0);
    expect(bar.width).toBeCloseTo(22, 1);
    // 14 px off the band's centre: 3 px clear of the 22 px bar's edge
    expect(rect(first).left).toBeGreaterThanOrEqual(bar.right);
    expect(Math.abs(rect(first).left - (bar.left + bar.width / 2) - 14)).toBeLessThanOrEqual(1);
    await userEvent.keyboard('{End}');
    await settled();
    const last = card(m);
    if (last === null) throw new Error('no card');
    expect(last.dataset['side']).toBe('left');
    const end = barBox(m, 3);
    expect(rect(last).right).toBeLessThanOrEqual(end.left);
    // inside the plot
    expect(rect(last).left).toBeGreaterThanOrEqual(rect(m.plot).left);
  });

  test('showing the card and moving the highlight move nothing in the layout', async () => {
    const m = await hydrate();
    const boxes = (): unknown[] => [...m.bands, m.plot].map((el) => rect(el).toJSON());
    const before = boxes();
    await tabIn();
    await userEvent.keyboard('{Home}{ArrowRight}');
    await hoverBand(m, 3);
    await settled();
    expect(boxes()).toEqual(before);
  });
});

describe('BarChart column mode: the pointer', () => {
  test('hovering a band highlights it and shows its card, without speaking', async () => {
    const m = await hydrate();
    for (const i of [1, 3, 0, 2]) {
      // oxlint-disable-next-line no-await-in-loop -- one hover after the other
      await hoverBand(m, i);
      expect(highlighted(m)).toEqual([i]);
      expect(title(m)).toBe(DATA[i]?.day);
    }
    await hoverBand(m, 1);
    await settled();
    expect(opacities(m)).toEqual([0.35, 1, null, 0.35]);
    expect(m.live.textContent).toBe('');
    // leave the plot (unhover would park the pointer at the body's centre, over this wide chart)
    await userEvent.hover(outside());
    expect(highlighted(m)).toEqual([]);
    expect(card(m)).toBeNull();
  });

  test('WCAG 1.4.13: Escape dismisses a pointer-shown card while focus is elsewhere', async () => {
    const m = await hydrate();
    document.querySelector<HTMLInputElement>('input[aria-label="Before"]')?.focus();
    await hoverBand(m, 1);
    expect(highlighted(m)).toEqual([1]);
    await userEvent.keyboard('{Escape}');
    expect(card(m)).toBeNull();
    expect(highlighted(m)).toEqual([]);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Before');
  });

  test('WCAG 1.4.13 persistent: with the pointer on the card a card stays, no timeout', async () => {
    const m = await hydrate();
    await hoverBand(m, 0);
    const tip = card(m);
    if (tip === null) throw new Error('no card');
    const plot = rect(m.layer);
    const box = rect(tip);
    // onto the card's middle: a card never disappears, but it is the card of the band under the
    // pointer (so it cannot be held on one bar: not "hoverable" in 1.4.13's sense)
    await userEvent.hover(m.layer, {
      position: { x: box.left - plot.left + box.width / 2, y: box.top - plot.top + box.height / 2 },
    });
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(card(m)).not.toBeNull();
    expect(highlighted(m)).toHaveLength(1);
    expect(title(m)).toBe(DATA[highlighted(m)[0] ?? -1]?.day);
  });
});

describe('BarChart column mode: a mirrored plot', () => {
  test('a new xDirection on a live chart remounts the island, which follows the new mirror', async () => {
    const m = await hydrate('ltr');
    const root = roots.at(-1);
    if (root === undefined) throw new Error('no root');
    await act(async () => {
      root.render(
        <BarChart
          title="Orders"
          data={DATA}
          x="day"
          y="orders"
          xDirection="rtl"
          labels={{ value: 'Orders' }}
        />,
      );
    });
    await settled();
    const layer = m.container.querySelector<HTMLElement>('.nz-chart-interaction');
    if (layer === null) throw new Error('no layer');
    const now = { ...m, layer };
    expect(barBox(now, 0).left).toBeGreaterThan(barBox(now, 1).left);
    // the rightmost band is Monday's now
    await hoverBand(now, 0);
    expect(highlighted(now)).toEqual([0]);
    expect(title(now)).toBe('Mon');
  });

  test.each([
    ['xDirection="rtl"', 'rtl', undefined],
    ['xDirection="auto" under dir="rtl"', 'auto', 'rtl'],
  ] as const)(
    '%s: the bars run right to left, and so do the keys and the pointer',
    async (_name, xDirection, dir) => {
      const m = await hydrate(xDirection, dir);
      expect(barBox(m, 0).left).toBeGreaterThan(barBox(m, 1).left);
      await tabIn();
      expect(highlighted(m)).toEqual([3]);
      // ArrowRight goes right on screen, back in time here
      await userEvent.keyboard('{ArrowLeft}');
      expect(highlighted(m)).toEqual([3]);
      await userEvent.keyboard('{ArrowRight}');
      expect(highlighted(m)).toEqual([2]);
      // the pointer over the rightmost band is Monday's
      await hoverBand(m, 0);
      expect(highlighted(m)).toEqual([0]);
      expect(title(m)).toBe('Mon');
      await settled();
      const tip = card(m);
      if (tip === null) throw new Error('no card');
      expect(tip.dataset['side']).toBe('left');
      expect(rect(tip).right).toBeLessThanOrEqual(barBox(m, 0).left);
    },
  );
});
