// Relative-import graphs over raw file contents (no node:fs: the package has no Node types).

/** Re-keys a glob result from "../../src/a.ts" to "src/a.ts". */
export function rekey(files: Record<string, string>, prefix: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, text] of Object.entries(files)) out.set(key.slice(key.indexOf(prefix)), text);
  return out;
}

/** Every module specifier in `import … from`, `export … from`, `import '…'` and `import('…')`. */
export function specifiers(text: string): string[] {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
  const out: string[] = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;
  for (const match of code.matchAll(pattern)) if (match[1] !== undefined) out.push(match[1]);
  return out;
}

export function join(dir: string, specifier: string): string {
  const parts = dir.split('/');
  for (const segment of specifier.split('/')) {
    if (segment === '..') parts.pop();
    else if (segment !== '.') parts.push(segment);
  }
  return parts.join('/');
}

function dirname(file: string): string {
  return file.slice(0, file.lastIndexOf('/'));
}

/** Resolves a relative specifier against the known files, trying source and dist extensions. */
export function resolve(
  files: Map<string, string>,
  from: string,
  specifier: string,
): string | undefined {
  const base = join(dirname(from), specifier);
  const stem = base.replace(/\.(js|d\.ts)$/, '');
  // A declaration file imports declarations: "./x.js" means "./x.d.ts" there.
  const candidates = from.endsWith('.d.ts')
    ? [`${stem}.d.ts`]
    : [base, `${base}.ts`, `${base}.tsx`, `${stem}.js`, `${base}/index.ts`];
  return candidates.find((candidate) => files.has(candidate));
}

export interface Graph {
  modules: Set<string>;
  externals: Set<string>;
}

/** Whole `import type { … } from '…';` and `export type { … } from '…';` statements. */
const TYPE_ONLY = /^(?:import|export) type \{[^}]*\} from '[^']+';$/gm;

/**
 * The module graph reachable from `entry` through relative imports. A source module's type-only
 * statements are erased by every compiler, so they are not edges unless `types` is set (as
 * `reactImports` skips them too); a declaration file (`.d.ts`) keeps all of its edges. Set `types`
 * to ask what a module reaches as a type (a contract's declarations), not what loads at run time:
 * a type derived from the `enUS` catalogue reaches every component's types (week 22).
 */
export function graph(
  files: Map<string, string>,
  entry: string,
  { types = false }: { types?: boolean } = {},
): Graph {
  const modules = new Set<string>();
  const externals = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || modules.has(file)) continue;
    modules.add(file);
    const text = files.get(file) ?? '';
    const code = types || file.endsWith('.d.ts') ? text : text.replace(TYPE_ONLY, '');
    for (const specifier of specifiers(code)) {
      if (!specifier.startsWith('.')) {
        externals.add(specifier);
        continue;
      }
      const target = resolve(files, file, specifier);
      if (target === undefined) throw new Error(`${file}: cannot resolve ${specifier}`);
      queue.push(target);
    }
  }
  return { modules, externals };
}

/** True when the module's first statement is the 'use client' directive. */
export function isClient(text: string): boolean {
  return /^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*\s*['"]use client['"]/.test(text);
}

/** Value exports of React 19's `react-server` build; `useId` is the only hook a T0 part may call. */
export const REACT_SERVER: ReadonlySet<string> = new Set([
  'Children',
  'Fragment',
  'cloneElement',
  'createElement',
  'isValidElement',
  'useId',
]);

/**
 * Value imports from 'react' across `modules` (type-only imports are erased). A default or namespace
 * import comes back as `default as X` or `* as X`, which no allowlist holds: `React.useState` would
 * otherwise pass unseen.
 */
export function reactImports(files: Map<string, string>, modules: Iterable<string>): string[] {
  const out: string[] = [];
  for (const file of modules) {
    const text = files.get(file) ?? '';
    for (const [, clause = ''] of text.matchAll(/\bimport\s+([^'";]*?)\s*from\s*['"]react['"]/g)) {
      if (/^type\s/.test(clause)) continue;
      const bound = clause
        .replace(/\{[^}]*\}/, '')
        .replace(/,/g, ' ')
        .trim();
      if (bound !== '') out.push(bound.startsWith('*') ? bound : `default as ${bound}`);
      for (const name of (/\{([^}]*)\}/.exec(clause)?.[1] ?? '').split(',')) {
        const trimmed = name.trim();
        if (trimmed !== '' && !trimmed.startsWith('type ')) {
          out.push(trimmed.split(/\s+as\s+/)[0] ?? trimmed);
        }
      }
    }
  }
  return out;
}
