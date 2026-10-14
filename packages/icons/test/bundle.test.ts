// Tree-shaking and size (ARCHITECTURE.md §14.2, §17.2: ≈ 0.26 KB per icon; lucide-react ships 10
// icons in 2.6 KB). Bundles small consumer entries with rolldown (through tsdown's API), minified,
// React external, and gzips the result. Bundling the root barrel must keep only the icons imported.
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'tsdown';
import { afterAll, expect, test } from 'vitest';
import { PACKAGE_DIR } from '../scripts/generate.ts';

const stage = mkdtempSync(join(tmpdir(), 'nz-icons-bundle-'));
afterAll(() => rmSync(stage, { recursive: true, force: true }));

const SRC = join(PACKAGE_DIR, 'src');
const TEN = [
  'Calendar',
  'ChevronDown',
  'Search',
  'Bell',
  'Settings',
  'User',
  'House',
  'ShoppingCart',
  'TrendingUp',
  'Download',
];

/** Bundles `source` (an ES module) and returns the minified output and its gzip size. */
async function bundle(name: string, source: string): Promise<{ code: string; gzip: number }> {
  const entry = join(stage, `${name}.ts`);
  writeFileSync(entry, source);
  const outDir = join(stage, name);
  await build({
    config: false,
    entry: [entry],
    outDir,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    minify: true,
    dts: false,
    hash: false,
    logLevel: 'silent',
    deps: { neverBundle: [/^react($|\/)/] },
  });
  const files = readdirSync(outDir).filter((file) => file.endsWith('.js'));
  const code = files.map((file) => readFileSync(join(outDir, file), 'utf8')).join('\n');
  return { code, gzip: gzipSync(code, { level: 9 }).length };
}

const barrel = JSON.stringify(join(SRC, 'index.ts'));
const one = await bundle('one', `export { Calendar } from ${barrel};\n`);
const subpath = await bundle(
  'subpath',
  `export { Calendar } from ${JSON.stringify(join(SRC, 'icons', 'calendar.ts'))};\n`,
);
const ten = await bundle('ten', `export { ${TEN.join(', ')} } from ${barrel};\n`);

test('one icon from the root barrel ships only that icon', () => {
  expect(one.code).toContain('M3 9h18');
  // Paths of other icons, including its neighbours in the barrel.
  for (const other of ['m15 18-6-6 6-6', 'm6 9 6 6 6-6', 'M18 6 6 18']) {
    expect(one.code).not.toContain(other);
  }
  expect(one.code.match(/\bd:/g)?.length ?? 0).toBeLessThanOrEqual(3);
});

test('the barrel costs nothing over the subpath import', () => {
  expect(Math.abs(one.gzip - subpath.gzip)).toBeLessThanOrEqual(8);
});

test('sizes stay within the §17.2 budget', () => {
  const perIcon = (ten.gzip - one.gzip) / (TEN.length - 1);
  console.log(
    `@nizivo/icons gzip: 1 icon ${one.gzip} B (subpath ${subpath.gzip} B), ` +
      `10 icons ${ten.gzip} B, ${perIcon.toFixed(0)} B per added icon`,
  );
  expect(ten.gzip).toBeLessThanOrEqual(2600);
  expect(perIcon).toBeLessThanOrEqual(260);
});
