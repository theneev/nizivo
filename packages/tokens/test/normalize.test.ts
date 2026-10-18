import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { RAW_DIR, isRecord } from '../scripts/figma/snapshot.ts';
import { FIGMA_OWNED_DIR } from '../scripts/normalize.ts';
import {
  diffOwned,
  figmaIds,
  normalize,
  readRaw,
  renderAll,
  type RawFile,
} from '../scripts/normalize/index.ts';
import { naturalCompare, walkTokens, type Group } from '../scripts/normalize/json.ts';

const RAW = readRaw(RAW_DIR);
const BASE = normalize(RAW);

/** The token at `id` (dot path) in output file `file`. */
function token(files: Map<string, Group>, file: string, id: string): Record<string, unknown> {
  let node: unknown = files.get(file);
  for (const segment of id.split('.')) node = isRecord(node) ? node[segment] : undefined;
  if (!isRecord(node) || !('$value' in node)) throw new Error(`no token ${id} in ${file}`);
  return node;
}

const tokenValue = (file: string, id: string): unknown => token(BASE.files, file, id).$value;
const tokenType = (file: string, id: string): unknown => token(BASE.files, file, id).$type;

const figma = (t: Record<string, unknown>): unknown =>
  isRecord(t.$extensions) ? t.$extensions['dev.nizivo.figma'] : undefined;

function countTokens(tree: Group | undefined): number {
  let count = 0;
  if (tree) walkTokens(tree, () => count++);
  return count;
}

/** Collection names as TokensBrücke writes them: in file paths, group keys and aliases. */
const COLLECTION_NAME = /Nizivo (Primitives|Color|Space|Motion|Responsive)\b/g;

/**
 * The raw export as it was before the Figma rename (plan §20.3): collections, styles, or both under
 * `Grove`. The committed export is the first one under the Nizivo names (2026-10-18).
 */
function groveNamed(raw: RawFile[], { collections = true, styles = true } = {}): RawFile[] {
  return raw.map(({ path, json }) => {
    const isStyle = path.endsWith('-styles.tokens.json');
    let text = JSON.stringify(json);
    if (collections) {
      text = text.replaceAll(COLLECTION_NAME, 'Grove $1').replaceAll('var(--nz-', 'var(--grove-');
    }
    if (styles && isStyle) text = text.replaceAll('"Nizivo":', '"Grove":');
    const renamedPath = collections ? path.replaceAll(COLLECTION_NAME, 'Grove $1') : path;
    return { path: renamedPath, json: JSON.parse(text) };
  });
}

/** The `Effect-styles` → `Nizivo` group of a raw style file, or undefined for another file. */
function nizivoEffects(file: RawFile): Record<string, unknown> | undefined {
  const styles = isRecord(file.json) ? file.json['Effect-styles'] : undefined;
  const nizivo = isRecord(styles) ? styles.Nizivo : undefined;
  return isRecord(nizivo) ? nizivo : undefined;
}

/** Applies `edit` to the `Nizivo Color` body of the given mode files of a cloned export. */
function editColor(modes: string[], edit: (body: Record<string, unknown>) => void): RawFile[] {
  return structuredClone(RAW).map((file) => {
    const body = isRecord(file.json) ? file.json['Nizivo Color'] : undefined;
    if (isRecord(body) && modes.some((mode) => file.path === `Nizivo Color/${mode}.tokens.json`)) {
      edit(body);
    }
    return file;
  });
}

function moveKey(group: unknown, from: string, to: string): void {
  if (!isRecord(group) || !(from in group)) throw new Error(`no ${from} to move`);
  group[to] = group[from];
  delete group[from];
}

/** Rebuilds every object with its keys in a different (seeded) order; arrays keep their order. */
function shuffleKeys(value: unknown, seed = { n: 7 }): unknown {
  if (Array.isArray(value)) return value.map((item) => shuffleKeys(item, seed));
  if (!isRecord(value)) return value;
  const keys = Object.keys(value);
  for (let i = keys.length - 1; i > 0; i--) {
    seed.n = (seed.n * 1103515245 + 12345) % 2147483648;
    const j = seed.n % (i + 1);
    [keys[i], keys[j]] = [keys[j] ?? '', keys[i] ?? ''];
  }
  return Object.fromEntries(keys.map((key) => [key, shuffleKeys(value[key], seed)]));
}

describe('normalize: the real TokensBrücke export', () => {
  test('src/figma-owned is exactly normalize(figma/raw), the plan §7.7 invariant', () => {
    expect(diffOwned(renderAll(BASE), FIGMA_OWNED_DIR)).toEqual([]);
  });

  test('writes one file per collection and mode, with every allowlisted token', () => {
    const counts = Object.fromEntries(
      [...BASE.files].map(([file, tree]) => [file, countTokens(tree)]),
    );
    expect(counts).toEqual({
      'primitives.tokens.json': 58,
      'color/light.tokens.json': 75,
      'color/dark.tokens.json': 75,
      'foundation.tokens.json': 32,
      'motion/default.tokens.json': 24,
      'motion/reduced.tokens.json': 24,
      'viewport/mobile.tokens.json': 10,
      'viewport/tablet.tokens.json': 10,
      'viewport/desktop.tokens.json': 10,
      'typography.tokens.json': 20,
      'effects.tokens.json': 9,
    });
  });

  test('converts Figma FLOATs by group: rem, px, ms or number', () => {
    expect(tokenValue('foundation.tokens.json', 'space.4')).toEqual({ value: 1, unit: 'rem' });
    expect(tokenValue('foundation.tokens.json', 'radius.full')).toEqual({
      value: 62.4375,
      unit: 'rem',
    });
    expect(tokenValue('foundation.tokens.json', 'border-width.focus')).toEqual({
      value: 2,
      unit: 'px',
    });
    // Figma deleted border-width/strong on 2026-10-18 (M33: every border is 1 px).
    expect(() => tokenValue('foundation.tokens.json', 'border-width.strong')).toThrow(
      /no token border-width\.strong/,
    );
    expect(tokenValue('motion/default.tokens.json', 'duration.spin')).toEqual({
      value: 800,
      unit: 'ms',
    });
    expect(tokenValue('motion/reduced.tokens.json', 'duration.spin')).toEqual({
      value: 0,
      unit: 'ms',
    });
    expect(tokenValue('motion/default.tokens.json', 'duration.fast')).toEqual({
      value: 140,
      unit: 'ms',
    });
    expect(tokenValue('motion/reduced.tokens.json', 'duration.fast')).toEqual({
      value: 0,
      unit: 'ms',
    });
    expect(tokenValue('motion/default.tokens.json', 'stagger.item')).toEqual({
      value: 40,
      unit: 'ms',
    });
    expect(tokenValue('motion/default.tokens.json', 'distance.lift')).toEqual({
      value: 0.25,
      unit: 'rem',
    });
    expect([
      tokenType('motion/default.tokens.json', 'scale.press'),
      tokenValue('motion/default.tokens.json', 'scale.press'),
    ]).toEqual(['number', 0.98]);
    expect(tokenValue('motion/default.tokens.json', 'tilt.max-deg')).toBe(6);
    expect(tokenValue('viewport/mobile.tokens.json', 'grid.columns')).toBe(4);
    expect(tokenValue('viewport/desktop.tokens.json', 'grid.columns')).toBe(12);
    expect(tokenValue('viewport/mobile.tokens.json', 'layout.content-max')).toEqual({
      value: 22.375,
      unit: 'rem',
    });
  });

  test('rewrites collection-qualified aliases into the color group', () => {
    expect(token(BASE.files, 'color/light.tokens.json', 'color.bg.canvas').$value).toBe(
      '{color.p.neutral.50}',
    );
    expect(token(BASE.files, 'color/dark.tokens.json', 'color.bg.canvas').$value).toBe(
      '{color.p.neutral.950}',
    );
    expect(token(BASE.files, 'primitives.tokens.json', 'color.p.green.700').$value).toEqual({
      colorSpace: 'srgb',
      components: [0.10196078431372549, 0.3411764705882353, 0.22745098039215686],
      alpha: 1,
      hex: '#1a573a',
    });
  });

  test('keeps spring() parameters in dev.nizivo.spring and parses cubic-bezier()', () => {
    const spring = token(BASE.files, 'motion/default.tokens.json', 'easing.spring');
    expect(spring.$type).toBe('cubicBezier');
    expect(spring.$extensions).toMatchObject({
      'dev.nizivo.spring': { mass: 1, stiffness: 260, damping: 24, velocity: 0 },
    });
    expect(
      token(BASE.files, 'motion/default.tokens.json', 'easing.spring-soft').$extensions,
    ).toMatchObject({
      'dev.nizivo.spring': { mass: 1, stiffness: 170, damping: 26, velocity: 0 },
    });
    expect(token(BASE.files, 'motion/default.tokens.json', 'easing.standard').$value).toEqual([
      0.2, 0, 0, 1,
    ]);
    const reduced = token(BASE.files, 'motion/reduced.tokens.json', 'easing.spring');
    expect(reduced.$value).toEqual([0, 0, 1, 1]);
    expect(reduced.$extensions).not.toHaveProperty(['dev.nizivo.spring']);
  });

  test('turns text styles into typography tokens', () => {
    const label = token(BASE.files, 'typography.tokens.json', 'font.label.m');
    expect(label.$value).toEqual({
      fontFamily: 'Geist',
      fontSize: { value: 0.875, unit: 'rem' },
      fontWeight: 500,
      letterSpacing: { value: 0, unit: 'rem' },
      lineHeight: 1.4,
    });
    const display = token(BASE.files, 'typography.tokens.json', 'font.display.l');
    expect(display.$value).toMatchObject({
      letterSpacing: { value: -0.105, unit: 'rem' },
      lineHeight: 1.04,
    });
    expect(figma(display)).toEqual({
      styleId: 'S:693640858cd02f557cc34e9b3b6957e42963298d,',
      name: 'Display/L',
      letterSpacingPercent: -3,
    });
    // Figma stores -0.2% as float32; the export says -0.20000000298023224%.
    expect(figma(token(BASE.files, 'typography.tokens.json', 'font.label.l'))).toMatchObject({
      letterSpacingPercent: -0.2,
    });
    expect(token(BASE.files, 'typography.tokens.json', 'font.body.m-strong').$value).toMatchObject({
      fontWeight: 500,
    });
    expect(token(BASE.files, 'typography.tokens.json', 'font.mono.m').$value).toMatchObject({
      fontFamily: 'Geist Mono',
    });
  });

  test('turns effect styles into shadow tokens with 6-digit hex and px geometry', () => {
    const effects = BASE.files.get('effects.tokens.json');
    expect(Object.keys(effects?.elevation ?? {})).toEqual(['0', '1', '2', '3', '4']);
    // CSS paint order: Figma lists the 2 px blur first and paints it under the 16 px one.
    expect(token(BASE.files, 'effects.tokens.json', 'elevation.2').$value).toEqual([
      {
        color: {
          colorSpace: 'srgb',
          components: [0.06274509803921569, 0.07450980392156863, 0.06666666666666667],
          alpha: 0.05,
          hex: '#101311',
        },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 8, unit: 'px' },
        blur: { value: 16, unit: 'px' },
        spread: { value: -4, unit: 'px' },
      },
      {
        color: {
          colorSpace: 'srgb',
          components: [0.06274509803921569, 0.07450980392156863, 0.06666666666666667],
          alpha: 0.04,
          hex: '#101311',
        },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 2, unit: 'px' },
        blur: { value: 4, unit: 'px' },
        spread: { value: 0, unit: 'px' },
      },
    ]);
    expect(
      token(BASE.files, 'effects.tokens.json', 'surface.inner-highlight').$value,
    ).toMatchObject([{ inset: true }]);
    expect(token(BASE.files, 'effects.tokens.json', 'focus.ring-critical').$type).toBe('shadow');
    expect(effects?.surface).not.toHaveProperty('glass');
    expect(BASE.skipped).toEqual(['Effect-styles "Nizivo/Surface/Glass" (blur has no DTCG type)']);
  });

  test('a layer colour bound to a variable stays an alias, so the build can follow the theme', () => {
    const zero = { value: 0, unit: 'px' };
    const spread = (value: number) => ({
      offsetX: zero,
      offsetY: zero,
      blur: zero,
      spread: { value, unit: 'px' },
    });
    // Figma's Focus/Ring since 2026-10-18: halo (raw), outline (border/focus), gap (bg/surface),
    // listed bottom first. The DTCG value lists the top layer first, as CSS box-shadow does.
    expect(token(BASE.files, 'effects.tokens.json', 'focus.ring').$value).toEqual([
      { color: '{color.bg.surface}', ...spread(2) },
      { color: '{color.border.focus}', ...spread(4) },
      {
        color: {
          colorSpace: 'srgb',
          components: [0.1803921568627451, 0.5098039215686274, 0.34509803921568627],
          alpha: 0.16,
          hex: '#2e8258',
        },
        ...spread(8),
      },
    ]);
    // Invalid + focused keeps the green outline; only the halo turns red (Figma page 7374:7).
    expect(token(BASE.files, 'effects.tokens.json', 'focus.ring-critical').$value).toMatchObject([
      { color: '{color.bg.surface}' },
      { color: '{color.border.focus}' },
      { color: { hex: '#d64a2e', alpha: 0.22 } },
    ]);
  });

  test('a bound layer colour must point into an allowlisted collection', () => {
    const raw = structuredClone(RAW).map((file) => {
      const ring = nizivoEffects(file)?.Focus;
      const layers = isRecord(ring) && isRecord(ring.Ring) ? ring.Ring.$value : undefined;
      if (Array.isArray(layers) && isRecord(layers[1])) layers[1].color = '{Clario Tokens.focus}';
      return file;
    });
    expect(() => normalize(raw)).toThrow(
      /Nizivo\/Focus\/Ring \[1\]: alias \{Clario Tokens\.focus\} points outside the allowlisted collections/,
    );
  });

  test('keys every variable on its Figma variable id and every text style on its style id', () => {
    const ids = figmaIds(BASE.files);
    expect([...ids.keys()].filter((id) => id.startsWith('VariableID:'))).toHaveLength(199);
    expect([...ids.keys()].filter((id) => id.startsWith('S:'))).toHaveLength(20);
    expect(ids.get('VariableID:737:114')).toBe('color.bg.canvas');
    expect(figma(token(BASE.files, 'color/dark.tokens.json', 'color.bg.canvas'))).toEqual({
      variableId: 'VariableID:737:114',
      collectionId: 'VariableCollectionId:737:113',
      name: 'bg/canvas',
      scopes: ['FRAME_FILL', 'SHAPE_FILL'],
    });
  });
});

describe('both prefixes map to nz (plan §7.1, §20.3)', () => {
  test('the export under the Grove names normalizes to the same bytes', () => {
    const grove = groveNamed(RAW);
    // The fixture really is renamed: no Nizivo collection or style group left in it.
    expect(JSON.stringify(grove)).not.toMatch(COLLECTION_NAME);
    expect(JSON.stringify(grove)).not.toContain('"Nizivo":');
    expect(grove.map((file) => file.path)).toContain('Grove Color/Light.tokens.json');
    expect(renderAll(normalize(grove))).toEqual(renderAll(BASE));
  });

  test('a half-renamed export (collections renamed, styles not) normalizes the same', () => {
    expect(renderAll(normalize(groveNamed(RAW, { styles: false })))).toEqual(renderAll(BASE));
    expect(renderAll(normalize(groveNamed(RAW, { collections: false })))).toEqual(renderAll(BASE));
  });

  test('Elevation/0 Flat (one invisible drop shadow since 2026-10-14) is elevation.0 and only that', () => {
    // The layer the TokensBrücke 3.18.0 CLI exports for it: the shadow ink at alpha 0, offset 0,
    // radius 0, spread 0.
    const zero = { value: 0, unit: 'px' };
    const result = BASE;
    expect(token(result.files, 'effects.tokens.json', 'elevation.0')).toEqual({
      $type: 'shadow',
      $value: [
        {
          color: {
            colorSpace: 'srgb',
            components: [0.06274509803921569, 0.07450980392156863, 0.06666666666666667],
            alpha: 0,
            hex: '#101311',
          },
          offsetX: zero,
          offsetY: zero,
          blur: zero,
          spread: zero,
        },
      ],
      $extensions: { 'dev.nizivo.figma': { name: 'Elevation/0 Flat' } },
    });
    const without = normalize(
      structuredClone(RAW).map((file) => {
        const elevation = nizivoEffects(file)?.Elevation;
        if (isRecord(elevation)) delete elevation['0 Flat'];
        return file;
      }),
    );
    const elevation = structuredClone(result.files.get('effects.tokens.json')?.elevation);
    if (!isRecord(elevation)) throw new Error('no elevation group');
    expect(Object.keys(elevation)).toEqual(['0', '1', '2', '3', '4']);
    delete elevation['0'];
    expect(without.files.get('effects.tokens.json')?.elevation).toEqual(elevation);
  });

  test('one collection under both prefixes is an error, not a silent merge', () => {
    const groveColor = groveNamed(RAW).filter((file) => file.path.startsWith('Grove Color/'));
    expect(() => normalize([...RAW, ...groveColor])).toThrow(
      /a second collection maps to color\/dark/,
    );
  });

  test('foreign collections and styles are left out by the allowlist', () => {
    const foreign: RawFile = {
      path: 'Clario Tokens.tokens.json',
      json: { 'Clario Tokens': { brand: { $type: 'color', $value: 'not even a colour' } } },
    };
    const raw = structuredClone(RAW).map((file) => {
      const styles = isRecord(file.json) ? file.json['Typography-styles'] : undefined;
      if (isRecord(styles)) styles.Clario = { Body: { M: { $type: 'typography', $value: {} } } };
      return file;
    });
    const result = normalize([...raw, foreign]);
    expect(renderAll(result)).toEqual(renderAll(BASE));
    expect(result.skipped).toContain('collection "Clario Tokens" (not allowlisted)');
    expect(result.skipped).toContain('Typography-styles "Clario/*" (1 styles, not allowlisted)');
  });
});

describe('identity is the Figma variable id', () => {
  test('renaming a variable moves the token and keeps its id', () => {
    const raw = editColor(['Light', 'Dark'], (body) => moveKey(body.bg, 'canvas', 'page'));
    const result = normalize(raw);
    const before = figmaIds(BASE.files);
    const after = figmaIds(result.files);
    expect(after.get('VariableID:737:114')).toBe('color.bg.page');
    const moved = [...after].filter(([id, path]) => before.get(id) !== path);
    expect(moved).toEqual([['VariableID:737:114', 'color.bg.page']]);
    const page = token(result.files, 'color/light.tokens.json', 'color.bg.page');
    expect(page.$value).toBe('{color.p.neutral.50}');
    expect(figma(page)).toMatchObject({ variableId: 'VariableID:737:114', name: 'bg/page' });
    expect(() => token(result.files, 'color/light.tokens.json', 'color.bg.canvas')).toThrow(
      /no token color\.bg\.canvas/,
    );
  });

  test('a variable id at different paths in two modes is an error', () => {
    const raw = editColor(['Dark'], (body) => moveKey(body.bg, 'canvas', 'page'));
    expect(() => normalize(raw)).toThrow(/VariableID:737:114 is color\.bg\.page in another mode/);
  });

  test('modes that do not hold the same variables are an error', () => {
    const raw = editColor(['Dark'], (body) => {
      if (isRecord(body.bg)) delete body.bg.canvas;
    });
    expect(() => normalize(raw)).toThrow(/modes do not hold the same variables/);
  });
});

describe('deterministic output', () => {
  test('the same export renders the same bytes twice', () => {
    expect(renderAll(normalize(readRaw(RAW_DIR)))).toEqual(renderAll(BASE));
  });

  test('object key order and file order in the export do not change the output', () => {
    const shuffled = RAW.map(({ path, json }) => ({ path, json: shuffleKeys(json) })).toReversed();
    expect(JSON.stringify(shuffled)).not.toBe(JSON.stringify(RAW.toReversed()));
    expect(renderAll(normalize(shuffled))).toEqual(renderAll(BASE));
  });

  test('group keys sort numerically, not as strings', () => {
    expect(['10', '2', '1-5', '1', '0-5', '24'].toSorted(naturalCompare)).toEqual([
      '0-5',
      '1',
      '1-5',
      '2',
      '10',
      '24',
    ]);
    const foundation = renderAll(BASE).get('foundation.tokens.json') ?? '';
    const order = ['"2xl"', '"full"', '"lg"', '"md"', '"none"', '"sm"', '"xl"', '"xs"'].map((key) =>
      foundation.indexOf(key),
    );
    expect(order).toEqual(order.toSorted((a, b) => a - b));
  });
});

describe('--check (normalize:check)', () => {
  test('reports hand edits, stale files and missing files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nz-figma-owned-'));
    try {
      cpSync(FIGMA_OWNED_DIR, dir, { recursive: true });
      expect(diffOwned(renderAll(BASE), dir)).toEqual([]);
      writeFileSync(join(dir, 'foundation.tokens.json'), '{}\n');
      writeFileSync(join(dir, 'color/hand-made.tokens.json'), '{}\n');
      rmSync(join(dir, 'effects.tokens.json'));
      expect(diffOwned(renderAll(BASE), dir)).toEqual([
        'missing effects.tokens.json',
        'differs foundation.tokens.json',
        'not produced by normalize color/hand-made.tokens.json',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
