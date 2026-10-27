---
'@nizivo/react': minor
---

Surface (`@nizivo/react/surface`): a panel of the page's surface colour, with no client JavaScript.
`material="glass"` is Figma's Surface/Glass, `bg/surface` at 72 % over a 24 px backdrop blur with a
soft shadow; it stays opaque without `backdrop-filter` (Safari before 18), under
`prefers-reduced-transparency: reduce` and in forced colours.
