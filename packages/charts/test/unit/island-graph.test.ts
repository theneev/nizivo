// What each part pulls into a bundle (ARCHITECTURE.md §14.1, §17.2): AreaChart's and BarChart's
// server graphs reach exactly one client module, the ChartInteraction island (point mode and column
// mode, M40); Sparkline, ChartTooltip and DonutChart reach none (no island, zero client JS under RSC). The island's own graph is tiny and
// server-safe: React, the tooltip card and a type, never d3 or ChartFrame, so the client bundle of
// an interactive chart is the island and the card alone.
import { dirname, join, normalize, relative, sep } from 'node:path';
import { describe, expect, test } from 'vitest';
import { isClient, PACKAGE_DIR, packageOf, sources, specifiers } from '../helpers/source';

const SRC = sources();

/** `src/<path>` of a relative specifier from `from`, with the extension the file has. */
function resolve(from: string, specifier: string): string | undefined {
  const base = relative(PACKAGE_DIR, normalize(join(PACKAGE_DIR, dirname(from), specifier)))
    .split(sep)
    .join('/');
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((file) => SRC.has(file));
}

/** Specifiers a bundle follows: `import type` and `export type` statements are erased. */
const runtimeSpecifiers = (text: string): string[] =>
  specifiers(text.replace(/\b(?:import|export)\s+type\s[^;]*?\bfrom\s*['"][^'"]+['"]/g, ''));

/** Every module reachable from `entry` over runtime relative imports, and the packages they import. */
function graph(entry: string): { modules: string[]; packages: Set<string> } {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const walk = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const specifier of runtimeSpecifiers(SRC.get(file) ?? '')) {
      const pkg = packageOf(specifier);
      if (pkg !== undefined) packages.add(pkg);
      else {
        const next = resolve(file, specifier);
        if (next === undefined) throw new Error(`${file}: cannot resolve ${specifier}`);
        walk(next);
      }
    }
  };
  walk(entry);
  return { modules: [...seen].toSorted(), packages };
}

const clientModules = (entry: string): string[] =>
  graph(entry).modules.filter((file) => isClient(SRC.get(file) ?? ''));

describe('client modules per entry', () => {
  test.each(['src/area-chart/index.ts', 'src/bar-chart/index.ts'])(
    '%s reaches exactly one: the ChartInteraction island',
    (entry) => {
      expect(clientModules(entry)).toEqual(['src/_island/chart-interaction.client.tsx']);
    },
  );

  test.each(['src/sparkline/index.ts', 'src/chart-tooltip/index.ts', 'src/donut-chart/index.ts'])(
    '%s reaches none',
    (entry) => {
      expect(clientModules(entry)).toEqual([]);
    },
  );
});

test("the island's graph: React and the tooltip card only (no d3, no ChartFrame, no core maths)", () => {
  const { modules, packages } = graph('src/_island/chart-interaction.client.tsx');
  expect(modules).toEqual([
    'src/_island/chart-interaction.client.tsx',
    'src/_shared/cx.ts',
    'src/chart-tooltip/chart-tooltip.tsx',
  ]);
  expect([...packages].toSorted()).toEqual(['react']);
});

test('the walker resolves the way the parts import, and skips type-only imports', () => {
  expect(
    runtimeSpecifiers("import type { A } from './a';\nimport { b, type C } from './b';"),
  ).toEqual(['./b']);
  expect(resolve('src/area-chart/area-chart.tsx', '../_core/path')).toBe('src/_core/path.ts');
  expect(resolve('src/index.ts', './area-chart/index')).toBe('src/area-chart/index.ts');
});
