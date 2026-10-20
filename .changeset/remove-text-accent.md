---
'@nizivo/tokens': minor
---

BREAKING: `--nz-text-accent` is removed, as its deprecation said, together with `textAccent` in the `.` entry, `color.text.accent` in `tokens.json` and `contract.json`, and `--color-nz-text-accent` in `tailwind.css`. Use `--nz-text-brand` for accent-coloured text on page surfaces and `--nz-text-inverse-accent` on `bg/inverse`. No Nizivo component reads it.
