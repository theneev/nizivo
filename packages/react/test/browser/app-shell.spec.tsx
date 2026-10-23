// The shell in a real engine (M49; figma/06 §6.2, figma/08 §7): AppShellExample's server HTML,
// hydrated. At 1280 px the 264 px Sidebar and the TopBar; at 960 px the 72 px rail; at 390 px the
// MobileTopBar and the MobileTabBar fixed to the bottom, whose island writes the bottom inset on
// <html> and clears it again. The skip link is the first Tab stop and moves focus to <main>. More
// opens its bottom sheet as a modal dialog: Escape closes it and focus returns to More, and
// following a link in it closes it.
import { act, type ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { page, server, userEvent } from 'vitest/browser';
import { AppShellExample } from '../../src/app-shell/app-shell.example';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/avatar/avatar.css',
    '../../src/drawer/drawer.css',
    '../../src/icon-button/icon-button.css',
    '../../src/nav-item/nav-item.css',
    '../../src/page-header/page-header.css',
    '../../src/search-field/search-field.css',
    '../../src/sidebar/sidebar.css',
    '../../src/top-bar/top-bar.css',
    '../../src/mobile-top-bar/mobile-top-bar.css',
    '../../src/mobile-tab-bar/mobile-tab-bar.css',
    '../../src/app-shell/app-shell.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 13)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
// the build expands @custom-media (tokens' custom-media.css); the raw sources need it done here
style.textContent = Object.values(STYLES)
  .join('\n')
  .replaceAll('(--nz-sm)', '(width >= 40rem)')
  .replaceAll('(--nz-lg)', '(width >= 80rem)');
document.head.append(style);

const isWebKit = server.browser === 'webkit';
const root = document.documentElement;

const roots: Root[] = [];
afterEach(async () => {
  for (const r of roots.splice(0)) act(() => r.unmount());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  await page.viewport(1280, 800);
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Server HTML in the document at `width`, then hydration; collects every hydration problem. */
async function hydrate(app: ReactNode, width: number): Promise<{ problems: unknown[] }> {
  await page.viewport(width, 800);
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(
    hydrateRoot(container, app, {
      onRecoverableError: (error: unknown) => problems.push(error),
    }),
  );
  await settle(100);
  return { problems };
}

function one(selector: string): HTMLElement {
  const found = document.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`nothing matches ${selector}`);
  return found;
}

/** Keeps the test page where it is when a link is clicked; React still hears the click. */
const stay = (event: MouseEvent): void => event.preventDefault();

const shown = (selector: string): boolean => getComputedStyle(one(selector)).display !== 'none';

/** Tab once from `from`; where WebKit's Tab skips links and buttons, script focus right after. */
async function tabTo(from: HTMLElement | null, expected: HTMLElement): Promise<void> {
  if (from !== null) from.focus();
  else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  await userEvent.keyboard('{Tab}');
  await settle(20);
  if (isWebKit && document.activeElement !== expected) {
    expected.focus();
    await settle(20);
  }
}

describe('AppShell widths', () => {
  test('1280 px: the 264 px Sidebar with its labels, and the TopBar; no mobile bars', async () => {
    const { problems } = await hydrate(<AppShellExample />, 1280);
    expect(problems).toEqual([]);
    expect(one('[data-slot="sidebar"]').getBoundingClientRect().width).toBe(264);
    expect(one('.nz-nav-item-label').getBoundingClientRect().width).toBeGreaterThan(40);
    expect(shown('[data-slot="top-bar"]')).toBe(true);
    expect(shown('.nz-app-shell-mobile-top-bar')).toBe(false);
    expect(shown('.nz-app-shell-tab-bar')).toBe(false);
    expect(root.hasAttribute('data-nz-bottom-bar')).toBe(false);
    expect(root.style.getPropertyValue('--nz-layout-bottom-inset')).toBe('');
    // the main column starts at the sidebar's edge
    expect(one('main').getBoundingClientRect().left).toBeGreaterThanOrEqual(264);
  });

  test('960 px: the 72 px rail, its items 40 px squares, the store reduced to its mark', async () => {
    await hydrate(<AppShellExample />, 960);
    expect(one('[data-slot="sidebar"]').getBoundingClientRect().width).toBe(72);
    const item = one('.nz-nav-item').getBoundingClientRect();
    expect([item.width, item.height]).toEqual([40, 40]);
    expect(one('.nz-sidebar-header-title').getBoundingClientRect().width).toBeLessThanOrEqual(1);
    expect(one('.nz-sidebar-header-mark').getBoundingClientRect().width).toBe(32);
    expect(shown('[data-slot="top-bar"]')).toBe(true);
  });

  test('390 px: the MobileTopBar, and the MobileTabBar fixed to the bottom with the inset written', async () => {
    const { problems } = await hydrate(<AppShellExample />, 390);
    expect(problems).toEqual([]);
    expect(shown('.nz-app-shell-sidebar')).toBe(false);
    expect(shown('.nz-app-shell-top-bar')).toBe(false);
    expect(shown('[data-slot="mobile-top-bar"]')).toBe(true);
    const bar = one('[data-slot="mobile-tab-bar"]').getBoundingClientRect();
    expect(bar.width).toBe(390);
    expect(bar.bottom).toBe(800);
    // five equal columns of at least 64 px
    const cells = [
      ...document.querySelectorAll('.nz-mobile-tab-bar-link, .nz-mobile-tab-bar-more-trigger'),
    ].map((cell) => cell.getBoundingClientRect());
    expect(cells).toHaveLength(5);
    for (const cell of cells) expect(cell.height).toBeGreaterThanOrEqual(64);
    expect(new Set(cells.map((cell) => Math.round(cell.width))).size).toBe(1);
    // the island: the bar's height on <html>, and main keeps room for it
    expect(root.hasAttribute('data-nz-bottom-bar')).toBe(true);
    expect(root.style.getPropertyValue('--nz-layout-bottom-inset')).toBe(`${bar.height}px`);
    expect(Number.parseFloat(getComputedStyle(one('main')).paddingBlockEnd)).toBeGreaterThan(
      bar.height,
    );
    // growing past 640 px hides the bar, and the inset goes with it
    await page.viewport(800, 800);
    await settle(100);
    expect(root.hasAttribute('data-nz-bottom-bar')).toBe(false);
    expect(root.style.getPropertyValue('--nz-layout-bottom-inset')).toBe('');
  });

  test('unmounting the shell clears the inset', async () => {
    await hydrate(<AppShellExample />, 390);
    expect(root.hasAttribute('data-nz-bottom-bar')).toBe(true);
    for (const r of roots.splice(0)) act(() => r.unmount());
    expect(root.hasAttribute('data-nz-bottom-bar')).toBe(false);
    expect(root.style.getPropertyValue('--nz-layout-bottom-inset')).toBe('');
  });
});

describe('AppShell keyboard', () => {
  test('the skip link is the first Tab stop, shown on focus, and moves focus to <main>', async () => {
    await hydrate(<AppShellExample />, 1280);
    const skip = one('[data-slot="app-shell-skip"]');
    expect(skip.getBoundingClientRect().bottom).toBeLessThanOrEqual(0);
    await tabTo(null, skip);
    expect(document.activeElement).toBe(skip);
    await settle(20);
    expect(skip.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    await userEvent.keyboard('{Enter}');
    await settle(50);
    expect(document.activeElement).toBe(one('main'));
  });
});

describe('MobileTabBarMore', () => {
  test('opens the sheet as a modal dialog; Escape closes it and focus returns to More', async () => {
    await hydrate(<AppShellExample />, 390);
    const more = one('[data-slot="mobile-tab-bar-more-trigger"]');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(more);
    await settle(400);
    const dialog = one('[role="dialog"]');
    expect(dialog.getAttribute('aria-labelledby')).not.toBeNull();
    expect(document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
      'More',
    );
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    await userEvent.keyboard('{Escape}');
    await settle(400);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(more);
  });

  test('following a link in the sheet closes it', async () => {
    await hydrate(<AppShellExample />, 390);
    document.addEventListener('click', stay, true);
    try {
      await userEvent.click(one('[data-slot="mobile-tab-bar-more-trigger"]'));
      await settle(400);
      await userEvent.click(one('[role="dialog"] a[href="/settings"]'));
      await settle(400);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      document.removeEventListener('click', stay, true);
    }
  });
});
