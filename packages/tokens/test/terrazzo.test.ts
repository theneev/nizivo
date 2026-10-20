// The Terrazzo build (plan §7.1–§7.5) on the real export: the resolver validates, the emitted names
// are the plan's, and each scoped block holds only its own modifier's tokens. Runs the pinned CLI as
// `pnpm tokens:build` would. test/build.test.ts pins the bytes.
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

/** Custom properties declared directly in the block that `header` opens. */
function declared(css: string, header: string): string[] {
  const start = css.indexOf(`${header} {`);
  if (start === -1) throw new Error(`no block ${header}`);
  const indent = /[ ]*$/.exec(css.slice(0, start))?.[0] ?? '';
  const end = css.indexOf(`\n${indent}}`, start);
  return [...css.slice(start, end).matchAll(/^\s*(--nz-[a-z0-9-]+):/gm)].map(
    (match) => match[1] ?? '',
  );
}

const SEMANTIC = /^--nz-(?:bg|text|border|icon|chart)-(?!width-)/;
const MOTION = /^--nz-(?:duration|easing|distance|scale|tilt|stagger|magnetic)-/;
const VIEWPORT = /^--nz-(?:grid|layout|type|section)-/;

let outDir = '';
let css = '';

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), 'nz-tz-build-'));
  const build = tz(['build', '-c', CONFIG], { NZ_TOKENS_OUT_DIR: outDir });
  if (build.status !== 0) throw new Error(`tz build failed:\n${build.stdout}${build.stderr}`);
  css = readFileSync(join(outDir, 'tokens.css'), 'utf8');
}, 60_000);

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
});

describe('Terrazzo 2.8.0 token build', () => {
  test('tz check passes on the resolver (every set and context, code-owned sources included)', () => {
    const check = tz(['check', '-c', CONFIG]);
    expect(check.stderr).toBe('');
    expect(check.status).toBe(0);
  }, 60_000);

  test('a text style emits a font shorthand of var() sub-values, a family alias and em tracking', () => {
    expect(css).toContain(
      '--nz-font-label-m: var(--nz-font-label-m-font-weight) var(--nz-font-label-m-font-size)/var(--nz-font-label-m-line-height) var(--nz-font-label-m-font-family);',
    );
    const fonts = declared(css, ':root').filter((name) => name.startsWith('--nz-font-'));
    const styles = fonts.filter(
      (name) =>
        !/-(font-family|font-size|font-weight|line-height)$/.test(name) &&
        !name.startsWith('--nz-font-family-'),
    );
    // 18 Figma text styles plus the Body/S and Label/S proposals (decision 8c).
    expect(styles).toEqual([
      '--nz-font-body-l',
      '--nz-font-body-m',
      '--nz-font-body-m-strong',
      '--nz-font-body-s',
      '--nz-font-display-l',
      '--nz-font-display-m',
      '--nz-font-heading-h1',
      '--nz-font-heading-h2',
      '--nz-font-heading-h3',
      '--nz-font-heading-h4',
      '--nz-font-label-l',
      '--nz-font-label-m',
      '--nz-font-label-m-strong',
      '--nz-font-label-s',
      '--nz-font-mono-m',
      '--nz-font-mono-m-strong',
      '--nz-font-numeric-display',
      '--nz-font-numeric-kpi',
      '--nz-font-numeric-l',
      '--nz-font-numeric-m',
    ]);
    // Each style: the shorthand, four sub-values and its tracking; plus the two family tokens.
    expect(fonts).toHaveLength(styles.length * 5 + 2);
    for (const style of styles) {
      for (const sub of ['font-family', 'font-size', 'font-weight', 'line-height']) {
        expect(fonts).toContain(`${style}-${sub}`);
      }
      expect(css).toContain(`${style.replace('--nz-font-', '--nz-tracking-')}: `);
    }
    expect(css).not.toMatch(/-letter-spacing:/);
    expect(css).toContain('--nz-font-label-m-font-family: var(--nz-font-family-sans);');
    expect(css).toContain('--nz-font-mono-m-font-family: var(--nz-font-family-mono);');
    expect(css).toContain('--nz-font-label-s-font-size: 0.75rem;');
    expect(css).toContain('--nz-tracking-display-l: -0.03em;');
    expect(css).toContain('--nz-tracking-label-m: 0em;');
    expect(css).toContain(
      '--nz-font-family-sans: var(--font-geist-sans, "Geist"), ui-sans-serif, system-ui, sans-serif;',
    );
    expect(css).not.toMatch(/"Geist";/);
  });

  test('colours drop the color group and layout.viewport and breakpoints are not variables', () => {
    expect(css).not.toMatch(/--nz-color-/);
    expect(css).not.toMatch(/--nz-layout-viewport/);
    expect(css).not.toMatch(/--nz-breakpoint-/);
    expect(css).toContain(
      '--nz-bg-surface: light-dark(var(--nz-p-neutral-0), var(--nz-p-neutral-900));',
    );
    expect(css).toContain('--nz-text-on-accent: var(--nz-p-green-950);');
    // Figma's effect layers in CSS paint order: its last layer (Elevation/1's 1 px blur) is on top.
    expect(css).toContain(
      '--nz-elevation-1: 0 0 0 1px var(--nz-elevation-ring), 0 1px 1px 0 light-dark(rgb(16 19 17 / 0.03), rgb(0 0 0 / 0.18)), 0 1px 2px 0 light-dark(rgb(16 19 17 / 0.04), rgb(0 0 0 / 0.24));',
    );
  });

  test('the theme is one light-dark() declaration per semantic colour, with no dark block', () => {
    const root = declared(css, ':root');
    expect(new Set(root).size).toBe(root.length);
    expect(css).not.toContain('[data-nz-theme="dark"] {\n    --nz-bg');
    const semantic = root.filter((name) => SEMANTIC.test(name));
    // 75 Figma semantic colours (the text/accent proposal was removed before 0.2.0, M42 item 14).
    expect(semantic).toHaveLength(75);
    expect(root).not.toContain('--nz-text-accent');
    for (const name of declared(css, '[data-nz-theme="dark"]'))
      expect(name).toBe('--nz-scheme-inverse');
  });

  test('each scoped block re-declares only its own modifier tokens (S3a recipe, sets left out)', () => {
    expect(declared(css, '[data-nz-motion="reduce"]')).toEqual(
      declared(css, '@media (prefers-reduced-motion: reduce)'),
    );
    for (const header of ['@media (prefers-reduced-motion: reduce)', '[data-nz-motion="reduce"]']) {
      const reduced = declared(css, header);
      // 24 Figma motion tokens (duration/spin among them since 2026-10-18) and the 2 derived
      // spring durations.
      expect(reduced).toHaveLength(26);
      expect(reduced.filter((name) => !MOTION.test(name))).toEqual([]);
      expect(reduced).toContain('--nz-duration-spin');
    }
    for (const header of ['@media (width >= 40rem)', '@media (width >= 80rem)']) {
      const viewport = declared(css, header);
      expect(viewport).toHaveLength(9);
      expect(viewport.filter((name) => !VIEWPORT.test(name))).toEqual([]);
    }
  });
});
