// JSON from the repo's own generators and manifests, parsed as `unknown` and narrowed by a guard,
// so a file with the wrong shape fails the docs build with its name instead of rendering wrong.
// Used by the build scripts (plain Node) and by lib/ (bundled by Next).

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parses `text` and checks it with `guard`; `what` names the file in the error. */
export function parseJson<T>(text: string, guard: (value: unknown) => value is T, what: string): T {
  const value: unknown = JSON.parse(text);
  if (!guard(value)) throw new Error(`docs: ${what} does not have the expected shape.`);
  return value;
}

export interface PackageExports {
  exports: Record<string, unknown>;
}

/** A package.json with an exports map. */
export function hasExports(value: unknown): value is PackageExports {
  return isRecord(value) && isRecord(value.exports);
}
