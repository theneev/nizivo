# `nz api` charts fixture

A two-part `@nizivo/charts` for `test/api.test.ts`, laid over a copy of `../api` (which supplies
`@nizivo/react`, `@nizivo/tokens` and the vocabulary). It has what charts has and react does not:
no `component.json`; an `export *` barrel; `Frame`, whose props are a type alias of an intersection
(`FrameProps & FrameAttributes`); `Spark`, in the barrel only (no `./spark` subpath), whose props
are a generic alias with a conditional member over a generic `Omit` alias (`Passthrough<'legend'>`);
a `_core` module that no subpath folder holds, with a call signature (`ScaleLike`) and a type
re-exported from a dependency (`CurveFactory`, from `d3-shape`); and one `styles.css` that
concatenates both part sheets, each after the layer statement. The tests rename `built/` to `dist/`
and link `packages/charts/node_modules` to the real one for React's and d3-shape's types. The
`built/` files are hand-written to match what tsdown and charts' build-css.ts print, formatted by
oxfmt.
