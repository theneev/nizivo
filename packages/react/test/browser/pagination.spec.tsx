// Pagination in a real engine (Figma 755:1007, figma/06 §6.10): the server HTML only, as an RSC page
// ships it (link mode, no client state). Keyboard order (a disabled step is not a stop), the focus
// outline from nz.base, 40 and 32 px targets (WCAG 2.5.8's 24 at least), the current page's inverse
// fill, the chevrons' direction in LTR and RTL, and forced colours (Chromium): the current page in
// Highlight, the disabled step in GrayText, the outline solid.
//
// Every engine: `NZ_BROWSER=webkit` (or `firefox`) runs it too. WebKit on macOS does not Tab to
// links, so there the order is checked by script focus after a key press.
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { cdp, server, userEvent } from 'vitest/browser';
import { Pagination } from '../../src/pagination/pagination';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/pagination/pagination.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 3)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const isChromium = server.browser === 'chromium';
const isWebKit = server.browser === 'webkit';
const href = (page: number): string => `#page-${page}`;

afterEach(() => {
  document.body.replaceChildren();
});

async function frames(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mount(element: ReactElement, dir?: 'rtl'): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.style.padding = '8px';
  container.style.width = '720px';
  if (dir !== undefined) container.dir = dir;
  container.innerHTML = renderToString(
    <>
      <input aria-label="Before" data-before="" />
      {element}
      <input aria-label="After" data-after="" />
    </>,
  );
  document.body.append(container);
  await frames();
  return container;
}

function one(container: ParentNode, selector: string): HTMLElement {
  const found = container.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`nothing matches ${selector}`);
  return found;
}

function token(near: Element, property: 'color' | 'width', name: string): string {
  const probe = document.createElement('span');
  probe.style.forcedColorAdjust = 'none';
  if (property === 'color') probe.style.color = `var(${name})`;
  else probe.style.outline = `var(${name}) solid`;
  near.parentElement?.append(probe);
  const css = getComputedStyle(probe);
  const value = property === 'color' ? css.color : css.outlineWidth;
  probe.remove();
  return value;
}

async function tabTo(from: HTMLElement, expected: HTMLElement): Promise<void> {
  from.focus();
  await userEvent.keyboard('{Tab}');
  await frames(20);
  if (isWebKit && document.activeElement !== expected) {
    expected.focus();
    await frames(20);
  }
}

/** The chevron's resolved direction: +1 points right, -1 left (rotation × mirror). */
function pointing(step: HTMLElement): number {
  const icon = one(step, '.nz-pagination-icon');
  const glyph = step.querySelector('svg');
  if (glyph === null) throw new Error('no glyph');
  const mirrored = getComputedStyle(icon).scale === '-1 1' ? -1 : 1;
  const turned = getComputedStyle(glyph).rotate === '180deg' ? -1 : 1;
  return mirrored * turned;
}

const first = <Pagination page={1} totalPages={13} getHref={href} summary="Showing 1–20 of 248" />;

describe('keyboard and focus', () => {
  test('page 1: Tab skips the disabled previous, visits every page link, then next', async () => {
    const root = await mount(first);
    const links = [
      ...root.querySelectorAll<HTMLElement>('a.nz-pagination-page, a.nz-pagination-next'),
    ];
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Page 1',
      'Page 2',
      'Page 3',
      'Page 4',
      'Page 5',
      'Page 13',
      'Next page',
    ]);
    const previous = one(root, '.nz-pagination-previous');
    expect(previous.tabIndex).toBe(-1);
    const stops = [one(root, '[data-before]'), ...links, one(root, '[data-after]')];
    for (const [index, stop] of stops.entries()) {
      const next = stops[index + 1];
      if (next === undefined) break;
      // oxlint-disable-next-line no-await-in-loop -- one Tab after the other
      await tabTo(stop, next);
      expect(document.activeElement).toBe(next);
    }
  });

  test('a page reached from the keyboard draws the nz.base outline, also on the current page', async () => {
    const root = await mount(first);
    const current = one(root, '[aria-current="page"]');
    await tabTo(one(root, '[data-before]'), current);
    const css = getComputedStyle(current);
    expect({
      style: css.outlineStyle,
      width: css.outlineWidth,
      offset: css.outlineOffset,
      color: css.outlineColor,
    }).toEqual({
      style: 'solid',
      width: token(current, 'width', '--nz-border-width-focus'),
      offset: '2px',
      color: token(current, 'color', '--nz-border-focus'),
    });
  });
});

describe('layout', () => {
  test.each([
    ['md', 40],
    ['sm', 32],
  ] as const)('%s: every page and step is a %i px square target, 4 px apart', async (size, px) => {
    const root = await mount(<Pagination page={7} totalPages={13} getHref={href} size={size} />);
    const targets = [
      ...root.querySelectorAll<HTMLElement>('.nz-pagination-page, .nz-pagination-step'),
    ];
    expect(targets).toHaveLength(7);
    for (const target of targets) {
      const box = target.getBoundingClientRect();
      expect(box.height).toBe(px);
      expect(box.width).toBeGreaterThanOrEqual(px);
    }
    const items = [...root.querySelectorAll<HTMLElement>('.nz-pagination-list > li')];
    const gaps = items
      .slice(1)
      .map((next, index) =>
        Math.round(
          next.getBoundingClientRect().left - (items[index]?.getBoundingClientRect().right ?? 0),
        ),
      );
    expect(gaps).toEqual(Array.from({ length: items.length - 1 }, () => 4));
  });

  test.each([
    ['md', 1, 9, 392],
    ['sm', 1, 9, 320],
    ['sm', 0, 7, 248],
  ] as const)(
    'a long list at %s with siblingCount %i is %i slots, %i px wide (the documented widths)',
    async (size, siblingCount, slots, px) => {
      const root = await mount(
        <Pagination
          page={7}
          totalPages={13}
          getHref={href}
          size={size}
          siblingCount={siblingCount}
        />,
      );
      const list = one(root, '.nz-pagination-list');
      expect(list.querySelectorAll(':scope > li')).toHaveLength(slots);
      const items = [...list.querySelectorAll(':scope > li')];
      const width =
        (items.at(-1)?.getBoundingClientRect().right ?? 0) -
        (items[0]?.getBoundingClientRect().left ?? 0);
      expect(Math.round(width)).toBe(px);
    },
  );

  test("the current page is Figma's inverse; the summary and the pages share a row", async () => {
    const root = await mount(first);
    const current = getComputedStyle(one(root, '[aria-current="page"]'));
    const page = one(root, '[aria-current="page"]');
    expect(current.backgroundColor).toBe(token(page, 'color', '--nz-bg-inverse'));
    expect(current.color).toBe(token(page, 'color', '--nz-text-inverse'));
    const summary = one(root, '.nz-pagination-summary').getBoundingClientRect();
    const list = one(root, '.nz-pagination-list').getBoundingClientRect();
    expect(
      Math.abs(summary.top + summary.height / 2 - (list.top + list.height / 2)),
    ).toBeLessThanOrEqual(1);
    expect(list.left).toBeGreaterThan(summary.right);
  });

  test('previous points back and next forward, in LTR and RTL', async () => {
    const ltr = await mount(<Pagination page={5} totalPages={13} getHref={href} />);
    expect(pointing(one(ltr, '.nz-pagination-previous'))).toBe(-1);
    expect(pointing(one(ltr, '.nz-pagination-next'))).toBe(1);
    document.body.replaceChildren();
    const rtl = await mount(<Pagination page={5} totalPages={13} getHref={href} />, 'rtl');
    expect(pointing(one(rtl, '.nz-pagination-previous'))).toBe(1);
    expect(pointing(one(rtl, '.nz-pagination-next'))).toBe(-1);
    const previous = one(rtl, '.nz-pagination-previous').getBoundingClientRect();
    const next = one(rtl, '.nz-pagination-next').getBoundingClientRect();
    expect(previous.left).toBeGreaterThan(next.left);
  });
});

/** The computed colour a system colour keyword resolves to. */
function systemColour(value: string): string {
  const span = document.createElement('span');
  span.style.forcedColorAdjust = 'none';
  span.style.color = value;
  document.body.append(span);
  const colour = getComputedStyle(span).color;
  span.remove();
  return colour;
}

describe.runIf(isChromium)('forced colours (Chromium)', () => {
  test('the current page in Highlight, the disabled step in GrayText, the outline solid', async () => {
    const session = cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'forced-colors', value: 'active' }],
    });
    try {
      const root = await mount(first);
      expect(matchMedia('(forced-colors: active)').matches).toBe(true);
      const current = one(root, '[aria-current="page"]');
      expect(getComputedStyle(current).backgroundColor).toBe(systemColour('Highlight'));
      expect(getComputedStyle(current).color).toBe(systemColour('HighlightText'));
      expect(getComputedStyle(one(root, '.nz-pagination-previous')).color).toBe(
        systemColour('GrayText'),
      );
      // the steps keep their ring
      expect(getComputedStyle(one(root, '.nz-pagination-next')).borderTopStyle).toBe('solid');
      await tabTo(one(root, '[data-before]'), current);
      const css = getComputedStyle(current);
      expect(css.outlineStyle).toBe('solid');
      expect(css.outlineColor).toBe(systemColour('CanvasText'));
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  });
});
