// M42 in a real layout engine: ChartFrame's `titleVisibility="hidden"` (item 15) and the halos that
// read a Card's shared `--nz-surface` (item 6).
//
// titleVisibility="hidden": the caption takes no layout space (the plot starts at the figure's top,
// and the figure is shorter by exactly the caption and the frame's gap), yet it is not removed:
// it renders (not display: none, not visibility: hidden) as a 1 × 1 clipped box, and the figure's
// accessible name, from its figcaption, is the same as with the caption shown. DonutChart lays its
// frame out on a grid, so it is checked too: the ring and the legend move up into the first row.
//
// The halos: the end dot's halo (Sparkline, AreaChart) and the tooltip dot's halo read their own
// hook, else `--nz-surface` (declared by @nizivo/react's Card, never required), else bg/surface.
// Styled by the shipped stylesheets only (tokens.css and dist/styles.css), so build first. Every
// engine: `NZ_BROWSER=webkit pnpm test:browser` (or firefox).
import type { ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { AreaChart } from '../../src/area-chart/index';
import { DonutChart } from '../../src/donut-chart/index';
import { Sparkline } from '../../src/sparkline/index';

const STYLES = import.meta.glob(['../../../tokens/dist/tokens.css', '../../dist/styles.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
if (Object.keys(STYLES).length !== 2) {
  throw new Error('a stylesheet is missing: build @nizivo/tokens and @nizivo/charts first');
}
const sheet = document.createElement('style');
// test scaffolding only: a white page, a fixed chart width, and a stand-in for a tinted Card that
// declares the shared surface variable as @nizivo/react's card.css does
sheet.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe { inline-size: 640px; }
.probe-tinted { --nz-surface: rgb(255, 0, 0); }
.probe-own-hook { --nz-sparkline-halo: rgb(0, 0, 255); --nz-area-chart-halo: rgb(0, 0, 255); --nz-chart-tooltip-halo: rgb(0, 0, 255); }`;
document.head.append(sheet);

const DAYS = Array.from({ length: 14 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  sales: 2000 + ((i * 7919) % 13) * 300,
}));
const CHANNELS = [
  { name: 'Online store', sales: 64120 },
  { name: 'Point of sale', sales: 34526 },
  { name: 'Wholesale', sales: 17263 },
];

let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(() => {
  root?.unmount();
  host?.remove();
  root = undefined;
  host = undefined;
});

function mount(node: ReactElement, className = 'probe'): HTMLElement {
  host?.remove();
  root?.unmount();
  host = document.createElement('div');
  host.className = className;
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root?.render(node));
  return host;
}

function one(selector: string, within: ParentNode = document): HTMLElement {
  const found = within.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`no ${selector}`);
  return found;
}

/** An SVG mark (not an HTMLElement). */
function mark(selector: string, within: ParentNode): Element {
  const found = within.querySelector(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}

/** The frame's row gap (the flex gap between the caption and what follows), in px. */
const rowGap = (figure: Element): number => Number.parseFloat(getComputedStyle(figure).rowGap);

type Visibility = 'visible' | 'hidden';

const area = (titleVisibility: Visibility): ReactElement => (
  <AreaChart
    title="Sales"
    summary="Daily sales, Oct 1–14"
    titleVisibility={titleVisibility}
    data={DAYS}
    x="date"
    y="sales"
  />
);

const donut = (titleVisibility: Visibility): ReactElement => (
  <DonutChart
    title="Sales by channel"
    titleVisibility={titleVisibility}
    data={CHANNELS}
    category="name"
    value="sales"
  />
);

/** bg/surface as tokens.css resolves it on this page. */
function surface(): string {
  const probe = document.createElement('span');
  probe.style.color = 'var(--nz-bg-surface)';
  document.body.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

/** A tooltip dot as the island renders it, inside the chart's plot, for its computed halo. */
function dotHalo(within: HTMLElement): string {
  const dot = document.createElement('span');
  dot.className = 'nz-chart-interaction-dot';
  one('[data-slot="chart-frame-plot"]', within).append(dot);
  const shadow = getComputedStyle(dot).boxShadow;
  dot.remove();
  return shadow;
}

/** The figure, found by the name the locator engine computes (figcaption → figure, HTML-AAM). */
async function namedFigure(visibility: Visibility): Promise<boolean> {
  const figure = one('figure', mount(area(visibility)));
  expect(figure.hasAttribute('aria-label')).toBe(false);
  expect(figure.hasAttribute('aria-labelledby')).toBe(false);
  const named = page.getByRole('figure', { name: 'Sales Daily sales, Oct 1–14', exact: true });
  await expect.element(named).toBeInTheDocument();
  // the data table, named by the title, keeps its name too
  const table = page.getByRole('table', { name: 'Sales', exact: true });
  return named.element() === figure && table.element() === one('table', figure);
}

describe('titleVisibility="hidden" (M42 item 15)', () => {
  test('AreaChart: the caption takes no layout space, the plot keeps its size', () => {
    const shown = one('figure', mount(area('visible')));
    const shownCaption = one('figcaption', shown).getBoundingClientRect().height;
    const shownBody = one('[data-slot="chart-frame-body"]', shown).getBoundingClientRect();
    const shownHeight = shown.getBoundingClientRect().height;
    const gap = rowGap(shown);
    expect(shownCaption).toBeGreaterThan(10);
    expect(gap).toBeGreaterThan(0);

    const hidden = one('figure', mount(area('hidden')));
    const box = hidden.getBoundingClientRect();
    const body = one('[data-slot="chart-frame-body"]', hidden).getBoundingClientRect();
    expect(body.top).toBeCloseTo(box.top, 1);
    expect(box.height).toBeCloseTo(shownHeight - shownCaption - gap, 1);
    expect(body.width).toBeCloseTo(shownBody.width, 1);
    expect(body.height).toBeCloseTo(shownBody.height, 1);
  });

  test('AreaChart: the hidden caption still renders, clipped to 1 × 1, title and summary inside', () => {
    const figure = one('figure', mount(area('hidden')));
    const caption = one('figcaption', figure);
    const style = getComputedStyle(caption);
    expect(style.display).not.toBe('none');
    expect(style.visibility).toBe('visible');
    expect(style.position).toBe('absolute');
    const rect = caption.getBoundingClientRect();
    expect(rect.width).toBeLessThanOrEqual(1);
    expect(rect.height).toBeLessThanOrEqual(1);
    expect(caption.textContent).toBe('SalesDaily sales, Oct 1–14');
    // no horizontal overflow from the clipped caption
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  test('the figure’s accessible name is the same, shown or hidden', async () => {
    expect(await namedFigure('visible')).toBe(true);
    expect(await namedFigure('hidden')).toBe(true);
  });

  test('DonutChart: the ring and the legend move into the first row, nothing above them', () => {
    const shown = one('figure', mount(donut('visible')));
    const shownCaption = one('figcaption', shown).getBoundingClientRect().height;
    const shownHeight = shown.getBoundingClientRect().height;
    const gap = rowGap(shown);

    const hidden = one('figure', mount(donut('hidden')));
    const box = hidden.getBoundingClientRect();
    const body = one('[data-slot="chart-frame-body"]', hidden).getBoundingClientRect();
    const legend = one('[data-slot="chart-frame-legend"]', hidden).getBoundingClientRect();
    expect(body.top).toBeCloseTo(box.top, 1);
    // the legend is centred on the ring's row, as when the caption shows
    expect(legend.top + legend.height / 2).toBeCloseTo(body.top + body.height / 2, 0);
    expect(box.height).toBeCloseTo(shownHeight - shownCaption - gap, 1);
  });

  test('DonutChart with tableView="details": the disclosure stays under the ring', () => {
    const figure = one(
      'figure',
      mount(
        <DonutChart
          title="Sales by channel"
          titleVisibility="hidden"
          tableView="details"
          data={CHANNELS}
          category="name"
          value="sales"
        />,
      ),
    );
    const body = one('[data-slot="chart-frame-body"]', figure).getBoundingClientRect();
    const details = one('[data-slot="chart-frame-details"]', figure).getBoundingClientRect();
    expect(body.top).toBeCloseTo(figure.getBoundingClientRect().top, 1);
    expect(details.top).toBeGreaterThanOrEqual(body.bottom);
  });
});

describe('the halos read a Card’s shared --nz-surface, optionally (M42 item 6)', () => {
  const RED = 'rgb(255, 0, 0)';
  const BLUE = 'rgb(0, 0, 255)';

  const charts = (
    <>
      <Sparkline data={[3, 5, 4, 6, 8]} label="Revenue, last 5 days" />
      <AreaChart title="Sales" data={DAYS} x="date" y="sales" />
    </>
  );

  test('no Card on the page: bg/surface, as before', () => {
    const at = mount(charts);
    const bg = surface();
    expect(bg).not.toBe(RED);
    expect(getComputedStyle(mark('.nz-sparkline-halo', at)).stroke).toBe(bg);
    expect(getComputedStyle(mark('.nz-area-chart-halo', at)).stroke).toBe(bg);
    expect(dotHalo(at)).toContain(bg);
  });

  test('inside a surface that declares --nz-surface: the halos take it', () => {
    const at = mount(charts, 'probe probe-tinted');
    expect(getComputedStyle(mark('.nz-sparkline-halo', at)).stroke).toBe(RED);
    expect(getComputedStyle(mark('.nz-area-chart-halo', at)).stroke).toBe(RED);
    expect(dotHalo(at)).toContain(RED);
  });

  test('a part’s own halo hook still wins over --nz-surface', () => {
    const at = mount(charts, 'probe probe-tinted probe-own-hook');
    expect(getComputedStyle(mark('.nz-sparkline-halo', at)).stroke).toBe(BLUE);
    expect(getComputedStyle(mark('.nz-area-chart-halo', at)).stroke).toBe(BLUE);
    expect(dotHalo(at)).toContain(BLUE);
  });
});
