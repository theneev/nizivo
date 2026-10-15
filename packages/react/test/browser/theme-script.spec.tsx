// ThemeScript in a real browser (ARCHITECTURE.md §7.4): the shipped script runs from <head> of a
// frame as the HTML parser meets it, against the browser's own localStorage and navigator. A body
// script records <html>'s attributes when <body> starts, i.e. before anything in it can paint. The
// sandboxed case is the real thing the unit test stands in for: in a frame with an opaque origin,
// reading `localStorage` throws a SecurityError.
import { afterEach, describe, expect, test } from 'vitest';
import { themeScript } from '../../src/theme-script/theme-script';

interface Seen {
  theme: string | null;
  platform: string | null;
  /** Whether reading localStorage threw in the frame (the sandbox control). */
  storageThrew: boolean;
  /** An error the page saw, if any. */
  error: string | null;
}

const RECORD = `<script>
  var d = document.documentElement, threw = false;
  try { localStorage; } catch (e) { threw = true; }
  parent.postMessage({ nzThemeScript: { theme: d.getAttribute('data-nz-theme'),
    platform: d.getAttribute('data-nz-platform'), storageThrew: threw, error: window.nzError || null } }, '*');
</script>`;

/** Loads a frame whose <head> runs the shipped script; resolves with what <body> saw first. */
async function frame(html: string, sandbox?: string): Promise<Seen> {
  const iframe = document.createElement('iframe');
  if (sandbox !== undefined) iframe.setAttribute('sandbox', sandbox);
  const seen = new Promise<Seen>((resolve) => {
    const onMessage = (event: MessageEvent<unknown>): void => {
      if (event.source !== iframe.contentWindow) return;
      const data: unknown = event.data;
      if (typeof data !== 'object' || data === null) return;
      const posted: unknown = Reflect.get(data, 'nzThemeScript');
      if (typeof posted !== 'object' || posted === null) return;
      const text = (key: string): string | null => {
        const value: unknown = Reflect.get(posted, key);
        return typeof value === 'string' ? value : null;
      };
      window.removeEventListener('message', onMessage);
      resolve({
        theme: text('theme'),
        platform: text('platform'),
        storageThrew: Reflect.get(posted, 'storageThrew') === true,
        error: text('error'),
      });
    };
    window.addEventListener('message', onMessage);
  });
  iframe.srcdoc = `<!doctype html>${html.replace(
    '<head>',
    `<head><script>window.onerror=function(m){window.nzError=String(m)}</script><script>${themeScript}</script>`,
  )}`;
  document.body.append(iframe);
  return seen;
}

const page = (htmlAttributes = ''): string =>
  `<html${htmlAttributes}><head></head><body>${RECORD}</body></html>`;

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

describe('ThemeScript in Chromium', () => {
  test.each(['light', 'dark', 'system'])(
    'a stored %s is on <html> before <body> starts, over the server default',
    async (value) => {
      localStorage.setItem('nz-theme', value);
      const seen = await frame(page(' data-nz-theme="system"'));
      expect(seen).toMatchObject({ theme: value, error: null });
      expect(seen.platform).toMatch(/^(apple|other)$/);
    },
  );

  test('nothing stored keeps the server default, or no attribute (light)', async () => {
    expect(await frame(page(' data-nz-theme="system"'))).toMatchObject({ theme: 'system' });
    expect(await frame(page())).toMatchObject({ theme: null, error: null });
  });

  test('an unknown stored value is ignored', async () => {
    localStorage.setItem('nz-theme', 'sepia');
    expect(await frame(page(' data-nz-theme="dark"'))).toMatchObject({ theme: 'dark' });
  });

  test('blocked storage (a sandboxed frame): no error, the theme stays, the platform is still set', async () => {
    localStorage.setItem('nz-theme', 'dark');
    const seen = await frame(page(' data-nz-theme="system"'), 'allow-scripts');
    // The control: reading localStorage does throw in this frame.
    expect(seen.storageThrew).toBe(true);
    expect(seen).toMatchObject({ theme: 'system', error: null });
    expect(seen.platform).toMatch(/^(apple|other)$/);
  });

  test('the platform matches this browser', async () => {
    const nav = navigator as Navigator & { userAgentData?: { platform: string } };
    const platform = nav.userAgentData?.platform ?? nav.platform;
    const seen = await frame(page());
    expect(seen.platform).toBe(/mac|iphone|ipad|ipod/i.test(platform) ? 'apple' : 'other');
  });
});
