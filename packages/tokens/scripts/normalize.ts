// `pnpm tokens:normalize`: figma/raw/** (TokensBrücke export) → src/figma-owned/**.
// `pnpm tokens:normalize:check`: fails when src/figma-owned differs from normalize(raw), the
// invariant that keeps Figma-owned tokens free of hand edits (plan §7.7, seam K1).
//
// Usage: node scripts/normalize.ts [--check]
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { PACKAGE_ROOT, RAW_DIR } from './figma/snapshot.ts';
import { diffOwned, listOwned, normalize, readRaw, renderAll } from './normalize/index.ts';

export const FIGMA_OWNED_DIR: string = resolve(PACKAGE_ROOT, 'src/figma-owned');

function run(check: boolean): number {
  const result = normalize(readRaw(RAW_DIR));
  const expected = renderAll(result);

  if (check) {
    const problems = diffOwned(expected, FIGMA_OWNED_DIR);
    if (problems.length === 0) {
      console.log(`src/figma-owned matches normalize(figma/raw): ${expected.size} files`);
      return 0;
    }
    console.error('src/figma-owned is out of sync with figma/raw. Run pnpm tokens:normalize.');
    for (const problem of problems) console.error(`  ${problem}`);
    return 1;
  }

  for (const path of listOwned(FIGMA_OWNED_DIR)) {
    if (!expected.has(path)) rmSync(join(FIGMA_OWNED_DIR, path));
  }
  for (const [path, text] of expected) {
    const full = join(FIGMA_OWNED_DIR, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  console.log(`Wrote ${expected.size} files to src/figma-owned`);
  for (const line of result.skipped) console.log(`  skipped ${line}`);
  return 0;
}

if (import.meta.main) {
  process.exitCode = run(process.argv.includes('--check'));
}
