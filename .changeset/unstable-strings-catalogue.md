---
'@nizivo/react': minor
---

The unstable parts' built-in strings have their own catalogue, `@nizivo/react/locales/en-US-unstable`
(`enUSUnstable`, shaped like `enUS`), so `./locales/en-US`, and a translation typed `typeof enUS`,
changes only with the stable parts. CommandMenu's and DateRangePicker's strings, which shipped in
`enUS` with 0.3.0, stay there. `NizivoLabels` (`@nizivo/react/config`) covers both catalogues, so
`NizivoConfig labels` still reaches every client part, unstable ones included.
