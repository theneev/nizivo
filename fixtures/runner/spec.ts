// The browser checks for one running build: every page in Playwright Chromium, with
// - zero console errors or warnings and zero page errors (React reports hydration failures there),
// - interaction after hydration (pick a Select option, open and close the Dialog, show the Tooltip),
// - the planted-marker grep over every client chunk the page loads (pack.ts plants them),
// - every documented part ([data-slot]) on the page, with each overlay open, carries only vocabulary
//   or functional-allowlist data-* attributes and no engine class (§8.3 rule 3, §9.6 case 3).
/* oxlint-disable no-await-in-loop -- pages and interaction steps run one after another in one browser */
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { REPO_ROOT } from './pack.ts';

type Component = 'select' | 'dialog' | 'tooltip';

interface PageSpec {
  /** Components the page renders; their client leaves must ship, and no other client module may. */
  renders: Component[];
  /** The page imports through the root barrel, where webpack without optimizePackageImports leaks (S2c). */
  barrel?: true;
  dialog?: { trigger: string; close: string; role: 'dialog' | 'alertdialog' };
}

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
        for (const file of closure(packageRoot, `dist/${component}/${component}.client.js`)) {
          const marker = markerOf.get(file);
          if (marker !== undefined) allowed.add(marker);
        }
      }
      return allowed;
    },
  };
}

async function checkSelect(page: Page): Promise<Record<string, string | boolean>> {
  const trigger = page.getByRole('button', { name: /Period/ });
  const before = (await trigger.textContent()) ?? '';
  await trigger.click();
  const listbox = page.getByRole('listbox');
  await listbox.waitFor({ state: 'visible', timeout: TIMEOUT });
  const result: Record<string, string | boolean> = {};
  const clean = await partsClean(page, result);
  await page.getByRole('option', { name: 'Last 7 days' }).click();
  await listbox.waitFor({ state: 'detached', timeout: TIMEOUT });
  const after = (await trigger.textContent()) ?? '';
  const formValue = await page.locator('select[name="period"]').inputValue();
  return {
    before,
    after,
    formValue,
    ...result,
    ok:
      before.includes('Last 30 days') &&
      after.includes('Last 7 days') &&
      formValue === '7d' &&
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
        result['ok'] = await partsClean(page, result);
        return result;
      },
    ]);
  }
  const dialog = spec.dialog;
  if (failures.length === 0 && spec.renders.includes('select')) {
    steps.push(['select', () => checkSelect(page)]);
  }
  if (failures.length === 0 && dialog !== undefined) {
    steps.push(['dialog', () => checkDialog(page, dialog)]);
  }
  if (failures.length === 0 && spec.renders.includes('tooltip')) {
    steps.push(['tooltip', () => checkTooltip(page)]);
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
  const allowed = markers.allowed(spec.renders);
  const expectedLeaves = spec.renders.map((c) => `nzfm[${c}/${c}.client]`);
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
