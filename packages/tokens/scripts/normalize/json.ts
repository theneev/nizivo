// Deterministic JSON for src/figma-owned/**: sorted group keys, oxfmt's layout.
import { isRecord, printJson } from '../figma/snapshot.ts';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Group = { [key: string]: Json };

const CHUNK = /\d+|\D+/g;

/** Numeric-aware order, so `space.2` sorts before `space.10` (no locale data involved). */
export function naturalCompare(a: string, b: string): number {
  const xs = a.match(CHUNK) ?? [];
  const ys = b.match(CHUNK) ?? [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    const x = xs[i] ?? '';
    const y = ys[i] ?? '';
    if (x === y) continue;
    const bothDigits = /^\d/.test(x) && /^\d/.test(y);
    if (bothDigits && Number(x) !== Number(y)) return Number(x) - Number(y);
    return x < y ? -1 : 1;
  }
  return xs.length - ys.length;
}

/**
 * Sorts every group's keys. Tokens (objects with `$value`) are built in canonical key order and
 * kept as they are. JavaScript always lists integer-like keys (`0`, `25`, `100`) first in
 * ascending order, so a group reads `0, 1, 2, …, 24, 0-5, 1-5`: still fixed for a given input.
 */
export function sortTree(node: Group): Group {
  if ('$value' in node) return node;
  const sorted: Group = {};
  for (const key of Object.keys(node).toSorted(naturalCompare)) {
    const child = node[key];
    if (child !== undefined) sorted[key] = isRecord(child) ? sortTree(child) : child;
  }
  return sorted;
}

export function render(file: Group): string {
  return printJson(sortTree(file));
}

/** Places a token at `path`, refusing to overwrite: two Figma sources must never share a name. */
export function setToken(root: Group, path: string[], token: Group, source: string): void {
  let node = root;
  for (const segment of path.slice(0, -1)) {
    const child = node[segment] ?? {};
    if (!isRecord(child) || '$value' in child) {
      throw new Error(`${source}: ${path.join('.')} is nested under the token ${segment}`);
    }
    node[segment] = child;
    node = child;
  }
  const leaf = path.at(-1);
  if (leaf === undefined) throw new Error(`${source}: empty token path`);
  if (leaf in node) throw new Error(`${source}: two Figma sources map to ${path.join('.')}`);
  node[leaf] = token;
}

/** Calls `visit` for every token (an object with `$value`) under `node`, skipping `$` keys. */
export function walkTokens(
  node: Record<string, unknown>,
  visit: (path: string[], token: Record<string, unknown>) => void,
  path: string[] = [],
): void {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || !isRecord(child)) continue;
    if ('$value' in child) visit([...path, key], child);
    else walkTokens(child, visit, [...path, key]);
  }
}
