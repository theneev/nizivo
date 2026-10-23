// Split and StickyBar in a real engine: Split's columns sit side by side while the main column keeps
// 60 % of the row and stack below that, by the Split's own width; StickyBar sticks to the bottom of
// the viewport while its section scrolls, above the shell's bottom chrome.
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { Split } from '../../src/split/index';
import { StickyBarExample } from '../../src/sticky-bar/sticky-bar.example';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/button/button.css',
    '../../src/split/split.css',
    '../../src/sticky-bar/sticky-bar.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 5)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

beforeAll(async () => {
  await page.viewport(1280, 800);
});

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.style.removeProperty('--nz-layout-bottom-inset');
  window.scrollTo(0, 0);
});

function mount(element: ReactElement, width?: number): HTMLElement {
  const container = document.createElement('div');
  if (width !== undefined) container.style.inlineSize = `${width}px`;
  container.innerHTML = renderToString(element);
  document.body.append(container);
  return container;
}

function box(root: ParentNode, slot: string): DOMRect {
  const found = root.querySelector(`[data-slot="${slot}"]`);
  if (found === null) throw new Error(`no ${slot}`);
  return found.getBoundingClientRect();
}

const split = (aside?: 'narrow'): ReactElement => (
  <Split.Root {...(aside === undefined ? {} : { aside })} style={{ gap: '24px' }}>
    <Split.Main>Main</Split.Main>
    <Split.Aside>Aside</Split.Aside>
  </Split.Root>
);

describe('Split', () => {
  test("08's Overview width: 744 + 24 + 360, side by side", () => {
    const root = mount(split(), 1128);
    const main = box(root, 'split-main');
    const aside = box(root, 'split-aside');
    expect(Math.round(main.width)).toBe(744);
    expect(Math.round(aside.width)).toBe(360);
    expect(Math.round(aside.left - main.right)).toBe(24);
    expect(aside.top).toBe(main.top);
  });

  test('narrower than the main column needs: one column, in source order, full width', () => {
    const root = mount(split(), 600);
    const main = box(root, 'split-main');
    const aside = box(root, 'split-aside');
    expect(Math.round(main.width)).toBe(600);
    expect(Math.round(aside.width)).toBe(600);
    expect(aside.top).toBeGreaterThan(main.top);
  });

  test("Settings' narrow aside is 232 px", () => {
    const root = mount(split('narrow'), 1128);
    expect(Math.round(box(root, 'split-aside').width)).toBe(232);
  });
});

describe('StickyBar', () => {
  test('sticks to the viewport bottom while a long section scrolls, above the bottom inset', async () => {
    await page.viewport(390, 800);
    const root = mount(
      <section>
        <div style={{ blockSize: '2000px' }}>Content</div>
        <StickyBarExample />
      </section>,
    );
    const bottom = (): number => Math.round(box(root, 'sticky-bar').bottom);
    expect(bottom()).toBe(800);
    window.scrollTo(0, 600);
    await new Promise(requestAnimationFrame);
    expect(bottom()).toBe(800);
    document.documentElement.style.setProperty('--nz-layout-bottom-inset', '64px');
    await new Promise(requestAnimationFrame);
    expect(bottom()).toBe(736);
    const bar = root.querySelector('[data-slot="sticky-bar"]');
    if (bar === null) throw new Error('no sticky bar');
    expect(getComputedStyle(bar).zIndex).toBe('100');
  });
});
