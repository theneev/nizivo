# @nizivo/charts

Server-first SVG charts for Nizivo UI, with one small interaction island (ARCHITECTURE.md §14.1).
Private while v0.2 builds it; it joins the fixed release group and publishes at v0.2.

- Charts render their full SVG on the server. The only client module is the ChartInteraction
  island, which receives plain JSON (pre-formatted strings): AreaChart uses it over points and
  BarChart over columns. DonutChart, Sparkline, ChartFrame, Legend and ChartTooltip import no
  client module.
- `ChartFrame` gives every chart, Nizivo's or a third-party renderer, its caption, data table,
  legend and status.
- It imports nothing from `@nizivo/react`. Its CSS (`@nizivo/charts/styles.css`) carries its own
  focus and visually-hidden rules and expects tokens from `@nizivo/tokens/tokens.css` (or
  `@nizivo/react/styles.css`).

Licensed under Apache-2.0.
