// The token a11y gate (plan §15.1, §15.4): WCAG maths, the contrast matrix on the built CSS and its
// CONTRAST.md golden, and the drift, redundancy and expiry checks on edited copies of src/.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { check, measure, readPairs, readSources, renderMatrix, shown } from '../build/a11y.ts';
import { contrast, evaluate, parseColor } from '../build/contrast.ts';

const PACKAGE = fileURLToPath(new URL('..', import.meta.url));
const TZ = join(PACKAGE, 'node_modules/@terrazzo/cli/bin/cli.js');
const TODAY = new Date('2026-10-14T12:00:00Z');

let outDir = '';
let css = '';
const copies: string[] = [];

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), 'nz-tokens-a11y-'));
  const result = spawnSync(process.execPath, [TZ, 'build', '-c', 'build/terrazzo.config.ts'], {
    cwd: PACKAGE,
    encoding: 'utf8',
    env: { ...process.env, NZ_TOKENS_OUT_DIR: outDir },
  });
  if (result.status !== 0) throw new Error(`tz build failed:\n${result.stdout}${result.stderr}`);
  css = readFileSync(join(outDir, 'tokens.css'), 'utf8');
}, 60_000);

afterAll(() => {
  for (const dir of [outDir, ...copies]) rmSync(dir, { recursive: true, force: true });
});

/** A copy of src/ with `edit` applied to one JSON file, checked against the real build. */
type Edit = (json: any) => void;

/** WCAG ratio of two CSS colours, as the matrix shows it. */
const ratio = (a: string, b: string): string => shown(contrast(parseColor(a), parseColor(b)));

function checkEdited(file: string, edit: Edit, today = TODAY) {
  const src = mkdtempSync(join(tmpdir(), 'nz-tokens-src-'));
  copies.push(src);
  cpSync(join(PACKAGE, 'src'), src, { recursive: true });
  const path = join(src, file);
  const json: unknown = JSON.parse(readFileSync(path, 'utf8'));
  edit(json);
  writeFileSync(path, JSON.stringify(json));
  return check(css, { today, src, pairsFile: join(src, 'code-owned/a11y/contrast-pairs.json') });
}

describe('WCAG maths (ported from docs/research/phase2/scripts/contrast)', () => {
  test('reproduces the plan ratios', () => {
    expect(ratio('#000', '#fff')).toBe('21.00');
    expect(ratio('#747c73', '#eef0ec')).toBe('3.75'); // text/tertiary n500 on n100 (3.76, rounded)
    expect(ratio('#828a81', '#eef0ec')).toBe('3.10'); // border/control n450 on n100
    expect(ratio('#ffffff', '#b93a23')).toBe('5.68'); // white on red/600 (5.69, rounded)
  });

  test('composites a translucent foreground over its background', () => {
    const halo = contrast(parseColor('rgb(46 131 88 / 0.28)'), parseColor('#ffffff'));
    expect(halo).toBeGreaterThan(1.4);
    expect(halo).toBeLessThan(1.5);
  });

  test('resolves var() and light-dark() per scheme', () => {
    const variables = new Map([
      ['--a', 'light-dark(var(--b), var(--c))'],
      ['--b', '#111111'],
      ['--c', 'light-dark(#222222, #333333)'],
    ]);
    expect(evaluate('var(--a)', 'light', variables)).toBe('#111111');
    expect(evaluate('var(--a)', 'dark', variables)).toBe('#333333');
    expect(evaluate('var(--missing, red)', 'dark', variables)).toBe('red');
  });
});

describe('the contrast matrix on the built tokens.css', () => {
  test('every checked pair passes in light and dark, and no override or proposal is stale', () => {
    const report = check(css, { today: TODAY });
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    const checked = report.results.filter((r) => r.threshold !== undefined);
    expect(checked.length).toBe(58);
    expect(report.sources.overrides).toHaveLength(14);
    expect(report.sources.proposals).toHaveLength(19);
  });

  test('CONTRAST.md is the current matrix (pnpm tokens:contrast rewrites it)', () => {
    expect(readFileSync(join(PACKAGE, 'CONTRAST.md'), 'utf8')).toBe(
      renderMatrix(check(css, { today: TODAY })),
    );
  });

  test('without the overrides, the plan §15.2 failures come back', () => {
    const pairs = readPairs();
    const figma = {
      '--nz-text-tertiary': 'var(--nz-p-neutral-500)',
      '--nz-text-critical': 'light-dark(var(--nz-p-red-600), var(--nz-p-red-500))',
      '--nz-icon-warning': 'var(--nz-p-amber-500)',
    };
    const failing = (scheme: 'light' | 'dark') =>
      measure(css, pairs, scheme, figma)
        .filter((r) => !r.pass)
        .map((r) => r.fg);
    expect(failing('light')).toEqual(['text-tertiary', 'icon-warning', 'chart-warning']);
    expect(failing('dark')).toEqual(['text-tertiary', 'text-critical']);
  });

  test('a pair that misses its threshold fails the check', () => {
    const weak = css.replace(
      '--nz-text-tertiary: light-dark(var(--nz-p-neutral-600), var(--nz-p-neutral-400));',
      '--nz-text-tertiary: light-dark(var(--nz-p-neutral-500), var(--nz-p-neutral-400));',
    );
    expect(weak).not.toBe(css);
    expect(check(weak, { today: TODAY }).errors).toEqual([
      'light text-tertiary (text, needs 4.5:1): bg-canvas 4.00, bg-subtle 4.15, bg-surface 4.30, bg-surface-raised 4.30, bg-hover 4.00, bg-muted 3.75',
    ]);
  });
});

describe('override and proposal checks (plan §15.4 CI rules 2–4)', () => {
  test('every override names the Figma variable and value it replaces', () => {
    const sources = readSources();
    for (const o of sources.overrides) {
      const figma = sources.figmaVariables.get(
        `color/${o.scheme}.tokens.json#${o.figmaVariableId}`,
      );
      expect(figma?.id).toBe(o.id);
      expect(figma?.value).toEqual(o.figmaValueAtOverride);
      expect(o.figmaVariable).toMatch(/^Grove Color\/[a-z-]+\/[a-z-]+ \((Light|Dark)\)$/);
    }
  });

  test('drift: Figma changed the overridden variable', () => {
    const report = checkEdited('figma-owned/color/dark.tokens.json', (json) => {
      json.color.text.critical.$value = '{color.p.red.600}';
    });
    expect(report.errors).toContain(
      'dark override color.text.critical: Figma changed this token ("{color.p.red.500}" → "{color.p.red.600}"); re-evaluate the override',
    );
  });

  test('redundancy: Figma adopted the value, or a contrast override no longer needs to exist', () => {
    const adopted = checkEdited('figma-owned/color/light.tokens.json', (json) => {
      json.color.text.secondary.$value = '{color.p.neutral.700}';
    });
    expect(adopted.errors).toContain(
      'light override color.text.secondary: Figma now has this value; delete the override',
    );

    const passes = checkEdited('code-owned/a11y/dark.overrides.tokens.json', (json) => {
      const meta = json.color.icon.critical.$extensions['app.nizivo.override'];
      meta.kind = 'contrast';
    });
    expect(passes.errors).toContain(
      "dark override color.icon.critical: Figma's value passes on its own; delete the override",
    );
  });

  test('redundancy: Figma now defines a proposed variable', () => {
    const report = checkEdited('figma-owned/color/light.tokens.json', (json) => {
      json.color.bg.surface.$extensions['dev.nizivo.figma'].name = 'bg/scrim';
    });
    expect(report.errors).toContain(
      'proposal color.bg.scrim: Figma now defines bg/scrim; delete the proposal',
    );
  });

  test('expiry: warns 14 days ahead and fails after the date', () => {
    const soon = check(css, { today: new Date('2027-01-20T09:00:00Z') });
    expect(soon.errors).toEqual([]);
    expect(soon.warnings).toContain(
      'light override color.text.tertiary expires on 2027-01-31 (11 days)',
    );
    const late = check(css, { today: new Date('2027-02-01T09:00:00Z') });
    expect(late.errors).toContain(
      'light override color.text.tertiary expired on 2027-01-31; renew it with both owners or remove it',
    );
    expect(late.errors).toContain(
      'proposal color.bg.scrim expired on 2027-01-31; renew it with both owners or remove it',
    );
  });

  test.each([
    ['expires', (meta: Record<string, unknown>) => delete meta.expires],
    ['issue', (meta: Record<string, unknown>) => delete meta.issue],
    ['an issue that is not a URL', (meta: Record<string, unknown>) => (meta.issue = '#12')],
  ])('metadata: an override without %s is rejected', (_, edit) => {
    const report = checkEdited('code-owned/a11y/light.overrides.tokens.json', (json) => {
      edit(json.color.text.tertiary.$extensions['app.nizivo.override']);
    });
    expect(
      report.errors.some((e) =>
        e.startsWith(
          'a11y/light.overrides.tokens.json: color.text.tertiary: app.nizivo.override needs',
        ),
      ),
    ).toBe(true);
  });
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The token ids the given src/ files define together. */
function ids(...files: string[]): string[] {
  const out = new Set<string>();
  const walk = (node: Record<string, unknown>, path: string[]): void => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') || !isObject(child)) continue;
      if ('$value' in child) out.add([...path, key].join('.'));
      else walk(child, [...path, key]);
    }
  };
  for (const file of files) {
    const json: unknown = JSON.parse(readFileSync(join(PACKAGE, 'src', file), 'utf8'));
    if (isObject(json)) walk(json, []);
  }
  return [...out].toSorted();
}

describe('code-owned sources', () => {
  test('both themes and both motion modes define the same tokens', () => {
    const theme = (mode: string) =>
      ids(
        `figma-owned/color/${mode}.tokens.json`,
        `code-owned/color/${mode}.tokens.json`,
        `code-owned/proposals/color/${mode}.tokens.json`,
      );
    expect(theme('dark')).toEqual(theme('light'));
    expect(
      ids('code-owned/a11y/light.overrides.tokens.json').every((id) => theme('light').includes(id)),
    ).toBe(true);
    expect(
      ids('code-owned/a11y/dark.overrides.tokens.json').every((id) => theme('dark').includes(id)),
    ).toBe(true);
    expect(
      ids(
        'figma-owned/motion/reduced.tokens.json',
        'code-owned/motion/reduced.tokens.json',
        'code-owned/proposals/motion/reduced.tokens.json',
      ),
    ).toEqual(
      ids(
        'figma-owned/motion/default.tokens.json',
        'code-owned/motion-derived.tokens.json',
        'code-owned/proposals/motion/default.tokens.json',
      ),
    );
  });
});
