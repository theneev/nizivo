// The package compiles with `types: []` (test/env.d.ts). The browser-lane configs make one folder in
// the system temporary directory (test/browser-engine.ts); these merge into test/css/node-fs.d.ts.
declare module 'node:fs' {
  export function mkdirSync(path: string, options: { recursive: true }): string | undefined;
}
declare module 'node:os' {
  export function tmpdir(): string;
}
