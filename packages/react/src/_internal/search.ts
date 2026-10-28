// Text matching for a typed search (CommandMenu, D-dt): the locale's collation with case and
// accents ignored, as React Aria's useFilter({ sensitivity: 'base' }) compares, so "e" finds "é".
// Engine-free, so a leaf filters before the engine sees its rows. NO directive.

/** Whether `text` matches `query`: anywhere in it, or at its start. An empty query matches all. */
export type TextMatcher = (text: string, query: string) => boolean;

/** A matcher for `locale`; 'contains' finds the query anywhere, 'startsWith' only at the start. */
export function textMatcher(locale: string, mode: 'contains' | 'startsWith'): TextMatcher {
  const collator = new Intl.Collator(locale, { usage: 'search', sensitivity: 'base' });
  return (text, query) => {
    if (query.length === 0) return true;
    const haystack = text.normalize('NFC');
    const needle = query.normalize('NFC');
    if (mode === 'startsWith') {
      return collator.compare(haystack.slice(0, needle.length), needle) === 0;
    }
    for (let start = 0; start + needle.length <= haystack.length; start++) {
      if (collator.compare(haystack.slice(start, start + needle.length), needle) === 0) return true;
    }
    return false;
  };
}
