---
'@nizivo/tokens': minor
---

**Breaking (`tokens.json` and its types):** `tokens.json` is format 2. The provenance `figma` is now
`design` (`TokenProvenance` is `'design' | 'code-owned' | 'override' | 'proposal'`), and each
token's `figma` field (`name`, `variableId`, `styleId`) is now `design`, with `name` only. Code that
compares `provenance` with `'figma'` or reads `token.figma` changes to `'design'` and
`token.design.name`. The CSS variables, the `.` entry's references and every value are unchanged.
