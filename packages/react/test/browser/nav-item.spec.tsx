// NavItem in a real engine (Figma Nav Item 755:658, figma/06 §6.1): the server HTML only, as an RSC
// page ships it. Tab order (every enabled link; a disabled item is not a stop), aria-current, the
// focus outline from nz.base, the fixed 40 px row with and without a count, the current item's fill,
// and the collapsed rail an ancestor's data-collapsed draws (labels out of the layout, still the
// links' text; a 40 px square; a count as a dot).
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import { NavItem } from '../../src/nav-item/index';
import {
  NavItemCollapsedExample,
  NavItemExample,
  NavItemRouterExample,
} from '../../src/nav-item/nav-item.example';

const STYLES = import.meta.glob(
  ['../../../tokens/dist/tokens.css', '../../styles/base.css', '../../src/nav-item/nav-item.css'],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 3)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const isWebKit = server.browser === 'webkit';

afterEach(() => {
  document.body.replaceChildren();
});

async function frames(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mount(element: ReactElement): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.style.padding = '8px';
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

function items(container: ParentNode): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="nav-item"]')];
}

function one(container: ParentNode, selector: string): HTMLElement {
  const found = container.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`nothing matches ${selector}`);
  return found;
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

describe('NavItem', () => {
  test('Tab visits every enabled link in order; a disabled item is not a stop', async () => {
    const container = await mount(<NavItemRouterExample />);
    const [general, payments, staff] = items(container);
    if (general === undefined || payments === undefined || staff === undefined)
      throw new Error('no items');
    const stops = [
      one(container, '[data-before]'),
      general,
      payments,
      one(container, '[data-after]'),
    ];
    for (const [index, stop] of stops.entries()) {
      const next = stops[index + 1];
      if (next === undefined) break;
      // oxlint-disable-next-line no-await-in-loop -- one Tab after the other
      await tabTo(stop, next);
      expect(document.activeElement).toBe(next);
    }
    expect(staff.tabIndex).toBe(-1);
    expect(staff.getAttribute('aria-disabled')).toBe('true');
    expect(staff.hasAttribute('href')).toBe(false);
  });

  test('the current link is aria-current="page" and filled; the focus outline is solid', async () => {
    const container = await mount(<NavItemExample />);
    const current = one(container, '[aria-current="page"]');
    expect(current.textContent).toBe('Orders12');
    const other = items(container)[0];
    if (other === undefined) throw new Error('no item');
    expect(getComputedStyle(current).backgroundColor).not.toBe(
      getComputedStyle(other).backgroundColor,
    );
    expect(getComputedStyle(current).fontWeight).toBe('600');
    await tabTo(one(container, '[data-before]'), other);
    expect(document.activeElement).toBe(other);
    expect(getComputedStyle(other).outlineStyle).toBe('solid');
  });

  test('a fixed 40 px row, with or without a count; targets are at least 24 px', async () => {
    const container = await mount(<NavItemExample />);
    for (const item of items(container)) {
      const box = item.getBoundingClientRect();
      expect(box.height).toBe(40);
      expect(box.width).toBeGreaterThanOrEqual(24);
    }
  });

  test('a long label ends in an ellipsis instead of growing the row', async () => {
    const container = await mount(
      <div style={{ inlineSize: 160 }}>
        <NavItem href="#" count={4}>
          A very long destination name that cannot fit
        </NavItem>
      </div>,
    );
    const [item] = items(container);
    expect(item?.getBoundingClientRect().height).toBe(40);
    expect(item?.getBoundingClientRect().width).toBe(160);
    const label = one(container, '.nz-nav-item-label');
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
  });

  test('collapsed by an ancestor: 40 px squares; the label and count stay as text, out of sight', async () => {
    const container = await mount(<NavItemCollapsedExample />);
    for (const item of items(container)) {
      const box = item.getBoundingClientRect();
      expect([box.width, box.height]).toEqual([40, 40]);
      const label = one(item, '.nz-nav-item-label');
      expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
      expect(label.textContent).not.toBe('');
    }
    const orders = one(container, '[aria-current="page"]');
    expect(orders.textContent).toBe('Orders12');
    // the count is a dot on the icon
    const dot = getComputedStyle(one(orders, '.nz-nav-item-icon'), '::after');
    expect(dot.content).toBe('""');
    expect(dot.width).toBe('8px');
    // an item with no count draws no dot
    const home = items(container)[0];
    if (home === undefined) throw new Error('no item');
    expect(getComputedStyle(one(home, '.nz-nav-item-icon'), '::after').content).toBe('none');
  });
});
