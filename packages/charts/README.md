# @nizivo/charts

Server-first SVG charts for Nizivo UI, with one small interaction island. Themed by
[`@nizivo/tokens`](https://www.npmjs.com/package/@nizivo/tokens), and released at the same version.

**Pre-release.** 0.x versions go to the `next` dist-tag, and a minor release may break (with a
`BREAKING` note in the changelog).

## Install

```sh
pnpm add @nizivo/charts@next @nizivo/tokens@next
```

ESM only. React 19.2 or later. Browser support floor: Chrome and Edge 123, Firefox 129, Safari and
iOS 17.5.

## What is in it

- Charts render their full SVG on the server. The only client module is the ChartInteraction
  island, which receives plain JSON (pre-formatted strings): AreaChart uses it over points,
  BarChart over columns and DonutChart over its slices. Sparkline, ChartFrame, Legend and
  ChartTooltip import no client module.
- `ChartFrame` gives every chart, Nizivo's or a third-party renderer, its caption, data table,
  legend and status.
- It imports nothing from `@nizivo/react`. Its CSS (`@nizivo/charts/styles.css`) carries its own
  focus and visually-hidden rules and expects tokens from `@nizivo/tokens/tokens.css` (or
  `@nizivo/react/styles.css`).

Licensed under Apache-2.0.
