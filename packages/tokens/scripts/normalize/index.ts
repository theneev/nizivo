// normalize(raw) → src/figma-owned/**: a pure function of the TokensBrücke export (plan §7.1, K1).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { isRecord } from '../figma/snapshot.ts';
import { render, walkTokens, type Group } from './json.ts';
import { EFFECT_STYLES, TYPOGRAPHY_STYLES, normalizeStyles } from './styles.ts';
import { normalizeVariables, type CollectionFile } from './variables.ts';

export interface RawFile {
  /** Path relative to figma/raw, with `/` separators. */
  path: string;
  json: unknown;
}

export interface Normalized {
  /** Output path relative to src/figma-owned → token tree. */
  files: Map<string, Group>;
  /** What the allowlist or the DTCG mapping left out, for the run summary. */
  skipped: string[];
}

const STYLE_FILES: Record<typeof TYPOGRAPHY_STYLES | typeof EFFECT_STYLES, string> = {
  [TYPOGRAPHY_STYLES]: 'typography.tokens.json',
  [EFFECT_STYLES]: 'effects.tokens.json',
};

export function normalize(raw: RawFile[]): Normalized {
  const files = new Map<string, Group>();
  const skipped: string[] = [];
  const collections: CollectionFile[] = [];

  for (const { path, json } of raw.toSorted((a, b) => (a.path < b.path ? -1 : 1))) {
    if (!isRecord(json)) throw new Error(`${path}: not a JSON object`);
    for (const [name, body] of Object.entries(json)) {
      if (!isRecord(body)) throw new Error(`${path}: "${name}" is not a group`);
      if (name !== TYPOGRAPHY_STYLES && name !== EFFECT_STYLES) {
        collections.push({ path, name, body });
        continue;
      }
      const tree = files.get(STYLE_FILES[name]) ?? {};
      files.set(STYLE_FILES[name], tree);
      skipped.push(...normalizeStyles(name, body, tree, path));
    }
  }
  skipped.push(...normalizeVariables(collections, files));
  return { files, skipped };
}

/**
 * Figma variable id (or text style id) → token id, across all files. This is the lookup that
 * overrides and drift checks key on (plan §15.4), so a Figma rename never orphans them.
 */
export function figmaIds(files: Map<string, Group>): Map<string, string> {
  const ids = new Map<string, string>();
  for (const tree of files.values()) {
    walkTokens(tree, (path, token) => {
      const meta = isRecord(token.$extensions) ? token.$extensions['dev.nizivo.figma'] : undefined;
      const id = isRecord(meta) ? (meta.variableId ?? meta.styleId) : undefined;
      if (typeof id === 'string') ids.set(id, path.join('.'));
    });
  }
  return ids;
}

/** Every `*.tokens.json` under `dir`, in a fixed order. */
export function readRaw(dir: string): RawFile[] {
  const out: RawFile[] = [];
  const visit = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const full = join(folder, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith('.tokens.json')) {
        out.push({
          path: relative(dir, full).split(sep).join('/'),
          json: JSON.parse(readFileSync(full, 'utf8')),
        });
      }
    }
  };
  visit(dir);
  return out.toSorted((a, b) => (a.path < b.path ? -1 : 1));
}

/** The exact bytes `normalize` writes, keyed by path relative to src/figma-owned. */
export function renderAll({ files }: Normalized): Map<string, string> {
  const paths = [...files.keys()].toSorted();
  return new Map(paths.map((path) => [path, render(files.get(path) ?? {})]));
}

/** Files under `dir` the normalizer owns: every `*.json`, so stale outputs are caught too. */
export function listOwned(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const visit = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const full = join(folder, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith('.json')) out.push(relative(dir, full).split(sep).join('/'));
    }
  };
  visit(dir);
  return out.toSorted();
}

/** Differences between what normalize would write and what is on disk (empty when in sync). */
export function diffOwned(expected: Map<string, string>, dir: string): string[] {
  const problems: string[] = [];
  for (const [path, text] of expected) {
    const full = join(dir, path);
    if (!existsSync(full)) problems.push(`missing ${path}`);
    else if (readFileSync(full, 'utf8') !== text) problems.push(`differs ${path}`);
  }
  for (const path of listOwned(dir)) {
    if (!expected.has(path)) problems.push(`not produced by normalize ${path}`);
  }
  return problems;
}
