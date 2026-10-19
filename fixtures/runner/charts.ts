// The charts-only fixture (ARCHITECTURE.md §4.1 L6, §14.1, seam ledger K9): @nizivo/charts with
// tokens.css and its own styles.css, and nothing of @nizivo/react. With --record it writes the
// committed fixtures/charts-only/results/<engine>.json; otherwise a temporary copy, so a lane run
// leaves the tree clean.
//
//   node fixtures/runner/charts.ts [--skip-build] [--engines chromium,webkit,firefox] [--record]
//
// 1. Build (turbo, cached), then `pnpm pack` @nizivo/tokens and @nizivo/charts into a temporary
//    folder (packing a private package is fine; it is never published from here) and unpack them.
//    The stylesheets are served from the tarballs, through their exports maps (`./tokens.css`,
//    `./styles.css`), so the check covers what a consumer installs.
// 2. The pages' markup comes from packages/charts/test/charts-only/pages.ts, which renders the built
//    dist/ with react-dom/server (as a Server Component emits it); the runner first checks that the
//    tarball's dist/ is byte for byte that dist/.
// 3. Every page is served under CSP Profile B (§19.3: `style-src 'self'; style-src-attr 'none'`) and
//    checked in each engine:
//    - only the two package stylesheets and the page's own load (no @nizivo/react CSS);
//    - no CSP violation (a control page with one `style=` attribute must report one), and the frame
//      still lays out: plots have a box, tick labels sit inside the frame, under the strict policy;
//    - axe-core (WCAG 2.0–2.2 A and AA) in light, with reduced motion and, in Chromium, in forced
//      colours (blocking); in dark (reported, as spec.ts does);
//    - focus-visible: Tab reaches the data-table disclosure, which then draws charts' own solid
//      outline in the token width and colour (pixels around it change to that colour); a pointer
//      click does not;
//    - visually hidden: the default data table and the loading text have a 1 × 1 clipped box yet
//      stay in the accessibility tree (a table named by the chart's title);
//    - the third-party page has no keyboard stop in its figure (interaction="none", no island);
//    - right to left: chart chrome follows `dir`, the plot stays left to right unless
//      xDirection="rtl" mirrors it.
// The axe passes run in a second context that bypasses CSP, because axe-core is injected as a
// script; everything else runs with the policy enforced.
/* oxlint-disable no-await-in-loop -- engines and pages run one after another in one browser */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';
import { pack, REPO_ROOT, unpack } from './pack.ts';
import { resultsFile, run, writeResults } from './serve.ts';
import { axe, axeForced, transitionsDone } from './spec.ts';

const FIXTURE_DIR = join(REPO_ROOT, 'fixtures', 'charts-only');
const CHARTS_DIR = join(REPO_ROOT, 'packages', 'charts');
const ENGINES = { chromium, firefox, webkit } as const;
type Engine = keyof typeof ENGINES;
const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' };

/** CSP Profile B (§19.3), for a page with no script of its own. */
const CSP = [
  "default-src 'none'",
  "style-src 'self'",
  "style-src-attr 'none'",
  "script-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** The page's own stylesheet, as an app would have one: canvas colours from the tokens. */
const PAGE_CSS = `body { margin: 0; padding: 24px; background: var(--nz-bg-canvas); color: var(--nz-text-primary); font: var(--nz-font-body-m); }
main { display: grid; gap: 32px; max-inline-size: 760px; }
h1, h2 { margin: 0 0 12px; }
`;

const SCREENSHOT_STYLE =
  /^Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline'/;

/** The page whose `style=` attribute must be blocked and reported (the recorder's positive control). */
const CONTROL = '/csp-control';

interface Pages {
  [path: string]: { title: string; body: string };
}

function isEngine(value: string): value is Engine {
  return Object.hasOwn(ENGINES, value);
}

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)))
    .toSorted();
}

/** The file an exports-map key points at, inside an unpacked package. */
function exported(packageDir: string, key: string): string {
  const manifest: unknown = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const exportsMap: unknown =
    typeof manifest === 'object' && manifest !== null
      ? Reflect.get(manifest, 'exports')
      : undefined;
  const target: unknown =
    typeof exportsMap === 'object' && exportsMap !== null
      ? Reflect.get(exportsMap, key)
      : undefined;
  if (typeof target !== 'string') throw new Error(`${packageDir}: no "${key}" export`);
  return join(packageDir, target);
}

function htmlDocument(title: string, body: string): string {
  return `<!doctype html><html lang="en" data-nz-theme="system"><head><meta charset="utf-8"><title>${title} · charts only</title><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/charts.css"><link rel="stylesheet" href="/page.css"></head><body>${body}</body></html>`;
}

async function listen(routes: Map<string, { type: string; body: string }>): Promise<Server> {
  const server = createServer((request, response) => {
    const route = routes.get(new URL(request.url ?? '/', 'http://x').pathname);
    if (route === undefined) {
      response.writeHead(404, { 'content-security-policy': CSP }).end('not found');
      return;
    }
    response
      .writeHead(200, { 'content-type': route.type, 'content-security-policy': CSP })
      .end(route.body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function launch(engine: Engine): Promise<Browser> {
  if (engine !== 'firefox' || process.platform !== 'darwin') return ENGINES[engine].launch();
  // Firefox on macOS needs a home folder of its own (packages/react/test/browser-engine.ts).
  const home = `${tmpdir().replace(/\/$/, '')}/nizivo-firefox-home`;
  mkdirSync(home, { recursive: true });
  return firefox.launch({ env: { ...process.env, CFFIXED_USER_HOME: home } });
}

type Checks = Record<string, unknown>;

/** Records CSP violations from the first script on (an init script is not subject to the policy). */
const RECORD_VIOLATIONS = () => {
  const seen: string[] = [];
  Reflect.set(globalThis, '__nzViolations', seen);
  document.addEventListener('securitypolicyviolation', (event) => {
    seen.push(`${event.effectiveDirective}: ${event.sample || event.blockedURI}`);
  });
};

async function violations(page: Page): Promise<string[]> {
  // the event is dispatched asynchronously after the blocked attribute
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
  const list: unknown = await page.evaluate(() => Reflect.get(globalThis, '__nzViolations'));
  return Array.isArray(list) ? list.map(String) : ['no violation recorder'];
}

/** Stylesheets on the page, by path; any other sheet (an inline <style>) shows as "inline". */
async function sheets(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.styleSheets].map((sheet) =>
      sheet.href === null ? 'inline' : new URL(sheet.href).pathname,
    ),
  );
}

/** Every ready plot has a box, and every tick label sits inside its frame's body. */
async function layout(page: Page): Promise<Checks> {
  return page.evaluate(() => {
    const plots = [
      ...document.querySelectorAll<HTMLElement>(
        '.nz-chart-frame:not([data-loading], [data-empty], [data-error]) [data-slot="chart-frame-plot"]',
      ),
    ];
    const empty = plots.filter(
      (p) => p.getBoundingClientRect().width < 100 || p.getBoundingClientRect().height < 50,
    );
    const outside: string[] = [];
    for (const tick of document.querySelectorAll<HTMLElement>('.nz-chart-frame-tick')) {
      if (tick.textContent === '') continue;
      const body = tick.closest('[data-slot="chart-frame-body"]')?.getBoundingClientRect();
      const box = tick.getBoundingClientRect();
      // a tick is a zero-width box whose text overflows evenly: measure the text
      const range = document.createRange();
      range.selectNodeContents(tick);
      const text = range.getBoundingClientRect();
      if (body === undefined) continue;
      if (
        text.left < body.left - 0.5 ||
        text.right > body.right + 0.5 ||
        box.top < body.top - 0.5
      ) {
        outside.push(tick.textContent ?? '');
      }
    }
    return {
      plots: plots.length,
      plotsWithoutBox: empty.length,
      ticksOutsideFrame: outside.join(', '),
      ok: plots.length > 0 && empty.length === 0 && outside.length === 0,
    };
  });
}

/** sRGB of a CSS colour (a token reference, light-dark(), oklch), resolved by the page. */
async function resolveColor(page: Page, value: string): Promise<[number, number, number]> {
  return page.evaluate((css) => {
    // a custom property resolves only in a style: through a probe's computed colour first
    const probe = document.createElement('span');
    probe.style.color = css;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (context === null) return [0, 0, 0] as [number, number, number];
    context.fillStyle = computed;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
    return [r, g, b] as [number, number, number];
  }, value);
}

/**
 * Pixels of a PNG screenshot within `tolerance` of `color`, decoded by the browser in a blank page
 * (the checked page's policy blocks the data: URL fetch).
 */
async function countColor(
  page: Page,
  png: Buffer,
  color: [number, number, number],
  tolerance = 48,
): Promise<number> {
  return page.evaluate(
    async ({ base64, rgb, tol }) => {
      const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (context === null) return -1;
      context.drawImage(bitmap, 0, 0);
      const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const d =
          Math.abs((data[i] ?? 0) - rgb[0]) +
          Math.abs((data[i + 1] ?? 0) - rgb[1]) +
          Math.abs((data[i + 2] ?? 0) - rgb[2]);
        if (d <= tol) n += 1;
      }
      return n;
    },
    { base64: png.toString('base64'), rgb: color, tol: tolerance },
  );
}

/**
 * Tab to a chart's focusable part (the data-table disclosure; AreaChart's interaction layer): it
 * matches :focus-visible and draws charts' own solid outline in --nz-border-width-focus and
 * --nz-border-focus, and the pixels around it turn that colour. A pointer click focuses it without
 * the ring (and opens the disclosure). WebKit on macOS moves Tab only between text fields, so there
 * the part is focused by script right after a key press, which keeps keyboard modality (as
 * packages/react/test/browser/focus-outline.spec.tsx does).
 */
async function focusVisible(
  page: Page,
  engine: Engine,
  selector: string,
  disclosure: boolean,
): Promise<Checks> {
  const summary = page.locator(selector);
  await summary.scrollIntoViewIfNeeded();
  const box = await summary.boundingBox();
  if (box === null) return { ok: false, error: `no ${selector}` };
  const clip = { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 };
  const want = await resolveColor(page, 'var(--nz-border-focus)');
  const decoder = await page.context().newPage();
  const before = await countColor(decoder, await page.screenshot({ clip, caret: 'initial' }), want);
  await page.keyboard.press('Tab');
  let tabbed = await summary.evaluate((el) => el === document.activeElement);
  if (!tabbed && engine === 'webkit') {
    await summary.evaluate((el) => {
      el.focus();
    });
    tabbed = await summary.evaluate((el) => el === document.activeElement);
  }
  await transitionsDone(page);
  const ring = await summary.evaluate((el) => {
    const style = getComputedStyle(el);
    // the token width as a computed length (the custom property itself may be a reference)
    const probe = document.createElement('span');
    probe.style.outline = 'var(--nz-border-width-focus) solid';
    document.body.append(probe);
    const tokenWidth = getComputedStyle(probe).outlineWidth;
    probe.remove();
    return {
      focusVisible: el.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
      tokenWidth,
    };
  });
  const after = await countColor(decoder, await page.screenshot({ clip, caret: 'initial' }), want);
  await decoder.close();
  // the outline's colour, resolved the way the token resolves
  const outlineColor = await summary.evaluate((el) => getComputedStyle(el).outlineColor);
  const painted = await resolveColor(page, outlineColor);
  const colorMatches = painted.every((c, i) => Math.abs(c - (want[i] ?? 0)) <= 2);
  // pointer modality: no ring
  await page.mouse.click(4, 4);
  await summary.click();
  const pointer = await summary.evaluate((el) => ({
    focused: el === document.activeElement,
    focusVisible: el.matches(':focus-visible'),
    open: el.closest('details')?.open === true,
  }));
  const widthMatches = ring.tokenWidth !== '' && ring.outlineWidth === ring.tokenWidth;
  return {
    tabbed,
    ...ring,
    outlineColor,
    tokenColor: `rgb(${want.join(', ')})`,
    ringPixelsBefore: before,
    ringPixelsAfter: after,
    pointer,
    ok:
      tabbed &&
      ring.focusVisible &&
      ring.outlineStyle === 'solid' &&
      widthMatches &&
      colorMatches &&
      after - before >= 2 * Math.round(box.width + box.height) &&
      !pointer.focusVisible &&
      (!disclosure || pointer.open),
  };
}

/**
 * The default data table and the loading text: nothing painted and nothing hit (clip-path), no
 * scroll overflow, still exposed (a table named by the chart's title), and a 1 × 1 box. A <table>
 * ignores `inline-size: 1px` (it is at least as wide as its content), so ChartFrame hides the
 * table's wrapper, whose box is the one checked here.
 */
async function visuallyHidden(page: Page, path: string): Promise<Checks> {
  const selector =
    path === '/frame'
      ? '#hidden-table .nz-chart-visually-hidden:has(> .nz-chart-frame-table)'
      : '#loading .nz-chart-visually-hidden';
  const hidden = page.locator(selector);
  await hidden.evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
  });
  const geometry = await hidden.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    // clip-path also clips hit testing: the centre of the box must hit something else
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      position: s.position,
      clipPath: s.clipPath,
      overflow: s.overflow,
      display: s.display,
      visibility: s.visibility,
      text: (el.textContent ?? '').length,
      hitsItself: hit !== null && (hit === el || el.contains(hit)),
      pageOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  const exposed =
    path === '/frame'
      ? await page.getByRole('table', { name: 'Sales' }).count()
      : await page.getByText('Loading chart', { exact: true }).count();
  const boxOk = geometry.width <= 1 && geometry.height <= 1;
  return {
    ...geometry,
    exposed,
    ok:
      boxOk &&
      geometry.position === 'absolute' &&
      geometry.clipPath === 'inset(50%)' &&
      !geometry.hitsItself &&
      !geometry.pageOverflowX &&
      geometry.display !== 'none' &&
      geometry.visibility !== 'hidden' &&
      geometry.text > 0 &&
      exposed === 1,
  };
}

/** interaction="none": nothing in the figure takes focus, and Tab passes it by. */
async function noKeyboardClaim(page: Page): Promise<Checks> {
  const stops = await page.evaluate(
    () =>
      document.querySelectorAll(
        '#third-party :is([tabindex], a[href], button, input, select, textarea, summary)',
      ).length,
  );
  await page.keyboard.press('Tab');
  const inside = await page.evaluate(() => {
    const active = document.activeElement;
    return active !== null && active !== document.body && active.closest('#third-party') !== null;
  });
  const live = await page.evaluate(
    () =>
      document.querySelectorAll('#third-party :is([aria-live], [role="status"], [role="alert"])')
        .length,
  );
  return {
    stops,
    focusInside: inside,
    liveRegions: live,
    ok: stops === 0 && !inside && live === 0,
  };
}

/** Chart chrome follows dir; the plot and x ticks do not, unless xDirection="rtl". */
async function rightToLeft(page: Page): Promise<Checks> {
  return page.evaluate(() => {
    // oxlint-disable-next-line unicorn/consistent-function-scoping -- runs in the page: evaluate sends this callback alone
    const read = (id: string) => {
      const figure = document.getElementById(id);
      const caption = figure?.querySelector('figcaption');
      const plot = figure?.querySelector<HTMLElement>('[data-slot="chart-frame-plot"]');
      const svg = plot?.querySelector('svg');
      const ticks = [
        ...(figure?.querySelectorAll<HTMLElement>(
          '[data-slot="chart-frame-x-ticks"] .nz-chart-frame-tick',
        ) ?? []),
      ].filter((t) => t.textContent !== '');
      const first = ticks[0]?.getBoundingClientRect().left ?? 0;
      const last = ticks.at(-1)?.getBoundingClientRect().left ?? 0;
      return {
        caption:
          caption === null || caption === undefined ? '' : getComputedStyle(caption).direction,
        plot: plot === null || plot === undefined ? '' : getComputedStyle(plot).direction,
        scale: svg === null || svg === undefined ? '' : getComputedStyle(svg).scale,
        firstTickLeftOfLast: first < last,
      };
    };
    const ltr = read('rtl-default');
    const rtl = read('rtl-mirrored');
    return {
      default: ltr,
      mirrored: rtl,
      ok:
        ltr.caption === 'rtl' &&
        ltr.plot === 'ltr' &&
        ltr.scale === 'none' &&
        ltr.firstTickLeftOfLast &&
        rtl.caption === 'rtl' &&
        rtl.plot === 'rtl' &&
        rtl.scale === '-1 1' &&
        !rtl.firstTickLeftOfLast,
    };
  });
}

/**
 * Forced colours (Chromium): every legend mark and tooltip swatch paints a system colour, not its
 * brand colour (D-ax: a rule that loses on specificity keeps the brand colour, as legend.css and
 * chart-tooltip.css once did), and what the current line paints is reported.
 */
async function forcedColors(page: Page): Promise<Checks> {
  const read = (): Promise<string[]> =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.nz-legend-mark, .nz-chart-tooltip-swatch')].map(
        (mark) =>
          `${mark.className} ${mark.dataset['series'] ?? ''}: ${getComputedStyle(mark).color}`,
      ),
    );
  const brand = await read();
  await page.emulateMedia({ forcedColors: 'active' });
  await transitionsDone(page);
  const marks = await read();
  const line = await page.evaluate(() => {
    const path = document.querySelector('.nz-chart-line[data-series="current"]');
    return path === null ? '' : getComputedStyle(path).stroke;
  });
  await page.emulateMedia({ forcedColors: 'none' });
  await transitionsDone(page);
  const kept = marks.filter((mark, i) => mark === brand[i]);
  return { marks, currentLine: line, kept, ok: marks.length > 0 && kept.length === 0 };
}

interface PageResult {
  sheets: string[];
  violations: string[];
  checks: Record<string, Checks>;
  axe: string[];
  axeDark: string[];
  axeForcedColors?: string[];
  axeReducedMotion: string[];
  console: string[];
  failures: string[];
}

async function checkPage(
  enforced: BrowserContext,
  bypass: BrowserContext,
  engine: Engine,
  base: string,
  path: string,
): Promise<PageResult> {
  const failures: string[] = [];
  const consoleLines: string[] = [];
  const page = await enforced.newPage();
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    // Playwright's WebKit screenshot injects a stylesheet of its own, which the policy refuses (a
    // harness artefact: the page's own violations are the recorder's, read below).
    if (engine === 'webkit' && SCREENSHOT_STYLE.test(m.text())) return;
    consoleLines.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => consoleLines.push(`pageerror: ${e.message.slice(0, 300)}`));
  await page.goto(base + path, { waitUntil: 'load' });
  await transitionsDone(page);
  const loadedSheets = await sheets(page);
  const want = ['/tokens.css', '/charts.css', '/page.css'];
  if (loadedSheets.join(' ') !== want.join(' '))
    failures.push(`stylesheets: ${loadedSheets.join(', ')}`);
  const blocked = await violations(page);
  if (path === CONTROL) {
    if (blocked.length === 0) failures.push('the CSP control reported no violation');
  } else if (blocked.length > 0) {
    failures.push(`CSP: ${blocked.join(' | ')}`);
  }
  const checks: Record<string, Checks> = {};
  const step = async (name: string, fn: () => Promise<Checks>) => {
    try {
      checks[name] = await fn();
    } catch (error) {
      checks[name] = { ok: false, error: String(error).split('\n')[0] ?? '' };
    }
    if (checks[name]?.['ok'] !== true) failures.push(`${name}: ${JSON.stringify(checks[name])}`);
  };
  if (path !== CONTROL) await step('layout', () => layout(page));
  if (path === '/frame' || path === '/statuses')
    await step('visuallyHidden', () => visuallyHidden(page, path));
  if (path === '/third-party') await step('noKeyboardClaim', () => noKeyboardClaim(page));
  if (path === '/rtl') await step('rightToLeft', () => rightToLeft(page));
  if ((path === '/frame' || path === '/parts') && engine === 'chromium')
    await step('forcedColors', () => forcedColors(page));
  if (path === '/frame') {
    await step('focusVisible', () =>
      focusVisible(page, engine, '#details-table .nz-chart-frame-details-summary', true),
    );
  }
  // AreaChart's interaction layer, server markup with no JavaScript: Tab reaches it, and it draws
  // the same ring through the charts focus rule's [tabindex] branch
  if (path === '/parts') {
    await step('focusVisible', () =>
      focusVisible(page, engine, '#area [data-slot="chart-frame-plot"] [tabindex="0"]', false),
    );
  }
  // the interactions above must not have produced a violation either
  // (WebKit's screenshot stylesheet shows up as style-src-elem; the load-time read above has none)
  const late = (await violations(page))
    .slice(blocked.length)
    .filter((v) => !(engine === 'webkit' && v.startsWith('style-src-elem: ')));
  if (path !== CONTROL && late.length > 0)
    failures.push(`CSP after interaction: ${late.join(' | ')}`);
  await page.close();

  const result: PageResult = {
    sheets: loadedSheets,
    violations: blocked,
    checks,
    axe: [],
    axeDark: [],
    axeReducedMotion: [],
    console: consoleLines,
    failures,
  };
  if (path === CONTROL) return result;

  const a11y = await bypass.newPage();
  await a11y.goto(base + path, { waitUntil: 'load' });
  await transitionsDone(a11y);
  result.axe = await axe(a11y);
  if (result.axe.length > 0) failures.push(`axe: ${result.axe.join(' | ')}`);
  await a11y.emulateMedia({ colorScheme: 'dark' });
  await transitionsDone(a11y);
  result.axeDark = await axe(a11y);
  await a11y.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await transitionsDone(a11y);
  result.axeReducedMotion = await axe(a11y);
  if (result.axeReducedMotion.length > 0)
    failures.push(`axe with reduced motion: ${result.axeReducedMotion.join(' | ')}`);
  await a11y.emulateMedia({ reducedMotion: 'no-preference' });
  if (engine === 'chromium') {
    await a11y.emulateMedia({ forcedColors: 'active' });
    await transitionsDone(a11y);
    result.axeForcedColors = await axeForced(a11y);
    if (result.axeForcedColors.length > 0)
      failures.push(`axe in forced colours: ${result.axeForcedColors.join(' | ')}`);
    await a11y.emulateMedia({ forcedColors: 'none' });
  }
  await a11y.close();
  if (consoleLines.length > 0) failures.push(`console: ${consoleLines.length} message(s)`);
  return result;
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      'skip-build': { type: 'boolean' },
      engines: { type: 'string', default: 'chromium' },
      record: { type: 'boolean' },
    },
  });
  const engines = (values.engines ?? 'chromium').split(',');
  const unknown = engines.filter((e) => !isEngine(e));
  if (unknown.length > 0) throw new Error(`unknown engine ${unknown.join(', ')}`);

  if (values['skip-build'] !== true) run('corepack', ['pnpm@12.11.2', 'build'], REPO_ROOT, env);
  const work = mkdtempSync(join(tmpdir(), 'nizivo-charts-only-'));
  try {
    const stage = join(work, 'stage');
    mkdirSync(stage);
    const tokens = unpack(pack('packages/tokens', stage), join(work, 'tokens'));
    const charts = unpack(pack('packages/charts', stage), join(work, 'charts'));
    // The markup is rendered from the workspace dist/: it must be what the tarball ships.
    const packedDist = files(join(charts, 'dist'));
    const builtDist = files(join(CHARTS_DIR, 'dist'));
    const differ = builtDist.filter(
      (file) =>
        !packedDist.includes(file) ||
        !readFileSync(join(charts, 'dist', file)).equals(
          readFileSync(join(CHARTS_DIR, 'dist', file)),
        ),
    );
    if (differ.length > 0 || packedDist.length !== builtDist.length) {
      throw new Error(`the tarball's dist/ is not the built dist/: ${differ.join(', ')}`);
    }

    const rendered = spawnSync(
      process.execPath,
      [join(CHARTS_DIR, 'test', 'charts-only', 'pages.ts')],
      {
        cwd: CHARTS_DIR,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    if (rendered.status !== 0) throw new Error(`pages.ts failed:\n${rendered.stderr}`);
    const parsed: unknown = JSON.parse(rendered.stdout);
    if (typeof parsed !== 'object' || parsed === null) throw new Error('pages.ts printed no pages');
    const pages: Pages = Object.fromEntries(
      Object.entries(parsed).map(([path, page]: [string, unknown]) => [
        path,
        {
          title: String(Reflect.get(Object(page), 'title') ?? ''),
          body: String(Reflect.get(Object(page), 'body') ?? ''),
        },
      ]),
    );
    if (rendered.stderr.trim() !== '')
      throw new Error(`pages.ts printed to stderr:\n${rendered.stderr}`);

    const routes = new Map<string, { type: string; body: string }>([
      [
        '/tokens.css',
        { type: 'text/css', body: readFileSync(exported(tokens, './tokens.css'), 'utf8') },
      ],
      [
        '/charts.css',
        { type: 'text/css', body: readFileSync(exported(charts, './styles.css'), 'utf8') },
      ],
      ['/page.css', { type: 'text/css', body: PAGE_CSS }],
      [
        CONTROL,
        {
          type: 'text/html',
          body: htmlDocument('CSP control', '<main><h1 style="color: red">CSP control</h1></main>'),
        },
      ],
    ]);
    for (const [path, page] of Object.entries(pages)) {
      routes.set(path, { type: 'text/html', body: htmlDocument(page.title, page.body) });
    }
    const server = await listen(routes);
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('the server has no port');
    const base = `http://127.0.0.1:${address.port}`;
    let failed = 0;
    try {
      for (const engine of engines.filter(isEngine)) {
        const browser = await launch(engine);
        try {
          const enforced = await browser.newContext({ viewport: { width: 1000, height: 900 } });
          await enforced.addInitScript(RECORD_VIOLATIONS);
          const bypass = await browser.newContext({
            viewport: { width: 1000, height: 900 },
            bypassCSP: true,
          });
          const results: Record<string, PageResult> = {};
          for (const path of [CONTROL, ...Object.keys(pages)]) {
            results[path] = await checkPage(enforced, bypass, engine, base, path);
          }
          const failures = Object.entries(results).flatMap(([path, r]) =>
            r.failures.map((f) => `${path} ${f}`),
          );
          const result = {
            engine,
            browser: `${engine} ${browser.version()}`,
            csp: CSP,
            pass: failures.length === 0,
            failures,
            pages: results,
          };
          writeResults(resultsFile(FIXTURE_DIR, `${engine}.json`, values.record === true), result);
          console.log(`${engine}: ${result.pass ? 'pass' : `FAIL\n  ${failures.join('\n  ')}`}`);
          if (!result.pass) failed += 1;
        } finally {
          await browser.close();
        }
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
    return failed === 0 ? 0 : 1;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

process.exitCode = await main();
