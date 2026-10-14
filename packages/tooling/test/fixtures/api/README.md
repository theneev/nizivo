# `nz api` fixture

A two-component `@nizivo/react` for `test/api.test.ts`: `Chip` (a server component with a helper
slot, inline `@default`s, an `Omit<>` DOM base, a render prop, a constant and a function) and `Pane`
(an engine compound whose adapter adds `stateAttrs()`). The tests copy this folder, rename each
`built/` to `dist/` (which `.gitignore` excludes) and link `packages/react/node_modules` to the real
one for React's types. The `built/` files are hand-written to match what tsdown and the CSS build
print, formatted by oxfmt.
