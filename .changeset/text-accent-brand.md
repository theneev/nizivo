---
'@nizivo/react': patch
'@nizivo/tokens': patch
---

Text and Heading `tone="accent"` now paint `--nz-text-brand`, Figma's `text/brand`: the same green/700 in Light, and green/300 (#79b993) instead of lime/300 in Dark. `--nz-text-accent` is deprecated because Figma will not add `text/accent` (accent text on `bg/inverse` uses `--nz-text-inverse-accent`), and it is removed in 0.2.0.
