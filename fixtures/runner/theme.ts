// No theme flash (ARCHITECTURE.md §7.4, §18.1, §21.1 exit criterion 2), once per build, on one page.
//
// An init script samples every frame from the very first one: a requestAnimationFrame callback runs
// right before the browser paints, so what it reads is what that frame shows. Per frame it records
// <html>'s data-nz-theme and computed color-scheme, and <body>'s computed background (each fixture
// paints body with --nz-bg-canvas). Before <body> exists, the canvas is the root's used color-scheme.
// The paint timing entries (first-paint, first-contentful-paint) are recorded beside the frames.
//
// Cases, each in a fresh context:
// - osDark:  the OS is dark and <html data-nz-theme="system">: every frame is dark, with no script.
// - stored:  the OS is light and a stored choice says dark; ThemeScript in the fixture's <head>
//            applies it before first paint: every frame is dark.
// - static:  the OS is light and the server sends <html data-nz-theme="dark"> (the HTML is rewritten
//            on the way in): every frame is dark.
// - light:   the OS is light and nothing is stored: every frame is light (the probe tells them apart).
// - late:    negative control. The OS is light, and a script at the end of <body> sets dark 300 ms
//            later, as a theme switch that runs after hydration would: the probe must catch light
//            frames before the dark ones, or it proves nothing.
// The light case also counts light-dark() in every stylesheet the page loads against the packed
// tokens.css (a bundler that lowers them breaks nested scopes), and paints nested scopes and inverse
// surfaces to check they resolve.
//
// A dev server that applies its stylesheets from JavaScript (Vite's) paints frames before any
// stylesheet: <html> has no color-scheme ("normal") and <body> no background, so the browser's
// default light canvas shows whatever the theme. With `unstyled: 'report'` those frames are listed
// apart (`unstyled`) instead of failing the case; every frame once a stylesheet applies must still
// be right, and the late control must still be caught.
/* oxlint-disable no-await-in-loop -- the cases share one browser and run one after another */
import { readFileSync } from 'node:fs';
import type { Browser, BrowserContext, Page } from 'playwright';
import { getText } from './http.ts';

interface Frame {
  t: number;
  theme: string | null;
  scheme: string;
  bg: string | null;
  dark: boolean;
}

interface CaseResult {
  frames: number;
  /**
   * `unstyled: 'report'` only: frames painted before any stylesheet applied (no color-scheme on
   * <html>, no body background) where the expected theme is dark, as `t:scheme/bg`.
   */
  unstyled?: string[];
  /** Frames whose scheme was not the expected one, as `t:scheme/bg`. */
  wrong: string[];
  firstPaint: number | null;
  firstContentfulPaint: number | null;
  /** The theme on <html> in the first and last frame. */
  firstTheme: string | null;
  lastTheme: string | null;
  /** A pixel of the final screenshot (top left), as a cross-check of the probe's last frame. */
  pixel: string;
  pixelDark: boolean;
  ok: boolean;
}

export interface ThemeFlashResult {
  path: string;
  cases: Record<string, CaseResult>;
  lightDark: { packed: number; loaded: number; stylesheets: number; ok: boolean };
  nested: Record<string, string | boolean>;
  ok: boolean;
}

/** Runs in every frame from document start; the frames go to `window.__nzFrames`. */
const PROBE = `(() => {
  if (window.top !== window) return;
  const frames = [];
  const paints = {};
  Object.defineProperty(window, '__nzFrames', { value: frames });
  Object.defineProperty(window, '__nzPaints', { value: paints });
  const luminance = (colour) => {
    const m = colour.match(/[\\d.]+/g);
    if (!m) return null;
    const [r, g, b, a = 1] = m.map(Number);
    if (a === 0) return null;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };
  const sample = (t) => {
    const root = document.documentElement;
    const scheme = root ? getComputedStyle(root).colorScheme : '';
    const osDark = matchMedia('(prefers-color-scheme: dark)').matches;
    const words = scheme.split(' ');
    const schemeDark = words.includes('dark') && (!words.includes('light') || osDark);
    const bg = document.body ? getComputedStyle(document.body).backgroundColor : null;
    const l = bg === null ? null : luminance(bg);
    frames.push({
      t: Math.round(t),
      theme: root ? root.getAttribute('data-nz-theme') : null,
      scheme,
      bg,
      dark: l === null ? schemeDark : l < 0.5,
    });
    if (frames.length < 90) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) paints[entry.name] = Math.round(entry.startTime);
    }).observe({ type: 'paint', buffered: true });
  } catch {}
})();`;

const LATE =
  '<script>setTimeout(function(){document.documentElement.setAttribute("data-nz-theme","dark")},300)</script>';

function toFrames(value: unknown): Frame[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const get = (key: string): unknown => Reflect.get(entry, key);
    const theme = get('theme');
    const bg = get('bg');
    return [
      {
        t: Number(get('t')),
        theme: typeof theme === 'string' ? theme : null,
        scheme: String(get('scheme')),
        bg: typeof bg === 'string' ? bg : null,
        dark: get('dark') === true,
      },
    ];
  });
}

function toPaints(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null) return {};
  return Object.fromEntries(Object.entries(value).map(([name, time]) => [name, Number(time)]));
}

/** Reads one pixel of a PNG screenshot, decoded by the browser. */
async function pixelOf(page: Page, png: Buffer): Promise<[number, number, number]> {
  return page.evaluate(async (base64) => {
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    if (context === null) return [0, 0, 0] as [number, number, number];
    context.drawImage(bitmap, 0, 0);
    const [r = 0, g = 0, b = 0] = context.getImageData(2, 2, 1, 1).data;
    return [r, g, b] as [number, number, number];
  }, png.toString('base64'));
}

async function rewriteDocument(
  context: BrowserContext,
  url: string,
  transform: (html: string) => string,
): Promise<void> {
  await context.route(url, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: transform(await response.text()) });
  });
}

interface Case {
  scheme: 'light' | 'dark';
  stored?: 'dark';
  rewrite?: (html: string) => string;
  /** Every frame dark (true), every frame light (false), or light frames then dark ('late'). */
  expect: boolean | 'late';
}

const CASES: Record<string, Case> = {
  osDark: { scheme: 'dark', expect: true },
  stored: { scheme: 'light', stored: 'dark', expect: true },
  static: {
    scheme: 'light',
    rewrite: (html) => html.replace(/(<html[^>]*data-nz-theme=")system"/, '$1dark"'),
    expect: true,
  },
  light: { scheme: 'light', expect: false },
  late: {
    scheme: 'light',
    rewrite: (html) => html.replace('</body>', `${LATE}</body>`),
    expect: 'late',
  },
};

/** A frame painted before any stylesheet applied: no color-scheme on <html>, no body background. */
const unstyledFrame = (f: Frame): boolean =>
  f.scheme === 'normal' && (f.bg === null || /^rgba\(.*, 0\)$|^transparent$/.test(f.bg));

const count = (css: string): number => css.split('light-dark(').length - 1;
const isDark = (l: number): boolean => l >= 0 && l < 0.5;
const isLight = (l: number): boolean => l >= 0.5;

/** light-dark() in every stylesheet the page loaded, against the packed tokens.css. */
async function countLightDark(
  page: Page,
  packedTokens: string,
): Promise<ThemeFlashResult['lightDark']> {
  const packed = count(readFileSync(packedTokens, 'utf8'));
  const hrefs = await page.evaluate(() =>
    [...document.styleSheets].flatMap((sheet) => (sheet.href === null ? [] : [sheet.href])),
  );
  const inline = await page.evaluate(() =>
    [...document.querySelectorAll('style')].map((style) => style.textContent ?? '').join('\n'),
  );
  let loaded = count(inline);
  for (const href of hrefs) loaded += count(await getText(href));
  return { packed, loaded, stylesheets: hrefs.length, ok: packed > 0 && loaded >= packed };
}

/**
 * Nested scopes on a light page: a dark scope, a light scope inside it, an inverse surface inside the
 * dark scope (light) and one on the page (dark). A lowered light-dark() gets the inner ones wrong.
 */
async function checkNested(page: Page): Promise<Record<string, string | boolean>> {
  const shades = await page.evaluate(() => {
    const host = document.createElement('div');
    const fill = 'background: var(--nz-bg-canvas); padding: 4px';
    host.innerHTML = `<div id="nz-dark" data-nz-theme="dark" style="${fill}">
      <div id="nz-dark-light" data-nz-theme="light" style="${fill}">a</div>
      <div id="nz-dark-inverse" data-nz-scheme="inverse" style="${fill}">b</div>
    </div><div id="nz-inverse" data-nz-scheme="inverse" style="${fill}">c</div>`;
    document.body.append(host);
    const [dark = -1, darkLight = -1, darkInverse = -1, inverse = -1] = [
      'nz-dark',
      'nz-dark-light',
      'nz-dark-inverse',
      'nz-inverse',
    ].map((id) => {
      const element = document.getElementById(id);
      const m =
        element === null ? null : getComputedStyle(element).backgroundColor.match(/[\d.]+/g);
      if (m === null) return -1;
      const [r = 0, g = 0, b = 0] = m.map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    });
    host.remove();
    return { dark, darkLight, darkInverse, inverse };
  });
  return {
    dark: shades.dark.toFixed(3),
    darkLight: shades.darkLight.toFixed(3),
    darkInverse: shades.darkInverse.toFixed(3),
    inverse: shades.inverse.toFixed(3),
    ok:
      isDark(shades.dark) &&
      isLight(shades.darkLight) &&
      isLight(shades.darkInverse) &&
      isDark(shades.inverse),
  };
}

export async function checkThemeFlash(
  browser: Browser,
  base: string,
  path: string,
  packedTokens: string,
  options: { unstyled?: 'fail' | 'report' } = {},
): Promise<ThemeFlashResult> {
  const report = options.unstyled === 'report';
  const cases: Record<string, CaseResult> = {};
  let lightDark: ThemeFlashResult['lightDark'] = {
    packed: 0,
    loaded: 0,
    stylesheets: 0,
    ok: false,
  };
  let nested: Record<string, string | boolean> = { ok: false };
  for (const [name, spec] of Object.entries(CASES)) {
    const context = await browser.newContext({ colorScheme: spec.scheme });
    try {
      await context.addInitScript(PROBE);
      if (spec.stored !== undefined) {
        await context.addInitScript(
          `try { localStorage.setItem('nz-theme', ${JSON.stringify(spec.stored)}); } catch {}`,
        );
      }
      const url = base + path;
      if (spec.rewrite !== undefined) await rewriteDocument(context, url, spec.rewrite);
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
      // Let the probe run its 90 frames (about 1.5 s), past the late case's 300 ms.
      await page.waitForFunction(
        () => {
          const recorded: unknown = Reflect.get(window, '__nzFrames');
          return Array.isArray(recorded) && recorded.length === 90;
        },
        undefined,
        { timeout: 10_000 },
      );
      const frames = toFrames(await page.evaluate(() => Reflect.get(window, '__nzFrames')));
      const paints = toPaints(await page.evaluate(() => Reflect.get(window, '__nzPaints')));
      const [r, g, b] = await pixelOf(
        page,
        await page.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } }),
      );
      const pixelDark = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
      const describe = (f: Frame) => `${f.t}:${f.scheme}/${f.bg ?? 'no body'}`;
      let wrong: string[];
      let ok: boolean;
      let unstyled: string[] | undefined;
      if (spec.expect === 'late') {
        // Caught: light frames first, then dark ones, and the last frame dark.
        const firstDark = frames.findIndex((f) => f.dark);
        wrong = frames.slice(0, Math.max(firstDark, 0)).map(describe);
        ok = firstDark > 0 && frames.slice(firstDark).every((f) => f.dark) && pixelDark;
      } else {
        const off = frames.filter((f) => f.dark !== spec.expect);
        if (report) unstyled = off.filter(unstyledFrame).map(describe);
        wrong = (report ? off.filter((f) => !unstyledFrame(f)) : off).map(describe);
        ok =
          frames.length > 0 &&
          wrong.length === 0 &&
          // at least one frame was styled and right, so the case checked something
          frames.some((f) => !unstyledFrame(f) && f.dark === spec.expect) &&
          pixelDark === spec.expect;
      }
      cases[name] = {
        frames: frames.length,
        ...(unstyled === undefined ? {} : { unstyled }),
        wrong: wrong.slice(0, 5),
        firstPaint: paints['first-paint'] ?? null,
        firstContentfulPaint: paints['first-contentful-paint'] ?? null,
        firstTheme: frames[0]?.theme ?? null,
        lastTheme: frames.at(-1)?.theme ?? null,
        pixel: `rgb(${r}, ${g}, ${b})`,
        pixelDark,
        ok,
      };
      if (name === 'light') {
        lightDark = await countLightDark(page, packedTokens);
        nested = await checkNested(page);
      }
    } finally {
      await context.close();
    }
  }
  return {
    path,
    cases,
    lightDark,
    nested,
    ok: Object.values(cases).every((c) => c.ok) && lightDark.ok && nested['ok'] === true,
  };
}
