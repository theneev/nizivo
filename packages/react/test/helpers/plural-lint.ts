// The catalogue lint (ARCHITECTURE.md §16.4, seam K10): in a catalogue for `tag`, every plural
// label (an object value) lists exactly the CLDR categories Intl.PluralRules has for that tag.

/** One problem per plural label whose categories differ from the tag's, as `component.key: …`. */
export function pluralLint(catalogue: Readonly<Record<string, object>>, tag: string): string[] {
  const expected = new Set<string>(new Intl.PluralRules(tag).resolvedOptions().pluralCategories);
  const problems: string[] = [];
  for (const [component, labels] of Object.entries(catalogue)) {
    for (const [key, value] of Object.entries(labels)) {
      if (typeof value === 'string') continue;
      const where = `${component}.${key}`;
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        problems.push(`${where}: neither a string nor a plural object`);
        continue;
      }
      const entries = Object.entries(value);
      const given = entries.map(([category]) => category);
      const missing = [...expected].filter((category) => !given.includes(category));
      const extra = given.filter((category) => !expected.has(category));
      const blank = entries.filter(([, text]) => typeof text !== 'string').map(([c]) => c);
      if (missing.length > 0) problems.push(`${where}: missing ${missing.join(', ')} for ${tag}`);
      if (extra.length > 0) problems.push(`${where}: ${extra.join(', ')} not used by ${tag}`);
      if (blank.length > 0) problems.push(`${where}: ${blank.join(', ')} not a string`);
    }
  }
  return problems;
}
