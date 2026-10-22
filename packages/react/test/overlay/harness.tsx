// Shared helpers for the overlay conformance lane (ARCHITECTURE.md §9.6 case 8, §12.5). Engine-free:
// every helper reads the DOM contract (classes, data-slot, the data-* vocabulary, roles), never an
// engine API, so the same cases can run against another family's OverlayEngine.
import { StrictMode, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import allowlist from '../../src/_engines/react-aria/dom-allowlist.json' with { type: 'json' };

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/button/button.css',
    '../../src/icon-button/icon-button.css',
    '../../src/kbd/kbd.css',
    '../../src/select/select.css',
    '../../src/dialog/dialog.css',
    '../../src/tooltip/tooltip.css',
    '../../src/menu/menu.css',
    '../../src/popover/popover.css',
    '../../src/drawer/drawer.css',
    '../../src/toast/toast.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 12) {
  throw new Error('a stylesheet is missing; build @nizivo/tokens and run nz gen');
}
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-nz-motion');
  vi.restoreAllMocks();
  // React Aria restores <html> styles in effects; let them run before the next case reads them.
  await settle();
});

export async function settle(ms = 50): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Polls `assertion` until it stops throwing (default 2 s). */
export async function until(assertion: () => void, timeout = 2000): Promise<void> {
  await vi.waitFor(assertion, { timeout, interval: 10 });
}

export async function mount(
  app: ReactNode,
  options: { strict?: boolean } = {},
): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.dataset['testRoot'] = '';
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(options.strict === true ? <StrictMode>{app}</StrictMode> : app);
  await settle();
  return container;
}

/** Server HTML in the document, then hydration; returns every hydration problem. */
export async function hydrate(app: ReactNode): Promise<{ html: string; problems: unknown[] }> {
  const html = renderToString(app);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  return { html, problems };
}

/** The element carrying `data-slot="<name>"`, or null. */
export function find(slot: string, root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
}

export function get(slot: string, root: ParentNode = document): HTMLElement {
  const element = find(slot, root);
  if (element === null) throw new Error(`no [data-slot="${slot}"]`);
  return element;
}

const ALLOWED = new Set<string>([
  ...Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
  ...allowlist.attributes,
]);

/**
 * `"<slot> <attribute>"` for every data-* attribute outside the vocabulary and the engine's
 * functional allowlist on a documented part (an element with `data-slot`; §9.6 case 3). Elements the
 * engine renders on its own (focus sentinels, the hidden native select) are not parts.
 */
export function outsideVocabulary(root: ParentNode = document.body): string[] {
  const out: string[] = [];
  for (const element of root.querySelectorAll('[data-slot]')) {
    for (const { name } of element.attributes) {
      if (name.startsWith('data-') && !ALLOWED.has(name)) {
        out.push(`${element.getAttribute('data-slot') ?? element.localName} ${name}`);
      }
    }
  }
  return out;
}

/** Engine default classes (`react-aria-*`) anywhere in the document: adapters write no classes. */
export function engineClasses(root: ParentNode = document.body): string[] {
  return [...root.querySelectorAll('[class*="react-aria"]')].map((element) => element.className);
}

/** Every documented part carries exactly its own class for its slot (§8.2). */
export function slotsWithoutClass(root: ParentNode = document.body): string[] {
  return [...root.querySelectorAll<HTMLElement>('[data-slot]')]
    .filter((element) => !element.classList.contains(`nz-${element.dataset['slot'] ?? ''}`))
    .map((element) => element.dataset['slot'] ?? '');
}

/** `<html>` and `<body>` inline styles: a scroll lock must restore both exactly (O-04, O-10). */
export function pageStyles(): string {
  const html = document.documentElement.getAttribute('style') ?? '';
  const body = document.body.getAttribute('style') ?? '';
  return `html{${html}} body{${body}}`;
}

/**
 * The node an engine appended to its portal container for `element`: the highest ancestor that is
 * not a documented part and not the container itself (engines may wrap a popup in a bare div).
 */
export function portalNode(element: HTMLElement, container: Element = document.body): HTMLElement {
  let node = element;
  while (node.parentElement !== null && node.parentElement !== container) {
    if (node.parentElement.hasAttribute('data-slot') || node.parentElement === document.body) break;
    node = node.parentElement;
  }
  return node;
}

/** Moves the pointer onto the page first: engines open hover overlays once a pointer has moved. */
export async function movePointer(hover: (element: Element) => Promise<void>): Promise<void> {
  const spot = document.createElement('div');
  spot.style.cssText =
    'position: fixed; inset-block-start: 0; inset-inline-start: 0; inline-size: 8px; block-size: 8px;';
  document.body.append(spot);
  await hover(spot);
  spot.remove();
}

/**
 * Parks the real pointer in an 8 px spot in the bottom-right corner, away from where every case
 * mounts its triggers. A pointer left where an earlier case pressed or hovered can end up over a
 * trigger the next case mounts, and WebKit and Firefox then hover it with a trusted pointerover and
 * pointerenter and no pointermove, which React Aria 1.22.1 takes for a hover start.
 */
export async function parkPointer(): Promise<void> {
  const parking = document.createElement('div');
  // A test id keeps Playwright's locator on this element while a closing popup leaves the DOM (a
  // positional one, `div >> nth=3`, moves to another element).
  parking.dataset['testid'] = 'pointer-parking';
  parking.style.cssText =
    'position: fixed; inset-block-end: 0; inset-inline-end: 0; inline-size: 8px; block-size: 8px;';
  document.body.append(parking);
  await userEvent.hover(parking);
  parking.remove();
}

/** Whether the page is scroll-locked: React Aria hides overflow on <html>. */
export function locked(): boolean {
  return getComputedStyle(document.documentElement).overflow === 'hidden';
}

/** Whether the element at the centre of `element` is `element` or inside it (it paints on top). */
export function paintsOnTop(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return hit !== null && (hit === element || element.contains(hit));
}

/** The computed z-index of the overlay band token. */
export function overlayBand(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--nz-z-overlay').trim();
}

/** Transition durations of `element` in ms, one per transitioned property. */
export function transitionMs(element: Element): Record<string, number> {
  const computed = getComputedStyle(element);
  const properties = computed.transitionProperty.split(',').map((value) => value.trim());
  const durations = computed.transitionDuration.split(',').map((value) => value.trim());
  const out: Record<string, number> = {};
  properties.forEach((property, index) => {
    const raw = durations[index % durations.length] ?? '0s';
    out[property] = raw.endsWith('ms') ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
  });
  return out;
}

/** Records every element that carried `attribute` while the observer ran (it may be brief). */
export function watchAttribute(attribute: string): { seen: Set<string>; stop: () => void } {
  const seen = new Set<string>();
  const note = (node: Node): void => {
    if (!(node instanceof Element)) return;
    for (const element of [node, ...node.querySelectorAll(`[${attribute}]`)]) {
      if (element.hasAttribute(attribute)) seen.add(element.getAttribute('data-slot') ?? '');
    }
  };
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const element = record.target;
      if (record.type === 'attributes' && element instanceof Element) {
        if (element.hasAttribute(attribute) || record.oldValue !== null) {
          seen.add(element.getAttribute('data-slot') ?? '');
        }
      } else record.addedNodes.forEach(note);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [attribute],
    attributeOldValue: true,
  });
  return { seen, stop: () => observer.disconnect() };
}

/** Asserts the open popup and everything around it stay inside the DOM contract. */
export function expectContract(): void {
  expect(outsideVocabulary()).toEqual([]);
  expect(engineClasses()).toEqual([]);
  expect(slotsWithoutClass()).toEqual([]);
}
