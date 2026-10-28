---
'@nizivo/react': minor
---

New, unstable: `GlowOrb` (`@nizivo/react/unstable/glow-orb`), the voice orb as a WebGL shader with no
dependency. A glossy sphere that grows with the voice `level` (a number, or a function read each
frame), its outline moving while it listens or speaks and its light drifting so the highlight
changes angle; without a level it simulates a voice for its `state`. Pass it as VoiceOrb's `orb`.
It draws only on screen, at a pixel ratio of at most 2, one still frame under Reduced motion, and
shows VoiceOrb's CSS orb on the server and where WebGL is missing. `--nz-glow-orb-light`,
`--nz-glow-orb-deep` and `--nz-glow-orb-halo` recolour it.
