// The heavy-module rule (ARCHITECTURE.md §4.1 L6, seam ledger K8): @nizivo/charts imports nothing
// from @nizivo/react, at runtime or in its examples, and declares no dependency on it. Its runtime
// imports are React, d3-shape and d3-array only (§14.1). The other direction, @nizivo/react never
// importing charts, is packages/react/test/unit/module-graph.test.ts. oxlint enforces both in the
// editor (.oxlintrc.json); these tests are what fails the gate.
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, test } from 'vitest';
import { PACKAGE_DIR, packageOf, sources, specifiers, SRC_DIR } from '../helpers/source';

const RUNTIME = new Set(['react', 'react-dom', 'd3-shape', 'd3-array']);
const SRC = sources();

/** Relative specifiers that resolve outside src/, as `file → specifier` (none may). */
function escapes(files: Map<string, string>): string[] {
  return [...files].flatMap(([file, text]) =>
    specifiers(text)
      .filter((specifier) => specifier.startsWith('.'))
      .filter((specifier) => {
        const target = relative(SRC_DIR, resolve(dirname(join(PACKAGE_DIR, file)), specifier));
        return target === '..' || target.startsWith(`..${sep}`);
      })
      .map((specifier) => `${file} → ${specifier}`),
  );
}

function imports(): Array<{ file: string; pkg: string }> {
  return [...SRC].flatMap(([file, text]) =>
    specifiers(text).flatMap((specifier) => {
      const pkg = packageOf(specifier);
      return pkg === undefined ? [] : [{ file, pkg }];
    }),
  );
}

describe('@nizivo/charts depends on no part of @nizivo/react', () => {
  test('no source or example imports @nizivo/react (or any other @nizivo package)', () => {
    expect(SRC.size).toBeGreaterThan(5);
    expect(imports().filter(({ pkg }) => pkg.startsWith('@nizivo/'))).toEqual([]);
  });

  test('runtime imports are react, react-dom, d3-shape and d3-array only', () => {
    expect(imports().filter(({ pkg }) => !RUNTIME.has(pkg))).toEqual([]);
  });

  test('package.json declares no @nizivo/react in any dependency field', () => {
    const manifest: unknown = JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8'));
    const fields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
    const named = fields.flatMap((field) => {
      const value: unknown =
        typeof manifest === 'object' && manifest !== null
          ? Reflect.get(manifest, field)
          : undefined;
      return typeof value === 'object' && value !== null ? Object.keys(value) : [];
    });
    expect(named.filter((name) => name === '@nizivo/react')).toEqual([]);
    expect(named).toContain('@nizivo/tokens');
  });

  test('no relative import leaves src/ (a path into ../react/src would bundle react code)', () => {
    expect(escapes(SRC)).toEqual([]);
  });

  test('the helper finds a relative import that leaves src/', () => {
    const probe = new Map([
      [
        'src/area-chart/probe.ts',
        "import { cx } from '../../../react/src/_internal/cx';\nimport { x } from '../_core/x';",
      ],
    ]);
    expect(escapes(probe)).toEqual(['src/area-chart/probe.ts → ../../../react/src/_internal/cx']);
  });

  test('the helper finds a forbidden import (the rule cannot pass vacuously)', () => {
    const probe = "import { Button } from '@nizivo/react/button';\nimport x from './x';";
    expect(specifiers(probe).map(packageOf)).toEqual(['@nizivo/react', undefined]);
  });
});
