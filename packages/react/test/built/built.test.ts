// Checks the built output; run after a build (`check:dist`, or CI after `pnpm build`).
import { describe, expect, test } from 'vitest';
import manifest from '../../package.json' with { type: 'json' };
import { graph, isClient, rekey } from '../helpers/graph';

const DIST = rekey(
  import.meta.glob(['../../dist/**/*.js', '../../dist/**/*.d.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'dist/',
);
const ENGINE =
  /^(react-aria|react-aria-components|react-stately|@react-aria\/|@react-stately\/|@internationalized\/)/;
const js = [...DIST.keys()].filter((file) => file.endsWith('.js'));
// §9.3 rule 4: the walk starts from every `types` condition in the exports map.
const entries = Object.values(manifest.exports).flatMap((target) =>
  typeof target === 'object' ? [target.types.replace(/^\.\//, '')] : [],
);

// A missing build must fail, never pass as skipped.
if (!DIST.has('dist/index.js')) throw new Error('dist/index.js is missing: build first');

describe('dist', () => {
  test("'use client' is line 1 of every *.client.js module and of nothing else", () => {
    const misplaced = js.filter(
      (file) => isClient(DIST.get(file) ?? '') !== file.endsWith('.client.js'),
    );
    expect(misplaced).toEqual([]);
  });

  test('namespace objects are built in directive-free modules (spike S2)', () => {
    const namespaces = js.filter((file) => (DIST.get(file) ?? '').includes('__exportAll('));
    expect(namespaces.length).toBeGreaterThan(0);
    expect(namespaces.filter((file) => isClient(DIST.get(file) ?? ''))).toEqual([]);
  });

  test('Button ships no client module', () => {
    const { modules } = graph(DIST, 'dist/button/button.js');
    expect([...modules].filter((file) => isClient(DIST.get(file) ?? ''))).toEqual([]);
  });

  test('the .d.ts graph from every exports types entry never reaches the engine or an _engines file', () => {
    expect(entries).toContain('dist/index.d.ts');
    expect(entries.filter((entry) => !DIST.has(entry))).toEqual([]);
    const leaks = entries.flatMap((entry) => {
      const { modules, externals } = graph(DIST, entry);
      return [...modules, ...externals]
        .filter((m) => m.includes('/_engines/') || ENGINE.test(m))
        .map((m) => `${entry} → ${m}`);
    });
    expect(leaks).toEqual([]);
  });
});
