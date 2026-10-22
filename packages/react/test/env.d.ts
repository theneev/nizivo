// Vite's import.meta.glob, as the tests use it (raw file contents, eager). The package compiles with
// `types: []`, so neither vite/client nor @types/node is in scope.
interface ImportMeta {
  glob(
    pattern: string | readonly string[],
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
}

/** The React line the lane runs, `'19.2'` or `'19.3'` (test/react-matrix.ts). */
declare const NZ_REACT_LINE: '19.2' | '19.3';
