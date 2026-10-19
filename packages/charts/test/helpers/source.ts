// The package's own sources, read from disk, and the module specifiers in them (for the module
// graph and dependency-rule tests). Comments are stripped before matching, so a specifier quoted in
// a comment never counts.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const PACKAGE_DIR: string = join(import.meta.dirname, '..', '..');
export const SRC_DIR: string = join(PACKAGE_DIR, 'src');

/** `src/<path>` → contents, for every .ts and .tsx file under src/. */
export function sources(dir: string = SRC_DIR): Map<string, string> {
  const out = new Map<string, string>();
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) continue;
    const file = join(entry.parentPath, entry.name);
    out.set(relative(PACKAGE_DIR, file).split(sep).join('/'), readFileSync(file, 'utf8'));
  }
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

/** The package name of a bare specifier (`d3-shape`, `@nizivo/react`), or undefined for a relative one. */
export function packageOf(specifier: string): string | undefined {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return undefined;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** Whether the module's first statement is a 'use client' directive. */
export function isClient(text: string): boolean {
  return /^(?:\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*['"]use client['"]/.test(text);
}
