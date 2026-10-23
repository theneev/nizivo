// formatLabel: Nizivo's string formatter (ARCHITECTURE.md §16.4, seam K10). Plurals are CLDR
// category objects chosen through Intl.PluralRules; there is no MessageFormat dependency, and a
// string is never built by concatenation. Server-safe. NO directive.

/** The CLDR plural categories `Intl.PluralRules` can select. */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * A label with one template per CLDR plural category of its locale, `other` required. A locale
 * lists exactly the categories `Intl.PluralRules` has for it (en-US: `one`, `other`; pl: `one`,
 * `few`, `many`, `other`). Exact-number keys (`'=0'`) are not supported.
 */
export type PluralLabel = { other: string } & Partial<
  Record<Exclude<PluralCategory, 'other'>, string>
>;

/** The values a label's placeholders read: `{count}` reads `count`. */
export type LabelValues = Readonly<Record<string, string | number>>;

/**
 * Fills a label. A `PluralLabel` picks its template by `values.count`, through
 * `new Intl.PluralRules(locale).select(values.count)` (`other` when the category is missing or
 * `count` is not a number); a plain string is used as is. Each `{name}` placeholder is replaced by
 * `values.name`: a number formatted with `Intl.NumberFormat(locale)`, a string as written. A
 * placeholder with no value stays as written: `formatLabel('+{count}', { count: 1200 })` is
 * `'+1,200'`.
 * @param locale BCP 47 tag for the plural rules and the numbers. @default 'en-US'
 */
export function formatLabel(
  template: string | PluralLabel,
  values: LabelValues = {},
  locale = 'en-US',
): string {
  const { count } = values;
  const text =
    typeof template === 'string'
      ? template
      : ((typeof count === 'number'
          ? template[new Intl.PluralRules(locale).select(count)]
          : undefined) ?? template.other);
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = Object.hasOwn(values, name) ? values[name] : undefined;
    return typeof value === 'number'
      ? new Intl.NumberFormat(locale).format(value)
      : (value ?? placeholder);
  });
}
