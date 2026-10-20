// Breadcrumb in a real engine (Figma 755:998, figma/06 §6.9): the server HTML only, as an RSC page
// ships it. Keyboard order (every level's link, in order; the current page is not a stop), the focus
// outline from nz.base, 24 px targets, decorative separators (none before the root), the chevron
// mirrored under RTL, a long trail that wraps instead of collapsing, and forced colours (Chromium).
//
// Every engine: `NZ_BROWSER=webkit` (or `firefox`) runs it too. WebKit on macOS does not Tab to
// links, so there the order is checked by script focus after a key press (as focus-outline.spec does).
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { cdp, server, userEvent } from 'vitest/browser';
import { BreadcrumbItem, BreadcrumbRoot } from '../../src/breadcrumb/breadcrumb';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/breadcrumb/breadcrumb.css',
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

afterEach(() => {
  document.body.replaceChildren();
});

async function frames(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mount(element: ReactElement, dir?: 'rtl', width?: number): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.style.padding = '8px';
  if (width !== undefined) container.style.width = `${width}px`;
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

/** A token resolved where `near` is, as computed (a colour through `color`, exempt from forced colours). */
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

/** Tab once from `from`; where WebKit's Tab skips links, script focus right after the key press. */
async function tabTo(from: HTMLElement, expected: HTMLElement): Promise<void> {
  from.focus();
  await userEvent.keyboard('{Tab}');
  await frames(20);
  if (isWebKit && document.activeElement !== expected) {
    expected.focus();
    await frames(20);
  }
}

const trail = (
  <BreadcrumbRoot>
    <BreadcrumbItem href="#products">Products</BreadcrumbItem>
    <BreadcrumbItem href="#mugs">Mugs &amp; cups</BreadcrumbItem>
    <BreadcrumbItem current>Stoneware mug</BreadcrumbItem>
  </BreadcrumbRoot>
);

describe('keyboard and focus', () => {
  test('Tab visits each link in order, then leaves; the current page is not a stop', async () => {
    const root = await mount(trail);
    const links = [...root.querySelectorAll<HTMLElement>('.nz-breadcrumb-link')];
    expect(links.map((link) => link.textContent)).toEqual(['Products', 'Mugs & cups']);
    const stops = [one(root, '[data-before]'), ...links, one(root, '[data-after]')];
    for (const [index, stop] of stops.entries()) {
      const next = stops[index + 1];
      if (next === undefined) break;
      // oxlint-disable-next-line no-await-in-loop -- one Tab after the other
      await tabTo(stop, next);
      expect(document.activeElement).toBe(next);
    }
    expect(one(root, '.nz-breadcrumb-current').tabIndex).toBe(-1);
  });

  test('a link reached from the keyboard draws the nz.base outline: solid, token width and colour, 2 px out', async () => {
    const root = await mount(trail);
    const link = one(root, '.nz-breadcrumb-link');
    await tabTo(one(root, '[data-before]'), link);
    expect(document.activeElement).toBe(link);
    const css = getComputedStyle(link);
    expect({
      style: css.outlineStyle,
      width: css.outlineWidth,
      offset: css.outlineOffset,
      color: css.outlineColor,
    }).toEqual({
      style: 'solid',
      width: token(link, 'width', '--nz-border-width-focus'),
      offset: '2px',
      color: token(link, 'color', '--nz-border-focus'),
    });
  });
});

describe('layout', () => {
  test('24 px links (WCAG 2.5.8), 16 px separators, none before the root, 6 px apart', async () => {
    const root = await mount(trail);
    for (const level of root.querySelectorAll<HTMLElement>(
      '.nz-breadcrumb-link, .nz-breadcrumb-current',
    )) {
      expect(level.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    }
    const separators = [...root.querySelectorAll<HTMLElement>('.nz-breadcrumb-separator')];
    expect(separators).toHaveLength(3);
    expect(getComputedStyle(separators[0] ?? root).display).toBe('none');
    for (const separator of separators.slice(1)) {
      const box = separator.getBoundingClientRect();
      expect([box.width, box.height]).toEqual([16, 16]);
      expect(separator.getAttribute('aria-hidden')).toBe('true');
      const previous = separator.parentElement?.previousElementSibling?.lastElementChild;
      const gap = box.left - (previous?.getBoundingClientRect().right ?? 0);
      expect(Math.round(gap)).toBe(6);
    }
  });

  test('under dir="rtl" the trail runs right to left and the chevrons point left', async () => {
    const root = await mount(trail, 'rtl');
    const [first, second] = [...root.querySelectorAll<HTMLElement>('.nz-breadcrumb-link')];
    expect(
      (first?.getBoundingClientRect().left ?? 0) > (second?.getBoundingClientRect().left ?? 0),
    ).toBe(true);
    const separator = root.querySelectorAll<HTMLElement>('.nz-breadcrumb-separator')[1];
    expect(getComputedStyle(separator ?? root).scale).toBe('-1 1');
  });

  test('a deep trail wraps in a narrow container; every level stays a visible link', async () => {
    const levels = ['Home', 'Store', 'Catalogue', 'Products', 'Kitchen', 'Mugs'];
    const root = await mount(
      <BreadcrumbRoot>
        {levels.map((level) => (
          <BreadcrumbItem key={level} href={`#${level}`}>
            {level}
          </BreadcrumbItem>
        ))}
        <BreadcrumbItem current>Stoneware mug with a very long name</BreadcrumbItem>
      </BreadcrumbRoot>,
      undefined,
      240,
    );
    const list = one(root, '.nz-breadcrumb-list');
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    const tops = new Set(
      [...root.querySelectorAll<HTMLElement>('.nz-breadcrumb-item')].map((item) =>
        Math.round(item.getBoundingClientRect().top),
      ),
    );
    expect(tops.size).toBeGreaterThan(1);
    for (const link of root.querySelectorAll<HTMLElement>('.nz-breadcrumb-link')) {
      expect(link.getBoundingClientRect().width).toBeGreaterThan(0);
    }
  });
});

describe.runIf(isChromium)('forced colours (Chromium)', () => {
  test('links, the current page and the separators stay visible; the outline stays solid', async () => {
    const session = cdp();
    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'forced-colors', value: 'active' }],
    });
    try {
      const root = await mount(trail);
      expect(matchMedia('(forced-colors: active)').matches).toBe(true);
      const canvas = getComputedStyle(document.body).backgroundColor;
      for (const part of root.querySelectorAll<HTMLElement>(
        '.nz-breadcrumb-link, .nz-breadcrumb-current, .nz-breadcrumb-item + .nz-breadcrumb-item .nz-breadcrumb-separator',
      )) {
        const colour = getComputedStyle(part).color;
        expect(colour).not.toBe(canvas);
        expect(colour).not.toMatch(/^rgba\(.*, 0\)$|^transparent$/);
      }
      const link = one(root, '.nz-breadcrumb-link');
      await tabTo(one(root, '[data-before]'), link);
      const css = getComputedStyle(link);
      expect(css.outlineStyle).toBe('solid');
      expect(css.outlineColor).not.toBe(token(link, 'color', '--nz-border-focus'));
    } finally {
      await session.send('Emulation.setEmulatedMedia', { features: [] });
    }
  });
});
