// DonutChart with the ChartInteraction island's item mode (M41 item 2, 2026-10-20), hydrated from the
// server HTML as a page gets it: one tab stop over the ring; ArrowLeft / ArrowRight / Home / End rove
// over the slices in data order (clockwise, whatever the page's direction), the first slice first;
// the active segment carries `data-highlighted`, which dims the other segments and legend rows and
// swaps the centre; the island's ChartTooltip card sits at the slice's centre and opens toward the
// legend, never past the chart; its swatch takes the slice's colour; the polite region speaks
// "slice, value label, value, share, of total"; a pointer does the same without speaking, picking
// the segment under it (the gaps and the hole keep the card); Escape on the ring hides only the
// card, and with focus elsewhere hides a pointer-shown card and still reaches an enclosing dialog
// (M41 item 1); nothing in the layout moves. Styled by the shipped stylesheets only (tokens.css and
// dist/styles.css), so build first. Geometry is checked in CSS pixels, so `NZ_DPR=2` runs the same
// assertions. Every engine: `NZ_BROWSER=webkit pnpm test:browser` (or firefox).
import { act, type ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
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
// Test scaffolding only: a white page and two chart widths (a 200 px ring, and 40 % of 300 px)
sheet.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe-wide { inline-size: 640px; }
.probe-narrow { inline-size: 300px; }`;
document.head.append(sheet);

interface Channel {
  name: string;
  sales: number;
}

// Figma 03's numbers: 64,120 + 34,526 + 17,263 + 7,398 (Other) = 123,307
const DATA: Channel[] = [
  { name: 'Online store', sales: 64120 },
  { name: 'Point of sale', sales: 34526 },
  { name: 'Wholesale', sales: 17263 },
  { name: 'Marketplace', sales: 5210 },
  { name: 'Pop-up', sales: 2188 },
];
const SHARES = [64120, 34526, 17263, 7398].map((value) => value / 123307);
const TITLES = ['Online store', 'Point of sale', 'Wholesale', 'Other'];
const SPOKEN = [
  'Online store, Sales, $64,120, 52%, of total',
  'Point of sale, Sales, $34,526, 28%, of total',
  'Wholesale, Sales, $17,263, 14%, of total',
  'Other, Sales, $7,398, 6%, of total',
];

const roots: Root[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  const before = document.querySelector<HTMLElement>('input[aria-label="Before"]');
  // the pointer off the chart for the next test (a closed dialog's field cannot be hovered)
  if (before?.checkVisibility() === true) await userEvent.hover(before);
  document.body.replaceChildren();
});

interface Mounted {
  container: HTMLElement;
  figure: HTMLElement;
  plot: HTMLElement;
  layer: HTMLElement;
  live: HTMLElement;
  segments: SVGPathElement[];
  problems: unknown[];
  serverHtml: string;
}

interface Options {
  probe?: 'probe-wide' | 'probe-narrow';
  dir?: 'rtl';
  data?: Channel[];
}

async function hydrate({ probe = 'probe-wide', dir, data = DATA }: Options = {}): Promise<Mounted> {
  const app = (
    <DonutChart
      title="Sales by channel"
      data={data}
      category="name"
      value="sales"
      format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
      labels={{ value: 'Sales' }}
    />
  );
  const serverHtml = renderToString(app);
  const container = document.createElement('div');
  container.className = probe;
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
  const figure = container.querySelector<HTMLElement>('figure');
  const plot = container.querySelector<HTMLElement>('[data-slot="chart-frame-plot"]');
  const layer = container.querySelector<HTMLElement>('.nz-chart-interaction');
  const live = container.querySelector<HTMLElement>('[aria-live]');
  if (figure === null || plot === null || layer === null || live === null) {
    throw new Error('no island');
  }
  return {
    container,
    figure,
    plot,
    layer,
    live,
    segments: [...container.querySelectorAll<SVGPathElement>('[data-slot="donut-chart-segment"]')],
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
/** The index of every segment carrying data-highlighted. */
const highlighted = (m: Mounted): number[] =>
  m.segments.flatMap((segment, i) => (segment.hasAttribute('data-highlighted') ? [i] : []));
const opacities = (els: Element[]): number[] =>
  els.map((el) => Number(getComputedStyle(el).opacity));
const legendRows = (m: Mounted): HTMLElement[] => [
  ...m.container.querySelectorAll<HTMLElement>('.nz-legend-item'),
];
const shownCentres = (m: Mounted): string[] =>
  [...m.container.querySelectorAll<HTMLElement>('.nz-donut-chart-center')]
    .filter((el) => getComputedStyle(el).visibility === 'visible')
    .map((el) => el.textContent ?? '');

/** The turn in the middle of slice `i` (0–1 clockwise from 12 o'clock). */
function middleOf(i: number): number {
  const before = SHARES.slice(0, i).reduce((sum, share) => sum + share, 0);
  return before + (SHARES[i] ?? 0) / 2;
}

/** A point at `turn` on a circle of `radius` (a fraction of the ring's size), in the layer's box. */
function at(m: Mounted, turn: number, radius = 87 / 200): { x: number; y: number } {
  const box = rect(m.layer);
  const angle = turn * Math.PI * 2;
  return {
    x: box.width / 2 + radius * box.width * Math.sin(angle),
    y: box.height / 2 - radius * box.height * Math.cos(angle),
  };
}

async function tabIn(): Promise<void> {
  document.querySelector<HTMLInputElement>('input[aria-label="Before"]')?.focus();
  await userEvent.tab();
}

async function hoverSlice(m: Mounted, i: number): Promise<void> {
  await userEvent.hover(m.layer, { position: at(m, middleOf(i)) });
}

describe('DonutChart item mode: hydration', () => {
  test('hydrates without a mismatch; the server HTML has no style, no highlight, no card', async () => {
    const m = await hydrate();
    expect(m.problems).toEqual([]);
    expect(m.serverHtml).not.toContain('style=');
    expect(m.serverHtml).not.toContain('data-highlighted');
    expect(m.container.querySelector('[style]')).toBeNull();
    expect(m.segments).toHaveLength(4);
    expect(highlighted(m)).toEqual([]);
    expect(card(m)).toBeNull();
    // the layer covers the whole ring, over the segments, and its focus ring is round
    expect(rect(m.layer).toJSON()).toEqual(rect(m.plot).toJSON());
    const { x, y } = at(m, middleOf(0));
    expect(document.elementFromPoint(rect(m.layer).x + x, rect(m.layer).y + y)).toBe(m.layer);
    expect(getComputedStyle(m.layer).borderTopLeftRadius).not.toBe('0px');
    expect(opacities(m.segments)).toEqual([1, 1, 1, 1]);
    expect(shownCentres(m)).toEqual(['$123.3KTotal']);
  });
});

describe('DonutChart item mode: the keyboard', () => {
  test('one tab stop: Tab highlights the first slice, dims the rest and speaks it', async () => {
    const m = await hydrate();
    expect(m.container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    await tabIn();
    expect(document.activeElement).toBe(m.layer);
    expect(m.layer.getAttribute('aria-label')).toBe('Sales by channel');
    expect(highlighted(m)).toEqual([0]);
    expect(title(m)).toBe('Online store');
    expect(m.live.textContent).toBe(SPOKEN[0]);
    await settled();
    expect(opacities(m.segments)).toEqual([1, 0.35, 0.35, 0.35]);
    expect(opacities(legendRows(m))).toEqual([1, 0.45, 0.45, 0.45]);
    expect(shownCentres(m)).toEqual(['52%Online store']);
  });

  test('the arrows go in data order (clockwise), Home and End to the ends, and stop there', async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{ArrowLeft}');
    expect(highlighted(m)).toEqual([0]);
    await userEvent.keyboard('{ArrowRight}');
    expect(highlighted(m)).toEqual([1]);
    expect(m.live.textContent).toBe(SPOKEN[1]);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(highlighted(m)).toEqual([3]);
    expect(title(m)).toBe('Other');
    expect(m.live.textContent).toBe(SPOKEN[3]);
    await userEvent.keyboard('{ArrowRight}');
    expect(highlighted(m)).toEqual([3]);
    await userEvent.keyboard('{Home}');
    expect(highlighted(m)).toEqual([0]);
    await userEvent.keyboard('{End}');
    expect(highlighted(m)).toEqual([3]);
    await userEvent.keyboard('{ArrowLeft}');
    expect(highlighted(m)).toEqual([2]);
    expect(m.live.textContent).toBe(SPOKEN[2]);
    await settled();
    expect(shownCentres(m)).toEqual(['14%Wholesale']);
  });

  test('under dir="rtl" the ring is not mirrored, so ArrowRight still goes clockwise', async () => {
    const m = await hydrate({ dir: 'rtl' });
    await tabIn();
    expect(highlighted(m)).toEqual([0]);
    await userEvent.keyboard('{ArrowRight}');
    expect(highlighted(m)).toEqual([1]);
  });

  test('a sliver thinner than the gap has no pixels but the keys reach it', async () => {
    const m = await hydrate({
      data: [
        { name: 'Big', sales: 1000 },
        { name: 'Tiny', sales: 1 },
      ],
    });
    expect(m.segments).toHaveLength(2);
    expect(m.segments[1]?.getAttribute('d')).toBe('');
    await tabIn();
    await userEvent.keyboard('{End}');
    expect(highlighted(m)).toEqual([1]);
    expect(title(m)).toBe('Tiny');
    expect(m.live.textContent).toBe('Tiny, Sales, $1, 0%, of total');
  });

  test('Escape hides the card and clears the highlight; Tab out empties the region', async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{Escape}');
    expect(card(m)).toBeNull();
    expect(highlighted(m)).toEqual([]);
    expect(m.live.textContent).toBe('');
    await settled();
    expect(opacities(m.segments)).toEqual([1, 1, 1, 1]);
    expect(shownCentres(m)).toEqual(['$123.3KTotal']);
    // the next key shows and speaks the same slice again
    await userEvent.keyboard('{ArrowRight}');
    expect(highlighted(m)).toEqual([0]);
    expect(m.live.textContent).toBe(SPOKEN[0]);
    const next = document.createElement('input');
    next.setAttribute('aria-label', 'Next');
    document.body.append(next);
    await userEvent.tab();
    expect(m.live.textContent).toBe('');
    expect(card(m)).toBeNull();
  });
});

describe('DonutChart item mode: the card', () => {
  test("Figma 03's ChartTooltip card: the slice's value, its share of the total, its colour", async () => {
    const m = await hydrate();
    await tabIn();
    for (const i of [0, 1, 2, 3]) {
      // oxlint-disable-next-line no-await-in-loop -- one slice after the other
      await userEvent.keyboard(i === 0 ? '{Home}' : '{ArrowRight}');
      // oxlint-disable-next-line no-await-in-loop -- one slice after the other
      await settled();
      const tip = card(m);
      if (tip === null) throw new Error('no card');
      expect(tip.classList.contains('nz-chart-tooltip')).toBe(true);
      expect(tip.querySelector('.nz-chart-tooltip-title')?.textContent).toBe(TITLES[i]);
      expect(tip.querySelector('.nz-chart-tooltip-delta')?.textContent).toBe(
        `${['52%', '28%', '14%', '6%'][i] ?? ''} of total`,
      );
      // the swatch is the segment's colour
      const swatch = tip.querySelector('.nz-chart-tooltip-swatch');
      const segment = m.segments[i];
      if (swatch === null || segment === undefined) throw new Error('no swatch');
      expect(getComputedStyle(swatch).backgroundColor).toBe(getComputedStyle(segment).fill);
    }
  });

  test.each(['probe-wide', 'probe-narrow'] as const)(
    '%s: at the slice centre, toward the legend, never past the chart, no page scroll',
    async (probe) => {
      const m = await hydrate({ probe });
      const scroll = document.documentElement.scrollWidth;
      const figure = rect(m.figure);
      await tabIn();
      for (const i of [0, 1, 2, 3]) {
        // oxlint-disable-next-line no-await-in-loop -- one slice after the other
        await userEvent.keyboard(i === 0 ? '{Home}' : '{ArrowRight}');
        // oxlint-disable-next-line no-await-in-loop -- one slice after the other
        await settled();
        const tip = card(m);
        if (tip === null) throw new Error('no card');
        const box = rect(tip);
        const layer = rect(m.layer);
        const centre = at(m, middleOf(i));
        // 14 px after the slice's centre, toward the legend; centred on it vertically
        expect(Math.abs(box.left - (layer.left + centre.x) - 14)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.top + box.height / 2 - (layer.top + centre.y))).toBeLessThanOrEqual(1);
        expect(box.left).toBeGreaterThanOrEqual(figure.left);
        expect(box.right).toBeLessThanOrEqual(figure.right + 0.5);
        expect(document.documentElement.scrollWidth).toBe(scroll);
      }
      // Figma 03's 200 px card where the chart has the room, else 1.5 rings less 14 px (166 px)
      const ring = rect(m.layer).width;
      expect(rect(card(m) ?? m.layer).width).toBeCloseTo(Math.min(200, ring * 1.5 - 14), 0);
    },
  );

  test('under dir="rtl" the legend is on the left, and the card opens toward it', async () => {
    const m = await hydrate({ dir: 'rtl', probe: 'probe-narrow' });
    const figure = rect(m.figure);
    expect(rect(m.container.querySelector('.nz-legend') ?? m.layer).right).toBeLessThan(
      rect(m.layer).left,
    );
    await tabIn();
    for (const key of ['{Home}', '{ArrowRight}', '{ArrowRight}', '{ArrowRight}']) {
      // oxlint-disable-next-line no-await-in-loop -- one slice after the other
      await userEvent.keyboard(key);
      // oxlint-disable-next-line no-await-in-loop -- one slice after the other
      await settled();
      const tip = card(m);
      if (tip === null) throw new Error('no card');
      const centre = rect(m.layer).left + at(m, middleOf(highlighted(m)[0] ?? 0)).x;
      expect(Math.abs(rect(tip).right - (centre - 14))).toBeLessThanOrEqual(1);
      expect(rect(tip).left).toBeGreaterThanOrEqual(figure.left - 0.5);
    }
  });

  test('showing the card and moving the highlight move nothing in the layout', async () => {
    const m = await hydrate();
    const boxes = (): unknown[] =>
      [m.figure, m.plot, ...legendRows(m), ...m.segments].map((el) => rect(el).toJSON());
    const before = boxes();
    await tabIn();
    await userEvent.keyboard('{ArrowRight}{End}');
    await hoverSlice(m, 1);
    await settled();
    expect(boxes()).toEqual(before);
  });
});

describe('DonutChart item mode: the pointer', () => {
  test('hovering a segment highlights it and shows its card, without speaking', async () => {
    const m = await hydrate();
    for (const i of [1, 3, 0, 2]) {
      // oxlint-disable-next-line no-await-in-loop -- one hover after the other
      await hoverSlice(m, i);
      expect(highlighted(m)).toEqual([i]);
      expect(title(m)).toBe(TITLES[i]);
    }
    await settled();
    expect(opacities(m.segments)).toEqual([0.35, 0.35, 1, 0.35]);
    expect(shownCentres(m)).toEqual(['14%Wholesale']);
    expect(m.live.textContent).toBe('');
    // the hole and a gap keep the card as it is (it never hides while the pointer is on the ring)
    await userEvent.hover(m.layer, { position: at(m, 0.1, 0.1) });
    expect(highlighted(m)).toEqual([2]);
    await userEvent.hover(m.layer, { position: at(m, SHARES[0] ?? 0) });
    expect(highlighted(m)).toEqual([2]);
    // leaving the ring hides it
    const outside = document.querySelector<HTMLElement>('input[aria-label="Before"]');
    if (outside === null) throw new Error('no input');
    await userEvent.hover(outside);
    expect(highlighted(m)).toEqual([]);
    expect(card(m)).toBeNull();
  });

  test('WCAG 1.4.13: Escape dismisses a pointer-shown card while focus is elsewhere', async () => {
    const m = await hydrate();
    document.querySelector<HTMLInputElement>('input[aria-label="Before"]')?.focus();
    await hoverSlice(m, 1);
    expect(highlighted(m)).toEqual([1]);
    await userEvent.keyboard('{Escape}');
    expect(card(m)).toBeNull();
    expect(highlighted(m)).toEqual([]);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Before');
  });
});

/** The chart and the field before it, moved into a modal dialog after hydration. */
function inDialog(m: Mounted): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  const before = document.querySelector('input[aria-label="Before"]');
  if (before === null) throw new Error('no field');
  dialog.append(before, m.container);
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

describe('DonutChart item mode: Escape inside a modal dialog (M41 item 1)', () => {
  test('Escape on the focused ring hides only the card; the next Escape closes the dialog', async () => {
    const m = await hydrate();
    const dialog = inDialog(m);
    await tabIn();
    expect(document.activeElement).toBe(m.layer);
    expect(card(m)).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(card(m)).toBeNull();
    expect(dialog.open).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(dialog.open).toBe(false);
  });

  test('with focus elsewhere, Escape hides a pointer-shown card and still reaches the dialog', async () => {
    const m = await hydrate();
    const dialog = inDialog(m);
    document.querySelector<HTMLInputElement>('input[aria-label="Before"]')?.focus();
    await hoverSlice(m, 0);
    expect(card(m)).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(card(m)).toBeNull();
    expect(dialog.open).toBe(false);
  });
});

/**
 * A dialog that listens for Escape in React, on an ancestor of the chart, and stops it there: what
 * React Aria's useOverlay (and so @nizivo/react's Dialog) does. A native listener on the document
 * would never see the key (week 12 review A11Y-W12-1).
 */
function ReactDialog({ onClose }: { onClose: () => void }): ReactElement {
  return (
    // a stand-in for React Aria's dialog wrapper, which listens on its popup element the same way
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- React Aria's popup is a div too
      role="dialog"
      aria-label="Sales"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onClose();
      }}
    >
      <input aria-label="Before" />
      <div className="probe-wide">
        <DonutChart title="Sales by channel" data={DATA} category="name" value="sales" />
      </div>
    </div>
  );
}

describe('DonutChart item mode: Escape inside a dialog that listens in React (A11Y-W12-1)', () => {
  test('Escape on the focused ring hides only the card; the next Escape closes the dialog', async () => {
    let closed = 0;
    const app = <ReactDialog onClose={() => (closed += 1)} />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(app);
    document.body.append(container);
    await act(async () => {
      roots.push(hydrateRoot(container, app));
    });
    await settled();
    const layer = container.querySelector<HTMLElement>('.nz-chart-interaction');
    if (layer === null) throw new Error('no island');
    await tabIn();
    expect(document.activeElement).toBe(layer);
    expect(layer.querySelector('.nz-chart-interaction-tip')).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(layer.querySelector('.nz-chart-interaction-tip')).toBeNull();
    expect(container.querySelectorAll('[data-highlighted]')).toHaveLength(0);
    expect(closed).toBe(0);
    await userEvent.keyboard('{Escape}');
    expect(closed).toBe(1);
  });
});
