import { describe, expect, test } from 'vitest';
import { graph, isClient, join, rekey, resolve, specifiers } from '../helpers/graph';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);
const ENGINE =
  /^(react-aria|react-aria-components|react-stately|@react-aria\/|@react-stately\/|@internationalized\/|@base-ui\/)/;
const files = [...SRC.keys()].filter(
  (file) => /\.tsx?$/.test(file) && !file.endsWith('.example.tsx'),
);

describe("Button's module graph", () => {
  const { modules, externals } = graph(SRC, 'src/button/index.ts');

  test("contains no 'use client' module", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect(modules).toContain('src/button/button.tsx');
    expect(modules).toContain('src/contracts/render.ts');
  });

  test('imports nothing but react', () => {
    expect([...externals].filter((name) => name !== 'react')).toEqual([]);
  });
});

describe("'use client' placement (ARCHITECTURE.md §8.2, §9.2)", () => {
  test('only *.client.tsx modules carry the directive, and every one of them does', () => {
    const misplaced = files.filter(
      (file) => isClient(SRC.get(file) ?? '') !== file.endsWith('.client.tsx'),
    );
    expect(misplaced).toEqual([]);
  });

  test('every export * as target is directive-free (spike S2)', () => {
    const targets = files.flatMap((file) =>
      [...(SRC.get(file) ?? '').matchAll(/export \* as \w+ from '([^']+)'/g)].map(
        ([, target]) => resolve(SRC, file, target ?? '') ?? `${file} → ${target} (unresolved)`,
      ),
    );
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.filter((target) => !SRC.has(target) || isClient(SRC.get(target) ?? ''))).toEqual(
      [],
    );
  });

  test('only src/_engines/** imports the engine', () => {
    const offenders = files.filter(
      (file) =>
        !file.startsWith('src/_engines/') &&
        specifiers(SRC.get(file) ?? '').some((s) => ENGINE.test(s)),
    );
    expect(offenders).toEqual([]);
  });

  test('public contracts never import an engine module, even as a type', () => {
    const leaks = files
      .filter((file) => file.endsWith('.contract.ts') || file.startsWith('src/contracts/'))
      .flatMap((file) => {
        const { modules, externals } = graph(SRC, file);
        return [...modules, ...externals]
          .filter((m) => m.startsWith('src/_engines/') || ENGINE.test(m))
          .map((m) => `${file} → ${m}`);
      });
    expect(leaks).toEqual([]);
  });
});

/** Relative specifiers that resolve outside src/, as `file → specifier` (none may). */
function escapes(sources: Map<string, string>): string[] {
  return [...sources].flatMap(([file, text]) =>
    specifiers(text)
      .filter((s) => s.startsWith('.'))
      .filter((s) => !join(file.slice(0, file.lastIndexOf('/')), s).startsWith('src/'))
      .map((s) => `${file} → ${s}`),
  );
}

describe('heavy modules stay out of core (ARCHITECTURE.md §4.1 L6, seam ledger K8)', () => {
  const MANIFEST = Object.values(
    import.meta.glob('../../package.json', { query: '?raw', import: 'default', eager: true }),
  )[0];

  test('no source or example imports @nizivo/charts: core reaches charts only through slots', () => {
    const all = [...SRC.keys()].filter((file) => /\.tsx?$/.test(file));
    const offenders = all.flatMap((file) =>
      specifiers(SRC.get(file) ?? '')
        .filter((s) => s === '@nizivo/charts' || s.startsWith('@nizivo/charts/'))
        .map((s) => `${file} → ${s}`),
    );
    expect(all.length).toBeGreaterThan(100);
    expect(offenders).toEqual([]);
  });

  test('no relative import leaves src/ (a path into ../charts/src would bundle charts code)', () => {
    expect(escapes(SRC)).toEqual([]);
    const probe = new Map([['src/button/probe.ts', "import { x } from '../../../charts/src/x';"]]);
    expect(escapes(probe)).toEqual(['src/button/probe.ts → ../../../charts/src/x']);
  });

  test('package.json declares no @nizivo/charts dependency of any kind', () => {
    expect(MANIFEST).toContain('"@nizivo/tokens"');
    expect(MANIFEST).not.toContain('"@nizivo/charts"');
  });
});
