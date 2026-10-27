# Week 26 results (v0.3 week 4: FunnelChart and Heatmap)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 26 status", §23.3 M70, §23.4 D-de and D-df).
Both follow Figma 03 (`docs/figma/15-v03-weeks-3-6.md`). Every number below comes from a command
run on the maintainer's Mac.

## What was built

- **FunnelChart (D-de)**, `@nizivo/charts/funnel-chart`: steps in order, each a bar of its share of
  the first step on a track, with its count and its share of the step before as text (Figma's
  Funnel Chart 751:319). `funnelSteps` exports the rule. Changeset: `.changeset/funnel-chart.md`.
- **Heatmap (D-df)**, `@nizivo/charts/heatmap`: a value per row and column as square cells on
  Figma's ramp, chart/primary at 8, 25, 45, 70 and 100 %, with row and column labels and a "Fewer
  … More" scale (Figma's Heatmap 751:393). `heatmapStep` and `heatmapGrid` export the rules.
  Changeset: `.changeset/heatmap.md`.
- Both are server only with no island: the picture is `aria-hidden`, the frame's data table carries
  every value, and they pass the chart conformance suite as `interaction: 'none'`. No inline style:
  bar widths are SVG attributes, cell strengths a `data-step` attribute (new in the vocabulary).
- **ChartFrame:** an open data table wider than its chart scrolls in its own box under the
  summary (`nz-chart-frame-table-scroll`).
- **Docs:** two pages, both rows in the charts index. The docs reflow check now skips visually
  hidden content: the heatmap's screen-reader table is wider than a 375 px page by design.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`). New entries start at measured + 10 %.

| Entry                       |  Before |    After | Limit                   |
| --------------------------- | ------: | -------: | ----------------------- |
| `@nizivo/charts` (barrel)   | 9,296 B | 10,372 B | 11.2 KiB (was 9.7, M70) |
| `@nizivo/charts/styles.css` | 3,783 B |  4,358 B | 4.7 KiB (was 3.7, M70)  |
| `./funnel-chart`            |       — |  2,573 B | 2.8 KiB                 |
| `./heatmap`                 |       — |  2,570 B | 2.8 KiB                 |
| `./chart-frame`             | 1,820 B |  1,820 B | 2 KiB                   |

Both new subpaths include ChartFrame (1,828 B; +8 for the table's scroll box). The barrel stays under §17.2's 12 KiB for all
charts, `styles.css` under its 5 KiB.

## Lanes (the maintainer's Mac)

All 25 release lanes on the week's code. On the first run `visual-charts` failed: the first
version of the table's scroll box (a negative margin on the disclosure) made three existing
examples' boxes 8 px wider (area-chart/static, bar-chart/negative, chart-frame/details); the scroll
moved to a box around the table and the rerun passed every lane with no existing baseline moved.
Visual regression: charts 204 shots (196 identical, 8 within the tolerance), with the 40 new
baselines; react 3,648 (3,499 and 149).

- The charts browser lanes: 120 of 120 in Chromium, Firefox and WebKit.
- The charts-only fixture's `/parts` (axe, focus-visible, visually hidden, CSP Profile B) with both
  new charts.
- The docs smoke: 137 pages, axe clean in light and in dark at 375 px.

## For the maintainer

1. **For Dayitava:** both follow Figma; the renders are the 40 new charts baselines. Two places
   differ: the funnel's first-step dash and the heatmap's empty cell (a hairline) are not drawn in
   Figma.
2. **Solid ramp steps for dark** stay a design question (M65): Figma's alphas over the dark surface
   read well in the renders, but a solid `chart/seq-1..5` would print and export more predictably.
3. **No keyboard claim:** neither chart is focusable; the table is the alternative Figma's heatmap
   description allows. Say if you want the cells focusable.

## Unverified

- Screen readers: the data tables were checked in the markup, not heard.
- The Safari/iOS 17.5 floor: the charts floor pages were not regenerated for these parts.
