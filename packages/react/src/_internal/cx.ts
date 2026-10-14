/** Joins class names, skipping empty values and repeated classes. Never exported from the package. */
export function cx(...parts: ReadonlyArray<string | false | null | undefined>): string {
  const classes = new Set<string>();
  for (const part of parts) {
    if (part) for (const name of part.split(/\s+/)) if (name !== '') classes.add(name);
  }
  return [...classes].join(' ');
}
