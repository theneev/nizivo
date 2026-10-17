// The browser half of the visual-regression lane (ARCHITECTURE.md §18.1). scripts/visual/run.ts
// bundles this file with every packages/react/src/<name>/<name>.example.tsx, whose imports it
// points at the built dist/<name>/index.js (the published API, as the docs render it), and serves
// it with the built CSS. The harness mounts one example at a time on a stage that mirrors the docs
// preview, and exposes `globalThis.nzVisual` (scripts/visual/protocol.ts) for the runner to drive.
/* oxlint-disable no-await-in-loop -- settle() polls frame by frame */
import { createElement, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  Control,
  ExampleRef,
  Focused,
  Mounted,
  Rect,
  Theme,
  VisualApi,
} from '../../scripts/visual/protocol.ts';

export interface HarnessInput {
  /** Each component's example module: `{ select: { SelectExample, SelectOpenExample } }`. */
  modules: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Each component's `interactive` slots from its component.json. */
  interactive: Readonly<Record<string, readonly string[]>>;
  /** Trigger slots that open a popup on press. */
  opens: readonly string[];
}

/** Room around a crop for the focus halo (`border-width-focus` + 4 px) and shadows. */
const PAD = 12;
const POPUP = '[data-slot$="-popup"]';
const DISABLED = ':disabled, [data-disabled], [aria-disabled="true"]';
/**
 * Elements that may open a Tooltip on hover and focus. React Aria marks nothing until it opens, so
 * this goes by Nizivo's classes: a Tooltip trigger, and an IconButton (its default tooltip), which
 * keeps its class when it renders another part such as a Menu trigger.
 */
const TOOLTIP_TRIGGER = '.nz-tooltip-trigger, [data-slot="tooltip-trigger"], .nz-icon-button';

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`harness: #${id} is missing from the page`);
  return found;
}

function isComponent(value: unknown): value is ComponentType {
  return typeof value === 'function';
}

function frame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function slugOf(component: string, name: string): string {
  const pascal = component.replace(/(^|-)([a-z0-9])/g, (_m, _d: string, c: string) =>
    c.toUpperCase(),
  );
  const middle = name.slice(pascal.length, -'Example'.length);
  if (middle === '') return 'basic';
  return middle.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function union(boxes: DOMRect[]): Rect {
  const visible = boxes.filter((b) => b.width > 0 || b.height > 0);
  if (visible.length === 0) throw new Error('harness: nothing to crop');
  const left = Math.min(...visible.map((b) => b.left)) - PAD;
  const top = Math.min(...visible.map((b) => b.top)) - PAD;
  const right = Math.max(...visible.map((b) => b.right)) + PAD;
  const bottom = Math.max(...visible.map((b) => b.bottom)) + PAD;
  // the page, not the viewport: a tall example (ImageExample) is shot whole, beyond the fold
  const width = document.documentElement.scrollWidth;
  const height = document.documentElement.scrollHeight;
  const x = Math.max(0, Math.floor(left));
  const y = Math.max(0, Math.floor(top));
  return {
    x,
    y,
    width: Math.min(width, Math.ceil(right)) - x,
    height: Math.min(height, Math.ceil(bottom)) - y,
  };
}

async function settle(): Promise<void> {
  await document.fonts.ready;
  const deadline = performance.now() + 3000;
  for (;;) {
    await frame();
    await frame();
    const busy =
      document.querySelector('[data-entering], [data-exiting]') !== null ||
      [...document.images].some((img) => !img.complete);
    if (!busy) return;
    if (performance.now() > deadline) {
      throw new Error('harness: an overlay transition or an image did not finish within 3 s');
    }
  }
}

export function start(input: HarnessInput): void {
  const stage = element('nz-visual-stage');
  const sentinel = element('nz-visual-start');
  const opens = new Set(input.opens);
  let root: Root | undefined;
  let host: HTMLElement | undefined;
  let marks = 0;

  const examples: ExampleRef[] = Object.entries(input.modules).flatMap(([component, module]) =>
    Object.keys(module)
      .filter((name) => name.endsWith('Example') && isComponent(module[name]))
      .toSorted()
      .map((name) => ({ component, name, slug: slugOf(component, name) })),
  );

  function mark(el: Element): string {
    const existing = el.getAttribute('data-nz-visual');
    if (existing !== null) return existing;
    marks += 1;
    const id = `m${marks}`;
    el.setAttribute('data-nz-visual', id);
    return id;
  }

  function openPopups(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>(POPUP)].filter((el) => {
      if (stage.contains(el)) return false;
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });
  }

  const api: VisualApi = {
    examples: () => examples,

    async fontsReady(): Promise<boolean> {
      await document.fonts.load('16px "Geist"');
      await document.fonts.load('16px "Geist Mono"');
      return document.fonts.check('16px "Geist"') && document.fonts.check('16px "Geist Mono"');
    },

    async mount(component, name): Promise<Mounted> {
      await api.unmount();
      const Example = input.modules[component]?.[name];
      if (!isComponent(Example)) throw new Error(`harness: no example ${component}/${name}`);
      host = document.createElement('div');
      host.className = 'nz-visual-host';
      stage.append(host);
      root = createRoot(host);
      root.render(createElement(Example));
      await settle();
      const controls: Control[] = [];
      for (const slot of input.interactive[component] ?? []) {
        const found = [...stage.querySelectorAll(`[data-slot="${slot}"]`)];
        found.forEach((el, index) => {
          controls.push({
            id: mark(el),
            slot,
            index,
            disabled: el.matches(DISABLED),
            opens: opens.has(slot),
            tooltip: el.matches(TOOLTIP_TRIGGER),
          });
        });
      }
      return { open: openPopups().length > 0, controls };
    },

    async unmount(): Promise<void> {
      root?.unmount();
      root = undefined;
      host?.remove();
      host = undefined;
      // anything an overlay portalled and left behind
      for (const child of Array.from(document.body.children)) {
        if (child !== stage && child !== sentinel && child.tagName !== 'SCRIPT') child.remove();
      }
      await frame();
    },

    settle,

    setTheme(theme: Theme): void {
      document.documentElement.setAttribute('data-nz-theme', theme);
    },

    resetFocus(): void {
      sentinel.focus();
    },

    focused(): Focused {
      const active = document.activeElement;
      if (!active || active === document.body || active === sentinel) {
        return { inside: false, key: '', slot: '', tooltip: false };
      }
      const inside = stage.contains(active) || openPopups().some((p) => p.contains(active));
      const slot = active.closest('[data-slot]')?.getAttribute('data-slot') ?? '';
      return { inside, key: mark(active), slot, tooltip: active.matches(TOOLTIP_TRIGGER) };
    },

    markFocused(): string {
      const active = document.activeElement;
      if (!active || active === document.body) throw new Error('harness: nothing is focused');
      return mark(active);
    },

    popups: (family?: string) =>
      openPopups().filter(
        (el) => family === undefined || el.getAttribute('data-slot') === `${family}-popup`,
      ).length,

    crop(id?: string): Rect {
      const popups = openPopups().map((p) => p.getBoundingClientRect());
      if (id !== undefined) {
        const target = document.querySelector(`[data-nz-visual="${id}"]`);
        if (!target) throw new Error(`harness: no element marked ${id}`);
        return union([target.getBoundingClientRect(), ...popups]);
      }
      // A visually hidden element paints nothing, but its 1 px box sits 1 px outside its parent
      // (base.css: margin -1px), so it would grow the crop (Field's announcer, M29)
      const content = [...stage.querySelectorAll('.nz-visual-host *')]
        .filter((el) => el.closest('.nz-visually-hidden') === null)
        .map((el) => el.getBoundingClientRect());
      return union([...content, ...popups]);
    },

    markPopupItem(): string {
      for (const popup of openPopups()) {
        const item = [...popup.querySelectorAll('[data-slot$="-item"]')].find(
          (el) => !el.matches(DISABLED),
        );
        if (item) return mark(item);
      }
      return '';
    },
  };

  Object.assign(globalThis, { nzVisual: api });
}
