// Elevation 0 and the dark-mode ring (plan §7.1 "the first sync after the rename", §7.5). Since
// 2026-10-14 Figma's `Elevation/0 Flat` holds one invisible drop shadow; the 2026-10-18 export
// brought it as `elevation.0`. This builds a copy of src/ with a flat `elevation.0` (black at alpha 0
// in place of Figma's ink at alpha 0: the rule reads only the alpha), through the pinned CLI and the
// real config, and checks that the token draws no ring and that everything else equals the goldens
// byte for byte.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ShadowValueNormalized } from '@terrazzo/parser';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { elevation } from '../build/css.ts';

const PACKAGE = fileURLToPath(new URL('..', import.meta.url));
const TZ = join(PACKAGE, 'node_modules/@terrazzo/cli/bin/cli.js');
const { version }: { version: string } = JSON.parse(
  readFileSync(join(PACKAGE, 'package.json'), 'utf8'),
);

const px = (value: number) => ({ value, unit: 'px' as const });

/** `elevation.0` as the normalizer writes it from the TokensBrücke 3.18.0 export of `0 Flat`. */
const ELEVATION_0 = {
  $type: 'shadow',
  $value: [
    {
      color: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0, hex: '#000000' },
      offsetX: px(0),
      offsetY: px(0),
      blur: px(0),
      spread: px(0),
    },
  ],
  $extensions: { 'dev.nizivo.figma': { name: 'Elevation/0 Flat' } },
};

const golden = (name: string): string =>
  readFileSync(join(PACKAGE, 'test/golden', `${name}.golden`), 'utf8');

// Each comparison drops the elevation 0 entry on both sides, so it holds before the sync (the
// goldens have no elevation 0) and after it (they do).
const withoutLevel0 = (text: string, variable: string): string =>
  text.replace(new RegExp(`^ *${variable}: .*;\\n`, 'm'), '');

let tmp = '';
const out: Record<string, string> = {};

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'nz-tokens-elevation-0-'));
  const src = join(tmp, 'src');
  cpSync(join(PACKAGE, 'src'), src, { recursive: true });
  const effectsFile = join(src, 'figma-owned/effects.tokens.json');
  const effects: { elevation: Record<string, unknown> } = JSON.parse(
    readFileSync(effectsFile, 'utf8'),
  );
  effects.elevation = { ...effects.elevation, '0': ELEVATION_0 };
  writeFileSync(effectsFile, JSON.stringify(effects, null, 2));

  // The real config with only its token source swapped, so the plugins and transforms are the build's.
  const config = join(tmp, 'terrazzo.config.ts');
  const real = JSON.stringify(join(PACKAGE, 'build/terrazzo.config.ts'));
  const resolver = JSON.stringify(join(src, 'nizivo.resolver.json'));
  writeFileSync(
    config,
    `import config from ${real};\nexport default { ...config, tokens: [${resolver}] };\n`,
  );
  const dist = join(tmp, 'dist');
  mkdirSync(dist);
  const result = spawnSync(process.execPath, [TZ, 'build', '-c', config], {
    cwd: PACKAGE,
    encoding: 'utf8',
    env: { ...process.env, NZ_TOKENS_OUT_DIR: dist },
  });
  if (result.status !== 0) throw new Error(`tz build failed:\n${result.stdout}${result.stderr}`);
  for (const name of [
    'tokens.css',
    'tailwind.css',
    'contract.json',
    'tokens.json',
    'index.js',
    'index.d.ts',
  ]) {
    out[name] = readFileSync(join(dist, name), 'utf8');
  }
}, 60_000);

afterAll(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe('the Figma elevation.0 (one invisible layer) through the build', () => {
  const declaration = '    --nz-elevation-0: 0 0 0 0 transparent;\n';

  test('--nz-elevation-0 is the flat layer alone: no ring, no highlight, no light-dark()', () => {
    const css = out['tokens.css'] ?? '';
    expect(css).toContain(declaration);
    const line = css.split('\n').find((l) => l.includes('--nz-elevation-0:'));
    expect(line).not.toContain('--nz-elevation-ring');
    expect(line).not.toContain('--nz-elevation-highlight');
  });

  test('apart from --nz-elevation-0, tokens.css equals the golden (levels 1–4 unchanged)', () => {
    const css = (out['tokens.css'] ?? '').replace(
      `--nz-css-version: "${version}";`,
      '--nz-css-version: "<version>";',
    );
    const name = '--nz-elevation-0';
    expect(withoutLevel0(css, name)).toBe(withoutLevel0(golden('tokens.css'), name));
  });

  test('tailwind.css gains --shadow-nz-0 and contract.json the public token, nothing else', () => {
    const tailwind = out['tailwind.css'] ?? '';
    expect(tailwind).toContain('  --shadow-nz-0: var(--nz-elevation-0);\n');
    const name = '--shadow-nz-0';
    expect(withoutLevel0(tailwind, name)).toBe(withoutLevel0(golden('tailwind.css'), name));

    type Contract = { variables: Record<string, unknown> };
    const contract: Contract = JSON.parse(out['contract.json'] ?? '');
    const expected: Contract = JSON.parse(golden('contract.json'));
    expect(contract.variables['--nz-elevation-0']).toEqual({
      token: 'elevation.0',
      type: 'shadow',
      public: true,
    });
    delete contract.variables['--nz-elevation-0'];
    delete expected.variables['--nz-elevation-0'];
    expect(contract).toEqual(expected);
  });
});

/** Drops every line that names elevation 0: its ref, its doc comment and its union members. */
const withoutLevel0Lines = (text: string): string =>
  text
    .split('\n')
    .filter((line) => !/elevation[-.]0\b/.test(line))
    .join('\n');

describe('the elevation.0 sync in tokens.json and the js-refs entry', () => {
  test('tokens.json gains elevation.0, flat in both themes, and nothing else', () => {
    type Json = { tokens: Record<string, unknown> };
    const json: Json = JSON.parse(out['tokens.json'] ?? '');
    const expected: Json = JSON.parse(golden('tokens.json'));
    expect(json.tokens['elevation.0']).toEqual({
      type: 'shadow',
      cssVariable: '--nz-elevation-0',
      public: true,
      value: '0 0 0 0 transparent',
      provenance: 'design',
      design: { name: 'Elevation/0 Flat' },
    });
    delete json.tokens['elevation.0'];
    delete expected.tokens['elevation.0'];
    expect(json).toEqual(expected);
  });

  test('index.js and index.d.ts gain only elevation[0] and its names', () => {
    expect(out['index.js']).toContain('  "0": "var(--nz-elevation-0)",\n');
    for (const name of ['index.js', 'index.d.ts']) {
      expect(withoutLevel0Lines(out[name] ?? '')).toBe(withoutLevel0Lines(golden(name)));
    }
  });
});

/** A black drop shadow layer, as Terrazzo hands it to the transform. */
const layer = (alpha: number, y: number, blur: number): ShadowValueNormalized => ({
  color: { colorSpace: 'srgb', components: [0, 0, 0], alpha },
  offsetX: px(0),
  offsetY: px(y),
  blur: px(blur),
  spread: px(0),
  inset: false,
});
const RING = '0 0 0 1px var(--nz-elevation-ring)';

describe('elevation(): the ring follows the layers, not the level', () => {
  test('every layer at alpha 0, at any size: Figma geometry only, no ring or highlight', () => {
    expect(elevation('elevation.3', [layer(0, 4, 8), layer(0, 16, 32)])).toBe(
      '0 4px 8px 0 transparent, 0 16px 32px 0 transparent',
    );
  });

  test('a visible level 0 takes the ring like any raised surface', () => {
    expect(elevation('elevation.0', [layer(0.04, 1, 2)])).toBe(
      `${RING}, 0 1px 2px 0 light-dark(rgb(0 0 0 / 0.04), rgb(0 0 0 / 0.24))`,
    );
  });

  test('one visible layer is enough for the ring', () => {
    expect(elevation('elevation.1', [layer(0, 0, 0), layer(0.04, 1, 2)])).toBe(
      `${RING}, 0 0 0 0 transparent, 0 1px 2px 0 light-dark(rgb(0 0 0 / 0.04), rgb(0 0 0 / 0.24))`,
    );
  });

  test('no layers at all prints a no-op layer, so the value still composes in a list', () => {
    expect(elevation('elevation.0', [])).toBe('0 0 0 0 transparent');
  });
});
