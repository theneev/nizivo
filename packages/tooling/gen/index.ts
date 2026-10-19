/**
 * `nz gen [--check] [--root <dir>]`: derives barrels, `engine.ts`, `*.parts.ts`, the @nizivo/react
 * exports map, design/component-map.json and styles/base.css from each `component.json`
 * (ARCHITECTURE.md §6, §8.5), and copies core's render/merge-props helpers into
 * packages/charts/src/_shared (vendor.ts; §14.1).
 * `--check` writes nothing and exits 1 when any file would change (the CI drift check).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { generateBaseCss } from './base-css.ts';
import { generate, type GenResult } from './generate.ts';
import { generateVendored } from './vendor.ts';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const USAGE = 'Usage: nz gen [--check] [--root <repo root>]';

export function gen(args: string[]): number {
  let options: { check?: boolean; root?: string };
  try {
    options = parseArgs({
      args,
      options: { check: { type: 'boolean' }, root: { type: 'string' } },
    }).values;
  } catch (error) {
    console.error(`nz gen: ${error instanceof Error ? error.message : String(error)}\n${USAGE}`);
    return 1;
  }
  const root = resolve(options.root ?? REPO_ROOT);
  let result: GenResult;
  try {
    result = generate(root);
    if (result.errors.length === 0) {
      const base = generateBaseCss(root);
      result.files.set(base.file, base.content);
      const vendored = generateVendored(root);
      result.errors.push(...vendored.errors);
      for (const [file, content] of vendored.files) result.files.set(file, content);
    }
  } catch (error) {
    console.error(`nz gen: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const { files, errors } = result;
  if (errors.length > 0) {
    console.error(
      `nz gen: ${errors.length} problem${errors.length === 1 ? '' : 's'}\n  ${errors.join('\n  ')}`,
    );
    return 1;
  }

  const changed = [...files].filter(([file, content]) =>
    content === null
      ? existsSync(file)
      : !existsSync(file) || readFileSync(file, 'utf8') !== content,
  );
  const list = changed
    .map(
      ([file, content]) =>
        `${relative(root, file).split(sep).join('/')}${content === null ? ' (delete)' : ''}`,
    )
    .toSorted();

  if (options.check === true) {
    if (changed.length === 0) {
      console.log('nz gen --check: up to date');
      return 0;
    }
    console.error(
      `nz gen --check: ${changed.length} file(s) out of date; run \`pnpm nz gen\`\n  ${list.join('\n  ')}`,
    );
    return 1;
  }

  for (const [file, content] of changed) {
    if (content === null) {
      rmSync(file);
    } else {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
  }
  console.log(
    changed.length === 0
      ? 'nz gen: up to date'
      : `nz gen: updated ${changed.length} file(s)\n  ${list.join('\n  ')}`,
  );
  return 0;
}
