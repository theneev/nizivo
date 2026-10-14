// Tabs and TabNav in Chromium (ARCHITECTURE.md §9.5, §8.5, §16.4; figma/13 §4.4–4.5). Tabs: the APG
// tabs keyboard through the engine (roving focus, Home/End, automatic and manual activation, RTL arrow
// flip), hydration of the server HTML, keepMounted. Both: the inset focus outline, the indicator, and
// the bold width reserved so a selection never moves the other tabs. TabNav: plain links.
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NizivoConfig } from '../../src/config/index';
import type { ChangeDetails } from '../../src/contracts/details';
import { TabNav } from '../../src/tab-nav/index';
import { TabNavExample, TabNavRouterExample } from '../../src/tab-nav/tab-nav.example';
import { Tabs } from '../../src/tabs/index';
import type { TabsValueReason } from '../../src/tabs/tabs.contract';
import { TabsExample, TabsManualExample, TabsStatesExample } from '../../src/tabs/tabs.example';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/tabs/tabs.css',
    '../../src/tab-nav/tab-nav.css',
    '../../src/text/text.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 5)
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function hydrate(app: ReactNode): Promise<{ container: HTMLElement; problems: unknown[] }> {
  const html = renderToString(app);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  return { container, problems };
}

async function mount(app: ReactNode, dir?: 'rtl'): Promise<HTMLElement> {
  const container = document.createElement('div');
  if (dir !== undefined) container.dir = dir;
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await settle();
  return container;
}

function tabs(container: ParentNode): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('[role="tab"]')];
}

function selected(container: ParentNode): string | undefined {
  const tab = tabs(container).find((t) => t.getAttribute('aria-selected') === 'true');
  return tab?.querySelector('.nz-tabs-text')?.textContent ?? undefined;
}

function panelText(container: ParentNode): string[] {
  return [...container.querySelectorAll<HTMLElement>('[role="tabpanel"]')].map(
    (panel) => panel.textContent ?? '',
  );
}

function indicator(element: Element): string {
  return getComputedStyle(element, '::before').backgroundColor;
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

function Views({
  activationMode,
  onValueChange,
}: {
  activationMode?: 'automatic' | 'manual';
  onValueChange?: (value: string, details: ChangeDetails<TabsValueReason>) => void;
}): JSX.Element {
  return (
    <div>
      <button type="button">before</button>
      <Tabs.Root
        defaultValue="b"
        {...(activationMode === undefined ? {} : { activationMode })}
        {...(onValueChange === undefined ? {} : { onValueChange })}
      >
        <Tabs.List aria-label="Views">
          <Tabs.Tab value="a">Alpha</Tabs.Tab>
          <Tabs.Tab value="b">Beta</Tabs.Tab>
          <Tabs.Tab value="c" disabled>
            Gamma
          </Tabs.Tab>
          <Tabs.Tab value="d">Delta</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Panel A</Tabs.Panel>
        <Tabs.Panel value="b">
          Panel B <a href="#b">a link</a>
        </Tabs.Panel>
        <Tabs.Panel value="c">Panel C</Tabs.Panel>
        <Tabs.Panel value="d">Panel D</Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

function Controlled(): JSX.Element {
  const [value, setValue] = useState('a');
  return (
    <>
      <output>{value}</output>
      <Tabs.Root value={value} onValueChange={setValue}>
        <Tabs.List aria-label="Views">
          <Tabs.Tab value="a">Alpha</Tabs.Tab>
          <Tabs.Tab value="b">Beta</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">Panel A</Tabs.Panel>
        <Tabs.Panel value="b">Panel B</Tabs.Panel>
      </Tabs.Root>
    </>
  );
}

/** Two links with one label; a click makes one current without navigating. */
function Switcher(): JSX.Element {
  const [current, setCurrent] = useState('a');
  return (
    <TabNav.Root aria-label="Views">
      {['a', 'b'].map((key) => (
        <TabNav.Link
          key={key}
          href={`#${key}`}
          current={current === key}
          onClick={(event) => {
            event.preventDefault();
            setCurrent(key);
          }}
        >
          All orders
        </TabNav.Link>
      ))}
    </TabNav.Root>
  );
}

describe('Tabs', () => {
  test('every example hydrates with no console error, and the selected tab becomes the Tab stop', async () => {
    const { container, problems } = await hydrate(
      <div>
        <TabsExample />
        <TabsStatesExample />
        <TabsManualExample />
      </div>,
    );
    expect(problems).toEqual([]);
    // the server renders every tab at tabindex -1; the engine makes the selected one the stop
    const stops = tabs(container).filter((tab) => tab.tabIndex === 0);
    expect(stops.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'true', 'true']);
    expect(container.innerHTML).not.toMatch(/data-rac|data-focused|data-hovered|react-aria-[A-Z]/);
  });

  test('automatic: Tab enters at the selected tab; arrows, Home and End move and select', async () => {
    const onValueChange = vi.fn<(value: string, details: ChangeDetails<TabsValueReason>) => void>();
    const container = await mount(<Views onValueChange={onValueChange} />);
    expect(onValueChange).not.toHaveBeenCalled();
    container.querySelector('button')?.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(tabs(container)[1]);
    await userEvent.keyboard('{ArrowRight}');
    // the disabled tab is skipped
    expect(document.activeElement).toBe(tabs(container)[3]);
    expect(selected(container)).toBe('Delta');
    expect(panelText(container)).toEqual(['Panel D']);
    expect(onValueChange).toHaveBeenLastCalledWith('d', { reason: 'unknown' });
    await userEvent.keyboard('{Home}');
    expect(selected(container)).toBe('Alpha');
    await userEvent.keyboard('{End}');
    expect(selected(container)).toBe('Delta');
    // the arrows wrap at either end
    await userEvent.keyboard('{ArrowRight}');
    expect(selected(container)).toBe('Alpha');
    await userEvent.keyboard('{ArrowLeft}');
    expect(selected(container)).toBe('Delta');
    await userEvent.keyboard('{ArrowLeft}');
    expect(selected(container)).toBe('Beta');
    expect(onValueChange).toHaveBeenCalledTimes(6);
    // Tab leaves the strip for the panel's first focusable element
    await userEvent.tab();
    expect(document.activeElement?.textContent).toBe('a link');
  });

  test('manual: arrows only move focus; Enter or Space selects', async () => {
    const container = await mount(<Views activationMode="manual" />);
    container.querySelector('button')?.focus();
    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(tabs(container)[0]);
    expect(selected(container)).toBe('Beta');
    expect(panelText(container)[0]).toContain('Panel B');
    await userEvent.keyboard('{Enter}');
    expect(selected(container)).toBe('Alpha');
    expect(panelText(container)).toEqual(['Panel A']);
    await userEvent.keyboard('{End}');
    await userEvent.keyboard(' ');
    expect(selected(container)).toBe('Delta');
  });

  test('RTL: under an RTL locale the arrows follow the reading direction', async () => {
    const container = await mount(
      <NizivoConfig locale="ar-EG">
        <Views />
      </NizivoConfig>,
      'rtl',
    );
    container.querySelector('button')?.focus();
    await userEvent.tab();
    expect(selected(container)).toBe('Beta');
    // ArrowLeft is "next" in RTL: past the disabled tab to Delta
    await userEvent.keyboard('{ArrowLeft}');
    expect(selected(container)).toBe('Delta');
    await userEvent.keyboard('{ArrowRight}');
    expect(selected(container)).toBe('Beta');
    // the strip runs right to left: the first tab is at the inline start (the right)
    const [first, second] = tabs(container);
    expect(first && second ? first.getBoundingClientRect().left : 0).toBeGreaterThan(
      second ? second.getBoundingClientRect().left : 0,
    );
  });

  test('a pointer selects; controlled, the parent owns the value', async () => {
    const container = await mount(<Controlled />);
    const second = tabs(container)[1];
    if (second === undefined) throw new Error('no tab');
    await userEvent.click(second);
    expect(container.querySelector('output')?.textContent).toBe('b');
    expect(selected(container)).toBe('Beta');
    // a pointer selection draws no focus outline
    expect(second.hasAttribute('data-focus-visible')).toBe(false);
  });

  test('keepMounted keeps a panel and its state while another tab is shown', async () => {
    const container = await mount(<TabsManualExample />);
    const field = container.querySelector('textarea');
    if (field === null) throw new Error('no textarea');
    await userEvent.fill(field, 'Ship the red mugs.');
    const [write, preview] = tabs(container);
    if (write === undefined || preview === undefined) throw new Error('no tabs');
    await userEvent.click(preview);
    expect(field.isConnected).toBe(true);
    expect(field.closest('[data-slot="tabs-panel"]')?.hasAttribute('hidden')).toBe(true);
    expect(field.checkVisibility()).toBe(false);
    await userEvent.click(write);
    expect(container.querySelector('textarea')).toBe(field);
    expect(field.value).toBe('Ship the red mugs.');
    expect(field.checkVisibility()).toBe(true);
  });

  test('styles: the inset focus outline, the indicator, and no width jump on selection', async () => {
    const container = await mount(<Views />);
    const [alpha, beta] = tabs(container);
    if (alpha === undefined || beta === undefined) throw new Error('no tabs');
    const width = alpha.getBoundingClientRect().width;
    expect(beta.getBoundingClientRect().height).toBe(40);
    // the strip's hairline sits under the 40 px tabs
    const list = container.querySelector<HTMLElement>('[role="tablist"]');
    expect(list?.getBoundingClientRect().height).toBe(41);
    expect(indicator(beta)).not.toBe(TRANSPARENT);
    expect(indicator(alpha)).toBe(TRANSPARENT);
    container.querySelector('button')?.focus();
    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft}');
    await settle(200);
    expect(document.activeElement).toBe(alpha);
    expect(alpha.hasAttribute('data-focus-visible')).toBe(true);
    const outline = getComputedStyle(alpha);
    expect(outline.outlineStyle).toBe('solid');
    expect(outline.outlineOffset).toBe('-2px');
    // selected now, and bold, but exactly as wide as before
    expect(alpha.getBoundingClientRect().width).toBe(width);
    expect(indicator(alpha)).not.toBe(TRANSPARENT);
    expect(indicator(beta)).toBe(TRANSPARENT);
  });

  test('narrow: the strip scrolls sideways instead of wrapping, and keeps the focused tab in view', async () => {
    const container = await mount(
      <div style={{ inlineSize: '160px' }}>
        <TabsExample />
      </div>,
    );
    const list = container.querySelector<HTMLElement>('[role="tablist"]');
    if (list === null) throw new Error('no tablist');
    // one row: 41 px, plus a classic scrollbar's height where the platform draws one
    expect(list.getBoundingClientRect().height).toBeGreaterThanOrEqual(41);
    expect(list.getBoundingClientRect().height).toBeLessThan(41 + 40);
    expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);
    tabs(container)[0]?.focus();
    await userEvent.keyboard('{End}');
    await settle(200);
    const last = tabs(container).at(-1);
    const box = list.getBoundingClientRect();
    const lastBox = last?.getBoundingClientRect();
    expect(lastBox && lastBox.right <= box.right + 1 && lastBox.left >= box.left - 1).toBe(true);
  });
});

describe('TabNav', () => {
  test('links, not tabs: Tab moves between them; the current one has the indicator', async () => {
    const container = await mount(
      <div>
        <TabNavExample />
        <TabNavRouterExample />
      </div>,
    );
    const links = [...container.querySelectorAll<HTMLAnchorElement>('a')];
    expect(links).toHaveLength(9);
    expect(container.querySelector('[role="tab"], [role="tablist"]')).toBeNull();
    links[0]?.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(links[1]);
    const current = container.querySelector('[aria-current="page"]');
    // the pointer may rest on a link from an earlier test, and hover draws the indicator too
    const rest = links.find(
      (link) => !link.matches(':hover') && !link.hasAttribute('aria-current'),
    );
    if (current === null || rest === undefined) throw new Error('no current link');
    expect(indicator(current)).not.toBe(TRANSPARENT);
    expect(indicator(rest)).toBe(TRANSPARENT);
    const focused = getComputedStyle(links[1] ?? current);
    expect(focused.outlineStyle).toBe('solid');
    expect(focused.outlineOffset).toBe('-2px');
    expect(focused.textDecorationLine).toBe('none');
  });

  test('the current weight never changes a link width', async () => {
    const container = await mount(<Switcher />);
    const [a, b] = [...container.querySelectorAll('a')];
    if (a === undefined || b === undefined) throw new Error('no links');
    const width = b.getBoundingClientRect().width;
    await userEvent.click(b);
    expect(b.getAttribute('aria-current')).toBe('page');
    expect(b.getBoundingClientRect().width).toBe(width);
  });
});
