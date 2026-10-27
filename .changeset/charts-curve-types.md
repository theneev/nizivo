---
'@nizivo/charts': patch
---

The declaration files name d3-shape's `CurveFactory` (AreaChart's and Sparkline's `curve`), so
`@types/d3-shape` is now a dependency rather than a development one: an app that typechecks its
dependencies (`skipLibCheck: false`) no longer fails on `@nizivo/charts`.
