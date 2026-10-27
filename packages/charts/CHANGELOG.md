# @nizivo/charts

## 0.3.0

### Minor Changes

- 42ffb84: FunnelChart (`@nizivo/charts/funnel-chart`): steps in order, each a bar of its share of the first
  step, with its count and its share of the step before as text, drawn on the server with no client
  JavaScript (Figma 03's Funnel Chart). Screen readers read the data table: step, count and % of
  previous. `funnelSteps` exports the rule.
- 42ffb84: Heatmap (`@nizivo/charts/heatmap`): a value per row and column as a grid of cells on Figma's
  five-step ramp (`chart/primary` at 8 to 100 %), with a "Fewer … More" scale, drawn on the server with
  no client JavaScript. Screen readers read the data table, one row per row of the grid.
  `heatmapStep` and `heatmapGrid` export the rules.

### Patch Changes

- 4371483: The declaration files name d3-shape's `CurveFactory` (AreaChart's and Sparkline's `curve`), so
  `@types/d3-shape` is now a dependency rather than a development one: an app that typechecks its
  dependencies (`skipLibCheck: false`) no longer fails on `@nizivo/charts`.
- @nizivo/tokens@0.3.0

## 0.2.1

### Patch Changes

- a307bc7: Axis labels stay inside the chart. BarChart's first and last x labels, when wider than their bar's
  band, are clamped inward to the plot's edges instead of hanging past them (in either direction); a
  label that fits stays centred under its bar. The y labels' column is now a minimum width
  (`--nz-chart-frame-gutter`, 2.75rem by default) that widens for longer labels, such as ar-EG's
  digits or "-2000 €", instead of letting them overflow; English charts keep the 2.75rem column.
- Updated dependencies [79d72f3]
  - @nizivo/tokens@0.2.1

## 0.2.0

### Minor Changes

- decab77: First publish of `@nizivo/charts`: server-first SVG charts (ChartFrame, AreaChart, BarChart,
  DonutChart, Sparkline, Legend, ChartTooltip) with one small interaction island, themed by
  `@nizivo/tokens`. It joins the fixed group, so it releases at the same version as the other packages.

### Patch Changes

- Updated dependencies [001e1b4]
- Updated dependencies [a5b048a]
  - @nizivo/tokens@0.2.0
