// The package compiles with `types: []` (test/env.d.ts). These tests read stylesheets from disk,
// because Vitest empties CSS imports, `?raw` ones included.
declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
  export function readdirSync(path: URL, options?: { recursive?: boolean }): string[];
}
