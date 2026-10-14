# Grove · 03 Data Visualization — extraction & architecture analysis

- File: `BIzJFf1wm8KP0YG2AVI1tP` ("Grove UI Library" when read, now "Nizivo UI Library"; ships as **Nizivo UI**, `@nizivo/*`)
- Page: `Grove · 03 Data Visualization` **7275:13284**; single section **7275:13285** (4000×1974)
- Read on 2026-10-14. All reads were read-only (`use_figma` returning data, plus `get_screenshot`). Nothing was changed in the file.
- Token names follow the snapshot `00-tokens-and-styles.md`. CSS names are shown as `--grove-*` today. In code they become a configurable prefix (proposed: `--nz-*`).
- Screenshots (local):
  - `scratchpad/figma/shots/03-data-viz-section.png` (whole section, 3000 px)
  - `scratchpad/figma/shots/03-area-chart-doc.png` (Doc/Area chart, 1600 px)
  - `scratchpad/figma/shots/03-chart-atoms-doc.png` (Doc/Chart atoms, 1300 px)

---

## 0. TL;DR

1. **There are 8 component sets on the page, but 10 things to build.** The page also shows a **Funnel** and a **Heatmap**. Both are instances of bare `COMPONENT`s (751:319, 751:393) that sit on **no page** (their parent chain is empty). The Area and Bar chart Hover variants place `Chart Tooltip` instances from a **second, duplicate Chart Tooltip set, 747:287**, which is also on no page. The local set 7275:13303 has **zero instances**. These are ghost or duplicate main components. The design team needs to relink them (see §5).
2. **Colors and type are well tokenised. Geometry is not.** Every fill and stroke is bound to a `Grove Color` variable, and every text node uses a `Grove/*` text style. **No non-Grove (Clario/Pipkin/...) references were found.** Spacing, sizes, radii (except the tooltip's `radius/md`), stroke widths, dash patterns and opacities are all **hard-coded**. Several of them are off-scale: 14, 10, 6, 2.
3. **No icons on this page.** Every mark is a RECTANGLE, ELLIPSE or VECTOR. There are no INSTANCE icons, so no icon library is involved.
4. **Interactivity shown:** `State=Default → Hover` (prototype `ON_HOVER → SMART_ANIMATE 160 ms`) on Area, Bar and Donut. Hover shows a crosshair, ringed dots, a tooltip, and dims siblings. The motion spec is in the descriptions: line path-trim over `duration/chart-draw`, area fade after 120 ms, bars grow from the baseline staggered by `stagger/item`, tooltip fades with 4 px travel over `duration/fast`.
5. **Missing on every set:** focus/keyboard, loading/skeleton, empty, error and disabled states. There is also no dark-mode render and no negative-delta tooltip.
6. **Accessibility failures:**
   - Axis labels (Body/M 14 px, `text/tertiary`) are **4.31:1 light / 4.03:1 dark**, which fails AA 4.5:1.
   - `chart/neutral` (comparison line, "Other", sparkline Down) is **1.57:1**, `chart/secondary` (dimmed bars) is **1.65:1**, and `chart/cat-2` is **2.17:1**. All fail WCAG 1.4.11 (3:1).
   - The heatmap's opacity ramp separates its first steps by only about 1.3:1.
7. **Suggested split:**
   - **Progress Bar** and **Progress Ring** go to `@nizivo/ui` as pure server components.
   - All charts go to an opt-in **`@nizivo/charts`**.
   - Sparkline, Legend Item, Funnel and Heatmap are server components rendered as SVG/HTML.
   - Area, Bar and Donut are split: the server renders the geometry and a small client island handles crosshair, tooltip and keyboard.

---

## 1. Page inventory (node IDs)

| Node | Type | Name | Notes |
|---|---|---|---|
| 7275:13285 | SECTION | Grove · 03 Data Visualization | 4000×1974 |
| 7275:13286 | FRAME | Doc/Chart atoms | V auto-layout, pad 48, gap 32, r 28 (`radius/2xl` bound), `bg/surface` |
| 7275:13290 | FRAME | Sets (inside Chart atoms) | H, gap 24 |
| 7275:13291 | COMPONENT_SET | **Chart Legend Item** | 3 variants |
| 7275:13303 | COMPONENT_SET | **Chart Tooltip** | 2 variants (**0 instances on page**) |
| 7275:13323 | COMPONENT_SET | **Sparkline** | 2 variants |
| 7275:13332 | FRAME | Doc/Area chart | r 28 bound `radius/2xl` |
| 7275:13336 | COMPONENT_SET | **Area Chart** | 2 variants |
| 7275:13383 | FRAME | Doc/Bar chart | r 28 bound |
| 7275:13387 | COMPONENT_SET | **Bar Chart** | 2 variants |
| 7275:13451 | FRAME | Doc/Donut chart | r 28 **unbound** |
| 7275:13455 | COMPONENT_SET | **Donut Chart** | 2 variants |
| 7275:13516 | FRAME | Doc/Funnel | r 28 unbound |
| 7275:13520 | FRAME | Stage (Funnel) | doc chrome, `border/brand` 1 px |
| 7275:13521 | INSTANCE | Funnel Chart | main **751:319** (ghost COMPONENT, no page) |
| 7275:13522 | FRAME | Doc/Progress | r 28 unbound |
| 7275:13526 | COMPONENT_SET | **Progress Bar** | 3 variants |
| 7275:13545 | COMPONENT_SET | **Progress Ring** | 4 variants |
| 7275:13566 | FRAME | Doc/Heatmap | r 28 unbound |
| 7275:13570 | FRAME | Stage (Heatmap) | doc chrome |
| 7275:13571 | INSTANCE | Heatmap | main **751:393** (ghost COMPONENT, no page) |

Doc chrome is **not** part of the components and must not become code. That covers the white cards (r 28), the dashed "stage" border (`border/brand`, dash 6,4), and the 24 px padding around each set.

---

## 2. Documentation text on the page (verbatim)

Section headers (H2 `Grove/Heading/H2`, `text/primary`) and descriptions (`Grove/Body/M`, `text/secondary`):

| Doc frame | Title | Description |
|---|---|---|
| 7275:13286 | Chart atoms | "Legend, tooltip and sparkline — the parts every chart is assembled from." |
| 7275:13332 | Line & area chart | "Sales over time. This period leads in brand green with a 10% wash; the comparison is a dashed neutral, never a second hue." |
| 7275:13383 | Bar chart | "Counts per period. Bars cap at 22px, round only at the data end, and dim their neighbours on hover." |
| 7275:13451 | Donut chart | "Share of a whole. Three categories at most, the rest folds into “Other”." |
| 7275:13516 | Funnel | "Checkout conversion. Each step shows its count and the share that moved on." |
| 7275:13566 | Heatmap | "Orders by weekday and hour. One hue, five steps of strength." |
| 7275:13522 | Progress | "Linear for quotas and uploads, ring for goals inside KPI tiles." |

Component and component-set `description` fields (**all `documentationLinks` are empty**):

| Node | Description |
|---|---|
| Chart Legend Item 7275:13291 | *(empty)* |
| Chart Tooltip 7275:13303 (and duplicate 747:287) | "Follows the crosshair; flips side near edges. Fade + 4px travel, duration/fast. Values in Numeric/M (tabular)." |
| Sparkline 7275:13323 | "Inline trend, 112×36. Line draws in duration/chart-draw on reveal." |
| Area Chart 7275:13336 | "Time series, 1 axis. Hover: crosshair + ringed dots + Chart Tooltip (Series=2). Reveal: line path-trims 0→1 over duration/chart-draw, area fades in after 120ms." |
| Bar Chart 7275:13387 | "Orders per day. Hover dims siblings to chart/secondary and shows Chart Tooltip. Reveal: bars grow from the baseline, staggered by stagger/item." |
| Donut Chart 7275:13455 | "Share-of-whole chart, max 3 categories + Other. Hover dims non-focused segments to 35%." |
| Progress Bar 7275:13526 | *(empty)* |
| Progress Ring 7275:13545 | *(empty)* |
| Funnel Chart 751:319 (ghost) | "Conversion funnel. Bar width = count ÷ first step; mono column = step-to-step rate." |
| Heatmap 751:393 (ghost) | *(empty)* |
| All individual variants | *(empty)* |

Related guidance from the snapshot, on the token `chart/cat-*`: "Validated categorical slot (CVD ΔE≥14, light+dark). Fixed order, never cycled; 4th+ series fold into chart/neutral 'Other'." Numeric/* text styles: "tabular-nums; animate with count-up, duration/count-up".

---

## 3. Visual language (from the screenshots)

- **Calm, editorial, single-hue.** Brand green (`chart/primary` = green/600 `#216c47` light) carries the data. Comparisons are **dashed neutral grey, never a second hue**. Categorical colour (green / lime / teal + grey "Other") appears only in the donut and the legend Dot mark.
- **Low chrome:**
  - Gridlines are 1 px in `chart/grid` (`#eef0ec`, almost invisible).
  - The zero baseline is 1 px in `border/default`.
  - There is **no y-axis line** and no tick marks.
  - Y labels are right-aligned in a 44 px (area) or 36 px (bar) gutter.
  - X labels sit 14 px under the baseline. The first and last labels are clamped inward (left-aligned at the plot start, right-aligned at the plot end). Middle labels are centred on their tick.
- **Strokes:** all lines are 2 px with round caps and joins. The current-value end-dot is 8 px with a 2 px `bg/surface` halo (an OUTSIDE stroke), so it reads as "punched out" of the line.
- **Area:** a **flat 10% wash** of `chart/primary` (layer opacity 0.1, not a gradient) between the line and the baseline.
- **Bars:** 22 px max width. Only the top corners are rounded (4,4,0,0). Bars are about 42 px apart (gap about 20 px). They are dense and evenly rhythmic.
- **Donut:** a thick ring (26 px on a 200 px chart, inner radius ratio 0.74). There are hairline gaps of about 0.03 rad (1.7°, about 3 px at the outer edge) between flat-ended segments. The total sits in the centre in Numeric/L. The legend is a table-like list: dot, name, value (Numeric/M), share (Mono/M, tertiary).
- **Tooltip:** a white card (`bg/surface-raised`, 1 px `border/subtle`, `radius/md` 12, `Grove/Elevation/3 Popover` shadow), fixed width 200, compact rows. **No glass or blur on this page.**
- **Typography for numbers:**
  - Values use Geist Numeric styles (tabular).
  - Percentages and rates use **Geist Mono**, which reads like a ledger.
  - Axis labels use Body/M.
- **Density:** medium-dense. 14 px text throughout. The smallest gaps are 6–8 px.
- **Motion cues:** draw-in path trim, a staggered bar grow, tooltip fade with 4 px lift, and a smart-animate hover crossfade (160 ms).
- **Progress:** an 8 px pill track. The **Warning fill renders brownish** (it uses `text/warning` = amber/700 `#7c560a`), not amber, which is visibly off-palette in the screenshot. The ring has flat caps, about 7 px thick on 72 px.

---

## 4. Components

Notation in the anatomy: `L=H|V` is the auto-layout direction. `pad` is top,right,bottom,left. `sz` is horizontal/vertical sizing (F=fixed, H=hug, L=fill). `{token}` means bound to a variable. Anything without `{}` is **hard-coded**.

### 4.1 Chart Legend Item — 7275:13291

**Raw componentPropertyDefinitions**

```json
{
  "Label#747:0": { "type": "TEXT", "defaultValue": "This period" },
  "Mark": { "type": "VARIANT", "defaultValue": "Line", "variantOptions": ["Line", "Dashed", "Dot"] }
}
```

**Variant matrix:** `Mark=Line` 7275:13292 (92×21), `Mark=Dashed` 7275:13296 (92×21), `Mark=Dot` 7275:13300 (86×21). The axis is complete. There is no `Bar`/`Square` mark (needed for bar and heatmap legends) and no `Area` mark.

**Anatomy (Mark=Line)**

```
COMPONENT 92×21 L=H gap=8 (raw) align=center
  FRAME "Swatch" 14×10 clip
    VECTOR "Stroke" 14×0 stroke {chart/primary} 2px cap ROUND join ROUND   (Dashed: {chart/neutral} dash 4,3)
  TEXT "Label" Grove/Body/M {text/secondary}  ← bound to TEXT prop Label#747:0
```

For Mark=Dot, the Swatch is an `ELLIPSE` 8×8 `{chart/cat-1}`.

**Hard-coded values:** gap 8 (=space/2, unbound), swatch 14×10, stroke 2 (border-width tokens are 1/1.5/2 but unbound), dash 4,3, dot 8.

**Issues**
- The swatch colour is fixed per variant: Line=`chart/primary`, Dashed=`chart/neutral`, Dot=`chart/cat-1`. In code, colour must be a prop that is independent of the mark shape.
- **Three different legend swatch geometries exist across the page.** The legend dot is 8 px, the donut legend dot is 10 px (a custom row, not this component), and the tooltip swatch is a 10×3 r2 bar. The donut legend does **not** reuse Chart Legend Item.
- The dash pattern differs from the chart it describes: legend 4,3 vs chart line 5,4.
- It is 21 px tall. If legends become interactive (toggle series), the hit target is below 24 px (WCAG 2.5.8) and below 44 (`size/touch-min`).
- The default label for the Dashed variant is still "This period" (cosmetic).

**Proposed API**

```tsx
<ChartLegend>                                  // <ul>, horizontal wrap | vertical
  <ChartLegendItem mark="line" color="primary" label="This period" />
  <ChartLegendItem mark="dashed" color="neutral" label="Previous" />
  <ChartLegendItem mark="dot" color="cat-1" label="Online store" value="$64,120" share="52%" />
</ChartLegend>
// mark: 'line' | 'dashed' | 'dot' | 'square' (new) | 'area' (new)
// color: ChartColorToken ('primary'|'secondary'|'tertiary'|'neutral'|'negative'|'cat-1'|'cat-2'|'cat-3') | CSS color
// optional: value / share slots (donut legend), interactive?: { pressed, onPressedChange } → renders <button aria-pressed>
```

- **a11y:** static by default (`<li>`). The swatch is `aria-hidden`. An interactive series toggle is a `button[aria-pressed]` with a min 24×24 hit area (44 on touch).
- **RSC:** server. Only the interactive variant needs a client boundary.
- **Tier / package:** primitive, `@nizivo/charts`.

### 4.2 Chart Tooltip — 7275:13303 (duplicate 747:287 is the one actually used)

**Raw componentPropertyDefinitions**

```json
{ "Series": { "type": "VARIANT", "defaultValue": "1", "variantOptions": ["1", "2"] } }
```

**Variant matrix:** `Series=1` 7275:13304 (200×75), `Series=2` 7275:13310 (200×133). Series=2 also adds the **Delta** row. There is no 3-series variant, no negative-delta variant and no flipped/left placement variant.

**Anatomy (Series=2)**

```
COMPONENT 200×133 L=V pad=12,14,12,14 (raw) gap=8 (raw) sz=F/H
  fill {bg/surface-raised}  stroke {border/subtle} 1px  radius {radius/md}=12 (bound, all 4 corners)
  effect style Grove/Elevation/3 Popover
  TEXT "Title" Grove/Label/M Strong {text/primary}  "Tue, Oct 14"
  FRAME "Row" L=H gap=8 sz=Fill/Hug
    RECTANGLE 10×3 r=2 {chart/primary}           ← series swatch (raw radius 2: no token)
    TEXT "This period" Grove/Body/M {text/secondary} (fill width)
    TEXT "$6,284"      Grove/Numeric/M {text/primary}
  FRAME "Row" … swatch {chart/neutral} "Previous" "$4,910"
  FRAME "Delta" L=H gap=6
    TEXT "+28.0%" Grove/Label/M Strong {text/success}
    TEXT "vs previous" Grove/Body/M {text/tertiary}
```

**Hard-coded values:** padding 12/14 (**14 is off the space scale**: space/3=12, space/4=16), gaps 8/6, width 200, swatch 10×3, swatch radius 2.

**Behaviour (from the description):** follows the crosshair, flips side near edges, fades with 4 px travel (`distance/lift`) over `duration/fast` (140 ms). Values use Numeric/M (tabular).

**Issues**
- **Duplicate set.** Area and Bar Hover use instances of **747:287** (`Series=1` 747:254, `Series=2` 747:260, key `d09b8a686df1c78c4deaab3816a1b2d3eafbdecf`), which has no page parent. The published-looking local set 7275:13303 is unused. Designers editing 7275:13303 will not affect the charts.
- There is no negative state: the delta is always `text/success`. A down delta should use `text/critical`, and it needs a non-colour cue such as a sign or arrow.
- In dark mode, `bg/surface-raised` (neutral/850) vs `bg/surface` (neutral/900) is **1.10:1**. The card relies entirely on `border/subtle` and a shadow, and the snapshot notes there is no dark elevation variant.
- In Bar Hover the tooltip (at 434,0, 200×75) **covers the top of the hovered bar** (Bar 12, x 523–545, top y=23). The placement logic must avoid the active datum.

**Proposed API**

```tsx
<ChartTooltip
  title="Tue, Oct 14"
  rows={[{ id:'cur', label:'This period', value:6284, color:'primary', mark:'line' },
         { id:'prev', label:'Previous', value:4910, color:'neutral', mark:'dashed' }]}
  delta={{ value: 0.28, label: 'vs previous' }}       // sign → tone (success|critical) + sign char
  format={{ style:'currency', currency:'USD', maximumFractionDigits:0 }}  // Intl options (serializable)
/>
// Compound alternative for custom content:
<ChartTooltip.Root><ChartTooltip.Title/><ChartTooltip.Row/><ChartTooltip.Delta/></ChartTooltip.Root>
```

The Figma `Series` variant maps to `rows.length` and is not a prop.

- **a11y:** this is not a WAI-ARIA tooltip, because it is not attached to a focusable trigger. Its content is mirrored to an `aria-live="polite"` region owned by the chart's interaction layer when the active index changes by keyboard. The visual card is `aria-hidden`, so pointer users do not get announcements on every hover frame.
- **RSC:** the content is server-safe. Positioning and visibility are client (split): a small positioner with flip/shift inside the chart bounds, using either `@floating-ui/dom` `computePosition` or a simple in-chart clamp.
- **Tier / package:** composite, `@nizivo/charts`. It should reuse the core `Surface`/popover tokens (`--nz-bg-surface-raised`, `--nz-elevation-3`).

### 4.3 Sparkline — 7275:13323

**Raw componentPropertyDefinitions**

```json
{ "Trend": { "type": "VARIANT", "defaultValue": "Up", "variantOptions": ["Up", "Down"] } }
```

**Variants:** `Trend=Up` 7275:13324, `Trend=Down` 7275:13328. Both are fixed at 112×36.

**Anatomy (Up)**

```
COMPONENT 112×36 (no auto-layout; absolute children)
  VECTOR "Area" 112×32 opacity 0.1 fill {chart/primary}   cubic path (smooth)
  VECTOR "Line" 112×28 stroke {chart/primary} 2px round cap/join, 12 points (11 cubic segments)
  ELLIPSE "End dot" 8×8 fill {chart/primary} stroke {bg/surface} 2px OUTSIDE (halo)
```

For Down, all three use `{chart/neutral}`.

**Hard-coded values:** size 112×36, 0.1 opacity, 2 px stroke, 8 px dot.

**Motion:** "Line draws in duration/chart-draw on reveal" (700 ms; Reduced mode 0).

**Issues**
- **Down uses `chart/neutral`, not `chart/negative`.** This reads as an intentional "down ≠ bad" convention, and it should be documented. The neutral line is **1.57:1** against the surface, so it fails 1.4.11 if the sparkline is the only carrier of meaning. In practice it sits next to a Delta, so treat it as decorative (`aria-hidden`) and require adjacent text.
- `Trend` is derived from the data and should not be a prop.
- There is no flat/zero-change state and no area-off option.

**Proposed API**

```tsx
<Sparkline data={number[] | {x,y}[]} tone="auto" | 'brand' | 'neutral' | 'negative'
  area={true} endDot={true} curve="monotone" width={112} height={36}
  label="Sales trend, up 28% over 30 days" /* role=img when provided, else aria-hidden */ />
```

`tone="auto"` resolves to `brand` when last ≥ first and to `neutral` otherwise, matching Figma.

- **RSC:** server (pure SVG; the draw-in is CSS `stroke-dashoffset` with `pathLength=1`).
- **Tier:** primitive.
- **Package:** `@nizivo/charts`. **Decision for the orchestrator:** a sparkline probably appears inside the KPI Tile on page 04 (unverified here). Either keep Sparkline in `@nizivo/ui` (it is tiny and has no d3 dependency if hand-rolled), or make `@nizivo/charts` an optional peer of the dashboard tile with a `trend` slot.

### 4.4 Area Chart — 7275:13336

**Raw componentPropertyDefinitions**

```json
{ "State": { "type": "VARIANT", "defaultValue": "Default", "variantOptions": ["Default", "Hover"] } }
```

**Variants:** `State=Default` 7275:13337 (720×280), `State=Hover` 7275:13358 (720×280). Default has a prototype reaction: `ON_HOVER → NODE 7275:13358, SMART_ANIMATE 0.16 s`.

**Anatomy (Default)** — no auto-layout; everything is absolutely positioned.

```
COMPONENT 720×280
  FRAME "Grid & axes" 720×280 clip
    RECTANGLE 656×1 @56,244 {border/default}              ← zero baseline
    RECTANGLE 656×1 @56,185/126/67/8 {chart/grid} ×4       ← gridlines, 59px step
    TEXT "$0" "$2k" "$4k" "$6k" "$8k"  44px wide, right-aligned, x=0, Grove/Body/M {text/tertiary}
    TEXT "Oct 1" "Oct 8" "Oct 15" "Oct 22" "Oct 30"  y=258, Grove/Body/M {text/tertiary}
  VECTOR "Area · This period" 656×230 @56,13.9 opacity 0.1 fill {chart/primary}   (cubic, closed to baseline)
  VECTOR "Line · Previous period" 656×59 @56,78.8 stroke {chart/neutral} 2px dash 5,4 round
  VECTOR "Line · This period" 656×109 @56,13.9 stroke {chart/primary} 2px round (30 points = Oct 1–30, cubic)
  ELLIPSE "End dot" 8×8 @708,18.75 fill {chart/primary} stroke {bg/surface} 2px OUTSIDE
```

**Hover diff (7275:13358)** — the base layers are unchanged; these are added:

```
RECTANGLE "Crosshair" 1×236 @350,8 {border/strong}
ELLIPSE "Hover dot" 10×10 {chart/neutral} + 2px {bg/surface} halo     (previous)
ELLIPSE "Hover dot" 10×10 {chart/primary} + 2px {bg/surface} halo     (this period)
INSTANCE "Chart Tooltip" (747:260 Series=2 — duplicate set) @364,38.8  → 14px right of crosshair
```

**Plot geometry:**
- Plot box x 56–712, y 8–244 (656×236). The y-gutter is 44 px plus a 12 px gap.
- The y-domain is 0–8k with 5 ticks. The x-domain covers 30 daily points. Ticks fall at day 1/8/15/22/**30**, which are 7-day steps with the final tick forced to the series end.
- The curve is a smooth cubic (likely Catmull-Rom or monotone). Use `curveMonotoneX` in code to avoid overshoot below 0.

**Hard-coded values:** every position and size, the 59 px grid spacing, the 44 px gutter, the 0.1 wash opacity, 2 px strokes, dash 5,4, dots 8 and 10, the 14 px tooltip offset, and 160 ms smart-animate (no matching token: `duration/fast`=140, `base`=220).

**Motion (from the description):** the line path-trims 0→1 over `duration/chart-draw` (700 ms). The area fades in **after 120 ms** (no token for that delay). The tooltip uses `duration/fast` and fades with 4 px travel.

**Issues**
- Axis labels are 4.31:1 (light) and 4.03:1 (dark), which fails AA for 14 px text.
- The previous-period line is 1.57:1 against the surface. The dashing helps distinguish it, but the mark itself fails 1.4.11.
- The crosshair is 1.57:1. That is acceptable for a transient guide, but note it.
- Tooltip values ($6,284 / $4,910) do not match the plotted point heights (placeholder data; cosmetic).
- Only 2 series are shown. There is no multi-series (categorical) variant and no guidance for negative values. `chart/negative` is unused.
- Empty, loading, error, focus and dark states are missing.

**Proposed API**

```tsx
<AreaChart
  data={rows}                         // [{ date:'2025-10-01', current: 4200, previous: 3700 }, …]
  x="date"                            // key (serializable) — or accessor fn when used fully client-side
  series={[
    { key:'current',  label:'This period', color:'primary', area:true, endDot:true },
    { key:'previous', label:'Previous',   color:'neutral', variant:'dashed' },
  ]}
  xScale={{ type:'time', ticks:'week', clampEdgeLabels:true }}
  yScale={{ nice:true, ticks:5, zero:true }}
  curve="monotone" | "linear" | "step"
  format={{ y:{ style:'currency', currency:'USD', notation:'compact' },
            tooltip:{ style:'currency', currency:'USD', maximumFractionDigits:0 },
            x:{ month:'short', day:'numeric' }, tooltipTitle:{ weekday:'short', month:'short', day:'numeric' } }}
  compare={{ from:'current', to:'previous', label:'vs previous' }}   // drives tooltip Delta
  height={280}  /* width = 100% via ResizeObserver-free viewBox */
  status="ready" | "loading" | "empty" | "error"
  slots={{ empty, error, tooltip, legend }}
  title="Sales" description="Daily sales, Oct 1–30, vs previous period"
  animate="reveal" | false
/>
```

- **a11y:**
  - `<figure>` with `<figcaption>` (title and summary).
  - SVG `role="img"` `aria-labelledby`.
  - A visually-hidden `<table>` of the data, or a "View as table" toggle.
  - The interactive layer is a focusable group (`tabindex=0`, `aria-roledescription="interactive chart"`). ←/→ moves the active index, Home/End jump to the ends, PageUp/PageDown step ±7, and Esc hides the tooltip.
  - Active-point text goes to a polite live region.
- **RSC:** **split**. The server computes scales and paths and renders the full SVG, including gridlines, labels and the static end-dot. A client island (`<ChartInteraction points=… />`) receives a serialisable array of `{x, values, formatted}` and renders the crosshair, hover dots and tooltip.
- **Tier / package:** heavy, `@nizivo/charts`.

### 4.5 Bar Chart — 7275:13387

**Raw componentPropertyDefinitions**

```json
{ "State": { "type": "VARIANT", "defaultValue": "Default", "variantOptions": ["Default", "Hover"] } }
```

**Variants:** `State=Default` 7275:13388 (640×260), `State=Hover` 7275:13419. Default has a reaction: `ON_HOVER → 7275:13419 SMART_ANIMATE 0.16 s`.

**Anatomy (Default)** — absolute positioning.

```
COMPONENT 640×260
  RECTANGLE 592×1 @48,224 {border/default}            ← baseline
  RECTANGLE 592×1 @48,157/89/22 {chart/grid} ×3       ← ticks 100/200/300 (67.4px step)
  TEXT "0" "100" "200" "300"  36px wide right-aligned  Grove/Body/M {text/tertiary}
  RECTANGLE "Bar 1…14"  22×(122.9…210.6)  radius [4,4,0,0] (raw)  fill {chart/primary}
       x = 58 + i·42.3  (band step 42.3, bar 22 → inner padding ≈0.48, outer ≈10px)
  TEXT "17" "19" "21" "23" "25" "27" "29" "30"  y=238, centered under bars 1,3,5,…,13,14
```

**Hover diff (7275:13419):** Bars 1–11, 13 and 14 change to `{chart/secondary}`. **Bar 12 stays `{chart/primary}`**, so it is the hovered bar. A tooltip is added: INSTANCE 747:254 (duplicate set, Series=1) at 434,0.

**Issues**
- **The y-domain is not "niced".** Bar 14 (≈313) rises above the top tick (300). The top of the bar (y=13) goes past the 300 gridline (y=22), so in code use `nice()` with a max over the data.
- The x labels are thinned to every other bar, but the last label is forced, so "29" and "30" sit adjacent and crowd each other.
- Bar radius 4 is not bound (`radius/xs`), and the 22 px width cap is not a token.
- Hover dimming uses a **token swap to `chart/secondary`**, while the Donut uses **opacity 0.35/0.45**. These are two strategies for the same intent. `chart/secondary` in dark mode (green/800 vs neutral/900) is **1.59:1**, so dimmed bars nearly disappear. Recommend a single opacity-based dim (`--nz-chart-dim-opacity`) or a token tuned per mode.
- The tooltip occludes the active bar (see 4.2).
- Bars are 22 px wide. The hit area must be the full band column (≈42×236), not the rect.
- There are no negative-value bars, no stacked or grouped variants, no horizontal orientation, and no value labels.

**Motion:** "bars grow from the baseline, staggered by stagger/item" (40 ms; Reduced 0). Use CSS `transform: scaleY()` with `transform-origin: bottom` and `transition-delay: calc(var(--i) * var(--nz-stagger-item))`.

**Proposed API**

```tsx
<BarChart data={rows} x="day" y="orders"
  color="primary" maxBarWidth={22} radius="xs" roundedEnd="data"   // round only at data end (also for negatives)
  orientation="vertical" | "horizontal"
  xTicks={{ every:2, includeLast:true }} yScale={{ nice:true, ticks:4 }}
  dim="opacity" | "token"                // hover/focus dim strategy
  format={{ y:{ maximumFractionDigits:0 }, tooltipTitle:{ weekday:'short', month:'short', day:'numeric' } }}
  status, slots, title, description, animate />
// Future: series[] + layout="grouped"|"stacked" using chart/cat-* (max 3 + Other)
```

- **a11y:** the same model as Area. Bars are the focus stops (roving). The `aria-label` per bar is generated (e.g. "Oct 28, 293 orders").
- **RSC:** split.
- **Tier / package:** heavy, `@nizivo/charts`.

### 4.6 Donut Chart — 7275:13455

**Raw componentPropertyDefinitions**

```json
{ "State": { "type": "VARIANT", "defaultValue": "Default", "variantOptions": ["Default", "Hover"] } }
```

**Variants:** `State=Default` 7275:13456 (482×200), `State=Hover` 7275:13486. Default has a reaction: `ON_HOVER → 7275:13486 SMART_ANIMATE 0.16 s`.

**Anatomy (Default)**

```
COMPONENT 482×200 L=H gap=32 (raw) align=center
  FRAME "Ring" 200×200 clip
    ELLIPSE "Segment · Online store"   arc -1.56→1.68 rad  innerRadius 0.74  {chart/cat-1}
    ELLIPSE "Segment · Point of sale"  arc  1.71→3.44       {chart/cat-2}
    ELLIPSE "Segment · Wholesale"      arc  3.47→4.32       {chart/cat-3}
    ELLIPSE "Segment · Other"          arc  4.35→4.70       {chart/neutral}
       → starts at 12 o'clock, clockwise, gap ≈0.03 rad (1.7°), flat ends, thickness 26px
    FRAME "Center" L=V gap=2 (raw), centered absolutely
      TEXT "$123.3k" Grove/Numeric/L {text/primary}
      TEXT "Total sales" Grove/Body/M {text/secondary}
  FRAME "Legend" L=V gap=14 (raw, off-scale)
    FRAME "Row" ×4 L=H gap=10 (raw, off-scale)
      ELLIPSE 10×10 {chart/cat-n | chart/neutral}
      TEXT name   Grove/Label/M {text/secondary}  fixed width 120
      TEXT value  Grove/Numeric/M {text/primary}  "$64,120"
      TEXT share  Grove/Mono/M {text/tertiary}    "52%"
```

**Hover diff (7275:13486)**, with "Online store" focused:
- The other three segments go to `opacity 0.35`.
- The Center swaps to "52%" (Numeric/L) and "Online store" (Body/M).
- The other three legend rows go to `opacity 0.45`.
- No tooltip is used. The centre label *is* the tooltip, which is a good pattern to keep.
- There is no segment pop-out or scale.

**Data consistency:** 64,120 + 34,526 + 17,263 + 7,398 = 123,307 → "$123.3k". The shares 52/28/14/6 sum to 100. ✔

**Issues**
- Segment dim (0.35) and legend-row dim (0.45) differ, and both are raw opacities.
- Adjacent segment contrast is low: cat-1/cat-2 is 2.02 (light) and 1.74 (dark), and cat-2/cat-3 is 1.87. The 1.7° gap is doing the separation work. In code, render the gaps as a `bg/surface` stroke, or use `padAngle`, so they survive dark mode.
- `chart/cat-2` lime vs white is 2.17:1, which fails 1.4.11. It is acceptable only because the legend carries the values. **The legend is therefore mandatory, not optional.**
- The legend does not reuse Chart Legend Item, and its dot is 10 px vs the legend item's 8 px.
- Hard-coded values: size 200, thickness ratio 0.74 (Progress Ring uses 0.8, so there are two thickness systems), gaps 32/14/10/2, and the 120 px name column.
- There are no 1-, 2- or 3-category variants, no "no data" ring, and no guidance on the minimum visible segment (Other at 6% is already thin).

**Proposed API**

```tsx
<DonutChart data={[{ id:'online', label:'Online store', value:64120 }, …]}
  maxCategories={3} otherLabel="Other"                   // fold helper; colors cat-1..3 + neutral, fixed order
  size={200} thickness={26} padAngle={0.03}
  center={{ value: total, label: 'Total sales' }}        // slot; on focus → { value: share, label: segment.label }
  legend="right" | "bottom" | false                       // uses ChartLegendItem mark="dot" + value/share slots
  format={{ value:{ style:'currency', currency:'USD', notation:'compact' }, share:{ style:'percent' } }}
  activeId / defaultActiveId / onActiveChange             // controlled + uncontrolled focus segment
  status, title, description, animate />
```

- **a11y:**
  - Segments are focusable through the legend rows, which are buttons in a listbox-like roving group, or through the SVG group with ←/→.
  - The centre text is in a polite live region.
  - The legend table is the textual alternative.
- **RSC:** split. The server renders the arcs, centre and legend. A client island handles the active segment, dimming and centre swap. Without a client island the chart is fully usable static.
- **Tier / package:** heavy (composite+), `@nizivo/charts`.

### 4.7 Progress Bar — 7275:13526

**Raw componentPropertyDefinitions**

```json
{ "Tone": { "type": "VARIANT", "defaultValue": "Brand", "variantOptions": ["Brand", "Warning", "Critical"] } }
```

**Variants:**
- `Tone=Brand` 7275:13527: "Monthly goal 68%"
- `Tone=Warning` 7275:13533: "Plan storage 86%"
- `Tone=Critical` 7275:13539: "Low stock 12%"

All are 320×36.

**Anatomy**

```
COMPONENT 320×36 L=V gap=8 (raw)
  FRAME "Top" L=H space-between
    TEXT label  Grove/Label/M {text/secondary}
    TEXT value  Grove/Numeric/M {text/primary}  "68%"
  FRAME "Track" 320×8 radius 4 (raw) clip fill {chart/track}
    RECTANGLE "Fill" (value% × 320)×8 radius 4 (raw)
       Brand {chart/primary} · Warning {text/warning} · Critical {text/critical}
```

**Issues**
- **The fills borrow text tokens:** `text/warning` (amber/700 `#7c560a`, which renders brown) and `text/critical`. This is the concrete gap behind the missing solid warning and critical backgrounds noted in the snapshot. Add `chart/warning` and `chart/critical`, or `bg/warning` and use the existing `bg/critical`. `chart/negative` exists but is not used here.
- There is no Success tone, no Neutral tone, and no **indeterminate** state (uploads, per the doc text). There are no size variants, no label-less variant and no helper or caption text.
- **Semantics:** "Plan storage 86%" and "Low stock 12%" are **gauges (meters)**, not task progress. "Monthly goal" is goal progress. Code should support `role="meter"` as well as `progressbar`.
- The track (`chart/track`) vs surface is 1.15:1. That is fine, because the fill-vs-track ratio is what matters: brand 5.55, warning 5.74, critical 4.96 (light); brand 4.12, critical 3.11 (dark).
- Radius 4 and height 8 are unbound.

**Proposed API**

```tsx
<ProgressBar value={68} max={100} label="Monthly goal" showValue
  tone="brand" | "success" | "warning" | "critical" | "neutral" | "auto"
  thresholds={{ warning: 80, critical: 95 }}             // tone="auto"; direction configurable (low-is-bad for stock)
  kind="progress" | "meter"                              // role progressbar vs meter
  size="sm" | "md"  indeterminate={false}
  format={{ style:'percent' }} valueText="68 of 100 orders" />
```

- **a11y:** a `div` with `role="progressbar"` or `"meter"`, `aria-valuenow/min/max`, `aria-valuetext` (the formatted value), and `aria-labelledby` pointing at the label. Indeterminate omits `aria-valuenow`. Prefer this over native `<progress>`/`<meter>` because styling those consistently across browsers is unreliable. Expose `asChild` or `native` as an option.
- **RSC:** server. The fill uses `transform: scaleX(var(--value))` or `width`, with a transition on `duration/base`. Indeterminate is a CSS animation, disabled when `prefers-reduced-motion` is set.
- **Tier / package:** primitive, **`@nizivo/ui`**.

### 4.8 Progress Ring — 7275:13545

**Raw componentPropertyDefinitions**

```json
{ "Value": { "type": "VARIANT", "defaultValue": "25", "variantOptions": ["25", "50", "75", "100"] } }
```

**Variants:** `Value=25` 7275:13546, `50` 7275:13551, `75` 7275:13556, `100` 7275:13561. All are 72×72.

**Anatomy**

```
COMPONENT 72×72
  FRAME "Ring" 72×72 clip
    ELLIPSE track 0→2π innerRadius 0.8 {chart/track}       → 7.2px thickness
    ELLIPSE value -π/2 → (-π/2 + value·2π) innerRadius 0.8 {chart/primary}  (flat ends)
    TEXT "25%" Grove/Label/M Strong {text/primary}  absolutely placed (manual centering, x varies 17.5–21.5)
```

**Issues**
- `Value` as a 4-step variant is a Figma limitation. In code it becomes `value: number`.
- There is no Tone axis (Progress Bar has one), no size axis, and no custom centre content (KPI tiles may want an icon or a label).
- Thickness 0.8 ratio vs donut 0.74 means there is no shared thickness token.
- Caps are flat. Decide whether round caps (`stroke-linecap: round`) are on-brand.
- The label is absolutely positioned rather than centred by layout.

**Proposed API**

```tsx
<ProgressRing value={25} max={100} size={72} thickness={7}
  tone="brand"|"success"|"warning"|"critical"|"auto"  kind="progress"|"meter"
  label="Monthly goal"   /* accessible name */  showValue  children={/* custom center slot */} />
```

The SVG is a circle with `pathLength=100` and `stroke-dasharray`, rotated -90°.

- **RSC:** server.
- **Tier / package:** primitive, **`@nizivo/ui`**.

### 4.9 Funnel Chart — ghost main component 751:319 (instance 7275:13521)

**componentPropertyDefinitions:** none. It is a bare COMPONENT with no set and an empty parent chain (key `6de76da41db20a96c0c3be745da0d759ae1ae70a`).

**Description:** "Conversion funnel. Bar width = count ÷ first step; mono column = step-to-step rate."

**Anatomy**

```
INSTANCE 748×180 L=V gap=12 (raw)
  FRAME "Step · <name>" ×4 L=H gap=16 (raw) align=center
    TEXT name  Grove/Label/M {text/secondary}  fixed 150
    FRAME "Track" 420×36 radius 8 (raw; = radius/sm) {chart/track}
      RECTANGLE "Bar" (count/first × 420)×36 radius 8 {chart/primary}
    TEXT count Grove/Numeric/M {text/primary} fixed 70   "48,210" "9,642" "4,628" "2,914"
    TEXT rate  Grove/Mono/M {text/brand} fixed 60        "—"(text/tertiary) "20.0%" "48.0%" "63.0%"
```

The data checks out: 9,642 / 48,210 = 20.0%, 4,628 / 9,642 = 48.0%, and 2,914 / 4,628 = 63.0%. The bar widths 84, 40.3 and 25.4 match count ÷ first × 420.

**Issues**
- It is not on any page, so designers cannot edit it.
- There are no variants: no hover, no drop-off annotation, no overall-conversion summary, and no vertical/horizontal option.
- Bars become very thin for late steps (6% → 25 px). A minimum visible width is needed.

**Proposed API**

```tsx
<FunnelChart steps={[{ id, label, value }]} basis="first"|"previous"
  rate="previous"|"first"|false  format={{ value:{}, rate:{ style:'percent', minimumFractionDigits:1 } }}
  minBarWidth={4} />
```

Semantically this is a list (`<ol>`), where each step has visible text. The bar is `aria-hidden`.

- **RSC:** server.
- **Tier / package:** composite, `@nizivo/charts`.

### 4.10 Heatmap — ghost main component 751:393 (instance 7275:13571)

**componentPropertyDefinitions:** none. It is a bare COMPONENT with an empty parent chain (key `ef6b2dd78a53b01a8bb6f09f28116371794f6321`). No description.

**Anatomy**

```
INSTANCE 500×322 L=V gap=6 (raw = space/1-5 value, unbound)
  FRAME "Mon"…"Sun" ×7 L=H gap=6
    TEXT day  Grove/Label/M {text/tertiary} fixed 44
    RECTANGLE ×12 32×32 radius 6 (raw, off-scale: xs=4, sm=8) fill {chart/primary} at layer opacity
         0.08 | 0.25 | 0.45 | 0.70 | 1.00   (5 quantized steps)
  FRAME "Hours" 44px spacer + 12 × TEXT Grove/Mono/M {text/tertiary} "00","","04","",…,"20",""  (2-hour buckets, label every 4h)
  FRAME "Scale"  "Fewer" + 5 swatches 16×16 r4 (same 5 opacities) + "More"  Grove/Label/M {text/tertiary}
```

**Issues**
- It is a ghost component.
- **The opacity ramp breaks in dark mode.** `chart/primary` dark is green/400, and 8% of it over neutral/900 is invisible. Neighbouring steps are hard to tell apart: 8%→25% is 1.30:1 and 70%→100% is 1.92:1.
- Replace it with **5 sequential solid tokens** (`chart/seq-1…5`) defined per mode.
- There is no hover or tooltip state. Cells are 32 px with a 6 px gap, a 38 px pitch, which passes 24 px AA but is below the 44 touch minimum.
- The day label is tertiary: 4.31:1, which fails.

**Proposed API**

```tsx
<Heatmap data={[{ row:'Mon', col: 0, value: 12 }, …]} rows={['Mon',…]} cols={[0,2,…,22]}
  steps={5} scale="quantize"|"quantile"  colLabelEvery={2} legend={{ low:'Fewer', high:'More' }}
  format={{ col:(n)=>pad2(n) /* or Intl hour */, value:{} }}  cellSize={32} gap={6} radius="xs" />
```

- **a11y:** a native `<table>` with visually styled cells is the most robust option. Every cell has text (value) for assistive technology. An interactive variant uses the grid pattern (`role="grid"`, arrow-key navigation) with a tooltip.
- **RSC:** server. A tooltip, if added, is a client island.
- **Tier / package:** composite, `@nizivo/charts`.

---

## 5. Ghost and duplicate main components (design-file bug)

| Main component | Type | Key | Parent chain | Used by |
|---|---|---|---|---|
| 747:287 "Chart Tooltip" (variants 747:254 `Series=1`, 747:260 `Series=2`) | COMPONENT_SET | d09b8a686df1c78c4deaab3816a1b2d3eafbdecf | **empty** (no page) | Area Hover 7275:13382, Bar Hover 7275:13450 |
| 751:319 "Funnel Chart" | COMPONENT | 6de76da41db20a96c0c3be745da0d759ae1ae70a | **empty** | Doc/Funnel instance 7275:13521 |
| 751:393 "Heatmap" | COMPONENT | ef6b2dd78a53b01a8bb6f09f28116371794f6321 | **empty** | Doc/Heatmap instance 7275:13571 |

Instance usage counted on this page: `Chart Tooltip(747:287)` ×2, `Funnel Chart(751:319)` ×1, `Heatmap(751:393)` ×1. The **local `Chart Tooltip` 7275:13303 has 0 instances**.

The `Label#747:0` property ID on Chart Legend Item also comes from the "747" lineage. The page was probably duplicated from an earlier build, and the instances kept pointing at the originals. `removed=false`, but they are reachable only through `getMainComponentAsync`.

**Ask for the design team:**
- Swap the Area and Bar Hover tooltips to 7275:13303.
- Promote Funnel Chart and Heatmap to proper component sets on this page, with State/Default/Hover variants.
- Delete or restore the originals.

**For code:** treat 7275:13303 as the source of truth (its content is identical to 747:287). Build Funnel and Heatmap from the instance anatomy.

---

## 6. Token usage map (this page)

| Token | Light / Dark | Where used |
|---|---|---|
| chart/primary | green/600 `#216c47` / green/400 `#4c9e71` | area line and wash, sparkline Up, bars, legend Line, tooltip swatch, progress Brand, ring value, funnel bars, heatmap (with opacity) |
| chart/secondary | green/200 `#aad3b9` / green/800 `#15452f` | Bar hover dimmed siblings **only** |
| chart/tertiary | lime/400 | **unused** |
| chart/neutral | neutral/300 `#cbd0c8` / neutral/700 | previous-period line, sparkline Down, legend Dashed, tooltip "Previous" swatch, donut "Other", hover dot (previous) |
| chart/track | neutral/100 / neutral/800 | progress bar track, ring track, funnel track |
| chart/grid | neutral/100 / neutral/850 | area and bar gridlines |
| chart/negative | red/500 | **unused** |
| chart/cat-1/2/3 | viz green-500/lime-500/teal-500 (light), green-600/lime-600/teal-400 (dark) | donut segments and donut legend; legend item Dot (cat-1 only) |
| border/default | | zero baseline (area, bar) |
| border/strong | | area crosshair |
| border/subtle | | tooltip border |
| bg/surface | | 2 px halo stroke on end and hover dots |
| bg/surface-raised | | tooltip |
| text/primary, text/secondary, text/tertiary | | values, labels, axis labels |
| text/success | | tooltip delta |
| text/brand | | funnel rates |
| text/warning, text/critical | | **misused as progress fills** |
| radius/md | | tooltip (bound) |
| radius/2xl | | doc frames (chrome) |
| Grove/Elevation/3 Popover | | tooltip |

**Text styles used:** Body/M (axis labels, legend labels, descriptions), Label/M, Label/M Strong, Numeric/L, Numeric/M, Mono/M, Heading/H2 (docs only).

**No non-Grove variable or style references were found** in any node on this page.

### 6.1 Proposed new chart tokens (so code is not full of magic numbers)

- **Colours:**
  - `chart/axis-label`: point it at `text/secondary`, or darken it to ≥4.5:1.
  - `chart/crosshair`
  - `chart/warning`, `chart/critical`: progress fills.
  - `chart/seq-1…5`: heatmap and sequential ramps, solid per mode.
  - `chart/halo`: currently `bg/surface`.
- **Numbers:**
  - `chart/stroke-width` = 2
  - `chart/dash` = "5 4" (one pattern, applied to the legend too)
  - `chart/area-opacity` = 0.1
  - `chart/dim-opacity` = 0.35 (one value, for segments, bars and legend rows)
  - `chart/bar-max-width` = 22
  - `chart/bar-radius` = `radius/xs`
  - `chart/dot-size` = 8, `chart/dot-size-active` = 10
  - `chart/donut-thickness` = 26 (or a ratio)
  - `chart/ring-thickness` = 7
  - `chart/pad-angle` = 0.03 rad
- **Motion:**
  - `duration/chart-area-delay` = 120 ms
  - Hover crossfade 160 ms → align to `duration/fast` (140)
- **Spacing fixes:**
  - Tooltip padding 12/14 → `space/3`/`space/4`
  - Donut legend gaps 14/10 → `space/3`/`space/2`
  - Heatmap radius 6 → `radius/xs` or `radius/sm`

---

## 7. Contrast audit (computed from snapshot hexes; WCAG 2.x)

| Pair | Ratio | Verdict |
|---|---|---|
| text/tertiary on bg/surface (axis labels, legend %, heatmap labels), light | **4.31** | **Fail** AA 4.5 for 14 px regular |
| text/tertiary on bg/surface, dark (neutral/500 on neutral/900) | **4.03** | **Fail** |
| text/secondary on surface, light / dark | 6.48 / 6.87 | Pass |
| text/success (tooltip delta), light | 6.36 | Pass |
| text/brand (funnel rate), light | 8.51 | Pass |
| chart/primary vs surface, light / dark | 6.36 / 5.32 | Pass (1.4.11) |
| chart/secondary vs surface, light / dark | **1.65 / 1.59** | Fail 3:1 (dimmed state) |
| chart/neutral vs surface, light / dark | **1.57 / 1.82** | Fail 3:1 (comparison line, "Other", sparkline Down) |
| chart/cat-1 vs surface, light / dark | 4.38 / 3.38 | Pass |
| chart/cat-2 vs surface, light / dark | **2.17** / 5.88 | Fail light |
| chart/cat-3 vs surface, light / dark | 4.06 / 5.75 | Pass |
| chart/tertiary (lime/400) vs surface, light | 1.75 | Fail (unused) |
| cat-1 vs cat-2 adjacent, light / dark | 2.02 / 1.74 | Low; needs a gap stroke |
| cat-2 vs cat-3, light | 1.87 | Low |
| chart/primary vs chart/secondary (bar hover), dark | 3.35 | OK |
| Heatmap 8% vs 25% step / 70% vs 100% step | 1.30 / 1.92 | Steps hard to tell apart |
| Heatmap 8% cell vs white | 1.12 | Near-invisible |
| Donut dimmed cat-2 @35% vs white | 1.29 | Intended de-emphasis |
| Dimmed legend text @45%: secondary / tertiary | 2.02 / 1.76 | Fails text contrast while dimmed. Acceptable only if the focused row stays readable and the live region announces it. |
| Progress fill vs track: brand / warning / critical, light | 5.55 / 5.74 / 4.96 | Pass |
| Progress fill vs track: brand / critical, dark | 4.12 / 3.11 | Pass (borderline) |
| Tooltip surface-raised vs surface, dark | 1.10 | Card edge depends on the border and shadow |

**Hit targets:**
- Legend item 21 px tall: fail if interactive.
- Bars 22 px wide: use 42 px band columns.
- Donut ring 26 px thick: use an angle hit-test over the full disc, or the legend rows.
- Heatmap 32 px cells with a 6 px gap: pass 24, fail 44.
- Progress items are non-interactive.

---

## 8. Motion spec (consolidated)

| Element | Spec (from Figma) | Token | Code |
|---|---|---|---|
| Line (area chart, sparkline) | path trim 0→1 on reveal | `duration/chart-draw` 700 ms (Reduced 0), easing `easing/enter`? (unspecified) | `pathLength="1"`, `stroke-dasharray:1`, animate `stroke-dashoffset 1→0` |
| Area wash | fade in after 120 ms | no token for delay | `animation-delay: 120ms` → new token |
| Bars | grow from baseline, staggered | `stagger/item` 40 ms; duration unspecified (suggest `duration/slow` 320 ms or `chart-draw`) | `scaleY(0→1)`, `transform-origin: bottom`, `--i` index |
| Tooltip | fade + 4 px travel | `duration/fast` 140 ms, `distance/lift` 4 | opacity + translateY |
| Hover state crossfade | SMART_ANIMATE 0.16 s on ON_HOVER | none (160 ≠ 140/220) | use `duration/fast` |
| Donut segment dim | opacity 1→0.35 | not specified | `duration/fast` |
| Numbers (centre total, KPI) | "animate with count-up" | `duration/count-up` 900 ms (Reduced 0) | optional `@nizivo/motion` `<CountUp>` (client) |

The reveal trigger ("on reveal") needs one of two things:
- CSS scroll-driven `animation-timeline: view()` as a progressive enhancement (no JS).
- A tiny shared `IntersectionObserver` client hook (in `@nizivo/motion` or `@nizivo/charts/reveal`).

Default: play on mount. Respect the `Motion/Reduced` mode and `prefers-reduced-motion`; durations already go to 0 in Reduced.

---

## 9. Number and date formatting observed → spec

| Sample | Where | Intl recipe |
|---|---|---|
| `$0` `$2k` `$8k` | area y-axis | `{style:'currency',currency,notation:'compact',maximumFractionDigits:0}` (the "$0" special case is handled by Intl) |
| `$123.3k` | donut centre | `{style:'currency',notation:'compact',maximumFractionDigits:1}` |
| `$64,120` `$6,284` | donut legend, tooltip | `{style:'currency',maximumFractionDigits:0}` |
| `0` `100` `300`, `48,210` | bar axis, funnel | `{maximumFractionDigits:0}` |
| `52%` `68%` | donut share, progress | `{style:'percent',maximumFractionDigits:0}` |
| `20.0%` `48.0%` | funnel rate (Mono) | `{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}` |
| `+28.0%` | tooltip delta | `{style:'percent',signDisplay:'exceptZero',minimumFractionDigits:1}` |
| `—` | funnel first-step rate | null/NA placeholder (em dash) |
| `Tue, Oct 14` | tooltip title | `{weekday:'short',month:'short',day:'numeric'}` |
| `Oct 1` | x-axis | `{month:'short',day:'numeric'}` |
| `17` … `30` | bar x-axis | `{day:'numeric'}` |
| `00` `04` … `20` | heatmap hours | `{hour:'2-digit',hourCycle:'h23'}` or a pad-2 function |

All numerals should render with `font-variant-numeric: tabular-nums`, which the Numeric/* styles already declare. Percentages use Mono.

Provide a `<NizivoFormatProvider locale currency>` (or a `format` prop accepting either Intl option objects or preset names such as `'currency-compact'`). Option objects are serialisable, so they cross the RSC boundary. Functions do not.

---

## 10. Architecture proposal — pluggable charts

The user explicitly wants a plug-in/plug-out design. This layering keeps every piece replaceable.

```
@nizivo/tokens        CSS vars (--nz-chart-*, --nz-duration-chart-draw …), JSON for JS consumers
@nizivo/ui            ProgressBar, ProgressRing, (Meter), VisuallyHidden, Surface, format provider/hooks
@nizivo/charts
  /core       pure, server-safe: scales (d3-scale), shapes (d3-shape: line/area/arc/curves),
              layout fns (bandLayout, donutArcs, foldToOther, niceDomain, tickThinning, edgeLabelClamp),
              color resolver chartColor('cat-1') → 'var(--nz-chart-cat-1)'
  /primitives server components: ChartFrame(svg+figure+caption+table), Grid, Axis, LinePath, AreaPath,
              Bars, Arcs, EndDot, Legend/LegendItem, TooltipCard (static content)
  /interaction client: <ChartInteraction> island (nearest-index hit testing for x-band, angle, cell;
              roving focus, keyboard map, live region, tooltip positioner with flip/shift, dim state)
  /presets    AreaChart, BarChart, DonutChart, Sparkline, FunnelChart, Heatmap (server shells that
              compose primitives + mount <ChartInteraction> only when interactive !== false)
  /reveal     optional client hook or CSS for draw-in on reveal (or delegate to @nizivo/motion)
```

**Plug points**
- **Series config:** `{ key, label, color, variant, area, endDot }`. Colours are token names or any CSS colour.
- **Scales:** `xScale` and `yScale` are config objects. A `scale` escape hatch is available in full-client mode.
- **Curves:** `curve` is `'monotone' | 'linear' | 'step' | CurveFactory`.
- **Formatting:** `format` takes Intl options or presets.
- **Slots:** `slots.tooltip`, `slots.legend`, `slots.empty`, `slots.loading`, `slots.error`, `slots.center`. `renderTooltip` is available in full-client mode.
- **Interaction:** `interactive={false}` produces a zero-JS static chart. `activeIndex/defaultActiveIndex/onActiveChange` give controlled and uncontrolled modes.
- **Dimming:** `dim: 'opacity' | 'token' | false`.
- **Animation:** `animate: 'reveal' | 'mount' | false`.
- **Status:** `status: 'ready' | 'loading' | 'empty' | 'error'`. Loading uses the page-07 Skeleton plus a chart-shaped skeleton (axes with a shimmering path or bars).
- **Renderer:** the `/core` geometry is renderer-agnostic, so a Canvas renderer can be added later for large data without changing the API.
- **Data accessors:** string keys (serialisable for RSC). Functions are allowed only below a `'use client'` boundary.
- **Theming:** CSS variables only, with no JS theme object. Dark mode comes from the `Grove Color` Dark mode values, and the prefix is configurable at build time.
- **Dependencies:** `d3-scale`, `d3-shape`, `d3-array` (ESM, tree-shakeable; no `d3-selection`/DOM). React owns rendering. Each preset is its own entry point (`@nizivo/charts/area` …) so unused charts are tree-shaken.
- **a11y contract for every chart:**
  - `<figure>`, title, description, and an auto data `<table>` (visually hidden, or toggled with "View data").
  - `role="img"` on the static SVG.
  - A focusable interaction layer with arrow, Home, End and Esc keys and a polite live region.
  - Hit areas at least 24 px.
  - No information carried by colour alone (dash and labels already help).

---

## 11. Design gaps / requests to the design team

1. Relink the ghost and duplicate components (§5). Turn Funnel and Heatmap into real sets with Default/Hover states.
2. Add **focus-visible**, **loading/skeleton**, **empty** and **error** variants for every chart. Add **indeterminate** to the Progress Bar.
3. Add a negative-delta tooltip (`text/critical` plus a sign or arrow), a 3-series tooltip, and a flipped-left placement.
4. Use one dimming strategy, with one opacity value. Specify the dark-mode behaviour.
5. Fix axis-label contrast: tertiary is 4.31:1. Use `text/secondary`, or adjust neutral/500.
6. Add `chart/warning` and `chart/critical` fills. Stop using `text/*` for fills. Add Success and Neutral tones to the bar, and tone and size to the ring.
7. Replace the heatmap opacity ramp with 5 solid sequential tokens per mode.
8. Define stroke width, dash, dot sizes, bar max width, bar radius, donut and ring thickness, pad angle, and area/dim opacity as variables. Bind spacing to the space scale (14 → 12/16, 10 → 8/12).
9. Align the hover transition to `duration/fast` (140). Add a token for the 120 ms area delay. Specify the bar-grow duration and the easing for draws.
10. Unify the legend swatch (8 vs 10 px dot, 4,3 vs 5,4 dash, 10×3 tooltip bar). Make the donut legend use Chart Legend Item, with value and share slots.
11. Nice the bar chart's y-domain (the top bar exceeds 300), and specify tick-thinning rules.
12. Add mobile/narrow versions: charts are fixed at 720/640/482 wide, and there is no responsive guidance on this page.
13. Add a dark-mode canvas showing at least one chart.

---

## 12. Extraction gaps

- The locations of the ghost main components 747:287, 751:319 and 751:393 are not resolvable. Their parent chains are empty and `removed=false`. I did not search other pages or files for their origin, to stay within the call budget.
- No dark-mode render exists or was captured. Dark values come from the snapshot's mode table, not from a dark-mode render.
- Detail screenshots were taken only for Doc/Area chart and Doc/Chart atoms. Bar, Donut, Funnel, Heatmap and Progress were judged from the 3000 px section shot.
- The easing of prototype SMART_ANIMATE transitions was not captured (only type and duration). The motion easing for the draw and grow animations is not specified in the file.
- Vector path data was sampled (the first 60–90 characters plus segment counts). The exact curve algorithm (Catmull-Rom vs monotone vs basis) cannot be determined from Figma.
- All `documentationLinks` are empty. Variant-level descriptions are empty.
- Two `use_figma` calls failed by exceeding the 20 KB return limit and were re-run split. 13 Figma calls were made in total.
- I did not verify whether Sparkline is reused in the KPI Tile on page 04 (cross-page).
