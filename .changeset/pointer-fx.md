---
'@nizivo/react': minor
---

PointerFx and `usePointerFx` (`@nizivo/react/pointer-fx`): an element that tilts toward a mouse
pointer and lifts (`effect="tilt"`), or leans toward it (`effect="magnetic"`). The hook writes
`--nz-pointer-x` and `--nz-pointer-y` once per frame; touch, pen and reduced motion leave the element
still, and the server renders only `data-pointer-fx`.
