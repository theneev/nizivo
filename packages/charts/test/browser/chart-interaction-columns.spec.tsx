// The ChartInteraction island's column mode (M40 item 2, 2026-10-20), over a stand-in column chart:
// a ChartFrame whose plot holds an n-column grid of elements marked `data-slot="fake-column"` (what
// BarChart's bands are) and the island with `columns="fake-column"`. The arrow keys, Home and End
// rove over the columns following the screen, the active column carries `data-highlighted`, the
// card shows beside it and the live region speaks it; a pointer over a column does the same without
// speaking; Escape and leaving clear it; a mirrored plot (xDirection="rtl", or "auto" under
// dir="rtl") keys and points the way it looks. BarChart's adoption is its own spec.
import { act, useId, type ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
  ChartInteraction,
  type ChartInteractionPoint,
} from '../../src/_island/chart-interaction.client';
import { ChartFrame } from '../../src/chart-frame/index';
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
// Test scaffolding: a white page, a 764 px frame, and the stand-in's columns on grid tracks (as
// bar-chart.css lays out BarChart's bands; `direction` mirrors them with the plot).
sheet.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe { inline-size: 764px; padding: 24px; }
.probe .nz-chart-frame-body { aspect-ratio: 32 / 13; }
.fake-columns { position: absolute; inset: 0; display: grid; grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr); }`;
document.head.append(sheet);

const ORDERS = [120, 340, 90, 410, 260, 180];
const DAYS = ORDERS.map((_, i) => `Day ${i + 1}`);
const POINTS: ChartInteractionPoint[] = ORDERS.map((orders, i) => [
  DAYS[i] ?? '',
  [String(orders)],
  [],
]);

function Columns({ xDirection = 'ltr' }: { xDirection?: ChartXDirection }): ReactElement {
  const hint = useId();
  return (
    <ChartFrame
      title="Orders"
      xDirection={xDirection}
      table={{ columns: ['Day', 'Orders'], rows: ORDERS.map((o, i) => [DAYS[i] ?? '', String(o)]) }}
      ticks={{ x: DAYS, xAlign: 'band', y: ['400', '200', '0'] }}
    >
      <div className="fake-columns" aria-hidden="true">
        {ORDERS.map((orders) => (
          <div key={orders} data-slot="fake-column" />
        ))}
      </div>
      <span id={hint} className="nz-chart-visually-hidden">
        Arrow keys move between days
      </span>
      <ChartInteraction
        series={[{ label: 'Orders', series: 'current' }]}
        points={POINTS}
        separators={[', ', ', ']}
        columns="fake-column"
        aria-label="Orders"
        aria-roledescription="interactive chart"
        aria-describedby={hint}
      />
    </ChartFrame>
  );
}

const roots: Root[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
  await userEvent.unhover(document.body);
});

interface Mounted {
  container: HTMLElement;
  layer: HTMLElement;
  live: HTMLElement;
  columns: HTMLElement[];
  problems: unknown[];
}

async function hydrate(xDirection: ChartXDirection = 'ltr', dir?: 'rtl'): Promise<Mounted> {
  const app = <Columns xDirection={xDirection} />;
  const container = document.createElement('div');
  container.className = 'probe';
  container.innerHTML = renderToString(app);
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
  const layer = container.querySelector<HTMLElement>('.nz-chart-interaction');
  const live = container.querySelector<HTMLElement>('[aria-live]');
  if (layer === null || live === null) throw new Error('no island');
  return {
    container,
    layer,
    live,
    columns: [...container.querySelectorAll<HTMLElement>('[data-slot="fake-column"]')],
    problems,
  };
}

const rect = (el: Element): DOMRect => el.getBoundingClientRect();
const card = (m: Mounted): HTMLElement | null =>
  m.layer.querySelector<HTMLElement>('.nz-chart-interaction-tip');
const title = (m: Mounted): string | undefined =>
  card(m)?.querySelector('.nz-chart-tooltip-title')?.textContent ?? undefined;
/** The index of every column carrying data-highlighted. */
const highlighted = (m: Mounted): number[] =>
  m.columns.flatMap((column, i) => (column.hasAttribute('data-highlighted') ? [i] : []));
const settle = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()));

async function tabIn(): Promise<void> {
  document.querySelector<HTMLInputElement>('input[aria-label="Before"]')?.focus();
  await userEvent.tab();
}

describe('column mode: the keyboard', () => {
  test('hydrates unchanged: no highlight, no card, no crosshair, the region empty', async () => {
    const m = await hydrate();
    expect(m.problems).toEqual([]);
    expect(m.layer.classList.contains('nz-chart-interaction-columns')).toBe(true);
    expect(highlighted(m)).toEqual([]);
    expect(card(m)).toBeNull();
    expect(m.live.textContent).toBe('');
    expect(m.container.querySelector('[style]')).toBeNull();
  });

  test('Tab highlights the last column, shows its card and speaks it', async () => {
    const m = await hydrate();
    await tabIn();
    expect(document.activeElement).toBe(m.layer);
    expect(highlighted(m)).toEqual([5]);
    expect(title(m)).toBe('Day 6');
    expect(m.live.textContent).toBe('Day 6, Orders, 180');
    // a column carries no crosshair and no dots
    const point = m.layer.querySelector('.nz-chart-interaction-point');
    if (point === null) throw new Error('no column marker');
    expect(getComputedStyle(point).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(m.layer.querySelectorAll('.nz-chart-interaction-dot')).toHaveLength(0);
  });

  test('the arrows, Home and End rove; exactly one column is highlighted at a time', async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{ArrowLeft}');
    expect(highlighted(m)).toEqual([4]);
    expect(m.live.textContent).toBe('Day 5, Orders, 260');
    await userEvent.keyboard('{Home}');
    expect(highlighted(m)).toEqual([0]);
    expect(title(m)).toBe('Day 1');
    await userEvent.keyboard('{ArrowLeft}');
    expect(highlighted(m)).toEqual([0]);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(highlighted(m)).toEqual([2]);
    await userEvent.keyboard('{End}');
    expect(highlighted(m)).toEqual([5]);
  });

  test('Escape and leaving clear the highlight with the card', async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{Escape}');
    expect(card(m)).toBeNull();
    expect(highlighted(m)).toEqual([]);
    await userEvent.keyboard('{ArrowLeft}');
    expect(highlighted(m)).toEqual([5]);
    const next = document.createElement('input');
    next.setAttribute('aria-label', 'Next');
    document.body.append(next);
    await userEvent.tab();
    expect(highlighted(m)).toEqual([]);
    expect(m.live.textContent).toBe('');
  });

  test('the card sits beside the column, 14 px off its centre, on the side with room', async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{Home}');
    await settle();
    const first = m.columns[0];
    const tip = card(m);
    if (first === undefined || tip === null) throw new Error('no card');
    const centre = rect(first).left + rect(first).width / 2;
    expect(tip.dataset['side']).toBe('right');
    expect(Math.abs(rect(tip).left - (centre + 14))).toBeLessThanOrEqual(1);
    await userEvent.keyboard('{End}');
    await settle();
    const last = m.columns[5];
    const end = card(m);
    if (last === undefined || end === null) throw new Error('no card');
    expect(end.dataset['side']).toBe('left');
    expect(
      Math.abs(rect(end).right - (rect(last).left + rect(last).width / 2 - 14)),
    ).toBeLessThanOrEqual(1);
  });
});

describe('column mode: the pointer', () => {
  test('hovering a column highlights it and shows its card, without speaking', async () => {
    const m = await hydrate();
    for (const i of [1, 3, 0, 5]) {
      const column = m.columns[i];
      if (column === undefined) throw new Error('no column');
      const box = rect(column);
      const plot = rect(m.layer);
      // oxlint-disable-next-line no-await-in-loop -- one hover after the other
      await userEvent.hover(m.layer, {
        // near the column's start edge, so any point in the band maps to it
        position: { x: box.left - plot.left + 2, y: plot.height / 2 },
      });
      expect(highlighted(m)).toEqual([i]);
      expect(title(m)).toBe(`Day ${i + 1}`);
    }
    expect(m.live.textContent).toBe('');
    await userEvent.unhover(m.layer);
    expect(highlighted(m)).toEqual([]);
  });

  test('Escape dismisses a pointer-shown card and its highlight while focus is elsewhere', async () => {
    const m = await hydrate();
    document.querySelector<HTMLInputElement>('input[aria-label="Before"]')?.focus();
    const plot = rect(m.layer);
    await userEvent.hover(m.layer, { position: { x: plot.width / 2 + 5, y: 20 } });
    expect(highlighted(m)).toEqual([3]);
    await userEvent.keyboard('{Escape}');
    expect(card(m)).toBeNull();
    expect(highlighted(m)).toEqual([]);
  });
});

describe('column mode: a mirrored plot', () => {
  test.each([
    ['xDirection="rtl"', 'rtl', undefined],
    ['xDirection="auto" under dir="rtl"', 'auto', 'rtl'],
  ] as const)(
    '%s: columns run right to left, and so do the keys and the pointer',
    async (_name, xDirection, dir) => {
      const m = await hydrate(xDirection, dir);
      const [first, second] = m.columns;
      if (first === undefined || second === undefined) throw new Error('no columns');
      expect(rect(first).left).toBeGreaterThan(rect(second).left);
      await tabIn();
      await settle();
      expect(highlighted(m)).toEqual([5]);
      // ArrowRight goes right on screen, which is back in time here
      await userEvent.keyboard('{ArrowRight}');
      expect(highlighted(m)).toEqual([4]);
      await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
      expect(highlighted(m)).toEqual([5]);
      // the pointer at the right edge is the first column; the card sits beside it
      const plot = rect(m.layer);
      await userEvent.hover(m.layer, { position: { x: plot.width - 2, y: 20 } });
      expect(highlighted(m)).toEqual([0]);
      await settle();
      const tip = card(m);
      if (tip === null) throw new Error('no card');
      expect(tip.dataset['side']).toBe('left');
      expect(rect(tip).right).toBeLessThan(rect(first).left + rect(first).width / 2);
    },
  );
});
