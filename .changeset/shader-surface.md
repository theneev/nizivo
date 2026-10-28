---
'@nizivo/react': minor
---

New, unstable: `ShaderSurface` (`@nizivo/react/unstable/shader-surface`), the design's Shader Surface
as a dependency-free WebGL background, with Aurora first: `variant="aurora"` follows the theme and
`"aurora-dark"` stays dark on a light page. Pass it as CtaBand's `background`, BentoTile's
`background` or ProfileCard's `cover`, which then drop their CSS stand-ins; CtaBand keeps a soft dark
scrim behind its text. It shares GlowOrb's runtime: it draws only on screen, at a pixel ratio of at
most 2, one still frame under Reduced motion, and shows a CSS poster on the server and where WebGL is
missing.
