import type { UserConfig } from 'tsdown';

/**
 * The one shared tsdown preset for Nizivo library packages (ARCHITECTURE.md §19.1, research r4 §3).
 *
 * - `unbundle`: one output file per source module, so `'use client'` stays on exactly the modules that
 *   declare it and the barrels stay directive-free.
 * - ESM only, `platform: 'neutral'` and `target: 'es2022'`, always explicit: tsdown's defaults
 *   (`platform: 'node'`, a target read from `engines.node`) would change the emitted syntax silently.
 * - `.d.ts` files come from oxc, which needs `isolatedDeclarations` (set in `@nizivo/tsconfig/base.json`)
 *   and no TypeScript JS API.
 * - `exports` generation is off: the explicit maps in each package.json are owned by `nz gen`.
 *
 * Overrides are merged shallowly: a nested object you pass replaces the preset's.
 */
export function libraryPreset(overrides: UserConfig = {}): UserConfig {
  return {
    entry: ['src/index.ts'],
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    unbundle: true,
    hash: false,
    clean: true,
    sourcemap: false,
    dts: { generator: 'oxc' },
    // Rolldown warns about module-level directives even though unbundled output keeps them per file.
    // The src-vs-dist directive guard is what checks that every 'use client' survived.
    checks: { moduleLevelDirective: false },
    deps: { neverBundle: [/^react($|\/)/, /^react-dom($|\/)/] },
    ...overrides,
  };
}
