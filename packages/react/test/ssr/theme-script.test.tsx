// ThemeScript (ARCHITECTURE.md §7.4, §8.3 scope attributes): a server-safe inline script that, before
// first paint, restores the reader's saved theme (data-nz-theme from localStorage `nz-theme`) and
// sets data-nz-platform, so Kbd shows ⌘ spellings on Apple devices without a flash.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { serverRender, underReactServer, withDispatcher } from '../helpers/rsc';
import { ThemeScript, themeScript } from '../../src/theme-script/theme-script';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

describe('server-safe', () => {
  test("no 'use client' module, only react, only react-server React", () => {
    const { modules, externals } = graph(SRC, 'src/theme-script/index.ts', { types: true });
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });

  test('the entry and its example render under react-server', async () => {
    const { loaded, react } = await underReactServer(() =>
      Promise.all([
        import('../../src/theme-script/index'),
        import('../../src/theme-script/theme-script.example'),
      ]),
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).toSorted((a, b) => (a < b ? -1 : 1))).toEqual([
      'ThemeScript',
      'themeScript',
    ]);
    const tree = JSON.stringify(
      withDispatcher(react, () => serverRender(examples.ThemeScriptExample())),
    );
    expect(tree).toContain('"type":"script"');
    expect(tree).toContain('"data-slot":"kbd"');
  });
});

describe('markup', () => {
  test('one inline script with the source as written, and the nonce when given', () => {
    expect(renderToString(<ThemeScript />)).toBe(`<script>${themeScript}</script>`);
    expect(renderToString(<ThemeScript nonce="abc" />)).toBe(
      `<script nonce="abc">${themeScript}</script>`,
    );
  });

  test('it stays small (§7.4: ~250 B per half; both halves 379 B)', () => {
    expect(new TextEncoder().encode(themeScript).byteLength).toBeLessThanOrEqual(400);
  });
});

interface Platform {
  userAgentData?: { platform: string };
  platform?: string;
}

interface Page {
  /** The browser's `navigator`, or a function whose throw stands for a getter that throws. */
  navigator?: Platform | (() => never);
  /** What `localStorage` holds under each key, or a function that throws when storage is read. */
  storage?: Record<string, string> | (() => never);
  /** Attributes the server rendered on `<html>`. */
  html?: Record<string, string>;
}

/**
 * Runs the shipped script against stand-ins for `document`, `navigator` and `localStorage`, and
 * returns the attributes it leaves on `<html>`. A thrower stands for a sandboxed frame, where reading
 * the `localStorage` global itself throws a SecurityError (not just `getItem`).
 */
function run({ navigator = {}, storage = {}, html = {} }: Page): Record<string, string> {
  const attributes = new Map(Object.entries(html));
  const documentElement = {
    hasAttribute: (name: string) => attributes.has(name),
    setAttribute: (name: string, value: string) => attributes.set(name, value),
  };
  const scope = {
    document: { documentElement },
    get navigator(): unknown {
      if (typeof navigator !== 'function') return navigator;
      return {
        get platform(): never {
          return navigator();
        },
      };
    },
    get localStorage(): unknown {
      if (typeof storage === 'function') return storage();
      return {
        getItem: (key: string) => (Object.hasOwn(storage, key) ? storage[key] : null),
      };
    },
  };
  // The script is a closed expression over `document`, `navigator` and `localStorage`, nothing else;
  // `with` resolves those three names on the scope, so a getter can throw as a browser's would.
  // oxlint-disable-next-line typescript/no-implied-eval -- running the shipped source is the test
  const script = new Function('scope', `with (scope) { ${themeScript} }`);
  script(scope);
  return Object.fromEntries(attributes);
}

const thrower = (): never => {
  throw new Error('blocked');
};

const platformOf = (navigator: Platform): string | undefined =>
  run({ navigator })['data-nz-platform'];

describe('the platform half', () => {
  test.each([
    [{ userAgentData: { platform: 'macOS' }, platform: 'MacIntel' }, 'apple'],
    [{ userAgentData: { platform: 'Windows' }, platform: 'Win32' }, 'other'],
    [{ userAgentData: { platform: 'Linux' } }, 'other'],
    [{ userAgentData: { platform: 'Android' } }, 'other'],
    [{ userAgentData: { platform: 'Chrome OS' } }, 'other'],
    [{ platform: 'MacIntel' }, 'apple'],
    [{ platform: 'iPhone' }, 'apple'],
    [{ platform: 'iPad' }, 'apple'],
    [{ platform: 'iPod touch' }, 'apple'],
    [{ platform: 'Linux x86_64' }, 'other'],
    [{ platform: '' }, 'other'],
    [{}, 'other'],
  ] satisfies [Platform, string][])('%j → %s', (navigator, expected) => {
    expect(platformOf(navigator)).toBe(expected);
  });

  test('a value already on <html> (from the server or a test) is kept', () => {
    expect(
      run({
        navigator: { platform: 'MacIntel' },
        html: { 'data-nz-platform': 'other' },
      }),
    ).toEqual({ 'data-nz-platform': 'other' });
  });

  test('it never throws into the page, and the theme half still runs', () => {
    let left: Record<string, string> = {};
    expect(() => {
      left = run({ navigator: thrower, storage: { 'nz-theme': 'dark' } });
    }).not.toThrow();
    expect(left).toEqual({ 'data-nz-theme': 'dark' });
  });
});

const themeOf = (page: Page): string | undefined => run(page)['data-nz-theme'];

describe('the theme half', () => {
  test.each(['light', 'dark', 'system'])('a stored %s is set on <html> as is', (value) => {
    expect(themeOf({ storage: { 'nz-theme': value } })).toBe(value);
  });

  test('the stored choice replaces the server default (the fixture pattern, §7.4)', () => {
    const html = { 'data-nz-theme': 'system' };
    expect(themeOf({ html, storage: { 'nz-theme': 'dark' } })).toBe('dark');
    expect(
      themeOf({
        html: { 'data-nz-theme': 'dark' },
        storage: { 'nz-theme': 'system' },
      }),
    ).toBe('system');
  });

  test.each([
    ['nothing stored', {}],
    ['another key', { theme: 'dark' }],
    ['an unknown value', { 'nz-theme': 'blue' }],
    ['a different case', { 'nz-theme': 'Dark' }],
    ['a JSON-quoted value', { 'nz-theme': '"dark"' }],
    ['a value with spaces', { 'nz-theme': ' dark' }],
    ['an empty value', { 'nz-theme': '' }],
  ] satisfies [string, Record<string, string>][])(
    '%s leaves the server value alone, or no attribute when it sent none',
    (_, storage) => {
      expect(themeOf({ storage, html: { 'data-nz-theme': 'system' } })).toBe('system');
      expect(themeOf({ storage })).toBeUndefined();
    },
  );

  test('blocked storage (reading localStorage throws) leaves the theme alone, and the platform half still runs', () => {
    let left: Record<string, string> = {};
    expect(() => {
      left = run({
        navigator: { platform: 'MacIntel' },
        storage: () => {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
        html: { 'data-nz-theme': 'system' },
      });
    }).not.toThrow();
    expect(left).toEqual({
      'data-nz-theme': 'system',
      'data-nz-platform': 'apple',
    });
  });

  test('getItem that throws is caught the same way', () => {
    const left = run({
      navigator: { platform: 'Win32' },
      storage: {
        get 'nz-theme'(): string {
          throw new Error('quota');
        },
      },
    });
    expect(left).toEqual({ 'data-nz-platform': 'other' });
  });
});

describe('CSP hash', () => {
  // Published in the themeScript JSDoc and the Next guide: a strict-CSP app allows the script by
  // this hash, so changing the script must update both and the changelog. Week 6 added the theme
  // half (a minor in 0.x); the platform-only script was
  // sha256-HZHIu/4RWssbJrteyX51NbvdyR6ZSlZlY4BPl3yXw+I= (257 bytes).
  test('the script hashes to the published value', async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(themeScript));
    const hash = btoa(String.fromCharCode(...new Uint8Array(digest)));
    expect(`sha256-${hash}`).toBe('sha256-nA1HUQWDdDUFqqoxWbjzCzcYSjzWLEe0pwDdRCMGqOw=');
  });
});
