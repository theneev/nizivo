// dist/styles.css, the convenience sheet (ARCHITECTURE.md §5.2), as the build wrote it: the canonical
// layer statement first, then a byte-identical copy of the tokens.css @nizivo/tokens publishes at the
// same version, then dist/css/base.css and every stable component's dist/css/<name>.css by name.
// Run after a build (`check:dist`).
import { readdirSync, readFileSync } from 'node:fs';
import { layerStatement, tokensFile } from '@nizivo/stylelint-config/contract';
import { describe, expect, test } from 'vitest';
import tokensManifest from '../../../tokens/package.json' with { type: 'json' };
import manifest from '../../package.json' with { type: 'json' };

const DIST = new URL('../../dist/', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, DIST), 'utf8');

// A missing build must fail, never pass as skipped.
const styles = read('styles.css');
const tokensPath = tokensFile('./tokens.css');
if (tokensPath === undefined)
  throw new Error('@nizivo/tokens lists no ./tokens.css: build it first');
const tokens = readFileSync(tokensPath, 'utf8');
const LAYERS = layerStatement();

/** The unstable components (src/unstable/<name>): their sheets ship alone, outside styles.css. */
const UNSTABLE = new Set(
  // folders only: an unstable component is a folder of its own
  readdirSync(new URL('../../src/unstable/', import.meta.url)).filter(
    (name) => !name.includes('.'),
  ),
);

/** Every stable component sheet in dist/css (styles.ts leaves the unstable ones out). */
const built = new Set(
  readdirSync(new URL('css/', DIST))
    .filter((file) => file.endsWith('.css'))
    .map((file) => file.slice(0, -'.css'.length)),
);
const components = [...built].filter((name) => name !== 'base' && !UNSTABLE.has(name)).toSorted();

describe('dist/styles.css', () => {
  test('line 1 is the canonical layer statement', () => {
    expect(styles.slice(0, LAYERS.length + 1)).toBe(`${LAYERS}\n`);
  });

  test('it carries a byte-identical copy of tokens.css, right after line 1', () => {
    // Decoded text compares as bytes only for valid UTF-8, which has no replacement character.
    expect(tokens).not.toContain('\uFFFD');
    const start = LAYERS.length + 1;
    const copy = new TextEncoder().encode(styles.slice(start, start + tokens.length));
    expect(copy).toEqual(new TextEncoder().encode(tokens));
    expect(tokens).toContain(`--nz-css-version: "${tokensManifest.version}"`);
    expect(tokensManifest.version).toBe(manifest.version);
  });

  test('it is exactly the statement, tokens.css, base.css and every component sheet by name', () => {
    const parts = [
      LAYERS,
      tokens,
      read('css/base.css'),
      ...components.map((n) => read(`css/${n}.css`)),
    ];
    expect(styles).toBe(parts.map((part) => (part.endsWith('\n') ? part : `${part}\n`)).join(''));
    expect(components.length).toBeGreaterThanOrEqual(36);
  });
});
