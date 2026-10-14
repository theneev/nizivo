// The browser checks for one running build: every page in Playwright Chromium, with
// - zero console errors or warnings and zero page errors (React reports hydration failures there),
// - interaction after hydration (pick a Select option, open and close the Dialog, show the Tooltip,
//   press an Alert's dismiss button),
// - overlays open on the server (`defaultOpen`): open after hydration with every IDREF resolved,
// - the planted-marker grep over every client chunk the page loads (pack.ts plants them),
// - every documented part ([data-slot]) on the page, with each overlay open, carries only vocabulary
//   or functional-allowlist data-* attributes and no engine class (§8.3 rule 3, §9.6 case 3).
/* oxlint-disable no-await-in-loop -- pages and interaction steps run one after another in one browser */
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { REPO_ROOT } from './pack.ts';

type Component =
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
  | 'icon-button';

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
};

interface PageSpec {
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
  defaultOpen?: 'dialog' | 'tooltip';
  /** The Select trigger's expected `data-size`, and parts the open popup must show. */
  select?: { size?: string; parts?: string[] };
  /** Documented parts the server-rendered page must contain (the T0 set). */
  slots?: string[];
  /** The week 3 forms page: Field wiring in the server HTML, validation, and a submit with no JS. */
  forms?: true;
  /** An IconButton whose tooltip shows its label (`label`) on focus. */
  iconButtonTooltip?: string;
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
  '/icon-button-tooltip': {
    renders: ['icon-button'],
    iconButtonTooltip: 'Bold',
    slots: ['icon-button', 'icon-button-icon'],
  },
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
  failures: string[];
}

const TIMEOUT = 5000;

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
  /** Markers of the client modules that the leaves of the rendered components reach. */
  allowed: (renders: Component[]) => Set<string>;
}

export function loadMarkers(packageRoot: string, markersFile: string): Markers {
  const parsed: unknown = JSON.parse(readFileSync(markersFile, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null)
    throw new Error(`${markersFile}: not an object`);
  const all = new Map(Object.entries(parsed).map(([marker, path]) => [marker, String(path)]));
  const markerOf = new Map([...all].map(([marker, path]) => [path, marker]));
  return {
    all,
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
  const describedByTooltip = tooltipId !== '' && describedBy.split(' ').includes(tooltipId);
  return {
    ssrDangling,
    describedBy,
    describedByTooltip,
    text,
    dangling,
    closedByEscape: true,
    ...result,
    ok: describedByTooltip && text === 'Download the report as CSV' && dangling === '' && clean,
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
    ok: triggerSlot === 'dialog-trigger' && title !== '' && focusReturned && clean,
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
 * and read what the browser sent from the next URL's query string.
 */
async function checkNativeSubmit(
  browser: Browser,
  url: string,
): Promise<Record<string, string | boolean>> {
  const context = await browser.newContext({ javaScriptEnabled: false });
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

/** Client JS the page references in its HTML (script tags and the flight payload) or loads. */
function chunkUrls(html: string, base: string): string[] {
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
    if (response.request().resourceType() === 'script') loaded.add(response.url());
  });

  const failures: string[] = [];
  const interactions: PageResult['interactions'] = {};
  let html = '';
  try {
    const response = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60_000 });
    html = (await response?.text()) ?? '';
    if (options.buildId !== undefined && !html.includes(options.buildId)) {
      failures.push(`served by another build (no ${options.buildId} in the HTML)`);
    }
    // Hydrated: React has attached its fiber to the page's heading.
    await page.waitForFunction(
      () =>
        Object.keys(document.querySelector('h1') ?? {}).some((key) =>
          key.startsWith('__reactFiber'),
        ),
      undefined,
      { timeout: 30_000 },
    );
  } catch (error) {
    failures.push(`load: ${String(error).split('\n')[0] ?? ''}`);
  }

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
    steps.push(['nativeSubmit', () => checkNativeSubmit(browser, base + path)]);
  }
  const iconButtonLabel = spec.iconButtonTooltip;
  if (failures.length === 0 && iconButtonLabel !== undefined) {
    steps.push(['iconButtonTooltip', () => checkIconButtonTooltip(page, iconButtonLabel)]);
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

  const urls = [...new Set([...chunkUrls(html, base), ...loaded])].filter((url) =>
    url.startsWith(base),
  );
  const found = new Set<string>();
  for (const url of urls) {
    const source = await (await fetch(url)).text();
    for (const marker of markers.all.keys()) if (source.includes(marker)) found.add(marker);
  }
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
  }
  await context.close();
  return {
    console: consoleMessages,
    interactions,
    chunks: urls.length,
    markers: [...found].toSorted(),
    missing,
    unexpected,
    failures,
  };
}

export interface SpecOptions {
  /** The build the server must be serving (its BUILD_ID); undefined for `next dev`. */
  buildId: string | undefined;
  leakExpected: boolean;
  markerChecks: boolean;
}

export async function runSpec(
  base: string,
  markers: Markers,
  options: SpecOptions,
): Promise<{ browser: string; pages: Record<string, PageResult> }> {
  const browser = await chromium.launch();
  const pages: Record<string, PageResult> = {};
  try {
    for (const [path, spec] of Object.entries(PAGES)) {
      pages[path] = await runPage(browser, base, path, spec, markers, options);
    }
    return { browser: `Chromium ${browser.version()}`, pages };
  } finally {
    await browser.close();
  }
}
