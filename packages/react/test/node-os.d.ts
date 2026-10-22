// The package compiles with `types: []` (test/env.d.ts). The browser-lane configs make one folder in
// the system temporary directory (test/browser-engine.ts); these merge into test/css/node-fs.d.ts.
declare module 'node:fs' {
  export function mkdirSync(path: string, options: { recursive: true }): string | undefined;
}
declare module 'node:os' {
  export function tmpdir(): string;
}
// The node lane's React-matrix resolve hook (test/react-matrix.setup.ts).
declare module 'node:module' {
  interface ResolveContext {
    parentURL?: string | undefined;
    conditions: string[];
  }
  interface ResolveResult {
    url: string;
    format?: string | null | undefined;
    shortCircuit?: boolean | undefined;
  }
  export function registerHooks(hooks: {
    resolve?: (
      specifier: string,
      context: ResolveContext,
      next: (specifier: string, context?: Partial<ResolveContext>) => ResolveResult,
    ) => ResolveResult;
  }): { deregister(): void };
}
