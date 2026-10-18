// The browser checks for one running build: every page in Playwright Chromium, with
// - zero console errors or warnings and zero page errors (React reports hydration failures there),
// - interaction after hydration (pick a Select option, open and close the Dialog, show the Tooltip,
//   press an Alert's dismiss button, open a Menu, select a tab, follow a TabNav link),
// - overlays open on the server (`defaultOpen`): open after hydration with every IDREF resolved,
// - the planted-marker grep over every client chunk the page loads (pack.ts plants them),
// - every documented part ([data-slot]) on the page, with each overlay open, carries only vocabulary
//   or functional-allowlist data-* attributes and no engine class (§8.3 rule 3, §9.6 case 3),
// - @nizivo/icons: a page ships exactly the icon modules its client code imports (pack.ts plants
//   `nzim[...]` markers), and none from a Server Component,
// - axe-core (WCAG 2.0–2.2 A and AA) on the page as first rendered, in light, again with each
//   interaction-opened popup open and after a server-open overlay closes, then on the first render
//   again in forced colours (Chromium's emulation) and with reduced motion (all blocking), and once
//   in dark (reported, not blocking: exit criterion 4),
// - and once per build, checkThemeFlash: no light frame before the theme applies (theme.ts).
// The same spec runs the Next, Vite and Astro fixtures; SpecOptions says how each one differs.
/* oxlint-disable no-await-in-loop -- pages and interaction steps run one after another in one browser */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, type Browser, type Page } from 'playwright';
import { REPO_ROOT } from './pack.ts';

export type Component =
  | 'select'
  | 'dialog'
  | 'tooltip'
  | 'alert'
  | 'field'
  | 'input'
  | 'textarea'
  | 'checkbox'
  | 'switch'
  | 'radio-group'
  | 'segmented-control'
  | 'icon-button'
  | 'menu'
  | 'tabs';

/** Each rendered component's client leaf, as its dist path without `dist/` and `.js`. */
const LEAF: Record<Component, string> = {
  select: 'select/select.client',
  dialog: 'dialog/dialog.client',
  tooltip: 'tooltip/tooltip.client',
  // Alert is a T0 shell; only its dismiss button is a client leaf (§9.5 split).
  alert: 'alert/alert-dismiss.client',
  // Field is a server shell around FieldScope; the controls are thin client leaves that read it.
  field: 'field/field-scope.client',
  input: 'input/input.client',
  textarea: 'textarea/textarea.client',
  checkbox: 'checkbox/checkbox.client',
  switch: 'switch/switch.client',
  // RadioGroup is a server shell (a Fieldset) around one client part.
  'radio-group': 'radio-group/radio-group.client',
  'segmented-control': 'segmented-control/segmented-control.client',
  // IconButton is a server shell; its default tooltip is a client leaf over Tooltip.
  'icon-button': 'icon-button/icon-button.client',
  menu: 'menu/menu.client',
  tabs: 'tabs/tabs.client',
};

export interface PageSpec {
  /** Components the page renders; their client leaves must ship, and no other client module may. */
  renders: Component[];
  /**
   * Components whose client leaf the page's server graph imports without rendering it (a shell
   * that imports its leaf statically). Their modules may ship but need not: Turbopack and `next dev`
   * ship them, production webpack drops them (week 3, fixtures/next/RESULTS.md).
   */
  imports?: Component[];
  /** The page imports through the root barrel, where webpack without optimizePackageImports leaks (S2c). */
  barrel?: true;
  dialog?: { trigger: string; close: string; role: 'dialog' | 'alertdialog' };
  /** The overlay is open on the server; it is checked after hydration, before any interaction. */
  defaultOpen?: 'dialog' | 'tooltip' | 'menu';
  /** The Select trigger's expected `data-size`, and parts the open popup must show. */
  select?: { size?: string; parts?: string[] };
  /** Documented parts the server-rendered page must contain (the T0 set). */
  slots?: string[];
  /** The week 3 forms page: Field wiring in the server HTML, validation, and a submit with no JS. */
  forms?: true;
  /** An IconButton whose tooltip shows its label (`label`) on focus. */
  iconButtonTooltip?: string;
  /** Tabs: the selected panel in the server HTML, and arrow-key selection after hydration. */
  tabs?: true;
  /** Astro: `client:visible` islands sit below the fold; scroll to them before waiting for hydration. */
  scrollToIslands?: true;
  /** Astro: the page carries two islands; their ids must not collide (per-island useId prefixes). */
  islandIds?: true;
  /** TabNav through next/link: the current link, and client navigation moving it. */
  tabNav?: true;
  /**
   * @nizivo/icons: the icons (Lucide names) the page's client code imports. Exactly these modules
   * and the shared base must ship; [] for icons rendered only by Server Components.
   */
  icons?: string[];
}

/** One documented part of each week 2 T0 component (§21.1 W2 "server-safe components"). */
const T0_SLOTS = [
  'text',
  'heading',
  'stack',
  'inline',
  'grid',
  'grid-item',
  'container',
  'separator',
  'kbd',
  'image',
  'badge',
  'card',
  'delta',
  'progress-bar',
  'progress-ring',
  'meter',
  'skeleton',
  'empty-state',
  'inline-error',
  'alert',
];

export const PAGES: Record<string, PageSpec> = {
  '/button-only': { renders: [], barrel: true },
  '/button-subpath': { renders: [] },
  '/namespace': {
    renders: ['select', 'dialog', 'tooltip'],
    dialog: { trigger: 'Edit product', close: 'Done', role: 'dialog' },
  },
  '/flat': {
    renders: ['select', 'dialog', 'tooltip'],
    dialog: { trigger: 'Edit product', close: 'Done', role: 'dialog' },
  },
  '/render-prop': {
    renders: ['dialog', 'tooltip'],
    dialog: { trigger: 'Delete product', close: 'Cancel', role: 'alertdialog' },
  },
  '/barrel-select': { renders: ['select'], barrel: true },
  '/dialog-default-open': {
    renders: ['dialog'],
    defaultOpen: 'dialog',
    dialog: { trigger: 'Edit product', close: 'Done', role: 'dialog' },
  },
  '/tooltip-default-open': { renders: ['tooltip'], defaultOpen: 'tooltip' },
  '/select-groups': {
    renders: ['select'],
    select: { parts: ['select-group', 'select-group-label', 'select-separator'] },
  },
  '/select-composed': { renders: ['select'], select: { size: 'lg' } },
  // Every T0 component through its subpath, then through the root barrel: no client module at all.
  '/t0': { renders: [], slots: T0_SLOTS },
  '/t0-barrel': { renders: [], barrel: true, slots: T0_SLOTS },
  // A dismissible Alert: its dismiss leaf is the only client module the page may ship.
  '/alert-dismiss': { renders: ['alert'], slots: ['alert', 'alert-dismiss'] },
  // Week 3: a server Field around each client control. FieldScope ships through the controls.
  '/forms': {
    renders: [
      'field',
      'input',
      'textarea',
      'checkbox',
      'switch',
      'radio-group',
      'segmented-control',
    ],
    forms: true,
    slots: [
      'field',
      'field-label',
      'field-description',
      'input',
      'input-control',
      'textarea',
      'native-select',
      'native-select-trigger',
      'segmented-control',
      'segmented-control-item',
      'checkbox',
      'checkbox-input',
      'fieldset',
      'switch',
      'switch-input',
      'switch-thumb',
      'radio-group',
      'radio',
      'radio-input',
    ],
  },
  // NativeSelect is server-safe: alone, it ships no client module.
  '/native-select': { renders: [], slots: ['native-select', 'native-select-trigger'] },
  // A Field function child runs no client code; field.tsx still imports FieldScope.
  '/field-zero-js': {
    renders: [],
    imports: ['field'],
    slots: ['field', 'field-label', 'field-description', 'native-select', 'native-select-trigger'],
  },
  // tooltip={false} runs no client code; icon-button.tsx still imports the tooltip leaf.
  '/icon-button': {
    renders: [],
    imports: ['icon-button'],
    slots: ['icon-button', 'icon-button-icon'],
  },
  // M31: the static twins, through the same subpaths, may ship no @nizivo client module at all.
  '/icon-button-static': { renders: [], slots: ['icon-button', 'icon-button-icon'] },
  '/field-static': {
    renders: [],
    slots: ['field', 'field-label', 'field-description', 'native-select', 'native-select-trigger'],
  },
  '/icon-button-tooltip': {
    renders: ['icon-button'],
    iconButtonTooltip: 'Bold',
    slots: ['icon-button', 'icon-button-icon'],
  },
  // Week 4.
  '/menu': { renders: ['menu'], defaultOpen: 'menu', slots: ['menu-trigger'] },
  '/tabs': {
    renders: ['tabs'],
    tabs: true,
    slots: ['tabs', 'tabs-list', 'tabs-tab', 'tabs-panel', 'tabs-count'],
  },
  // TabNav is server-safe: next/link ships Next's own client code, no @nizivo module.
  '/tab-nav': { renders: [], tabNav: true, slots: ['tab-nav', 'tab-nav-link'] },
  '/icons-server': { renders: [], icons: [] },
  '/icons-client': { renders: [], icons: ['bell', 'calendar', 'search'] },
};

export interface PageResult {
  /** Console errors and warnings plus uncaught page errors, in order. */
  console: string[];
  interactions: Record<string, Record<string, string | boolean>>;
  chunks: number;
  /** Planted markers found in the page's client chunks. */
  markers: string[];
  /** Client leaves of rendered components whose marker is missing (the positive control). */
  missing: string[];
  /** Markers of client modules the page should not ship. */
  unexpected: string[];
  /** @nizivo/icons modules found in the page's client chunks (`icons/calendar`, `_internal/icon`). */
  icons?: string[];
  /** axe-core WCAG 2.2 A/AA violations on the page as first rendered, in light: `rule [impact] (n): target`. */
  axe: string[];
  /** The same run with the OS in dark mode (`data-nz-theme="system"`): reported, never a failure. */
  axeDark: string[];
  /**
   * The same run in forced colours (`forced-colors: active`, Chromium's emulation of a light OS
   * palette): blocking. The colours axe reads are the forced ones, so color-contrast checks what a
   * forced-colours user sees, and every other rule runs on the same DOM (§15.1, exit criterion 14).
   */
  axeForcedColors: string[];
  /**
   * The same run with `prefers-reduced-motion: reduce` (tokens.css swaps the motion tokens, §13.2
   * rule 3): blocking. A reduced-motion path must not leave a part hidden, unlabelled or mid-fade.
   */
  axeReducedMotion: string[];
  /** The page's client JavaScript: every chunk the spec found, raw and gzip -9 bytes. */
  js: { files: number; bytes: number; gzip: number };
  failures: string[];
}

const TIMEOUT = 5000;

/** axe-core's tags for WCAG 2.0–2.2 A and AA (ARCHITECTURE.md §18.1), as in the docs smoke test. */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const AXE_SOURCE = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
);

/** Runs axe-core (the catalog pin, injected as source) on the page; one line per violated rule. */
export async function axe(page: Page): Promise<string[]> {
  const loaded = await page.evaluate(() => typeof Reflect.get(globalThis, 'axe') === 'object');
  if (!loaded) await page.addScriptTag({ content: AXE_SOURCE });
  const lines: unknown = await page.evaluate(async (tags) => {
    const run: unknown = Reflect.get(Reflect.get(globalThis, 'axe') ?? {}, 'run');
    if (typeof run !== 'function') return ['axe-core did not load'];
    const result: unknown = await run(document, { runOnly: { type: 'tag', values: tags } });
    const list: unknown =
      typeof result === 'object' && result !== null ? Reflect.get(result, 'violations') : undefined;
    if (!Array.isArray(list)) return ['axe-core returned no result'];
    return list.map((v: unknown) => {
      if (typeof v !== 'object' || v === null) return 'malformed violation';
      const id: unknown = Reflect.get(v, 'id');
      const impact: unknown = Reflect.get(v, 'impact');
      const nodes: unknown = Reflect.get(v, 'nodes');
      const first: unknown = Array.isArray(nodes) ? nodes[0] : undefined;
      const target: unknown =
        typeof first === 'object' && first !== null ? Reflect.get(first, 'target') : undefined;
      const count = Array.isArray(nodes) ? nodes.length : 0;
      return `${typeof id === 'string' ? id : '?'} [${typeof impact === 'string' ? impact : 'unknown'}] (${count}): ${Array.isArray(target) ? target.join(' ') : ''}`;
    });
  }, AXE_TAGS);
  return Array.isArray(lines) ? lines.map(String) : ['axe-core returned no result'];
}

/**
 * axe in forced colours. Chromium forces `color` to a system colour but reports the author's colour
 * for `-webkit-text-fill-color` (its default, currentcolor, resolves against the colour before
 * forcing), and axe-core reads that property as the text colour. Light text on a dark surface (an
 * inverse Card) then reads as light text on the forced Canvas, 1.07:1: a failure the screen does not
 * show (the text paints in CanvasText; week 6, the t0 pages). So, for the run only, every element
 * gets its computed `color` as an inline fill, which is what it paints: the forced system colour, or
 * its own colour where it opts out (`forced-color-adjust: none`, the generated Highlight fills), so
 * those are still checked as they are. Every element, because the fill is inherited. No Nizivo
 * stylesheet sets `-webkit-text-fill-color`; an inline one is left alone.
 */
async function axeForced(page: Page): Promise<string[]> {
  await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>('body *')) {
      if (element.style.webkitTextFillColor !== '') continue;
      element.style.webkitTextFillColor = getComputedStyle(element).color;
      element.dataset['nzAxeFill'] = '';
    }
  });
  try {
    return await axe(page);
  } finally {
    await page.evaluate(() => {
      for (const element of document.querySelectorAll<HTMLElement>('[data-nz-axe-fill]')) {
        element.style.webkitTextFillColor = '';
        if (element.getAttribute('style') === '') element.removeAttribute('style');
        delete element.dataset['nzAxeFill'];
      }
    });
  }
}

/**
 * Waits for every running CSS transition and animation: a theme switched in place transitions the
 * controls' colours (Button's background, for one), and axe must read the end colours, not a frame
 * in between.
 */
async function transitionsDone(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    // Transitions only: a Skeleton's shimmer or a spinner runs forever and never finishes.
    const transitions = document.getAnimations().filter((a) => a instanceof CSSTransition);
    await Promise.race([
      Promise.all(transitions.map((a) => a.finished.catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  });
}

/**
 * axe in a state an interaction step reached (a popup open, a server-open overlay closed): the lines
 * go into the step's result under `key`, and the step fails when there are any.
 */
async function axeStep(
  page: Page,
  result: Record<string, string | boolean>,
  key: string,
): Promise<boolean> {
  // A popup fades in: axe must read its colours at full opacity, not a frame of the fade.
  await page
    .waitForFunction(
      () => document.querySelector('[data-entering], [data-exiting]') === null,
      undefined,
      { timeout: TIMEOUT },
    )
    .catch(() => undefined);
  await transitionsDone(page);
  const lines = await axe(page);
  result[key] = lines.join(' | ');
  return lines.length === 0;
}

function readRepoJson(file: string): object {
  const json: unknown = JSON.parse(readFileSync(join(REPO_ROOT, file), 'utf8'));
  if (typeof json !== 'object' || json === null) throw new Error(`${file}: not an object`);
  return json;
}

/** Attribute names in a list of strings or of `{ name }` entries; anything else yields none. */
function attributeNames(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry: unknown) =>
    typeof entry === 'string'
      ? [entry]
      : typeof entry === 'object' && entry !== null && 'name' in entry
        ? [String(entry.name)]
        : [],
  );
}

const allowlist = readRepoJson('packages/react/src/_engines/react-aria/dom-allowlist.json');

/** contracts/vocabulary.json (every group) plus the react-aria adapter's functional allowlist. */
const ALLOWED_DATA = new Set([
  ...Object.values(readRepoJson('contracts/vocabulary.json')).flatMap(attributeNames),
  ...('attributes' in allowlist ? attributeNames(allowlist.attributes) : []),
]);

/** Scans every documented part now in the DOM; returns the slots seen and any violation. */
async function scanParts(page: Page): Promise<{ slots: string[]; outside: string[] }> {
  const parts = await page.evaluate(() =>
    [...document.querySelectorAll('[data-slot]')].map((element) => ({
      slot: element.getAttribute('data-slot') ?? '',
      data: element.getAttributeNames().filter((name) => name.startsWith('data-')),
      classes: [...element.classList],
    })),
  );
  return {
    slots: [...new Set(parts.map((part) => part.slot))].toSorted(),
    outside: parts.flatMap(({ slot, data, classes }) =>
      data
        .filter((name) => !ALLOWED_DATA.has(name))
        .map((name) => `${slot} ${name}`)
        .concat(
          classes.filter((name) => /react-aria/i.test(name)).map((name) => `${slot} .${name}`),
        ),
    ),
  };
}

/** Records a scan in `result` and returns whether it was clean. */
async function partsClean(page: Page, result: Record<string, string | boolean>): Promise<boolean> {
  const { slots, outside } = await scanParts(page);
  result['partsScanned'] = slots.join(' ');
  result['partsOutsideVocabulary'] = outside.join(', ');
  return outside.length === 0;
}

const IDREFS = [
  'aria-activedescendant',
  'aria-controls',
  'aria-describedby',
  'aria-details',
  'aria-errormessage',
  'aria-labelledby',
  'aria-owns',
  'for',
];

/**
 * IDREFs that name no element, as `<data-slot or tag> <attribute>=<id>`: in the live page, or in
 * `html` (the server's HTML) when given.
 */
async function danglingIdrefs(page: Page, html?: string): Promise<string[]> {
  return page.evaluate(
    ([source, names]) => {
      const root =
        source === null ? document : new DOMParser().parseFromString(source, 'text/html');
      return names.flatMap((name) =>
        [...root.querySelectorAll(`[${name}]`)].flatMap((element) =>
          (element.getAttribute(name) ?? '')
            .split(/\s+/)
            .filter((id) => id !== '' && root.getElementById(id) === null)
            .map((id) => `${element.getAttribute('data-slot') ?? element.localName} ${name}=${id}`),
        ),
      );
    },
    [html ?? null, IDREFS] as const,
  );
}

const IMPORT = /(?:^|\n)\s*(?:import|export)\b[^;]*?["'](\.{1,2}\/[^"']+)["']/g;

/** Every dist module `start` reaches through relative imports, read from the installed package. */
function closure(packageRoot: string, start: string): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  for (let file = stack.pop(); file !== undefined; file = stack.pop()) {
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(join(packageRoot, file), 'utf8');
    for (const m of source.matchAll(IMPORT)) stack.push(normalize(join(dirname(file), m[1] ?? '')));
  }
  return seen;
}

export interface Markers {
  /** marker → dist path, as written by pack.ts. */
  all: Map<string, string>;
  /** Icon marker → dist path in @nizivo/icons (pack.ts, icon-markers.json). */
  icons: Map<string, string>;
  /** Markers of the client modules that the leaves of the rendered components reach. */
  allowed: (renders: Component[]) => Set<string>;
}

function readMarkers(file: string): Map<string, string> {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null) throw new Error(`${file}: not an object`);
  return new Map(Object.entries(parsed).map(([marker, path]) => [marker, String(path)]));
}

export function loadMarkers(packageRoot: string, markersFile: string): Markers {
  const all = readMarkers(markersFile);
  const icons = readMarkers(join(dirname(markersFile), 'icon-markers.json'));
  const markerOf = new Map([...all].map(([marker, path]) => [path, marker]));
  return {
    all,
    icons,
    allowed: (renders) => {
      const allowed = new Set<string>();
      for (const component of renders) {
        for (const file of closure(packageRoot, `dist/${LEAF[component]}.js`)) {
          const marker = markerOf.get(file);
          if (marker !== undefined) allowed.add(marker);
        }
      }
      return allowed;
    },
  };
}

async function checkSelect(
  page: Page,
  want: PageSpec['select'],
): Promise<Record<string, string | boolean>> {
  // Read through the part first, so a composed trigger that lost its name is still described.
  const part = page.locator('[data-slot="select-trigger"]');
  const before = (await part.textContent()) ?? '';
  // A Button composed through `render` is still the select-trigger part, at the Root's size (D-a).
  const triggerSize = (await part.getAttribute('data-size')) ?? '';
  const triggerClass = (await part.getAttribute('class')) ?? '';
  const trigger = page.getByRole('button', { name: /Period/ });
  const named = await trigger.click({ timeout: TIMEOUT }).then(
    () => true,
    () => false,
  );
  if (!named) {
    return { before, triggerSize, triggerClass, namedPeriodAndClicked: false, ok: false };
  }
  const triggerSlot = (await trigger.getAttribute('data-slot')) ?? '';
  const listbox = page.getByRole('listbox');
  await listbox.waitFor({ state: 'visible', timeout: TIMEOUT });
  const result: Record<string, string | boolean> = {};
  const clean = await partsClean(page, result);
  const accessibleOpen = await axeStep(page, result, 'axeOpen');
  const scanned = String(result['partsScanned']).split(' ');
  const partsShown = (want?.parts ?? []).every((slot) => scanned.includes(slot));
  await page.getByRole('option', { name: 'Last 7 days' }).click();
  await listbox.waitFor({ state: 'detached', timeout: TIMEOUT });
  const after = (await trigger.textContent()) ?? '';
  const formValue = await page.locator('select[name="period"]').inputValue();
  return {
    before,
    after,
    formValue,
    triggerSlot,
    triggerSize,
    triggerClass,
    ...result,
    ok:
      before.includes('Last 30 days') &&
      after.includes('Last 7 days') &&
      formValue === '7d' &&
      triggerSlot === 'select-trigger' &&
      (want?.size === undefined || triggerSize === want.size) &&
      partsShown &&
      accessibleOpen &&
      clean,
  };
}

/**
 * A dialog open on the server: React Aria renders no popup during SSR, so the server HTML carries the
 * expanded trigger alone. After hydration, with no interaction, the dialog is open, named by its
 * title, and every IDREF on the page resolves. Escape then closes it.
 */
async function checkDialogDefaultOpen(
  page: Page,
  spec: NonNullable<PageSpec['dialog']>,
  html: string,
): Promise<Record<string, string | boolean>> {
  const ssrDangling = (await danglingIdrefs(page, html)).join(', ');
  const ssrExpanded = await page.evaluate(
    (source) =>
      new DOMParser()
        .parseFromString(source, 'text/html')
        .querySelector('[data-slot="dialog-trigger"]')
        ?.getAttribute('aria-expanded') ?? '',
    html,
  );
  const dialog = page.getByRole(spec.role);
  await dialog.waitFor({ state: 'visible', timeout: TIMEOUT });
  // The open modal hides the rest of the page from the accessibility tree, trigger included.
  const trigger = page.locator('[data-slot="dialog-trigger"]');
  const expanded = (await trigger.getAttribute('aria-expanded')) ?? '';
  const controls = (await trigger.getAttribute('aria-controls')) ?? '';
  const wiring = await dialog.evaluate((element, id) => {
    const target = id === '' ? null : document.getElementById(id);
    const title = document.getElementById(element.getAttribute('aria-labelledby') ?? '');
    return {
      controlsDialog: target !== null && (target.contains(element) || element.contains(target)),
      title: title?.textContent ?? '',
    };
  }, controls);
  const dangling = (await danglingIdrefs(page)).join(', ');
  const result: Record<string, string | boolean> = {};
  const clean = await partsClean(page, result);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached', timeout: TIMEOUT });
  // The page under the modal, which the load-time axe run could not see.
  const accessibleClosed = await axeStep(page, result, 'axeClosed');
  return {
    ssrExpanded,
    ssrDangling,
    expanded,
    controls,
    controlsDialog: wiring.controlsDialog,
    title: wiring.title,
    dangling,
    closedByEscape: true,
    ...result,
    ok:
      expanded === 'true' &&
      (controls === '' || wiring.controlsDialog) &&
      wiring.title !== '' &&
      dangling === '' &&
      accessibleClosed &&
      clean,
  };
}

/**
 * A tooltip open on the server: open after hydration with no pointer or focus event, the trigger
 * described by it, and every IDREF on the page resolved. Escape then closes it.
 */
async function checkTooltipDefaultOpen(
  page: Page,
  html: string,
): Promise<Record<string, string | boolean>> {
  const ssrDangling = (await danglingIdrefs(page, html)).join(', ');
  const tooltip = page.getByRole('tooltip');
  await tooltip.waitFor({ state: 'visible', timeout: TIMEOUT });
  const trigger = page.locator('[data-slot="tooltip-trigger"]');
  const describedBy = (await trigger.getAttribute('aria-describedby')) ?? '';
  const tooltipId = (await tooltip.getAttribute('id')) ?? '';
  const text = (await tooltip.textContent()) ?? '';
  const dangling = (await danglingIdrefs(page)).join(', ');
  const result: Record<string, string | boolean> = {};
  const clean = await partsClean(page, result);
  await page.keyboard.press('Escape');
  await tooltip.waitFor({ state: 'detached', timeout: TIMEOUT });
  const accessibleClosed = await axeStep(page, result, 'axeClosed');
  const describedByTooltip = tooltipId !== '' && describedBy.split(' ').includes(tooltipId);
  return {
    ssrDangling,
    describedBy,
    describedByTooltip,
    text,
    dangling,
    closedByEscape: true,
    ...result,
    ok:
      describedByTooltip &&
      text === 'Download the report as CSV' &&
      dangling === '' &&
      accessibleClosed &&
      clean,
  };
}

async function checkDialog(
  page: Page,
  spec: NonNullable<PageSpec['dialog']>,
): Promise<Record<string, string | boolean>> {
  const trigger = page.getByRole('button', { name: spec.trigger, exact: true });
  const dialog = page.getByRole(spec.role);
  // A Button composed through `render` is still the dialog-trigger part.
  const triggerSlot = (await trigger.getAttribute('data-slot')) ?? '';
  await trigger.click();
  await dialog.waitFor({ state: 'visible', timeout: TIMEOUT });
  const result: Record<string, string | boolean> = {};
  const clean = await partsClean(page, result);
  const accessibleOpen = await axeStep(page, result, 'axeOpen');
  const title = (await dialog.getByRole('heading').textContent()) ?? '';
  await dialog.getByRole('button', { name: spec.close, exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: TIMEOUT });
  // React Aria restores focus on the frame after the popup unmounts.
  const focusReturned = await page
    .waitForFunction(
      (element) => element === document.activeElement,
      await trigger.elementHandle(),
      { timeout: 2000 },
    )
    .then(
      () => true,
      () => false,
    );
  await trigger.click();
  await dialog.waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached', timeout: TIMEOUT });
  return {
    triggerSlot,
    title,
    closedByClosePart: true,
    focusReturned,
    closedByEscape: true,
    ...result,
    ok:
      triggerSlot === 'dialog-trigger' && title !== '' && focusReturned && accessibleOpen && clean,
  };
}

async function checkTooltip(page: Page): Promise<Record<string, string | boolean>> {
  const trigger = page.getByRole('button', { name: 'Export', exact: true });
  const tooltip = page.getByRole('tooltip');
  // Move the mouse onto the page first, as a user does: React Aria shows a tooltip on hover only when
  // the interaction modality is already "pointer", and Playwright's hover() fires pointerenter on the
  // trigger before any pointermove.
  await page.mouse.move(1, 1);
  await trigger.hover();
  await tooltip.waitFor({ state: 'visible', timeout: TIMEOUT });
  const triggerSlot = (await trigger.getAttribute('data-slot')) ?? '';
  const result: Record<string, string | boolean> = {};
  const clean = await partsClean(page, result);
  const accessibleOpen = await axeStep(page, result, 'axeOpen');
  const text = (await tooltip.textContent()) ?? '';
  const describedBy = (await trigger.getAttribute('aria-describedby')) ?? '';
  const tooltipId = (await tooltip.getAttribute('id')) ?? '';
  await page.mouse.move(1, 1);
  await tooltip.waitFor({ state: 'detached', timeout: TIMEOUT });
  // Keyboard focus: reach the trigger with real Tab presses so focus is visible.
  await trigger.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await tooltip.waitFor({ state: 'visible', timeout: TIMEOUT });
  await page.keyboard.press('Escape');
  await tooltip.waitFor({ state: 'detached', timeout: TIMEOUT });
  const describedByTooltip = tooltipId !== '' && describedBy.split(' ').includes(tooltipId);
  return {
    triggerSlot,
    text,
    describedByTooltip,
    shownOnHover: true,
    shownOnFocus: true,
    ...result,
    ok:
      triggerSlot === 'tooltip-trigger' &&
      text === 'Download the report as CSV' &&
      describedByTooltip &&
      accessibleOpen &&
      clean,
  };
}

/**
 * A dismissible Alert: the server-rendered shell around the client dismiss leaf. After hydration the
 * leaf is a named button that takes a click (the page passes no onDismiss: the caller owns visibility).
 */
async function checkAlertDismiss(page: Page): Promise<Record<string, string | boolean>> {
  const alert = page.getByRole('alert');
  const button = alert.getByRole('button', { name: 'Dismiss', exact: true });
  const slot = (await button.getAttribute('data-slot', { timeout: TIMEOUT })) ?? '';
  const type = (await button.getAttribute('type')) ?? '';
  await button.click({ timeout: TIMEOUT });
  return { slot, type, clicked: true, ok: slot === 'alert-dismiss' && type === 'button' };
}

/** A circle Skeleton in a flex column (a Stack) stays square instead of stretching into a bar. */
async function checkSkeletonCircle(page: Page): Promise<Record<string, string | boolean>> {
  const sizes = await page.$$eval('.nz-stack > .nz-skeleton[data-shape="circle"]', (nodes) =>
    nodes.map((node) => {
      const { width, height } = node.getBoundingClientRect();
      return [width, height];
    }),
  );
  const square = sizes.every(
    ([width = 0, height = 0]) => width > 0 && Math.abs(width - height) < 1,
  );
  return { sizes: JSON.stringify(sizes), ok: sizes.length > 0 && square };
}

/**
 * Field wiring in the server's HTML, before any client code runs: every Field label names an element
 * by `for` (a group Field has none, and its group points back with aria-labelledby), and every
 * description id is in its control's aria-describedby. Then, after hydration, FieldScope's native
 * validation: an empty required Input stops the submit, shows its message inline and takes focus.
 */
async function checkForms(page: Page, html: string): Promise<Record<string, string | boolean>> {
  const wiring = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const problems: string[] = [];
    const fields = [...doc.querySelectorAll('[data-slot="field"]')];
    for (const field of fields) {
      const label = field.querySelector(':scope > [data-slot="field-label"]');
      const description = field.querySelector(':scope > [data-slot="field-description"]');
      const forId = label?.getAttribute('for');
      const group = field.querySelector('[role="radiogroup"]');
      const control = forId === null || forId === undefined ? group : doc.getElementById(forId);
      if (label === null) problems.push('a Field without its label');
      else if (forId === null || forId === undefined) {
        if (group?.getAttribute('aria-labelledby') !== label.id)
          problems.push(`label ${label.id} has no for and names no group`);
      } else if (!(control instanceof HTMLElement) || !control.matches('input, textarea, select'))
        problems.push(`label for=${forId} names no form control`);
      if (description !== null && control !== null) {
        const ids = (control.getAttribute('aria-describedby') ?? '').split(/\s+/);
        if (!ids.includes(description.id))
          problems.push(`${description.id} is not in its control's aria-describedby`);
      }
    }
    const name = doc.getElementById('name');
    if (name?.getAttribute('required') === null) problems.push('#name is not required');
    return { fields: fields.length, problems };
  }, html);
  const dangling = await danglingIdrefs(page, html);
  const platform = (await page.locator('html').getAttribute('data-nz-platform')) ?? '';

  // After hydration: an empty required Input blocks the submit and shows its message inline.
  const before = page.url();
  await page.getByRole('button', { name: 'Save product' }).click({ timeout: TIMEOUT });
  const error = page.locator('[data-slot="field"]:has(#name) [data-slot="field-error"]');
  await error.waitFor({ state: 'visible', timeout: TIMEOUT });
  const message = ((await error.textContent()) ?? '').trim();
  const focused = await page.evaluate(() => document.activeElement?.id ?? '');
  const invalid = (await page.locator('#name').getAttribute('aria-invalid')) ?? '';
  return {
    fields: String(wiring.fields),
    problems: wiring.problems.join('; '),
    danglingServerIdrefs: dangling.join(', '),
    platform,
    inlineMessage: message,
    focused,
    ariaInvalid: invalid,
    stayed: page.url() === before,
    ok:
      wiring.fields >= 5 &&
      wiring.problems.length === 0 &&
      dangling.length === 0 &&
      (platform === 'apple' || platform === 'other') &&
      message !== '' &&
      focused === 'name' &&
      invalid === 'true' &&
      page.url() === before,
  };
}

/**
 * The forms page with JavaScript off: the server HTML alone is a working form. Fill it, submit it,
 * and read what the browser sent from the next URL's query string. A single-page app renders nothing
 * without JavaScript, so there (`javaScriptEnabled`) the hydrated form submits natively instead: no
 * handler intercepts it and the browser sends the same values.
 */
async function checkNativeSubmit(
  browser: Browser,
  url: string,
  javaScriptEnabled: boolean,
): Promise<Record<string, string | boolean>> {
  const context = await browser.newContext({ javaScriptEnabled });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
    await page.fill('#name', 'Linen shirt', { timeout: TIMEOUT });
    await page.selectOption('#unit', 'lb');
    await page.check('#terms');
    // The segment's radio is visually hidden inside its label; check it as a click on the label would.
    await page.check('input[name="range"][value="30d"]', { force: true });
    await page.check('input[name="shipping"][value="express"]');
    await Promise.all([
      page.waitForURL(/\?/, { timeout: TIMEOUT }),
      page.getByRole('button', { name: 'Save product' }).click(),
    ]);
    const query = new URL(page.url()).searchParams;
    const sent = {
      name: query.get('name') ?? '',
      unit: query.get('unit') ?? '',
      terms: query.get('terms') ?? '',
      range: query.get('range') ?? '',
      billing: query.getAll('billing').join(','),
      shipping: query.get('shipping') ?? '',
    };
    return {
      ...sent,
      ok:
        sent.name === 'Linen shirt' &&
        sent.unit === 'lb' &&
        sent.terms === 'on' &&
        sent.range === '30d' &&
        sent.billing === 'invoices' &&
        sent.shipping === 'express',
    };
  } finally {
    await context.close();
  }
}

/**
 * IconButton's default tooltip: named by `aria-label`, its label shown on keyboard focus, and not
 * described by its own tooltip (which only repeats the name). Escape closes it.
 */
async function checkIconButtonTooltip(
  page: Page,
  label: string,
): Promise<Record<string, string | boolean>> {
  const button = page.getByRole('button', { name: label, exact: true });
  const slot = (await button.getAttribute('data-slot', { timeout: TIMEOUT })) ?? '';
  await page.locator('h1').click();
  await page.keyboard.press('Tab');
  const tooltip = page.getByRole('tooltip');
  await tooltip.waitFor({ state: 'visible', timeout: TIMEOUT });
  const text = ((await tooltip.textContent()) ?? '').trim();
  const tooltipId = (await tooltip.getAttribute('id')) ?? '';
  const describedBy = (await button.getAttribute('aria-describedby')) ?? '';
  await page.keyboard.press('Escape');
  await tooltip.waitFor({ state: 'detached', timeout: TIMEOUT });
  const describedByTooltip = tooltipId !== '' && describedBy.split(' ').includes(tooltipId);
  return {
    slot,
    text,
    describedByTooltip,
    ok: slot === 'icon-button' && text.startsWith(label) && !describedByTooltip,
  };
}

/**
 * A Menu open on the server: no popup in the server HTML (React Aria renders none during SSR), then
 * open after hydration with focus inside it and every IDREF resolved. Escape closes it and returns
 * focus to the trigger, though no press opened it (§12.2 Focus return); Enter on the trigger opens it
 * again with focus on the first item; Escape.
 */
async function checkMenuDefaultOpen(
  page: Page,
  html: string,
  serverHtml: boolean,
): Promise<Record<string, string | boolean>> {
  const ssr = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    return {
      expanded:
        doc.querySelector('[data-slot="menu-trigger"]')?.getAttribute('aria-expanded') ?? '',
      popup: doc.querySelector('[data-slot="menu-popup"]') !== null,
    };
  }, html);
  const ssrDangling = (await danglingIdrefs(page, html)).join(', ');
  const menu = page.getByRole('menu');
  await menu.waitFor({ state: 'visible', timeout: TIMEOUT });
  const trigger = page.locator('[data-slot="menu-trigger"]');
  const triggerTag = await trigger.evaluate((element) => element.localName);
  const expanded = (await trigger.getAttribute('aria-expanded')) ?? '';
  // Opened with no key press, React Aria focuses the menu itself (an arrow key then reaches the items).
  const focusInside = await page
    .waitForFunction(
      () => document.querySelector('[data-slot="menu-popup"]')?.contains(document.activeElement),
      undefined,
      { timeout: 2000 },
    )
    .then(
      () => true,
      () => false,
    );
  const items = await page.locator('[role="menuitem"], [role="menuitemcheckbox"]').count();
  const checked =
    (await page.getByRole('menuitemcheckbox').getAttribute('aria-checked')) ?? 'missing';
  const link = await page.getByRole('menuitem', { name: 'Preview on store' }).evaluate((el) => ({
    tag: el.localName,
    href: el.getAttribute('href') ?? '',
  }));
  const dangling = (await danglingIdrefs(page)).join(', ');
  const result: Record<string, string | boolean> = {};
  const clean = await partsClean(page, result);
  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'detached', timeout: TIMEOUT });
  // The page under the menu (its closed trigger included), which the load-time axe run could not see.
  const accessibleClosed = await axeStep(page, result, 'axeClosed');
  const focusReturned = await page
    .waitForFunction(
      () => document.activeElement?.getAttribute('data-slot') === 'menu-trigger',
      undefined,
      { timeout: 2000 },
    )
    .then(
      () => true,
      () => false,
    );
  await page.keyboard.press('Enter');
  await menu.waitFor({ state: 'visible', timeout: TIMEOUT });
  const firstFocused = await page
    .waitForFunction(
      () =>
        document.activeElement?.getAttribute('data-slot') === 'menu-item' &&
        (document.activeElement.textContent ?? '').startsWith('Edit product'),
      undefined,
      {
        timeout: 2000,
      },
    )
    .then(
      () => true,
      () => false,
    );
  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'detached', timeout: TIMEOUT });
  return {
    ssrExpanded: ssr.expanded,
    ssrPopup: ssr.popup,
    ssrDangling,
    triggerTag,
    expanded,
    focusInside,
    firstFocused,
    items: String(items),
    checked,
    linkTag: link.tag,
    linkHref: link.href,
    dangling,
    focusReturned,
    reopenedByEnter: true,
    ...result,
    ok:
      // A client render may mount the popup in its first commit; only server HTML must lack it.
      (!serverHtml || !ssr.popup) &&
      triggerTag === 'button' &&
      expanded === 'true' &&
      focusInside &&
      firstFocused &&
      items === 5 &&
      checked === 'true' &&
      link.tag === 'a' &&
      link.href === '#preview' &&
      dangling === '' &&
      focusReturned &&
      accessibleClosed &&
      clean,
  };
}

/**
 * Tabs in the server HTML: the selected tab and its panel are there and point at each other, and the
 * other panels are not rendered. After hydration ArrowRight selects the next tab and shows its panel.
 */
async function checkTabs(page: Page, html: string): Promise<Record<string, string | boolean>> {
  const ssr = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const tabs = [...doc.querySelectorAll('[role="tab"]')];
    const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
    const panels = [...doc.querySelectorAll('[role="tabpanel"]')];
    const panel = panels[0];
    const tab = selected[0];
    return {
      tabs: tabs.length,
      // The label without the hidden bold sizer copy and the count.
      selected: selected
        .map((t) => t.querySelector('[data-slot="tabs-label"] > :first-child')?.textContent ?? '')
        .join('|'),
      panels: panels.length,
      panelText: panel?.textContent ?? '',
      wired:
        tab !== undefined &&
        panel !== undefined &&
        tab.getAttribute('aria-controls') === panel.id &&
        panel.getAttribute('aria-labelledby') === tab.id,
    };
  }, html);
  const ssrDangling = (await danglingIdrefs(page, html)).join(', ');
  const selectedTab = page.getByRole('tab', { selected: true });
  await selectedTab.focus();
  await page.keyboard.press('ArrowRight');
  // A tab's text holds its label twice (the hidden bold sizer); its accessible name is the label.
  const after = page.getByRole('tab', { name: 'Archived' });
  const moved = await page
    .getByRole('tab', { name: 'Archived', selected: true })
    .waitFor({ timeout: TIMEOUT })
    .then(
      () => true,
      () => false,
    );
  const focusedArchived = await after.evaluate((el) => el === document.activeElement);
  const panelText = (await page.getByRole('tabpanel').textContent()) ?? '';
  const dangling = (await danglingIdrefs(page)).join(', ');
  const result: Record<string, string | boolean> = {};
  const clean = await partsClean(page, result);
  return {
    ssrTabs: String(ssr.tabs),
    ssrSelected: ssr.selected,
    ssrPanels: String(ssr.panels),
    ssrPanelText: ssr.panelText,
    ssrWired: ssr.wired,
    ssrDangling,
    selectedAfterArrowRight: moved,
    focusedArchived,
    panelText,
    dangling,
    ...result,
    ok:
      ssr.tabs === 3 &&
      ssr.selected === 'Unfulfilled' &&
      ssr.panels === 1 &&
      ssr.panelText === 'Paid orders that still need to ship.' &&
      ssr.wired &&
      ssrDangling === '' &&
      moved &&
      focusedArchived &&
      panelText === 'Orders you closed.' &&
      dangling === '' &&
      clean,
  };
}

/**
 * TabNav through next/link: a <nav> of links with the current one aria-current="page"; following a
 * link navigates on the client and the server-rendered current link moves with the URL.
 */
async function checkTabNav(page: Page): Promise<Record<string, string | boolean>> {
  const nav = page.getByRole('navigation', { name: 'Order status' });
  const links = await nav.getByRole('link').count();
  const current = async (): Promise<string> =>
    (await nav.locator('a[aria-current="page"]').textContent({ timeout: TIMEOUT })) ?? '';
  const before = await current();
  await nav.getByRole('link', { name: 'Archived' }).click();
  await page.waitForURL(/status=archived/, { timeout: TIMEOUT });
  const moved = await page
    .waitForFunction(
      () =>
        document.querySelector('nav a[aria-current="page"]')?.textContent?.includes('Archived') ===
        true,
      undefined,
      { timeout: TIMEOUT },
    )
    .then(
      () => true,
      () => false,
    );
  const after = await current();
  const result: Record<string, string | boolean> = {};
  const clean = await partsClean(page, result);
  return {
    links: String(links),
    before,
    after,
    movedWithTheUrl: moved,
    ...result,
    ok:
      links === 3 && before.includes('All orders') && moved && after.includes('Archived') && clean,
  };
}

/** The page's icons render: three SVGs at the Nizivo stroke, the named one with role="img". */
async function checkIcons(page: Page): Promise<Record<string, string | boolean>> {
  const svgs = await page.$$eval('[data-testid="icons"] > svg', (nodes) =>
    nodes.map((node) => ({
      stroke: node.getAttribute('stroke-width') ?? '',
      hidden: node.getAttribute('aria-hidden') ?? '',
      role: node.getAttribute('role') ?? '',
      label: node.getAttribute('aria-label') ?? '',
      size: node.getBoundingClientRect().width,
    })),
  );
  const named = svgs.filter((s) => s.role === 'img' && s.label === 'Search').length;
  const hidden = svgs.filter((s) => s.hidden === 'true').length;
  return {
    svgs: JSON.stringify(svgs),
    ok:
      svgs.length === 3 &&
      svgs.every((s) => s.stroke === '1.92' && s.size === 20) &&
      named === 1 &&
      hidden === 2,
  };
}

/**
 * Astro, two islands on one page: every id in the document is unique, so the islands' `useId`
 * prefixes differ (§11.1: handled by @astrojs/react 7), and every IDREF resolves.
 */
async function checkIslandIds(page: Page): Promise<Record<string, string | boolean>> {
  const { islands, duplicates } = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    return {
      islands: document.querySelectorAll('astro-island').length,
      duplicates: [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))],
    };
  });
  const dangling = await danglingIdrefs(page);
  return {
    islands: String(islands),
    duplicateIds: duplicates.join(', '),
    dangling: dangling.join(', '),
    ok: islands >= 2 && duplicates.length === 0 && dangling.length === 0,
  };
}

/** Next: client JS the page references in its HTML (script tags and the flight payload). */
function nextChunkUrls(html: string, base: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)) {
    if (m[1] !== undefined) urls.add(new URL(m[1], base).href);
  }
  for (const m of html.matchAll(/(?:\/_next\/)?static\/chunks\/[A-Za-z0-9_\-.~/%[\]]+?\.js/g)) {
    const path = m[0].startsWith('/_next/') ? m[0] : `/_next/${m[0]}`;
    urls.add(new URL(path, base).href);
  }
  return [...urls];
}

/**
 * Vite and Astro: the module scripts and module preloads in the HTML and Astro's island component and
 * renderer URLs. Static imports are followed from there (importClosure).
 */
function moduleSeedUrls(html: string, base: string): string[] {
  const urls = new Set<string>();
  const attributes =
    /<script[^>]+src="([^"]+)"|<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"|(?:component|renderer|before-hydration)-url="([^"]+)"/g;
  for (const m of html.matchAll(attributes)) {
    const url = m[1] ?? m[2] ?? m[3];
    if (url !== undefined && url !== '') urls.add(new URL(url.replaceAll('&amp;', '&'), base).href);
  }
  return [...urls];
}

const STATIC_IMPORT = /\b(?:from|import)\s*["']([^"']+\.m?js)["']/g;

/**
 * Every chunk reachable from `seeds` through static imports (`import "./x.js"`, `from "./x.js"`), with
 * its source. Dynamic `import()` is not followed: a lazy chunk counts only once the page loaded it.
 */
async function importClosure(
  seeds: string[],
  base: string,
  follow: boolean,
): Promise<Map<string, string>> {
  const sources = new Map<string, string>();
  const stack = [...seeds];
  for (let url = stack.pop(); url !== undefined; url = stack.pop()) {
    if (sources.has(url) || !url.startsWith(base)) continue;
    const source = await (await fetch(url)).text();
    sources.set(url, source);
    if (!follow) continue;
    for (const m of source.matchAll(STATIC_IMPORT)) {
      if (m[1] !== undefined) stack.push(new URL(m[1], url).href);
    }
  }
  return sources;
}

async function runPage(
  browser: Browser,
  base: string,
  path: string,
  spec: PageSpec,
  markers: Markers,
  options: SpecOptions,
): Promise<PageResult> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  const loaded = new Set<string>();
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push(`${message.type()}: ${message.text().slice(0, 300)}`);
    }
  });
  page.on('pageerror', (error) =>
    consoleMessages.push(`pageerror: ${error.message.slice(0, 300)}`),
  );
  page.on('response', (response) => {
    const url = response.url();
    if (response.request().resourceType() === 'script' || /\.m?js(?:\?|$)/.test(url)) {
      loaded.add(url);
    }
  });

  const failures: string[] = [];
  const interactions: PageResult['interactions'] = {};
  let html = '';
  let serverHtml = '';
  let axeLines: string[] = [];
  let axeDark: string[] = [];
  let axeForcedColors: string[] = [];
  let axeReducedMotion: string[] = [];
  const ready = options.ready ?? hydratedHeading;
  try {
    const response = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60_000 });
    serverHtml = (await response?.text()) ?? '';
    if (options.buildId !== undefined && !serverHtml.includes(options.buildId)) {
      failures.push(`served by another build (no ${options.buildId} in the HTML)`);
    }
    await ready(page, spec);
    // A single-page app's HTML is an empty shell: the checks that read "the HTML before any
    // interaction" read the first client render instead.
    html = options.initialHtml === 'rendered' ? await page.content() : serverHtml;
    // A server-open overlay mounts after hydration: axe checks it open, once it is there.
    const open = spec.defaultOpen === 'dialog' ? (spec.dialog?.role ?? 'dialog') : spec.defaultOpen;
    if (open !== undefined) {
      await page.getByRole(open).waitFor({ state: 'visible', timeout: TIMEOUT });
    }
    axeLines = await axe(page);
    if (axeLines.length > 0) failures.push(`axe: ${axeLines.join(' | ')}`);
    // Dark is reported, not blocking (exit criterion 4). Every fixture's <html> carries
    // data-nz-theme="system", so the OS preference switches the theme in place.
    await page.emulateMedia({ colorScheme: 'dark' });
    await transitionsDone(page);
    axeDark = await axe(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await transitionsDone(page);
    // Forced colours and reduced motion are blocking, each on its own, and back to the defaults
    // before any interaction step runs.
    await page.emulateMedia({ forcedColors: 'active' });
    await transitionsDone(page);
    axeForcedColors = await axeForced(page);
    if (axeForcedColors.length > 0)
      failures.push(`axe in forced colours: ${axeForcedColors.join(' | ')}`);
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
    await transitionsDone(page);
    axeReducedMotion = await axe(page);
    if (axeReducedMotion.length > 0)
      failures.push(`axe with reduced motion: ${axeReducedMotion.join(' | ')}`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await transitionsDone(page);
  } catch (error) {
    failures.push(`load: ${String(error).split('\n')[0] ?? ''}`);
  }
  const fromServer = options.initialHtml !== 'rendered';

  // Interactions run only on a page that loaded from the right build and hydrated.
  const steps: [string, () => Promise<Record<string, string | boolean>>][] = [];
  if (failures.length === 0) {
    steps.push([
      'parts',
      async () => {
        const result: Record<string, string | boolean> = {};
        const clean = await partsClean(page, result);
        // A server-open overlay may still be mounting here; its own step waits for it first.
        const dangling = spec.defaultOpen === undefined ? await danglingIdrefs(page) : [];
        result['danglingIdrefs'] = dangling.join(', ');
        const scanned = String(result['partsScanned']).split(' ');
        const missingSlots = (spec.slots ?? []).filter((slot) => !scanned.includes(slot));
        result['missingSlots'] = missingSlots.join(' ');
        result['ok'] = clean && dangling.length === 0 && missingSlots.length === 0;
        return result;
      },
    ]);
  }
  const dialog = spec.dialog;
  if (failures.length === 0 && spec.defaultOpen === 'dialog' && dialog !== undefined) {
    steps.push(['dialogDefaultOpen', () => checkDialogDefaultOpen(page, dialog, html)]);
  }
  if (failures.length === 0 && spec.defaultOpen === 'tooltip') {
    steps.push(['tooltipDefaultOpen', () => checkTooltipDefaultOpen(page, html)]);
  }
  if (failures.length === 0 && spec.defaultOpen === 'menu') {
    steps.push(['menuDefaultOpen', () => checkMenuDefaultOpen(page, html, fromServer)]);
  }
  if (failures.length === 0 && spec.islandIds === true) {
    steps.push(['islandIds', () => checkIslandIds(page)]);
  }
  if (failures.length === 0 && spec.tabs === true) {
    steps.push(['tabs', () => checkTabs(page, html)]);
  }
  if (failures.length === 0 && spec.icons !== undefined) {
    steps.push(['icons', () => checkIcons(page)]);
  }
  if (failures.length === 0 && spec.renders.includes('select')) {
    steps.push(['select', () => checkSelect(page, spec.select)]);
  }
  if (failures.length === 0 && dialog !== undefined) {
    steps.push(['dialog', () => checkDialog(page, dialog)]);
  }
  if (failures.length === 0 && spec.renders.includes('tooltip')) {
    steps.push(['tooltip', () => checkTooltip(page)]);
  }
  if (failures.length === 0 && spec.renders.includes('alert')) {
    steps.push(['alertDismiss', () => checkAlertDismiss(page)]);
  }
  if (failures.length === 0 && spec.slots?.includes('skeleton') === true) {
    steps.push(['skeletonCircle', () => checkSkeletonCircle(page)]);
  }
  if (failures.length === 0 && spec.forms === true) {
    steps.push(['forms', () => checkForms(page, html)]);
    steps.push(['nativeSubmit', () => checkNativeSubmit(browser, base + path, !fromServer)]);
  }
  const iconButtonLabel = spec.iconButtonTooltip;
  if (failures.length === 0 && iconButtonLabel !== undefined) {
    steps.push(['iconButtonTooltip', () => checkIconButtonTooltip(page, iconButtonLabel)]);
  }
  // Last: it navigates.
  if (failures.length === 0 && spec.tabNav === true) {
    steps.push(['tabNav', () => checkTabNav(page)]);
  }
  for (const [name, step] of steps) {
    try {
      interactions[name] = await step();
      if (interactions[name]?.ok !== true)
        failures.push(`${name}: ${JSON.stringify(interactions[name])}`);
    } catch (error) {
      interactions[name] = { ok: false, error: String(error).split('\n')[0] ?? '' };
      failures.push(`${name}: ${interactions[name]?.error}`);
    }
  }
  if (consoleMessages.length > 0) failures.push(`console: ${consoleMessages.length} message(s)`);

  // Next's chunks are not ES modules: its chunk list and the loaded scripts are the whole set.
  const sources =
    options.chunks === 'imports'
      ? await importClosure([...moduleSeedUrls(serverHtml, base), ...loaded], base, true)
      : await importClosure([...nextChunkUrls(serverHtml, base), ...loaded], base, false);
  const found = new Set<string>();
  const iconsFound = new Set<string>();
  let bytes = 0;
  let gzip = 0;
  for (const source of sources.values()) {
    const buffer = Buffer.from(source);
    bytes += buffer.length;
    gzip += gzipSync(buffer, { level: 9 }).length;
    for (const marker of markers.all.keys()) if (source.includes(marker)) found.add(marker);
    if (source.includes('nzim[')) {
      for (const [marker, distPath] of markers.icons) {
        if (source.includes(marker))
          iconsFound.add(distPath.replace(/^dist\//, '').replace(/\.js$/, ''));
      }
    }
  }
  const serverOnly =
    spec.renders.length === 0 && (spec.icons ?? []).length === 0 && spec.imports === undefined;
  if (options.serverOnlyNoScript === true && serverOnly) {
    // Astro: a page with no island loads no JavaScript at all, not just no @nizivo module.
    if (sources.size > 0) failures.push(`server-only page loads ${sources.size} script(s)`);
  }
  const shippedIcons = [...iconsFound].toSorted();
  const allowed = markers.allowed([...spec.renders, ...(spec.imports ?? [])]);
  const expectedLeaves = spec.renders.map((c) => `nzfm[${LEAF[c]}]`);
  const missing = expectedLeaves.filter((marker) => !found.has(marker));
  const unexpected = [...found].filter((marker) => !allowed.has(marker)).toSorted();
  if (options.markerChecks) {
    if (missing.length > 0) failures.push(`positive control: missing ${missing.join(', ')}`);
    // Check (i) holds everywhere: a server-only page loads no client module, barrel or not.
    const excused = options.leakExpected && spec.barrel === true && spec.renders.length > 0;
    if (unexpected.length > 0 && !excused) {
      failures.push(`unexpected client modules: ${unexpected.join(', ')}`);
    }
    // Icons: exactly the imported ones and the shared base, or none for server-only icons. Every
    // other page ships none.
    const wanted = (spec.icons ?? []).map((name) => `icons/${name}`);
    const expectedIcons = wanted.length === 0 ? [] : ['_internal/icon', ...wanted].toSorted();
    if (shippedIcons.join(' ') !== expectedIcons.join(' ')) {
      const extra = shippedIcons.filter((p) => !expectedIcons.includes(p));
      const absent = expectedIcons.filter((p) => !shippedIcons.includes(p));
      failures.push(
        `icon modules: ${shippedIcons.length} shipped; extra ${extra.length} (${extra.slice(0, 5).join(', ')}), missing ${absent.join(', ') || 'none'}`,
      );
    }
  }
  await context.close();
  return {
    console: consoleMessages,
    interactions,
    chunks: sources.size,
    markers: [...found].toSorted(),
    missing,
    unexpected,
    ...(spec.icons === undefined && shippedIcons.length === 0 ? {} : { icons: shippedIcons }),
    axe: axeLines,
    axeDark,
    axeForcedColors,
    axeReducedMotion,
    js: { files: sources.size, bytes, gzip },
    failures,
  };
}

/** Next and Vite: hydrated (or rendered) once React has attached its fiber to the page's heading. */
async function hydratedHeading(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      Object.keys(document.querySelector('h1') ?? {}).some((key) => key.startsWith('__reactFiber')),
    undefined,
    { timeout: 30_000 },
  );
}

export interface SpecOptions {
  /** A string the served HTML must contain (Next's BUILD_ID, Vite's entry chunk); undefined for dev. */
  buildId: string | undefined;
  leakExpected: boolean;
  markerChecks: boolean;
  /** The fixture's pages; Next's PAGES when left out. */
  pages?: Record<string, PageSpec>;
  /**
   * Where "the HTML before any interaction" comes from: the server's response (Next, Astro), or the
   * first client render (a Vite SPA, whose HTML is an empty shell).
   */
  initialHtml?: 'server' | 'rendered';
  /** Waits until the page is interactive; React's fiber on the <h1> when left out. */
  ready?: (page: Page, spec: PageSpec) => Promise<void>;
  /** How the page's client JS is found: Next's chunk list (default), or module imports (Vite, Astro). */
  chunks?: 'next' | 'imports';
  /** Astro: a page that renders no client component must load no script at all. */
  serverOnlyNoScript?: boolean;
}

export async function runSpec(
  base: string,
  markers: Markers,
  options: SpecOptions,
): Promise<{ browser: string; pages: Record<string, PageResult> }> {
  const browser = await chromium.launch();
  const pages: Record<string, PageResult> = {};
  try {
    for (const [path, spec] of Object.entries(options.pages ?? PAGES)) {
      pages[path] = await runPage(browser, base, path, spec, markers, options);
    }
    return { browser: `Chromium ${browser.version()}`, pages };
  } finally {
    await browser.close();
  }
}
