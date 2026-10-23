---
'@nizivo/react': minor
---

Strings and locales. `@nizivo/react/i18n` exports `formatLabel(template, values, locale = 'en-US')` and the `PluralLabel` type: a label is a string or a CLDR plural object (`{ one, few, many, other }`, the categories of its locale), `values.count` picks the category through `Intl.PluralRules`, and each `{name}` placeholder is replaced (numbers formatted for the locale, unknown placeholders kept). `@nizivo/react/locales/en-US` exports `enUS`, every built-in English string as one plain object keyed by component (`enUS.pagination`, `enUS.avatarGroup`, …), the shape an app copies for its own locale and passes as `labels`; the root entry does not re-export it. AvatarGroup's `labels.more` and `labels.overflow` (the only labels whose default has a `{count}` placeholder) now take `string | PluralLabel`; their English defaults and every other label are unchanged.
