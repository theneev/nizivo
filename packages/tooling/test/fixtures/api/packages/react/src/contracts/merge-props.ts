// Fixture: a shallow merge, enough for the adapter to call.
export function mergeProps(
  ...sources: ReadonlyArray<Record<string, unknown> | undefined>
): Record<string, unknown> {
  return Object.assign({}, ...sources);
}
