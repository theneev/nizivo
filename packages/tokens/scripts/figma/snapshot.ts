// Shared shapes and paths for the Figma extraction scripts. The snapshot follows
// node_modules/tokens-bruecke/schemas/tokens-snapshot.schema.json (raw Plugin API shapes).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const PACKAGE_ROOT: string = resolve(import.meta.dirname, '../..');
export const FIGMA_DIR: string = resolve(PACKAGE_ROOT, 'figma');
export const SNAPSHOT_PATH: string = resolve(FIGMA_DIR, 'snapshot.json');
export const RAW_DIR: string = resolve(FIGMA_DIR, 'raw');
export const TB_CONFIG_PATH: string = resolve(FIGMA_DIR, 'tb.config.json');

export const FILE_KEY = 'BIzJFf1wm8KP0YG2AVI1tP';

// Only the design system's own collections and styles are read (plan §20.3).
export const COLLECTION_ALLOW: RegExp = /^(Grove|Nizivo) /;
export const STYLE_ALLOW: RegExp = /^(Grove|Nizivo)\//;

export interface Mode {
  modeId: string;
  name: string;
}

export interface VariableCollection {
  id: string;
  name: string;
  defaultModeId: string;
  modes: Mode[];
  variableIds: string[];
  hiddenFromPublishing?: boolean;
}

export interface VariableAlias {
  type: 'VARIABLE_ALIAS';
  id: string;
}

export interface Variable {
  id: string;
  name: string;
  variableCollectionId: string;
  resolvedType: string;
  description: string;
  scopes: string[];
  codeSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>;
  valuesByMode: Record<string, unknown>;
}

export interface Style {
  id: string;
  name: string;
  description: string;
  [field: string]: unknown;
}

export interface Snapshot {
  $schema: string;
  source: {
    fileKey: string;
    extractedWith: string;
    dropped: Record<string, string[]>;
  };
  variableCollections: VariableCollection[];
  variables: Variable[];
  textStyles: Style[];
  effectStyles: Style[];
}

/** FNV-1a (32 bit) over UTF-16 code units: the same function the .figma.js scripts run. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAlias(value: unknown): value is VariableAlias {
  return isRecord(value) && value.type === 'VARIABLE_ALIAS' && typeof value.id === 'string';
}

export function isSnapshot(value: unknown): value is Snapshot {
  return (
    isRecord(value) &&
    Array.isArray(value.variableCollections) &&
    Array.isArray(value.variables) &&
    Array.isArray(value.textStyles) &&
    Array.isArray(value.effectStyles)
  );
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function readSnapshot(path: string = SNAPSHOT_PATH): Snapshot {
  const value = readJson(path);
  if (!isSnapshot(value)) throw new Error(`${path} is not a TokensBrücke snapshot`);
  return value;
}

const PRINT_WIDTH = 100;

/**
 * JSON in oxfmt's style (mirrors packages/tooling/gen/format.ts): objects expanded, arrays of
 * primitives on one line when they fit in 100 columns. Used for the files these scripts own.
 */
export function printJson(value: unknown): string {
  return `${printValue(value, 0, 0, 0)}\n`;
}

function printValue(value: unknown, depth: number, column: number, trailing: number): string {
  const inner = '  '.repeat(depth + 1);
  const outer = '  '.repeat(depth);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((item) => item === null || typeof item !== 'object')) {
      const flat = `[${value.map((item) => JSON.stringify(item)).join(', ')}]`;
      if (column + flat.length + trailing <= PRINT_WIDTH) return flat;
    }
    const items = value.map((item, index) => {
      const comma = index < value.length - 1 ? ',' : '';
      return `${inner}${printValue(item, depth + 1, inner.length, comma.length)}${comma}`;
    });
    return `[\n${items.join('\n')}\n${outer}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const lines = entries.map(([key, item], index) => {
      const comma = index < entries.length - 1 ? ',' : '';
      const head = `${inner}${JSON.stringify(key)}: `;
      return `${head}${printValue(item, depth + 1, head.length, comma.length)}${comma}`;
    });
    return `{\n${lines.join('\n')}\n${outer}}`;
  }
  return JSON.stringify(value);
}
