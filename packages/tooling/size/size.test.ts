// The size budgets' bookkeeping (ARCHITECTURE.md §17): the limit rule, and that budgets.json, the
// checks and the three packages' public exports agree. Reads package.json and src/ only, so it runs
// without a build; the sizes themselves are `pnpm --filter @nizivo/react size`.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import {
  BUDGETS,
  ownCodeOnly,
  sizeEntries,
  sizeLimitChecks,
  uncoveredExports,
  WILDCARD_REPRESENTATIVES,
} from './checks.ts';
import { limitBytes, limitKiB, limitString, PLAN_LIMITS_KIB } from './method.ts';
import { engineImports, layer } from './seam/seam.ts';

describe('limitKiB: measured + 10%, rounded up', () => {
  test.each([
    [-12, 0],
    [0, 0],
    [1, 0.1],
    [930, 1],
    [1379, 1.5],
    [9309, 10],
    [16327, 18],
    [62404, 68],
  ])('%i B → %f KiB', (measured, kib) => {
    expect(limitKiB(measured)).toBe(kib);
  });

  test('never below measured × 1.1, and within one rounding step of it', () => {
    for (let measured = 1; measured < 200_000; measured += 97) {
      const kib = limitKiB(measured);
      const bytes = limitBytes(kib);
      expect(bytes + 1).toBeGreaterThanOrEqual(measured * 1.1);
      const step = kib < 10 ? 102.4 : 1024;
      expect(bytes - measured * 1.1).toBeLessThan(step);
    }
  });

  test('size-limit reads the limit in KiB (1,024), not kB', () => {
    expect(limitString(1.5)).toBe('1.5 KiB');
    expect(limitBytes(1.5)).toBe(1536);
  });
});

describe('budgets.json', () => {
  const entries = sizeEntries();
  const names = entries.map((e) => e.name);

  test('every public export of react, tokens and icons is measured', () => {
    expect(uncoveredExports(entries)).toEqual([]);
  });

  test('each wildcard export has its representative entries', () => {
    for (const reps of Object.values(WILDCARD_REPRESENTATIVES)) {
      for (const rep of reps) expect(names).toContain(rep);
    }
  });

  test('every entry has a budget and every budget an entry', () => {
    expect(names.filter((name) => BUDGETS[name] === undefined)).toEqual([]);
    expect(Object.keys(BUDGETS).filter((name) => !names.includes(name))).toEqual([]);
    expect(new Set(names).size).toBe(names.length);
  });

  test('no budget sits above its §17.1 plan limit, and every plan limit names an entry', () => {
    for (const [name, plan] of Object.entries(PLAN_LIMITS_KIB)) {
      expect(names).toContain(name);
      expect(BUDGETS[name]?.limitKiB).toBeLessThanOrEqual(plan);
    }
  });

  test('every recorded measurement is within its limit', () => {
    const over = Object.entries(BUDGETS).filter(
      ([, b]) => b.measured > limitBytes(b.limitKiB) || b.measured < 0,
    );
    expect(over).toEqual([]);
  });

  test('the size-limit config: gzip, KiB limits, files unbundled, own code alone', () => {
    const checks = sizeLimitChecks();
    expect(checks).toHaveLength(entries.length);
    const shape = checks.map((check, i) => {
      const e = entries[i];
      const config = check.modifyEsbuildConfig?.({ bundle: true });
      return {
        name: check.name,
        gzip: check.gzip,
        limit: /^\d+(\.\d)? KiB$/.test(check.limit ?? ''),
        // CSS and JSON: the published file, no bundler
        disablePlugins: check.disablePlugins,
        method:
          config === undefined
            ? undefined
            : {
                format: config['format'],
                conditions: config['conditions'],
                bundle: config['bundle'],
              },
        ownCodePlugin: config?.['plugins'] !== undefined,
        engineExternal: check.ignore !== undefined,
        expected: {
          name: e?.name,
          gzip: true,
          limit: true,
          disablePlugins: e?.family === 'file' ? ['@size-limit/esbuild'] : undefined,
          method:
            e?.family === 'file'
              ? undefined
              : { format: 'esm', conditions: ['production'], bundle: true },
          ownCodePlugin: e?.family === 'own',
          engineExternal: e?.engineExternal === true,
        },
      };
    });
    for (const { expected, ...actual } of shape) expect(actual).toEqual(expected);
  });

  test('the measure and brotli modes carry no limits', () => {
    for (const check of sizeLimitChecks({ measure: true })) expect(check.limit).toBeUndefined();
    for (const check of sizeLimitChecks({ brotli: true })) {
      expect(check.limit).toBeUndefined();
      expect(check.gzip).toBeUndefined();
    }
  });
});

test('ownCodeOnly keeps the entry and makes every import external', () => {
  let callback: ((args: { path: string; kind: string }) => unknown) | undefined;
  ownCodeOnly.setup({
    onResolve: (_options, cb) => {
      callback = cb;
    },
  });
  expect(callback?.({ path: '/x/entry.js', kind: 'entry-point' })).toBeUndefined();
  expect(callback?.({ path: './cx.js', kind: 'import-statement' })).toEqual({
    path: './cx.js',
    external: true,
  });
});

describe('seam harness', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nz-seam-test-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test('engineImports follows relative imports and collects React Aria names', () => {
    writeFileSync(
      join(dir, 'index.js'),
      'import { Leaf } from "./leaf.js";\nimport "./side.js";\nexport { Leaf };\n',
    );
    writeFileSync(
      join(dir, 'leaf.js'),
      'import { jsx } from "react/jsx-runtime";\nimport { Button, Popover as P } from "react-aria-components";\nimport { useFocusable } from "react-aria/useFocusable";\nexport const Leaf = 1;\n',
    );
    writeFileSync(join(dir, 'side.js'), 'import allowlist from "./data.js";\n');
    writeFileSync(join(dir, 'data.js'), 'export default [];\n');
    const imports = engineImports(join(dir, 'index.js'));
    expect([...imports.keys()].toSorted()).toEqual([
      'react-aria-components',
      'react-aria/useFocusable',
    ]);
    expect([...(imports.get('react-aria-components') ?? [])].toSorted()).toEqual([
      'Button',
      'Popover',
    ]);
  });

  test('a namespace import of the engine is refused', () => {
    writeFileSync(join(dir, 'ns.js'), 'import * as RAC from "react-aria-components";\n');
    expect(() => engineImports(join(dir, 'ns.js'))).toThrow(/not a named import/);
  });

  test('layers', () => {
    const d = '/r/packages/react/dist/';
    expect(layer('/r/node_modules/.pnpm/x/node_modules/react-aria/dist/a.mjs')).toBe('engine');
    expect(layer(`${d}contracts/state.js`)).toBe('k6');
    expect(layer(`${d}_engines/react-aria/dom-allowlist.js`)).toBe('k6');
    expect(layer(`${d}_engines/react-aria/locale.client.js`)).toBe('k6');
    expect(layer(`${d}config/config.client.js`)).toBe('k6');
    expect(layer(`${d}contracts/merge-props.js`)).toBe('k7');
    expect(layer(`${d}_engines/react-aria/popup.client.js`)).toBe('family');
    expect(layer(`${d}_engines/react-aria/select.client.js`)).toBe('adapter');
    expect(layer(`${d}select/select.client.js`)).toBe('leaf');
    expect(layer(`${d}_internal/glyphs.js`)).toBe('leaf');
  });
});
