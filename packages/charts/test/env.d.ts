// Vite's import.meta.glob, as the browser specs use it (raw file contents, eager): vite/client's
// types are not in scope (test/tsconfig.json has `types: ["node"]`). As packages/react/test/env.d.ts.
interface ImportMeta {
  glob(
    pattern: string | readonly string[],
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
}
