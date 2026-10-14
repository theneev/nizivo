# R6 — Heavy / optional modules: charts, motion, 3D & shaders, glass, icons, fonts, media

Nizivo UI (`@nizivo/*`) · research date 2026-10-14 · scope: decide what is core, what is optional, what is rejected, and how each heavy piece plugs in or out without breaking consumers.

How the evidence was gathered (all reproducible):
- **npm registry** (`npm view … time dist-tags license`) for every version and publish date below.
- **Local bundle bench**: esbuild 0.25.10, minified ESM, `NODE_ENV=production`, React/ReactDOM external, gzip level 9 and brotli default. Script: `scratchpad/r6bench/tools/measure.mjs`, results: `scratchpad/r6bench/sizes.json`. The code-split test used rolldown 1.2.13 (`tools/split3.mjs`).
- **Local SSR tests**: `react-dom/server` `renderToString` on React 19.3.0 (`scratchpad/r6bench/ssrtest/*.mjs`). These show what each library actually puts in server HTML.
- **Font feature inspection**: fontTools on the shipped woff2 files (`tools/feat.py`).
- **Figma file read** (read-only `get_metadata` and `use_figma`) of page "09 3D, Shader & Motion Lab" (`7275:19609`), plus the existing snapshots `figma/00-tokens-and-styles.md`, `01-foundations.md` and `03-data-viz.md`.
- **Primary docs and changelogs** (cited inline; full list at the end). Anything not verified is marked **UNVERIFIED**.

---

## 0. TL;DR

| Area | Recommendation | Confidence |
|---|---|---|
| **Charts** | Build our own thin SVG/HTML charts in `@nizivo/charts`. The only runtime deps are **`d3-shape`** (path math, ~4 KB gz) and **`d3-array`** (ticks/bisect, ~0.9 KB). Write a ~10-line linear scale instead of using `d3-scale` (7.8 KB gz on its own). Geometry is computed in Server Components and emitted as static SVG. A ~0.6 KB client island adds crosshair, tooltip and keyboard support. No chart library ships in core. Optional adapters (`ChartFrame` around any renderer) cover future heavy needs. | High |
| **Motion** | CSS-first. Figma springs are **baked to CSS `linear()` at build time** (verified: `spring(1,260,24,0)` → `600ms linear(…)`), with `@starting-style` and `allow-discrete` for enter/exit and CSS-variable stagger. Tiny own hooks handle tilt/magnetic (0.48 KB) and count-up (0.5 KB). **Motion (motion.dev) 14.x is an optional peer**, used only for layout/drag/presence, via `LazyMotion` + `m`. Reject GSAP (license) and react-spring. | High |
| **3D / shaders** | The Figma "3D" items are **raster renders**, not real-time 3D. The real-time items are **two Figma shader fills** (Rays hero, Mesh gradient). Ship them in an explicitly experimental **`@nizivo/lab`** as an own WebGL2 `ShaderSurface` (1.4 KB gz) with a server-rendered CSS poster, offscreen/tab pausing, a DPR cap, reduced-motion static frames and context-loss fallback. Paper Shaders (Apache-2.0) is an optional adapter. three.js/R3F only behind a lazy optional subpath, if ever. | High (architecture) / Medium (Paper adapter) |
| **Glass** | Frosted glass (`backdrop-filter: blur() saturate()`, Baseline since 2024-09-16) as a token-driven `Surface` variant, with opaque fallbacks for no-support, `prefers-reduced-transparency` and `forced-colors`. **Do not ship SVG-displacement "liquid glass"** in v1: it is Chromium-only and `@supports` lies in Firefox. | High |
| **Icons** | `@nizivo/icons` is **generated** from pinned `lucide-static` SVGs. The Figma set is Lucide: 74 icons, 20 px, 1.6 stroke. Output is one server-safe ESM module per icon plus an optional sprite. `@nizivo/ui` takes icons as **ReactNode slots**, so any set plugs in. The Instagram glyph comes from Simple Icons (CC0) or brand assets, because Lucide v1 removed brand icons. | High |
| **Fonts** | Ship **no font files**. Expose `--nz-font-sans/mono` tokens that resolve `var(--font-geist-sans)` (Next `geist` pkg), then `"Geist Variable"` (Fontsource), then system fallbacks. Use `font-variant-numeric: tabular-nums` for Numeric styles; `tnum` exists in both the Vercel and the Google builds (verified). | High |
| **Media** | `Image` primitive (plain `<img>` with good defaults) plus **ReactNode `media` slots** on ProductCard, ShoppablePost and similar. No `next/image` dependency and no React-context image provider, because Server Components can't read context. | High |

Measured headline numbers (min+gzip, React external): Recharts area chart **107.7 KB**; Nivo line **94.3 KB**; ECharts line+bar+pie **197.2 KB**; Chart.js **64.8 KB**; visx subset **27.3 KB**; uPlot **22.7 KB**; **own area chart 3.2 KB** (0 KB client in RSC; island 0.6 KB). Motion `motion.div` **44.2 KB**; LazyMotion async **14.2 KB initial + 17.4 KB deferred**; three.js minimal scene **130.5 KB**; R3F + three **244.2 KB**; own WebGL2 shader runner **1.4 KB**.

---

## 1. What the Figma file actually asks for (relevant to this topic)

| Figma evidence | Implication |
|---|---|
| 03 Data Viz: Legend Item, Tooltip, Sparkline, Area, Bar, Donut, Progress Bar, Progress Ring, plus ghost **Funnel** and **Heatmap** (see `03-data-viz.md`). Hover-only interaction (`SMART_ANIMATE 160 ms`). Motion spec: line path-trim over `duration/chart-draw` (700 ms), area fade after 120 ms, bars grow from baseline staggered by `stagger/item` (40 ms), tooltip fades with 4 px travel. | Small, fixed chart vocabulary that is entirely SVG/HTML-expressible. No zoom, brush or 10k-point series. All animation is CSS-expressible. |
| Chart colors are fully tokenised (`chart/*`, `chart/cat-1..3`). Categorical slots are fixed, never cycled; the 4th+ series folds into "Other". | Theming via CSS custom properties on SVG/HTML, with no JS theme object. |
| A11y failures already found: axis labels 4.31:1 and `chart/neutral` 1.57:1 (`03-data-viz.md`). No focus/keyboard, empty, loading or error states drawn. | The library must supply keyboard, data-table and state patterns the design lacks. |
| **Lab page 09** (`7275:19609`), read today: "Rays hero" ×2 and "Mesh + glass" frames use **`SHADER` fills**. Rays has 9 properties with hard-coded colors #f6f5ef, #f5a63f, #c5e162, #216b48; Mesh has 7. None are bound to variables. `list_file_shaders` returns `[]` and `get_shader` rejects the ids, so the **shader source is not retrievable via MCP (UNVERIFIED code)**. Figma's Config 2026 shaders are WGSL/WebGPU ([TechTimes](https://www.techtimes.com/articles/319041/20260625/figma-config-2026-code-layers-challenge-cursor-gpu-shaders-hit-paid-plans.htm), [Figma help](https://help.figma.com/hc/en-us/articles/39582753756695-What-s-new-from-Config-2026)). | Two full-bleed procedural backgrounds. They must be ported (WGSL→GLSL ES 3.0) or approximated. They are decorative, so a static poster is an acceptable fallback. |
| Lab "3D render library" tiles and the Cover "Render · Orb/Bag" are **`IMAGE` fills** (`scaleMode FIT`). Description: "Clay and frosted green glass, one light. Always on a tinted card, never on white." | **No real-time 3D is required by the design.** Ship them as optimized images (app assets, not library assets). |
| Glass card (`7275:19634`) = effect style **`Grove/Surface/Glass`** (background blur 24 + drop shadow 40) with a 42 %-opacity solid fill. `Surface/Liquid Glass` (Figma GLASS effect) exists as a style. | Frosted glass is a real token. Liquid glass is aspirational. |
| "Motion specimens": Toast enter (`duration/base · easing/enter`), Chart draw, Card lift (`distance/lift · scale/hover`), Skeleton pulse (`duration/slower · loop`). | All CSS. |
| Icons: **Lucide**, 74 icons, 20 px, 1.6 stroke, recoloured via `icon/*` tokens. The masters are unparented in Figma. A `Social/Instagram` instance exists (`01-foundations.md`). | Generate from Lucide. Brand icons need another source. |
| Type: Geist / Geist Mono, weights 400/500/600 only. Numeric styles need tabular figures, but Figma doesn't apply `tnum` (`01-foundations.md`). | 3 weights. Tokens set `tabular-nums` explicitly. |
| Motion tokens: `easing/spring = spring(1, 260, 24, 0)` and `spring-soft = spring(1, 170, 26, 0)`, which is not CSS; Reduced mode = linear, 0 travel. | Bake to `linear()` at build time (§3.3). |

---

## 2. Charts

### 2.1 State of the art (registry data queried 2026-10-14)

| Library | Latest | Published | License | Renderer | Notes |
|---|---|---|---|---|---|
| Recharts | 3.10.1 (canary 3.11.0-canary.6) | 2026-07-25 | MIT | SVG (React) | 3.0 made `accessibilityLayer` default-on ([release notes](https://newreleases.io/project/github/recharts/recharts/release/v3.0.0), [a11y wiki](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility)). **SSR renders nothing in 3.x**: [issue #5997](https://github.com/recharts/recharts/issues/5997) is still open. The maintainer says SSR "has never been explicitly supported", with "about 35 `useEffect` calls" syncing state; [discussion #6390](https://github.com/recharts/recharts/discussions/6390) proposes a two-pass render. |
| visx (Airbnb) | 4.0.0 | 2026-06-11 | MIT | SVG primitives | v4 is stable and requires React 18/19 ([releases](https://github.com/airbnb/visx/releases)). Community worried about cadence ([discussion #1908](https://github.com/airbnb/visx/discussions/1908)). |
| Nivo | 0.99.0 | 2025-05-23 | MIT | SVG/HTML/canvas | No release in about 17 months. React 19 support arrived via a react-spring upgrade ([issue #2618](https://github.com/plouc/nivo/issues/2618)). The FAQ calls it "server-render friendly" for SVG/HTML variants ([FAQ](https://nivo.rocks/faq/)). |
| ECharts | 6.1.0 | 2026-05-19 | Apache-2.0 | canvas/SVG | 6.0 released 2025-07-30 with new themes and dark mode ([v6 features](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature)). Server SVG-string SSR since 5.3 and a "<4KB lightweight client runtime" since 5.5. That runtime has **no mouse-move tooltips** ([SSR handbook](https://apache.github.io/echarts-handbook/en/how-to/cross-platform/server/)). |
| Chart.js | 4.5.1 | 2025-10-13 | MIT | canvas | No SSR markup. A11y is manual (canvas fallback). |
| uPlot | 1.6.32 | 2025-03-14 | MIT | canvas | Fastest for big time series. No SSR, a11y manual. |
| d3-shape / d3-array / d3-scale | 3.2.0 / 3.2.4 / 4.0.2 | 2022-12 / – / 2021-09 | ISC | math only | Stable and finished. These are pure functions that run anywhere (server, worker, client). |

### 2.2 Measured cost (min + gzip, React external; `sizes.json`)

| Bundle | gz | br | min |
|---|---|---|---|
| **Own AreaChart (own linear scale + d3-shape + d3-array)** | **3.2 KB** | – | 8.9 KB |
| Own crosshair/keyboard island only (client part) | **0.6 KB** | – | 1.1 KB |
| Own Donut (d3-shape arc/pie) | 2.9 KB | – | 7.2 KB |
| Own Area+Bar+Donut+island **using d3-scale** | 13.3 KB | 11.7 | 34.9 |
| d3-shape: area+line+arc+pie+monotoneX | 4.0 KB | – | 11.4 |
| d3-scale: `scaleLinear` alone (pulls interpolate/color/format) | 7.8 KB | – | 19.1 |
| d3-array: ticks+nice+extent+max+bisector | 0.9 KB | – | – |
| d3 subset incl. `scaleTime` (d3-time-format) | 17.6 KB | 15.4 | 50.6 |
| visx: shape+scale+group+axis+tooltip | 27.3 KB | 24.0 | 76.5 |
| uPlot | 22.7 KB | 20.4 | 50.8 |
| Chart.js line+bar+doughnut (tree-shaken registration) | 64.8 KB | 56.3 | 185.7 |
| Nivo ResponsiveLine | 94.3 KB | 79.9 | 269.7 |
| Nivo Line+Bar+Pie | 115.1 KB | 96.6 | 342.6 |
| Recharts AreaChart+axes+tooltip+ResponsiveContainer | 107.7 KB | 90.1 | 366.1 |
| Recharts Area+Bar+Pie+legend | 121.3 KB | 101.0 | 422.7 |
| ECharts 6 core + line/bar/pie + grid/tooltip/legend/aria + SVG renderer | 197.2 KB | 166.6 | 571.6 |
| ECharts SSR client runtime (`echarts/ssr/client`) | 0.4 KB | 0.3 | 0.6 |

### 2.3 SSR reality check (local `renderToString`, React 19.3.0)

| Library | Server HTML |
|---|---|
| Recharts 3.10.1 (fixed 600×240, `isAnimationActive=false`) | `<div class="recharts-wrapper" style="…width:600px;height:240px"></div>` — **no SVG at all**. Same for Bar, Pie and ResponsiveContainer. |
| visx 4 (`AreaClosed`, `LinePath`) | Full `<path d="M0,180L200,60…">` |
| Nivo `Line`/`Bar`/`Pie` (fixed size) | Full geometry (6.5 KB of HTML for the line). |
| Nivo `Responsive*` | No geometry by design. Its measure hook starts at `{width:0,height:0}` and fills via `ResizeObserver` in an effect (verified in `@nivo/core` dist). My harness also hit an element-type error on `ResponsiveLine` that persisted after an interop fix. It is likely a CJS/ESM harness artifact rather than a Nivo bug, but this is unconfirmed; the no-geometry conclusion rests on the source code, not on this error. |
| Own thin AreaChart (`samples/thin-area-ownscale.js`) | Full `<figure><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="…">` with gridlines, area and line paths, plus HTML labels. |

### 2.4 Options vs criteria

| Criterion | Own thin (d3-shape) | visx | Recharts 3 | Nivo | ECharts 6 | Chart.js | uPlot |
|---|---|---|---|---|---|---|---|
| Client JS (Figma set) | **0–3 KB** (RSC) / ~7 KB (SPA) | 27 KB+ | 108–121 KB | 94–115 KB | 197 KB (or SSR + 0.4 KB without tooltips) | 65 KB | 23 KB + glue |
| Static SVG from server, hydrate only interactivity | **Yes, designed for it** | Yes (manual) | **No** (empty shell) | Fixed-size only | SVG string, separate runtime | No | No |
| Hydration-mismatch risk | None (no measuring) | Low | n/a | High with Responsive | Low | n/a | n/a |
| A11y (data table, keyboard on points, ARIA) | We own it (§2.6) | Nothing built in | `accessibilityLayer` (keyboard), client only | Partial, client only | `aria` auto description | Manual | Manual |
| Theming via CSS vars | **Native** (`fill: var(--nz-chart-primary)`) | Native | Props accept `var()` strings | JS theme object | JS theme; canvas can't read `var()` | JS | JS |
| Animation | CSS, tokenised, zero JS | Bring your own | Built-in JS (react-smooth) | react-spring | Built-in | Built-in | None |
| Fit to Figma visuals | Exact | Exact | Needs overrides | Needs overrides | Needs overrides | Canvas look | Canvas look |
| Maintenance risk | Ours (small surface); d3 is finished software | Medium | Medium (SSR regression open) | High (stale) | Low | Low | Medium (single maintainer, UNVERIFIED) |
| License | ISC deps | MIT | MIT | MIT | Apache-2.0 | MIT | MIT |

### 2.5 Recommendation

**Build `@nizivo/charts` as thin, server-first SVG/HTML components on `d3-shape` + `d3-array`, with our own ~10-line linear/band scales.**

Rationale:
- The Figma vocabulary is about 10 small charts. Recharts, Nivo and ECharts are 30–60× larger than needed. Recharts 3 cannot server-render at all, which defeats "static SVG on the server, hydrate interactivity only".
- `d3-shape` is the only hard part: monotone curves, arcs with `cornerRadius`/`padAngle`, pie layout. It is 4 KB gz, ISC, side-effect-free and runs on the server.
- `d3-scale` costs 7.8 KB just for `scaleLinear` because it pulls interpolators, colors and format. Our need (continuous linear, band, `nice`, ticks via `d3-array`) is about 15 lines. Measured: the own-scale AreaChart is **3.2 KB** vs **10.4 KB** with d3-scale.
- Client cost depends on the framework, because the `"use client"` boundary only exists under RSC:
  - **Next.js App Router (RSC)**: geometry runs only on the server, so 0 KB for the chart and **0.6 KB** for the `ChartCrosshair` island. Only plain `{px, label, value}` arrays cross the boundary.
  - **Astro**: a chart rendered without a `client:*` directive is **0 KB static HTML**. The crosshair must be mounted as its **own** island (`<ChartCrosshair client:visible points={…} />`), not as a nested React client component.
  - **React Router v7 framework mode (non-RSC default), TanStack Start, Vite SPA**: the whole chart module SSRs and then hydrates, so d3-shape ships. That is about **3–7 KB** total (3.2 KB area, 2.9 KB donut, shared d3 code). React Router's RSC mode, where enabled, behaves like Next (UNVERIFIED for this setup).
- Tokens and themes work through CSS custom properties with no JS theme bridge, so light/dark switch without re-render.

**Responsive geometry without measuring (no hydration mismatch). This is a decision to confirm, see §10:**

| Chart | Geometry strategy |
|---|---|
| Area/line, sparkline | SVG in **percent space**: `viewBox="0 0 100 H"` with `preserveAspectRatio="none"`. Strokes use `vector-effect: non-scaling-stroke`. Axis labels, markers and tooltips are **HTML** absolutely positioned by `%`, so text never scales. Point markers are HTML dots, or zero-length round-cap lines (they stay circular with non-scaling stroke). |
| Bar, funnel | **HTML/CSS bars** (flex/grid; `height: calc(var(--v) * 100%)`; `max-inline-size: 22px`; `border-start-*-radius` for "round only at data end"). These are naturally responsive, accessible and crisp. |
| Donut, progress ring | Uniform `viewBox` (square). Scaling is harmless. |
| Heatmap | CSS grid of cells with `--v` driving `color-mix()` steps. |

If exact pixel-snapped axes at the Figma widths are later required, render one of the three **Responsive-mode widths** (1280/976/358) on the server and switch with container queries. That is still no measuring.

**Plug-in/plug-out contract.** Every chart is `ChartFrame` (title, description, legend, tooltip, data table, states) plus a **renderer child**. Consumers who outgrow the thin set can drop Recharts/ECharts/uPlot inside `ChartFrame` and keep Nizivo chrome, a11y and tokens. We can later ship `@nizivo/charts-echarts` or `@nizivo/charts-uplot` adapters without touching core.

### 2.6 Accessibility pattern (WCAG 2.2 AA)

- `<figure>` + `<figcaption>` (title and a one-sentence takeaway). The SVG gets `role="img"` with `aria-labelledby` pointing at the caption. Decorative gridlines get `aria-hidden`.
- **Data table always rendered on the server**. It is visually hidden by default, with a "Show data" toggle (W3C WAI [complex images tutorial](https://www.w3.org/WAI/tutorials/images/complex/)). It covers 1.1.1 for screen readers and also serves as the no-JS fallback.
- **Keyboard**: one tab stop per plot (the island). Arrow keys move the active index, Home/End jump, Esc dismisses the tooltip. The active value is announced through a polite live region. Avoid many focusable SVG nodes, which have flaky AT support.
- **Tooltip** opens on focus as well as hover, and is dismissible, hoverable and persistent per [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html). Pointer hit areas are full column bands (2.5.8 target size).
- **Not color alone** (1.4.1): the comparison series is dashed (already the Figma rule) and legends carry shape keys. **1.4.11 non-text contrast** fails today for `chart/neutral`, `chart/secondary` and `chart/cat-2` (`03-data-viz.md`); token fix needed.
- `@media (forced-colors: active)`: strokes use `CanvasText`/`Highlight`.
- Number formatting runs on the server with an **explicit `locale` prop**, because Node's default ICU locale ≠ the browser's, which causes hydration mismatches.
- Chartability heuristics are a good audit checklist (URL not verified this session).

### 2.7 Animation (CSS only, tokenised, zero JS)

Draw-on reveal uses `clip-path` rather than `stroke-dasharray`. `pathLength` + dash interacts badly with `non-scaling-stroke` (UNVERIFIED in browsers, so `clip-path` avoids it).

```css
/* @nizivo/charts/styles.css — every duration is a motion token; Reduced mode sets them to 0 */
@media (prefers-reduced-motion: no-preference) {
  .nz-chart__line   { animation: nz-reveal-x var(--nz-duration-chart-draw) var(--nz-easing-standard) both; }
  .nz-chart__area   { animation: nz-fade var(--nz-duration-base) var(--nz-easing-standard) 120ms both; }
  .nz-bar           { transform-origin: bottom; animation: nz-grow-y var(--nz-duration-spring) var(--nz-easing-spring) both; /* spring pair, §3.3 */
                      animation-delay: calc(var(--i, 0) * var(--nz-stagger-item)); }
  .nz-donut__arc    { animation: nz-fade var(--nz-duration-base) var(--nz-easing-enter) both;
                      animation-delay: calc(var(--i, 0) * var(--nz-stagger-item)); }
}
@keyframes nz-reveal-x { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
@keyframes nz-grow-y   { from { scale: 1 0; } }
@keyframes nz-fade     { from { opacity: 0; } }
```

The animation plays from the server HTML on first paint, before hydration. Re-animating on data change means changing a `key`.

### 2.8 Implementation sketch

```tsx
// @nizivo/charts/area/AreaChart.tsx — Server Component (no "use client"); also works in SPA
import { area, line, curveMonotoneX } from 'd3-shape';
import { extent, max, ticks, nice } from 'd3-array';
import { ChartFrame } from '../frame/ChartFrame';           // figure, caption, legend slot, data table, states
import { ChartCrosshair } from './ChartCrosshair.client';  // "use client", ~0.6 KB

export const linear = ([d0, d1]: [number, number], [r0, r1]: [number, number]) => {
  const k = (r1 - r0) / ((d1 - d0) || 1);
  const f = (v: number) => r0 + (v - d0) * k;
  return Object.assign(f, { ticks: (n = 4) => ticks(d0, d1, n) });
};

export function AreaChart<T>({ data, x, y, title, summary, locale, format, compare }: AreaChartProps<T>) {
  const fmt = new Intl.NumberFormat(locale, format);         // explicit locale → no mismatch
  const [x0, x1] = extent(data, x) as [number, number];
  const [, yMax] = nice(0, max(data, y) ?? 0, 4);
  const sx = linear([x0, x1], [0, 100]), sy = linear([0, yMax], [100, 0]);
  const pts = data.map(d => ({ px: sx(x(d)), py: sy(y(d)), label: String(x(d)), value: fmt.format(y(d)) }));
  return (
    <ChartFrame title={title} summary={summary} table={pts} className="nz-area">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {sy.ticks().map(t => <line key={t} x1={0} x2={100} y1={sy(t)} y2={sy(t)} className="nz-chart__grid" vectorEffect="non-scaling-stroke" />)}
        <path className="nz-chart__area" d={area<T>().x(d => sx(x(d))).y0(100).y1(d => sy(y(d))).curve(curveMonotoneX)(data)!} />
        <path className="nz-chart__line" d={line<T>().x(d => sx(x(d))).y(d => sy(y(d))).curve(curveMonotoneX)(data)!} vectorEffect="non-scaling-stroke" />
      </svg>
      <ChartCrosshair points={pts} />                          {/* only plain JSON crosses the boundary */}
    </ChartFrame>
  );
}
```

```jsonc
// packages/charts/package.json (excerpt)
{
  "name": "@nizivo/charts",
  "sideEffects": ["**/*.css"],
  "exports": {
    "./area":      { "types": "./dist/area/index.d.ts",      "default": "./dist/area/index.js" },
    "./bar":       { "types": "./dist/bar/index.d.ts",       "default": "./dist/bar/index.js" },
    "./donut":     { "types": "./dist/donut/index.d.ts",     "default": "./dist/donut/index.js" },
    "./sparkline": { "types": "./dist/sparkline/index.d.ts", "default": "./dist/sparkline/index.js" },
    "./frame":     { "types": "./dist/frame/index.d.ts",     "default": "./dist/frame/index.js" },   // ChartFrame/Legend/Tooltip/DataTable
    "./styles.css": "./dist/styles.css"
  },
  "dependencies": { "d3-shape": "^3.2.0", "d3-array": "^3.2.4" },
  "peerDependencies": { "react": "^19.0.0", "@nizivo/tokens": "workspace:^" }
}
```

`KpiTile` in `@nizivo/ui` takes a **`chart` slot** (`<KpiTile chart={<Sparkline …/>} />`), so `ui` never depends on `charts`. Progress Bar/Ring live in `@nizivo/ui` (pure CSS/SVG, no d3).

### 2.9 Rejected (with measured cost)

- **Recharts 3**: 108–121 KB, empty server output, open SSR issue with no ETA, JS animation. Fine for apps, wrong for a design-system core.
- **Nivo**: 94–115 KB (react-spring), `Responsive*` renders no geometry on the server, no release since 2025-05-23.
- **ECharts 6**: 197 KB client. Its best mode (server SVG + 0.4 KB runtime) is the same server-first pattern we are building, without tooltips. Keep it as an **adapter candidate** for heavy analytics (map, sankey, 100k points).
- **Chart.js / uPlot**: canvas, so no server markup, manual a11y and no CSS-var theming. uPlot (22.7 KB) is the right **adapter** if someone needs dense real-time series.
- **visx**: good, MIT, SSR-correct, but 27 KB vs our 3 KB, and it supplies no a11y. Use it as **reference code** (MIT) and an optional adapter for exotic charts.

---

## 3. Motion

### 3.1 State of the art

| Item | Status (verified) |
|---|---|
| CSS `linear()` easing | **Baseline Widely available since 2026-06-11** (Chrome 113, Firefox 112, Safari 17.2) ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/linear-easing/)) |
| `@starting-style` | Baseline newly available 2024-08-06 (Chrome 117, Firefox 129, Safari 17.5) ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/starting-style/)) |
| `transition-behavior: allow-discrete` | Baseline newly available 2024-08-06 (Chrome 117, Firefox 129, Safari 17.4) ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/transition-behavior/)) |
| View Transitions (same-document) | Baseline newly available **2025-10-14** (Chrome 111, Safari 18, Firefox 144) ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/view-transitions/)). React **19.3 (2026-09-09) made `<ViewTransition>` and `addTransitionType` stable** ([React blog](https://react.dev/blog/2026/09/09/react-19-3)). |
| Scroll-driven animations | **Not Baseline**: Firefox is still behind a pref ([web-features](https://web-platform-dx.github.io/web-features-explorer/features/scroll-driven-animations/)). Progressive enhancement only. |
| Motion (ex-Framer Motion) | `motion` **14.2.0**, published 2026-10-13, MIT, peer React 18/19 ([changelog](https://motion.dev/changelog)). Docs: `motion` component ≈34 KB, `LazyMotion`+`m` ≈4.6 KB initial, `domAnimation` +15 KB, `domMax` +25 KB, mini `useAnimate` 2.3 KB, hybrid 17 KB ([reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size), [LazyMotion](https://motion.dev/docs/react-lazy-motion)). `motion/react-client` exists for RSC imports ([installation](https://motion.dev/docs/react-installation)). New entry points in 14.x: `motion/three`, `motion/vgpu`, `motion/react-animate-view` (seen in the package export map). |
| react-spring | `@react-spring/web` 10.1.2 (2026-06-24), 11.0.0-beta.1 on `beta`, MIT |
| GSAP | 3.15.0 (2026-04-13). Free since 2025-04-30 under the **"Standard 'No Charge' GSAP License"** ([license](https://gsap.com/standard-license), [Webflow](https://webflow.com/updates/gsap-becomes-free)). Not OSI. Prohibited use: "tools that allow users to build visual animations without code" competing with Webflow. **Incorporated into Webflow's ToS.** Silent on redistribution inside MIT packages. |

### 3.2 Measured sizes (min + gzip, React external)

| Bundle | gz |
|---|---|
| `motion/react` `motion.div` (all features) | **44.2 KB** (docs: ~34 KB) |
| `LazyMotion` + `m` + `domAnimation` (sync) | 30.4 KB |
| `LazyMotion` + `m`, features **async** (rolldown split) | **3.3 KB entry + 10.9 KB shared = 14.2 KB initial; 17.4 KB deferred** (docs: "4.6 KB"; ~3× higher here; esbuild could not split it at all) |
| `domMax` (layout + drag) | 41.5 KB |
| `useMotionValue`+`useSpring`+`useTransform`+`useReducedMotion` | 8.3 KB |
| `motion/react-mini` `useAnimate` / `motion/mini` `animate` | 3.4 / 3.3 KB |
| `motion` `animate`+`stagger` (hybrid) | 23.7 KB |
| `motion` `spring` generator only (**build-time use → 0 runtime**) | 2.0 KB |
| `@react-spring/web` `useSpring`+`animated` | 17.1 KB |
| `gsap` core / + ScrollTrigger + `@gsap/react` | 27.0 / 44.6 KB |
| `@number-flow/react` 0.6.2 | 6.0 KB |
| **Own** `usePointerFx` (tilt + magnetic via CSS vars) | **0.48 KB** |
| **Own** `CountUp` | **0.50 KB** |

Options vs criteria:

| Criterion | CSS-first + own hooks | Motion 14 (LazyMotion) | react-spring 10 | GSAP 3.15 |
|---|---|---|---|---|
| Client JS for the Figma needs | **~1 KB** (CountUp + pointer fx) | 14.2 KB initial + 17.4 KB deferred; 44 KB with `motion.div` | 17.1 KB | 27–45 KB |
| SSR / no-JS safety | Animations run from server HTML; content always visible | `initial` styles are serialized, so content can be invisible pre-hydration | JS-driven; initial styles inline | JS-driven, effects only after hydration |
| Springs | Baked `linear()` (exact for fixed targets; no velocity hand-off) | Real physics, interruptible | Real physics | Eases plus physics plugins |
| Reduced motion | Token swap via media query / `data-nz-motion`, zero code per component | `MotionConfig reducedMotion="user"` | `useReducedMotion` | Manual (`matchMedia`) |
| Layout / drag / presence | Limited (`allow-discrete`, View Transitions) | **Best in class** | Partial | Flip plugin |
| License | n/a | MIT | MIT | **Non-OSI, Webflow ToS** |
| Maintenance | Platform | Very active (14.2.0, 2026-10-13) | Active, v11 beta | Active |

SSR finding: `motion.div initial={{opacity:0,y:12}}` server-renders `style="opacity:0;transform:translateY(12px)"`. **Content stays invisible until JS hydrates and animates**, which hurts LCP and no-JS users. Entry animations must therefore be CSS (`@starting-style`/keyframes), or Motion must use `initial={false}`.

### 3.3 Spring tokens → CSS `linear()` (verified)

Motion's spring generator stringifies straight to CSS (`scratchpad/r6bench/ssrtest/spring.mjs`):

```
spring(1, 260, 24, 0)  →  600ms linear(0, 0.1002, 0.3072, 0.5275, 0.7148, 0.8533, 0.9444, 0.9969, 1.0221, 1.03, 1.0283, 1.0225, 1.0158, 1.0098, 1.0053, 1.0022, 1.0004, 0.9995, 1, 1)
spring(1, 170, 26, 0)  →  750ms linear(0, 0.0636, 0.1968, 0.346, 0.4855, 0.6051, 0.7024, 0.779, 0.8377, 0.882, 0.9149, 0.939, 0.9565, 0.9692, 0.9783, 0.9847, 0.9893, 0.9925, 0.9948, 0.9964, 0.9975, 0.9983, 0.9988, 1, 1)
```

**Implementation rule:** `spring` overshoots to 1.03, so the baked curves should drive **`transform` / `translate` / `scale` / `rotate` only**. Use `easing/enter` or `easing/standard` for `opacity`, color and `clip-path`, where overshoot either clamps or looks wrong.

**Design feedback:** a spring has an **intrinsic settle duration** (600 ms / 750 ms). Figma pairs `easing/spring` with separate `duration/*` tokens, but a 600 ms-sampled curve played over 220 ms is a compressed, different spring. Emit **pairs** (`--nz-easing-spring` + `--nz-duration-spring`) and make components use the pair. Ask design to treat spring duration as derived.

```js
// packages/tokens/scripts/bake-springs.mjs — build-time only; `motion` is a devDependency of @nizivo/tokens
import { spring } from 'motion';
export function bakeSpring([mass, stiffness, damping, velocity = 0]) {
  const [, ms, curve] = String(spring({ keyframes: [0, 1], mass, stiffness, damping, velocity })).match(/^(\d+)ms (linear\(.*\))$/);
  return { duration: `${ms}ms`, easing: curve };
}
```

```css
/* emitted by @nizivo/tokens (prefix configurable) */
:root {
  --nz-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --nz-easing-spring: linear(0, 0.1002, 0.3072, /* … */ 1, 1);   --nz-duration-spring: 600ms;
  --nz-easing-spring-soft: linear(0, 0.0636, /* … */ 1, 1);     --nz-duration-spring-soft: 750ms;
  --nz-duration-fast: 140ms; --nz-duration-base: 220ms; --nz-duration-chart-draw: 700ms; --nz-duration-count-up: 900ms;
  --nz-distance-lift: 4px; --nz-tilt-max-deg: 6; --nz-scale-press: 0.98; --nz-stagger-item: 40ms; --nz-magnetic-pull: 6px;
}
/* Figma "Reduced" mode: OS preference OR explicit app override */
@media (prefers-reduced-motion: reduce) { :root:not([data-nz-motion="full"]) { /* Reduced values */ } }
:root[data-nz-motion="reduce"] {
  --nz-easing-spring: linear; --nz-duration-spring: 120ms; --nz-easing-spring-soft: linear; --nz-duration-spring-soft: 120ms;
  --nz-duration-fast: 0ms; --nz-duration-base: 120ms; --nz-duration-chart-draw: 0ms; --nz-duration-count-up: 0ms;
  --nz-distance-lift: 0px; --nz-tilt-max-deg: 0; --nz-scale-press: 1; --nz-stagger-item: 0ms; --nz-magnetic-pull: 0px;
}
```

### 3.4 Recommendation

**CSS-first motion system, with JS only where the CSS platform can't express it. Motion (motion.dev) is an optional peer.**

| Need (from Figma) | Implementation | JS |
|---|---|---|
| Hover lift / press scale | CSS transitions on tokens (`translate`, `scale`), spring pair | 0 |
| Toast/modal/popover enter | `@starting-style` + transition. Exit: `transition-behavior: allow-discrete` on `display`/`opacity`. Top-layer exit also needs the `overlay` property, whose cross-browser status is **UNVERIFIED**, so exits may cut short in some engines, which is acceptable. | 0 |
| Skeleton pulse, chart draw, bar grow | CSS keyframes (§2.7) | 0 |
| Stagger | `style={{'--i': index}}` + `animation-delay: calc(var(--i) * var(--nz-stagger-item))` (don't rely on `sibling-index()`, whose support is **UNVERIFIED**) | 0 |
| **Count-up** (`duration/count-up`) | Own `CountUp` (0.5 KB). The **server renders the final formatted value** (no mismatch); the client animates `aria-hidden` text while screen readers read the final value; skipped under reduced motion. Optional adapter: **NumberFlow** (6.0 KB, MIT). Verified to SSR the final value in declarative shadow DOM with `role="img" aria-label="$1,234.50"`, `respectMotionPreference` defaults to true; no RTL/non-Latin digits ([docs](https://number-flow.barvian.me/)). | 0.5 KB |
| **3D tilt / magnetic hover** | Own `usePointerFx` (0.48 KB): `pointermove` → rAF → CSS vars `--nz-fx-rx/ry/mx/my`. CSS applies `rotate`/`translate` × tokens with a spring transition. Gated on `(hover:hover) and (pointer:fine)` and reduced motion. | 0.5 KB |
| Route/list transitions | Make components **ViewTransition-friendly** (accept `viewTransitionName`, no conflicting transforms). Apps opt into React 19.3 `<ViewTransition>`. The library doesn't depend on it. | 0 |
| Layout animation, drag-reorder, presence with exit choreography | **`@nizivo/motion/motion`** adapter: optional peer `motion@^14`, `LazyMotion strict` + `m` + async `domAnimation`/`domMax`, imported via `motion/react-client` in RSC code. | 14–31 KB, only when used |

Reduced-motion rule: **reduced motion never changes rendered markup, only animation behavior.** This avoids hydration mismatches. JS reads it through `useSyncExternalStore` with a server snapshot of `false`, and effects re-check before animating.

```ts
// @nizivo/motion/use-reduced-motion.ts
'use client';
import { useSyncExternalStore } from 'react';
const q = '(prefers-reduced-motion: reduce)';
const sub = (cb: () => void) => { const m = matchMedia(q); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); };
export const useReducedMotion = () => useSyncExternalStore(sub,
  () => document.documentElement.dataset.nzMotion === 'reduce' || (document.documentElement.dataset.nzMotion !== 'full' && matchMedia(q).matches),
  () => false);
```

```css
/* tilt card, driven by usePointerFx(); falls back to plain lift */
.nz-card[data-fx] {
  transform: perspective(800px)
    rotateX(calc(var(--nz-fx-rx, 0) * var(--nz-tilt-max-deg) * 1deg))
    rotateY(calc(var(--nz-fx-ry, 0) * var(--nz-tilt-max-deg) * 1deg))
    translate(calc(var(--nz-fx-mx, 0) * var(--nz-magnetic-pull) * 2), calc(var(--nz-fx-my, 0) * var(--nz-magnetic-pull) * 2));
  transition: transform var(--nz-duration-spring) var(--nz-easing-spring);
}
```

### 3.5 Rejected

- **GSAP**: the license is non-OSI and incorporated into Webflow's ToS. It prohibits use in no-code visual animation tools, which some Nizivo consumers could build. The terms are silent on redistribution in MIT packages ([license](https://gsap.com/standard-license)). It also costs 27–45 KB. It must **never be a dependency**; apps may use it themselves.
- **react-spring**: 17.1 KB, an ecosystem overlap with Motion, and a v11 beta in flight.
- **Motion as a core dependency**: 30–44 KB for effects CSS already covers, and the SSR `opacity:0` pitfall. It stays an optional adapter.

---

## 4. 3D and shaders

### 4.1 State of the art

| Item | Status |
|---|---|
| three.js | 0.186.1 (2026-09-24), MIT. WebGPURenderer available via `three/webgpu`. |
| @react-three/fiber | **9.8.1** (2026-09-24). **Peer `react: ">=19 <19.4"`** (from package.json), so an upper bound pins consumers' React minor. v10 is in alpha (10.0.0-alpha.5): WebGPU/TSL, new scheduler ([releases](https://github.com/pmndrs/react-three-fiber/releases)). |
| @react-three/drei | 10.7.9 (2026-09-25), MIT |
| OGL | 1.0.11 (2025-01-27), **Unlicense** |
| Paper Shaders (`@paper-design/shaders[-react]`) | **0.0.81** (2026-09-17). **Apache-2.0 since 0.0.77** (it was PolyForm Shield from 0.0.47) ([CHANGELOG](https://github.com/paper-design/shaders/blob/main/CHANGELOG.md)). Pauses offscreen since 0.0.78 and in hidden tabs since 0.0.56; `maxPixelCount`/`minPixelRatio` caps. **No reduced-motion handling and no `webglcontextlost` handling found** (grep of dist). Components: MeshGradient, GodRays, Warp, Swirl, Waves, LiquidMetal, FlutedGlass and more. |
| WebGPU | Chrome/Edge, Safari 26 (macOS/iOS/iPadOS/visionOS), Firefox 141 on Windows and 145 on Apple-silicon macOS. **Firefox Linux/Android and Intel Macs are still in progress** ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers), [Wikipedia](https://en.wikipedia.org/wiki/WebGPU)). WebGL2 remains the universal baseline. |
| WebGL context cap | **16 live contexts per page/principal**; the oldest is lost (Chrome and Firefox messages; WebKit adopted the same) ([WebKit commit](https://webkit.googlesource.com/WebKit/+/70e10861eb2fbd9d0862fd8702874c25ae5d8bfd%5E%21), [fingerprintjs PR](https://github.com/fingerprintjs/fingerprintjs/pull/484)). |

Measured (min + gzip):

| Bundle | gz |
|---|---|
| three: minimal WebGL scene | 130.5 KB |
| three: fullscreen `ShaderMaterial` quad only | 129.5 KB (three barely tree-shakes below this) |
| three: `export *` | 185.6 KB |
| three/webgpu minimal scene | 210.6 KB |
| R3F 9 `Canvas` + three | 244.2 KB |
| R3F + drei subset | 254.0 KB |
| OGL core subset | 13.3 KB |
| Paper `MeshGradient` (React) / vanilla `ShaderMount` + frag | 8.1 / 5.9 KB |
| **Own `ShaderSurface` (WebGL2 fullscreen triangle runner)** | **1.4 KB** (+ shader source string) |

Options vs criteria (for fullscreen procedural backgrounds like the Figma Rays and Mesh):

| Criterion | Own WebGL2 runner | OGL | Paper Shaders | three.js | R3F + three | Raw WebGPU |
|---|---|---|---|---|---|---|
| Size (gz) | **1.4 KB** | 13.3 KB | 5.9–8.1 KB per shader | ~130 KB | ~244 KB | ~1–2 KB own code (UNVERIFIED) |
| SSR safety | Poster on server, canvas after mount | Same (manual) | Empty div on server; we add the poster | Client-only | Client-only (Canvas) | Client-only |
| Offscreen / tab pausing | Built in (IO + visibilitychange) | Manual | Built in (since 0.0.78 / 0.0.56) | Manual | `frameloop="demand"` + manual | Manual |
| Reduced motion | Built in (single frame) | Manual | **Not handled** (we wrap `speed=0`) | Manual | Manual | Manual |
| Context loss | Falls back to poster | Manual | Not handled (grep) | Partial | Partial | Device-lost handling needed |
| Browser reach | WebGL2: universal | WebGL1/2 | WebGL2 | WebGL2 (+WebGPU) | WebGL2 (+WebGPU in v10 alpha) | Not on Firefox Linux/Android |
| License | Ours (MIT) | Unlicense | Apache-2.0 (since 0.0.77) | MIT | MIT | n/a |
| Fit for Figma lab | Exact port of the Figma shaders | Overkill | Close presets (MeshGradient, GodRays, Warp) | Overkill | Overkill, plus `react <19.4` peer | Matches Figma WGSL, but not universal |

SSR: Paper `MeshGradient` server-renders `<div style="width:300px;height:200px"></div>` (empty). Every canvas component therefore needs a **server-rendered poster**.

### 4.2 Recommendation

1. **No real-time 3D in v1.** The design's 3D is raster art. Document an `<Image>` recipe (AVIF/WebP, `aspect-ratio`, tinted card) and keep the renders as app assets.
2. **`@nizivo/lab`** is explicitly experimental (0.x, its own changelog, no semver promise). It contains:
   - **`ShaderSurface`** (own, WebGL2, 1.4 KB). Contract: `frag` (GLSL ES 3.0), `uniforms`, **`poster` (ReactNode, server-rendered)**, `maxDpr` (default 1.5), `speed`, `label`. Behavior:
     - Mounts after hydration. Pauses via `IntersectionObserver` and `visibilitychange`.
     - Reduced motion → draws a single frame.
     - `webglcontextlost` → fades back to the poster. Unmount → `WEBGL_lose_context`.
     - Reads color uniforms from CSS tokens (`getComputedStyle`) and re-reads on theme change.
     - Keeps a **live-surface budget of ≤4 per page**, enforced by a tiny module-level registry, because of the 16-context cap.
   - **Presets** `RaysHero` and `MeshGlow` hand-ported from the Figma WGSL shaders. They need source access (§10); until then they are approximated with Paper's `GodRays`/`Warp`/`MeshGradient` parameters. Colors bind to tokens, since Figma hard-codes them.
   - **Optional adapters**: `@nizivo/lab/paper` (optional peer `@paper-design/shaders-react` with range `>=0.0.81 <0.1.0`, exact-pinned only in our devDependencies/CI because it is 0.0.x; we add reduced-motion `speed={0}`, the poster and the context-loss fallback), and later `@nizivo/lab/three` (optional peers `three`, `@react-three/fiber`; `React.lazy` + visibility-gated; client-only).
3. **WGSL/WebGPU path** only if Figma's WGSL can be reused 1:1 and WebGPU coverage on Firefox Linux/Android lands. The GLSL port stays the fallback.

```tsx
// usage: decorative hero background, zero JS needed for first paint
<ShaderSurface
  frag={raysFrag}
  uniforms={{ u_cream: 'var(--nz-p-neutral-25)', u_lime: 'var(--nz-p-lime-300)', u_green: 'var(--nz-p-green-600)', u_orange: 'var(--nz-lab-orange)' }}
  poster={<div className="nz-rays-poster" />}   /* CSS gradient approximation, rendered on the server */
  maxDpr={1.5}
/>
```

The full sample is `scratchpad/r6bench/samples/shader-surface.js`. It shows the IO/visibility pausing, DPR cap, reduced motion and context-loss handling. Token-string uniforms would be resolved via `getComputedStyle` in the shipping version.

### 4.3 Rejected

- **three.js / R3F in any default path**: 130–254 KB for one fullscreen quad. The R3F peer range `<19.4` would also make Nizivo's React support hostage to R3F. Keep them optional and lazy.
- **Raw WebGPU**: not universal yet. Revisit when Firefox Linux/Android ship.
- **OGL as default**: 13 KB vs 1.4 KB for what we need (one program, one triangle). Keep it in mind if we need multi-pass, render targets or textures.

---

## 5. Glass and liquid glass

| Fact | Source |
|---|---|
| `backdrop-filter`: Baseline newly available **2024-09-16** (Safari 18 unprefixed; Firefox 103; Chrome 76) | [web-features](https://web-platform-dx.github.io/web-features-explorer/features/backdrop-filter/) |
| `prefers-reduced-transparency`: **Chromium only** (Chrome 119). Firefox has an open bug; WebKit cites privacy concerns. | [web-features](https://web-platform-dx.github.io/web-features-explorer/features/prefers-reduced-transparency/) |
| `backdrop-filter: url(#svg-filter)` with `feDisplacementMap` (refraction): **Chromium only**. Firefox **parses it as valid, so `@supports` passes, then renders nothing**. There is no interoperable spec ([w3c/svgwg#1142](https://github.com/w3c/svgwg/issues/1142), opened 2026-06-25). | [kube.io](https://kube.io/blog/liquid-glass-css-svg/), [buildmvpfast guide](https://www.buildmvpfast.com/blog/liquid-glass-css-backdrop-filter-recipes-2026), [rizroze/liquid-glass](https://github.com/rizroze/liquid-glass) |

**Recommendation.** `Surface` gets `variant="glass"` in `@nizivo/ui`, implementing `Grove/Surface/Glass` from tokens. Liquid glass is a `@nizivo/lab` Chromium-only enhancement behind a JS capability gate, not in v1.

```css
.nz-surface[data-variant="glass"] {
  background: color-mix(in oklab, var(--nz-bg-surface) 42%, transparent);
  -webkit-backdrop-filter: blur(var(--nz-glass-blur, 24px)) saturate(140%);
          backdrop-filter: blur(var(--nz-glass-blur, 24px)) saturate(140%);
  box-shadow: var(--nz-elevation-glass), inset 0 1px 0 0 rgb(255 255 255 / .7); /* Surface/Inner Highlight */
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .nz-surface[data-variant="glass"] { background: var(--nz-bg-surface-raised); }
}
@media (prefers-reduced-transparency: reduce), (forced-colors: active) {
  .nz-surface[data-variant="glass"] { background: var(--nz-bg-surface-raised); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
```

Performance guidance. This is general engine behavior and was **not measured** here:
- Each glass layer re-samples and blurs its backdrop on every frame where content behind it changes. Don't animate the blur radius.
- Avoid glass on items inside long scrolling lists. Keep at most a few glass layers on screen.
- Prefer glass over static shader/gradient backgrounds, where the backdrop is cheap.
- The glass-over-shader combination ("Mesh + glass") should pause the shader when offscreen (§4).

---

## 6. Icons

### 6.1 State and measurements

| Set | Version (date) | License | 10 icons, gz | Notes |
|---|---|---|---|---|
| **Lucide** (`lucide-react` / `lucide-static`) | 1.56.0 (2026-10-13) | **ISC**, plus **MIT for the Feather-derived subset**. Both notices must be kept (verified in `LICENSE`). | 2.6 KB (1 icon: 1.8 KB) | v1 (2026) removed brand icons and dropped UMD ([InfoQ](https://www.infoq.com/news/2026/06/lucide-v1-icons/)). Server-renders a plain `<svg … stroke="currentColor">`. 3 files carry `"use client"` (context provider). |
| Tabler (`@tabler/icons-react`) | 3.49.0 (2026-10-05) | MIT | 1.4 KB | |
| Phosphor (`@phosphor-icons/react`) | 2.1.10 (2025-05-22) | MIT | 7.0 KB | Each icon bundles all 6 weights. |
| Simple Icons | 16.35.0 | **CC0-1.0** (brand trademark guidelines still apply) | – | Source for `Social/Instagram`. |
| SVGR (`@svgr/core`) | 8.1.0 (**2023-08-15**) | MIT | build-time | Works but has had no release in 3 years. |
| SVGO | 4.1.0 (2026-08-24) | MIT | build-time | |

On sprite vs inline: SVG-in-JS costs parse/compile/hydration, and Jason Miller called it "the most expensive form of sprite sheet". Sprites with `<use href>` are cached and support `currentColor`, but must be same-origin and lose `<mask>`/`<clipPath>`. Under RSC, server-only icon components never reach the client bundle ([kurtextrem.de](https://kurtextrem.de/posts/svg-in-js)).

### 6.2 Recommendation

- **`@nizivo/icons`** is generated at build time from pinned `lucide-static` SVGs: the 74 Figma icons first, then on demand, or the whole set. SVGO 4 plus a ~100-line codegen template (SVGR optional). Each icon is **its own ESM module** with `sideEffects: false` and **no `"use client"`**, so in RSC apps icons cost **0 client JS**.
  - Props: `size` (default `var(--nz-size-icon-md)` = 20), `strokeWidth` (default 1.6, `absoluteStrokeWidth` option), `title` (adds `role="img"` + `<title>`; otherwise `aria-hidden="true"`), `currentColor` fill/stroke so `icon/*` tokens apply via `color`.
  - React 19 `ref` as prop; no `forwardRef`.
  - Also emit `sprite.svg` and `<SpriteIcon name href>` for apps that want zero-JS icons on client-heavy pages.
  - `createIcon(name, iconNode)` lets consumers add their own icons with the same API.
- **`@nizivo/ui` imports no icon package.** Components take `icon`/`startIcon`/`endIcon` as **ReactNode slots** (any set plugs in: Lucide, Tabler, Phosphor, custom). A ≤10-glyph internal set (chevron, check, x, search, alert, spinner) is inlined for built-in affordances.
- **Brand icons** (`Social/Instagram`) live in `@nizivo/icons/brands` from Simple Icons (CC0) or the brand's official asset, with trademark-usage docs.
- `LICENSE` in `@nizivo/icons` carries the Lucide ISC notice plus the Feather MIT notice (and CC0 attribution text for brands, as courtesy).

```tsx
// generated: packages/icons/src/arrow-up-right.tsx (no "use client")
import { createIcon } from './create-icon';
export const ArrowUpRight = createIcon('arrow-up-right', [['path', { d: 'M7 7h10v10' }], ['path', { d: 'M7 17 17 7' }]]);
// create-icon.tsx
export function createIcon(name: string, node: [string, Record<string, string>][]) {
  function Icon({ size = 20, strokeWidth = 1.6, title, ref, ...rest }: IconProps) {
    return (
      <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
           strokeLinecap="round" strokeLinejoin="round" data-nz-icon={name}
           {...(title ? { role: 'img' } : { 'aria-hidden': true })} {...rest}>
        {title && <title>{title}</title>}
        {node.map(([tag, attrs], i) => { const Tag = tag as 'path'; return <Tag key={i} {...attrs} />; })}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}
```

**Rejected.**
- Depending on `lucide-react` directly in core: it couples our API and versions to Lucide and adds a `"use client"` provider. It remains a fine **consumer choice** via slots.
- Phosphor as seed: 7 KB per 10 icons, and it isn't the Figma set.
- Icon fonts: a11y and rendering issues.

---

## 7. Fonts (Geist / Geist Mono)

| Fact (verified) | Source |
|---|---|
| Geist and Geist Mono are **SIL OFL 1.1**: free to use, embed and redistribute, but not sell by themselves. Keep the copyright and license when redistributing. | [vercel/geist-font LICENSE](https://github.com/vercel/geist-font/blob/main/LICENSE.txt), npm metadata |
| `geist` npm 1.7.2 (2026-06-01) has **peer `next >=13.2`** and its entry imports `next/font/local`, so it is **Next-only**. It exposes CSS variables **`--font-geist-sans`** / **`--font-geist-mono`**. | `node_modules/geist/dist/sans.js` |
| Vercel recommends the `geist` package for Next, noting it "includes full glyph set and `font-feature-settings` support". `next/font/google` "does not include full glyph set or `font-feature-settings` support". | [vercel.com/font](https://vercel.com/font) |
| Glyph and feature check (fontTools): **Vercel Geist-Variable.woff2**: 975 glyphs, GSUB `aalt case ccmp dlig dnom frac liga locl numr ordn pnum sinf ss01–ss11 subs sups tnum`. **Fontsource / Google latin subset**: 288 glyphs, GSUB `ccmp dnom frac liga locl numr pnum tnum`. **Both have `tnum`**; Google builds lack stylistic sets. | `tools/feat.py` |
| `@fontsource-variable/geist` 5.3.0 (2026-07-19), family **`'Geist Variable'`**; mono family `'Geist Mono Variable'`. | package CSS |

**Recommendation.** **Libraries ship no font files and import no font package.** `@nizivo/tokens` exposes font-family tokens that automatically pick up whichever loader the app uses:

```css
:root {
  --nz-font-sans: var(--font-geist-sans, "Geist Variable"), "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --nz-font-mono: var(--font-geist-mono, "Geist Mono Variable"), "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --nz-font-weight-regular: 400; --nz-font-weight-medium: 500; --nz-font-weight-semibold: 600;
}
.nz-numeric { font-variant-numeric: tabular-nums; }   /* Figma Numeric/* styles; not font-feature-settings */
```

Documented recipes:
- **Next.js (App Router):** `import { GeistSans } from 'geist/font/sans'; import { GeistMono } from 'geist/font/mono';` then `<html className={`${GeistSans.variable} ${GeistMono.variable}`}>`. Zero config, because the tokens read `--font-geist-*`. This gives full features and automatic fallback metrics via next/font. Alternatively `next/font/google` `Geist` with `variable: '--font-geist-sans'`.
- **Vite / Astro / React Router 7 / TanStack Start:** `import '@fontsource-variable/geist'; import '@fontsource-variable/geist-mono';` (or import only `…/wght.css` subsets). Preload the latin `wght-normal.woff2` with `<link rel="preload" as="font" type="font/woff2" crossorigin>`.
- **Full fidelity outside Next** (stylistic sets, extra glyphs): self-host the woff2 from the OFL release zip with your own `@font-face { font-family: "Geist"; … }`. The token chain picks it up.
- Metric-matched fallbacks (`size-adjust` etc.) to avoid CLS outside Next are app-level (e.g. tools like fontaine; **UNVERIFIED** in this session).

**Rejected.** Bundling fonts in `@nizivo/ui`: it duplicates downloads, fights each framework's optimizer, and breaks CSP and CDN setups. Depending on `geist` npm: Next-only.

---

## 8. Media (product cards, Instagram storefront)

**Pattern.** A plain, server-safe `Image` primitive plus **ReactNode slots**:

```tsx
// @nizivo/ui/image — no "use client"
export function Image({ src, alt, width, height, ratio, sizes = '100vw', priority, className, ...rest }: ImageProps) {
  return <img src={src} alt={alt} width={width} height={height} sizes={sizes} className={cx('nz-image', className)}
              loading={priority ? 'eager' : 'lazy'} decoding="async" fetchPriority={priority ? 'high' : undefined}
              style={{ aspectRatio: ratio ?? (width && height ? `${width} / ${height}` : undefined) }} {...rest} />;
}

// Components take a media *element*, not a component or function:
<ProductCard media={<Image src={p.image} alt={p.title} width={400} height={400} />} … />
// Next app:
<ProductCard media={<NextImage src={p.image} alt={p.title} width={400} height={400} sizes="(min-width: 1024px) 25vw, 50vw" />} … />
```

Why element slots:
- **React elements serialize across the server→client boundary; functions and component references don't.** A `renderImage={fn}` or `imageComponent={NextImage}` prop breaks as soon as the card (or a parent) is a client component.
- A context `ImageProvider` doesn't work for **Server Components, which can't read context**. It would force `"use client"` on every card.
- For composition-heavy primitives, also support the Base UI-style **`render` prop** (`<Image render={<NextImage />} …/>`, merging props) ([Base UI composition](https://base-ui.com/react/handbook/composition), [useRender](https://base-ui.com/react/utils/use-render)).

Optional helper: `@unpic/react` 1.0.2 (MIT, `next` is an **optional** peer; `base` entry 1.3 KB gz; SSR output verified as a plain `<img>` with `sizes`, `aspect-ratio` and lazy loading). Suggest it in docs for CDN-aware `srcset` (Shopify, Cloudinary, Imgix). It is not a dependency.

Storefront specifics:
- Product and shoppable-post aspect ratios become tokens (1:1, 4:5).
- Skeleton is the loading state (already in Figma 07).
- Video posts: `<video muted playsInline loop preload="none" poster>`, played only when visible (IO), never autoplayed under reduced motion.
- Instagram CDN URLs should be proxied or cached by the app. Expiry behavior is **UNVERIFIED** here.
- Never ship the Figma demo photos or renders in the library, because their license is unknown (`01-foundations.md`).

---

## 9. Package boundaries (proposal for this topic)

```
@nizivo/tokens   (other workstream) ← emits CSS vars incl. baked springs, font stacks, chart colors, glass
     ▲
@nizivo/ui       core components; deps: none heavy. Image, Surface(glass), Progress Bar/Ring, KpiTile(chart slot), Numeric
     ▲ (peer)                    slots only — no imports of the packages below
@nizivo/icons    generated icons (+ /brands, + sprite.svg); deps: none at runtime
@nizivo/charts   Area, Bar, Donut, Sparkline, Funnel, Heatmap, ChartFrame/Legend/Tooltip/DataTable; deps: d3-shape, d3-array
@nizivo/motion   CSS motion utilities + usePointerFx, CountUp, useReducedMotion, Reveal
                 /motion      → optional peer "motion@^14" (layout, drag, presence)
                 /number-flow → optional peer "@number-flow/react"
@nizivo/lab      0.x EXPERIMENTAL: ShaderSurface, RaysHero, MeshGlow, LiquidGlass (Chromium-only)
                 /paper → optional peer "@paper-design/shaders-react" (exact pin)
                 /three → optional peers "three", "@react-three/fiber" (lazy, client-only)
fonts / media    no package: tokens + docs + slot patterns
```

Rules that make plug-in/plug-out safe:
1. **Subpath exports for every adapter**, with optional peers declared in `peerDependenciesMeta: { motion: { optional: true } }`. Importing `@nizivo/motion` never resolves `motion` unless you import `@nizivo/motion/motion`.
2. **`sideEffects: ["**/*.css"]`** everywhere, so CSS is never tree-shaken away while JS stays tree-shakable.
3. **No `"use client"` on anything that can render on the server.** Interactive parts live in separate `*.client.tsx` modules (islands). Only serializable props cross the boundary.
4. **Slots over imports** between packages (icon, chart, media, motion wrapper), so any package can be swapped or removed without forking.
5. Heavy adapters are **never re-exported from a barrel**.

```jsonc
// packages/lab/package.json (excerpt)
{
  "name": "@nizivo/lab", "version": "0.1.0", "sideEffects": ["**/*.css"],
  "exports": {
    ".":       "./dist/index.js",          // ShaderSurface + presets (own WebGL2)
    "./paper": "./dist/paper/index.js",    // adapter
    "./three": "./dist/three/index.js"     // adapter (lazy)
  },
  "peerDependencies": { "react": "^19.0.0", "@paper-design/shaders-react": ">=0.0.81 <0.1.0", "three": ">=0.180", "@react-three/fiber": "^9 || ^10" },
  "peerDependenciesMeta": { "@paper-design/shaders-react": { "optional": true }, "three": { "optional": true }, "@react-three/fiber": { "optional": true } },
  "devDependencies": { "@paper-design/shaders-react": "0.0.81" }   // exact pin for CI; docs say "tested against 0.0.81"
}
```

---

## 10. Risks

1. **We own the chart code.** Bugs in axes, ticks and edge cases (empty or negative data, single point, all zeros) are ours. Mitigation: property tests on geometry, visual regression per Figma variant, and keeping d3-shape for the hard math.
2. **Percent-space SVG** (`preserveAspectRatio="none"`) distorts anything not using non-scaling stroke (markers, dash patterns). Labels must be HTML. This needs early browser QA (Safari `vector-effect` quirks are **UNVERIFIED**).
3. **Figma shader sources are inaccessible** through MCP today. A faithful port depends on the file owner exporting WGSL; otherwise we approximate.
4. **Spring/duration token semantics** conflict (§3.3). Unresolved, motion will feel "off" versus the prototype.
5. **Motion's real LazyMotion cost is about 3× the docs claim** with a modern bundler (14.2 KB initial measured with rolldown vs "4.6 KB"). Bundler-dependent: esbuild couldn't split it at all. Keep Motion optional.
6. **R3F peer pin `react <19.4`** may block consumers upgrading React if `@nizivo/lab/three` is installed. Keep it isolated and optional.
7. **Paper Shaders is pre-1.0 (0.0.x)** and changed license twice (PolyForm Shield at 0.0.47, Apache-2.0 at 0.0.77). Pin exact versions and re-check the LICENSE on upgrade.
8. **GSAP license drift**: if anyone adds GSAP to a Nizivo package it would contaminate the MIT distribution story. Lint-ban `gsap` in package manifests.
9. **Locale and timezone hydration mismatches** in formatted numbers and dates. Explicit `locale`/`timeZone` props are required on Numeric, charts and CountUp.
10. **Glass performance** on low-end Android and with stacked layers is unmeasured. Add a perf budget test (Chrome trace) before v1.
11. **Lucide v1 removed brand icons**, and future Lucide renames can break generated names. Pin the `lucide-static` version and keep an alias map.
12. **Recharts users may expect drop-in compatibility.** Document the `ChartFrame` adapter route instead.

## 11. Open questions

1. Responsive chart text: confirm "percent-space SVG + HTML labels" as the default, or require pixel-exact axes at the three Figma Responsive widths (container-query variants).
2. Can the Figma file owner export the two shader fills' WGSL (Rays hero, Mesh)? Should their colors bind to tokens?
3. Should spring tokens carry their own duration (600/750 ms), replacing `duration/*` pairing for spring transitions?
4. Is real-time 3D wanted at all beyond the raster renders, e.g. a product viewer? If not, drop `@nizivo/lab/three` from the roadmap.
5. Do any consumers need dense or real-time series (>5k points) that justify a uPlot or ECharts adapter in v1?
6. Icon scope: ship all ~1,600 Lucide icons generated, or only the 74 Figma icons plus on-demand additions? Figma masters need restoring first.
7. Liquid glass (`Surface/Liquid Glass`): is a Chromium-only enhancement acceptable, or should it be dropped from the design?

---

## Sources

Registry and local evidence (2026-10-14):
- `npm view` output for every package listed (versions, dates, licenses, dist-tags).
- Bench scripts and results: `scratchpad/r6bench/tools/measure.mjs`, `split3.mjs`, `d3parts.mjs`, `scratchpad/r6bench/sizes.json`.
- SSR tests: `scratchpad/r6bench/ssrtest/ssr.mjs`, `rc.mjs`, `ssr2.mjs`, `ssr3.mjs`, `own.mjs`, `spring.mjs`.
- Samples: `scratchpad/r6bench/samples/thin-charts.js`, `thin-area-ownscale.js`, `shader-surface.js`, `pointer-fx.js`, `count-up.js`.
- Fonts: `scratchpad/r6bench/tools/feat.py`.
- Figma: lab section `7275:19609` metadata and fills, screenshot `scratchpad/figma/shots/09-lab-section.png`.

Web:
- Recharts: https://github.com/recharts/recharts/issues/5997 · https://github.com/recharts/recharts/discussions/6390 · https://github.com/recharts/recharts/wiki/Recharts-and-accessibility · https://newreleases.io/project/github/recharts/recharts/release/v3.0.0 · https://newreleases.io/project/github/recharts/recharts/release/v3.10.0
- visx: https://github.com/airbnb/visx/releases · https://github.com/airbnb/visx/discussions/1908
- Nivo: https://github.com/plouc/nivo/issues/2618 · https://nivo.rocks/faq/
- ECharts: https://apache.github.io/echarts-handbook/en/how-to/cross-platform/server/ · https://echarts.apache.org/handbook/en/basics/release-note/v6-feature · https://whimsy.apache.org/board/minutes/ECharts.html
- Motion: https://motion.dev/changelog · https://motion.dev/docs/react-reduce-bundle-size · https://motion.dev/docs/react-lazy-motion · https://motion.dev/docs/react-installation
- react-spring: https://github.com/pmndrs/react-spring/releases
- GSAP: https://gsap.com/standard-license · https://webflow.com/updates/gsap-becomes-free
- React 19.3: https://react.dev/blog/2026/09/09/react-19-3
- Baseline: https://web-platform-dx.github.io/web-features-explorer/features/linear-easing/ · …/starting-style/ · …/transition-behavior/ · …/view-transitions/ · …/scroll-driven-animations/ · …/backdrop-filter/ · …/prefers-reduced-transparency/
- linear() springs: https://www.joshwcomeau.com/animation/linear-timing-function/ · https://developer.chrome.com/docs/css-ui/css-linear-easing-function
- three/R3F: https://github.com/pmndrs/react-three-fiber/releases · https://github.com/mrdoob/three.js/releases
- Paper Shaders: https://github.com/paper-design/shaders/blob/main/CHANGELOG.md · https://www.npmjs.com/package/@paper-design/shaders-react
- WebGPU: https://web.dev/blog/webgpu-supported-major-browsers · https://en.wikipedia.org/wiki/WebGPU
- WebGL context cap: https://webkit.googlesource.com/WebKit/+/70e10861eb2fbd9d0862fd8702874c25ae5d8bfd%5E%21 · https://github.com/fingerprintjs/fingerprintjs/pull/484
- Figma shaders: https://help.figma.com/hc/en-us/articles/39582753756695-What-s-new-from-Config-2026 · https://www.techtimes.com/articles/319041/20260625/figma-config-2026-code-layers-challenge-cursor-gpu-shaders-hit-paid-plans.htm
- Liquid glass: https://kube.io/blog/liquid-glass-css-svg/ · https://github.com/w3c/svgwg/issues/1142 · https://github.com/rizroze/liquid-glass · https://www.buildmvpfast.com/blog/liquid-glass-css-backdrop-filter-recipes-2026
- Icons: https://www.infoq.com/news/2026/06/lucide-v1-icons/ · https://kurtextrem.de/posts/svg-in-js
- Fonts: https://vercel.com/font · https://github.com/vercel/geist-font/blob/main/LICENSE.txt · https://www.npmjs.com/package/geist · https://www.npmjs.com/package/@fontsource/geist
- NumberFlow: https://number-flow.barvian.me/
- Base UI composition: https://base-ui.com/react/handbook/composition · https://base-ui.com/react/utils/use-render
- A11y: https://www.w3.org/WAI/tutorials/images/complex/ · https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html
