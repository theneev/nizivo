# Week 10 results (v0.2 week 1, `@nizivo/charts`)

Recorded on 2026-10-19 (ARCHITECTURE.md §21.2 "Week 10 status"). The first week of v0.2, "Charts first": a scaffold builder, three part builders (A: AreaChart, Sparkline, ChartTooltip and the ChartInteraction island; B: BarChart and DonutChart; C: the conformance suite, the stroke spec and the charts-only fixture), a docs builder and an integrator, in one tree. The react weeks' files (`W2-RESULTS.md` to `W9-RESULTS.md`) live in `packages/react`; this one sits in the package it measures. Every number below comes from a command run on 2026-10-19; nothing is committed, pushed, tagged or published by the integration, and GitHub Actions stays off.

## What was built

Inventory items 1 to 6 of the plan, none dropped:

1. **Scaffold, core and seam:** the private package (0.1.0, `"private": true`, no changeset until it joins the fixed group at 0.2); `_core` scales (`linear`, `band`, `point`, `valueDomain`, the structural `ScaleLike`), time ticks and geometry; `_core/path.ts` (D-av); `ChartFrame` on `chart-frame.contract.ts`; `Legend`; the four statuses; the data table; HTML tick labels on grid tracks. `nz gen` writes charts' copies of react's `cx`, `mergeProps` and `render`. Charts imports nothing from `@nizivo/react` (oxlint rule and a test on each side).
2. **The seam's proof:** the K9 conformance suite (a third-party `<svg>` child, a stand-in Nizivo renderer, seven negative controls; every framed part registers in one call, and `coverage.test.ts` fails a part that does not) and the charts-only fixture (`node fixtures/runner/charts.ts`).
3. **AreaChart** with the comparison series, the **ChartInteraction island** and **ChartTooltip**.
4. **Sparkline.**
5. **BarChart** (D-au).
6. **DonutChart** (D-av, D-ba).

## What the integration changed

- **Exports.** `./bar-chart`, `./chart-tooltip`, `./donut-chart` and `./sparkline` joined `./chart-frame` and `./legend`; the barrel exports every part. **`./area-chart` is held out** (D-bc, "Size" below): AreaChart ships through the barrel, and the Next pages import it from there.
- **ChartFrame.** The hidden data table now sits in a `div.nz-chart-visually-hidden` wrapper (D-aw): the table had kept a 223 × 240 layout box. The charts-only fixture now requires the 1 × 1 box for the table too. The clip-path reveal ends outset (`inset(-0.75rem)`), so AreaChart's and Sparkline's override keyframes were deleted.
- **Forced colours (D-ax).** One mapping for every mark: lines, baseline and end dots `CanvasText`, the comparison and grid `GrayText`, the area wash `CanvasText` at 10 %, categories `Highlight` / hollow `Canvas` / `CanvasText` / `GrayText`; the legend's own rule had lost to its series rules, so marks kept their brand greens (moved from donut-chart.css into legend.css, for every legend).
- **Figma 03 fix found in the visual review:** the donut legend had 8 px rows, an auto name column and 8 px dots; Figma has 14 px rows, a fixed 120 px name column and 10 px dots. It now uses `space/3` rows (Figma 03's own on-scale fix), a name column of at most 7.5rem (`minmax(0, 7.5rem)`: Figma's 120 px wherever it fits; on a 300 px chart a fixed 120 px pushed the legend 95 px past the figure, which `donut-chart.spec.tsx` now fails) and 0.625rem dots.
- **Lanes.** `RELEASE_LANES` gains `charts-chromium`, `charts-webkit`, `charts-firefox`, `fixture-charts` and `visual-charts` (`pnpm check:full` and the release script run them); root `pnpm fixture:charts`. `NZ_DPR=2` runs the charts browser lane at DPR 2 (`test/browser-engine.ts`); the bar and donut pixel checks became DPR-aware to pass it. `react/jsx-dev-runtime` is pre-bundled (no cold-cache reload).
- **Docs.** BarChart and DonutChart previews are live (copies checked against the package examples at build time, importing their subpaths; Sparkline, ChartTooltip, ChartFrame and Legend now import their subpaths too); smoke fails any docs chunk that carries `nz-chart-interaction`; the docs build's turbo inputs include the charts examples, sources, barrel and manifest. AreaChart stays source only (a live one ships the island on every docs route, measured by the docs builder).
- **Next fixture:** `@nizivo/charts` is a dependency (`file:.packed/charts`, the fixture's own lockfile) and in `optimizePackageImports` for webpack + OPI.

## Size

`pnpm size` passes: 130 size-limit checks, 11 of them charts (after the review below; the integration had 128 and 9). Recorded with `node packages/tooling/size/measure.ts --write` (gzip, size-limit, React and ReactDOM external). A budget is measured + 10 %, never above its `CHART_TARGETS_KIB` figure (§17.2 where the plan has one):

| Entry                                                  | Measured (B) | Budget (KiB) | §17.2                               | Headroom (B) |
| ------------------------------------------------------ | -----------: | -----------: | ----------------------------------- | -----------: |
| `@nizivo/charts` (the barrel, every chart)             |        8,502 |          9.1 | all charts ≤ 12                     |          816 |
| `@nizivo/charts own: _island/chart-interaction.client` |          813 |          0.8 | island 0.8                          |            6 |
| `@nizivo/charts island with its imports`               |        1,080 |          1.2 | none (interim ceiling, review)      |          148 |
| `@nizivo/charts { AreaChart } from the barrel`         |        6,209 |          6.7 | none (interim ceiling, D-bc)        |          651 |
| `@nizivo/charts/bar-chart`                             |        3,660 |          3.6 | none (default 3.6, as AreaChart)    |           26 |
| `@nizivo/charts/donut-chart`                           |        3,093 |          3.2 | Donut 3.2                           |          183 |
| `@nizivo/charts/sparkline`                             |        1,575 |          1.7 | Sparkline ≤ 2                       |          165 |
| `@nizivo/charts/chart-frame`                           |        1,786 |            2 | none (default)                      |          262 |
| `@nizivo/charts/legend`                                |          870 |            1 | none (≤ 1 KB for server-safe parts) |          154 |
| `@nizivo/charts/chart-tooltip`                         |          413 |          0.5 | none (≤ 1 KB for server-safe parts) |           99 |
| `@nizivo/charts/styles.css`                            |        3,382 |          3.6 | none (default 5)                    |          304 |

**AreaChart is over §17.2 in every scope** (scratch esbuild run with size-limit's method, calibrated: it gives ChartFrame's 1,786 B):

| AreaChart scope                                                                                  | gzip (B) |
| ------------------------------------------------------------------------------------------------ | -------: |
| the `./area-chart` subpath, everything in                                                        |    6,179 |
| the island external (§17.2 lists the island on its own line)                                     |    5,447 |
| ChartFrame, Legend, ChartTooltip, `_shared` and the island external (r6's "own AreaChart" scope) |    3,793 |

§17.2's 3.6 KiB is 3,686 B. The integrator did not raise it (D-bc); the decision is the maintainer's (below).

The react entries were re-recorded in the same pass and no limit moved. Their `measured` values had drifted since week 9 through the committed M38 change and the 2026-10-18 token sync, not through charts: `.` 86,523 → 86,521, `css/button.css` 1,164 → 1,153, `styles.css` 15,173 → 15,159, `@nizivo/tokens/tokens.json` 10,399 → 10,468 (`packages/react/SIZES.md`, which now also carries the charts tables).

## Lanes

Run one after another (they share the vitest cache). The integration's runs; **after the review**, every charts lane was rerun on the final tree: `pnpm --filter @nizivo/charts test` 24 files, 197 tests; `test:browser` 6 files, 42 tests in each of Chromium, WebKit and Firefox at DPR 1 and again with `NZ_DPR=2`; the charts-only fixture in all three engines (its forced-colours check now covers every legend mark and tooltip swatch); 36 charts baselines re-recorded (the legend's 14 px dash moves the legend text, the tooltip's forced swatches, the island's sub-pixel crosshair), then three compares with 0 differences; `lanes.ts --only` the five charts lanes, all passing; the Next fixture re-recorded in all four modes; `TURBO_FORCE=true pnpm check` exit 0.

| Lane                                                                                                                      | Result                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @nizivo/charts test` (node and react-server projects)                                                      | 24 files, 191 tests pass (conformance: 5 files, 41 tests)                                                                                                                                                                                          |
| `test:browser`, Chromium / WebKit / Firefox, DPR 1                                                                        | 6 files, 41 tests each. Firefox failed once on a screenshot timeout while `measure.ts` ran beside it, then passed twice alone                                                                                                                      |
| `NZ_DPR=2 test:browser`, Chromium / WebKit / Firefox                                                                      | 41 / 41 each, the 14-case stroke spec included (R14 at DPR 2 is now a spec, not a scratch check)                                                                                                                                                   |
| Charts-only fixture, `node fixtures/runner/charts.ts`, all three engines                                                  | pass: axe 0 violations (light, dark, reduced motion; forced colours in Chromium), the focus ring solid 2 px in the token colour on keyboard focus only, the hidden table's wrapper 1 × 1, no CSP violation under Profile B with the control caught |
| Next, all four modes, `--record`                                                                                          | 28 of 28 pages pass in Turbopack, webpack, webpack + OPI and `next dev` (`fixtures/next/RESULTS.md`, "Week 10"); webpack failed once on react's `/namespace` tooltip wait and passed on the rerun                                                  |
| Vite and Astro, read-only                                                                                                 | pass; not recorded (their pages do not cover charts). No react page grew: Vite's pages are 5 to 22 B smaller than recorded, Astro's `/forms` and `/menu` 1 and 2 B smaller                                                                         |
| `node packages/tooling/release/lanes.ts --only charts-chromium,charts-webkit,charts-firefox,fixture-charts,visual-charts` | all 5 lanes ok (13.0, 12.8, 13.3, 16.3 and 6.1 s); `fixture:charts` now runs all three engines by default                                                                                                                                          |
| Visual, `run.ts --package charts`                                                                                         | 120 baselines recorded (24 examples × light, dark, forced, forced-dark), then two compares: 120 identical, 0 differences each                                                                                                                      |
| Visual, react                                                                                                             | 1,564 shots: 1,426 identical, 138 within the tolerance, no differences; no react baseline moved                                                                                                                                                    |
| `TURBO_FORCE=true pnpm check`, from clean                                                                                 | exit 0 in 178 s on the final tree, this file and the plan edits included (an earlier run failed in `release/plan.test.ts`, whose fake tree had no charts manifest for the new lanes; fixed, then 179 s)                                            |

**Under RSC a chart page pays only the island** (gzip, minus `/button-only`): `/chart-area` +1,230 B Turbopack (island chunk 1,056 B), +1,306 B webpack (chunk 1,198 B), re-recorded after the review (at integration: +1,216 B and +1,292 B). `/chart-area-static` (`interaction="none"`) is +0 under webpack and +1,230 B under Turbopack, which ships the imported island even though nothing renders it. `/chart-third-party` ships no charts module.

## Figma 03 against the renders

Read-only screenshots of 7275:13332 (area), 7275:13383 (bar), 7275:13451 (donut) and 7275:13286 (atoms), compared with the lane's light renders before recording. Fixed: the donut legend (above). Deviations kept, each on purpose:

- **Bar chart's top tick is 400, not 300:** the domain is niced before ticks (§14.1), so the 313 bar sits under its tick (Figma 03's own defect).
- **Bar x labels** skip 29 before the forced last label 30 when two would crowd; Figma prints both.
- **Compact numbers follow `Intl`:** "$8K" and "$123.3K", where Figma writes "$8k" and "$123.3k".
- **AreaChart shows the legend when a comparison is given**; Figma's area chart has none above the plot (the tooltip names the series).
- **Motion:** no 120 ms area-fade delay and no 160 ms hover crossfade (no tokens; hover uses `duration/fast`); the line reveals by clip-path, not a path trim; bars rise together, without Figma's stagger (a per-bar delay needs inline style).
- **Dimming is opacity** (0.35 bars and segments, 0.45 donut legend rows), not `chart/secondary` (§14.1).
- **The bar chart's y gutter** is ChartFrame's 2.75rem + 8 px, where Figma's is 36 + 12 px.
- **The bar tooltip hugs its content** ("Orders 299"), where Figma 03 uses the fixed 200 px ChartTooltip card: the card's markup costs about 150 B of JS against the bar chart's 26 B of headroom.
- **The tooltip swatch is fully rounded** (`radius/full`), where Figma has r2, and the card's inline padding is `space/4` (16 px) where Figma's 14 px is off the scale.
- **Donut legend values are right-aligned** with tabular figures, where Figma's sit left-aligned after the 120 px name column: right-aligned digits compare down the column.

## The week 10 review

Three reviewers (accessibility and behaviour; visual, Figma, size and performance; API, seams, docs and plan) filed 29 findings against the integrated tree. Each was checked against the code before anything changed.

**Fixed (23):**

- **The island's live region spoke only on the first focus (A11Y-1).** Leaving the layer now empties it, so returning by keyboard speaks the active point again (`chart-interaction.spec.tsx` tabs out and back). A key that does not move the point (End at the end) stays silent, as a slider at its end does.
- **Hovering an AreaChart added to CLS (R2-1):** 0.08 over a pointer sweep, about 0.002 a step, from moving the crosshair and dots with `left`/`top` and lifting the card with a margin. The island now moves them by `translate` in container units (`cqi`, `cqb`; the layer is a size container) and the card lifts by `transform`. A new spec sweeps 19 pointer positions: the layout boxes never move in any engine, and Chromium's Layout Instability API reports under 0.0005 in total (what is left is text reflow inside the card when the change's width changes). The island grew to 813 B (6 B under its 0.8 KiB).
- **Tooltip swatches and the comparison dot kept brand colours in forced colours (A11Y-3):** the same specificity loss legend.css had. They now map like the legend (current CanvasText, comparison and Other GrayText, cat-1 Highlight, cat-2 Canvas outlined, cat-3 CanvasText). The charts-only fixture's forced-colours check now reads every legend mark and tooltip swatch on `/frame` and `/parts` (which gained a ChartTooltip with all six series) and fails any that keeps its brand colour.
- **Sparkline ignored a consumer's `aria-label` or `aria-labelledby` (A11Y-5)**, rendering a hidden element with a name, and `label=""` rendered an image with an empty name. Any of the three names it now (one `role="img"`); an empty `label` is decorative. Three SSR tests.
- **chart/cat-1..3 had no contrast gate (A11Y-6).** Three non-text pairs on the panels join `contrast-pairs.json`: 82 checked pairs pass; the lowest is dark cat-1 on `surface-raised`, 3.06.
- **The donut's forced-colours outline shrank with the ring (A11Y-7)** to 0.6 px at 120 px. It is now 1 CSS px at any size (`vector-effect: non-scaling-stroke`).
- **Labels (A11Y-8):** AreaChart's table header is "Date" only when every x is a date, else the new `labels.category` ("Category", as BarChart); the missing-value default is "No value" in both charts.
- **AreaChart had no size gate (R2-2, R3-9),** being out of the exports map. `pnpm size` now checks `@nizivo/charts { AreaChart } from the barrel` (6,209 B, 6.7 KiB), an interim ceiling at measured + 10 %, not a §17.2 figure. The barrel's comment no longer claims every part has a subpath.
- **The island's 0.8 KiB gate measured its own code only (R2-3);** r6's figure covered the whole client part. `@nizivo/charts island with its imports` (the island, ChartTooltip and `cx`: what a page downloads) is gated at 1,080 B, 1.2 KiB, interim. The scope of §17.2's figure is the maintainer's (below). Closed by M40 (W11-RESULTS.md): §17.2's island figure is the client graph's, and the own-code entry is gone.
- **The legend's dashed mark was the engine's own dash (R2-6):** Firefox drew two long dashes, Chromium and WebKit three short ones, at 16 px. It is now Figma's 14 px swatch with a 4,3 dash drawn as a gradient, the same in every engine.
- **Deviations from Figma not listed (R2-5's tooltip width, R2-8):** added above.
- **The scale seam had nothing to plug into (R3-1):** no chart takes `xScale`/`yScale`. Recorded as D-bd: `ScaleLike` and the exported scales are for custom renderers inside ChartFrame; scale.ts, the docs, L6 and K9 now say so.
- **The Sparkline "Gap" snippet on the docs page did not compile (R3-2):** the snippet extractor treated `...UP` as a property access and left `const UP` out. The extractor now reads a spread as a use; all 24 snippets typecheck against the built package (scratch harness, `tsc` exit 0). Typechecking the snippets in the docs build waits for `apps/docs/scripts/generate.ts` to own the charts pages (Open, 7).
- **The dependency rule missed a relative path into the other package (R3-4).** Both packages' tests now fail any relative import that leaves their `src/`, each with a probe that proves the check bites.
- **Stale docs (R3-5):** the overview and the AreaChart page now quote the recorded Next results for `/chart-third-party` and `/chart-area-static`.
- **The release dry run line was wrong (R3-6):** see Unverified. RELEASING.md now says a full dry run runs the gate and every lane, so it must run alone, and names `--skip-gate --skip-lanes` as the quick rehearsal.
- **CONTRIBUTING (R3-7):** the size row (130 checks, charts, `CHART_TARGETS_KIB`), the fixture row (charts is packed too), and rows for `pnpm fixture:charts` and the charts browser lane with `NZ_BROWSER` and `NZ_DPR`.
- **The plan's file tree (R3-8)** shows the charts package as built and `fixtures/runner/charts.ts`.
- **Vocabulary (R3-11):** `data-trend` is on ChartTooltip's delta too (from `delta.trend`), and `data-x-direction` is on the figure.
- **`ChartTable` and `ChartTicks` take readonly arrays (R3-12),** so `as const` data needs no copy.
- **Charts lanes gate core releases (R3-13):** recorded as D-be.
- **The keyboard path claims (A11Y-2):** the docs and the plan said the data table is BarChart's keyboard path, but the default table is visually hidden with no Tab stop: it serves screen readers only. Every claim now says so and points sighted keyboard users at `tableView="details"`. Whether BarChart should default to it is the maintainer's (below). Closed by M40 (W11-RESULTS.md): BarChart's keyboard path is the island's column mode; DonutChart's stays `tableView="details"`, open.

**Deferred, with the reason (6):**

- **A11Y-4, Escape for a pointer-shown card without focus (WCAG 1.4.13):** a document listener costs about 70 B and the island has 6 B left. The BarChart tooltip's gap (no Escape, not hoverable: it sits beside the bar, over the next column) waits for the island's column mode. Both are stated on the docs pages. Closed by M40 (W11-RESULTS.md): Escape hides a pointer-shown card wherever focus is, and BarChart's default card is the island's (dismissable and persistent; it follows the band under the pointer).
- **R2-4, a year of daily points sends about 100 KB of HTML and 120 KB of island JSON.** A new react-server test records about 335 B of island JSON per point at 365 points, and the AreaChart page tells users to bucket daily data weekly above about 90 points. A compact payload (series names once, `announce` joined on the client) costs island bytes it does not have; rounding paths to 2 decimals changes every path, every baseline and the d3 parity tests, so it waits for the payload decision. Closed by M40 (W11-RESULTS.md): both the compact payload and 2-decimal paths, about 64 B of island JSON a point.
- **R2-5, hover states in the visual baselines:** the charts lane has no state model (charts parts have no `component.json`), so it shoots rest and keyboard focus only; the browser specs check hover opacities as numbers.
- **R2-7, one stylesheet per part:** a new export surface (`./css/*`) with a shared core sheet; for the v0.2 packaging work.
- **R3-3, one API shape across the charts:** the runtime half (key-or-function accessors and format presets in BarChart and DonutChart) does not fit BarChart's 26 B of headroom. For the maintainer before 0.2 (below). Closed by M40 (W11-RESULTS.md): one API shape in AreaChart, BarChart, DonutChart and Sparkline.
- **R3-10, `render` on Sparkline and ChartTooltip:** the vendored `renderElement` and `mergeProps` are about 0.7 KB, over Sparkline's 165 B of headroom and into the island's client graph through ChartTooltip.

No finding was rejected.

## Open, for the maintainer

1. **AreaChart's size (D-bc).** Options: (a) raise §17.2's AreaChart figure to the framed subpath (6,179 B at integration, 6,209 B after the review, about 6.7 KiB with + 10 %, which is the interim ceiling `pnpm size` holds it to now); (b) gate AreaChart's renderer scope and keep the island at 0.8 KiB, which still needs about 3.8 KiB; (c) shrink first: drop `render` from ChartFrame and Legend (about −0.7 KB per chart) and hand-write the monotone curve (about −0.4 KB), ending near 5 KB. Recommend (b) at 3.8 KiB plus (a) as the subpath's ceiling: under RSC a page pays the island only, which is gated.
   - **Answered by M40 (2026-10-20): (a), the framed `./area-chart` subpath, exported, at 7.1 KiB (`W11-RESULTS.md`).**
2. **BarChart keyboard access.** BarChart and DonutChart claim no keyboard path (`interaction="none"`). Reusing the island for bar columns needs a column mode (setting `data-highlighted`, which bar-chart.css already honours) that the 6 B of island headroom and the 26 B of bar-chart headroom cannot hold. Until then a bar's exact value reaches a sighted keyboard user only through `tableView="details"` (the hidden table serves screen readers only). Options: raise both budgets for a column mode; default BarChart (and AreaChart with `interaction="none"`) to `tableView="details"`, a visible disclosure Figma 03 does not draw; or document `tableView="details"` as the keyboard route (what the docs say now). Recommend a column mode at v0.2 with both budgets re-measured; it would also close the bar tooltip's WCAG 1.4.13 gap.
   - **Answered by M40: the island's column mode, budgets raised (bar-chart 5.7 KiB); DonutChart's keyboard stays open (`W11-RESULTS.md`).**
3. **The defaults with no §17.2 figure:** bar-chart 3.6, chart-frame 2, legend 1, chart-tooltip 1, styles.css 5 KiB (now recorded at measured + 10 %). Confirm, or give figures.
   - **Answered by M40: confirmed as §17.2 figures (bar-chart 3.6, then 5.7 by item 2) (`W11-RESULTS.md`).**
4. **The island's role** (`application`, D-ay) until the manual screen-reader pass; **forced colours** (D-ax) for the accessibility owner.
   - **Answered by M40: `role="application"` kept until the screen-reader pass; forced colours stay with the accessibility owner (`W11-RESULTS.md`).**
5. **`xDirection="auto"`** mirrors the labels but not the plot (the island would need the resolved direction). Options: resolve it on the client (island bytes) or drop `'auto'` before 0.2.
   - **Answered by M40: resolved, the plot mirrors under `dir="rtl"` and the island reads the direction after hydration (`W11-RESULTS.md`).**
6. **Charts-only results:** record them in `fixtures/charts-only/results/` at 0.2, or keep temporary files only.
   - **Answered by M40: recorded in `fixtures/charts-only/results/` (`W11-RESULTS.md`).**
7. **`nz api` for charts** (the docs props tables are hand-written today) and a charts route generator in the docs, so AreaChart's preview can go live without the site-wide island, and the docs build can typecheck every snippet it shows.
   - **Answered by M40: built, `contracts/api/charts/**` and generated charts docs routes (`W11-RESULTS.md`).**
8. **The island's figure (§17.2: 0.8 KB).** r6's 0.6 KB estimate was for the whole client part; the gate applies 0.8 KiB to the island's own code (813 B, 6 B of headroom), and what a page downloads is 1,080 B (interim ceiling 1.2 KiB). Options: keep 0.8 for own code and confirm a client-graph figure; or apply 0.8 to the graph and cut the card (render a minimal card in the island instead of ChartTooltip). Either way, Escape for a pointer-shown card (WCAG 1.4.13, about 70 B) needs room first.
   - **Answered by M40: the figure applies to the client graph, 1.2 KiB for week 10's graph, 1.6 KiB with the approved features; the own-code entry is dropped (`W11-RESULTS.md`).**
9. **One API shape across the charts before 0.2 (R3-3).** Today AreaChart takes a key or `(datum, index)` function for `x`/`y`, format presets or Intl options, `xTickEvery`, `AreaChartLabels extends ChartFrameLabels`, and keeps the figure attributes in `AreaChartElementProps`; BarChart and DonutChart take `(datum)` functions, Intl options only (`{ maximumFractionDigits: 0 }` by default), `xTicks`/`yTicks`, `Partial<ChartFrameLabels & XLabels>`, and include the figure attributes in `XProps`. Recommend: the key-or-function `Accessor` and Intl-only `format` (as react's Delta and Meter) in all three, `xTicks: { every?, max? }` plus `yTicks` on both cartesian charts, `XLabels extends ChartFrameLabels`, and `XProps` including the figure attributes, as react's parts do. It needs bar-chart headroom (about 40 B) first.
   - **Answered by M40: one API shape, as recommended (`W11-RESULTS.md`).**
10. **Long series.** Keep the per-point island JSON (about 335 B a point) with the bucketing advice, or build a compact payload, which costs island bytes (see 8).
    - **Answered by M40: both, the compact payload and 2-decimal paths (`W11-RESULTS.md`).**

11. **Charts lanes in every release (D-be):** keep them blocking, or make them advisory until charts joins the fixed group.
    - **Answered by M40: kept blocking (D-be) (`W11-RESULTS.md`).**

## Unverified

- Real Safari and the Safari / iOS 17.5 floor: only Playwright's WebKit 27.2 ran.
- Screen-reader output for the island (NVDA, JAWS, VoiceOver).
- Real touch hardware (the touch test dispatches synthetic pointer events); hover-only BarChart and DonutChart tooltips on touch.
- Forced colours outside Chromium's emulation (no Windows high-contrast theme, no Firefox or WebKit forced run).
- Webpack builds that import the charts barrel without `optimizePackageImports`, beyond the Next fixture's three pages.
- The full release dry run on this tree. A dry run does not stop at its preflight (it lists every blocker and carries on), but a full one runs `pnpm check` and every slow lane, so it was run after the commits, alone. The quick rehearsal (`pnpm release --skip-gate --skip-lanes </dev/null`, on the uncommitted tree) packed and checked the three published packages (allowlist, publint, attw, the directive guard, licences) with `@nizivo/charts` absent from every step; all three are on the registry at 0.1.0 (the pending changesets make 0.1.1), so `npm publish --dry-run` had nothing to run. Its blockers were the uncommitted tree, its uncommitted react and tokens files, and the npm login file.
- The v0.2 flip (dropping `private`, joining the fixed group, the release allowlists): only the scaffold's manual pack with publint and attw ran.
