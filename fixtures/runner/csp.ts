// The CSP Profile A/B and Trusted Types fixture (ARCHITECTURE.md §19.3, R13; v0.3): the Vite SSR
// fixture's server-rendered pages (fixtures/vite-ssr), served by this runner under each policy and
// checked in Chromium, WebKit and Firefox. Only server HTML can fail Profile B: a `style="…"`
// attribute the server renders is blocked by `style-src-attr 'none'` and hydration never repairs
// it, while React sets client styles through the CSSOM, which the directive does not cover.
//
//   node fixtures/runner/csp.ts [--skip-build] [--record]
//
// 1. pack.ts, `pnpm install --frozen-lockfile` and both Vite builds in fixtures/vite-ssr (skipped
//    with --skip-build, after a fixture-vite-ssr run).
// 2. This runner serves dist/client and renders every other path with dist/server/entry-server.js,
//    stamping a fresh nonce per response on the CSP header, every <script> and modulepreload, and
//    `<meta property="csp-nonce">` (React Aria reads it for the <style> it injects). `?csp=` picks
//    the policy:
//    - `a`: Profile A, the documented default (`style-src-attr 'unsafe-inline'`): zero violations on
//      every page, the Dialog and the Select open, no console error. Blocking.
//    - `hash`: Profile A with the theme script allowed by its published SHA-256 (theme-script.tsx)
//      instead of a nonce: zero violations, and the script ran (`data-nz-platform` is set).
//      Blocking.
//    - `nometa`: Profile A without the csp-nonce meta: the control for it. React Aria's press
//      <style> (`touch-action` on its pressables) must be blocked on /tabs, so `a` passing proves
//      the meta works.
//    - `b`: Profile B (`style-src-attr 'none'`): zero violations on the server-safe pages
//      (blocking); on the pages with engine parts every violation is recorded with its element, the
//      per-component list R13 tracks, and does not fail the run.
//    - `tt`: Profile A plus `Content-Security-Policy-Report-Only: require-trusted-types-for
//      'script'`, Chromium only (the others do not enforce Trusted Types): every report is recorded
//      with its sample, and does not fail the run.
// 3. A control page with one `style=` attribute under Profile B must report a violation in an
//    engine; an engine that reports none does not enforce `style-src-attr`, which is recorded.
//
// The results are deterministic: pages and variants in a fixed order, no timestamps, and the run's
// origin scrubbed to `<origin>`.
/* oxlint-disable no-await-in-loop -- engines, variants and pages run one after another */
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium, firefox, webkit, type Browser, type Page } from 'playwright';
import { getText } from './http.ts';
import { packInto, REPO_ROOT } from './pack.ts';
import { resultsFile, run, writeResults } from './serve.ts';

const FIXTURE_DIR = join(REPO_ROOT, 'fixtures', 'vite-ssr');
const CLIENT = join(FIXTURE_DIR, 'dist', 'client');
const VITE = join(FIXTURE_DIR, 'node_modules', '.bin', 'vite');
const PORT = 3424;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0' };
const ENGINES = { chromium, webkit, firefox } as const;
type Engine = keyof typeof ENGINES;
const ENGINE_NAMES: readonly Engine[] = ['chromium', 'webkit', 'firefox'];

/** Server-safe pages: no engine part, so Profile B must hold (§19.3). */
const T0_PAGES = ['/', '/button-only', '/t0-barrel'];
/** Pages with engine parts (React Aria): Profile B is recorded per component. */
const ENGINE_PAGES = ['/alert-dismiss', '/overlays', '/forms', '/menu', '/tabs'];
const CONTROL = '/csp-control';

type Variant = 'a' | 'hash' | 'nometa' | 'b' | 'tt';
const VARIANTS: readonly Variant[] = ['a', 'hash', 'nometa', 'b', 'tt'];
const TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

/** The CSP header for a variant and a response's nonce. */
function policy(variant: Variant, nonce: string, themeHash: string): string {
  const scripts =
    variant === 'hash'
      ? `'nonce-${nonce}' '${themeHash}' 'strict-dynamic'`
      : `'nonce-${nonce}' 'strict-dynamic'`;
  return [
    "default-src 'self'",
    `script-src ${scripts}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr ${variant === 'b' ? "'none'" : "'unsafe-inline'"}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; ');
}

/** The page's HTML with the nonce on every script and modulepreload, and the meta React Aria reads. */
function stamp(html: string, variant: Variant, nonce: string, themeScript: string): string {
  let out = html
    .replaceAll('<script', `<script nonce="${nonce}"`)
    .replaceAll('<link rel="modulepreload"', `<link rel="modulepreload" nonce="${nonce}"`);
  // `hash`: the theme script carries no nonce, so only its published hash can allow it
  if (variant === 'hash')
    out = out.replace(`<script nonce="${nonce}">${themeScript}`, `<script>${themeScript}`);
  if (variant !== 'nometa') {
    // the real <head>, after <html>: the template's comment mentions `<head>` too
    out = out.replace(/(<html[^>]*>\s*<head>)/, `$1<meta property="csp-nonce" nonce="${nonce}">`);
  }
  return out;
}

async function listen(themeScript: string, themeHash: string): Promise<Server> {
  const template = await readFile(join(CLIENT, 'index.html'), 'utf8');
  const entry = pathToFileURL(join(FIXTURE_DIR, 'dist', 'server', 'entry-server.js')).href;
  const server: unknown = await import(entry);
  const render =
    typeof server === 'object' && server !== null && 'render' in server ? server.render : undefined;
  if (typeof render !== 'function') throw new Error('dist/server/entry-server.js has no render');
  const httpServer = createServer((request, response) => {
    const url = new URL(request.url ?? '/', ORIGIN);
    if (url.pathname.startsWith('/assets/')) {
      const file = normalize(join(CLIENT, url.pathname));
      readFile(file)
        .then((body) => {
          response.writeHead(file.startsWith(CLIENT) ? 200 : 404, {
            'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
          });
          response.end(body);
        })
        .catch(() => response.writeHead(404).end());
      return;
    }
    const variant = VARIANTS.find((v) => v === url.searchParams.get('csp')) ?? 'a';
    const nonce = randomBytes(16).toString('base64');
    const headers: Record<string, string> = {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': policy(variant, nonce, themeHash),
    };
    if (variant === 'tt') {
      headers['content-security-policy-report-only'] = "require-trusted-types-for 'script'";
    }
    if (url.pathname === CONTROL) {
      response.writeHead(200, headers);
      response.end(
        '<!doctype html><html lang="en"><head><title>CSP control</title></head><body><p style="color: red">styled by an attribute</p></body></html>',
      );
      return;
    }
    const result: unknown = render(url.pathname);
    const html =
      typeof result === 'object' && result !== null && 'html' in result ? String(result.html) : '';
    response.writeHead(200, headers);
    response.end(stamp(template.replace('<!--app-html-->', html), variant, nonce, themeScript));
  });
  await new Promise<void>((resolve) => httpServer.listen(PORT, '127.0.0.1', resolve));
  return httpServer;
}

interface Violation {
  directive: string;
  disposition: string;
  blocked: string;
  element: string;
  sample: string;
}

/** Records every CSP violation from the first byte, before any page script runs. */
const COLLECT = `window.__nzViolations = [];
document.addEventListener('securitypolicyviolation', (e) => {
  const t = e.target instanceof Element ? e.target : null;
  window.__nzViolations.push({
    directive: e.effectiveDirective,
    disposition: e.disposition,
    blocked: String(e.blockedURI),
    element: t === null ? '' : (t.getAttribute('data-slot') ?? t.localName) + (t.className && typeof t.className === 'string' ? '.' + t.className.split(' ')[0] : ''),
    sample: String(e.sample).slice(0, 80),
  });
}, true);`;

/** A run's own values out of a recorded string: the origin and the per-response nonce. */
function isViolation(value: unknown): value is Violation {
  return (
    typeof value === 'object' &&
    value !== null &&
    ['directive', 'disposition', 'blocked', 'element', 'sample'].every(
      (key) => typeof Reflect.get(value, key) === 'string',
    )
  );
}

function portable(text: string): string {
  return text.replaceAll(ORIGIN, '<origin>').replaceAll(/nonce-[A-Za-z0-9+/=]+/g, 'nonce-<n>');
}

interface PageResult {
  violations: Violation[];
  console: string[];
  checks: string[];
  failures: string[];
}

async function visit(
  browser: Browser,
  path: string,
  variant: Variant,
  interact: (page: Page) => Promise<string[]>,
): Promise<PageResult> {
  const context = await browser.newContext();
  await context.addInitScript(COLLECT);
  const page = await context.newPage();
  const consoleLines: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleLines.push(portable(m.text()));
  });
  page.on('pageerror', (e) => consoleLines.push(portable(`pageerror: ${e.message}`)));
  await page.goto(`${ORIGIN}${path}?csp=${variant}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  const checks = await interact(page);
  await page.waitForTimeout(200);
  const raw: unknown = await page.evaluate(() => Reflect.get(window, '__nzViolations'));
  const violations = (Array.isArray(raw) ? raw : []).filter(isViolation);
  for (const v of violations) v.blocked = portable(v.blocked);
  await context.close();
  return { violations, console: consoleLines, checks, failures: [] };
}

/** Opens the Dialog and the Select on /overlays: the engine parts work under the policy. */
async function overlays(page: Page): Promise<string[]> {
  const out: string[] = [];
  await page.getByRole('button', { name: 'Edit product' }).click();
  const dialog = await page.locator('.nz-dialog-popup').isVisible();
  out.push(`dialog opens: ${dialog}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.locator('.nz-select-trigger').click();
  const select = await page.locator('.nz-select-popup').isVisible();
  out.push(`select opens: ${select}`);
  await page.keyboard.press('Escape');
  return out;
}

const none = (): Promise<string[]> => Promise.resolve([]);

/** Firefox on macOS needs a writable home for its profile (as charts.ts launches it). */
async function launch(engine: Engine): Promise<Browser> {
  if (engine !== 'firefox' || process.platform !== 'darwin') return ENGINES[engine].launch();
  const home = `${tmpdir().replace(/\/$/, '')}/nizivo-firefox-home`;
  mkdirSync(home, { recursive: true });
  return firefox.launch({ env: { ...process.env, CFFIXED_USER_HOME: home } });
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: { 'skip-build': { type: 'boolean' }, record: { type: 'boolean' } },
  });
  if (values['skip-build'] !== true) {
    packInto(FIXTURE_DIR, { build: true });
    run('corepack', ['pnpm@12.11.2', 'install', '--frozen-lockfile'], FIXTURE_DIR, env);
    run(VITE, ['build', '--outDir', 'dist/client'], FIXTURE_DIR, env);
    run(
      VITE,
      ['build', '--ssr', 'src/entry-server.jsx', '--outDir', 'dist/server'],
      FIXTURE_DIR,
      env,
    );
  }
  const themeModule: unknown = await import(
    pathToFileURL(
      join(FIXTURE_DIR, 'node_modules', '@nizivo', 'react', 'dist', 'theme-script', 'index.js'),
    ).href
  );
  const themeScript =
    typeof themeModule === 'object' && themeModule !== null && 'themeScript' in themeModule
      ? String(themeModule.themeScript)
      : '';
  const themeHash = `sha256-${createHash('sha256').update(themeScript).digest('base64')}`;
  const failures: string[] = [];
  const engines: Record<
    string,
    { enforcesStyleSrcAttr: boolean; pages: Record<string, Record<string, PageResult>> }
  > = {};
  const server = await listen(themeScript, themeHash);
  // Profile B's subject, from the HTML itself: every `style=` attribute the server renders, by
  // element (browsers differ in what else they report: WebKit flags its own <select> rendering)
  const serverStyles: Record<string, string[]> = {};
  try {
    for (const path of [...T0_PAGES, ...ENGINE_PAGES]) {
      const html = await getText(`${ORIGIN}${path}?csp=b`);
      serverStyles[path] = [...html.matchAll(/<([a-z]+)([^>]*?)\sstyle="[^"]*"/g)].map((m) => {
        const slot = /data-slot="([^"]+)"/.exec(m[2] ?? '')?.[1];
        return slot === undefined ? (m[1] ?? '') : `${m[1]} ${slot}`;
      });
      if (T0_PAGES.includes(path)) {
        for (const element of serverStyles[path] ?? []) {
          failures.push(`${path}: the server renders a style attribute on ${element}`);
        }
      }
    }
    for (const engine of ENGINE_NAMES) {
      const browser = await launch(engine);
      try {
        const control = await visit(browser, CONTROL, 'b', none);
        const enforces = control.violations.some((v) => v.directive === 'style-src-attr');
        const pages: Record<string, Record<string, PageResult>> = {};
        for (const path of [...T0_PAGES, ...ENGINE_PAGES]) {
          pages[path] = {};
          for (const variant of VARIANTS) {
            if (variant === 'tt' && engine !== 'chromium') continue;
            const result = await visit(browser, path, variant, async (page) => [
              // the theme script ran: by nonce, or under `hash` by its published hash
              `theme script ran: ${await page.evaluate(() => document.documentElement.hasAttribute('data-nz-platform'))}`,
              ...(path === '/overlays' && variant !== 'tt' ? await overlays(page) : []),
            ]);
            const at = `${engine} ${path} ?csp=${variant}`;
            const enforced = result.violations.filter((v) => v.disposition === 'enforce');
            if (variant === 'a' || variant === 'hash') {
              for (const v of enforced)
                failures.push(
                  `${at}: ${v.directive} blocked ${v.blocked || v.element} ${v.sample}`,
                );
              for (const line of result.console) failures.push(`${at}: console: ${line}`);
              for (const check of result.checks)
                if (check.endsWith('false')) failures.push(`${at}: ${check}`);
            }
            if (variant === 'b' && T0_PAGES.includes(path)) {
              for (const v of enforced)
                failures.push(`${at}: ${v.directive} blocked on a server-safe page: ${v.element}`);
            }
            pages[path][variant] = result;
          }
        }
        // the control for the nonce meta: without it, React Aria's press <style> is blocked
        if (
          !(pages['/tabs']?.['nometa']?.violations ?? []).some(
            (v) => v.directive === 'style-src-elem',
          )
        ) {
          failures.push(
            `${engine}: /tabs without the csp-nonce meta blocked no <style>, so the meta proves nothing`,
          );
        }
        if (engine === 'chromium' || engine === 'webkit') {
          if (!enforces) failures.push(`${engine}: the control's style attribute was not blocked`);
        }
        engines[engine] = { enforcesStyleSrcAttr: enforces, pages };
      } finally {
        await browser.close();
      }
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // R13's list: the elements whose server-rendered style attribute Profile B blocks, per engine
  const profileB: Record<string, string[]> = {};
  for (const [engine, { pages }] of Object.entries(engines)) {
    profileB[engine] = [
      ...new Set(
        Object.entries(pages).flatMap(([path, variants]) =>
          (variants['b']?.violations ?? [])
            .filter((v) => v.directive === 'style-src-attr')
            .map((v) => `${path} ${v.element}`),
        ),
      ),
    ].toSorted();
  }
  const trustedTypes = Object.entries(engines['chromium']?.pages ?? {}).flatMap(
    ([path, variants]) =>
      (variants['tt']?.violations ?? []).map((v) => `${path} ${v.directive} ${v.sample}`),
  );
  const result = {
    fixture: 'csp',
    command: 'fixtures/vite-ssr built; served by fixtures/runner/csp.ts under each policy',
    themeHash,
    pass: failures.length === 0,
    serverStyleAttributes: serverStyles,
    failures,
    profileBBlocked: profileB,
    trustedTypesReports: [...new Set(trustedTypes)],
    engines,
  };
  writeResults(resultsFile(FIXTURE_DIR, 'csp.json', values.record === true), result);
  console.log(
    `csp: ${result.pass ? 'pass' : `FAIL\n  ${failures.join('\n  ')}`}\n  server style attributes: ${JSON.stringify(serverStyles)}\n  Profile B blocked: ${JSON.stringify(profileB)}\n  Trusted Types reports: ${result.trustedTypesReports.length}`,
  );
  return result.pass ? 0 : 1;
}

process.exitCode = await main();
