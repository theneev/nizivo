# @nizivo/charts

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
