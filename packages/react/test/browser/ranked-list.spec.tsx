// RankedList in a real engine (Figma 752:444, figma/04 §4.6): the server HTML only, as an RSC page
// ships it. The §16.5 box check (the root box is identical, ±1 px, across ready, loading, empty and
// error at three container widths, so a streamed list causes no layout shift), bars drawn to the
// leader with no inline style, Figma's row geometry, "View all" as the one tab stop with a 24 px
// target and the nz.base outline, and forced colours (Chromium): the bars and the track stay visible.
//
// Every engine: `NZ_BROWSER=webkit` (or `firefox`) runs it too. WebKit on macOS does not Tab to
// links, so there the order is checked by script focus after a key press.
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { cdp, server, userEvent } from 'vitest/browser';
import type { DataStatus } from '../../src/_internal/data-status';
import {
  RankedListAction,
  RankedListItem,
  RankedListRoot,
} from '../../src/ranked-list/ranked-list';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/card/card.css',
    '../../src/number-value/number-value.css',
    '../../src/skeleton/skeleton.css',
    '../../src/inline-error/inline-error.css',
    '../../src/ranked-list/ranked-list.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 7)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const isChromium = server.browser === 'chromium';
const isWebKit = server.browser === 'webkit';

afterEach(() => {
  document.body.replaceChildren();
});

async function frames(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mount(element: ReactElement, width = 380): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.style.padding = '8px';
  container.style.width = `${width}px`;
  container.innerHTML = renderToString(
    <>
      <input aria-label="Before" data-before="" />
      {element}
      <input aria-label="After" data-after="" />
    </>,
  );
  document.body.append(container);
  // the fonts the tokens name, if any, before measuring
  await document.fonts.ready;
  await frames();
  return container;
}

function one(container: ParentNode, selector: string): HTMLElement {
  const found = container.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`nothing matches ${selector}`);
  return found;
}

const CHANNELS = [
  ['Online store', 64120],
  ['Instagram Shop', 21804],
  ['Wholesale', 18240],
  ['Pop-up market', 9312],
  ['Marketplace', 6050],
] as const;

const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } as const;

/** Labels longer than a 280 px list's row (week 12 review A11Y-W12-4). */
const LONG = [
  ['Online store and marketplace partners', 64120],
  ['Point of sale', 34526],
  ['Wholesale', 17263],
] as const;

function list(status: DataStatus = 'ready'): ReactElement {
  return (
    <RankedListRoot
      title="Top channels"
      action={<RankedListAction href="#channels">View all</RankedListAction>}
      format={USD}
      status={status}
    >
      {status === 'ready' &&
        CHANNELS.map(([label, value]) => (
          <RankedListItem key={label} label={label} value={value} />
        ))}
    </RankedListRoot>
  );
}

describe('§16.5: the box does not change with the status', () => {
  afterEach(() => {
    document.documentElement.style.fontSize = '';
  });

  test.each([
    [280, 'short', '100%'],
    [380, 'short', '100%'],
    [560, 'short', '100%'],
    // a label longer than its row ends in an ellipsis rather than wrapping, as the placeholder rows
    // are one line; at 200 % text (WCAG 1.4.4) too
    [280, 'long', '100%'],
    [280, 'long', '200%'],
    [380, 'long', '200%'],
  ] as const)(
    'at %i px, %s labels, %s text: ready, loading, empty and error share one box (±1 px)',
    async (width, labels, text) => {
      document.documentElement.style.fontSize = text;
      const channels = labels === 'long' ? LONG : CHANNELS;
      const boxes: Record<string, DOMRect> = {};
      for (const status of ['ready', 'loading', 'empty', 'error'] as const) {
        // oxlint-disable-next-line no-await-in-loop -- one status after the other
        const root = await mount(
          <RankedListRoot
            title="Top channels"
            action={<RankedListAction href="#channels">View all</RankedListAction>}
            format={USD}
            status={status}
            rows={channels.length}
          >
            {status === 'ready' &&
              channels.map(([label, value]) => (
                <RankedListItem key={label} label={label} value={value} />
              ))}
          </RankedListRoot>,
          width,
        );
        boxes[status] = one(root, '.nz-ranked-list').getBoundingClientRect();
        document.body.replaceChildren();
      }
      const ready = boxes['ready'];
      if (ready === undefined) throw new Error('no ready box');
      for (const [status, box] of Object.entries(boxes)) {
        expect({
          status,
          width: Math.abs(box.width - ready.width) <= 1,
          height: Math.abs(box.height - ready.height) <= 1,
        }).toEqual({
          status,
          width: true,
          height: true,
        });
      }
    },
  );
});

describe('rows and bars', () => {
  test("Figma's geometry: 24 px padding, 16 px gaps, a Label/M line, 8 px, a 6 px track", async () => {
    const root = await mount(list());
    const card = one(root, '.nz-ranked-list');
    expect(getComputedStyle(card).paddingTop).toBe('24px');
    expect(getComputedStyle(card).boxShadow).toBe('none');
    const items = [...root.querySelectorAll<HTMLElement>('.nz-ranked-list-item')];
    expect(items).toHaveLength(5);
    // Label/M is 14 px at 140 %: 19.6 px, which Figma rounds to 20
    const line = Number.parseFloat(getComputedStyle(one(root, '.nz-ranked-list-label')).lineHeight);
    expect(Math.abs(line - 19.6)).toBeLessThanOrEqual(0.5);
    for (const item of items) {
      const row = one(item, '.nz-ranked-list-row').getBoundingClientRect().height;
      expect(Math.abs(row - line)).toBeLessThanOrEqual(0.5);
      expect(one(item, '.nz-ranked-list-track').getBoundingClientRect().height).toBe(6);
      expect(Math.abs(item.getBoundingClientRect().height - (row + 8 + 6))).toBeLessThanOrEqual(
        0.5,
      );
    }
    const [a, b] = items;
    expect(
      Math.round((b?.getBoundingClientRect().top ?? 0) - (a?.getBoundingClientRect().bottom ?? 0)),
    ).toBe(16);
    const header = one(root, '.nz-ranked-list-header').getBoundingClientRect();
    expect(Math.round((a?.getBoundingClientRect().top ?? 0) - header.bottom)).toBe(16);
  });

  test('each bar is its value over the leader, inside the track, with no style attribute', async () => {
    const root = await mount(list());
    const leader = CHANNELS[0][1];
    for (const [index, item] of [
      ...root.querySelectorAll<HTMLElement>('.nz-ranked-list-item'),
    ].entries()) {
      const track = one(item, '.nz-ranked-list-track').getBoundingClientRect();
      const bar = item.querySelector('rect')?.getBoundingClientRect();
      const value = CHANNELS[index]?.[1] ?? 0;
      expect(Math.abs((bar?.width ?? 0) - (track.width * value) / leader)).toBeLessThanOrEqual(0.5);
      expect(Math.abs((bar?.left ?? 0) - track.left)).toBeLessThanOrEqual(0.5);
    }
    expect(root.querySelector('[style]:not([data-before], [data-after])')).toBeNull();
  });
});

describe('keyboard and focus', () => {
  test('"View all" is the one tab stop, 24 px tall, with the nz.base outline', async () => {
    const root = await mount(list());
    const action = one(root, '.nz-ranked-list-action');
    expect(action.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    const before = one(root, '[data-before]');
    before.focus();
    await userEvent.keyboard('{Tab}');
    await frames(20);
    if (isWebKit && document.activeElement !== action) action.focus();
    expect(document.activeElement).toBe(action);
    const css = getComputedStyle(action);
    expect([css.outlineStyle, css.outlineOffset]).toEqual(['solid', '2px']);
    await userEvent.keyboard('{Tab}');
    await frames(20);
    // WebKit does not Tab to links by default, so only the other engines move on
    expect(document.activeElement === one(root, '[data-after]') || isWebKit).toBe(true);
  });
});

describe.runIf(isChromium)('forced colours (Chromium)', () => {
  test('the bars paint in CanvasText and the track keeps an outline', async () => {
    const session = cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'forced-colors', value: 'active' }],
    });
    try {
      const root = await mount(list());
      expect(matchMedia('(forced-colors: active)').matches).toBe(true);
      const span = document.createElement('span');
      span.style.forcedColorAdjust = 'none';
      span.style.color = 'CanvasText';
      document.body.append(span);
      const text = getComputedStyle(span).color;
      span.remove();
      for (const rect of root.querySelectorAll('rect'))
        expect(getComputedStyle(rect).fill).toBe(text);
      for (const track of root.querySelectorAll<HTMLElement>('.nz-ranked-list-track')) {
        expect(getComputedStyle(track).outlineStyle).toBe('solid');
      }
      // the card keeps its edge (Card's own forced-colours border)
      expect(getComputedStyle(one(root, '.nz-ranked-list')).borderTopColor).toBe(text);
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  });
});
