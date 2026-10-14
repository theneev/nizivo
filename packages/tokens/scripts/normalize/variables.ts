// Figma variable collections (one raw file per collection and mode) → DTCG token files.
import { isRecord } from '../figma/snapshot.ts';
import { setToken, walkTokens, type Group, type Json } from './json.ts';
import { color, easing, float, px, type FloatRule, type Spring } from './values.ts';

/** Both prefixes map to `nz` until the first post-rename sync (plan §7.1, §20.3). */
export const COLLECTION_PREFIX: RegExp = /^(?:Grove|Nizivo) (.+)$/;

type Rule = FloatRule | 'color' | 'easing';

interface CollectionSpec {
  /** DTCG group the collection's variables go under. */
  group: string[];
  /** The output file, or for a moded collection the folder that holds `<mode>.tokens.json`. */
  file: string;
  /** Figma mode names; the lower-cased name is the resolver context. */
  modes?: string[];
  /** Conversion by `group/name`, then `group`, then `*`. A variable no rule covers is an error. */
  rules: Record<string, Rule>;
}

export const COLLECTIONS: Record<string, CollectionSpec> = {
  Primitives: { group: ['color', 'p'], file: 'primitives.tokens.json', rules: { '*': 'color' } },
  Color: { group: ['color'], file: 'color', modes: ['Light', 'Dark'], rules: { '*': 'color' } },
  Space: {
    group: [],
    file: 'foundation.tokens.json',
    rules: { space: 'rem', radius: 'rem', size: 'rem', 'border-width': 'px' },
  },
  Motion: {
    group: [],
    file: 'motion',
    modes: ['Default', 'Reduced'],
    rules: {
      duration: 'ms',
      stagger: 'ms',
      easing: 'easing',
      distance: 'rem',
      magnetic: 'rem',
      scale: 'number',
      tilt: 'number',
    },
  },
  Responsive: {
    group: [],
    file: 'viewport',
    modes: ['Mobile', 'Tablet', 'Desktop'],
    rules: { 'grid/columns': 'number', grid: 'rem', layout: 'rem', type: 'rem', section: 'rem' },
  },
};

const RULE_TYPE: Record<Rule, string> = {
  color: 'color',
  easing: 'cubicBezier',
  rem: 'dimension',
  px: 'dimension',
  ms: 'duration',
  number: 'number',
};

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;

function specFor(collection: string): CollectionSpec | undefined {
  const kind = COLLECTION_PREFIX.exec(collection)?.[1];
  if (kind === undefined) return undefined;
  const spec = COLLECTIONS[kind];
  if (spec === undefined) {
    throw new Error(`Collection "${collection}" is allowlisted but has no mapping in COLLECTIONS`);
  }
  return spec;
}

/** `{Grove Primitives.neutral.50}` → `{color.p.neutral.50}`, through the same collection map. */
export function alias(raw: string, where: string): string {
  const [collection = '', ...path] = raw.slice(1, -1).split('.');
  const spec = specFor(collection);
  if (spec === undefined || path.length === 0) {
    throw new Error(`${where}: alias ${raw} points outside the allowlisted collections`);
  }
  return `{${[...spec.group, ...path].join('.')}}`;
}

const isAliasString = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('{') && value.endsWith('}');

interface Converted {
  $type: string;
  $value: Json;
  spring?: Spring;
}

function convert(rule: Rule, raw: Record<string, unknown>, where: string): Converted {
  const value = raw.$value;
  if (isAliasString(value)) return { $type: RULE_TYPE[rule], $value: alias(value, where) };
  const expected = rule === 'color' ? 'color' : rule === 'easing' ? 'string' : 'dimension';
  if (raw.$type !== expected) {
    throw new Error(`${where}: expected a ${expected} variable, got ${String(raw.$type)}`);
  }
  if (rule === 'color') return { $type: 'color', $value: color(value, where) };
  if (rule === 'easing') {
    const { $value, spring } = easing(value, where);
    return spring ? { $type: 'cubicBezier', $value, spring } : { $type: 'cubicBezier', $value };
  }
  return float(rule, px(value, where));
}

export interface CollectionFile {
  /** Raw path relative to figma/raw, with `/` separators. */
  path: string;
  name: string;
  body: Record<string, unknown>;
}

interface Seen {
  spec: CollectionSpec;
  /** variableId → token path, shared by every mode of the collection. */
  paths: Map<string, string>;
  modes: Map<string, Set<string>>;
}

/**
 * Converts every allowlisted collection file into `files` (output path → token tree). Identity is
 * the Figma variable id: it must sit at the same path in every mode, and it is written to
 * `$extensions["dev.nizivo.figma"]`, so a rename moves the token without changing what it is.
 */
export function normalizeVariables(inputs: CollectionFile[], files: Map<string, Group>): string[] {
  const skipped: string[] = [];
  const seen = new Map<string, Seen>();

  for (const { path, name, body } of inputs) {
    const spec = specFor(name);
    if (spec === undefined) {
      skipped.push(`collection "${name}" (not allowlisted)`);
      continue;
    }
    const folder = path.split('/').at(-2);
    const mode =
      folder === name
        ? path
            .split('/')
            .at(-1)
            ?.replace(/\.tokens\.json$/, '')
        : undefined;
    if (spec.modes !== undefined && (mode === undefined || !spec.modes.includes(mode))) {
      throw new Error(`${path}: expected one file per mode (${spec.modes.join(', ')})`);
    }
    const out =
      spec.modes === undefined ? spec.file : `${spec.file}/${mode?.toLowerCase()}.tokens.json`;
    if (files.has(out)) throw new Error(`${path}: a second collection maps to ${out}`);
    const tree: Group = {};
    files.set(out, tree);

    const state = seen.get(spec.file) ?? { spec, paths: new Map(), modes: new Map() };
    seen.set(spec.file, state);
    const ids = new Set<string>();
    state.modes.set(spec.modes === undefined ? '' : (mode ?? ''), ids);

    walkTokens(body, (segments, raw) => {
      const where = `${path} ${segments.join('/')}`;
      const bad = segments.find((segment) => !SEGMENT.test(segment));
      if (bad !== undefined) throw new Error(`${where}: "${bad}" is not a kebab-case name`);
      const rule =
        spec.rules[segments.slice(0, 2).join('/')] ??
        spec.rules[segments[0] ?? ''] ??
        spec.rules['*'];
      if (rule === undefined) throw new Error(`${where}: no conversion rule for this group`);

      const figma = isRecord(raw.$extensions) ? raw.$extensions.figma : undefined;
      const variableId = isRecord(figma) ? figma.variableId : undefined;
      const collectionId =
        isRecord(figma) && isRecord(figma.collection) ? figma.collection.id : undefined;
      if (typeof variableId !== 'string' || typeof collectionId !== 'string') {
        throw new Error(`${where}: no Figma variable id (export with "Include Figma metadata")`);
      }
      const tokenPath = [...spec.group, ...segments];
      const known = state.paths.get(variableId);
      if (known !== undefined && known !== tokenPath.join('.')) {
        throw new Error(`${where}: ${variableId} is ${known} in another mode`);
      }
      state.paths.set(variableId, tokenPath.join('.'));
      ids.add(variableId);

      const { $type, $value, spring } = convert(rule, raw, where);
      const scopes = Array.isArray(raw.scopes) ? raw.scopes.map(String).toSorted() : [];
      const extensions: Group = {
        'dev.nizivo.figma': { variableId, collectionId, name: segments.join('/'), scopes },
      };
      if (spring !== undefined) extensions['dev.nizivo.spring'] = { ...spring };
      const token: Group = { $type, $value };
      if (typeof raw.$description === 'string' && raw.$description !== '') {
        token.$description = raw.$description;
      }
      token.$extensions = extensions;
      setToken(tree, tokenPath, token, where);
    });
  }

  for (const [file, { spec, modes }] of seen) {
    const expected = spec.modes ?? [''];
    const missing = expected.filter((mode) => !modes.has(mode));
    if (missing.length > 0) throw new Error(`${file}: missing mode file(s) ${missing.join(', ')}`);
    const [first, ...rest] = [...modes.values()];
    for (const ids of rest) {
      if (first === undefined || ids.size !== first.size || [...ids].some((id) => !first.has(id))) {
        throw new Error(`${file}: modes do not hold the same variables`);
      }
    }
  }
  return skipped;
}
