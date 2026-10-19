// nz gen's charts vendoring (ARCHITECTURE.md §4.1 L6, §14.1): @nizivo/charts' copies of core's
// render/merge-props helpers are generated from @nizivo/react's sources and must not drift.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';
import { HEADER } from '../gen/format.ts';
import { generateVendored, VENDORED } from '../gen/vendor.ts';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = fileURLToPath(new URL('fixtures/repo', import.meta.url));
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A root holding the real react sources the vendoring reads, and a charts package.json. */
function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'nz-vendor-'));
  roots.push(root);
  for (const { from } of VENDORED) {
    mkdirSync(join(root, from, '..'), { recursive: true });
    cpSync(join(REPO, from), join(root, from));
  }
  mkdirSync(join(root, 'packages', 'charts'), { recursive: true });
  writeFileSync(join(root, 'packages', 'charts', 'package.json'), '{}\n');
  return root;
}

describe('charts vendoring', () => {
  test('the committed copies are what nz gen writes', () => {
    const { files, errors } = generateVendored(REPO);
    expect(errors).toEqual([]);
    expect(files.size).toBe(VENDORED.length);
    for (const [file, content] of files) expect(readFileSync(file, 'utf8')).toBe(content);
  });

  test('each copy: the generated header, its source named, then the source with sibling imports', () => {
    const { files } = generateVendored(REPO);
    const mergeProps = files.get(join(REPO, 'packages/charts/src/_shared/merge-props.ts')) ?? '';
    expect(mergeProps.split('\n').slice(0, 2)).toEqual([
      `// ${HEADER}`,
      '// Vendored from packages/react/src/contracts/merge-props.ts: @nizivo/charts imports nothing from @nizivo/react (§14.1).',
    ]);
    expect(mergeProps).toContain("import { cx } from './cx';");
    expect(mergeProps).not.toContain('_internal');
  });

  test('a repo without packages/charts gets nothing', () => {
    expect(generateVendored(fixture)).toEqual({ files: new Map(), errors: [] });
  });

  test('a new import in a vendored source fails instead of shipping a broken copy', () => {
    const root = tempRepo();
    const render = join(root, 'packages/react/src/contracts/render.ts');
    writeFileSync(
      render,
      `import { x } from '../_internal/glyphs';\n${readFileSync(render, 'utf8')}`,
    );
    expect(generateVendored(root).errors).toEqual([
      "packages/react/src/contracts/render.ts imports '../_internal/glyphs', which charts does not vendor: add it to VENDORED in packages/tooling/gen/vendor.ts",
    ]);
  });

  test('a rewrite that no longer matches is reported', () => {
    const root = tempRepo();
    const file = join(root, 'packages/react/src/contracts/merge-props.ts');
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replace("from '../_internal/cx'", "from './cx'"),
    );
    expect(generateVendored(root).errors).toEqual([
      "packages/react/src/contracts/merge-props.ts: expected `from '../_internal/cx'` to rewrite for packages/charts/src/_shared/merge-props.ts",
    ]);
  });
});
