// Browser smoke test of the built docs (apps/docs/out) in Playwright Chromium, served by
// scripts/serve.ts like GitHub Pages serves it. Run after `pnpm --filter @nizivo/docs build`:
//
//   node scripts/smoke.ts [--port <n>] [--pages <n>] [--json <file>]
//
// The server takes a free port unless --port names one, so runs can overlap. Pages load --pages at a
// time (default 6), each in its own tab, and their failures are reported in page order.
//
// Every page of the export loads with HTTP 200, zero console errors or warnings and zero page errors
// (React reports hydration failures there), hydrates, and makes no request outside the local server:
// the site works offline. axe-core reports no WCAG 2.2 A/AA violation on it, of any impact, in light;
// dark, and axe's best-practice rules, are reported and do not fail the run while dark is a preview
// (ARCHITECTURE.md §18.1). At 375 px nothing in the page is cut off without a scroller to reach it
// (WCAG 1.4.10), and no raw Markdown (a backtick) shows outside code. The 404
// page answers an unknown path with status 404 and passes the same checks, and the non-HTML routes
// (llms.txt, llms-full.txt, the search index) answer 200 with their media type. Then:
// - JavaScript: the scripts each page's HTML loads (`noModule` polyfills excluded, since modern
//   browsers skip them; prefetches of other routes excluded, since they belong to those routes).
//   A page loads a Nizivo client module only when one of its examples renders it: Select, Tooltip,
//   Dialog and Alert's dismiss leaf, each on its own page and nowhere else;
// - theme: the switch moves both Fumadocs (`dark` class) and Nizivo (`data-nz-theme`), and the page
//   background, a live example and code highlighting follow (code from `data-nz-theme`, not the
//   class); ThemeScript has the stored choice (`nz-theme`) or the server's `system` on <html> before
//   <body> exists, and the first frame with a painted background is already in the right theme (no
//   flash), for the OS preference and for each stored choice;
// - nesting: colour swatches keep their own scheme and an inverse Card flips, so `light-dark()`
//   reached the browser unlowered (the browserslist in package.json);
// - Tailwind: the `nz` utilities of @nizivo/tokens/tailwind.css compile and follow nested scopes;
// - Select, Tooltip and Dialog work after hydration, with the keys their pages document, and a
//   selected Select option keeps a visible system colour in forced-colours mode;
// - the skip link is the first Tab stop and moves focus into the page; the mobile drawer is modal
//   while open (the page behind is inert, Escape closes it, focus returns to its button);
// - search finds a component from the static index, offline, and opens it; Escape returns focus to
//   the button that opened it;
// - the Deviations page lists the overrides, proposals, every builder-chosen value and builder
//   default, and every degradation (D1, D2, …) the plan records.
// Exit code 1 on any failure.
/* oxlint-disable no-await-in-loop -- steps run one after another in a page, pages in a pool */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Server } from 'node:http';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { serve } from './serve.ts';

const OUT = join(import.meta.dirname, '..', 'out');
const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const PORT = Number(arg('--port') ?? '0');
const PAGES_AT_ONCE = Math.max(1, Number(arg('--pages') ?? '6'));
/** Set once the server listens: `http://127.0.0.1:<port>`. */
let ORIGIN = '';

/** Computed colours the checks expect, as Chromium prints them (tokens.css values). */
const RGB = {
  canvasLight: 'rgb(246, 247, 244)', // --nz-p-neutral-50
  canvasDark: 'rgb(16, 19, 17)', // --nz-p-neutral-950
  surfaceLight: 'rgb(255, 255, 255)', // --nz-p-neutral-0
  surfaceDark: 'rgb(24, 27, 25)', // --nz-p-neutral-900
};

/** Client modules of @nizivo/react, recognised by a string only their code contains. */
const NIZIVO_CLIENT_MARKERS = [
  'select-popup',
  'tooltip-popup',
  'dialog-popup',
  'alert-dismiss',
  // FieldScope (Field's client leaf)
  'willValidate',
  'input-prefix',
  'nz-textarea',
  'checkbox-indicator',
  'switch-thumb',
  'radio-input',
  'segmented-control-input',
  'search-field-clear',
  'chip-input',
  'choice-card-input',
  'tabs-tab',
  'menu-popup',
  'popover-popup',
  'drawer-popup',
  // CountUp (@nizivo/react/motion, M41): its digits' slot
  'count-up-value',
  // TableSelection, @nizivo/react/table-selection's one client part (week 18): its class
  'nz-table-selection',
  // Form (@nizivo/react/form's client leaf): its error summary's class
  'nz-form-summary',
  // PasswordInput's client leaf: its toggle's class
  'nz-password-input-toggle',
  // FileUpload (@nizivo/react/file-upload, v0.2): its dropzone's slot
  'file-upload-dropzone',
  // MobileTabBar's two client parts (week 20): More's trigger class, and the bottom-inset island's
  // attribute on <html>
  'nz-mobile-tab-bar-more-trigger',
  'data-nz-bottom-bar',
  // @nizivo/charts' ChartInteraction island (AreaChart's point mode, BarChart's column mode,
  // DonutChart's item mode). The charts parts have their own generated routes
  // (app/docs/(generated)/charts), so it may load on those three pages only; on any other page it
  // means a charts import joined the shared MDX graph.
  'nz-chart-interaction',
];

/**
 * The pages whose examples import a client module, and the only markers they may load. The docs
 * build with Turbopack, which ships a client module the page's server graph imports even when no
 * example renders it, so this is "the client modules the examples import", not "render": FieldScope
 * on the NativeSelect page (its Fields wire it with no client code), and wherever an example imports
 * a control that reads it. A narrower, render-only check waits on client-import-free entries for the
 * zero-JS paths (ARCHITECTURE.md §23.4 D-aa).
 */
const CLIENT_PAGES: Record<string, string[]> = {
  // Select reads its Field through useFieldControl, which lives in FieldScope's module (week 6).
  '/docs/components/select/': ['select-popup', 'willValidate'],
  '/docs/components/tooltip/': ['tooltip-popup'],
  '/docs/components/dialog/': ['dialog-popup'],
  '/docs/components/alert/': ['alert-dismiss'],
  '/docs/components/icon-button/': ['tooltip-popup'],
  '/docs/components/field/': ['input-prefix', 'willValidate'],
  '/docs/components/fieldset/': ['checkbox-indicator', 'willValidate'],
  '/docs/components/input/': ['input-prefix', 'willValidate'],
  '/docs/components/textarea/': ['nz-textarea', 'willValidate'],
  '/docs/components/native-select/': ['willValidate'],
  '/docs/components/checkbox/': ['checkbox-indicator', 'willValidate'],
  '/docs/components/switch/': ['switch-thumb', 'willValidate'],
  '/docs/components/radio-group/': ['radio-input'],
  '/docs/components/segmented-control/': ['segmented-control-input', 'willValidate'],
  '/docs/components/search-field/': ['search-field-clear', 'willValidate'],
  '/docs/components/chip-group/': ['chip-input', 'willValidate'],
  '/docs/components/choice-card/': ['choice-card-input', 'willValidate'],
  // PageHeader is a server part; its Overview example puts a SegmentedControl in the actions (week 16).
  '/docs/components/page-header/': ['segmented-control-input', 'willValidate'],
  // TableSelectionExample wraps its table in TableSelection; its "Archive selected" is a server Button.
  // The Table page loads no client module: selection is its own subpath (D-cf).
  '/docs/components/table-selection/': ['nz-table-selection'],
  // FileUpload reads its Field through useFieldControl, which lives in FieldScope's module.
  '/docs/components/file-upload/': ['file-upload-dropzone', 'willValidate'],
  '/docs/components/tabs/': ['tabs-tab', 'nz-textarea', 'willValidate'],
  // MenuRowActionsExample's trigger is an IconButton, whose default tooltip leaf the page imports.
  '/docs/components/menu/': ['menu-popup', 'tooltip-popup'],
  '/docs/components/popover/': ['popover-popup'],
  '/docs/components/drawer/': ['drawer-popup'],
  // Form and SubmitButton are client leaves (FormMessage is a server part); the examples put Inputs
  // in Fields.
  '/docs/components/form/': ['nz-form-summary', 'input-prefix', 'willValidate'],
  '/docs/components/password-input/': ['nz-password-input-toggle', 'willValidate'],
  // The shell (week 20): TopBar and MobileTopBar are server parts whose examples put a SearchField
  // and IconButtons in their slots; MobileTabBar renders its inset island and More's Drawer sheet,
  // and AppShell's example holds all of them.
  '/docs/components/top-bar/': ['search-field-clear', 'willValidate', 'tooltip-popup'],
  // SidebarItem's rail Tooltip (M52); NavItem's rail example is a Sidebar of SidebarItems
  '/docs/components/sidebar/': ['tooltip-popup'],
  '/docs/components/nav-item/': ['tooltip-popup'],
  '/docs/components/mobile-top-bar/': ['tooltip-popup'],
  '/docs/components/mobile-tab-bar/': [
    'nz-mobile-tab-bar-more-trigger',
    'data-nz-bottom-bar',
    'drawer-popup',
  ],
  '/docs/components/app-shell/': [
    'search-field-clear',
    'willValidate',
    'tooltip-popup',
    'nz-mobile-tab-bar-more-trigger',
    'data-nz-bottom-bar',
    'drawer-popup',
  ],
  // CountUp is the one client part of the dashboard set (M41); its page is titled by its subpath.
  '/docs/components/motion/': ['count-up-value'],
  // AreaChart, BarChart (M40) and DonutChart (M41) render the island by default
  // (interaction="nizivo"); the other charts pages import no client module.
  '/docs/charts/area-chart/': ['nz-chart-interaction'],
  '/docs/charts/bar-chart/': ['nz-chart-interaction'],
  '/docs/charts/donut-chart/': ['nz-chart-interaction'],
};

/** Pages whose JavaScript the run prints. */
const REPORT = [
  '/',
  '/docs/foundations/colour/',
  '/docs/components/badge/',
  '/docs/components/alert/',
  '/docs/components/tooltip/',
  '/docs/components/select/',
  '/docs/components/dialog/',
  '/docs/components/popover/',
  '/docs/components/drawer/',
  '/docs/components/field/',
  '/docs/components/native-select/',
  '/docs/components/input/',
  '/docs/components/radio-group/',
  '/docs/components/segmented-control/',
  '/docs/components/icon-button/',
  '/docs/components/menu/',
  '/docs/components/tabs/',
  '/docs/components/tab-nav/',
  '/docs/icons/',
  '/docs/foundations/javascript/',
  '/docs/charts/area-chart/',
  '/docs/charts/bar-chart/',
  '/docs/charts/donut-chart/',
  '/docs/components/motion/',
  '/docs/components/kpi-tile/',
  '/docs/dashboard/',
];

interface Js {
  scripts: number;
  bytes: number;
  gzip: number;
  nizivoClient: string[];
}

interface PageResult {
  path: string;
  messages: string[];
  external: string[];
  js: Js;
  /** axe violations in light: `rule (n nodes): first target`. */
  axe: string[];
  /** axe best-practice violations in light, reported only. */
  bestPractice: string[];
}

/**
 * Runs axe-core on the loaded page; one line per violated rule, WCAG rules first. With `withBest`,
 * axe's best-practice rules run too, and their lines start with `best-practice: `.
 */
async function axe(page: Page, withBest = false): Promise<string[]> {
  await page.addScriptTag({ content: AXE_SOURCE });
  const tags = withBest ? [...AXE_TAGS, 'best-practice'] : AXE_TAGS;
  const lines: unknown = await page.evaluate(
    async ([wcag, all]) => {
      const run: unknown = Reflect.get(Reflect.get(globalThis, 'axe') ?? {}, 'run');
      if (typeof run !== 'function') return ['axe-core did not load'];
      const result: unknown = await run(document, { runOnly: { type: 'tag', values: all } });
      const list: unknown =
        typeof result === 'object' && result !== null
          ? Reflect.get(result, 'violations')
          : undefined;
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
        const ruleTags: unknown = Reflect.get(v, 'tags');
        const isWcag = Array.isArray(ruleTags) && ruleTags.some((t) => wcag?.includes(String(t)));
        return `${isWcag ? '' : 'best-practice: '}${typeof id === 'string' ? id : '?'} [${typeof impact === 'string' ? impact : 'unknown'}] (${count} nodes): ${Array.isArray(target) ? target.join(' ') : ''}`;
      });
    },
    [AXE_TAGS, tags],
  );
  return Array.isArray(lines) ? lines.map(String) : ['axe-core returned no result'];
}

/** axe-core's tags for WCAG 2.0–2.2 A and AA (ARCHITECTURE.md §18.1). */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const AXE_SOURCE = readFileSync(
  createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  'utf8',
);

const failures: string[] = [];
const notes: string[] = [];

function check(ok: boolean, what: string): void {
  if (ok) notes.push(`ok: ${what}`);
  else failures.push(what);
}

function htmlPages(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === 'index.html') {
        out.push(`/${relative(OUT, dir).split(sep).join('/')}/`.replace('//', '/'));
      }
    }
  };
  walk(OUT);
  return out.filter((p) => !p.startsWith('/_not-found') && !p.startsWith('/404')).toSorted();
}

const sizeCache = new Map<string, { bytes: number; gzip: number; text: string }>();

/** The scripts a page's HTML loads: `<script src>` tags and the chunks its RSC payload names. */
function pageJs(path: string, fail = failures): Js {
  const html = readFileSync(join(OUT, path, 'index.html'), 'utf8');
  const noModule = new Set(
    [
      ...html.matchAll(
        /<script\b[^>]*\bsrc="\/?(_next\/static\/chunks\/[\w.-]+\.js)"[^>]*\bnoModule\b/gi,
      ),
    ].map((m) => m[1] ?? ''),
  );
  const chunks = new Set(
    [...html.matchAll(/\/?(_next\/static\/chunks\/[\w.-]+\.js)/g)]
      .map((m) => m[1] ?? '')
      .filter((c) => !noModule.has(c)),
  );
  let bytes = 0;
  let gzip = 0;
  let text = '';
  for (const c of chunks) {
    const file = join(OUT, c);
    if (!existsSync(file)) {
      fail.push(`${path}: references ${c}, which is not in out/`);
      continue;
    }
    let entry = sizeCache.get(c);
    if (!entry) {
      const body = readFileSync(file);
      entry = { bytes: body.length, gzip: gzipSync(body).length, text: body.toString('utf8') };
      sizeCache.set(c, entry);
    }
    bytes += entry.bytes;
    gzip += entry.gzip;
    text += entry.text;
  }
  return {
    scripts: chunks.size,
    bytes,
    gzip,
    nizivoClient: NIZIVO_CLIENT_MARKERS.filter((m) => text.includes(m)),
  };
}

/**
 * Chromium's hint that a stylesheet Next.js preloaded for a prefetched route was not applied within a
 * few seconds of the load event. It depends only on timing: under cache:audit's parallel tasks the
 * icons page (1,880 icons) loads late and the hint fires for the charts chunk its nav links prefetch
 * (week 20); alone it does not. Only this hint, for the export's own CSS chunks, is ignored.
 */
const PRELOAD_HINT =
  /^The resource http:\/\/127\.0\.0\.1:\d+\/_next\/static\/chunks\/[\w-]+\.css was preloaded using link preload but not used within a few seconds from the window's load event\./;

/** Tracks console output, page errors and requests that leave the local server. */
function instrument(page: Page): { messages: string[]; external: string[] } {
  const messages: string[] = [];
  const external: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning' && PRELOAD_HINT.test(m.text())) return;
    if (m.type() === 'error' || m.type() === 'warning') messages.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => messages.push(`pageerror: ${e.message}`));
  page.on('request', (r) => {
    if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:')) external.push(r.url());
  });
  return { messages, external };
}

async function context(
  browser: Browser,
  colorScheme: 'light' | 'dark',
  width = 1280,
): Promise<BrowserContext> {
  const ctx = await browser.newContext({ colorScheme, viewport: { width, height: 900 } });
  // Offline: anything that is not the local server is refused (and reported by `instrument`).
  await ctx.route('**/*', (route) =>
    route.request().url().startsWith(ORIGIN)
      ? route.continue()
      : route.abort('internetdisconnected'),
  );
  return ctx;
}

async function visit(
  ctx: BrowserContext,
  path: string,
  fail = failures,
): Promise<{ page: Page; messages: string[]; external: string[] }> {
  const page = await ctx.newPage();
  const probe = instrument(page);
  const res = await page.goto(`${ORIGIN}${path}`, { waitUntil: 'networkidle' });
  if (res?.status() !== 200) fail.push(`${path}: HTTP ${res?.status() ?? 'no response'}`);
  // Hydration: React has attached to the page heading.
  await page
    .waitForFunction(
      () => {
        const h = document.querySelector('h1');
        return h !== null && Object.keys(h).some((k) => k.startsWith('__reactFiber'));
      },
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => fail.push(`${path}: did not hydrate`));
  return { page, ...probe };
}

/** Runs `job` on every item, PAGES_AT_ONCE at a time; the results keep the items' order. */
async function pool<T, R>(items: readonly T[], job: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  // one iterator for every worker: each takes the next item when it is free
  const queue = items.entries();
  const worker = async (): Promise<void> => {
    for (const [i, item] of queue) out[i] = await job(item);
  };
  await Promise.all(Array.from({ length: Math.min(PAGES_AT_ONCE, items.length) }, worker));
  return out;
}

/**
 * At the page's current width, what is cut off with no way to reach it: tables, code, previews and
 * images whose right edge passes the viewport and that no scroller (`overflow-x: auto | scroll`)
 * inside the viewport holds. Fumadocs' layout clips overflow, so the page itself never scrolls
 * sideways and `scrollWidth` alone cannot see this.
 */
async function clipped(page: Page): Promise<string[]> {
  const found: unknown = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    // The nearest scroller holds it, provided no clipping box on the way cuts it first.
    const reachable = (el: Element, right: number): boolean => {
      for (let e = el.parentElement; e !== null && e !== document.body; e = e.parentElement) {
        const o = getComputedStyle(e).overflowX;
        const edge = e.getBoundingClientRect().right;
        if (o === 'auto' || o === 'scroll') return edge <= vw + 1;
        if ((o === 'clip' || o === 'hidden') && right > edge + 1) return false;
      }
      return false;
    };
    const out: string[] = [];
    for (const el of document.querySelectorAll(
      'main table, main pre, main code, main img, main .nz-docs-preview > *',
    )) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= vw + 1 || reachable(el, r.right)) continue;
      const label = el.getAttribute('aria-label');
      out.push(
        `${el.tagName.toLowerCase()}${label ? `[${label}]` : ''} to ${Math.round(r.right)}px`,
      );
    }
    return out;
  });
  return Array.isArray(found) ? found.map(String) : [];
}

/** Visible text outside code and pre that still holds Markdown's backticks. */
async function rawMarkdown(page: Page): Promise<string[]> {
  const found: unknown = await page.evaluate(() => {
    const out: string[] = [];
    const root = document.querySelector('main');
    if (!root) return out;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
      const text = n.textContent ?? '';
      if (!text.includes('`') || n.parentElement?.closest('code, pre, script, style')) continue;
      out.push(text.trim().slice(0, 60));
    }
    return out;
  });
  return Array.isArray(found) ? found.map(String) : [];
}

async function bg(page: Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
}

/**
 * Whether focus reaches the element with `data-slot="<slot>"` within 5 s. React Aria restores focus
 * once an overlay has unmounted, a frame after it leaves the DOM, so an immediate read races it.
 */
async function focusLands(page: Page, slot: string): Promise<boolean> {
  return page
    .waitForFunction((s) => document.activeElement?.getAttribute('data-slot') === s, slot, {
      timeout: 5_000,
    })
    .then(
      () => true,
      () => false,
    );
}

async function themeChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page } = await visit(ctx, '/docs/components/select/');
  const html = page.locator('html');
  const trigger = '[data-example="select/SelectExample"] [data-slot="select-trigger"]';
  check(
    (await html.getAttribute('data-nz-theme')) === 'light',
    'theme: OS light gives data-nz-theme="light"',
  );
  check(
    (await bg(page, 'body')) === RGB.canvasLight,
    'theme: light page background is --nz-bg-canvas',
  );
  check(
    (await bg(page, trigger)) === RGB.surfaceLight,
    'theme: light Select trigger is --nz-bg-surface',
  );
  check((await codeColours(page)) === 'light', 'theme: code highlighting is in its light colours');
  await page.locator('[data-theme-toggle] button[aria-label="Dark"]').first().click();
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-nz-theme') === 'dark',
  );
  check(
    ((await html.getAttribute('class')) ?? '').split(' ').includes('dark'),
    'theme: the switch sets the dark class (Fumadocs)',
  );
  check(
    (await html.getAttribute('data-nz-theme')) === 'dark',
    'theme: the switch sets data-nz-theme="dark" (Nizivo)',
  );
  check(
    (await bg(page, 'body')) === RGB.canvasDark,
    'theme: dark page background follows (Fumadocs chrome)',
  );
  check(
    (await bg(page, trigger)) === RGB.surfaceDark,
    'theme: dark Select trigger follows (live example)',
  );
  check(
    (await codeColours(page)) === 'dark',
    'theme: code highlighting follows to its dark colours',
  );
  // ThemeScript sets the theme before next-themes sets the class, so the code colours must not need
  // the class: without it, they stay dark.
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  check(
    (await codeColours(page)) === 'dark',
    'theme: code highlighting follows data-nz-theme, not the dark class',
  );
  await ctx.close();

  // No flash. ThemeScript in <head> puts the stored choice (`nz-theme`) on <html> before <body> is
  // inserted; with nothing stored, or a value it ignores, the server's `system` stays and CSS follows
  // the OS. The site later writes the resolved `light` or `dark`, which paints the same. The first
  // frame that paints a body background (render-blocking CSS loaded) must already be the expected
  // canvas.
  for (const [scheme, stored, attribute, expected] of [
    ['dark', null, 'system', 'dark'],
    ['light', null, 'system', 'light'],
    ['dark', 'light', 'light', 'light'],
    ['light', 'dark', 'dark', 'dark'],
    ['dark', 'system', 'system', 'dark'],
    ['light', 'sepia', 'system', 'light'],
    // next-themes' own body script used to copy an unknown value onto <html> (week 6 review)
    ['dark', 'sepia', 'system', 'dark'],
  ] as const) {
    const c = await context(browser, scheme);
    await c.addInitScript((value) => {
      if (value !== null) localStorage.setItem('nz-theme', value);
      // The init script runs before <html> exists, so watch the document itself.
      new MutationObserver((records, obs) => {
        for (const r of records) {
          for (const n of r.addedNodes) {
            if (n.nodeName !== 'BODY') continue;
            Reflect.set(
              globalThis,
              'nzThemeAtBody',
              document.documentElement.getAttribute('data-nz-theme'),
            );
            obs.disconnect();
          }
        }
      }).observe(document, { childList: true, subtree: true });
      // requestAnimationFrame runs right before a frame paints.
      // oxlint-disable-next-line unicorn/consistent-function-scoping -- serialised into the page
      const frame = (): void => {
        const painted = document.body ? getComputedStyle(document.body).backgroundColor : '';
        if (painted !== '' && painted !== 'rgba(0, 0, 0, 0)') {
          Reflect.set(globalThis, 'nzFirstCanvas', painted);
        } else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }, stored);
    const p = await c.newPage();
    await p.goto(`${ORIGIN}/docs/foundations/colour/`, { waitUntil: 'load' });
    await p
      .waitForFunction(() => Reflect.get(globalThis, 'nzFirstCanvas') !== undefined, undefined, {
        timeout: 5_000,
      })
      .catch(() => undefined);
    const at: unknown = await p.evaluate(() => Reflect.get(globalThis, 'nzThemeAtBody'));
    const canvas: unknown = await p.evaluate(() => Reflect.get(globalThis, 'nzFirstCanvas'));
    const want = expected === 'dark' ? RGB.canvasDark : RGB.canvasLight;
    check(
      at === attribute && canvas === want,
      `no flash: OS ${scheme}, stored ${stored ?? 'none'} → data-nz-theme="${attribute}" before <body> and a ${expected} first canvas (saw ${String(at)}, ${String(canvas)})`,
    );
    await c.close();
  }
}

/**
 * Whether the page's code highlighting shows its `light` or `dark` colours: every highlighted span of
 * the first code block, compared with its own `--shiki-light` and `--shiki-dark` values.
 */
async function codeColours(page: Page): Promise<'light' | 'dark' | 'mixed' | 'none'> {
  const result: unknown = await page.evaluate(() => {
    const spans = [
      ...document.querySelectorAll<HTMLElement>('.shiki code span[style*="--shiki-dark"]'),
    ];
    const probe = document.createElement('i');
    document.body.append(probe);
    const resolve = (value: string): string => {
      probe.style.color = value;
      return getComputedStyle(probe).color;
    };
    // Only spans whose two colours differ tell the themes apart.
    let light = 0;
    let dark = 0;
    let other = 0;
    for (const span of spans) {
      const l = resolve(span.style.getPropertyValue('--shiki-light'));
      const d = resolve(span.style.getPropertyValue('--shiki-dark'));
      if (l === d) continue;
      const shown = getComputedStyle(span).color;
      if (shown === l) light += 1;
      else if (shown === d) dark += 1;
      else other += 1;
    }
    probe.remove();
    if (other > 0) return 'mixed';
    if (light === 0 && dark === 0) return 'none';
    if (light > 0 && dark > 0) return 'mixed';
    return light > 0 ? 'light' : 'dark';
  });
  return result === 'light' || result === 'dark' || result === 'mixed' ? result : 'none';
}

/** The swatch of --nz-bg-canvas in one scheme's column on the Colour page. */
function chip(scheme: string): string {
  return `tr[data-token="--nz-bg-canvas"] [data-nz-theme="${scheme}"] .nz-docs-chip`;
}

async function nestingChecks(browser: Browser): Promise<void> {
  for (const scheme of ['light', 'dark'] as const) {
    const ctx = await context(browser, scheme);
    const { page } = await visit(ctx, '/docs/foundations/colour/');
    check(
      (await bg(page, chip('light'))) === RGB.canvasLight,
      `nesting (${scheme} page): light swatch of --nz-bg-canvas stays light`,
    );
    check(
      (await bg(page, chip('dark'))) === RGB.canvasDark,
      `nesting (${scheme} page): dark swatch of --nz-bg-canvas stays dark`,
    );
    await page.close();
    const home = await visit(ctx, '/');
    const inverse = '[data-slot="card"][data-tone="inverse"]';
    const want = scheme === 'light' ? RGB.surfaceDark : RGB.surfaceLight;
    check(
      (await bg(home.page, inverse)) === want,
      `inverse (${scheme} page): a tone="inverse" Card takes the other scheme`,
    );
    await ctx.close();
  }
}

async function tailwindChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page } = await visit(ctx, '/docs/getting-started/tailwind/');
  check(
    (await bg(page, '[data-tailwind-sample="light"]')) === RGB.surfaceLight,
    'tailwind: bg-nz-bg-surface is --nz-bg-surface in a light scope',
  );
  check(
    (await bg(page, '[data-tailwind-sample="dark"]')) === RGB.surfaceDark,
    'tailwind: the same class follows a nested dark scope',
  );
  const columns = async (): Promise<number> =>
    page
      .locator('[data-tailwind-grid]')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  check((await columns()) === 2, 'tailwind: nz-sm:grid-cols-2 applies at 1280px');
  await page.setViewportSize({ width: 375, height: 800 });
  check((await columns()) === 1, 'tailwind: and not at 375px');
  await ctx.close();
}

async function selectChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page } = await visit(ctx, '/docs/components/select/');
  const trigger = page.locator(
    '[data-example="select/SelectExample"] [data-slot="select-trigger"]',
  );
  // Settled, as a reader would wait: open means an option has focus; closed means the list has
  // finished its exit animation and left the DOM (until then it keeps focus and takes the keys).
  const expanded = async (value: 'true' | 'false'): Promise<void> => {
    await page.waitForFunction(
      ([sel, v]) => {
        const open = document.querySelector(sel ?? '')?.getAttribute('aria-expanded') === v;
        if (v === 'true') return open && document.activeElement?.getAttribute('role') === 'option';
        return open && document.querySelector('[role="listbox"]') === null;
      },
      ['[data-example="select/SelectExample"] [data-slot="select-trigger"]', value],
      { timeout: 10_000 },
    );
  };
  const value = async (): Promise<string> => (await trigger.textContent()) ?? '';

  await trigger.click();
  await page.getByRole('option', { name: 'Last 7 days' }).click();
  await expanded('false');
  check((await value()).includes('Last 7 days'), 'Select: a click picks "Last 7 days"');

  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expanded('true');
  const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
  check(focused.includes('Last 7 days'), 'Select keyboard: ArrowDown opens on the selected option');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expanded('false');
  check(
    (await value()).includes('Last 30 days'),
    'Select keyboard: ArrowDown, Enter picks the next option',
  );
  // React Aria puts focus back on the trigger a frame after the list leaves; keys sent before
  // that go nowhere.
  await focusLands(page, 'select-trigger');
  await page.keyboard.press('ArrowDown');
  await expanded('true');
  await page.keyboard.press('Escape');
  await expanded('false');
  check(
    await focusLands(page, 'select-trigger'),
    'Select keyboard: Escape closes and focus returns to the trigger',
  );
  check((await value()).includes('Last 30 days'), 'Select keyboard: Escape keeps the value');

  // On the closed trigger: arrows step through the options, typing jumps to a match.
  await page.keyboard.press('ArrowLeft');
  check(
    (await value()).includes('Last 7 days') &&
      (await trigger.getAttribute('aria-expanded')) === 'false',
    'Select keyboard: ArrowLeft on the closed trigger selects the previous option',
  );
  await page.keyboard.press('ArrowRight');
  check(
    (await value()).includes('Last 30 days'),
    'Select keyboard: ArrowRight on the closed trigger selects the next option',
  );
  await page.keyboard.press('ArrowRight');
  check(
    (await value()).includes('Last 30 days'),
    'Select keyboard: ArrowRight skips the disabled "All time"',
  );
  await page.waitForTimeout(1100); // let the type-ahead buffer clear
  await page.keyboard.type('Last 7');
  check(
    (await value()).includes('Last 7 days') &&
      (await trigger.getAttribute('aria-expanded')) === 'false',
    'Select keyboard: typing on the closed trigger selects the matching option',
  );
  await ctx.close();
}

async function tooltipChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page } = await visit(ctx, '/docs/components/tooltip/');
  const trigger = page.locator(
    '[data-example="tooltip/TooltipExample"] [data-slot="tooltip-trigger"]',
  );
  // React Aria opens on hover only once the pointer modality is set (fixtures/next/RESULTS.md, Notes).
  await page.mouse.move(5, 5);
  await trigger.hover();
  const tip = page.getByRole('tooltip');
  await tip.waitFor({ timeout: 5_000 }).catch(() => undefined);
  check(
    (await tip.textContent().catch(() => null)) === 'Download the report as CSV',
    'Tooltip: hover shows it',
  );
  await page.mouse.move(5, 5);
  await tip.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  check(!(await tip.isVisible().catch(() => false)), 'Tooltip: moving away hides it');
  await trigger.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await tip.waitFor({ timeout: 5_000 }).catch(() => undefined);
  check(await tip.isVisible().catch(() => false), 'Tooltip: keyboard focus shows it');
  const described = await trigger.getAttribute('aria-describedby');
  const tipId = await tip.getAttribute('id').catch(() => null);
  check(
    described !== null && tipId !== null && described.split(' ').includes(tipId),
    'Tooltip: the trigger is described by it',
  );
  await page.keyboard.press('Escape');
  await tip.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  check(!(await tip.isVisible().catch(() => false)), 'Tooltip: Escape hides it');
  await ctx.close();
}

async function dialogChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page } = await visit(ctx, '/docs/components/dialog/');
  const trigger = page.locator(
    '[data-example="dialog/DialogExample"] [data-slot="dialog-trigger"]',
  );
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog');
  const opened = await dialog.waitFor({ timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  check(opened, 'Dialog keyboard: Enter on the trigger opens it');
  const inside = async (): Promise<boolean> =>
    page.evaluate(() => document.activeElement?.closest('[role="alertdialog"]') !== null);
  check(await inside(), 'Dialog: focus moves into it on open');
  let contained = true;
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    contained &&= await inside();
  }
  await page.keyboard.press('Shift+Tab');
  contained &&= await inside();
  check(contained, 'Dialog keyboard: Tab and Shift+Tab stay inside');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  check(!(await dialog.isVisible().catch(() => false)), 'Dialog keyboard: Escape closes it');
  check(await focusLands(page, 'dialog-trigger'), 'Dialog: focus returns to the trigger');
  await ctx.close();
}

async function popoverChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page } = await visit(ctx, '/docs/components/popover/');
  const trigger = page.locator(
    '[data-example="popover/PopoverExample"] [data-slot="popover-trigger"]',
  );
  await trigger.focus();
  await page.keyboard.press('Enter');
  const popover = page.locator('[data-slot="popover-popup"]');
  const opened = await popover.waitFor({ timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  check(opened, 'Popover keyboard: Enter on the trigger opens it');
  check(
    await page.evaluate(
      () => document.activeElement?.closest('[data-slot="popover-popup"]') !== null,
    ),
    'Popover: focus moves into it on open',
  );
  await page.keyboard.press('Escape');
  await popover.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  check(!(await popover.isVisible().catch(() => false)), 'Popover keyboard: Escape closes it');
  check(await focusLands(page, 'popover-trigger'), 'Popover: focus returns to the trigger');
  await ctx.close();
}

/** The Nizivo Drawer on its own page (drawerChecks is the docs site's navigation drawer). */
async function nizivoDrawerChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page } = await visit(ctx, '/docs/components/drawer/');
  const trigger = page.locator(
    '[data-example="drawer/DrawerExample"] [data-slot="drawer-trigger"]',
  );
  await trigger.focus();
  await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Order #1042' });
  const opened = await drawer.waitFor({ timeout: 5_000 }).then(
    () => true,
    () => false,
  );
  check(opened, 'Drawer keyboard: Enter on the trigger opens it');
  const inside = async (): Promise<boolean> =>
    page.evaluate(() => document.activeElement?.closest('[data-slot="drawer-popup"]') !== null);
  check(await inside(), 'Drawer: focus moves into it on open');
  let contained = true;
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    contained &&= await inside();
  }
  check(contained, 'Drawer keyboard: Tab stays inside');
  await page.keyboard.press('Escape');
  await drawer.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  check(!(await drawer.isVisible().catch(() => false)), 'Drawer keyboard: Escape closes it');
  check(await focusLands(page, 'drawer-trigger'), 'Drawer: focus returns to the trigger');
  await ctx.close();
}

async function searchChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page, external } = await visit(ctx, '/docs/');
  const dialog = page.getByRole('dialog');
  // Opened from the keyboard and closed with Escape, focus goes back to the search button.
  await page.locator('[data-search-full]').first().focus();
  await page.keyboard.press('Enter');
  await dialog.waitFor({ timeout: 10_000 }).catch(() => undefined);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  const back = await page
    .waitForFunction(
      () => document.activeElement?.hasAttribute('data-search-full') === true,
      undefined,
      {
        timeout: 5_000,
      },
    )
    .then(
      () => true,
      () => false,
    );
  check(back, 'search: Escape returns focus to the search button');
  await page.locator('[data-search-full]').first().click();
  await dialog.locator('input').first().fill('Select');
  const first = dialog.getByRole('option').first();
  const found = await first.waitFor({ timeout: 10_000 }).then(
    () => true,
    () => false,
  );
  const id = found ? await first.getAttribute('id') : null;
  check(
    id === 'fd-search-option-/docs/components/select',
    `search: "Select" ranks the Select page first, from the static index (got ${id ?? 'nothing'})`,
  );
  await page.keyboard.press('Enter');
  const went = await page.waitForURL(`${ORIGIN}/docs/components/select/`, { timeout: 10_000 }).then(
    () => true,
    () => false,
  );
  check(went, 'search: Enter opens /docs/components/select/');
  check(external.length === 0, 'search: no request left the local server');
  await ctx.close();
}

/** Relative luminance of an `rgb(…)` colour as Chromium prints it. */
function luminance(colour: string): number {
  const [r = 0, g = 0, b = 0] = (colour.match(/[\d.]+/g) ?? []).map(Number).map((v) => {
    const x = v / 255;
    return x <= 0.039_28 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast of two `rgb(…)` colours. */
function contrast(a: string, b: string): number {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function forcedColoursChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page } = await visit(ctx, '/docs/components/select/');
  await page.emulateMedia({ forcedColors: 'active' });
  // Keyboard focus opens on the selected option, which is then selected and highlighted at once.
  await page.locator('[data-example="select/SelectExample"] [data-slot="select-trigger"]').focus();
  await page.keyboard.press('ArrowDown');
  await page
    .waitForFunction(() => document.activeElement?.getAttribute('role') === 'option', undefined, {
      timeout: 10_000,
    })
    .catch(() => undefined);
  const seen: unknown = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el?.hasAttribute('data-selected')) return null;
    const cs = getComputedStyle(el);
    return [cs.color, cs.backgroundColor];
  });
  const [fg = '', bgc = ''] = Array.isArray(seen) ? seen.map(String) : [];
  const ratio = fg && bgc ? contrast(fg, bgc) : 0;
  check(
    ratio >= 4.5,
    `forced colours: the focused, selected Select option is readable (${fg || '?'} on ${bgc || '?'}, ${ratio.toFixed(2)}:1)`,
  );
  await ctx.close();
}

async function skipLinkChecks(browser: Browser): Promise<void> {
  for (const [path, target] of [
    ['/docs/components/badge/', 'nd-page'],
    ['/', 'content'],
  ] as const) {
    const ctx = await context(browser, 'light');
    const { page } = await visit(ctx, path);
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.textContent ?? '');
    check(
      first === 'Skip to content',
      `skip link (${path}): the first Tab focuses it (got "${first}")`,
    );
    await page.keyboard.press('Enter');
    const moved = await page
      .waitForFunction((id) => document.activeElement?.id === id, target, { timeout: 5_000 })
      .then(
        () => true,
        () => false,
      );
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(
      (id) => document.activeElement?.closest(`#${id}`) !== null,
      target,
    );
    check(
      moved && inside,
      `skip link (${path}): Enter moves focus to #${target}, and Tab stays in it`,
    );
    await ctx.close();
  }
}

async function drawerChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light', 375);
  const { page } = await visit(ctx, '/docs/components/badge/');
  const opener = page.locator('#nd-subnav button[aria-controls="nd-sidebar-mobile"]').first();
  await opener.focus();
  await page.keyboard.press('Enter');
  const drawer = page.locator('#nd-sidebar-mobile[data-state="open"]');
  await drawer.waitFor({ timeout: 5_000 }).catch(() => undefined);
  // The drawer mounts hidden and shows a frame later; focus moves in then.
  const modal = await page
    .waitForFunction(
      () =>
        document.activeElement?.closest('#nd-sidebar-mobile') !== null &&
        document.getElementById('nd-page')?.closest('[inert]') !== null,
      undefined,
      { timeout: 5_000 },
    )
    .then(
      () => true,
      () => false,
    );
  check(modal, 'mobile drawer: focus moves in and the page behind is inert');
  await page.keyboard.press('Escape');
  const back = await page
    .waitForFunction(
      () =>
        document.activeElement?.getAttribute('aria-controls') === 'nd-sidebar-mobile' &&
        document.activeElement.closest('#nd-sidebar-mobile') === null &&
        document.getElementById('nd-page')?.closest('[inert]') === null,
      undefined,
      { timeout: 5_000 },
    )
    .then(
      () => true,
      () => false,
    );
  check(back, 'mobile drawer: Escape closes it and focus returns to its button');
  await ctx.close();
}

async function deviationsChecks(browser: Browser): Promise<void> {
  const ctx = await context(browser, 'light');
  const { page } = await visit(ctx, '/docs/deviations/');
  const rows = async (label: string): Promise<number> =>
    page.locator(`table[aria-label="${label}"] tbody tr`).count();
  const overrides = await rows('Overrides');
  const proposals = await rows('Proposals');
  // The overrides table lists every entry of the a11y override files; with none left (Figma adopted
  // all 14 on 2026-10-18) the page says so instead of drawing an empty table.
  const overrideDir = join(import.meta.dirname, '../../../packages/tokens/src/code-owned/a11y');
  const expectedOverrides = readdirSync(overrideDir)
    .filter((file) => file.endsWith('.overrides.tokens.json'))
    .reduce(
      (sum, file) =>
        sum +
        (readFileSync(join(overrideDir, file), 'utf8').match(/"app\.nizivo\.override"/g) ?? [])
          .length,
      0,
    );
  check(
    overrides === expectedOverrides &&
      (expectedOverrides > 0 ||
        (await page.getByText('None. Every Figma variable is used as Figma defines it').count()) ===
          1),
    `deviations: ${overrides} override rows (${expectedOverrides} in the override files)`,
  );
  // The same for the proposals: none is left since text/accent was removed before 0.2.0 (M42).
  const proposalDir = join(import.meta.dirname, '../../../packages/tokens/src/code-owned');
  const proposalFiles = [
    join(proposalDir, 'proposals.tokens.json'),
    ...readdirSync(join(proposalDir, 'proposals'), { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.tokens.json'))
      .map((file) => join(proposalDir, 'proposals', file)),
  ];
  const proposalTokens = new Set(
    proposalFiles.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/"figma(?:Variable|Style)": "([^"]+)"/g)].map(
        (m) => m[1],
      ),
    ),
  );
  check(
    proposals === proposalTokens.size &&
      (proposalTokens.size > 0 ||
        (await page.getByText('None. Every token is a Figma variable or code-owned').count()) ===
          1),
    `deviations: ${proposals} proposal rows (${proposalTokens.size} in the proposal files)`,
  );
  const text = (await page.locator('article').textContent()) ?? '';
  // Every degradation (§18.2) and every builder default (§23.4) the plan holds is on the page.
  const plan = readFileSync(join(import.meta.dirname, '../../../docs/ARCHITECTURE.md'), 'utf8');
  const planDs = [...plan.matchAll(/^\s*- \*\*(D\d+)\.\*\* "/gm)].map((m) => m[1] ?? '');
  const planDefaults = [...plan.matchAll(/^\| (D-[a-z]+) \|/gm)].map((m) => m[1] ?? '');
  const missingDs = planDs.filter((d) => !text.includes(d));
  check(
    planDs.length >= 4 &&
      missingDs.length === 0 &&
      ['Firefox', 'Mobile Safari 17.5'].every((t) => text.includes(t)),
    `deviations: degradations ${planDs.join(', ')} and the Safari 17.5 status are listed${missingDs.length > 0 ? ` (missing ${missingDs.join(', ')})` : ''}`,
  );
  const defaults = await page
    .locator('table[aria-label="Builder defaults"] tbody th')
    .allTextContents();
  const missingDefaults = planDefaults.filter((id) => !defaults.some((t) => t.startsWith(id)));
  check(
    planDefaults.length > 0 &&
      missingDefaults.length === 0 &&
      defaults.length === planDefaults.length,
    `deviations: ${defaults.length} of the plan's ${planDefaults.length} builder defaults (§23.4) are listed${missingDefaults.length > 0 ? ` (missing ${missingDefaults.join(', ')})` : ''}`,
  );
  check(text.includes('D-i'), 'deviations: builder decision D-i is listed');
  const chosen = await rows('Builder-chosen values');
  const header = await page
    .locator('table[aria-label="Builder-chosen values"] thead')
    .textContent()
    .catch(() => '');
  check(
    chosen > 0 && (header ?? '').includes('Chosen'),
    `deviations: ${chosen} builder-chosen values, each with the value that ships`,
  );
  // Week 3: one row per item of docs/figma/12-w3-forms.md §5 (the build fails on a missing answer).
  const w3 = await rows('Week 3 builder-chosen values');
  check(w3 >= 29, `deviations: ${w3} week 3 builder-chosen values`);
  // Week 4: one row per item of docs/figma/13-w4-menu-tabs.md §5.
  const w4 = await rows('Week 4 builder-chosen values');
  check(w4 >= 22, `deviations: ${w4} week 4 builder-chosen values`);
  await ctx.close();
}

/** The routes that are not HTML pages: each answers 200 with its media type and a body. */
const FILE_ROUTES: [path: string, type: string][] = [
  ['/llms.txt', 'text/plain'],
  ['/llms-full.txt', 'text/plain'],
  ['/api/search.json', 'application/json'],
];

async function routeChecks(browser: Browser): Promise<void> {
  for (const [path, type] of FILE_ROUTES) {
    const res = await fetch(`${ORIGIN}${path}`);
    const body = await res.text();
    check(
      res.status === 200 &&
        (res.headers.get('content-type') ?? '').startsWith(type) &&
        body.length > 0,
      `${path}: HTTP ${res.status}, ${res.headers.get('content-type') ?? 'no type'}, ${body.length} bytes`,
    );
  }
  // The 404 page: an unknown path gets it with status 404, and it passes the page checks.
  const ctx = await context(browser, 'light');
  const page = await ctx.newPage();
  const probe = instrument(page);
  const missing = '/docs/no-such-page/';
  const res = await page.goto(`${ORIGIN}${missing}`, { waitUntil: 'networkidle' });
  check(res?.status() === 404, `404: ${missing} answers HTTP ${res?.status() ?? 'nothing'}`);
  const hydrated = await page
    .waitForFunction(
      () => {
        const h = document.querySelector('h1, h2');
        return h !== null && Object.keys(h).some((k) => k.startsWith('__reactFiber'));
      },
      undefined,
      { timeout: 10_000 },
    )
    .then(
      () => true,
      () => false,
    );
  check(hydrated, '404: the not-found page hydrates');
  // Chromium logs the document's own 404 status as a console error; that one is the point.
  const messages = probe.messages.filter(
    (m) => !m.includes('the server responded with a status of 404'),
  );
  check(
    messages.length === 0 && probe.external.length === 0,
    `404: no console message, page error or external request${messages.length > 0 ? ` (${messages.join(' | ')})` : ''}`,
  );
  const violations = await axe(page);
  check(
    violations.length === 0,
    `404: no axe WCAG 2.2 A/AA violation in light${violations.length > 0 ? ` (${violations.join(' | ')})` : ''}`,
  );
  await ctx.close();
}

function jsChecks(results: PageResult[]): void {
  for (const r of results) {
    const allowed = CLIENT_PAGES[r.path] ?? [];
    const extra = r.js.nizivoClient.filter((m) => !allowed.includes(m));
    const missing = allowed.filter((m) => !r.js.nizivoClient.includes(m));
    if (extra.length > 0)
      failures.push(
        `${r.path}: loads Nizivo client modules it does not render: ${extra.join(', ')}`,
      );
    if (missing.length > 0)
      failures.push(`${r.path}: does not load ${missing.join(', ')}, which its examples render`);
  }
  notes.push(
    `ok: Nizivo client modules load only on ${Object.keys(CLIENT_PAGES).join(', ')}, each only its own`,
  );
}

function kb(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}

async function main(): Promise<void> {
  let server: Server;
  try {
    server = await serve(OUT, PORT);
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('no TCP address');
    ORIGIN = `http://127.0.0.1:${address.port}`;
  } catch (error) {
    console.error(`smoke: cannot serve ${OUT} on port ${PORT}: ${String(error)}`);
    process.exit(1);
  }
  const browser = await chromium.launch();
  const results: PageResult[] = [];
  try {
    const paths = htmlPages();
    if (paths.length === 0) throw new Error('no pages in out/; run the docs build first');
    const ctx = await context(browser, 'light');
    const light = await pool(paths, async (path) => {
      const fail: string[] = [];
      const { page, messages, external } = await visit(ctx, path, fail);
      const found = await axe(page, true);
      const r: PageResult = {
        path,
        messages,
        external,
        js: pageJs(path, fail),
        axe: found.filter((v) => !v.startsWith('best-practice: ')),
        bestPractice: found.filter((v) => v.startsWith('best-practice: ')),
      };
      for (const t of await rawMarkdown(page)) fail.push(`${path}: raw Markdown in "${t}"`);
      await page.close();
      if (messages.length > 0) fail.push(`${path}: ${messages.join(' | ')}`);
      if (external.length > 0) fail.push(`${path}: external requests ${external.join(', ')}`);
      for (const v of r.axe) fail.push(`${path}: axe (light) ${v}`);
      return { r, fail };
    });
    for (const { r, fail } of light) {
      results.push(r);
      failures.push(...fail);
    }
    await ctx.close();
    check(
      results.every((r) => r.messages.length === 0 && r.external.length === 0),
      `${paths.length} pages load with no console message, page error or external request`,
    );
    check(
      results.every((r) => r.axe.length === 0),
      `${paths.length} pages have no axe WCAG 2.2 A/AA violation in light`,
    );
    check(
      !failures.some((f) => f.includes('raw Markdown')),
      `${paths.length} pages show no raw Markdown outside code`,
    );
    const best = results.flatMap((r) => r.bestPractice.map((v) => `${r.path}: ${v}`));
    // Reported, not failed: best-practice rules are advice, not WCAG conformance.
    notes.push(
      best.length === 0
        ? `ok: ${paths.length} pages have no axe best-practice violation in light`
        : `best-practice (reported, not failing): ${best.length}: ${best.join(' | ')}`,
    );
    // Dark runs at phone width, so the same pass checks reflow (WCAG 1.4.10, 320 CSS px of content).
    const dark = await context(browser, 'dark', 375);
    const darkViolations: string[] = [];
    const darkPages = await pool(paths, async (path) => {
      const fail: string[] = [];
      const { page } = await visit(dark, path, fail);
      const violations = (await axe(page)).map((v) => `${path}: ${v}`);
      for (const c of await clipped(page)) {
        fail.push(`${path}: at 375px, ${c} is cut off with no scroller to reach it`);
      }
      await page.close();
      return { violations, fail };
    });
    for (const { violations, fail } of darkPages) {
      darkViolations.push(...violations);
      failures.push(...fail);
    }
    await dark.close();
    check(
      !failures.some((f) => f.includes('cut off with no scroller')),
      `${paths.length} pages reflow at 375px: every table, code block and preview fits or scrolls`,
    );
    // Reported, not failed: dark ships as a preview in v0.1 (ARCHITECTURE.md §7.4, §18.1).
    notes.push(
      darkViolations.length === 0
        ? `ok: ${paths.length} pages have no axe violation in dark (at 375px)`
        : `dark (reported, not failing): ${darkViolations.length} axe violations: ${darkViolations.join(' | ')}`,
    );
    jsChecks(results);

    await routeChecks(browser);
    await themeChecks(browser);
    await nestingChecks(browser);
    await tailwindChecks(browser);
    await selectChecks(browser);
    await tooltipChecks(browser);
    await dialogChecks(browser);
    await popoverChecks(browser);
    await nizivoDrawerChecks(browser);
    await forcedColoursChecks(browser);
    await skipLinkChecks(browser);
    await drawerChecks(browser);
    await searchChecks(browser);
    await deviationsChecks(browser);
  } catch (error) {
    failures.push(
      `smoke aborted: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
    );
  } finally {
    await browser.close();
    server.close();
  }

  for (const path of REPORT) {
    const r = results.find((x) => x.path === path);
    if (!r) continue;
    console.log(
      `js ${path}: ${r.js.scripts} scripts, ${kb(r.js.bytes)} (${kb(r.js.gzip)} gzip); ` +
        `Nizivo client: ${r.js.nizivoClient.join(', ') || 'none'}`,
    );
  }
  for (const n of notes) console.log(n);
  const json = arg('--json');
  if (json) {
    writeFileSync(json, `${JSON.stringify({ failures, notes, pages: results }, null, 2)}\n`);
  }
  if (failures.length > 0) {
    for (const f of failures) console.error(`FAIL ${f}`);
    process.exit(1);
  }
  console.log(`smoke: all checks passed (${results.length} pages)`);
}

await main();
