# Grove · 04 Dashboard Widgets: architecture extraction for Nizivo UI

- File: `BIzJFf1wm8KP0YG2AVI1tP` ("Grove UI Library" → ships as **Nizivo UI**, `@nizivo/*`)
- Page: **Grove · 04 Dashboard Widgets** `7275:13737`, Section `7275:13738` (4000×2330)
- Read on 2026-10-14. Read-only extraction: 6 `use_figma` reads + 3 `get_screenshot`. Nothing in the file was changed.
- Screenshots: `scratchpad/figma/shots/04-section.png` (3000 px), `04-kpi-tile.png`, `04-insight-card.png`
- Token names below follow the snapshot `00-tokens-and-styles.md` (`--grove-*` becomes the configurable `--nz-*`).

---

## 0. TL;DR

| Figma thing | Node | What it really is | Proposed code | Tier | RSC | Package |
|---|---|---|---|---|---|---|
| **Card** (set, 3 variants) | `7275:13757` | Generic **layout surface**: the container every widget sits in | `Card` + `Card.Header/Title/Description/Action/Body/Footer` | primitive | server | `@nizivo/ui` |
| **Delta** (set, 3 variants) | `7275:13743` | Atom: change badge (direction pill) | `Delta` | primitive | server | `@nizivo/ui` |
| **KPI Tile** (set, 4 variants) | `7275:13780` | Domain widget = Card + Metric + Sparkline + Delta | `KpiTile` (props and compound parts) | composite | split | `@nizivo/dashboard` (new opt-in) |
| **Insight Card** (set, 3 variants) | `7275:13829` | Marketing/nudge pattern = Card(tone) + media + title + one CTA | `InsightCard` | pattern | server (CTA leaf may be client) | `@nizivo/dashboard` |
| **Revenue Card** (instance only, orphan main) | inst `7275:13818` → main `752:385` | Hero widget = Card + Metric(Display) + period Select + Area chart + legend | `TrendCard` (generic), `RevenueCard` = documented recipe | heavy | split | `@nizivo/dashboard` (peer `@nizivo/charts`) |
| **Ranked List** (instance only, orphan main) | inst `7275:13824` → main `752:444` | Composite = Card + header link + ordered rows with leader-relative bars | `RankedList` + `RankedList.Item` | composite | server | `@nizivo/dashboard` |
| *(implicit)* "Headline"/value block | KPI `7275:13783`, Revenue `I7275:13818;752:387` | The same **label + number + delta + comparison** block appears in 2 widgets | `Metric` (+ `NumberValue`, `CountUp`) | primitive / foundation | server (+client CountUp) | `@nizivo/ui` (+ `@nizivo/motion` for CountUp) |

**Top findings, in order of severity**

1. **Nested instances point to "ghost" main components.** KPI Tile's Delta and Sparkline, Revenue Card, Ranked List, Insight Card's CTA Button, and Revenue Card's Select, Area Chart and Legend all resolve to main components whose `parent === null`. These components are in the document but not on any page canvas. The visible sets (`7275:*`) are copies. They even reuse the same property IDs (`Value#752:0` on both Delta `7275:13743` and ghost Delta `752:269`). Editing the visible Delta, Sparkline or Button sets **will not propagate** into these widgets. Revenue Card and Ranked List have **no** canvas main at all, so they cannot be edited or published. Every icon (`Icon/*`, `738:*`) is also orphaned. See §2.
2. **Card is the right abstraction, but the widgets don't use it.** KPI Tile, Revenue Card, Ranked List and Insight Card each re-implement the surface (padding 20 or 24, radius xl or 2xl, shadow sometimes on and sometimes off). In code, every widget must compose `Card`, and Card needs `tone`, `padding`, `radius` and `elevation` knobs.
3. **Tone naming is inconsistent across sets** (Card `Style=Surface|Subtle|Inverse`, KPI `Tone=Surface|Tinted`, Insight `Tone=Brand|Accent|Inverse`). KPI `Tinted` silently means brand-subtle when Trend=Up and accent-subtle when Trend=Down, so tint is coupled to the data. Proposal: one surface `tone` scale on Card (`surface | subtle | inverse | brand | accent`) that all widgets inherit.
4. **Contrast failures**: `text/tertiary` (#747c73) is **4.31:1 on white** and **3.80:1 on brand-subtle**. It is used for "vs last week" (Body/M 14 px) and for chart axis labels, so it fails AA. Delta Down in **dark mode** is 3.63:1 (fails). Sparkline-Down and previous-period lines (`chart/neutral` #cbd0c8) are 1.57:1, which fails 1.4.11 non-text contrast.
5. **Delta pill disappears on tinted tiles.** `bg/success-subtle` and `bg/brand-subtle` both resolve to green/50 (1.0:1). In **dark mode**, brand-subtle, accent-subtle and success-subtle **all** resolve to green/950. The Tinted KPI tones and the Brand and Accent Insight tones then become identical, and the Up pill vanishes.
6. **Count-up and tabular numbers exist only as prose.** The `Grove/Numeric/*` style descriptions say "tabular-nums; animate with count-up, duration/count-up", but `openTypeFeatures` is empty, so Figma renders proportional figures. No easing is defined for count-up. Delta digits use `Label/M Strong`, not a Numeric style, so they will jitter.
7. **Hit targets**: the Card "Action" is a bare 20×20 `Icon/ellipsis` with no button. Ranked List "View all" is a plain TEXT node, 20 px tall. Both fall below `size/touch-min` (44) and below `control-sm` (32).

---

## 1. Page inventory

Section `7275:13738` contains six documentation frames (all `Doc/*`: white `bg/surface`, radius 28 raw, padding 48 raw, gap 32 raw). Each has a Header (H2 title + Body/M description) and either a component set or a "Stage" frame holding an instance.

| Doc frame | Node | Contents | Doc copy (verbatim) |
|---|---|---|---|
| Doc/Delta & trend | `7275:13739` | Delta set `7275:13743` | **"Delta & trend"**: "Change against the previous period. Colour only ever means direction." |
| Doc/Card | `7275:13753` | Card set `7275:13757` | **"Card"**: "The one container every widget sits in. Title, optional action, free slot." |
| Doc/KPI tile | `7275:13776` | KPI Tile set `7275:13780` | **"KPI tile"**: "One number, its change, its shape. Tinted tiles group a row of related KPIs." |
| Doc/Revenue card | `7275:13813` | Stage `7275:13817` → instance `7275:13818` "Revenue Card" | **"Revenue card"**: "The hero widget on Overview. Headline number, period, comparison chart." |
| Doc/Ranked list | `7275:13819` | Stage `7275:13823` → instance `7275:13824` "Ranked List" | **"Ranked list"**: "Top products, channels or regions. Bars are relative to the leader." |
| Doc/Insight card | `7275:13825` | Insight Card set `7275:13829` | **"Insight card"**: "A single nudge with a render and one action. Never more than one per screen." |

Component and set descriptions (`node.description`; `documentationLinks` are empty everywhere):
- Card `7275:13757`: *"Widget container. Surface = default on canvas, Subtle = nested, Inverse = hero/featured. Replace Slot content."*
- KPI Tile `7275:13780`: *"Metric with sparkline + delta. Use Tinted for a pastel KPI row (moodboard: iBanko tiles)."*
- Delta, Insight Card, all variants, and the Revenue Card and Ranked List mains have **empty descriptions**.
- `Grove/Numeric/Display|KPI|L|M` text styles: *"Tabular figures (font-variant-numeric: tabular-nums). Animate with count-up, duration/count-up."*

There are no Figma annotations (`section.annotations` is null) and no sticky or dev-mode notes.

---

## 2. Critical cross-cutting issue: orphaned ("ghost") main components

`getMainComponentAsync()` on nested instances, followed by walking `.parent`, returns these mains with **`parent === null`**. They are present in the document but not placed on any page. This is the usual signature of a main component that was deleted, or that lived on a page that was removed, while instances still reference it.

| Used in | Instance node(s) | Ghost main (id, key) | Canonical visible set the instance *should* use |
|---|---|---|---|
| KPI Tile footer | `7275:13787/13795/13803/13811` | Delta set `752:269` (variants `752:255` Up, `752:260` Down), key `b5b2c4b0…` | Delta `7275:13743` (this page) |
| KPI Tile value row | `7275:13785/13793/13801/13809` | Sparkline set `747:288` (`747:273` Up, `747:277` Down), key `a8f6eaad…` | Sparkline `7275:13323` (page 03) |
| Revenue Card | `7275:13818` | **COMPONENT `752:385`**, key `9e3bfdaf…` (no props, no description) | *none on canvas* |
| Ranked List | `7275:13824` | **COMPONENT `752:444`**, key `7da4380b…` (no props, no description) | *none on canvas* |
| Revenue Card → Delta | `I7275:13818;752:391` | Delta `752:255` | Delta `7275:13743` |
| Revenue Card → Period | `I7275:13818;752:396` | Select set `745:222` (`745:188`) | Select `7275:11438` (page 02) |
| Revenue Card → Chart | `I7275:13818;752:406` | Area Chart set `747:351` (`747:289` Default, `747:310` Hover) | Area Chart `7275:13336` (page 03) |
| Revenue Card → Legend | `I7275:13818;752:428/432` | Chart Legend Item set `747:286` (`747:243` Line, `747:247` Dashed) | Chart Legend Item `7275:13291` (page 03) |
| Insight Card CTA | `7275:13833/13837/13841` | Button set `744:263` (27 variants; `744:105` Secondary/Md, `744:210` Accent/Md) | Button `7275:11244` (page 02) |
| Icons everywhere | Delta icons, Card Action, CTA trailing icon | `Icon/trending-up 738:386`, `Icon/trending-down 738:382`, `Icon/minus 738:262`, `Icon/ellipsis 738:166`, `Icon/arrow-right 738:73` | *no icon set on canvas* (snapshot: Foundations has no components) |

Consequences for the code pipeline:
- **Code Connect** mappings must target the `7275:*` sets. Nested instances inside widgets will not resolve to them until the design team swaps instances or restores mains, so nested widgets cannot be mapped automatically.
- Design edits to atoms (Delta, Sparkline, Button) will not reach widgets. Treat the **code** composition as the source of truth, with widgets composing atoms by import.
- `node.removed` reported `false` for these ghosts, so `parent === null` is the evidence to rely on.
- **Ask the design team (read-only here, so we do not fix it):** swap nested instances to the canonical `7275:*` sets, and promote Revenue Card and Ranked List to real components or sets on this page, with props.

---

## 3. Visual language (from screenshots)

- **Density:** airy dashboard. Widget padding 20–24, 16–24 px vertical rhythm, generous white space around large numerals.
- **Surfaces:** white cards (`bg/surface`) on a warm grey-green canvas (`bg/canvas` #f6f7f4). Card edges come from a 1 px `border/subtle` (#eef0ec, 1.15:1) plus the very soft `Grove/Elevation/1 Card` shadow. Tinted tiles are pastel (green-50 brand, lime-50 accent) with no border and no shadow. Inverse is near-black (`bg/inverse` #181b19) for hero or featured cards.
- **Radius:** `radius/xl` (20) for widgets, `radius/2xl` (28) for Insight cards and doc frames, `radius/full` pills for Delta and buttons, `radius/md` (12) for the Select.
- **Color use:** restrained. Brand green is used only for data ink (sparkline, area, ranked bars, Up delta) and the `text/brand` link. Lime is the accent (Accent CTA on inverse, accent-subtle tint). Red appears only in the Down delta. The down sparkline is **neutral grey**, not red.
- **Type:** Geist. Large semibold tabular numerals (`Numeric/Display` 40, `Numeric/KPI` 32, `Numeric/M` 16). Labels `Label/M` 14, captions `Body/M` 14 (no 12 px caption exists).
- **Imagery:** Insight cards use soft 3D renders (frosted green glass sphere, wrapped box, ceramic bag) placed as `IMAGE (FIT)` on a 252×168 rectangle.
- **Glass:** none on this page.
- **Motion cues:** hover prototype reactions only. Chart hover shows a crosshair, hover dots and a tooltip. CTA hover uses Smart Animate at **160 ms**, which matches neither `duration/fast` 140 nor `duration/base` 220. Count-up is specified only in text style descriptions.

---

## 4. Components

### 4.1 Delta: `7275:13743` (variants: Up `7275:13744`, Down `7275:13747`, Flat `7275:13750`)

**Raw `componentPropertyDefinitions`**
```json
{
  "Value#752:0": { "type": "TEXT", "defaultValue": "12.4%" },
  "Trend":       { "type": "VARIANT", "defaultValue": "Up", "variantOptions": ["Up","Down","Flat"] }
}
```
**Variant matrix**: 3 of 3 exist (1-D axis). No size axis, no "on-tinted" or plain variant.

**Anatomy (Trend=Up, 77×28)**: `COMPONENT` horizontal auto-layout, hug×hug, padding 4/10/4/8, gap 4, align center, radius 999.
- `Icon` INSTANCE 16×16 → `Icon/trending-up` (ghost `738:386`). Vectors stroke 1.28, bound `text/success`.
- `12.4%` TEXT, `Grove/Label/M Strong`, fill `text/success`, bound to `Value#752:0`.

**Token bindings per variant**

| Variant | Fill | Icon stroke / text |
|---|---|---|
| Up | `bg/success-subtle` | `text/success`, icon `Icon/trending-up` |
| Down | `bg/critical-subtle` | `text/critical`, icon `Icon/trending-down` |
| Flat | `bg/subtle` | `text/secondary`, icon `Icon/minus` |

**Hard-coded values**: padding 4/10/4/8 (10 is **off-scale**; space has 8 and 12), gap 4, radius 999 (`radius/full` exists but is unbound), icon stroke width 1.28 (scaled). Icons use `text/*` tokens rather than `icon/*` tokens. In code that is fine because the icon uses `currentColor`.

**States**: static, non-interactive. Not shown: size variants, on-tinted or plain style, loading skeleton.

**Proposed API**
```tsx
type Trend = 'up' | 'down' | 'flat';
interface DeltaProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Numeric change. A fraction (0.124 = 12.4%) when format is percent (default). */
  value?: number;
  /** Pre-formatted content overrides formatting, e.g. "+$1.2k". */
  children?: React.ReactNode;
  /** Derived from sign of `value` (|value| < flatThreshold → flat) unless set. Figma "Trend". */
  trend?: Trend;
  flatThreshold?: number;                  // default 0
  format?: Intl.NumberFormatOptions;       // default { style:'percent', maximumFractionDigits:1, signDisplay:'never' }
  locale?: string;
  /** Design rule today: "Colour only ever means direction". Escape hatch for cost-type metrics, kept behind a prop and default unchanged. */
  polarity?: 'direction' | 'higher-is-better' | 'lower-is-better';
  size?: 'sm' | 'md';                      // md = Figma (28 h); sm for tables (needs design)
  appearance?: 'pill' | 'plain';           // plain = no bg, for tinted / inverse surfaces
  icon?: React.ReactNode | null;           // swap the icon set; null hides
  /** Screen-reader phrasing, e.g. (t, v) => `${t==='up'?'Up':'Down'} ${v} vs last week` */
  srLabel?: string | ((trend: Trend, formatted: string) => string);
}
```
- Mapping: Figma `Trend` becomes `trend`, derived by default because it is data, not a style choice. Figma `Value` becomes `value: number` (formatted) or `children`.
- Markup: `<span class="nz-delta" data-trend="up" data-appearance="pill">` containing `<svg aria-hidden>`, `<span aria-hidden>12.4%</span>` and `<span class="nz-sr-only">Up 12.4%</span>`. Use `font-variant-numeric: tabular-nums` (see §5).
- **A11y**: no ARIA pattern; plain text plus an sr-only phrase. Direction must not depend on colour alone. The icon shape helps, but the Down value has **no minus sign** ("3.1%"), so the sr text must say "down" or "decreased".
- **RSC**: server. **Tier**: primitive. **Package**: `@nizivo/ui` (Commerce reuses it).

**Issues**
- Dark-mode Down: `text/critical` red/500 on `bg/critical-subtle` neutral/850 = **3.63:1**, which fails AA for 14 px semibold. Light-mode pairs pass (Up 5.60, Down 5.14, Flat 6.26). Dark Up is 7.37 and dark Flat 6.87.
- Pill vs Tinted-Up KPI tile bg is **1.00:1** (green/50 on green/50). The pill boundary disappears, which is visible in the screenshot. Dark mode: success-subtle and brand-subtle are both green/950.
- Delta digits use `Label/M Strong`, not a Numeric style, so they are not tabular.
- No sign character. Locale-aware sign (`signDisplay`) should be configurable.
- Off-scale padding 10. Padding, gap and radius are unbound.

---

### 4.2 Card: `7275:13757` (variants: Surface `7275:13758`, Subtle `7275:13764`, Inverse `7275:13770`)

**Raw `componentPropertyDefinitions`**
```json
{
  "Title#752:4":       { "type": "TEXT", "defaultValue": "Card title" },
  "Show action#752:8": { "type": "BOOLEAN", "defaultValue": true },
  "Style":             { "type": "VARIANT", "defaultValue": "Surface", "variantOptions": ["Surface","Subtle","Inverse"] }
}
```
**Variant matrix**: 3 of 3. No padding, radius or interactive axis.

**Anatomy (Style=Surface, 360×254)**: vertical auto-layout, fill×hug, padding 24 (`space/6` ×4, bound), gap **20 (unbound)**, radius 20 (`radius/xl` ×4, bound), fill `bg/surface`, stroke 1 px `border/subtle` (INSIDE, strokeWeight **not** bound to `border-width/default`), effect `Grove/Elevation/1 Card`.
- `Header` FRAME: horizontal, SPACE_BETWEEN, fill×hug, gap 0, clips.
  - `Card title` TEXT: `Grove/Heading/H4`, `text/primary`, bound to `Title#752:4`.
  - `Action` INSTANCE 20×20 → `Icon/ellipsis` (ghost `738:166`), stroke `icon/secondary`. Visibility bound to `Show action#752:8`.
- `Slot` FRAME 310×160 (fixed), radius 12 (**unbound**, should be `radius/md`), fill `bg/canvas`, stroke `border/default` **dashed [4,4]**, centered TEXT "Slot" (`Label/M`, `text/tertiary`). This is a design-time placeholder only.

**Per-variant bindings**

| Style | Root fill | Stroke | Effect | Title | Slot fill | Action icon |
|---|---|---|---|---|---|---|
| Surface | `bg/surface` | `border/subtle` | Elevation/1 Card | `text/primary` | `bg/canvas` | `icon/secondary` |
| Subtle | `bg/subtle` | none | none | `text/primary` | `bg/canvas` | `icon/secondary` |
| Inverse | `bg/inverse` | none | none | `text/inverse` | `bg/inverse-elevated` | `icon/inverse` |

**States**: none (static container). Not shown: interactive (hover, pressed, focus-visible) for clickable cards, selected, loading or skeleton, empty, error, collapsible.

**How widgets actually use the "Card" surface (all re-implemented, none are Card instances)**

| Widget | Padding | Gap | Radius | Fill | Border | Shadow |
|---|---|---|---|---|---|---|
| Card / Surface | space/6 (24) | 20 raw | radius/xl | bg/surface | border/subtle | Elevation/1 |
| KPI Tile / Surface | **space/5 (20)** | 16 raw | radius/xl | bg/surface | border/subtle | **none** |
| KPI Tile / Tinted | space/5 | 16 raw | radius/xl | brand-subtle / accent-subtle | none | none |
| Revenue Card | space/6 | 24 raw | radius/xl | bg/surface | border/subtle | Elevation/1 |
| Ranked List | space/6 | 16 raw | radius/xl | bg/surface | border/subtle | **none** |
| Insight Card | space/6 | 20 raw | **radius/2xl** | brand-subtle / accent-subtle / inverse | none | none |

These are the knobs Card must expose: `tone`, `padding`, `radius`, `elevation`, `bordered`.

**Proposed API**
```tsx
type SurfaceTone = 'surface' | 'subtle' | 'inverse' | 'brand' | 'accent'; // open via module augmentation
interface CardProps extends React.HTMLAttributes<HTMLElement> {
  tone?: SurfaceTone;                    // Figma "Style" (Surface|Subtle|Inverse) + KPI Tinted + Insight tones
  padding?: 'none' | 'sm' | 'md' | 'lg'; // space/4, space/5, space/6 (default lg)
  radius?: 'lg' | 'xl' | '2xl';          // default xl
  elevation?: 0 | 1 | 2;                 // default: surface → 1, others → 0
  bordered?: boolean;                    // default: surface → true
  asChild?: boolean;                     // Radix-style Slot (render as <section>, <article>, <li>, <a>)
  as?: 'div' | 'section' | 'article' | 'li';
}
<Card tone="surface">
  <Card.Header>                           {/* flex row, space-between, gap = space/3 */}
    <Card.Title as="h3">Card title</Card.Title>   {/* Figma "Title"; heading level configurable */}
    <Card.Description />                  {/* not in Figma, very commonly needed */}
    <Card.Action>                         {/* Figma "Show action" → presence of this slot; accepts ANY node */}
      <Menu trigger={<IconButton icon={<EllipsisIcon/>} aria-label="Card options" size="sm" />} />
    </Card.Action>
  </Card.Header>
  <Card.Body>{/* Figma "Slot" */}</Card.Body>
  <Card.Footer />
</Card>
// Clickable card without nested-interactive violations:
<Card asChild><article>… <Card.LinkOverlay href="/orders">Orders</Card.LinkOverlay></article></Card>
```
- **Surface context through CSS, not React context.** That keeps it RSC-safe. Card sets `data-tone="inverse"` and re-declares local custom properties such as `--nz-surface-bg`, `--nz-surface-fg`, `--nz-surface-border` and `--nz-surface-elevated`. Nested parts read those properties: the sparkline end-dot halo, the Delta `appearance="plain"` choice, and the Slot or inner-panel bg. This fixes the "white halo on tinted tile" and "light border on inverse" bugs without prop drilling. New tones are added with CSS only.
- **A11y**: generic container. If it has a Title, render `<section aria-labelledby={titleId}>` (opt-in via `as`). The Action needs a real button with an `aria-label` and a minimum 32 px control, padded to 44 hit area on touch. Use the LinkOverlay pattern for whole-card links.
- **RSC**: server (no state). **Tier**: primitive. **Package**: `@nizivo/ui`.

**Issues**
- Action is a bare 20×20 icon with no button, so it misses the 44 touch and 32 control targets. Use INSTANCE_SWAP or a Figma slot instead of a boolean so designers can place a Select (as Revenue Card does), a Link (as Ranked List does) or an IconButton.
- Inverse Slot stroke uses `border/default` (light neutral/200 on near-black). There is no `border/inverse` token, which is a token gap.
- Inverse Slot placeholder text `text/tertiary` on `bg/inverse-elevated` is 3.65:1. It is a placeholder, but it shows a missing `text/inverse-secondary` or `text/on-inverse-muted` token.
- Subtle (`#fbfbf9`) vs canvas (`#f6f7f4`) is 1.04:1, and vs white (nested use) is about 1.01:1. A nested Subtle card is effectively invisible without a border.
- Elevation is inconsistent across widgets (§table above), and there are no dark-mode elevation styles (snapshot note).
- Gap 20 and Slot radius 12 are unbound, and strokeWeight is unbound.
- No Card description or subtitle and no footer part, although Revenue Card and Ranked List need header extras.

---

### 4.3 KPI Tile: `7275:13780` (variants below)

**Raw `componentPropertyDefinitions`**
```json
{
  "Label#752:12": { "type": "TEXT", "defaultValue": "Returning rate" },
  "Value#752:17": { "type": "TEXT", "defaultValue": "$48,290" },
  "Tone":  { "type": "VARIANT", "defaultValue": "Surface", "variantOptions": ["Surface","Tinted"] },
  "Trend": { "type": "VARIANT", "defaultValue": "Up", "variantOptions": ["Up","Down"] }
}
```
**Variant matrix**: 4 of 4 for Tone × Trend. `Trend=Flat` is missing even though Delta has Flat. There are no props for the delta value, the comparison text ("vs last week" is not exposed), or sparkline visibility.

| Variant | Node | Size | Fill | Border | Delta | Sparkline |
|---|---|---|---|---|---|---|
| Tone=Surface, Trend=Up | `7275:13781` | 300×154 | bg/surface | border/subtle | ghost Delta Up "12.4%" | ghost Sparkline Up (chart/primary) |
| Tone=Surface, Trend=Down | `7275:13789` | 300×154 | bg/surface | border/subtle | ghost Delta Down "3.1%" | ghost Sparkline Down (chart/neutral) |
| Tone=Tinted, Trend=Up | `7275:13797` | 300×152 | **bg/brand-subtle** | none | Delta Up | Sparkline Up |
| Tone=Tinted, Trend=Down | `7275:13805` | 300×152 | **bg/accent-subtle** | none | Delta Down | Sparkline Down |

**Anatomy (Surface/Up)**: vertical auto-layout, fill×hug, padding `space/5` (20, bound), gap **16 raw**, radius `radius/xl`, **no effect style** (Card Surface has Elevation/1).
1. `Returning rate` TEXT: `Label/M`, `text/secondary`, bound to `Label#752:12`.
2. `Value row` FRAME: horizontal, SPACE_BETWEEN, counter-align **MAX** (baseline-ish), fill×hug.
   - `$48,290` TEXT: **`Grove/Numeric/KPI`** (32/100%/-2.5%), `text/primary`, bound to `Value#752:17`.
   - `Sparkline` INSTANCE 88×28, **scaled** (`scaleFactor 0.786` from 112×36), ghost `747:273`/`747:277`. Children: `Area` VECTOR (node opacity **0.1**, fill `chart/primary` or `chart/neutral`), `Line` VECTOR (stroke 2, scaled to about 1.57, round caps and joins), `End dot` ELLIPSE 6 px (fill trend colour, stroke 2 `bg/surface` halo).
3. `Footer` FRAME: horizontal, gap **8 raw**.
   - `Delta` INSTANCE (ghost `752:255`/`752:260`), overrides "12.4%" or "3.1%".
   - `vs last week` TEXT: `Body/M`, `text/tertiary`. Not exposed as a prop.

**Chart nesting:** yes, the sparkline sits inside the KPI tile, right-aligned in the value row. Its trend colour is **green (`chart/primary`) for Up and neutral grey (`chart/neutral`) for Down**. The Delta uses red for Down, so the "down" colour differs between the shape and the badge. Treat this as deliberate (shape is context, badge is signal) and make it configurable through `--nz-trend-*` tokens.

**Count-up:** the value uses `Numeric/KPI`, whose style description asks for a count-up animation (`duration/count-up` 900 ms; Reduced = 0). The responsive variable `type/kpi` [32, 28, 28] exists, but the text style is **not bound** to it.

**Proposed API (convenience props and compound parts; both reach the same parts)**
```tsx
interface KpiTileProps extends Omit<CardProps, 'children'> {
  label: React.ReactNode;                         // Figma "Label"
  value: number | React.ReactNode;                // Figma "Value" (number → formatted)
  format?: Intl.NumberFormatOptions | ((v: number) => string);
  locale?: string;
  delta?: number | DeltaProps | React.ReactNode;  // trend derived from it (Figma "Trend" → not a prop)
  comparison?: React.ReactNode;                   // "vs last week" (not exposed in Figma)
  chart?: React.ReactNode | null;                 // slot; default none. Pass <Sparkline data=…/> or anything
  tone?: 'surface' | 'brand' | 'accent' | 'subtle' | 'inverse'; // Figma Tone=Tinted → 'brand' | 'accent' (decoupled from trend)
  animate?: boolean | { duration?: string; from?: number }; // count-up (client island)
  href?: string; onClick?: () => void;            // drill-in → Card.LinkOverlay
  loading?: boolean;                              // skeleton (page 07 Skeleton)
  error?: React.ReactNode;                        // inline error state
  size?: 'md' | 'lg';
}
<KpiTile label="Returning rate" value={48290} format={{style:'currency',currency:'USD',maximumFractionDigits:0}}
         delta={0.124} comparison="vs last week" chart={<Sparkline data={series} />} tone="brand" animate />

// Compound (full control; every part replaceable):
<KpiTile tone="brand">
  <KpiTile.Label>Returning rate</KpiTile.Label>
  <KpiTile.ValueRow>
    <KpiTile.Value value={48290} format={usd0} animate />
    <KpiTile.Chart><Sparkline data={series} trend="auto" /></KpiTile.Chart>
  </KpiTile.ValueRow>
  <KpiTile.Footer><Delta value={0.124} /><KpiTile.Comparison>vs last week</KpiTile.Comparison></KpiTile.Footer>
</KpiTile>
```
- Internally `KpiTile = Card(padding="md") + Metric(size="kpi") + chart slot`. The same `Metric` powers Revenue Card's headline (§4.5).
- Layout uses **container queries**, not viewport media queries, because dashboard cells vary. When the tile is narrower than about 260 px, or the value is long ("$1,248,290.40"), the chart drops below the value or hides (`chartPlacement="inline|below|hidden|auto"`). Figma has no rule for this, so the value currently just collides with the sparkline.
- **A11y**: `role="group"` with `aria-labelledby={labelId}`, value in `<data value="48290">`. The sparkline gets `aria-hidden`, and its summary moves into the Delta sr text, or it gets `role="img"` with a generated `aria-label` such as "Rising over 7 days". During count-up the animated digits are `aria-hidden` and the final value sits in sr-only text, with **no live region per frame**. An optional `announce` prop adds a polite live region for real-time dashboards. When clickable, the whole tile is a single link (LinkOverlay) and focus-visible uses `Focus/Ring`.
- **RSC**: split. The server shell renders final formatted numbers, so SSR shows real numbers. `CountUp` and an interactive sparkline (hover tooltip) are client islands. A static `Sparkline` can be server-rendered SVG because d3-shape path generation is pure.
- **Tier**: composite. **Package**: `@nizivo/dashboard` (depends on `@nizivo/ui`, peer `@nizivo/charts` for Sparkline, optional `@nizivo/motion` for CountUp).

**Issues**
- Tone=Tinted is **coupled to Trend** (Up → brand-subtle, Down → accent-subtle). Per the doc copy, tint should group a row and should not encode data. Decouple it with `tone`.
- **Delta pill invisible on Tinted/Up** (1.00:1). In dark mode, brand-subtle, accent-subtle and success-subtle are all green/950, so both tinted tones look identical and the pill vanishes. Fix by using `Delta appearance="plain"` on tinted surfaces, or a `bg/surface` pill driven by `--nz-surface-*`.
- `vs last week` uses `text/tertiary`: **4.31:1 on white, 3.80 on brand-subtle, 4.05 on accent-subtle**. All fail AA at 14 px. Dark mode is 4.03 and 3.91.
- Sparkline Down line `chart/neutral` is 1.57:1 on white, which fails 1.4.11. It is acceptable only if the sparkline is decorative (`aria-hidden`) and the Delta carries the meaning.
- The sparkline end-dot halo is hard-wired to `bg/surface` (white), so a white ring appears on tinted tiles. It should follow the container bg.
- The sparkline is a **scaled** instance (stroke 1.57, dot 6). In code, keep a 2 px stroke with `vector-effect: non-scaling-stroke` and size it from the container.
- Gaps 16 and 8 are unbound. Padding (20) differs from Card (24), and there is no shadow vs Card's Elevation/1.
- There are no loading, empty, error, flat, hover or focus states, no currency or locale guidance, and no max-width or truncation rule for long values or labels.
- The sample content mixes "Returning rate" (a percentage) with "$48,290" (currency). It is only placeholder copy, but it misleads the formatting examples.

---

### 4.4 Insight Card: `7275:13829` (Brand `7275:13830`, Accent `7275:13834`, Inverse `7275:13838`)

**Raw `componentPropertyDefinitions`**
```json
{
  "Title#752:22": { "type": "TEXT", "defaultValue": "Holiday drop is ready" },
  "Tone": { "type": "VARIANT", "defaultValue": "Brand", "variantOptions": ["Brand","Accent","Inverse"] }
}
```
**Variant matrix**: 3 of 3. No props for the image, the CTA label, a description or dismiss.

**Anatomy (Tone=Brand, 300×324)**: vertical, fill×hug, padding `space/6`, gap **20 raw**, radius **`radius/2xl` (28)**, fill `bg/brand-subtle`, no border, no effect.
1. `Render` RECTANGLE 252×168 fixed, fill `IMAGE (FIT)` (hash `9be01264…`), radius 0. Images in the screenshot: glass sphere, gift box, shopping bag.
2. Title TEXT: `Grove/Heading/H3` (20), `text/primary` (Inverse uses `text/inverse`), auto-height wrap, bound to `Title#752:22`.
3. `CTA` INSTANCE: ghost Button `744:105` *Variant=Secondary, Size=Md, State=Default* (Brand and Accent tones) or `744:210` *Variant=Accent* (Inverse). Props `Label#744:0="Review"`, `Trailing icon#744:56=true` (`Icon/arrow-right`, ghost `738:73`), `Leading icon#744:28=false`. 40 h, radius 999 (unbound), padding `space/4` and `space/0`, gap `space/2`.

| Tone | Fill | Title | CTA |
|---|---|---|---|
| Brand | bg/brand-subtle | text/primary (15.29:1) | Secondary (white, border/default) |
| Accent | bg/accent-subtle | text/primary | Secondary (white pill vs accent-subtle bg is 1.06; the border carries the edge) |
| Inverse | bg/inverse | text/inverse (17.36:1) | Accent (`bg/accent`; on-accent text 11.46:1) |

**Interactions**: each CTA has `ON_HOVER → SMART_ANIMATE 0.16 s` to the ghost Button State=Hover (`744:112` Secondary, `744:217` Accent). 160 ms is off-token (fast = 140, base = 220).

**Proposed API**
```tsx
interface InsightCardProps extends Omit<CardProps, 'title'> {
  tone?: 'brand' | 'accent' | 'inverse';    // Figma "Tone" (shared SurfaceTone scale)
  media?: React.ReactNode;                  // slot: <img>, <picture>, video, Lottie, 3D (@nizivo/lab) …
  mediaAspect?: string;                     // default "3 / 2" (252×168)
  title: React.ReactNode;                   // Figma "Title"
  titleAs?: 'h2' | 'h3' | 'h4';
  description?: React.ReactNode;            // not in Figma; usually needed
  action?: React.ReactNode;                 // full override (any Button/Link)
  actionLabel?: string; actionHref?: string; onAction?: () => void; // convenience → renders Button
  onDismiss?: () => void;                   // nudges are typically dismissible (gap)
}
```
- The default CTA variant is derived from tone (brand and accent → `secondary`, inverse → `accent`). This mapping is the only logic and lives in a plain map, so it is overridable through `action`.
- **A11y**: `<section aria-labelledby>` (or `<aside>` for a nudge). The media is decorative by default (`alt=""`); require `alt` when it carries meaning. Dismiss is a real button labelled "Dismiss insight", and focus moves to the next logical element after dismissal.
- **RSC**: server. The CTA is a link (server) or a Button with `onClick` (client leaf). **Tier**: pattern. **Package**: `@nizivo/dashboard`.
- Guidance "Never more than one per screen" is content governance. Document it, and optionally add a dev-only warning via a lightweight counter in a client provider. It should not block rendering.

**Issues**
- In dark mode Brand and Accent are **identical** (both `green/950`).
- The CTA instance uses the ghost Button set (`744:263`), not the canonical `7275:11244`.
- Render is fixed 252×168 with an unbound radius 0 and no aspect token. Image FIT leaves transparent letterboxing, which works only for cut-out renders.
- No description, dismiss, loading or skeleton, and no hover state on the card itself.
- Gap 20 and the CTA radius 999 are unbound.

---

### 4.5 Revenue Card: instance `7275:13818` → **ghost COMPONENT `752:385`** (no set, no props)

`componentPropertyDefinitions` on the main: `{}` (empty, so every text is hard content).

**Anatomy (770×467)**: vertical, hug×hug, padding `space/6`, gap **24 raw**, radius `radius/xl`, fill `bg/surface`, stroke `border/subtle`, effect `Elevation/1 Card`.
1. `Header` FRAME: horizontal SPACE_BETWEEN, align MIN.
   - `Headline` FRAME: vertical, gap **8 raw**.
     - `Total sales`: `Label/M`, `text/secondary`.
     - `Value` FRAME: horizontal, gap **12 raw**, center.
       - `$123,307.40`: **`Grove/Numeric/Display`** (40), `text/primary`.
       - `Delta`: ghost `752:255`, "18.2%" Up.
   - `Period` INSTANCE 240×40: ghost Select `745:188` (State=Default), `Leading icon#745:39=true` (calendar), `Value#745:35="Last 30 days"`, radius `radius/md`, padding 0/10/0/12 (raw), gap 8.
2. `Chart` INSTANCE 720×280: ghost Area Chart `747:289` *State=Default*.
   - `Grid & axes`: baseline rect `border/default`, grid rects `chart/grid`, y labels "$0…$8k" `Body/M` `text/tertiary`, plus 5 more nodes (x labels "Oct 1…Oct 30").
   - `Area · This period`: VECTOR, `chart/primary` at node opacity 0.1.
   - `Line · Previous period`: stroke 2 `chart/neutral`, **dash [5,4]**.
   - `Line · This period`: stroke 2 `chart/primary`.
   - `End dot`: 8 px `chart/primary`, halo `bg/surface`.
   - **Reaction**: `ON_HOVER → SMART_ANIMATE 0.16 s` to `747:310` *State=Hover*, which adds `Crosshair` (1×236), 2× `Hover dot` (10 px) and a `Chart Tooltip` instance (200×133).
3. `Legend` FRAME: horizontal gap **20 raw**, with 2× Chart Legend Item (ghost `747:243` Mark=Line "Oct 1 – Oct 30", `747:247` Mark=Dashed "Sep 1 – Sep 30").

**What it is**: a *recipe*, not a primitive: Card + Metric(size="display") + period picker + comparison chart + legend. The same structure fits Orders, Visitors or Conversion. Ship a generic **`TrendCard`** and document `RevenueCard` as a preset or example.

**Proposed API**
```tsx
interface TrendCardProps extends Omit<CardProps, 'title'> {
  label: React.ReactNode;  value: number | React.ReactNode;
  format?: Intl.NumberFormatOptions | ((v: number) => string); locale?: string;
  delta?: number | DeltaProps | React.ReactNode;
  actions?: React.ReactNode;           // header-right slot (period Select, Segment, Menu, export…)
  chart: React.ReactNode;              // any @nizivo/charts chart (Area default in recipe)
  legend?: React.ReactNode | 'auto' | false;  // 'auto' = derive from chart series config
  footer?: React.ReactNode;
  animate?: boolean; loading?: boolean; empty?: React.ReactNode; error?: React.ReactNode;
}
// Recipe:
<TrendCard label="Total sales" value={123307.4} format={usd2} delta={0.182}
  actions={<PeriodSelect value={period} onValueChange={setPeriod} options={PERIODS} />}   // controlled or defaultValue
  chart={<AreaChart data={rows} x="date" series={[
     { key:'current',  label:'Oct 1 – Oct 30', color:'var(--nz-chart-primary)', area:true },
     { key:'previous', label:'Sep 1 – Sep 30', color:'var(--nz-chart-neutral)', dash:'5 4' } ]} />}
  legend="auto" />
```
- **Chart a11y** (applies to `@nizivo/charts`): hover-only tooltips are not keyboard accessible. The chart needs a focusable plot (`tabIndex=0`, `role="application"` or a `role="img"` summary), arrow keys to move the crosshair, a polite live region announcing "Oct 14: $5,820 vs $4,110", and a "View as table" fallback or a visually hidden `<table>`. Respect reduced motion for `duration/chart-draw` (700 ms → 0).
- **Period picker**: uses Select (listbox, page 02). For 3–5 fixed periods a Segment or ToggleGroup is an alternative. Expose `value`, `defaultValue` and `onValueChange`.
- **RSC**: split. Server shell (Card, Metric with final value, static SVG first paint) plus client islands (Select, chart interactivity, CountUp). **Tier**: heavy. **Package**: `@nizivo/dashboard` with peer `@nizivo/charts`.

**Issues**: not a real component (ghost main, no props, no variants or states). Previous-period line contrast is 1.57:1. Axis labels use `text/tertiary` (4.31:1, fails AA at 14 px). Headline gaps 8, 12 and 24 and legend gap 20 are raw. There are no loading, empty or error states and no narrow or mobile layout on this page. The 160 ms hover is off-token. The Area fill opacity 0.1 is a raw node opacity (needs a `chart/area-opacity` token or a `chart/primary-subtle` colour).

---

### 4.6 Ranked List: instance `7275:13824` → **ghost COMPONENT `752:444`** (no props)

**Anatomy (380×324)**: vertical, padding `space/6`, gap **16 raw**, radius `radius/xl`, `bg/surface`, `border/subtle`, **no shadow**.
- `Header`: SPACE_BETWEEN, with `Top channels` (`Heading/H4`, `text/primary`) and `View all` (**TEXT node**, `Label/M`, `text/brand` 8.51:1, 51×20). It is not a Link or Button component.
- 5× `Row · <name>` FRAME: vertical, gap **8 raw**.
  - `Top`: SPACE_BETWEEN, with label `Label/M` `text/primary` and value **`Grove/Numeric/M`** `text/primary`.
  - `Track` FRAME 330×6 (h **6 raw**, radius **3 raw**, `chart/track`, clips), containing `Rectangle` (radius 3, `chart/primary`). Widths 332/113/93/50/30 for values 64,120 / 21,804 / 18,240 / 9,312 / 6,050, so each bar is proportional to the leader. The leader bar is **332 in a 330 track** (overflow, clipped).

**Proposed API**
```tsx
interface RankedListItem { id: string; label: React.ReactNode; value: number; href?: string; icon?: React.ReactNode; color?: string }
interface RankedListProps extends Omit<CardProps, 'title'> {
  title?: React.ReactNode; action?: React.ReactNode;   // "View all" → <Link>
  items: RankedListItem[];  limit?: number;  max?: number /* default = leader */;
  format?: Intl.NumberFormatOptions | ((v:number)=>string); locale?: string;
  showRank?: boolean; showShare?: boolean;             // optional "34%" of total
  renderItem?: (item, ctx: { ratio: number; rank: number }) => React.ReactNode;
  empty?: React.ReactNode; loading?: boolean;
}
// Compound:
<RankedList title="Top channels" action={<Link href="/channels">View all</Link>}>
  <RankedList.Item label="Online store" value={64120} max={64120} />
</RankedList>
```
- **A11y**: `<ol>` (ranking is meaningful). Bars are `aria-hidden` because the value text is present. Optional sr-only "34% of leader". If rows link somewhere, each row is a single link. "View all" is a real link padded to the 44 px hit area.
- Reuse the **Progress Bar** primitive from page 03 (`7275:13526`) or a shared `BarMeter` for the track and fill, instead of the ad-hoc frames used here.
- **RSC**: server. **Tier**: composite. **Package**: `@nizivo/dashboard`.

**Issues**: ghost main. "View all" is text only with no states (hover, focus) and a 20 px hit area. Track height 6 and radius 3 are raw (use `radius/full`; there is no `size/track` token). The leader bar overflows by 2 px. Gaps 16 and 8 are raw. There is no empty, loading, rank-number or category-colour option, and no shadow while Revenue Card has one.

---

## 5. Numeric styles and count-up motion

| Style | Spec | Used on this page |
|---|---|---|
| `Grove/Numeric/Display` | Geist SemiBold 40/100%/-3% | Revenue Card headline `$123,307.40` |
| `Grove/Numeric/KPI` | SemiBold 32/100%/-2.5% | KPI Tile value (×4 variants) |
| `Grove/Numeric/L` | SemiBold 24/110%/-1.5% | *unused here* |
| `Grove/Numeric/M` | Medium 16/120%/-0.5% | Ranked List values (×5) |
| (Delta uses `Label/M Strong`) | | Delta values: **not** a numeric style |

- All four descriptions say *"Tabular figures (font-variant-numeric: tabular-nums). Animate with count-up, duration/count-up."* `openTypeFeatures` on the styles is **null**, so tnum is not enabled in Figma. Code must set `font-variant-numeric: tabular-nums` (Geist supports `tnum`) in the `numeric-*` typography tokens. Design and code renders will differ slightly in width.
- `type/kpi` responsive variable [32 desktop, 28 tablet, 28 mobile] is not bound to `Numeric/KPI`. Code should drive `--nz-type-kpi` from that variable, ideally via container queries.
- Motion tokens: `duration/count-up` 900 ms (Reduced 0). **No easing** is defined for count-up. Proposal: `easing/enter` (`cubic-bezier(0,0,0,1)`, a decelerating curve that lands softly on the final digit).

**`CountUp` / `NumberValue` design (proposed, `@nizivo/motion` with a thin re-export in `@nizivo/ui`)**
```tsx
<NumberValue value={48290} format={usd0} locale="en-US" />            // server, static
<CountUp value={48290} format={usd0} from={0} trigger="in-view" />    // client island
```
- SSR renders the **final** value (no hydration mismatch, SEO-safe). The client animates only on (a) first entry into the viewport, if the element was off-screen at hydration, or (b) subsequent value changes, which animate from the previous value.
- Format each frame with `Intl.NumberFormat#formatToParts`, so currency symbol, grouping and decimals stay stable and only digits change. Combined with tabular-nums this gives zero layout jitter.
- `prefers-reduced-motion` or Motion=Reduced (`duration/count-up` = 0) jumps straight to the value.
- A11y: the animated span is `aria-hidden`, a sibling sr-only node holds the final formatted value, and there is no live region per frame.
- Keep the animation engine pluggable. The default is a tiny rAF tween; it can be swapped for Motion/Framer `animate()` through a `@nizivo/motion` adapter, so core has no motion dependency.

---

## 6. Slot architecture for plug-in / plug-out flexibility

```
@nizivo/tokens       --nz-* CSS vars (prefix configurable), Light/Dark, Motion Default/Reduced, Responsive
@nizivo/ui           Card (surface primitive + data-tone CSS scope) · Delta · Metric · NumberValue · Link/Button/IconButton/Select/Menu
@nizivo/charts       Sparkline · AreaChart · BarMeter/ProgressBar · Legend · ChartTooltip  (data-shape agnostic: x/y accessors)
@nizivo/motion       CountUp · reveal/stagger helpers (engine adapter)
@nizivo/dashboard    KpiTile · TrendCard(+RevenueCard recipe) · RankedList · InsightCard   (pure compositions of the above)
```
1. **Widgets are compositions, never forks.** Every widget renders `Card` and accepts all `CardProps` (tone, padding, radius, elevation, asChild). A design change to the surface lands in one place.
2. **Two API levels per widget.** Convenience props cover 80% of uses. Compound parts (`KpiTile.Label`, `.Value`, `.Chart`, `.Footer`…) give full control. Each convenience prop is implemented *by* rendering the compound parts, so both stay in sync.
3. **Every visual region is a `ReactNode` slot.** That covers `chart`, `actions`, `media`, `legend`, `footer`, `icon`, `empty` and `error`. `null` removes a region, and any node replaces it. No `INSTANCE_SWAP`-style enums appear in code.
4. **Data, not presentation, drives state.** `trend` is derived from `delta`, `ratio` from `max`, and legend from the chart series. Figma variant axes such as `Trend` become optional overrides, not required props.
5. **Formatting is injected.** Use `format: Intl.NumberFormatOptions | (v) => string` and a `locale` prop. Use pure functions, not context, so server components work. A client `NizivoProvider` may supply defaults for client islands only.
6. **Surface context through CSS custom properties.** `[data-tone]` on Card re-scopes `--nz-surface-bg`, `--nz-surface-fg`, `--nz-surface-border` and `--nz-surface-raised`. Children such as the Delta pill, sparkline halo and inner panels adapt with zero JS and stay RSC-safe. New tones are CSS-only, and the `SurfaceTone` type is extensible through module augmentation.
7. **Container queries** handle widget responsiveness (`@container nz-card (width < 280px)`). Dashboard grids vary, so viewport breakpoints are not used.
8. **States are first-class on every widget.** `loading` uses Skeleton (page 07), `empty` uses Empty State, and `error` has its own slot, so the dashboard composition (page 08) can stream with Suspense: the server shell with skeleton fallbacks streams first.
9. **Icon-set agnostic.** Icons are passed as nodes. Defaults come from a small internal set (Lucide-compatible names and 2 px/24 strokes, as in the file) through an `icons` registry, so consumers can swap in their own library.

---

## 7. Token bindings audit (whole section)

- Bound variable usages: **Grove Color 390, Grove Space 115**. **Zero references to non-Grove collections** (Clario, Pipkin, Merit, Ashgrove, Noema, Praxa, Pogo, Halden, Ardenfield) on this page.
- Raw (unbound) **paints: 0**. Raw **effects: 0** (only `Grove/Elevation/1 Card`, ×2). Text without a style: **0**. Styles used: Heading/H2 ×6 (doc), H3 ×3, H4 ×4, Body/M ×22, Body/M Strong ×1, Label/M ×17, Label/M Strong ×8, Numeric/KPI ×4, Numeric/Display ×1, Numeric/M ×5.
- **Unbound numbers (design debt):**

| Node(s) | Raw values | Should be |
|---|---|---|
| Delta variants `7275:13744/13747/13750` and every Delta instance | padding 4/10/4/8, gap 4, radius 999 | space/1, space/2 (10 off-scale; or a new space/2-5), space/1, radius/full |
| Card variants `7275:13758/13764/13770` | gap 20; Slot radius 12; strokeWeight 1 | space/5; radius/md; border-width/default |
| KPI Tile variants `7275:13781/13789/13797/13805` | gap 16; Footer gap 8 | space/4; space/2 |
| Insight variants `7275:13830/13834/13838` | gap 20; Render 252×168, radius 0; CTA radius 999 | space/5; aspect token; radius/full |
| Revenue Card `7275:13818` | gap 24; Headline gap 8; Value gap 12; Legend gap 20; Period padding 0/10/0/12, gap 8; area node opacity 0.1; dash [5,4] | space/6, space/2, space/3, space/5; space tokens; chart area-opacity token; chart dash token |
| Ranked List `7275:13824` | gap 16; row gap 8; track h 6, radius 3 | space/4; space/2; size/track (new); radius/full |
| Sparkline instances in KPI | scaleFactor 0.786 (stroke 1.57, dot 6) | size via props; non-scaling stroke |
| Prototype hover transitions | 160 ms Smart Animate | duration/fast (140) or duration/base (220) + easing/standard |
| Doc frames (doc-only, not shipped) | padding 48, gap 32/6, radius 28 | n/a (documentation chrome) |

---

## 8. Icons

All icons are **local (remote=false) but orphaned** (`parent === null`): there is no icon component set on any canvas page. Names match **Lucide** (`trending-up`, `trending-down`, `minus`, `ellipsis`, `arrow-right`, and a calendar glyph in the Select). Strokes are 1.28 at 16 px and 1.6 at 20 px, which works out to about 1.92 px at 24, consistent with Lucide's 2 px stroke scaled. Strokes are bound to semantic colour tokens (`text/success`, `text/critical`, `text/secondary`, `icon/secondary`, `icon/inverse`). In code, icons should use `currentColor` and inherit the parent's text token.

| Icon | Main id | Key | Used in |
|---|---|---|---|
| Icon/trending-up | `738:386` | `6ec6f5db…` | Delta Up |
| Icon/trending-down | `738:382` | `b867a5b3…` | Delta Down |
| Icon/minus | `738:262` | `e8bb73e3…` | Delta Flat |
| Icon/ellipsis | `738:166` | `cea64a49…` | Card Action |
| Icon/arrow-right | `738:73` | `cb626792…` | Insight CTA trailing icon |

Recommendation: adopt `lucide-react` as the *default* icon adapter and keep it swappable (§6.9).

---

## 9. Contrast results (WCAG 2.x, computed from snapshot hexes)

| Pair | Ratio | Verdict |
|---|---|---|
| Delta Up: text/success #216c47 on bg/success-subtle #e9f3ec | 5.60 | AA |
| Delta Down: text/critical #b93a23 on bg/critical-subtle #fdf1ee | 5.14 | AA |
| Delta Flat: text/secondary on bg/subtle | 6.26 | AA |
| Delta Up **dark**: green/300 on green/950 | 7.37 | AA |
| Delta Down **dark**: red/500 #d6492f on neutral/850 #202421 | **3.63** | **Fail** (14 px semibold is not large text) |
| Delta Flat **dark** | 6.87 | AA |
| Delta pill vs Tinted-Up tile bg (#e9f3ec on #e9f3ec) | **1.00** | pill boundary invisible |
| KPI label text/secondary on white / brand-subtle / accent-subtle | 6.48 / 5.71 / 6.10 | AA |
| "vs last week" text/tertiary #747c73 on white | **4.31** | **Fail** AA (14 px) |
| text/tertiary on brand-subtle / accent-subtle | **3.80 / 4.05** | **Fail** |
| text/tertiary dark on surface / brand-subtle | **4.03 / 3.91** | **Fail** |
| Chart axis labels text/tertiary on white | **4.31** | **Fail** |
| Card Inverse slot placeholder text/tertiary on inverse-elevated | 3.65 | Fail (placeholder) |
| Ranked "View all" text/brand on white | 8.51 | AA |
| Ranked bar chart/primary vs track chart/track | 5.55 | passes 3:1 |
| Ranked track chart/track vs white | 1.15 | track is decorative; OK |
| Sparkline Up chart/primary on white | 6.36 | passes |
| Sparkline Down / previous-period line chart/neutral #cbd0c8 on white | **1.57** | **Fail** 1.4.11 if meaningful |
| Insight Accent CTA on-accent on bg/accent | 11.46 | AAA |
| Card Surface border/subtle vs white; Surface vs canvas; Subtle vs canvas | 1.15 / 1.08 / 1.04 | very low-contrast surfaces (OK decoratively, but no shape cue in forced-colors; add `forced-colors` border) |

The root fix for most failures is a token change. Darken `text/tertiary` to about neutral/600 for text use, or restrict tertiary to ≥18 px and add `text/tertiary-strong`. Add a darker `chart/neutral-strong` for meaningful lines.

---

## 10. Hit targets

| Element | Size | vs control-sm 32 / touch-min 44 |
|---|---|---|
| Card Action (`Icon/ellipsis`, no button) | 20×20 | fails both |
| Ranked List "View all" (TEXT) | 51×20 | fails both (needs padding or pseudo-element hit area) |
| Insight CTA (Button Md) | ~106×40 | ≥32 OK; below 44 on touch (pad hit area on `pointer: coarse`) |
| Revenue Period Select | 240×40 | ≥32 OK; below 44 on touch |
| KPI Tile (if clickable) | 300×154 | OK, but no interactive state is designed |

---

## 11. States and behaviours shown vs missing

| Component | Shown | Missing |
|---|---|---|
| Delta | Up, Down, Flat | size sm, on-tinted/plain, skeleton |
| Card | Surface, Subtle, Inverse | hover, pressed, focus (clickable), selected, loading, empty, error, collapsible, description, footer |
| KPI Tile | Surface/Tinted × Up/Down | Flat, loading/skeleton, empty ("—"), error, hover/focus/clickable, long-value overflow, no-chart, count-up spec |
| Insight Card | Brand/Accent/Inverse | dismiss, description, hover, loading |
| Revenue Card | Default; chart Hover (crosshair + tooltip) via prototype | loading, empty (no data), error, keyboard chart nav, mobile layout, period-change transition |
| Ranked List | Default | empty, loading, link hover/focus, rank numbers, >N "show more" |

---

## 12. Design gaps to raise with the design team

1. Swap ghost nested instances to the canonical `7275:*` sets, and make Revenue Card and Ranked List real components with props (§2).
2. Unify surface naming as one `Tone` axis on Card (Surface, Subtle, Inverse, Brand, Accent), and build widgets *from* Card instances.
3. Decouple KPI `Tinted` colour from `Trend`, and add `Trend=Flat` plus a Delta prop and a comparison text prop.
4. Give Delta an on-tinted or plain appearance (it is invisible on brand-subtle). Resolve the dark-mode collision of brand-subtle, accent-subtle and success-subtle (all green/950).
5. Change the Card Action from a boolean to INSTANCE_SWAP or a native slot, wrapped in an IconButton (32 px) with Menu.
6. Add a `border/inverse` token and an inverse muted-text token. Fix the Inverse Slot stroke.
7. Fix `text/tertiary` contrast, or restrict its use. Add a stronger `chart/neutral` for meaningful lines.
8. Enable `tnum` on Numeric styles. Use a Numeric style for Delta digits. Bind `Numeric/KPI` to `type/kpi`.
9. Specify count-up easing and trigger (in-view or on change), and the reduced-motion behaviour.
10. Put prototype transitions on duration and easing tokens (160 ms is off-token).
11. Design loading, empty and error states for all widgets, and interactive card states.
12. Add Ranked List "View all" as a Link component. Bind track size and radius tokens. Fix the 332 > 330 overflow.
13. Insight Card: add description and dismiss props, and an image or aspect token.

## 13. Extraction gaps

- The ghost mains' original page or location cannot be determined (`parent === null`), and we cannot tell whether other pages' instances also point to ghosts. That needs a per-page check by other agents. `removed` returned `false` for them.
- Revenue Card's x-axis label nodes (5 children beyond the first 10 of `Grid & axes`) and the calendar icon name inside the Select were not individually read. The screenshot shows "Oct 1 … Oct 30" and a calendar glyph.
- The Area Chart Hover variant (`747:310`) children were listed (Crosshair, Hover dots, Chart Tooltip), but their token bindings were not read. Page 03's agent covers the canonical Area Chart and Tooltip.
- The Accent CTA label colour was not read directly (the instance child id differed). The contrast assumes Button Accent uses `text/on-accent`; verify on page 02.
- Dark-mode values are computed from the snapshot's mode table, not from rendered dark screenshots. Components have no explicit variable modes set (`explicitVariableModes` is empty).
- Insight render images are not exported (only the image hash `9be01264…` was recorded).
