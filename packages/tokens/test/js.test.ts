// tokens.json and the js-refs "." entry (plan §5.2, §7.1, §15.4; TOKENS-JSON.md). The goldens are in
// build.test.ts. This file checks that both agree with tokens.css, read back by a separate small
// cascade evaluator (not build/resolve.ts), that every reference names a declared public variable,
// and that the published types compile against a consumer file.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const PACKAGE = fileURLToPath(new URL('..', import.meta.url));
const TZ = join(PACKAGE, 'node_modules/@terrazzo/cli/bin/cli.js');
const TSC = join(PACKAGE, 'node_modules/.bin/tsc');

interface ContextValue {
  value: string | Record<string, string>;
  provenance: string;
  aliasOf?: string;
}
interface Entry extends ContextValue {
  type: string;
  cssVariable: string | null;
  public: boolean;
  modes?: Record<string, Record<string, ContextValue>>;
  parts?: Record<string, string>;
  customMedia?: string;
}
interface TokensJson {
  format: number;
  prefix: string;
  modifiers: Record<string, { contexts: string[]; default: string }>;
  tokens: Record<string, Entry>;
}
interface Contract {
  customMedia: Record<string, { query: string }>;
  variables: Record<string, { token?: string; public: boolean; part?: string }>;
}

let dir = '';
let css = '';
let json: TokensJson;
let contract: Contract;
let refs: Record<string, unknown>;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'nz-tokens-js-'));
  const result = spawnSync(process.execPath, [TZ, 'build', '-c', 'build/terrazzo.config.ts'], {
    cwd: PACKAGE,
    encoding: 'utf8',
    env: { ...process.env, NZ_TOKENS_OUT_DIR: dir },
  });
  if (result.status !== 0) throw new Error(`tz build failed:\n${result.stdout}${result.stderr}`);
  css = readFileSync(join(dir, 'tokens.css'), 'utf8');
  json = JSON.parse(readFileSync(join(dir, 'tokens.json'), 'utf8'));
  contract = JSON.parse(readFileSync(join(dir, 'contract.json'), 'utf8'));
  refs = await import(pathToFileURL(join(dir, 'index.js')).href);
}, 60_000);

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

/** tokens.css's declarations per block, keyed by the selector path (`@layer nz.tokens > :root`). */
function blocks(text: string): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  const stack: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.endsWith('{')) stack.push(trimmed.slice(0, -1).trim());
    else if (trimmed === '}') stack.pop();
    else {
      const match = /^(--[a-z0-9-]+): (.*);$/.exec(trimmed);
      if (!match) continue;
      const path = stack.join(' > ');
      const block = out.get(path) ?? new Map<string, string>();
      block.set(match[1] ?? '', match[2] ?? '');
      out.set(path, block);
    }
  }
  return out;
}

const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

interface Cascade {
  declared: Map<string, string>;
  dark: boolean;
}

/** The cascade at :root of a page in one context, with the `light-dark()` side it picks. */
function cascade(context: string): Cascade {
  const all = blocks(css);
  const at = (path: string) => all.get(`@layer nz.tokens > ${path}`) ?? new Map<string, string>();
  const sm = '@media (width >= 40rem) > :root';
  const lg = '@media (width >= 80rem) > :root';
  const layers: Record<string, string[]> = {
    default: [],
    dark: ['[data-nz-theme="dark"]'],
    reduced: ['[data-nz-motion="reduce"]'],
    tablet: [sm],
    desktop: [sm, lg],
  };
  const extra = layers[context];
  if (!extra) throw new Error(`No cascade for ${context}`);
  const declared = new Map(at(':root'));
  for (const path of extra) {
    if (at(path).size === 0) throw new Error(`tokens.css has no ${path} block`);
    for (const [name, value] of at(path)) declared.set(name, value);
  }
  return { declared, dark: context === 'dark' };
}

const ARG = String.raw`(?:[^(),]|\([^()]*\))+`;
const LIGHT_DARK = new RegExp(String.raw`light-dark\((${ARG}),\s*(${ARG})\)`);
const VAR = /var\((--[a-z0-9-]+)(?:,\s*([^()]*))?\)/;

/** Substitutes `var()` innermost first, then picks each `light-dark()` side, until none is left. */
function evaluateCss(text: string, { declared, dark }: Cascade): string {
  let out = text;
  for (let i = 0; i < 1000; i++) {
    const v = VAR.exec(out);
    if (v) {
      const value = declared.get(v[1] ?? '') ?? v[2];
      if (value === undefined) throw new Error(`${v[1]} is not declared`);
      out = out.replace(v[0], value);
      continue;
    }
    const ld = LIGHT_DARK.exec(out);
    if (!ld) return out;
    out = out.replace(ld[0], (dark ? ld[2] : ld[1]) ?? '');
  }
  throw new Error(`Did not settle: ${text}`);
}

/** The context a modifier value selects in the cascade above. */
const CASCADE: Record<string, string> = {
  light: 'default',
  dark: 'dark',
  default: 'default',
  reduced: 'reduced',
  mobile: 'default',
  tablet: 'tablet',
  desktop: 'desktop',
};

describe('tokens.json', () => {
  test('lists every token once with the prefix, the format and the resolver modifiers', () => {
    expect(json.format).toBe(1);
    expect(json.prefix).toBe('nz');
    expect(json.modifiers).toEqual({
      theme: { contexts: ['light', 'dark'], default: 'light' },
      motion: { contexts: ['default', 'reduced'], default: 'default' },
      viewport: { contexts: ['mobile', 'tablet', 'desktop'], default: 'mobile' },
    });
    expect(Object.keys(json.tokens)).toHaveLength(245);
    const unemitted = Object.entries(json.tokens).filter(([, t]) => t.cssVariable === null);
    expect(unemitted.map(([id]) => id)).toEqual([
      'breakpoint.lg',
      'breakpoint.sm',
      'layout.viewport',
    ]);
  });

  test('every variable contract.json declares for a token is that token’s cssVariable or part', () => {
    const wrong: string[] = [];
    for (const [name, entry] of Object.entries(contract.variables)) {
      if (!entry.token) continue;
      const token = json.tokens[entry.token];
      const names = entry.part ? Object.values(token?.parts ?? {}) : [token?.cssVariable];
      if (!names.includes(name) || token?.public !== entry.public) wrong.push(name);
    }
    expect(wrong).toEqual([]);
  });

  test('every value, in every context, equals what tokens.css computes there', () => {
    let checked = 0;
    const wrong: { at: string; json: string | undefined; css: string }[] = [];
    const compare = (at: string, actual: string | undefined, variable: string, ctx: Cascade) => {
      const computed = evaluateCss(`var(${variable})`, ctx);
      if (actual !== computed) wrong.push({ at, json: actual, css: computed });
      checked++;
    };
    for (const [id, token] of Object.entries(json.tokens)) {
      if (!token.cssVariable) continue;
      for (const [modifier, { contexts }] of Object.entries(json.modifiers)) {
        for (const name of contexts) {
          const ctx = cascade(CASCADE[name] ?? '');
          const { value } = token.modes?.[modifier]?.[name] ?? token;
          if (typeof value === 'string') compare(`${id} (${name})`, value, token.cssVariable, ctx);
          else {
            compare(`${id}.font (${name})`, value['font'], token.cssVariable, ctx);
            for (const [part, variable] of Object.entries(token.parts ?? {})) {
              compare(`${id}.${part} (${name})`, value[part], variable, ctx);
            }
          }
        }
      }
    }
    expect(wrong).toEqual([]);
    // 222 single values (text/accent removed, M42 item 14) and 20 typography styles (shorthand and
    // five parts), in 7 contexts.
    expect(checked).toBe((222 + 20 * 6) * 7);
  });

  test('values are literals: no var(), no light-dark()', () => {
    const text = JSON.stringify(json.tokens);
    expect(text).not.toMatch(/var\(|light-dark\(/);
  });

  test('a mode lists only contexts that differ, and one modifier at most per token', () => {
    const wrong: string[] = [];
    for (const [id, token] of Object.entries(json.tokens)) {
      const modes = Object.entries(token.modes ?? {});
      if (modes.length > 1) wrong.push(`${id}: ${modes.length} modifiers`);
      const { value, provenance, aliasOf } = token;
      const first = JSON.stringify({ value, provenance, aliasOf });
      for (const [modifier, contexts] of modes) {
        if ((json.modifiers[modifier]?.default ?? '') in contexts)
          wrong.push(`${id}: default listed`);
        for (const [name, entry] of Object.entries(contexts)) {
          const same = JSON.stringify({ ...entry, aliasOf: entry.aliasOf }) === first;
          if (same) wrong.push(`${id}: ${name} equals the default`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  test('provenance follows the source markers, per context (plan §7.6, §15.4)', () => {
    const t = json.tokens;
    expect(t['color.bg.surface']?.provenance).toBe('figma');
    // Proposals Figma adopted on 2026-10-18 are Figma's now; the last one, text/accent, was removed
    // before 0.2.0 (M42 item 14), so no token is a proposal.
    expect(t['color.bg.scrim']?.provenance).toBe('figma');
    expect(t['color.p.neutral.450']?.provenance).toBe('figma');
    expect(t['color.text.accent']).toBeUndefined();
    expect(Object.values(t).filter((token) => token?.provenance === 'proposal')).toEqual([]);
    expect(t['font.family.sans']?.provenance).toBe('code-owned');
    expect(t['duration.spring']?.provenance).toBe('code-owned');
    // The former dark-only override: Figma holds red/400 itself now.
    expect(t['color.text.critical']?.provenance).toBe('figma');
    expect(t['color.text.critical']?.modes?.['theme']?.['dark']).toEqual({
      value: '#e47962',
      provenance: 'figma',
      aliasOf: 'color.p.red.400',
    });
    expect(t['duration.spin']?.provenance).toBe('figma');
    const counts: Record<string, number> = {};
    for (const token of Object.values(t)) {
      for (const entry of [token, ...Object.values(token.modes ?? {}).flatMap(Object.values)]) {
        counts[entry.provenance] = (counts[entry.provenance] ?? 0) + 1;
      }
    }
    // Figma adopted all 14 overrides on 2026-10-18 (CONTRAST.md); none is left in either theme.
    const overrides: string[] = [];
    for (const [id, token] of Object.entries(t)) {
      if (token.provenance === 'override') overrides.push(`${id} light`);
      for (const [name, entry] of Object.entries(token.modes?.['theme'] ?? {})) {
        if (entry.provenance === 'override') overrides.push(`${id} ${name}`);
      }
    }
    expect(overrides).toEqual([]);
    // and no proposal is left since text/accent was removed (M42 item 14)
    expect(Object.keys(counts).toSorted(compareStrings)).toEqual(['code-owned', 'figma']);
  });

  test('breakpoints carry their custom media, equal to custom-media.css', () => {
    const queries = Object.values(json.tokens)
      .filter((t) => t.customMedia)
      .map((t) => [t.customMedia, `(width >= ${JSON.stringify(t.value).slice(1, -1)})`]);
    expect(Object.fromEntries(queries)).toEqual(
      Object.fromEntries(
        Object.entries(contract.customMedia).map(([name, { query }]) => [name, query]),
      ),
    );
  });
});

/** `spring(m, k, c, v)` as the physics object the entry exports. */
function physics(figma = ''): Record<string, number | undefined> {
  const [mass, stiffness, damping, velocity] = (/spring\(([^)]*)\)/.exec(figma)?.[1] ?? '')
    .split(',')
    .map(Number);
  return { mass, stiffness, damping, velocity };
}

/** Every string in the refs, with its path. */
function strings(value: unknown, path: string): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => strings(item, `${path}.${key}`));
  }
  return [];
}

/** One exported group of the entry, as a plain record. */
function group(name: string): Record<string, unknown> {
  const value = refs[name];
  return typeof value === 'object' && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};
}

describe('the js-refs entry', () => {
  test('reads like the plan: color.bgSurface, space[0.5], font.labelM, typography parts', () => {
    expect(group('color')['bgSurface']).toBe('var(--nz-bg-surface)');
    expect(group('space')[0.5]).toBe('var(--nz-space-0-5)');
    expect(group('radius')['2xl']).toBe('var(--nz-radius-2xl)');
    expect(group('elevation')[3]).toBe('var(--nz-elevation-3)');
    expect(group('font')['labelM']).toBe('var(--nz-font-label-m)');
    expect(group('font')['familySans']).toBe('var(--nz-font-family-sans)');
    expect(group('typography')['labelM']).toEqual({
      fontFamily: 'var(--nz-font-label-m-font-family)',
      fontSize: 'var(--nz-font-label-m-font-size)',
      fontWeight: 'var(--nz-font-label-m-font-weight)',
      lineHeight: 'var(--nz-font-label-m-line-height)',
      letterSpacing: 'var(--nz-tracking-label-m)',
    });
  });

  test('every var() it holds names a variable tokens.css declares, and a public one', () => {
    const declared = new Set([...css.matchAll(/^\s*(--nz-[a-z0-9-]+):/gm)].map((m) => m[1]));
    const all = Object.entries(refs).flatMap(([name, value]) => strings(value, name));
    const named = all.flatMap(([path, value]) =>
      [...value.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => [path, m[1] ?? ''] as const),
    );
    expect(named.length).toBeGreaterThan(250);
    const wrong = named.filter(
      ([, name]) => !declared.has(name) || !contract.variables[name]?.public,
    );
    expect(wrong).toEqual([]);
  });

  test('every public token variable has exactly one reference', () => {
    const named = Object.entries(refs)
      .flatMap(([name, value]) => strings(value, name))
      .flatMap(([, value]) => [...value.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1] ?? ''));
    const expected = Object.entries(contract.variables)
      .filter(([, entry]) => entry.public && entry.token)
      .map(([name]) => name);
    expect(named.toSorted(compareStrings)).toEqual(expected.toSorted(compareStrings));
  });

  test('breakpoints equal the custom-media.css queries', () => {
    expect(refs['breakpoints']).toEqual({
      sm: contract.customMedia['--nz-sm']?.query,
      lg: contract.customMedia['--nz-lg']?.query,
    });
  });

  test('springs are the Figma spring() parameters pinned by @nizivo/tooling/spring (plan §13.1)', () => {
    const require = createRequire(import.meta.url);
    const golden: { springs: Record<string, { figma: string }> } = JSON.parse(
      readFileSync(
        join(require.resolve('@nizivo/tooling/package.json'), '../spring/spring.golden.json'),
        'utf8',
      ),
    );
    expect(refs['springs']).toEqual({
      spring: physics(golden.springs['easing/spring']?.figma),
      springSoft: physics(golden.springs['easing/spring-soft']?.figma),
    });
  });

  test('the module is constants only: no imports, no calls, no side effects', () => {
    const js = readFileSync(join(dir, 'index.js'), 'utf8');
    expect(js).not.toMatch(/\bimport\b|\brequire\(|\bObject\.|=>|\bfunction\b/);
    expect(js.split('\n').filter((l) => l.startsWith('export ')).length).toBe(
      Object.keys(refs).length,
    );
  });
});

describe('the published types', () => {
  test('a consumer file compiles, and the deliberate mistakes in it fail', () => {
    const consumer = mkdtempSync(join(tmpdir(), 'nz-tokens-types-'));
    try {
      for (const file of ['index.js', 'index.d.ts', 'tokens.json']) {
        cpSync(join(dir, file), join(consumer, file));
      }
      writeFileSync(
        join(consumer, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'es2022',
            module: 'preserve',
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            strict: true,
            exactOptionalPropertyTypes: true,
            noUncheckedIndexedAccess: true,
            noEmit: true,
            types: [],
          },
          files: ['consumer.ts'],
        }),
      );
      writeFileSync(
        join(consumer, 'consumer.ts'),
        `import {
  breakpoints,
  color,
  space,
  springs,
  type,
  typography,
  z,
  type CssVariable,
  type TokenId,
  type TokensJson,
} from './index.js';
import data from './tokens.json' with { type: 'json' };

export const surface: 'var(--nz-bg-surface)' = color.bgSurface;
export const half: 'var(--nz-space-0-5)' = space[0.5];
export const tracking: 'var(--nz-tracking-label-m)' = typography.labelM.letterSpacing;
export const sm: '(width >= 40rem)' = breakpoints.sm;
export const mass: 1 = springs.spring.mass;
export const h1: 'var(--nz-type-h1)' = type.h1;
export const overlay: 'var(--nz-z-overlay)' = z.overlay;
export const name: CssVariable = '--nz-bg-surface';
export const id: TokenId = 'color.p.green.700';
// A JSON import widens string literals (provenance), so consumers cast; the cast still checks overlap.
export const tokens = data as TokensJson;
export const dark = tokens.tokens['color.bg.surface'].modes?.['theme']?.['dark']?.value;

// @ts-expect-error primitives are private
export const primitive: CssVariable = '--nz-p-green-700';
// @ts-expect-error not a token
export const missing = color.bgNope;
// @ts-expect-error the refs are read-only
color.bgSurface = 'red';
// @ts-expect-error not a token id
export const wrongId: TokenId = 'color.bg.nope';
// @ts-expect-error not a provenance
export const wrongProvenance: TokensJson['tokens']['color.bg.surface']['provenance'] = 'figma-ish';
`,
      );
      const result = spawnSync(TSC, ['-p', consumer], { encoding: 'utf8' });
      expect(`${result.stdout}${result.stderr}`).toBe('');
      expect(result.status).toBe(0);
    } finally {
      rmSync(consumer, { recursive: true, force: true });
    }
  }, 60_000);
});
