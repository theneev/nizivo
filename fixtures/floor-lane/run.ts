// Floor-lane runner (ARCHITECTURE.md §21.1 exit criterion 6). Serves pages/ on loopback and opens every
// page in each browser, once with the OS colour scheme light and once dark. The pages measure themselves;
// this script only reads the JSON they write, so the same pages can be checked by hand in a browser no
// script can drive (a real Safari 17.5).
//
//   node fixtures/floor-lane/run.ts --firefox <Firefox.app or its binary> [--engines firefox,chromium,webkit]
//   node fixtures/floor-lane/run.ts --serve [--port 8129] [--host 0.0.0.0]   serve the pages for a manual run;
//            pages opened from the index post their results to results/manual/<browser>-<page>-<scheme>.json
//   options: --tokens <tokens.css> serves a generated tokens file in place of pages/plan-tokens.css
//            --results <dir> writes the results there instead of results/ (so a run on other tokens
//            keeps the committed ones)
//            --raw <dir> also writes every check (the committed results keep failures and notes only)
//            --react-css <dir> serves a built packages/react/dist/css under react-css/ (w3-controls)
//            --pages <names> runs only these pages (comma-separated keys of `pages` below)
//   node fixtures/floor-lane/run.ts --ios-sim [--ios-runtime <id>] [--ios-device-type <name>]
//            Mobile Safari on the iOS Simulator (Xcode's xcrun simctl): creates and boots a throwaway
//            device on the runtime (default iOS 17.5), sets its appearance per OS scheme, opens every page
//            with `simctl openurl`, takes the result the page POSTs back and screenshots the device for the
//            painted check; the device is shut down and deleted at the end. Writes mobile-safari-<x.y>.json.
//
// Firefox is driven over WebDriver BiDi with Node's own WebSocket, so it needs no npm package or driver.
// Chromium and WebKit go through Playwright (this fixture's devDependency), loaded only when asked for.
// Mobile Safari needs only Xcode: the pages measure themselves and post their JSON to this server.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { decodePng, pixel, type Image } from './png.ts';

const pagesDir = join(import.meta.dirname, 'pages');
const resultsDir = join(import.meta.dirname, 'results');
// name -> path. The paint page runs twice, with <html> unthemed and dark.
const pages: Record<string, string> = {
  nesting: 'nesting.html',
  'halo-inverse': 'halo-inverse.html',
  'overlay-entry': 'overlay-entry.html',
  'paint.html-none': 'paint.html?html=none',
  'paint.html-dark': 'paint.html?html=dark',
  // Week 3: the shipped component stylesheets (needs --react-css).
  'w3-controls': 'w3-controls.html',
};
const schemes = ['light', 'dark'] as const;
type Scheme = (typeof schemes)[number];

interface Check {
  group: string;
  id: string;
  status: 'pass' | 'fail' | 'info';
  observed: unknown;
  expected: unknown;
  note: string | null;
}
interface PageResult {
  page: string;
  userAgent: string;
  osScheme: string;
  reducedMotion: boolean;
  meta: Record<string, unknown>;
  summary: { pass: number; fail: number; info: number };
  checks: Check[];
}
interface Session {
  version: string;
  driver: string;
  read(url: string): Promise<PageResult>;
  screenshot(): Promise<Buffer>;
  close(): Promise<void>;
}

// Waits for <html data-done>, then returns the page's JSON. Evaluated in the page by both drivers.
const readResult = `new Promise((resolve, reject) => {
  const started = Date.now();
  const poll = () => {
    if (document.documentElement.hasAttribute('data-done')) resolve(document.getElementById('result').textContent);
    else if (Date.now() - started > 30000) reject(new Error('the page did not finish within 30 s'));
    else setTimeout(poll, 50);
  };
  poll();
})`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function get(value: unknown, ...path: string[]): unknown {
  let current = value;
  for (const key of path) current = isRecord(current) ? current[key] : undefined;
  return current;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') throw new Error(`expected a string for ${what}`);
  return value;
}

function isPageResult(value: unknown): value is PageResult {
  return isRecord(value) && typeof value['page'] === 'string' && Array.isArray(value['checks']);
}

function parseResult(json: string): PageResult {
  const value: unknown = JSON.parse(json);
  if (!isPageResult(value)) throw new Error('the page wrote an unexpected result shape');
  return value;
}

// ---------- static server ----------

function isAddressInfo(value: string | AddressInfo | null): value is AddressInfo {
  return typeof value === 'object' && value !== null;
}

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

// Names a manual result after the browser that posted it, e.g. safari-17.5 or ios-safari-17.5.
function browserLabel(userAgent: string): string {
  const firefox = /Firefox\/([\d.]+)/.exec(userAgent);
  if (firefox) return `firefox-${firefox[1]}`;
  const chrome = /Chrome\/([\d.]+)/.exec(userAgent);
  if (chrome) return `chromium-${chrome[1]}`;
  const safari = /Version\/([\d.]+).*Safari/.exec(userAgent);
  if (safari) return `${/iPhone|iPad/.test(userAgent) ? 'ios-' : ''}safari-${safari[1]}`;
  return 'unknown';
}

// The posted page and scheme become a file name, so only known values are accepted.
const manualPages = new Set(['nesting', 'halo-inverse', 'overlay-entry', 'paint', 'w3-controls']);
const manualThemes = new Set(['none', 'light', 'dark', 'system']);

function saveManualResult(body: string): string {
  const result = parseResult(body);
  const theme = result.meta['htmlTheme'];
  if (!manualPages.has(result.page)) throw new Error(`unknown page ${result.page}`);
  if (result.osScheme !== 'light' && result.osScheme !== 'dark')
    throw new Error('unknown OS scheme');
  if (result.page === 'paint' && (typeof theme !== 'string' || !manualThemes.has(theme))) {
    throw new Error('unknown <html> theme');
  }
  const page = result.page === 'paint' ? `paint.html-${String(theme)}` : result.page;
  const dir = join(resultsDir, 'manual');
  const file = join(dir, `${browserLabel(result.userAgent)}-${page}-${result.osScheme}.json`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, `${JSON.stringify(compact(result), null, 2)}\n`);
  return file;
}

// Takes a result a page posted (with the query of the URL that page was opened at); throws to reject it.
type ResultHandler = (body: string, query: URLSearchParams) => void;

async function serve(
  host: string,
  port: number,
  tokensFile: string | undefined,
  onResult: ResultHandler | undefined,
  reactCssDir: string | undefined,
): Promise<{ origin: string; close: () => void }> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = url.pathname;
    if (request.method === 'POST' && path === '/result' && onResult) {
      let body = '';
      request.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      request.on('end', () => {
        try {
          onResult(body, url.searchParams);
          response.writeHead(204).end();
        } catch (error) {
          console.error(
            `rejected a posted result: ${error instanceof Error ? error.message : String(error)}`,
          );
          response.writeHead(400).end();
        }
      });
      return;
    }
    const name = path === '/' ? 'index.html' : decodeURIComponent(path.slice(1));
    const reactCss =
      reactCssDir !== undefined && name.startsWith('react-css/')
        ? resolve(reactCssDir, name.slice('react-css/'.length))
        : undefined;
    const file =
      name === 'plan-tokens.css' && tokensFile ? tokensFile : (reactCss ?? resolve(pagesDir, name));
    const allowed =
      file === tokensFile ||
      file.startsWith(pagesDir + sep) ||
      (reactCssDir !== undefined && file.startsWith(reactCssDir + sep));
    if (!allowed) {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = readFileSync(file);
      response.writeHead(200, {
        'content-type': contentTypes[extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(port, host, done));
  const address = server.address();
  if (!isAddressInfo(address)) throw new Error('the page server has no TCP address');
  const shownHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  return { origin: `http://${shownHost}:${address.port}`, close: () => server.close() };
}

// ---------- Firefox over WebDriver BiDi ----------

interface Bidi {
  send(method: string, params: Record<string, unknown>): Promise<unknown>;
  close(): void;
}

async function connectBidi(url: string): Promise<Bidi> {
  const socket = new WebSocket(url);
  await new Promise<void>((done, failed) => {
    socket.addEventListener('open', () => done());
    socket.addEventListener('error', () => failed(new Error(`cannot connect to ${url}`)));
  });
  let nextId = 0;
  const pending = new Map<
    number,
    { done: (result: unknown) => void; failed: (error: Error) => void }
  >();
  socket.addEventListener('message', (event) => {
    const message: unknown = JSON.parse(String(event.data));
    const id = get(message, 'id');
    const waiter = typeof id === 'number' ? pending.get(id) : undefined;
    if (!waiter || typeof id !== 'number') return;
    pending.delete(id);
    if (get(message, 'type') === 'error') {
      waiter.failed(
        new Error(`${String(get(message, 'error'))}: ${String(get(message, 'message'))}`),
      );
    } else waiter.done(get(message, 'result'));
  });
  return {
    send: (method, params) =>
      new Promise((done, failed) => {
        nextId += 1;
        pending.set(nextId, { done, failed });
        socket.send(JSON.stringify({ id: nextId, method, params }));
      }),
    close: () => socket.close(),
  };
}

function firefoxPrefs(scheme: Scheme): string {
  const prefs: Record<string, boolean | number | string> = {
    'browser.shell.checkDefaultBrowser': false,
    'browser.startup.homepage_override.mstone': 'ignore',
    'datareporting.policy.dataSubmissionEnabled': false,
    'toolkit.telemetry.reportingpolicy.firstRun': false,
    'app.update.disabledForTesting': true,
    'app.update.auto': false,
    // 0 = dark, 1 = light. The pages record matchMedia() as the ground truth.
    'layout.css.prefers-color-scheme.content-override': scheme === 'dark' ? 0 : 1,
    'ui.systemUsesDarkTheme': scheme === 'dark' ? 1 : 0,
    'ui.prefersReducedMotion': 0,
  };
  return Object.entries(prefs)
    .map(([name, value]) => `user_pref(${JSON.stringify(name)}, ${JSON.stringify(value)});\n`)
    .join('');
}

function waitForOutput(
  stream: NodeJS.ReadableStream,
  pattern: RegExp,
  ms: number,
): Promise<string> {
  return new Promise((done, failed) => {
    let output = '';
    const timer = setTimeout(
      () => failed(new Error(`Firefox did not start within ${ms} ms:\n${output}`)),
      ms,
    );
    stream.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      const match = pattern.exec(output);
      if (match?.[1]) {
        clearTimeout(timer);
        done(match[1]);
      }
    });
  });
}

async function launchFirefox(path: string, scheme: Scheme): Promise<Session> {
  const binary = path.endsWith('.app') ? join(path, 'Contents/MacOS/firefox') : path;
  if (!existsSync(binary)) throw new Error(`no Firefox binary at ${binary}`);
  const dir = mkdtempSync(join(tmpdir(), 'nz-floor-firefox-'));
  const profile = join(dir, 'profile');
  const home = join(dir, 'home');
  mkdirSync(profile);
  mkdirSync(home);
  writeFileSync(join(profile, 'user.js'), firefoxPrefs(scheme));
  // HOME and CFFIXED_USER_HOME keep Firefox out of the real ~/Library/Application Support/Firefox. On
  // macOS it reads that folder even with --profile, and stalls at startup when it cannot write there.
  const child = spawn(
    binary,
    ['--headless', '--no-remote', '--profile', profile, '--remote-debugging-port=0'],
    {
      env: { ...process.env, HOME: home, CFFIXED_USER_HOME: home },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  );
  const exited = new Promise<void>((done) => child.once('exit', () => done()));
  const cleanUp = async () => {
    const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(timer);
    // macOS gives the Library and Downloads folders it creates under the fake home a "deny delete" ACL.
    if (process.platform === 'darwin') spawnSync('chmod', ['-R', '-N', home]);
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      console.warn(`left a temporary Firefox profile at ${dir}`);
    }
  };
  try {
    const wsUrl = await waitForOutput(
      child.stderr,
      /WebDriver BiDi listening on (ws:\/\/\S+)/,
      60_000,
    );
    const bidi = await connectBidi(`${wsUrl}/session`);
    const created = await bidi.send('session.new', { capabilities: {} });
    const version = text(get(created, 'capabilities', 'browserVersion'), 'browserVersion');
    const tree = await bidi.send('browsingContext.getTree', {});
    const contexts = get(tree, 'contexts');
    const context = text(
      Array.isArray(contexts) ? get(contexts[0], 'context') : undefined,
      'browsing context',
    );
    return {
      version,
      driver: 'WebDriver BiDi (Node WebSocket), headless',
      read: async (url) => {
        await bidi.send('browsingContext.navigate', { context, url, wait: 'complete' });
        const evaluated = await bidi.send('script.evaluate', {
          expression: readResult,
          target: { context },
          awaitPromise: true,
        });
        if (get(evaluated, 'type') === 'exception') {
          throw new Error(String(get(evaluated, 'exceptionDetails', 'text')));
        }
        return parseResult(text(get(evaluated, 'result', 'value'), 'page result'));
      },
      screenshot: async () => {
        const shot = await bidi.send('browsingContext.captureScreenshot', { context });
        return Buffer.from(text(get(shot, 'data'), 'screenshot'), 'base64');
      },
      close: async () => {
        await bidi.send('browser.close', {}).catch(() => undefined);
        bidi.close();
        await cleanUp();
      },
    };
  } catch (error) {
    child.kill();
    await cleanUp();
    throw error;
  }
}

// ---------- Chromium and WebKit through Playwright ----------

interface PwPage {
  goto(url: string): Promise<unknown>;
  evaluate(expression: string): Promise<unknown>;
  screenshot(): Promise<Buffer>;
}
interface PwBrowser {
  version(): string;
  newContext(options: {
    colorScheme: Scheme;
    reducedMotion: 'no-preference';
  }): Promise<{ newPage(): Promise<PwPage> }>;
  close(): Promise<void>;
}
interface PwBrowserType {
  launch(): Promise<PwBrowser>;
}
interface Playwright {
  chromium: PwBrowserType;
  webkit: PwBrowserType;
}

function isPlaywright(value: unknown): value is Playwright {
  return isRecord(value) && isRecord(value['chromium']) && isRecord(value['webkit']);
}

function loadPlaywright(): Playwright {
  const loaded: unknown = createRequire(import.meta.url)('playwright');
  if (isPlaywright(loaded)) return loaded;
  throw new Error('playwright did not load (run `pnpm install` at the repo root)');
}

async function launchPlaywright(name: 'chromium' | 'webkit', scheme: Scheme): Promise<Session> {
  const browser = await loadPlaywright()[name].launch();
  const context = await browser.newContext({ colorScheme: scheme, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  return {
    version: browser.version(),
    driver: 'Playwright 1.64.0 (emulated prefers-color-scheme), headless',
    read: async (url) => {
      await page.goto(url);
      return parseResult(text(await page.evaluate(readResult), 'page result'));
    },
    screenshot: () => page.screenshot(),
    close: () => browser.close(),
  };
}

// ---------- Mobile Safari on the iOS Simulator ----------

function simctl(...args: string[]): string {
  const done = spawnSync('xcrun', ['simctl', ...args], { encoding: 'utf8' });
  if (done.error) throw new Error(`xcrun simctl ${args[0] ?? ''}: ${done.error.message}`);
  if (done.status !== 0) {
    throw new Error(`xcrun simctl ${args.join(' ')} exited ${done.status}: ${done.stderr.trim()}`);
  }
  return done.stdout;
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

interface Simulator {
  udid: string;
  label: string;
}
let simulator: Simulator | undefined;

// Creates and boots a throwaway device; deleteSimulator() removes it whatever happens to the run.
function createSimulator(runtime: string, deviceType: string): Simulator {
  const runtimes = get(JSON.parse(simctl('list', 'runtimes', '--json')), 'runtimes');
  const found = Array.isArray(runtimes)
    ? runtimes.find((r) => get(r, 'identifier') === runtime)
    : undefined;
  if (!found || get(found, 'isAvailable') === false) {
    throw new Error(`no available simulator runtime ${runtime} (see xcrun simctl list runtimes)`);
  }
  const version = String(get(found, 'version'));
  const build = String(get(found, 'buildversion'));
  const udid = simctl('create', `nz-floor-${version}`, deviceType, runtime).trim();
  simulator = { udid, label: `${deviceType}, iOS ${version} (${build}) Simulator` };
  console.log(`created simulator ${udid} (${simulator.label})`);
  simctl('bootstatus', udid, '-b');
  return simulator;
}

function deleteSimulator(): void {
  if (!simulator) return;
  const { udid } = simulator;
  simulator = undefined;
  spawnSync('xcrun', ['simctl', 'shutdown', udid]);
  const deleted = spawnSync('xcrun', ['simctl', 'delete', udid]);
  if (deleted.status === 0) console.log(`deleted simulator ${udid}`);
  else console.warn(`could not delete simulator ${udid}: xcrun simctl delete ${udid}`);
}

// Results posted by pages opened in the simulator, matched by the nz= nonce in their URL.
const waiting = new Map<string, (body: string) => void>();
let nonce = 0;

function takePosted(body: string, query: URLSearchParams): void {
  const deliver = waiting.get(query.get('nz') ?? '');
  if (!deliver) throw new Error(`nobody is waiting for nz=${query.get('nz') ?? '(none)'}`);
  deliver(body);
}

function openAndWait(udid: string, url: string, ms: number): Promise<PageResult> {
  nonce += 1;
  const id = `${Date.now().toString(36)}-${nonce}`;
  const full = `${url}${url.includes('?') ? '&' : '?'}report&calibrate&nz=${id}`;
  return new Promise<PageResult>((done, failed) => {
    const timer = setTimeout(() => {
      waiting.delete(id);
      failed(new Error(`no result from ${full} within ${ms / 1000} s`));
    }, ms);
    waiting.set(id, (body) => {
      clearTimeout(timer);
      waiting.delete(id);
      try {
        done(parseResult(body));
      } catch (error) {
        failed(error instanceof Error ? error : new Error(String(error)));
      }
    });
    try {
      simctl('openurl', udid, full);
    } catch (error) {
      clearTimeout(timer);
      waiting.delete(id);
      failed(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

async function launchIosSim(scheme: Scheme): Promise<Session> {
  const sim = simulator ?? createSimulator(iosRuntime, iosDeviceType);
  simctl('ui', sim.udid, 'appearance', scheme);
  const session: Session = {
    version: '',
    driver: `xcrun simctl openurl on ${sim.label}; the page posts its result back; simctl io screenshot`,
    read: async (url) => {
      let result = await openAndWait(sim.udid, url, 90_000);
      // The first page after an appearance change can race it: give it one more go.
      if (result.osScheme !== scheme) {
        await sleep(2000);
        result = await openAndWait(sim.udid, url, 90_000);
      }
      if (result.reducedMotion)
        throw new Error('the simulator reports prefers-reduced-motion: reduce');
      const seen = /Version\/([\d.]+) Mobile\/\S+ Safari\//.exec(result.userAgent)?.[1];
      if (!seen) throw new Error(`not Mobile Safari: ${result.userAgent}`);
      session.version ||= seen;
      return result;
    },
    screenshot: async () => {
      // Lets Safari finish the tab-opening animation before the whole screen is captured.
      await sleep(1500);
      const dir = mkdtempSync(join(tmpdir(), 'nz-floor-sim-'));
      try {
        const file = join(dir, 'screen.png');
        simctl('io', sim.udid, 'screenshot', '--type=png', file);
        return readFileSync(file);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    close: async () => undefined,
  };
  return session;
}

// ---------- main ----------

interface PaintProbe {
  group: string;
  id: string;
  expected: string;
  x: number;
  y: number;
}

function isPaintProbe(value: unknown): value is PaintProbe {
  return isRecord(value) && typeof value['x'] === 'number' && typeof value['y'] === 'number';
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function isBox(value: unknown): value is Box {
  return (
    isRecord(value) && ['x', 'y', 'width', 'height'].every((k) => typeof value[k] === 'number')
  );
}

// Where the viewport's (0, 0) is in the screenshot. A browser's own screenshot is the viewport, so it is
// (0, 0); a whole-device screenshot is aligned on the green ?calibrate square the page reports in meta.
function viewportOrigin(image: Image, result: PageResult, ratio: number): [number, number] {
  const marker = result.meta['calibration'];
  if (!isBox(marker)) return [0, 0];
  let left = Infinity;
  let top = Infinity;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const [r, g, b] = pixel(image, x, y);
      if (g > 220 && r < 60 && b < 60) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  const size = [right - left + 1, bottom - top + 1];
  const want = [marker.width * ratio, marker.height * ratio];
  if (right < 0 || size.some((s, i) => Math.abs(s - (want[i] ?? 0)) > 2)) {
    throw new Error(
      `calibration square not found in the screenshot (found ${size.join('x')} px, expected ${want.join('x')})`,
    );
  }
  const origin: [number, number] = [left - marker.x * ratio, top - marker.y * ratio];
  result.meta['screenshotViewportOrigin'] = origin;
  return origin;
}

// Adds a "painted" check for every probe the page listed: the pixel at its centre, red = L, blue = D.
async function samplePaint(session: Session, result: PageResult): Promise<void> {
  const probes = result.meta['paintProbes'];
  if (!Array.isArray(probes)) return;
  const image = decodePng(await session.screenshot());
  const ratio =
    typeof result.meta['devicePixelRatio'] === 'number' ? result.meta['devicePixelRatio'] : 1;
  const [dx, dy] = viewportOrigin(image, result, ratio);
  for (const probe of probes.filter(isPaintProbe)) {
    const [r, g, b] = pixel(image, dx + probe.x * ratio, dy + probe.y * ratio);
    const got =
      r > 200 && g < 80 && b < 80
        ? 'L'
        : b > 200 && r < 80 && g < 80
          ? 'D'
          : `rgb(${r}, ${g}, ${b})`;
    const status = got === probe.expected ? 'pass' : 'fail';
    result.checks.push({
      group: probe.group,
      id: probe.id,
      status,
      observed: got,
      expected: probe.expected,
      note: null,
    });
    result.summary[status] += 1;
  }
  delete result.meta['paintProbes'];
}

/** Meta a page measures from timing, which varies run to run; it stays in the --raw output only. */
const TIMING_META = new Set(['animationFramesIn300ms']);

function compact(result: PageResult): Record<string, unknown> {
  const passedByGroup: Record<string, number> = {};
  for (const c of result.checks) {
    if (c.status === 'pass') passedByGroup[c.group] = (passedByGroup[c.group] ?? 0) + 1;
  }
  const { checks, ...rest } = result;
  const meta = Object.entries(result.meta).filter(([key]) => !TIMING_META.has(key));
  return {
    ...rest,
    meta: Object.fromEntries(meta),
    notPassed: checks.filter((c) => c.status !== 'pass'),
    passedByGroup,
  };
}

const { values } = parseArgs({
  options: {
    firefox: { type: 'string' },
    engines: { type: 'string', default: 'firefox,chromium,webkit' },
    tokens: { type: 'string' },
    results: { type: 'string' },
    raw: { type: 'string' },
    serve: { type: 'boolean', default: false },
    'react-css': { type: 'string' },
    pages: { type: 'string' },
    'ios-sim': { type: 'boolean', default: false },
    'ios-runtime': { type: 'string', default: 'com.apple.CoreSimulator.SimRuntime.iOS-17-5' },
    'ios-device-type': { type: 'string', default: 'iPhone 15' },
    port: { type: 'string', default: '0' },
    host: { type: 'string', default: '127.0.0.1' },
  },
});

const firefoxPath = values.firefox ?? process.env['NZ_FLOOR_FIREFOX'];
const iosRuntime = values['ios-runtime'];
const iosDeviceType = values['ios-device-type'];
const engines = values['ios-sim'] ? ['mobile-safari'] : values.engines.split(',');
const tokensFile = values.tokens ? resolve(values.tokens) : undefined;
const outDir = values.results ? resolve(values.results) : resultsDir;
const rawDir = values.raw;
const reactCssDir = values['react-css'] ? resolve(values['react-css']) : undefined;
const only = values.pages?.split(',').map((name) => name.trim());
const selected = Object.entries(pages).filter(
  ([name]) => only === undefined || only.includes(name),
);
if (only !== undefined && selected.length !== only.length) {
  throw new Error(
    `--pages: unknown page in ${values.pages ?? ''}; pages are ${Object.keys(pages).join(', ')}`,
  );
}

// One browser and one page at a time: they share the loopback server, and timing checks need the machine.
async function inSequence<T>(items: readonly T[], step: (item: T) => Promise<void>): Promise<void> {
  await items.reduce<Promise<void>>(
    (previous, item) => previous.then(() => step(item)),
    Promise.resolve(),
  );
}

function launch(engine: string, scheme: Scheme): Promise<Session> {
  if (engine === 'chromium' || engine === 'webkit') return launchPlaywright(engine, scheme);
  if (engine === 'mobile-safari') return launchIosSim(scheme);
  if (engine !== 'firefox') throw new Error(`unknown engine ${engine}`);
  if (!firefoxPath)
    throw new Error('pass --firefox <Firefox.app> or set NZ_FLOOR_FIREFOX (see RESULTS.md)');
  return launchFirefox(firefoxPath, scheme);
}

// Runs every page in both OS schemes and writes <results>/<engine>-<version>.json. Returns true on any failure.
async function runEngine(engine: string, origin: string): Promise<boolean> {
  const summaries: Record<string, unknown> = {};
  const raw: Record<string, PageResult> = {};
  const run = {
    engine,
    version: '',
    driver: '',
    runAt: new Date().toISOString(),
    // the file served as plan-tokens.css, relative to the repo root
    tokens: relative(
      join(import.meta.dirname, '..', '..'),
      tokensFile ?? join(pagesDir, 'plan-tokens.css'),
    ),
    pages: summaries,
  };
  let failed = false;
  await inSequence(schemes, async (scheme) => {
    const session = await launch(engine, scheme);
    run.version = session.version;
    run.driver = session.driver;
    try {
      await inSequence(selected, async ([page, path]) => {
        const result = await session.read(`${origin}/${path}`);
        await samplePaint(session, result);
        if (result.osScheme !== scheme)
          throw new Error(`asked for OS ${scheme}, the page saw ${result.osScheme}`);
        run.version = session.version;
        raw[`${page}.${scheme}`] = result;
        summaries[`${page}.${scheme}`] = compact(result);
        const { pass, fail, info } = result.summary;
        failed ||= fail > 0;
        console.log(
          `${engine} ${run.version} | ${page} | OS ${scheme} | pass ${pass} fail ${fail} info ${info}`,
        );
        for (const c of result.checks.filter((check) => check.status === 'fail')) {
          console.log(
            `  FAIL ${c.group} | ${c.id}: ${JSON.stringify(c.observed)} (expected ${JSON.stringify(c.expected)})`,
          );
        }
      });
    } finally {
      await session.close();
    }
  });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${engine}-${run.version}.json`), `${JSON.stringify(run, null, 2)}\n`);
  if (rawDir) {
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(
      join(rawDir, `${engine}-${run.version}.json`),
      `${JSON.stringify(raw, null, 2)}\n`,
    );
  }
  return failed;
}

const onResult: ResultHandler | undefined = values.serve
  ? (body) => console.log(`saved ${saveManualResult(body)}`)
  : engines.includes('mobile-safari')
    ? takePosted
    : undefined;
const server = await serve(values.host, Number(values.port), tokensFile, onResult, reactCssDir);
if (values.serve) {
  console.log(
    `Serving ${pagesDir} at ${server.origin}/ (listening on ${values.host}; Ctrl-C to stop)`,
  );
} else {
  let failed = false;
  // A signal must not leave a booted simulator behind (128 + the signal number).
  for (const [signal, code] of [
    ['SIGINT', 130],
    ['SIGTERM', 143],
    ['SIGHUP', 129],
  ] as const) {
    process.once(signal, () => {
      deleteSimulator();
      process.exit(code);
    });
  }
  try {
    await inSequence(engines, async (engine) => {
      try {
        failed = (await runEngine(engine, server.origin)) || failed;
      } catch (error) {
        failed = true;
        console.error(
          `${engine}: not run: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  } finally {
    deleteSimulator();
    server.close();
  }
  process.exitCode = failed ? 1 : 0;
}
