# Charts-only fixture: results

The charts-only route of ARCHITECTURE.md §5.2 and §14.1: `@nizivo/charts` with `@nizivo/tokens` and nothing of `@nizivo/react`. `fixtures/runner/charts.ts` packs the two packages, renders the chart pages on the server and serves them with only `tokens.css` and the charts `styles.css`, under CSP Profile B (`style-src-attr 'none'`), then checks axe (light, dark, reduced motion; forced colours in Chromium), the focus ring, the visually hidden table's 1 × 1 box, forced colours on every legend mark and tooltip swatch, and right to left. The page set and its checks are in the runner's header comment.

## Where the results live

`results/<engine>.json`, one file per engine (`chromium.json`, `webkit.json`, `firefox.json`), committed from week 11 (M40 item 6). Record them with:

```sh
node fixtures/runner/charts.ts --engines chromium,webkit,firefox --record
```

Without `--record` (the `fixture-charts` release lane, `pnpm fixture:charts`) the run writes to a temporary folder and leaves the tree clean. The files are deterministic: the server origin, the run's temporary folder and the repo path are replaced before writing, and the focus ring is recorded as the check's threshold (`ringMinPixels`) and its verdict (`ringDrawn`), not a raw pixel count (that count moves by a few pixels from run to run on AreaChart's layer). A re-record therefore changes only what the run found.

## Week 11 (2026-10-20)

**All three engines pass** (Chromium 156.0.8078.4, WebKit 27.2, Firefox 157.0) on the six pages `/csp-control`, `/frame`, `/statuses`, `/third-party`, `/parts` and `/rtl`: 0 axe violations in every mode run, no mark keeps a brand colour under forced colours (Chromium's emulation, the only engine that runs it), and the one CSP violation in each engine is the positive control's on `/csp-control` (with its console error in Chromium and Firefox; no other console message). `/parts` now has two keyboard stops over a plot, AreaChart's and BarChart's (the island's column mode). Run on the final week 11 tree, after `pnpm build` (`packages/charts/W11-RESULTS.md`).
