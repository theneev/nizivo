// The week 1 Terrazzo dry run (plan §7.1): the real export validates through the resolver, and the
// emitted names and scoped blocks are what the plan expects. Runs the pinned CLI as `tz` would.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const PACKAGE = fileURLToPath(new URL('..', import.meta.url));
const TZ = join(PACKAGE, 'node_modules/@terrazzo/cli/bin/cli.js');
const CONFIG = 'build/terrazzo.config.ts';

function tz(args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [TZ, ...args], {
    cwd: PACKAGE,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

/** Custom properties declared between `header` and the next top-level block. */
function declared(css: string, header: string): string[] {
  const start = css.indexOf(`${header} {`);
  if (start === -1) throw new Error(`no block ${header}`);
  const next = css.slice(start + header.length).search(/\n(?:@media|\[|:root)/);
  const body = next === -1 ? css.slice(start) : css.slice(start, start + header.length + next);
  return [...body.matchAll(/(--nz-[a-z0-9-]+):/g)].map((match) => match[1] ?? '');
}

const SEMANTIC = /^--nz-(?:bg|text|border|icon|chart)-/;
const MOTION = /^--nz-(?:duration|easing|distance|scale|tilt|stagger|magnetic)-/;
const VIEWPORT = /^--nz-(?:grid|layout|type|section)-/;

let outDir = '';
let css = '';

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), 'nz-tz-dry-run-'));
  const build = tz(['build', '-c', CONFIG], { NZ_TOKENS_OUT_DIR: outDir });
  if (build.status !== 0) throw new Error(`tz build failed:\n${build.stdout}${build.stderr}`);
  css = readFileSync(join(outDir, 'tokens.css'), 'utf8');
}, 60_000);

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
});

describe('Terrazzo 2.8.0 dry run', () => {
  test('tz check passes on the resolver (every set and context)', () => {
    const check = tz(['check', '-c', CONFIG]);
    expect(check.stderr).toBe('');
    expect(check.status).toBe(0);
  }, 60_000);

  test('a text style emits a font shorthand plus one variable per sub-value', () => {
    expect(css).toContain(
      '--nz-font-label-m: var(--nz-font-label-m-font-weight) var(--nz-font-label-m-font-size)/var(--nz-font-label-m-line-height) var(--nz-font-label-m-font-family);',
    );
    const fonts = declared(css, ':root').filter((name) => name.startsWith('--nz-font-'));
    // 18 text styles, each a shorthand plus five sub-values; no font-style (normal is dropped).
    expect(fonts).toHaveLength(18 * 6);
    const styles = fonts.filter(
      (name) => !/-(font-family|font-size|font-weight|letter-spacing|line-height)$/.test(name),
    );
    expect(styles).toEqual([
      '--nz-font-body-l',
      '--nz-font-body-m',
      '--nz-font-body-m-strong',
      '--nz-font-display-l',
      '--nz-font-display-m',
      '--nz-font-heading-h1',
      '--nz-font-heading-h2',
      '--nz-font-heading-h3',
      '--nz-font-heading-h4',
      '--nz-font-label-l',
      '--nz-font-label-m',
      '--nz-font-label-m-strong',
      '--nz-font-mono-m',
      '--nz-font-mono-m-strong',
      '--nz-font-numeric-display',
      '--nz-font-numeric-kpi',
      '--nz-font-numeric-l',
      '--nz-font-numeric-m',
    ]);
    for (const style of styles) {
      for (const sub of [
        'font-family',
        'font-size',
        'font-weight',
        'letter-spacing',
        'line-height',
      ]) {
        expect(fonts).toContain(`${style}-${sub}`);
      }
    }
    expect(css).toContain('--nz-font-label-m-font-size: 0.875rem;');
    expect(css).toContain('--nz-font-display-l-letter-spacing: -0.105rem;');
    expect(css).not.toMatch(/--nz-tracking-/);
  });

  test('colours drop the color group and layout.viewport is not emitted', () => {
    expect(css).not.toMatch(/--nz-color-/);
    expect(css).not.toMatch(/--nz-layout-viewport/);
    expect(css).toContain('--nz-bg-surface: var(--nz-p-neutral-0);');
    expect(css).toContain('--nz-elevation-1: 0px 1px 2px #1013110a, 0px 1px 1px #10131108;');
  });

  test('each scoped block re-declares only its own modifier tokens (S3a include recipe)', () => {
    const dark = declared(css, '[data-nz-theme="dark"]');
    expect(dark).toHaveLength(58);
    expect(dark.filter((name) => !SEMANTIC.test(name))).toEqual([]);

    for (const header of ['@media (prefers-reduced-motion: reduce)', '[data-nz-motion="reduce"]']) {
      const reduced = declared(css, header);
      expect(reduced).toHaveLength(20);
      expect(reduced.filter((name) => !MOTION.test(name))).toEqual([]);
    }
    for (const header of ['@media (--nz-sm)', '@media (--nz-lg)']) {
      const viewport = declared(css, header);
      expect(viewport).toHaveLength(9);
      expect(viewport.filter((name) => !VIEWPORT.test(name))).toEqual([]);
    }
  });
});
