// Vite's import.meta.glob, as the tests use it (raw file contents, eager; or eager modules). The package compiles with
// `types: []`, so neither vite/client nor @types/node is in scope.
interface ImportMeta {
  glob(
    pattern: string | readonly string[],
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
  /** Eager modules: test/unit/locales.test.ts loads every catalogue under src/locales. */
  glob<Module>(
    pattern: string | readonly string[],
    options: { eager: true },
  ): Record<string, Module>;
}

/** The React line the lane runs, `'19.2'` or `'19.3'` (test/react-matrix.ts). */
declare const NZ_REACT_LINE: '19.2' | '19.3';
/** The second adapter the lane runs (`NZ_ADAPTER`), or "default" (test/adapters.ts). */
declare const NZ_ADAPTER_NAME: string;
