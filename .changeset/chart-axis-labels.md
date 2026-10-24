---
'@nizivo/charts': patch
---

Axis labels stay inside the chart. BarChart's first and last x labels, when wider than their bar's
band, are clamped inward to the plot's edges instead of hanging past them (in either direction); a
label that fits stays centred under its bar. The y labels' column is now a minimum width
(`--nz-chart-frame-gutter`, 2.75rem by default) that widens for longer labels, such as ar-EG's
digits or "-2000 €", instead of letting them overflow; English charts keep the 2.75rem column.
