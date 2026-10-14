/**
 * `nz api [--check] [--root <dir>]`: regenerates `contracts/api/**` from the built `@nizivo/react`
 * (ARCHITECTURE.md §6, §18.1, §18.2; API-JSON.md). It reads `dist`, so build first.
 * `--check` writes nothing and exits 1 when any file would change, with a summary of each change.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { type ApiResult, generateApi } from './generate.ts';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const USAGE = 'Usage: nz api [--check] [--root <repo root>]';
/** Lines of each changed file shown by `--check`. */
const SHOWN = 3;

export function api(args: string[]): number {
  let options: { check?: boolean; root?: string };
  try {
    options = parseArgs({
      args,
      options: { check: { type: 'boolean' }, root: { type: 'string' } },
    }).values;
  } catch (error) {
    console.error(`nz api: ${error instanceof Error ? error.message : String(error)}\n${USAGE}`);
    return 1;
  }
  const root = resolve(options.root ?? REPO_ROOT);
  const started = performance.now();
  let result: ApiResult;
  try {
    result = generateApi(root);
  } catch (error) {
    console.error(`nz api: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  const { files, errors } = result;
  if (errors.length > 0) {
    console.error(
      `nz api: ${errors.length} problem${errors.length === 1 ? '' : 's'}\n  ${errors.join('\n  ')}`,
    );
    return 1;
  }
  const rel = (file: string) => relative(root, file).split(sep).join('/');
  const changed = [...files]
    .filter(([file, content]) =>
      content === null
        ? existsSync(file)
        : !existsSync(file) || readFileSync(file, 'utf8') !== content,
    )
    .toSorted(([a], [b]) => (rel(a) < rel(b) ? -1 : 1));
  const took = `${Math.round(performance.now() - started)} ms`;

  if (options.check === true) {
    if (changed.length === 0) {
      console.log(`nz api --check: up to date (${files.size} files, ${took})`);
      return 0;
    }
    const summary = changed.map(([file, content]) => describeChange(rel(file), file, content));
    console.error(
      `nz api --check: ${changed.length} file(s) out of date; run \`pnpm nz api\` after \`pnpm build\`\n  ${summary.join('\n  ')}`,
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
  const list = changed.map(
    ([file, content]) => `${rel(file)}${content === null ? ' (delete)' : ''}`,
  );
  console.log(
    changed.length === 0
      ? `nz api: up to date (${files.size} files, ${took})`
      : `nz api: updated ${changed.length} file(s) (${took})\n  ${list.join('\n  ')}`,
  );
  return 0;
}

/**
 * One file's change: new, deleted, or the count of differing lines and the first few lines of the
 * changed block (between the common first and last lines, so an insertion or a deletion shows only
 * itself rather than every line it shifts).
 */
function describeChange(name: string, file: string, content: string | null): string {
  if (content === null) return `${name} (delete)`;
  if (!existsSync(file)) return `${name} (new)`;
  const before = readFileSync(file, 'utf8').split('\n');
  const after = content.split('\n');
  const removed = countMissing(before, after);
  const added = countMissing(after, before);
  let first = 0;
  while (first < before.length && first < after.length && before[first] === after[first]) {
    first += 1;
  }
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > first && endAfter > first && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore -= 1;
    endAfter -= 1;
  }
  const shown = [
    ...before.slice(first, Math.min(endBefore, first + SHOWN)).map((line) => `    - ${clip(line)}`),
    ...after.slice(first, Math.min(endAfter, first + SHOWN)).map((line) => `    + ${clip(line)}`),
  ];
  return `${name}: +${added} −${removed} lines, first change at line ${first + 1}\n${shown.join('\n')}`;
}

/** Lines of `from` that `to` does not have, counting repeats. */
function countMissing(from: string[], to: string[]): number {
  const remaining = new Map<string, number>();
  for (const line of to) remaining.set(line, (remaining.get(line) ?? 0) + 1);
  let missing = 0;
  for (const line of from) {
    const count = remaining.get(line) ?? 0;
    if (count === 0) missing += 1;
    else remaining.set(line, count - 1);
  }
  return missing;
}

function clip(line: string | undefined): string {
  if (line === undefined) return '';
  return line.length > 100 ? `${line.slice(0, 99)}…` : line;
}
