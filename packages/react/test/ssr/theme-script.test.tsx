// ThemeScript (ARCHITECTURE.md §7.4, §8.3 scope attributes): a server-safe inline script that sets
// data-nz-platform before first paint, so Kbd shows ⌘ spellings on Apple devices without a flash.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import { serverRender, underReactServer, withDispatcher } from '../helpers/rsc';
import { ThemeScript, themeScript } from '../../src/theme-script/theme-script';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('server-safe', () => {
  test("no 'use client' module, only react, only react-server React", () => {
    const { modules, externals } = graph(SRC, 'src/theme-script/index.ts');
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

  test('it stays small (§7.4: ~250 B)', () => {
    expect(new TextEncoder().encode(themeScript).byteLength).toBeLessThanOrEqual(300);
  });
});

interface Platform {
  userAgentData?: { platform: string };
  platform?: string;
}

/** Runs the script against a stand-in `<html>` and `navigator`; returns the attribute it leaves. */
function run(navigator: Platform | (() => never), existing?: string): string | undefined {
  const attributes = new Map<string, string>();
  if (existing !== undefined) attributes.set('data-nz-platform', existing);
  const documentElement = {
    hasAttribute: (name: string) => attributes.has(name),
    setAttribute: (name: string, value: string) => attributes.set(name, value),
  };
  const nav =
    typeof navigator === 'function'
      ? {
          get platform(): never {
            return navigator();
          },
        }
      : navigator;
  // The script is a closed expression over `document` and `navigator`, nothing else.
  // oxlint-disable-next-line typescript/no-implied-eval -- running the shipped source is the test
  const script = new Function('document', 'navigator', themeScript);
  script({ documentElement }, nav);
  return attributes.get('data-nz-platform');
}

describe('the detection rule', () => {
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
    expect(run(navigator)).toBe(expected);
  });

  test('a value already on <html> (from the server or a test) is kept', () => {
    expect(run({ platform: 'MacIntel' }, 'other')).toBe('other');
  });

  test('it never throws into the page', () => {
    expect(() =>
      run(() => {
        throw new Error('blocked');
      }),
    ).not.toThrow();
  });
});

describe('CSP hash', () => {
  // Published in the themeScript JSDoc and the Next guide: a strict-CSP app allows the script by
  // this hash, so changing the script is a breaking change that must update both and the changelog.
  test('the script hashes to the published value', async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(themeScript));
    const hash = btoa(String.fromCharCode(...new Uint8Array(digest)));
    expect(`sha256-${hash}`).toBe('sha256-HZHIu/4RWssbJrteyX51NbvdyR6ZSlZlY4BPl3yXw+I=');
  });
});
