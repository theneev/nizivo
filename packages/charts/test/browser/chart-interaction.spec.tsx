// The ChartInteraction island in a real engine (ARCHITECTURE.md §14.1, §16.5; Figma 03 "Area Chart"
// Hover): AreaChart's server HTML hydrates unchanged, Tab lands on the one layer over the plot, the
// arrow keys, Home and End move the active point and the polite region speaks it, Escape hides the
// card, a pointer shows the nearest point without speaking, touch keeps the card after a tap, the
// crosshair and the dots sit on the marks the server drew, the card flips near the end, nothing
// moves the layout, and a mirrored plot (xDirection="rtl") keys and points the way it looks. Styled
// by the shipped stylesheets only (tokens.css and this package's dist/styles.css): build first.
// Every engine: `NZ_BROWSER=webkit pnpm test:browser` (or firefox).
import { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { AreaChart, type AreaChartElementProps } from '../../src/area-chart/index';

const STYLES = import.meta.glob(['../../../tokens/dist/tokens.css', '../../dist/styles.css'], {
  query: '?raw',
  import: 'default',
  eager: true,
});
if (Object.keys(STYLES).length !== 2) {
  throw new Error('a stylesheet is missing: build @nizivo/tokens and @nizivo/charts first');
}
const sheet = document.createElement('style');
// Test scaffolding only: a white page and a 764 px frame (a 712 px plot after the 52 px y gutter).
sheet.textContent = `${Object.values(STYLES).join('\n')}
body { margin: 0; background: #fff; }
.probe { inline-size: 764px; padding: 24px; }`;
document.head.append(sheet);

interface Day {
  date: string;
  current: number;
  previous: number;
}

const DAYS: Day[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  current: 2000 + i * 180,
  previous: 2600 + i * 40,
}));

const roots: Root[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) act(() => root.unmount());
  document.body.replaceChildren();
  // park the pointer outside any chart, so the next case starts unhovered
  await userEvent.unhover(document.body);
});

interface Mounted {
  container: HTMLElement;
  figure: HTMLElement;
  layer: HTMLElement;
  live: HTMLElement;
  problems: unknown[];
}

/** AreaChart's server HTML in the document, then hydration, as a Server Component page gets it. */
async function hydrate(props: Partial<AreaChartElementProps<Day>> = {}): Promise<Mounted> {
  const app = (
    <AreaChart
      title="Sales"
      data={DAYS}
      x="date"
      y="current"
      compare="previous"
      format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
      {...props}
    />
  );
  const container = document.createElement('div');
  container.className = 'probe';
  container.innerHTML = renderToString(app);
  // where keyboard tests start from: a text field just before the chart (Tab reaches a text field
  // in every engine, and focus never starts in the runner's own frame)
  const before = document.createElement('input');
  before.setAttribute('aria-label', 'Before');
  document.body.append(before, container);
  const problems: unknown[] = [];
  await act(async () => {
    roots.push(
      hydrateRoot(container, app, {
        onRecoverableError: (error) => problems.push(error),
      }),
    );
  });
  const one = (selector: string): HTMLElement => {
    const found = container.querySelector<HTMLElement>(selector);
    if (found === null) throw new Error(`no ${selector}`);
    return found;
  };
  return {
    container,
    figure: one('figure'),
    layer: one('.nz-chart-interaction'),
    live: one('[aria-live]'),
    problems,
  };
}

const card = (m: Mounted): HTMLElement | null =>
  m.layer.querySelector<HTMLElement>('.nz-chart-interaction-tip');
const title = (m: Mounted): string | undefined =>
  card(m)?.querySelector('.nz-chart-tooltip-title')?.textContent ?? undefined;
const rect = (el: Element): DOMRect => el.getBoundingClientRect();

/** Tab into the chart from the field before it, as a keyboard user arrives. */
async function tabIn(): Promise<void> {
  document.querySelector<HTMLInputElement>('input[aria-label="Before"]')?.focus();
  await userEvent.tab();
}
const settle = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => done()));

describe('ChartInteraction: hydration and the keyboard', () => {
  test('the server HTML hydrates unchanged, with the polite region empty and no card', async () => {
    const m = await hydrate();
    expect(m.problems).toEqual([]);
    expect(m.live.textContent).toBe('');
    expect(card(m)).toBeNull();
    expect(m.container.querySelector('[style]')).toBeNull();
  });

  test('Tab lands on the layer and shows the latest point; the region speaks it', async () => {
    const m = await hydrate();
    await tabIn();
    expect(document.activeElement).toBe(m.layer);
    expect(m.layer.matches(':focus-visible')).toBe(true);
    expect(title(m)).toBe('Fri, Oct 30');
    expect(m.live.textContent).toBe(
      'Fri, Oct 30, This period, $7,220, Previous, $3,760, +92.0%, vs previous',
    );
  });

  test('ArrowLeft and ArrowRight step, Home and End jump, each move spoken once', async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{ArrowLeft}');
    expect(title(m)).toBe('Thu, Oct 29');
    expect(m.live.textContent).toMatch(/^Thu, Oct 29, This period, \$7,040,/);
    await userEvent.keyboard('{Home}');
    expect(title(m)).toBe('Thu, Oct 1');
    expect(m.live.textContent).toMatch(/^Thu, Oct 1, /);
    await userEvent.keyboard('{ArrowLeft}');
    expect(title(m)).toBe('Thu, Oct 1');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(title(m)).toBe('Sat, Oct 3');
    await userEvent.keyboard('{End}');
    expect(title(m)).toBe('Fri, Oct 30');
  });

  test('Escape hides the card and keeps the point; the next arrow shows it again', async () => {
    const m = await hydrate();
    await tabIn();
    await userEvent.keyboard('{ArrowLeft}{Escape}');
    expect(card(m)).toBeNull();
    expect(document.activeElement).toBe(m.layer);
    await userEvent.keyboard('{ArrowRight}');
    // the first arrow after Escape shows the point it left, without moving
    expect(title(m)).toBe('Thu, Oct 29');
  });

  test('leaving the layer hides the card', async () => {
    const m = await hydrate();
    // a text field: Tab reaches it in every engine (WebKit skips buttons by default)
    const next = document.createElement('input');
    next.setAttribute('aria-label', 'Next');
    document.body.append(next);
    await tabIn();
    expect(card(m)).not.toBeNull();
    await userEvent.tab();
    expect(document.activeElement).toBe(next);
    expect(card(m)).toBeNull();
    // leaving empties the region, so coming back speaks the point again (a live region speaks
    // only when its text changes)
    expect(m.live.textContent).toBe('');
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(m.layer);
    expect(m.live.textContent).toMatch(/^Fri, Oct 30, This period, /);
  });
});

describe('ChartInteraction: geometry, pointer and touch', () => {
  test('the crosshair and the dots sit on the marks the server drew; the card flips near the end', async () => {
    const m = await hydrate();
    await tabIn();
    await settle();
    const plot = rect(m.layer);
    const column = m.layer.querySelector('.nz-chart-interaction-point');
    const dots = [...m.layer.querySelectorAll('.nz-chart-interaction-dot')];
    const end = m.container.querySelector('.nz-area-chart-dot');
    if (column === null || end === null) throw new Error('no crosshair or end dot');
    // the last point: the crosshair at the plot's right edge, its 1 px centred there
    const line = rect(column);
    expect(line.width).toBeCloseTo(1, 0);
    expect(line.left + line.width / 2).toBeCloseTo(plot.right, 0);
    expect(line.height).toBeCloseTo(plot.height, 0);
    // the current dot is centred on the server's end dot (a zero-length path: its box is the point)
    const [currentDot, previousDot] = dots.map((dot) => rect(dot));
    const at = rect(end);
    expect(currentDot?.width).toBeCloseTo(10, 0);
    expect((currentDot?.left ?? 0) + 5).toBeCloseTo(at.left + at.width / 2, 0);
    expect((currentDot?.top ?? 0) + 5).toBeCloseTo(at.top + at.height / 2, 0);
    expect(previousDot).toBeDefined();
    // the card is on the left of the crosshair, 14 px off (from the 1 px line's edge), in the plot
    const tip = card(m);
    if (tip === null) throw new Error('no card');
    expect(tip.dataset['side']).toBe('left');
    expect(Math.abs(rect(tip).right - (line.left - 14))).toBeLessThanOrEqual(1);
    await userEvent.keyboard('{Home}');
    await settle();
    expect(tip.isConnected ? card(m)?.dataset['side'] : undefined).toBe('right');
    const first = card(m);
    expect(Math.abs(rect(first ?? tip).left - (plot.left + 14))).toBeLessThanOrEqual(1);
    expect(rect(first ?? tip).right).toBeLessThanOrEqual(plot.right);
  });

  test('nothing moves: the figure and the plot keep their boxes while a point is shown', async () => {
    const m = await hydrate();
    const before = [rect(m.figure), rect(m.layer)].map((r) => [r.x, r.y, r.width, r.height]);
    await tabIn();
    await userEvent.keyboard('{ArrowLeft}');
    await settle();
    const after = [rect(m.figure), rect(m.layer)].map((r) => [r.x, r.y, r.width, r.height]);
    expect(after).toEqual(before);
  });

  test('a pointer sweep adds no layout shift: the crosshair and the dots move by translate only', async () => {
    const m = await hydrate();
    const plot = rect(m.layer);
    // Chromium reports layout shifts (the Layout Instability API, what CLS sums); the other engines
    // do not, so every engine also checks that the layout boxes stay put while the marks move
    const shifts: number[] = [];
    const observer = PerformanceObserver.supportedEntryTypes.includes('layout-shift')
      ? new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const value: unknown = Reflect.get(entry, 'value');
            if (Reflect.get(entry, 'hadRecentInput') !== true && typeof value === 'number')
              shifts.push(value);
          }
        })
      : undefined;
    observer?.observe({ type: 'layout-shift' });
    const layout: string[] = [];
    const seen = new Set<number>();
    for (let step = 1; step < 20; step += 1) {
      // oxlint-disable-next-line no-await-in-loop -- a sweep: each move after the last one
      await userEvent.hover(m.layer, { position: { x: (plot.width * step) / 20, y: 20 } });
      // oxlint-disable-next-line no-await-in-loop -- read the marks after this move's frame
      await settle();
      const point = m.layer.querySelector<HTMLElement>('.nz-chart-interaction-point');
      const dots = [...m.layer.querySelectorAll<HTMLElement>('.nz-chart-interaction-dot')];
      if (point === null) throw new Error('no crosshair');
      seen.add(Math.round(rect(point).left));
      layout.push([point.offsetLeft, point.offsetTop, ...dots.map((d) => d.offsetTop)].join());
    }
    await settle();
    observer?.disconnect();
    expect(seen.size).toBeGreaterThan(10);
    expect(new Set(layout).size).toBe(1);
    // What is left is text reflow inside the card ("vs previous" moves when the change's width
    // does), about 0.00001 a step; moving the marks by layout cost about 0.002 a step (CLS < 0.01,
    // §17.3)
    expect(shifts.reduce((sum, value) => sum + value, 0)).toBeLessThan(0.0005);
  });

  test('a pointer shows the nearest point and never speaks; leaving hides it', async () => {
    const m = await hydrate();
    const plot = rect(m.layer);
    // a third of the way along 30 points: index 9.67 rounds to 10, Oct 11
    await userEvent.hover(m.layer, { position: { x: plot.width / 3, y: plot.height / 2 } });
    expect(title(m)).toBe('Sun, Oct 11');
    expect(m.live.textContent).toBe('');
    await userEvent.hover(m.layer, { position: { x: 1, y: 10 } });
    expect(title(m)).toBe('Thu, Oct 1');
    await userEvent.unhover(m.layer);
    expect(card(m)).toBeNull();
  });

  test('touch: a tap shows the point and keeps it after the finger lifts; a cancelled gesture hides it', async () => {
    const m = await hydrate();
    const plot = rect(m.layer);
    const touch = (type: string, x: number): void => {
      m.layer.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerType: 'touch',
          isPrimary: true,
          clientX: plot.left + x,
          clientY: plot.top + 20,
        }),
      );
    };
    await act(async () => {
      touch('pointerdown', plot.width / 2);
      touch('pointerup', plot.width / 2);
      touch('pointerleave', plot.width / 2);
    });
    // half way along 30 points: index 14.5 rounds to 15, Oct 16
    expect(title(m)).toBe('Fri, Oct 16');
    await act(async () => touch('pointercancel', plot.width / 2));
    expect(card(m)).toBeNull();
  });
});

describe('ChartInteraction: a mirrored plot (xDirection="rtl")', () => {
  test('the arrows follow the screen, the pointer reads the mirror, the crosshair mirrors', async () => {
    const m = await hydrate({ xDirection: 'rtl' });
    await tabIn();
    await settle();
    // the latest point is drawn at the left edge
    const plot = rect(m.layer);
    const column = (): DOMRect => {
      const found = m.layer.querySelector('.nz-chart-interaction-point');
      if (found === null) throw new Error('no crosshair');
      return rect(found);
    };
    expect(title(m)).toBe('Fri, Oct 30');
    expect(column().left + 0.5).toBeCloseTo(plot.left, 0);
    expect(card(m)?.dataset['side']).toBe('right');
    // ArrowRight goes right on screen, which is back in time here
    await userEvent.keyboard('{ArrowRight}');
    expect(title(m)).toBe('Thu, Oct 29');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(title(m)).toBe('Fri, Oct 30');
    // the pointer near the right edge is the first day
    await userEvent.hover(m.layer, { position: { x: plot.width - 1, y: 10 } });
    expect(title(m)).toBe('Thu, Oct 1');
    // and the server's end dot is drawn mirrored too, at the left, under the crosshair
    const end = m.container.querySelector('.nz-area-chart-dot');
    if (end === null) throw new Error('no end dot');
    await userEvent.keyboard('{End}');
    await settle();
    expect(rect(end).left + rect(end).width / 2).toBeCloseTo(column().left + 0.5, 0);
  });
});
