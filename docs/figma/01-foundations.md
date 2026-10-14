# Grove · 01 Foundations — extraction & architecture analysis

- File: `BIzJFf1wm8KP0YG2AVI1tP` ("Grove UI Library" when read; now "Nizivo UI Library"), page **Grove · 01 Foundations** `7275:11884`, single section `7275:11885` (6000×4000).
- Ships as **Nizivo UI** (`@nizivo/*`). Every `grove` prefix / "Grove" brand string on this page is demo branding and must become configurable.
- Read 2026-10-14, read-only. 12 Figma tool calls in total: 9 `use_figma` (6 returned data; 3 were rejected for exceeding the 20 KB return limit and were re-run narrower) + 3 `get_screenshot`. No rate-limit errors. Token names refer to `00-tokens-and-styles.md`.
- Screenshots: `scratchpad/figma/shots/01-foundations-full.png` (whole section), `01-foundations-color.png`, `01-foundations-motion.png`.

---

## 0. TL;DR for the code pipeline

1. **Fills and strokes on this page are 100% variable-bound to Grove tokens. There are zero references to non-Grove collections.** Text is 100% on Grove text styles, except inside the scaled cover screenshot (explained in section 9). Debt is limited to **unbound radii** (r4/r8/r12/r16/r20 on doc chrome), **unbound stroke weights**, raw **gaps/padding**, and **effect styles with hard-coded colors**.
2. **The icon set is Lucide**: 74 icons, 20px, 1.6px stroke, recolored through `icon/*`. The **master components of all 74 icons and of `Brand/Logo` are not on any page.** They return `parent: null, removed: false`, which looks like masters deleted from the canvas while their instances survive. The design team needs to confirm and restore them. Code must use `lucide-react` (or an adapter) directly, not exports of these masters.
3. **Motion durations are documented, but the chips that show them are clipped** (40px tall frame with `clipsContent: true`), so the values are invisible on the canvas. The values match the Motion collection exactly.
4. **Breakpoints are not defined anywhere.** Only frame widths exist (1440/1024/390). Code needs designer sign-off on min-width thresholds.
5. **Accessibility debt in the token set:**
   - `text/tertiary` fails AA (4.5:1) at 14px in both modes.
   - In dark mode, `text/critical` and `text/info` fail.
   - Dark `bg/critical` has no passing foreground.
   - `border/default` and `border/strong` are far below 3:1, so input boundaries fail WCAG 1.4.11.
   - `icon/warning` is 2.45:1 on white.
   - The focus halo alone is about 1.4:1. The 2px `border/focus` stroke carries the indicator.
6. **Foundations deserve code primitives:** `tokens` package, theme scopes (light/dark, nested), `Text`, `Icon` (adapter-based), `Logo` (brand slot), `focus-ring` utility, `Surface` (elevation), layout `Container/Grid/Stack`, and a motion system (`@nizivo/motion`) with spring presets that compile to CSS `linear()`.

---

## 1. Page inventory (section `7275:11885`)

| Node | Name | Type | Pos / size | Content |
|---|---|---|---|---|
| `7275:11962` | Cover | FRAME | 120,120 · 1440×810 | Hero: logo, title, subtitle, version meta, scaled product shot, 2 renders |
| `7275:12007` | Doc/Color | FRAME (V auto-layout p56 g40) | 1680,120 · 2000×1800 | Primitive ramps + Light/Dark semantic panels |
| `7275:12385` | Doc/Typography | FRAME (V p56 g40) | 120,1040 · 1440×1418 | 18 text-style specimens |
| `7275:12479` | Doc/Space & Shape | FRAME (V p56 g40) | 1680,2040 · 1440×722 | Space scale, radius scale, borders |
| `7275:12578` | Doc/Elevation | FRAME (V p56 g40) | 1680,3000 · 1440×501 | 5 elevation levels |
| `7275:12608` | Doc/Grid | FRAME (V p56 g40) | 3200,2040 · 2000×846 | 3 breakpoint diagrams |
| `7275:12649` | Doc/Motion | FRAME (V p56 g40) | 3200,3000 · 2000×762 | Durations, easings, principles |
| `7275:11961` | Brand/Logo | INSTANCE | 4000,120 · 98×32 | Iconography panel header (the "Grove" lockup above the icon grid) |
| `7275:11886` | Icon components | FRAME (no auto-layout, no fill) | 4000,200 · 1000×400 | 74 `Icon/*` instances on a 12×7 grid, 44px pitch |
| `7275:12726` | Asset library | FRAME (no auto-layout) | 4000,700 · 1800×560 | 18 image rectangles (imagery) |

All `Doc/*` frames share the same chrome: fill `bg/surface`, radius bound to `radius/2xl` (28), padding 56 and gap 40 (padding and gap **unbound**; they equal `space/14` (not a token) and `space/10`). Each starts with a `Header` frame (V gap 8) holding a `Grove/Heading/H1` title in `text/primary` and a `Grove/Body/L` subtitle in `text/secondary`.

---

## 2. Verbatim designer text (all non-component TEXT)

### Cover (`7275:11962`)
- Title (`Grove/Display/L`): **"Grove Commerce System"**
- Subtitle (`Grove/Body/L`): "Tokens, components and patterns for the Grove merchant platform."
- Meta (`Grove/Mono/M`): "v1.1 · October 2026 · 62 components · 74 icons"
- Product-shot text that sits outside instances: "Good morning, Maya", "Goals", "Recent orders", "View all"

### Section headers (title / subtitle)
| Panel | Title | Subtitle (principle) |
|---|---|---|
| Color `7275:12008` | Color | "Deep green leads, warm neutrals carry the surface, semantics stay quiet until needed." |
| Typography `7275:12386` | Typography | "Geist for every surface, Geist Mono for IDs and code. Nothing smaller than 14px." |
| Space `7275:12480` | Space, radius & borders | "A 4px base grid. Radius grows with surface size; borders are 1px and quiet." |
| Elevation `7275:12579` | Elevation | "Depth is earned: flat by default, lift on hover, float only for overlays." |
| Grid `7275:12609` | Grid & breakpoints | "12 columns on desktop, 8 on tablet, 4 on mobile. Cards snap to spans, never to pixels." |
| Motion `7275:12650` | Motion | "Motion explains change: what moved, where it came from, what it means. Reduced mode keeps fades, drops travel." |

### Usage labels
- **Radius** (`7275:12532`): xs, "Tags, checkbox" · sm, "Buttons sm, chips" · md, "Inputs, buttons" · lg, "Menus, tiles" · xl, "Cards" · 2xl, "Hero cards, modals" · full, "Pills, avatars"
- **Borders** (`7275:12561`): border/subtle, "Dividers inside cards" · border/default, "Cards, inputs" · border/strong, "Hover / pressed edge" · border/focus, "Focus · 2px + 4px ring"
- **Elevation** (`7275:12582`): Flat, "Inline sections" · Card, "Resting cards" · Raised, "Hover lift" · Popover, "Menus, tooltips" · Modal, "Modals, drawers"
- **Grid** (`7275:12612`): "Desktop · 1440px" / "12 cols · 24 gutter · 32 margin" · "Tablet · 1024px" / "8 cols · 20 gutter · 24 margin" · "Mobile · 390px" / "4 cols · 16 gutter · 16 margin"
- **Durations** (`7275:12653`). These texts exist but are clipped and invisible on canvas (section 7.1):
  - instant: "80ms", "Reduced: 0ms"
  - fast: "140ms", "Reduced: 0ms"
  - base: "220ms", "Reduced: 120ms"
  - slow: "320ms", "Reduced: 120ms"
  - slower: "480ms", "Reduced: 160ms"
  - count-up: "900ms", "Reduced: 0ms"
  - chart-draw: "700ms", "Reduced: 0ms"
- **Easing** (`7275:12689`): standard `cubic-bezier(0.2, 0, 0, 1)` · enter `cubic-bezier(0, 0, 0, 1)` · exit `cubic-bezier(0.3, 0, 1, 1)` · spring `spring(1, 260, 24, 0)` · spring-soft `spring(1, 170, 26, 0)`
- **Motion principles** (`7275:12720`, verbatim):
  1. "Hover — card lifts 4px with Elevation/2 and tilts up to 6° toward the cursor (spring)."
  2. "Press — scale 0.98 in 80ms, release springs back."
  3. "Data — charts draw left→right in 700ms; numbers count up in 900ms with tabular figures."
  4. "Overlays — modals and drawers enter on spring, exit in 140ms ease-in; the backdrop only fades."
  5. "prefers-reduced-motion — Grove Motion switches to Reduced: travel and tilt go to 0, fades stay ≤160ms."

### Component descriptions read (masters are unparented, see section 5)
- `Brand/Logo` (`739:64`, key `227c72d8c8dba6a70eff3997868daa2aad862c44`): "Grove brand lockup: sprout mark on bg/brand + Geist SemiBold wordmark. Min clear space = mark height / 2."
- All 74 `Icon/*` (`738:69` … `738:426`): "Lucide "&lt;name&gt;" · 20px, 1.6 stroke · recolour via icon/* tokens." (identical template; for example key `d981313848c0091f76a994bdbbf1521aab702974` for arrow-down-right). No `documentationLinks` anywhere.
- Text-style descriptions: `Grove/Numeric/Display|KPI|L|M`: "Tabular figures (font-variant-numeric: tabular-nums). Animate with count-up, duration/count-up."

No iconography, imagery, accessibility or content-guideline text exists on the page. The icon grid and asset library have no labels or guidance at all.

---

## 3. Color (`Doc/Color` 7275:12007)

### 3.1 Primitives (`Primitives` 7275:12011, V gap 28)
Six ramps: green `7275:12012`, lime `7275:12063`, neutral `7275:12094`, red `7275:12153`, amber `7275:12176`, blue `7275:12199`. **All 48 swatches are bound to their `Grove Primitives` variable, and every printed hex label equals the bound value.** No drift.
- Swatch: 88-ish px rounded rect, **radius 12 raw** (= `radius/md`, unbound). neutral/0, 25 and 50 add a `border/subtle` stroke so they stay visible.
- Labels: step in `Grove/Label/M` + `text/primary`; hex in `Grove/Mono/M` + `text/tertiary`; ramp title in `Grove/Label/M Strong`.
- **Not documented:** the 6 `viz/*` primitives (green-500/600, lime-500/600, teal-500/400) that feed `chart/cat-1..3`.

### 3.2 Semantic panels (`Semantic` 7275:12222, H gap 24)
- `Semantic · Light` `7275:12223`: fill `bg/canvas`, radius 20 raw, no explicit mode (inherits Light).
- `Semantic · Dark` `7275:12304`: fill `bg/canvas`, radius 20 raw, **explicit mode `Grove Color` = Dark (`737:2`)**. Mode-scoping on a subtree is the design intent, so code must support **nested theme scopes**.
- Each panel has 3 columns of 8 rows (chip r8 raw + `Grove/Mono/M` name in `text/primary`, column titles in `text/secondary`):
  - **Surface:** bg/canvas, bg/surface, bg/subtle, bg/muted, bg/inverse, bg/brand, bg/brand-subtle, bg/accent
  - **Text & icon:** text/primary, text/secondary, text/tertiary, text/brand, text/success, text/warning, text/critical, text/info
  - **Border & chart:** border/default, border/strong, border/focus, chart/primary, chart/secondary, chart/tertiary, chart/neutral, chart/negative
- Resolved values verified against the snapshot: light and dark match.
- Doc issue: chips for bg/canvas, surface and subtle are invisible on their own panel background because they have no outline (see screenshot).

### 3.3 Semantic tokens that exist but are NOT documented (34 of 58)
- **bg:** surface-raised, hover, pressed, inverse-elevated, brand-hover, brand-pressed, brand-muted, accent-subtle, success-subtle, warning-subtle, critical-subtle, info-subtle, critical, disabled
- **text:** disabled, inverse, on-brand, on-accent
- **border:** subtle (shown only in this page's Borders row, `7275:12561`), brand, critical, warning
- **icon:** all 7 (primary, secondary, brand, inverse, success, warning, critical)
- **chart:** track, grid, cat-1, cat-2, cat-3 (with the validated-categorical description "Fixed order, never cycled; 4th+ series fold into chart/neutral 'Other'")

### 3.4 Token-set observations relevant to code
- In dark mode, `bg/surface` = `bg/subtle` = neutral/900 (contrast 1.00), and surface vs canvas is 1.08. `bg/hover` (dark) = `bg/muted` (dark) = neutral/800. Dark surfaces separate only by shadow, and the shadows are tuned for light mode.
- Gaps already noted in the snapshot are confirmed by the docs: no `bg/info` or `bg/success` or `bg/warning` solids, no `border/info`, no `icon/info`, no `overlay/scrim`. Also missing: `text/on-critical`, `border/input` (≥3:1) and a `focus-ring` color token.

---

## 4. Typography (`Doc/Typography` 7275:12385)

All 18 `Grove/*` text styles are specimened. Each row is H auto-layout, gap 32, with a 260px `meta` column: the style name in `Label/M Strong` + `text/primary`, and the spec in `Mono/M` + `text/tertiary`. **Every spec string matches the actual style** (family, weight, size, line-height). The meta omits letter-spacing.

| Row node | Style | Spec (doc) | Letter-spacing (style) | Specimen copy |
|---|---|---|---|---|
| 7275:12389 | Display/L | Geist SemiBold · 56/104% | -3% | Grow every storefront |
| 7275:12394 | Display/M | Geist SemiBold · 44/108% | -2.5% | Sales are up 18.4% |
| 7275:12399 | Heading/H1 | Geist SemiBold · 32/120% | -2% | Store overview |
| 7275:12404 | Heading/H2 | Geist SemiBold · 24/130% | -1.5% | Recent orders |
| 7275:12409 | Heading/H3 | Geist SemiBold · 20/140% | -1% | Inventory alerts |
| 7275:12414 | Heading/H4 | Geist SemiBold · 16/150% | -0.5% | Payment details |
| 7275:12419 | Body/L | Geist Regular · 16/160% | 0 | Your store converted 3.8% of sessions this week. |
| 7275:12424 | Body/M | Geist Regular · 14/150% | 0 | Ships in 2–3 business days from Brooklyn, NY. |
| 7275:12429 | Body/M Strong | Geist Medium · 14/150% | 0 | Fulfilled · Paid |
| 7275:12434 | Label/L | Geist Medium · 16/140% | -0.2% | Create product |
| 7275:12439 | Label/M | Geist Medium · 14/140% | 0 | Filter orders |
| 7275:12444 | Label/M Strong | Geist SemiBold · 14/140% | 0 | Save changes |
| 7275:12449 | Numeric/Display | Geist SemiBold · 40/100% | -3% | $184,920 |
| 7275:12454 | Numeric/KPI | Geist SemiBold · 32/100% | -2.5% | 12,408 |
| 7275:12459 | Numeric/L | Geist SemiBold · 24/110% | -1.5% | 3.82% |
| 7275:12464 | Numeric/M | Geist Medium · 16/120% | -0.5% | $48.00 |
| 7275:12469 | Mono/M | Geist Mono Regular · 14/140% | 0 | #GR-10482 |
| 7275:12474 | Mono/M Strong | Geist Mono Medium · 14/140% | 0 | SKU-MUG-STN-01 |

Findings:
- **Tabular figures are not applied in Figma.** `openTypeFeatures` is `{}` on the Numeric specimens; tabular-nums lives only in the style description. Code must set `font-variant-numeric: tabular-nums` on all `Numeric/*` (and on Mono/table cells).
- **Weights in use:** 400 (Regular), 500 (Medium), 600 (SemiBold). No bold or light, so we can ship a 3-weight Geist subset. Geist and Geist Mono are OFL (Vercel) and available through the `geist` npm package or Google Fonts.
- **Letter-spacing is in %** and must convert to em (-3% → `-0.03em`).
- **"Nothing smaller than 14px"** is a hard rule, so there is intentionally no 12px caption or overline. Dense data UIs (chart axes, table meta, badges) may push back. Flag for designers: either confirm, or add `Label/S 12` with an AA-safe color.
- **Responsive type variables are not bound to the styles.** `type/display` [56,44,36], `type/h1` [32,28,24] and `type/kpi` [32,28,28] coincide with Display/L (56), Display/M (44 = tablet display) and H1/KPI (32) at Desktop. In code, make the display, h1 and kpi sizes read the responsive variables (per-breakpoint custom properties or `clamp()`).
- No font-family, weight or line-height variables exist (styles only). The token pipeline must emit composite typography tokens.

---

## 5. Iconography (`Icon components` 7275:11886) & brand

### 5.1 Icons
- **74 instances**, each 20×20, laid out absolutely on a 12×7 grid at 44px pitch (no auto-layout), with no labels and no overrides.
- Master component IDs `738:69`–`738:426`, all **local** (`remote: false`), no component properties, no variants.
- **Library:** Lucide. Every description reads "Lucide "&lt;name&gt;" · 20px, 1.6 stroke · recolour via icon/* tokens."
- **Vector construction:** stroke only (no fills), `strokeWeight 1.6`, round cap and join, constraints SCALE. The stroke is **bound to `icon/primary`** (213 bindings). Recoloring happens through the `icon/*` tokens.
- **Masters are unparented.** `getMainComponentAsync()` returns COMPONENT nodes with `parent: null` and `removed: false`, and the snapshot's page-by-page component scan lists no `Icon/*` or `Brand/Logo` on any page. This is consistent with masters deleted from the canvas while instances persist. *Designers should confirm in the UI ("Restore main component").* Until then the icons cannot be published, edited centrally or found through library search.
- **Full list (74):** arrow-down-right, arrow-right, arrow-up-down, arrow-up-right, bell, box, calendar, chart-column, chart-line, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-up-down, circle-check, circle-help, circle-x, clock, command, copy, credit-card, download, ellipsis, eye, file-text, filter, gift, globe, grip-vertical, house, image, info, layers, layout-dashboard, layout-grid, link, list, log-out, mail, map-pin, megaphone, minus, moon, package, panel-left, pencil, percent, plus, printer, receipt, refresh-cw, repeat, search, settings, shopping-bag, sliders-horizontal, sparkles, star, store, sun, tag, target, trash-2, trending-down, trending-up, triangle-alert, truck, upload, user-plus, users, wallet, x, zap. All are valid current Lucide names.
- **Outside the 74-icon set:** the Cover product shot also contains a `Social/Instagram` instance. A vector in the Icon slot of Nav Item `755:766` has a **raw fill `#6b7069`** (`I7275:11965;755:766;755:620;772:4301`); that hex is not a Grove primitive. Its main component (`772:*`) is not one of the 738:* Lucide masters, so it is likely the `Social/Instagram` swap; the owner of page 06/10 should confirm.
- **Not documented:**
  - Icon sizes. Tokens `size/icon-sm 16`, `icon-md 20` and `icon-lg 24` exist, but only 20 is drawn.
  - Stroke at other sizes (1.6 at 20px only).
  - Color usage rules per `icon/*`.
  - Optical alignment with text.
  - `aria-hidden` and labelling rules.
  - The missing `icon/info`.
  - Brand and social icon sourcing (Lucide removed brand icons, so `Social/*` needs its own source, e.g. Simple Icons).

### 5.2 Brand/Logo (`7275:11961` on this page; `7275:11963` in Cover; `7275:11231` on the **Cover page** `7275:11229`)
- All three are instances of `Brand/Logo` `739:64` (local, unparented as described above). The component is 98×32, H auto-layout, gap **10 (raw)**.
- Parts:
  - `Mark` (`I…;739:65`): 32×32 frame, fill `bg/brand`, **radius 10 raw**, which matches no token (sm 8 / md 12). It holds a sprout drawn as 3 vectors: a stem stroke 2px `text/on-brand`, plus two leaves filled `text/on-brand`.
  - `Wordmark` (`I…;739:70`): "Grove", `Grove/Heading/H3` (Geist SemiBold 20 / -1%), fill `text/primary`.
- Theming: the Cover instance (`7275:11963`) and the Cover-page instance (`7275:11231`) set **explicit mode Grove Color = Dark**, so the lockup inverts on the green cover. The mark becomes green/400 and the wordmark neutral/50.
- `7275:11231` is a **scaled** instance (684×224): the wordmark is 140.2px and the mark radius 70.1. Text-style linkage is lost through scaling, and **there are no size variants**.
- Guidance: "Min clear space = mark height / 2."
- Code implication: the logo is **brand content, not a design-system component**. Nizivo needs a `Logo` slot fed by brand config (mark SVG + wordmark), with `size` driving height and proportional clear space, and tone handled by theme scope. Grove is a demo brand.

---

## 6. Imagery (`Asset library` 7275:12726)

18 rectangles, 180×180, image fills (`scaleMode FILL`), no text or guidance:
- **3D renders** (radius 0): `3d-parcel` 7275:12727, `3d-bag` 12728, `3d-card` 12729, `3d-tag` 12730, `3d-store` 12731, `3d-orb` 12732. Soft matte clay in sage, cream and green, plus a green glass orb. Used as hero decoration (Cover `Render · Orb` 7275:12001, `Render · Bag` 7275:12002, `scaleMode FIT`).
- **Product photos** (radius 16 raw = `radius/lg`): `p-mug` 12733, `p-headphones` 12734, `p-planter` 12735, `p-cream` 12736, `p-serum` 12737, `p-tote` 12738, `p-candle` 12739, `p-cup` 12740. Warm beige or neutral studio backgrounds.
- **Portraits** (radius 16 raw): `a-1`..`a-4` (12741–12744), for avatars or customers. Mixed warm color and B/W.

Not documented: aspect ratios, crop and focal rules, radius per context, placeholder and loading treatment (Skeleton exists on page 07), alt-text guidance, art direction for 3D. **License and provenance of the images are unknown.** Treat them as demo and docs assets, never ship them in `@nizivo/ui`.

---

## 7. Space, radius, borders, elevation, grid, motion

### 7.1 Space & Shape (`7275:12479`)
- **Space scale** (`7275:12483`, H gap 20): 12 entries, `1 4px`, `2 8px`, `3 12px`, `4 16px`, `5 20px`, `6 24px`, `8 32px`, `10 40px`, `12 48px`, `16 64px`, `20 80px`, `24 96px`. Bars are 24 wide, height **bound** to `space/N`, fill `bg/brand-muted`, radius 4 raw. Labels: `Label/M` number + `Mono/M` px in `text/tertiary`.
  - Not shown: `space/0`, `space/0-5` (2px), `space/1-5` (6px).
- **Radius scale** (`7275:12532`): 7 samples 120×88, fill `bg/brand-subtle`, stroke `border/brand` 1px. **All radii bound** (xs 4 … full 999). Usage labels are in section 2. `radius/none` is not shown.
- **Borders** (`7275:12561`): 200×64 samples, fill `bg/surface`, radius 12 raw. Strokes: subtle, default and strong at **1px**; focus at **2px + effect `Grove/Focus/Ring`**. Stroke weights are **unbound**. The token `border-width/strong = 1.5` exists, but border/strong is drawn at 1px, and the header states "borders are 1px". This inconsistency needs a decision: drop `border-width/strong` or document where 1.5 applies.

### 7.2 Elevation (`7275:12578`)
- `Levels` `7275:12582`: fill `bg/canvas`, radius 20 raw, H gap 32, padding 24/24/40/24 (raw).
- 5 cards, 200×140, `bg/surface`, radius 20 raw (= `radius/xl`), padding 20, each with its effect style:

| Level | Effect style | Name / usage |
|---|---|---|
| 0 | Elevation/0 Flat | "Flat · Inline sections". **Only level with a `border/default` 1px stroke** |
| 1 | Elevation/1 Card | "Card · Resting cards" |
| 2 | Elevation/2 Raised | "Raised · Hover lift" |
| 3 | Elevation/3 Popover | "Popover · Menus, tooltips" |
| 4 | Elevation/4 Modal | "Modal · Modals, drawers" |

- **Contradiction to resolve:** the header says "flat by default", but level 1 is labelled "Resting cards". Is a resting card flat + border (level 0) or shadowed (level 1)? Card on page 04 decides; pick one default.
- Shadow colors are hard-coded `#101311` at alpha in the effect styles. There are **no dark-mode variants**, and dark surfaces barely differ (section 3.4). Recommendation: in dark mode, express elevation by stepping surface lightness (`bg/surface` → `bg/surface-raised` → `bg/inverse-elevated`-like steps) plus a `border/subtle` hairline, with shadows at higher alpha.

### 7.3 Grid & breakpoints (`7275:12608`)
- `Breakpoints` `7275:12612` (H gap 40): Desktop `Desktop 1440` (893×558), Tablet `Tablet 1024` (512×384), Mobile `Mobile 390` (242×523).
- These are scaled diagrams. Columns are plain RECTANGLEs with fill bound to `bg/brand` (paint opacity 1; they render pale, node-level opacity not read) inside a `bg/canvas` + `border/default` r16 frame. They are **not `layoutGrids`** and are **not bound** to the `Grove Responsive` variables (no explicit modes).
- Documented values equal the variables: columns 12/8/4, gutter 24/20/16, margin 32/24/16. Viewports 1440/1024/390.
- **No breakpoint thresholds** (min-widths) exist. The frame widths are device sizes, not breakpoints.
- Undocumented responsive tokens:
  - `layout/sidebar` [264, 72, 0]: full sidebar, collapsed rail, hidden (replaced by Mobile Tab Bar on page 08).
  - `layout/content-max` [1280, 976, 358]. Tablet 976 = 1024−2×24 and Mobile 358 = 390−2×16, but Desktop 1280 ≠ 1440−264−64. Clarify whether content-max is measured inside the sidebar layout.
  - `section/gap` [32, 24, 20], `type/display`, `type/h1`, `type/kpi`.
- "Cards snap to spans, never to pixels" implies that code should expose `Grid` + `GridItem span={{base:4, md:4, lg:6}}` and not fixed widths.

### 7.4 Motion (`7275:12649`)
- **Durations** (`7275:12653`): 7 chips, 232×**40**, fill `bg/canvas` r16 raw, padding 20.
  - **Bug: each chip is FIXED at 40px with `clipsContent: true`.** The name sits at y20, the proportional bar (`chart/primary`, width ∝ ms, unbound) at y48, the "NNNms" text at y62 and "Reduced: NNms" at y96. Only the name renders (confirmed in the screenshot). The hidden values are in section 2 and **match the `Grove Motion` collection exactly**, Default and Reduced.
- **Easings** (`7275:12689`): 5 cards 360×240, `bg/canvas` r16 raw, curve vector stroke `chart/primary` **2.5px (raw)**, baseline rect `border/default`. Labels: `Label/M Strong` name + `Mono/M` value. Values match the tokens.
- **`spring(mass, stiffness, damping, velocity)` is Figma notation, not CSS.** Code options:
  - (a) Pre-compute CSS `linear()` easing + duration at build time for `spring` (1, 260, 24) and `spring-soft` (1, 170, 26).
  - (b) Use a JS spring (motion library) in `@nizivo/motion`.
  - Recommendation: both. `linear()` for CSS-only components, JS for gesture-driven tilt and magnetic effects.
- **Principles** map onto tokens:
  - Hover → `distance/lift 4`, `Elevation/2`, `tilt/max-deg 6`, `easing/spring`.
  - Press → `scale/press 0.98`, `duration/instant 80`.
  - Data → `duration/chart-draw 700`, `duration/count-up 900`, tabular figures.
  - Overlays → enter `easing/spring`, exit `duration/fast 140` + `easing/exit`, backdrop opacity only.
  - Reduced → distances and tilt 0, durations ≤160, all easings linear.
- **Motion tokens with no documentation:** `distance/reveal 12`, `distance/float 8`, `scale/hover 1.02`, `stagger/item 40`, `magnetic/pull 6`. Magnetic implies cursor-attracting buttons or cards, which belongs in `@nizivo/motion` or `@nizivo/lab`, not core.
- **Prototype evidence (Cover product shot reactions):**
  - Hover on `Nav Item`, `Button`, `Chart`, `Order Row`: `ON_HOVER → CHANGE_TO (SMART_ANIMATE) 160ms cubic-bezier(0.2,0,0,1)`.
  - Click on `Search Field`, `Segment`: `ON_CLICK → CHANGE_TO 220ms` with the same curve.
  - **160ms is not a token** (instant 80 / fast 140 / base 220). It equals only the Reduced `duration/slower`. Normalise hover to `duration/fast` (140), or add `duration/hover 160`.
  - Click uses `duration/base` + `easing/standard` correctly.

---

## 8. Accessibility — contrast computed from token hexes (WCAG 2.x)

| Pair | Light | Dark | Verdict |
|---|---|---|---|
| text/primary on surface / canvas | 17.36 / 16.14 | 16.14 / 17.39 | AAA |
| text/secondary on surface / canvas | 6.48 / 6.03 | 6.87 (surface) | AA |
| **text/tertiary** on surface / canvas / muted (light), surface / canvas / surface-raised (dark) | **4.31 / 4.01 / 3.76** | **4.03 / 4.34 / 3.65** | **Fails AA body text in both modes.** Used for every hex and spec label on this page (14px Mono). |
| text/disabled on bg/disabled (light) / on surface (dark) | 2.20 | 2.68 | Exempt (disabled) but very faint |
| text/brand on surface | 8.51 | 7.58 | AAA |
| text/success on surface / success-subtle | 6.36 / 5.60 | 7.37 (subtle) | AA |
| text/warning on surface / warning-subtle | 6.58 / 6.11 | 7.10 / 6.43 | AA |
| **text/critical** on surface / critical-subtle | 5.69 / 5.14 | **4.01 / 3.63** | **Dark fails** |
| **text/info** on surface / info-subtle | 6.69 / 6.01 | **3.63 / 3.29** | **Dark fails** (blue/500 too dark) |
| text/on-brand on bg/brand / brand-hover | 8.51 / 10.91 | 5.17 / 7.37 | AA |
| text/on-accent on bg/accent | 11.46 | 9.66 | AAA |
| White on bg/critical | 5.69 (red/600) | **4.33** (red/500) | **Dark fails**; `text/inverse` on dark bg/critical = 4.01, also fails. Needs `text/on-critical`, or keep red/600 in dark. |
| **border/default** vs surface (non-text) | **1.27** | **1.29** | Fails 1.4.11 where it is the only boundary of an input ("Cards, inputs") |
| **border/strong** vs surface | **1.57** | **1.82** | Fails 1.4.11 |
| border/focus vs surface / canvas | 4.66 / 4.34 | 7.58 | Passes 3:1. **This 2px stroke is what makes focus visible.** |
| Focus/Ring halo (green/500 @ 28%) composite vs surface | 1.45 | 1.37 | Decorative only; never ship the halo without the 2px solid ring. The effect color is static (green/500) and not mode-aware, while `border/focus` flips to green/300. |
| icon/secondary vs surface | 4.31 | 6.87 | OK (3:1) |
| icon/success / critical vs surface (light) | 4.66 / 4.33 | — | OK |
| **icon/warning** vs surface (light) | **2.45** | — | **Fails 3:1** (amber/500 on white). Use amber/600 or 700 for icons on light. |
| chart/primary vs surface | 6.36 | 5.32 | OK |
| **chart/secondary / tertiary / neutral** vs surface | **1.65 / 1.75 / 1.57** | 1.59 / – / 1.82 | Below 3:1. Fine for fills adjacent to a stronger series; never the only encoding. |
| chart/cat-1 / cat-2 / cat-3 vs surface | 4.38 / **2.17** / 4.06 | — | cat-2 (lime) needs direct labels or patterns |
| bg/surface vs bg/canvas (dark) | — | 1.08 | Dark cards need a border or lighter surface |

Hit targets: `size/touch-min 44` exists. Nothing on this page is interactive (the cover prototype is a picture). Iconography gives no guidance on icon-button hit area. Recommendation: the 20px icon sits in a ≥32 (`control-sm`) visual box with a 44px hit area on touch (`@media (pointer: coarse)`).

Keyboard focus: the documented treatment is a 2px `border/focus` stroke + 4px halo (`Focus/Ring`) and `Focus/Ring Critical` for invalid fields. Effect hexes are hard-coded and drift by one digit from the primitives: `#2e8258` vs green/500 `#2e8358`, and `#d64a2e` vs red/500 `#d6492f`.

---

## 9. Hard-coded values / design debt on this page

| Where | Value | Should be |
|---|---|---|
| Color swatches (48) | radius 12 raw | `radius/md` |
| Semantic chips (48) | radius 8 raw | `radius/sm` |
| Semantic panels, Elevation `Levels` + 5 cards | radius 20 raw | `radius/xl` |
| Space bars | radius 4 raw | `radius/xs` |
| Border samples | radius 12 raw | `radius/md` |
| Duration, easing chips; grid frames; asset tiles | radius 16 raw | `radius/lg` |
| Cover frame `7275:11962` | radius 28 raw (fill bound `bg/brand`) | `radius/2xl` |
| Logo mark | radius 10, gap 10 | no matching token; add `radius/logo` or snap to 8/12, gap → `space/2`/`space/3` |
| All doc strokes | strokeWeight 1 / 2 unbound | `border-width/default` / `border-width/focus` |
| Easing curves | stroke 2.5 | doc-only, ignore |
| Doc frame padding/gap | 56 / 40 unbound | 56 is not on the scale (nearest `space/12` 48 / `space/16` 64) |
| Effect styles (all) | shadow, ring and glass colors hard-coded hex+alpha | bind to color variables, add dark variants |
| Social/Instagram vector (in Cover) | raw `#6b7069` | `icon/secondary` |
| Cover product shot `7275:11964` | text at 8.68/9.92/12.4/19.84/24.8px, shadow blurs 1.24/0.62, radii 4.96/1.86/619 | **Not a violation**: it is a 0.62× scaled render of real components (14→8.68, 16→9.92, 20→12.4, 32→19.84, 40→24.8; r8→4.96; Elevation/1 blurs). Scaling detaches styles. Ignore for code; do not report as "<14px text". |

What is clean:
- Zero unbound solid fills or strokes in the doc panels.
- Zero non-Grove (Clario, Pipkin, Merit, Ashgrove, Noema, Praxa, Pogo, Halden, Ardenfield) variable or style references on this page.
- All text on Grove styles (outside the scaled render).
- Radius samples and Doc/* frames bound to `radius/*`.

---

## 10. Documented ↔ tokenized reconciliation

### 10.1 Documented (or implied) but NOT tokenized
| Concept | Where stated | Gap |
|---|---|---|
| Breakpoint thresholds | Grid panel (1440/1024/390) | No min-width values. Propose `--nz-bp-md: 768px`, `--nz-bp-lg: 1280px` (mobile <768, tablet 768–1279, desktop ≥1280). **Needs designer sign-off.** |
| Hover transition 160ms | Prototype reactions | Not a duration token |
| Focus halo width 4px, focus stroke 2px | Borders panel | Only in the effect style (`Focus/Ring` spread 4) and `border-width/focus`; no `focus-ring/offset`, no focus color token separate from `border/focus` |
| Elevation shadows | Elevation panel | Effect styles only, hard-coded colors, no dark variants, no CSS var tokens |
| Overlay backdrop / scrim | Motion principle "the backdrop only fades" | No `overlay/scrim` color, opacity or blur token |
| Glass | `Surface/Glass` (blur 24), `Surface/Liquid Glass` (GLASS 12), `Surface/Inner Highlight` | Not documented on this page and not tokenized as blur/opacity |
| Icon stroke 1.6, icon grid 20 | Icon descriptions | No `icon/stroke` token |
| Logo clear space = mark/2, logo sizes | Logo description | Not tokenized; no size variants |
| Typography composites (family, weight, lh, ls) | Typography panel | Styles only, no variables; tabular-nums only in descriptions |
| Spring easings | Easing panel | `spring()` string is not CSS; needs `linear()` or JS |
| Disabled treatment | — | No `opacity/disabled`; `bg/disabled`/`text/disabled` exist |
| z-index / layering | Elevation usage (menus, tooltips, modals, drawers) | No z-index scale. Propose `base 0, raised 1, sticky 100, dropdown 1000, overlay 1100, modal 1200, popover 1300, toast 1400, tooltip 1500`, or rely on the top layer (`<dialog>`, `popover` attribute) |
| Image radius and aspect ratios | Asset library (r0 renders, r16 photos) | No tokens or guidance |
| Doc padding 56 | All Doc frames | Off-scale value |

### 10.2 Tokenized but NOT documented on this page
- **Space:** `space/0`, `space/0-5` (2), `space/1-5` (6)
- **Radius:** `radius/none`
- **Border width:** `border-width/default 1`, `/strong 1.5` (contradicts "borders are 1px"), `/focus 2`
- **Size:** `size/control-sm|md|lg` (32/40/48), `size/icon-sm|md|lg` (16/20/24), `size/touch-min 44`
- **Color:** 34 semantic tokens (section 3.3) + 6 `viz/*` primitives
- **Motion:** `distance/reveal`, `distance/float`, `scale/hover`, `stagger/item`, `magnetic/pull` (lift, tilt and press are covered indirectly by principle text); the Reduced easings (all linear)
- **Responsive:** `layout/sidebar`, `layout/content-max`, `section/gap`, `type/display`, `type/h1`, `type/kpi`
- **Effects:** `Surface/Glass`, `Surface/Liquid Glass`, `Surface/Inner Highlight`, `Focus/Ring Critical`

---

## 11. Visual language (from screenshots)

- **Calm, editorial, light-first.** Warm off-white canvas (neutral/50 #f6f7f4) and white surfaces with very generous whitespace (56px panel padding, 40px rhythm). Large radii: 28 on panels, 20 on cards, 12 on controls. Shapes are soft and rounded, never sharp.
- **Color:** monochrome warm neutrals plus one deep forest green (green/700) for brand and data, with lime (`bg/accent`) as a sparing highlight. Status colors are muted, terracotta-like red and ochre amber, and appear only "when needed". Charts are single-hue green with lime and teal categorical accents.
- **Depth:** whisper-light layered shadows (2–3% alpha tight shadow + 5–14% wide negative-spread shadow). "Depth is earned." Glass and liquid-glass styles exist for overlays and the Lab page but are not shown here.
- **Type:** Geist with tight negative tracking on display and headings, Geist Mono for IDs, SKUs and hex values; numbers are big and tabular for KPIs.
- **Motion:** spring-forward personality (lift + tilt + magnetic), fast exits, data that draws and counts up, and a strict reduced-motion mode.
- **Imagery:** soft clay 3D objects in sage and cream, a green glass orb, warm beige product photography, and natural portrait photography.
- **Density:** comfortable (40px default control, 14px minimum text), which suits a merchant dashboard more than a dense data grid.

---

## 12. Architecture plan for foundations (pluggable / swappable)

### 12.1 Packages
- `@nizivo/tokens`
  - Source of truth in **DTCG JSON**, exported from Figma variables and styles with a custom exporter. Three tiers: `primitive` → `semantic` → `component`.
  - Built with Style Dictionary or Terrazzo into:
    - `tokens.css`: custom properties with a **configurable prefix** (default `--nz-`; `--grove-` remains possible as a theme alias).
    - `tokens.ts`: typed object + CSS-var references.
    - A Tailwind v4 `@theme` preset (optional).
    - A JSON manifest.
  - Components consume only semantic or component tokens, never primitives.
- `@nizivo/themes`
  - Theme = an override map of the semantic layer. The Grove demo theme and the Nizivo default theme both ship here.
  - Mode mapping:
    - `Grove Color` Light/Dark → `:root` / `[data-theme="dark"]`, with `prefers-color-scheme` as the default.
    - **Nested scopes** (`<div data-theme="dark">`) must work, as the Cover and Dark panels do.
    - `Grove Motion` Default/Reduced → `@media (prefers-reduced-motion: reduce)` plus `[data-motion="reduced"]` force-override.
    - `Grove Responsive` → media queries on the agreed breakpoints, emitting per-breakpoint custom-property overrides for grid, layout, section and type.
- `@nizivo/ui` (core)
  - Ships the foundation primitives below plus all components.
  - **Must stay theme-agnostic** (no hard-coded "Grove", no image assets).
- `@nizivo/motion` (opt-in): spring presets (`linear()` strings generated at build time + JS spring configs), `useReducedMotion`, `<CountUp>`, `<Reveal>`/stagger, `<Tilt>`, `<Magnetic>`, chart-draw helpers.
- `@nizivo/icons` (thin): an icon **adapter interface** with a default Lucide adapter (`lucide-react`, tree-shaken per import). Other sets (Phosphor, Tabler, custom SVG) can be plugged in. Brand and social icons come from a separate source.
- Docs-only assets (renders, photos, portraits) belong in the docs site or `@nizivo/assets-demo`, not in npm core, until the license is verified.

### 12.2 Effects to CSS
- **Shadows:** `--nz-elevation-0..4` as composite `box-shadow` values, with dark-mode overrides (higher alpha + `bg/surface-raised` steps).
- **Focus:** `--nz-focus-ring: 0 0 0 2px var(--nz-border-focus), 0 0 0 6px color-mix(in oklab, var(--nz-border-focus) 28%, transparent)`, or `outline: 2px solid` + `outline-offset` + a halo shadow. Apply only on `:focus-visible`. Ship a critical variant for `[aria-invalid="true"]`.
- **Glass:** `backdrop-filter: blur(24px)` with an `@supports` fallback to an opaque `bg/surface-raised`. Liquid Glass (a Figma GLASS effect) has no CSS equivalent; implement it in `@nizivo/lab` with an SVG displacement filter.
- **Typography:** emitted both as utility classes (`.nz-text-heading-h1`) and as composite tokens (`--nz-font-heading-h1: 600 32px/1.2 var(--nz-font-sans)`, `--nz-tracking-heading-h1: -0.02em`).

### 12.3 RSC strategy
All foundations are CSS-driven and server-safe:
- `Text`, `Icon`, `Logo`, `Surface`, `Container/Grid/Stack`, and the theme CSS are server components.
- Only the theme toggle (`useTheme`, setting `data-theme` and persisting it) and the JS-motion pieces are client islands.
- Icons are passed as **component props** (`icon={SearchIcon}`) rather than resolved through React context. This keeps them RSC-compatible and tree-shakeable; an optional string-keyed registry is available for CMS-driven UIs.

---

## 13. Proposed foundation primitives (code)

| Name | API sketch | RSC | Tier | Package |
|---|---|---|---|---|
| Design tokens + theme CSS | `import '@nizivo/tokens/css'`; `createTheme({ prefix:'nz', semantic:{…} })`; `<html data-theme="light|dark" data-motion="reduce">` | server | foundation | @nizivo/tokens, @nizivo/themes |
| ThemeProvider / theme scope | `<ThemeScope theme="dark">` renders `<div data-theme>`; `useTheme()` client hook for the toggle | split | foundation | @nizivo/ui |
| Text | `<Text variant="display-l|…|mono-m-strong" as="h1|p|span" tone="primary|secondary|tertiary|brand|critical…" numeric? truncate? lines?>`; Numeric variants force tabular-nums | server | primitive | @nizivo/ui |
| Icon | `<Icon icon={Search} size="sm|md|lg" tone="primary|secondary|brand|inverse|success|warning|critical|current" label?>`; `aria-hidden` unless `label` is set; stroke 1.6 absolute | server | primitive | @nizivo/ui + @nizivo/icons |
| Logo | `<Logo size={32} variant="lockup|mark|wordmark" />` reads brand config (mark SVG, wordmark text/SVG); clear space = mark/2 | server | primitive | @nizivo/ui |
| Focus ring | CSS utility `.nz-focus-ring` / `focusRing()` recipe, `:focus-visible`, critical variant via `[aria-invalid]` | server | foundation | @nizivo/ui |
| Surface (Elevation) | `<Surface elevation={0-4} radius="md|lg|xl|2xl" padding tone="surface|subtle|muted|inverse|brand-subtle" bordered interactive as>`; `interactive` gives CSS hover lift (`distance/lift`, Elevation/2) | server | primitive | @nizivo/ui |
| Container / Grid / Stack | `<Container size="content|full">`, `<Grid columns={{base:4,md:8,lg:12}} gap="gutter">`, `<GridItem span={{base:4,lg:6}}>`, `<Stack gap="4" direction>` | server | primitive | @nizivo/ui |
| Motion system | `springs.standard|soft` (`linear()` + JS config), `transition(token)`, `useReducedMotion()`, `<CountUp value duration="count-up">`, `<Tilt max={6}>`, `<Magnetic pull={6}>`, `<Reveal stagger>` | client | foundation | @nizivo/motion |
| Media | `<Image ratio="1:1|4:3|16:9" radius="lg" fit>` + `<AspectRatio>`; Avatar handled elsewhere | server | primitive | @nizivo/ui |

---

## 14. Extraction notes / gaps

- The first full-section dump exceeded the 20 KB `use_figma` return limit. The Cover product shot (109 texts, 76 instances from other pages) was therefore audited in aggregate (bindings, styles, reactions), not node by node. Its components belong to pages 02–07 and are analysed there.
- Unparented masters (icons, logo) were identified from `parent: null` via the Plugin API. The exact Figma UI state ("main component deleted") was not visually confirmed.
- The cover meta says **62 components**; the snapshot lists **47 component sets**. The remainder are presumably standalone components (Cover instances reference `Store Switcher`, `Top Bar`, `Revenue Card`, `Ranked List`, `Order Table Header`, `Social/Instagram`, `Brand/Logo` and the icons, which are not in the set list). Other agents should reconcile this.
- Icon visual geometry was not compared path-by-path with current Lucide releases; names and descriptions match Lucide.
- The light/dark resolved colors in the doc panels were read from rendered paint values, not by walking alias chains (they match the snapshot).
