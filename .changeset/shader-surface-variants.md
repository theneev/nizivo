---
'@nizivo/react': minor
---

The unstable `ShaderSurface` has every type the design's Shader Surface has: `contour` and
`contour-dark` (topographic lines), `dot-matrix` (a grid of dots in slow waves, always dark),
`glow-orb` and `glow-orb-dark` (GlowOrb's sphere in a glow), `rays` (fine strands of light) and `mesh`
(a soft four-colour field), beside `aurora` and `aurora-dark`. Each variant's shader loads when the
first surface of that variant mounts. BentoTile's square and tall tiles take Glow Orb and Contour, as
the design draws them. The colour hooks are now `--nz-shader-surface-ground` and
`--nz-shader-surface-tone-1` to `-tone-3`, for every variant. GlowOrb and ShaderSurface now give
their WebGL context back when they unmount, so a page that mounts many in turn never runs out.
