---
'@nizivo/react': minor
---

Card, and so KpiTile and TrendCard, declares `--nz-surface`, the surface colour it paints in every tone (a `--nz-card-bg` override included), for any child to read with a fallback, such as `var(--nz-surface, var(--nz-bg-surface))`; it is not a token and is undefined outside a Card. On `tone="brand"` and `tone="accent"`, a Delta pill inside the Card is `bg/surface` (the nearest Card decides), so it shows on the tint (Figma draws it in `bg/success-subtle`, which equals `bg/brand-subtle`); its text colour is unchanged. Text and Heading `tone="accent"` are deprecated in favour of `tone="brand"`, which paints the same colour; they keep working.
