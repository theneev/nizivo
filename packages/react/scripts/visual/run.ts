/**
 * In-repo visual regression for @nizivo/react (ARCHITECTURE.md §18.1; decision 6: no hosted
 * service, baselines committed as ordinary files, M6).
 *
 * Every `src/<name>/<name>.example.tsx` export is rendered, one at a time, through the BUILT
 * package (dist JS and dist CSS, with the built @nizivo/tokens tokens.css) in Playwright Chromium:
 * a fixed 960×720 viewport, device scale 1, reduced motion, animations and the caret disabled at
 * capture, and the Geist variable fonts the tokens name, served from the docs' installed `geist`
 * package (nothing is fetched; any request off the local server fails the run). Each example is
 * shot in four modes, light, dark, forced colours (Chromium's `forcedColors: 'active'`, light OS
 * palette) and forced-dark (forced colours with the OS in dark mode, as Windows' dark contrast
 * themes are), and in each state its own interactive controls (component.json `interactive`) can
 * reach:
 *
 *   rest            the example as rendered: its disabled, invalid, checked, mixed, pending and
 *                   `defaultOpen` states are what the example shows
 *   hover-<slot>-n  the pointer over each enabled control (a Tooltip trigger waits for its popup)
 *   press-<slot>-n  the mouse button held down on each enabled control that does not open a popup
 *                   and is not a text field (released off the control, so nothing activates)
 *   open-<slot>-n   a Dialog, Menu or Select trigger pressed; then open-hover-… (the pointer on the
 *                   first enabled item) and open-key-… (ArrowDown, or Tab in a Dialog: the keyboard
 *                   ring inside the popup)
 *   focus-n-<slot>  each Tab stop inside the example, reached from the keyboard, so React Aria's
 *                   `data-focus-visible` and `:focus-visible` both apply
 *
 * A rest shot is cropped to the example, a state shot to the control; both include any open popup
 * and 12 px for the focus halo. Shots are stored as 8-bit RGB PNGs (scripts/visual/png.ts).
 *
 *   node scripts/visual/run.ts                compare with test/visual/baselines; diffs and the
 *                                             new renders go to test/visual/.diff (gitignored)
 *   node scripts/visual/run.ts --update       write baselines that changed, add new ones, delete
 *                                             ones no example produces any more
 *   node scripts/visual/run.ts --review       also write the light renders of Button, Input, Select
 *                                             and Dialog, every state, with an index.html, to
 *                                             test/visual/.review (gitignored): exit criterion 11
 *   --only button,select  limit the run
 *   --tolerance 2         per-channel difference (0–255) a pixel may show and still count as equal
 *   --max-diff-pixels 3   pixels per shot that may differ by more
 *   --threshold 0.1       opt in to pixelmatch's YIQ distance (0–1) on top of --tolerance
 *   --aa                  tolerate pixels both images show as anti-aliasing (pixelmatch's test)
 * The baselines hold one pinned environment (manifest.json). There, renders repeat to ±1 per
 * channel except, now and then, one or two anti-aliased pixels on a focus halo's edge (up to ±5):
 * hence ±2 and 3 pixels. A one-step token change or a 1 px radius change moves far more pixels
 * than that, so it fails the compare. --update uses the same rule, so it re-records exactly what
 * a compare would fail and a baseline never lags the CSS.
 *
 * `--package charts` runs the same lane on @nizivo/charts (its `src/<part>/<part>.example.tsx`,
 * through its built dist/ and dist/styles.css, with tokens.css and no @nizivo/react CSS: the
 * charts-only route of §5.2), with baselines in packages/charts/test/visual. Charts parts have no
 * component.json, so their shots are rest and focus (Tab stops) only; the harness is this lane's.
 * Each part's basic example (`<Part>Example`) is also shot at rest in a 20rem stage, `narrow`: a
 * phone's card, where the charts' container queries lay them out differently (a CSP-clean example
 * cannot narrow itself: no inline style, test/ssr/examples.test.tsx).
 *
 * Run from packages/react after `pnpm build` (it reads dist/ and @nizivo/tokens' dist/). Baselines
 * hold one machine's rasterisation: manifest.json records the platform, Chromium and the font
 * build, and a compare on another refuses to run (the plan's pinned Docker image is the way to
 * share them). Exit 1 on any difference, missing or stale shot, page error or external request.
 */
/* oxlint-disable no-await-in-loop -- a page runs its examples, and an example its steps, one after another */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { availableParallelism, tmpdir } from 'node:os';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium, type Browser, type Page } from 'playwright';
import { build, type Rolldown } from 'tsdown';
import { compare, decodePng, encodePng, solid, toRgb, type Image } from './png.ts';
import type { Control, ExampleRef, Rect, VisualApi } from './protocol.ts';

const { values: args } = parseArgs({
  options: {
    update: { type: 'boolean', default: false },
    review: { type: 'boolean', default: false },
    only: { type: 'string' },
    package: { type: 'string', default: 'react' },
    tolerance: { type: 'string', default: '2' },
    threshold: { type: 'string' },
    'max-diff-pixels': { type: 'string', default: '3' },
    aa: { type: 'boolean', default: false },
  },
});
/** The packages this lane shoots: their examples, built dist/ and baselines. */
const TARGETS = ['react', 'charts'] as const;
type Target = (typeof TARGETS)[number];
const TARGET: Target | undefined = TARGETS.find((t) => t === args.package);
if (TARGET === undefined) throw new Error(`--package must be one of ${TARGETS.join(', ')}`);

const REACT = fileURLToPath(new URL('../../', import.meta.url));
const REPO = join(REACT, '..', '..');
const PACKAGE = join(REPO, 'packages', TARGET);
const SRC = join(PACKAGE, 'src');
const DIST = join(PACKAGE, 'dist');
const TOKENS_CSS = join(REPO, 'packages', 'tokens', 'dist', 'tokens.css');
/** The browser half: one harness for every package (it imports only React). */
const HARNESS = join(REACT, 'test', 'visual', 'harness.tsx');
const LANE = join(PACKAGE, 'test', 'visual');
const BASELINES = join(LANE, 'baselines');
const DIFFS = join(LANE, '.diff');
const REVIEW = join(LANE, '.review');
const MANIFEST = join(BASELINES, 'manifest.json');
const VIEWPORT = { width: 960, height: 720 };
const MODES = ['light', 'dark', 'forced', 'forced-dark'] as const;
type Mode = (typeof MODES)[number];
/** Exit criterion 11: the designer signs off light renders of these. */
const REVIEW_SET = new Set(['button', 'input', 'select', 'dialog']);
/** Text fields: a press there is a click into the field (its focus shot covers it), not a state. */
const PRESS_SKIP = new Set(['input', 'textarea', 'native-select-trigger']);
/** Trigger slots that open their popup on press; a Tooltip opens on hover and focus instead. */
const PRESS_OPENS = (slot: string, overlay: boolean): boolean =>
  overlay && slot.endsWith('-trigger') && slot !== 'tooltip-trigger';
const MAX_TAB_STOPS = 24;
/** Pages shooting in parallel, each in its own browser context. */
const WORKERS = Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2)));
/**
 * A control that may open a Tooltip (the harness's TOOLTIP_TRIGGER) opens it on hover after a
 * 400 ms delay, or at once while React Aria's tooltips are warm, and on keyboard focus. A shot of
 * one waits for the popup, so warm and cold give the same picture; with `tooltip={false}` none
 * comes and the wait ends at TOOLTIP_WAIT.
 */
const TOOLTIP_WAIT = 1000;

const tolerance = Number(args.tolerance);
const threshold = args.threshold === undefined ? undefined : Number(args.threshold);
const maxDiffPixels = Number(args['max-diff-pixels']);
if (
  !(Number.isInteger(tolerance) && tolerance >= 0 && tolerance <= 255) ||
  (threshold !== undefined && !(threshold >= 0 && threshold <= 1)) ||
  !(maxDiffPixels >= 0)
) {
  throw new Error('--tolerance must be 0–255, --threshold 0–1 and --max-diff-pixels ≥ 0');
}

const only = args.only === undefined ? undefined : new Set(args.only.split(','));

const rel = (file: string): string => relative(REPO, file).split(sep).join('/');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// --- inputs -------------------------------------------------------------------------------------

interface Component {
  name: string;
  example: string;
  interactive: string[];
  overlay: boolean;
}

function components(): Component[] {
  const found: Component[] = [];
  for (const name of readdirSync(SRC).toSorted()) {
    const manifest = join(SRC, name, 'component.json');
    const example = join(SRC, name, `${name}.example.tsx`);
    if (!existsSync(example)) continue;
    // a charts part has no manifest: no interactive slots of its own, no overlay
    if (!existsSync(manifest)) {
      if (TARGET === 'react') continue;
      found.push({ name, example, interactive: [], overlay: false });
      continue;
    }
    const json: unknown = JSON.parse(readFileSync(manifest, 'utf8'));
    if (!isRecord(json)) throw new Error(`${rel(manifest)} is not an object`);
    const interactive = Array.isArray(json['interactive'])
      ? json['interactive'].filter((s): s is string => typeof s === 'string')
      : [];
    found.push({ name, example, interactive, overlay: json['overlay'] === true });
  }
  if (found.length === 0) throw new Error(`no examples under ${rel(SRC)}`);
  return found;
}

/** The stylesheets the page links after tokens.css, as [URL path, file]. */
function requireBuilt(): Array<[string, string]> {
  const css = join(DIST, 'css');
  const needed =
    TARGET === 'react'
      ? [TOKENS_CSS, join(css, 'base.css'), join(DIST, 'index.js')]
      : [TOKENS_CSS, join(DIST, 'styles.css'), join(DIST, 'index.js')];
  const missing = needed.filter((f) => !existsSync(f));
  if (missing.length > 0) {
    throw new Error(`not built: ${missing.map(rel).join(', ')}. Run \`pnpm build\` first.`);
  }
  // charts: its one sheet and no @nizivo/react CSS, the charts-only route (§5.2, §14.1)
  if (TARGET === 'charts') return [['/css/styles.css', join(DIST, 'styles.css')]];
  const sheets = readdirSync(css).filter((f) => f.endsWith('.css'));
  // base.css first, as the docs and the CSS import rule order them; the layer statement on line 1
  // of every file makes the rest order-independent
  return ['base.css', ...sheets.filter((f) => f !== 'base.css').toSorted()].map((f) => [
    `/css/${f}`,
    join(css, f),
  ]);
}

function fonts(): { sans: string; mono: string; version: string } {
  // the docs site's own font package (OFL-1.1), so the lane adds no dependency and no font file
  const require = createRequire(join(REPO, 'apps', 'docs', 'package.json'));
  let entry: string;
  try {
    entry = require.resolve('geist/font');
  } catch {
    throw new Error('geist is not installed in apps/docs: run `pnpm install` at the repo root');
  }
  const root = dirname(dirname(entry));
  const pkg: unknown = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const version = isRecord(pkg) && typeof pkg['version'] === 'string' ? pkg['version'] : '?';
  return {
    sans: join(root, 'dist', 'fonts', 'geist-sans', 'Geist-Variable.woff2'),
    mono: join(root, 'dist', 'fonts', 'geist-mono', 'GeistMono-Variable.woff2'),
    version: `geist ${version}`,
  };
}

// --- bundle -------------------------------------------------------------------------------------

/** Points each example's `./index` and `../<name>/index` at dist, as the docs' rewrite does. */
function distImports(): Rolldown.Plugin {
  return {
    name: 'nz-visual-dist',
    resolveId(source, importer) {
      if (importer === undefined || !importer.endsWith('.example.tsx')) return null;
      if (!importer.startsWith(SRC)) return null;
      const own = basename(dirname(importer));
      const target = source === './index' ? own : /^\.\.\/([a-z0-9-]+)\/index$/.exec(source)?.[1];
      if (target === undefined) {
        if (source.startsWith('.')) {
          throw new Error(`${rel(importer)}: cannot map '${source}' to a public entry`);
        }
        return null;
      }
      const file = join(DIST, target, 'index.js');
      if (!existsSync(file)) throw new Error(`${rel(importer)}: ${rel(file)} is not built`);
      return file;
    },
    // only the examples come from src; every component must come from dist
    load(id) {
      if (id.startsWith(SRC) && !id.endsWith('.example.tsx')) {
        throw new Error(`${rel(id)} was bundled from src, not dist`);
      }
      return null;
    },
  };
}

async function bundle(list: Component[], out: string): Promise<string> {
  const entry = join(out, 'entry.ts');
  const lines = [`import { start } from ${JSON.stringify(HARNESS)};`];
  list.forEach((c, i) => lines.push(`import * as m${i} from ${JSON.stringify(c.example)};`));
  const modules = list.map((c, i) => `${JSON.stringify(c.name)}: m${i}`).join(', ');
  const interactive = Object.fromEntries(list.map((c) => [c.name, c.interactive]));
  const opens = list.flatMap((c) => c.interactive.filter((s) => PRESS_OPENS(s, c.overlay)));
  lines.push(
    `start({ modules: { ${modules} }, interactive: ${JSON.stringify(interactive)}, opens: ${JSON.stringify(opens)} });`,
  );
  writeFileSync(entry, `${lines.join('\n')}\n`);
  await build({
    config: false,
    cwd: PACKAGE,
    tsconfig: join(PACKAGE, 'tsconfig.json'),
    entry: { harness: entry },
    outDir: join(out, 'js'),
    format: 'esm',
    platform: 'browser',
    target: 'es2023',
    fixedExtension: false,
    hash: false,
    dts: false,
    sourcemap: false,
    minify: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    deps: { alwaysBundle: [/.*/], onlyBundle: false },
    plugins: [distImports()],
    publint: false,
    attw: false,
    report: false,
    unused: false,
    exports: false,
    logLevel: 'error',
  });
  return join(out, 'js');
}

// --- server -------------------------------------------------------------------------------------

function page(sheets: ReadonlyArray<[string, string]>): string {
  const links = ['/tokens.css', ...sheets.map(([href]) => href)]
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join('\n');
  return `<!doctype html>
<html lang="en" data-nz-theme="light">
<head>
<meta charset="utf-8">
<title>Nizivo visual regression</title>
${links}
<style>
@font-face { font-family: "Geist"; src: url(/fonts/geist-sans.woff2) format("woff2"); font-weight: 100 900; font-display: block; }
@font-face { font-family: "Geist Mono"; src: url(/fonts/geist-mono.woff2) format("woff2"); font-weight: 100 900; font-display: block; }
html { background: var(--nz-bg-surface); color: var(--nz-text-primary); }
/* on body, not html: the root keeps the browser's 16 px, so every rem renders at the size Nizivo ships */
body { margin: 0; font: var(--nz-font-body-m); }
#nz-visual-start { position: fixed; inset: 0 auto auto 0; inline-size: 1px; block-size: 1px; padding: 0; border: 0; opacity: 0; }
#nz-visual-stage { box-sizing: border-box; inline-size: 720px; padding: 40px; }
#nz-visual-stage[data-narrow] { inline-size: calc(20rem + 80px); }
/* the docs preview (apps/docs/app/global.css .nz-docs-preview) */
.nz-visual-host { display: flex; flex-wrap: wrap; align-items: center; gap: var(--nz-space-4); }
.nz-visual-host > div:not([data-slot]) { display: flex; flex-wrap: wrap; align-items: center; gap: var(--nz-space-4); inline-size: 100%; }
.nz-visual-host > div:not([data-slot]) > [data-slot='card'] { flex: 1 1 16rem; }
</style>
</head>
<body>
<button id="nz-visual-start" type="button" aria-label="Start" tabindex="-1"></button>
<div id="nz-visual-stage"></div>
<script type="module" src="/js/harness.js"></script>
</body>
</html>
`;
}

function serve(
  js: string,
  sheets: ReadonlyArray<[string, string]>,
  font: { sans: string; mono: string },
): Promise<Server> {
  const files = new Map<string, [string, string]>([
    ['/tokens.css', [TOKENS_CSS, 'text/css']],
    ['/fonts/geist-sans.woff2', [font.sans, 'font/woff2']],
    ['/fonts/geist-mono.woff2', [font.mono, 'font/woff2']],
  ]);
  for (const [href, file] of sheets) files.set(href, [file, 'text/css']);
  for (const f of readdirSync(js)) files.set(`/js/${f}`, [join(js, f), 'text/javascript']);
  const html = page(sheets);
  // ImageExample loads /media/*.jpg, files of the reader's app: a flat placeholder stands in
  const placeholder = encodePng(solid(64, 64, [180, 196, 178]));
  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    const file = files.get(path);
    if (path === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
    } else if (path.startsWith('/media/')) {
      res.writeHead(200, { 'content-type': 'image/png' }).end(placeholder);
    } else if (file) {
      res.writeHead(200, { 'content-type': file[1] }).end(readFileSync(file[0]));
    } else {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// --- capture ------------------------------------------------------------------------------------

/** Calls `globalThis.nzVisual[method](...args)` in the page. */
async function call<K extends keyof VisualApi>(
  p: Page,
  method: K,
  ...params: Parameters<VisualApi[K]>
): Promise<Awaited<ReturnType<VisualApi[K]>>> {
  const result: unknown = await p.evaluate(
    ([m, a]) => {
      const api: unknown = Reflect.get(globalThis, 'nzVisual');
      const fn: unknown = typeof api === 'object' && api !== null ? Reflect.get(api, m) : undefined;
      if (typeof fn !== 'function') throw new Error(`nzVisual.${m} is missing`);
      return Reflect.apply(fn, api, a);
    },
    [method, params] as const,
  );
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the harness implements VisualApi
  return result as Awaited<ReturnType<VisualApi[K]>>;
}

async function until(
  p: Page,
  check: () => Promise<boolean>,
  what: string,
  timeout = 3000,
): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (!(await check())) {
    if (Date.now() > deadline) {
      if (what === '') return false;
      throw new Error(`timed out waiting for ${what}`);
    }
    await p.waitForTimeout(20);
  }
  return true;
}

/** After hover or focus on a control with a tooltip, waits for it (or for TOOLTIP_WAIT). */
async function tooltip(p: Page, has: boolean): Promise<void> {
  if (!has) return;
  await until(p, () => call(p, 'popups', 'tooltip').then((n) => n > 0), '', TOOLTIP_WAIT);
}

async function shot(p: Page, rect: Rect): Promise<Image> {
  const png = await p.screenshot({
    clip: rect,
    // a crop past the viewport (a tall example) needs the full-page capture; overlays never are
    fullPage: rect.y + rect.height > VIEWPORT.height || rect.x + rect.width > VIEWPORT.width,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });
  return toRgb(decodePng(png));
}

async function setMode(p: Page, mode: Mode): Promise<void> {
  const dark = mode === 'dark' || mode === 'forced-dark';
  await p.emulateMedia({
    forcedColors: mode === 'forced' || mode === 'forced-dark' ? 'active' : 'none',
    colorScheme: dark ? 'dark' : 'light',
  });
  await call(p, 'setTheme', dark ? 'dark' : 'light');
}

/** All shots of one example in one mode, by state name. */
async function captureExample(p: Page, ex: ExampleRef): Promise<Map<string, Image>> {
  const shots = new Map<string, Image>();
  const take = async (state: string, id?: string): Promise<void> => {
    await call(p, 'settle');
    const rect = id === undefined ? await call(p, 'crop') : await call(p, 'crop', id);
    if (shots.has(state)) throw new Error(`two shots named ${state}`);
    shots.set(state, await shot(p, rect));
  };
  const away = async (): Promise<void> => {
    await p.mouse.move(1, VIEWPORT.height - 1);
  };
  const closed = (): Promise<boolean> => call(p, 'popups').then((n) => n === 0);

  await away();
  let mounted = await call(p, 'mount', ex.component, ex.name);
  if (mounted.open) {
    // Mounted again after a key press with nothing on the page, so a `defaultOpen` popup that
    // focuses a control (Popover, Drawer) starts in keyboard modality, as on a fresh page, and
    // shows its ring at rest whichever example ran before it (a press step leaves pointer modality
    // behind, a Tab loop does not). Closed examples keep the modality their hover steps were
    // recorded in.
    await call(p, 'unmount');
    await p.keyboard.press('Escape');
    mounted = await call(p, 'mount', ex.component, ex.name);
  }
  await take('rest');

  if (!mounted.open) {
    const enabled = mounted.controls.filter((c: Control) => !c.disabled);
    for (const c of enabled) {
      await p.locator(`[data-nz-visual="${c.id}"]`).hover({ timeout: 3000 });
      await tooltip(p, c.tooltip);
      await take(`hover-${c.slot}-${c.index}`, c.id);
      await away();
      await until(p, closed, 'popups to close after hover');
    }
    for (const c of enabled.filter((x) => x.opens)) {
      const family = c.slot.slice(0, -'-trigger'.length);
      const open = (): Promise<number> => call(p, 'popups', family);
      await p.locator(`[data-nz-visual="${c.id}"]`).click({ timeout: 3000 });
      await until(p, () => open().then((n) => n > 0), `${c.slot} to open`);
      await take(`open-${c.slot}-${c.index}`, c.id);
      const item = await call(p, 'markPopupItem');
      if (item !== '') {
        await p.locator(`[data-nz-visual="${item}"]`).hover({ timeout: 3000 });
        await take(`open-hover-${c.slot}-${c.index}`, c.id);
        await p.keyboard.press('ArrowDown');
      } else {
        await p.keyboard.press('Tab');
      }
      await take(`open-key-${c.slot}-${c.index}`, c.id);
      await p.keyboard.press('Escape');
      await until(p, () => open().then((n) => n === 0), `${c.slot} to close on Escape`);
      // focus is back on the trigger, from the keyboard: a tooltip there opens, so move it off
      await call(p, 'resetFocus');
      await away();
      await until(p, closed, 'popups to close after Escape');
    }
  }

  await call(p, 'resetFocus');
  const seen = new Set<string>();
  for (let n = 1; n <= MAX_TAB_STOPS; n += 1) {
    await p.keyboard.press('Tab');
    await call(p, 'settle');
    const focused = await call(p, 'focused');
    if (!focused.inside || seen.has(focused.key)) break;
    seen.add(focused.key);
    await tooltip(p, focused.tooltip);
    await take(`focus-${n}-${focused.slot || 'element'}`, focused.key);
  }

  // Last, since a press may change what later states would show (a tab selects on press).
  if (!mounted.open) {
    const pressable = mounted.controls.filter(
      (c: Control) => !c.disabled && !c.opens && !PRESS_SKIP.has(c.slot),
    );
    for (const c of pressable) {
      await call(p, 'resetFocus');
      // A pointer move first, as a real mouse makes on its way to a control: after the Tab loop
      // React Aria's modality is still "keyboard", and a press on a Tooltip trigger then opens and
      // closes its popup in one event, leaving it unpositioned in data-exiting for good (a
      // follow-up), so the shot would never settle.
      await away();
      await p.locator(`[data-nz-visual="${c.id}"]`).hover({ timeout: 3000 });
      await tooltip(p, c.tooltip);
      await p.mouse.down();
      // a press closes a Tooltip (React Aria hides it on press start)
      await until(p, () => call(p, 'popups', 'tooltip').then((n) => n === 0), '', TOOLTIP_WAIT);
      await take(`press-${c.slot}-${c.index}`, c.id);
      // released off the control, so the press is cancelled and nothing activates
      await away();
      await p.mouse.up();
      await until(p, closed, 'popups to close after a press');
    }
  }
  await call(p, 'unmount');

  // Last and on a fresh mount, so no state above sees the resize: a charts part's basic example in
  // the 20rem stage
  if (TARGET === 'charts' && ex.slug === 'basic') {
    // a string, as this file compiles without the DOM library
    const narrow = (on: boolean): Promise<unknown> =>
      p.evaluate(
        `document.querySelector('#nz-visual-stage').toggleAttribute('data-narrow', ${on})`,
      );
    await call(p, 'resetFocus');
    await away();
    await narrow(true);
    await call(p, 'mount', ex.component, ex.name);
    await take('narrow');
    await call(p, 'unmount');
    await narrow(false);
  }
  return shots;
}

// --- baselines ----------------------------------------------------------------------------------

const ENV_KEYS = ['platform', 'browser', 'playwright', 'fonts', 'viewport'] as const;
type Environment = Record<(typeof ENV_KEYS)[number], string>;

function readManifest(): Environment | undefined {
  if (!existsSync(MANIFEST)) return undefined;
  const json: unknown = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  if (!isRecord(json) || !isRecord(json['environment'])) return undefined;
  const e = json['environment'];
  const str = (k: string): string => {
    const v = e[k];
    return typeof v === 'string' ? v : '';
  };
  return {
    platform: str('platform'),
    browser: str('browser'),
    playwright: str('playwright'),
    fonts: str('fonts'),
    viewport: str('viewport'),
  };
}

function listBaselines(dir = BASELINES, prefix = ''): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return listBaselines(join(dir, entry.name), `${prefix}${entry.name}/`);
    return entry.name.endsWith('.png') ? [`${prefix}${entry.name.slice(0, -4)}`] : [];
  });
}

function playwrightVersion(): string {
  const require = createRequire(join(PACKAGE, 'package.json'));
  const pkg: unknown = JSON.parse(readFileSync(require.resolve('playwright/package.json'), 'utf8'));
  return isRecord(pkg) && typeof pkg['version'] === 'string' ? pkg['version'] : '?';
}

function reviewIndex(names: string[]): string {
  const rows = names
    .map((n) => `<figure><img src="${n}.png" alt="${n}"><figcaption>${n}</figcaption></figure>`)
    .join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Nizivo light renders for sign-off</title>
<style>body{font:14px system-ui;margin:24px;background:#f4f4f5}figure{display:inline-block;margin:8px;padding:8px;background:#fff;vertical-align:top}figcaption{font-size:12px;color:#444;margin-top:4px}</style>
</head><body>
<h1>Button, Input, Select and Dialog: light renders, every state (exit criterion 11)</h1>
<p>Generated by packages/react/scripts/visual/run.ts --review from the built package; not committed.</p>
${rows}
</body></html>
`;
}

// --- main ---------------------------------------------------------------------------------------

/** Opens one worker page: its own context, so focus, the pointer and React Aria's state are its own. */
async function openPage(browser: Browser, origin: string, problems: string[]): Promise<Page> {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(`${origin}/`)) return route.continue();
    problems.push(`external request blocked: ${url}`);
    return route.abort();
  });
  const p = await context.newPage();
  p.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  p.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`console ${message.type()}: ${message.text()}`);
    }
  });
  p.on('response', (response) => {
    if (response.status() >= 400) problems.push(`${response.status()}: ${response.url()}`);
  });
  await p.goto(`${origin}/`);
  await p.waitForFunction(() => 'nzVisual' in globalThis);
  if (!(await call(p, 'fontsReady'))) throw new Error('the Geist fonts did not load');
  return p;
}

/** Every shot, by `<component>/<slug>--<state>--<mode>`, taken by WORKERS pages in parallel. */
async function captureAll(
  browser: Browser,
  origin: string,
  problems: string[],
): Promise<{ shots: Map<string, Image>; examples: number }> {
  const pages = await Promise.all(
    Array.from({ length: WORKERS }, () => openPage(browser, origin, problems)),
  );
  const first = pages[0];
  if (first === undefined) throw new Error('no worker page');
  const examples = (await call(first, 'examples')).filter(
    (ex) => only === undefined || only.has(ex.component),
  );
  const jobs = MODES.flatMap((mode) => examples.map((ex) => ({ mode, ex })));
  const shots = new Map<string, Image>();
  let next = 0;
  await Promise.all(
    pages.map(async (p) => {
      let current: Mode | undefined;
      for (let job = jobs[next++]; job !== undefined; job = jobs[next++]) {
        const { mode, ex } = job;
        try {
          if (mode !== current) await setMode(p, mode);
          current = mode;
          for (const [state, image] of await captureExample(p, ex)) {
            shots.set(`${ex.component}/${ex.slug}--${state}--${mode}`, image);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
          problems.push(`${ex.component}/${ex.name} (${mode}): ${message}`);
          await call(p, 'unmount').catch(() => undefined);
        }
      }
      await p.context().close();
    }),
  );
  return { shots, examples: examples.length };
}

interface Outcome {
  identical: number;
  /** Shots that differ from their baseline only within the threshold or by anti-aliasing. */
  tolerated: string[];
  added: number;
  changed: number;
  removed: number;
}

/** Whether a shot or baseline name belongs to the components this run covers (--only). */
function inScope(name: string): boolean {
  return only === undefined || only.has(name.slice(0, name.indexOf('/')));
}

/** Writes a failed shot's new render, and its diff image, to the gitignored .diff folder. */
function keep(name: string, image: Image, diff?: Image): void {
  mkdirSync(dirname(join(DIFFS, name)), { recursive: true });
  writeFileSync(join(DIFFS, `${name}.actual.png`), encodePng(image));
  if (diff) writeFileSync(join(DIFFS, `${name}.diff.png`), encodePng(diff));
}

/** Compares `shots` with the baselines, or (--update) writes the ones that differ. */
function reconcile(
  shots: Map<string, Image>,
  environment: Environment,
  problems: string[],
): Outcome {
  const outcome: Outcome = { identical: 0, tolerated: [], added: 0, changed: 0, removed: 0 };
  const recorded = readManifest();
  if (!args.update) {
    if (recorded === undefined) {
      problems.push(`no ${rel(MANIFEST)}: record the baselines with --update`);
    } else {
      const mismatch = ENV_KEYS.filter((k) => recorded[k] !== environment[k]);
      if (mismatch.length > 0) {
        problems.push(
          `the baselines were recorded on ${mismatch.map((k) => recorded[k]).join(', ')}; this ` +
            `run is ${mismatch.map((k) => environment[k]).join(', ')}. Compare where they were ` +
            `recorded, or re-record with --update and review the change.`,
        );
      }
    }
  }
  const stale = new Set(listBaselines().filter(inScope));
  for (const [name, image] of [...shots].toSorted(([a], [b]) => a.localeCompare(b))) {
    const file = join(BASELINES, `${name}.png`);
    stale.delete(name);
    if (!existsSync(file)) {
      if (args.update) {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, encodePng(image));
        outcome.added += 1;
      } else {
        problems.push(`new shot with no baseline: ${name}`);
        keep(name, image);
      }
      continue;
    }
    const baseline = decodePng(readFileSync(file));
    let differs: string | undefined;
    let diff: Image | undefined;
    if (baseline.width !== image.width || baseline.height !== image.height) {
      differs = `size ${baseline.width}×${baseline.height} → ${image.width}×${image.height}`;
    } else if (Buffer.compare(toRgb(baseline).data, image.data) === 0) {
      outcome.identical += 1;
    } else {
      const result = compare(baseline, image, { tolerance, threshold, antialiasing: args.aa });
      if (result.diff > maxDiffPixels) {
        differs = `${result.diff} px differ by more than ±${tolerance} (${result.antialiased} anti-aliased tolerated)`;
        diff = result.image;
      } else {
        outcome.tolerated.push(
          `${name} (${result.diff} px over, ${result.antialiased} anti-aliased)`,
        );
      }
    }
    if (differs === undefined) continue;
    if (args.update) {
      writeFileSync(file, encodePng(image));
      outcome.changed += 1;
    } else {
      problems.push(`${name}: ${differs}`);
      keep(name, image, diff);
    }
  }
  for (const name of stale) {
    if (args.update) {
      rmSync(join(BASELINES, `${name}.png`));
      outcome.removed += 1;
    } else {
      problems.push(`stale baseline (no example produces it): ${name}`);
    }
  }
  if (args.update) {
    for (const dir of readdirSync(BASELINES, { withFileTypes: true })) {
      const path = join(BASELINES, dir.name);
      if (dir.isDirectory() && readdirSync(path).length === 0) rmSync(path, { recursive: true });
    }
    writeFileSync(MANIFEST, `${JSON.stringify({ environment }, null, 2)}\n`);
  }
  return outcome;
}

/** Exit criterion 11: the light renders of REVIEW_SET, every state, with an index page. */
function writeReview(shots: Map<string, Image>): void {
  rmSync(REVIEW, { recursive: true, force: true });
  const names = [...shots.keys()]
    .filter((n) => REVIEW_SET.has(n.slice(0, n.indexOf('/'))) && n.endsWith('--light'))
    .toSorted();
  for (const name of names) {
    const image = shots.get(name);
    if (image === undefined) continue;
    mkdirSync(dirname(join(REVIEW, name)), { recursive: true });
    writeFileSync(join(REVIEW, `${name}.png`), encodePng(image));
  }
  writeFileSync(join(REVIEW, 'index.html'), reviewIndex(names));
  console.log(`review set: ${names.length} light renders, ${rel(join(REVIEW, 'index.html'))}`);
}

async function main(): Promise<number> {
  const started = Date.now();
  const sheets = requireBuilt();
  const font = fonts();
  const tmp = mkdtempSync(join(tmpdir(), 'nz-visual-'));
  const problems: string[] = [];
  let server: Server | undefined;
  const browser = await chromium.launch({
    args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'],
  });
  try {
    const js = await bundle(components(), tmp);
    server = await serve(js, sheets, font);
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('no server port');
    const origin = `http://127.0.0.1:${address.port}`;
    const { shots, examples } = await captureAll(browser, origin, problems);
    const environment: Environment = {
      platform: `${process.platform}-${process.arch}`,
      browser: `chromium ${browser.version()}`,
      playwright: playwrightVersion(),
      fonts: font.version,
      viewport: `${VIEWPORT.width}x${VIEWPORT.height}@1x`,
    };
    rmSync(DIFFS, { recursive: true, force: true });
    const o = reconcile(shots, environment, problems);
    if (args.review) writeReview(shots);
    const files = listBaselines();
    const bytes = files.reduce((sum, n) => sum + statSync(join(BASELINES, `${n}.png`)).size, 0);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `${shots.size} shots of ${examples} examples × ${MODES.length} modes in ${seconds} s ` +
        `(${WORKERS} pages); baselines: ${files.length} files, ${(bytes / 1024).toFixed(0)} KiB`,
    );
    console.log(
      args.update
        ? `${o.added} added, ${o.changed} changed, ${o.removed} removed`
        : `${o.identical} identical, ${o.tolerated.length} within the tolerance` +
            o.tolerated.map((t) => `\n  ${t}`).join(''),
    );
  } finally {
    await browser.close();
    server?.close();
    rmSync(tmp, { recursive: true, force: true });
  }
  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):\n${problems.map((p) => `  ${p}`).join('\n')}`);
    if (existsSync(DIFFS)) console.error(`\ndiffs and new renders: ${rel(DIFFS)}`);
    return 1;
  }
  console.log(args.update ? 'baselines updated' : 'no visual differences');
  return 0;
}

process.exitCode = await main();
