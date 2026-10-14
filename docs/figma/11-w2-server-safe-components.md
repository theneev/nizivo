# Week 2 server-safe (T0) components: Figma facts for builders

- File: `BIzJFf1wm8KP0YG2AVI1tP` ("Grove UI Library" when read, now "Nizivo UI Library"; ships as **Nizivo UI**). Open a node with `https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Nizivo-UI-Library?node-id=<id with : replaced by ->`.
- Renamed on 2026-10-14, after this read: the variable collections and the text and effect styles went from Grove to Nizivo (`Nizivo Color`, `Nizivo/Label/M`), and every WEB code syntax now reads `var(--nz-…)` ([codesyntax-rewrite.plan.md](../../packages/tokens/figma/codesyntax-rewrite.plan.md)). The maintainer has since renamed the file title, and so the URL slug, to "Nizivo UI Library" (reported 2026-10-15; the file key is unchanged, so old links still open it). This note uses the current names.
- Scope: the 19 week 2 T0 entries: Text, Heading, Stack, Inline, Grid + GridItem, Container, Separator, Kbd, Image, Badge, Card, Delta, ProgressBar, ProgressRing, Meter, Skeleton, EmptyState, InlineError, Alert (T0 shell + dismiss leaf).
- Read 2026-10-14. **2 Figma calls in total, both read-only `use_figma` scripts that only returned data** (no setters, no create, no remove, no renames; no `get_design_context`, no screenshots). Nothing in the file changed.
  - Call 1 diffed the off-canvas ghost masters against the on-canvas sets (§2).
  - Call 2 read the exact anatomy of every set below, the Kbd frame, the Input `State=Error` variant and the divider nodes inside Dropdown Menu, Order Summary, Drawer and Modal.
- Everything else comes from the existing notes (`00`–`10` in this folder), [component-inventory.md](../component-inventory.md) and [ARCHITECTURE.md](../ARCHITECTURE.md). Each fact says where it came from: "read" means one of the two calls above; `figma/NN §x` means an existing note.

## 0. How to read this

- **Token names** are the Nizivo CSS names from `packages/tokens/figma/DRY-RUN.md` ("Emitted CSS names"), with the Figma variable in brackets: `--nz-bg-muted` [bg/muted]. Colours have no `--nz-color-*` prefix. Space and radius are rem (`--nz-space-1-5` = 0.375rem); border widths stay px.
- **Text styles** are `--nz-font-<style>` shorthands: `--nz-font-label-m` [Label/M], `--nz-font-label-m-strong` [Label/M Strong], `--nz-font-body-m` [Body/M], `--nz-font-heading-h3` [Heading/H3], `--nz-font-numeric-m` [Numeric/M], `--nz-font-mono-m` [Mono/M]. Tracking is `--nz-tracking-<style>` (em) since week 2; week 1 emitted `--nz-font-<style>-letter-spacing` (rem) (ARCHITECTURE §7.2).
- **`{x}`** means bound to variable `x` in Figma. **`!`** means hard-coded (not bound to any variable or style). After a bound token, `!` marks a semantic misuse instead, such as a text token used as a fill or a brand icon colour on an info alert (figma/02 §6 calls these "semantic misuse"). Where an existing note names the nearest token, it is quoted. Where no note gives a snap, the entry says "builder decides" (list the choice on the docs "Deviations from Figma" page).
- **"proposal"** marks a code-owned token that Figma does not have (ARCHITECTURE §7.6, §15.3). It is never a Figma binding.
- **"no Figma spec"** means the file has nothing for that part: implement the inventory API with plan tokens.
- Colour values are Figma's. ARCHITECTURE §15.3 re-points some tokens for contrast (for example `text/secondary`, `text/tertiary`, `icon/warning`, dark `text/critical` and `text/info`, dark `bg/subtle`). Components use token names and never primitives, so those overrides apply without component changes.
- Every icon is a Lucide glyph (`Icon/<name>`, masters `738:*`, all ghost-only). In code they are `ReactNode` slots filled from `@nizivo/icons` (inventory §3.1); stroke 1.92 on the 24 viewBox.

---

## 1. Coverage

"Depth before" is what the existing notes held before this pass. "Ghost" is the off-canvas master the file's instances actually use. "Subpath" is what week 2 shipped: one subpath per component. ARCHITECTURE §5.2 groups Text and Heading under `./text`, the layout components under `./layout` and the progress components under `./progress`; that difference is recorded as a plan deviation to settle before 0.1.0.

| Component | Subpath | Figma source (node) | Ghost | Existing notes | Depth before | This read | Builder works from |
|---|---|---|---|---|---|---|---|
| Text | `./text` | 18 `Nizivo/*` text styles; specimen frame `7275:12385`; no set | — | figma/00 "Text styles"; figma/01 §4 | styles (complete) | — | text styles + `text/*` tokens |
| Heading | `./heading` | Display/L–M, Heading/H1–H4 styles; no set | — | figma/00; figma/01 §4; figma/06 §6.8; figma/08 §3, §6.1 | styles (complete) | — | text styles + usage evidence |
| Stack | `./stack` | none (auto-layout gaps only) | — | figma/08 §11 (gap values) | none | — | **no Figma spec**: plan tokens |
| Inline | `./inline` | none | — | figma/08 §11 | none | — | **no Figma spec**: plan tokens |
| Grid + GridItem | `./grid` | Doc/Grid `7275:12608`, Breakpoints `7275:12612`; `Nizivo Responsive` variables | — | figma/01 §7.3; figma/08 §4.1, §6.1 | variables + diagrams | — | `--nz-grid-*` variables |
| Container | `./container` | `layout/content-max`, `grid/margin` variables; no frame | — | figma/08 §6.1 | variables only | — | variables |
| Separator | `./separator` | no set; Divider rects `746:249`, `754:926`, `754:939`; Drawer edge strokes `756:1002`, `756:1099` | — | figma/02 §5.9; figma/05 §3.10 | incidental | **read** | read |
| Kbd | `./kbd` | detached frame `7275:14768` (and 7 copies); no set | — | figma/06 §6.3, §6.11, §9.2 | frame anatomy | **re-read** | frame anatomy |
| Image | `./image` | Asset library `7275:12726`; media inside Product Card, Empty State | — | figma/01 §6; figma/05 §3.1 | frames only | Empty State render | inventory API + ARCHITECTURE §14.3 |
| Badge | `./badge` | set `7275:11374` (6 variants) | `744:315`, **diffed identical** | figma/02 §5.3 | full anatomy | **read** | set |
| Card | `./card` | set `7275:13757` (3) | none (set never instanced) | figma/04 §4.2; ARCHITECTURE §10.5 | full anatomy | **read** | set + §10.5 sketch |
| Delta | `./delta` | set `7275:13743` (3) | `752:269`, **diffed identical** | figma/04 §4.1 | full anatomy | **read** | set |
| ProgressBar | `./progress-bar` | set `7275:13526` (3) | `751:367`, **diffed identical** | figma/03 §4.7 | full anatomy | **read** | set |
| ProgressRing | `./progress-ring` | set `7275:13545` (4) | `751:388`, **diffed identical** | figma/03 §4.8 | full anatomy | **read** | set |
| Meter | `./meter` | no set; Progress Bar used as a gauge; Discount usage track `7275:14131`; Ranked List track (ghost `752:444`) | — | figma/03 §4.7; figma/05 §3.5; figma/04 §4.6 | borrowed anatomy | — | ProgressBar anatomy + composition tracks |
| Skeleton | `./skeleton` | set `7275:15181` (3); pulse specimen `7275:19743` | `756:1169`, **identified and diffed identical** | figma/07 §4.7; figma/09 §4.4 | full anatomy | **read** | set + plan motion tokens |
| EmptyState | `./empty-state` | set `7275:15168` (2) | `756:1149`, **diffed identical** | figma/07 §4.6 | full anatomy | **read** | set |
| InlineError | `./inline-error` | no set; Input `State=Error` `7275:11422` recolours help text only | — | figma/02 §5.4 | none | **read** (Error variant) | **no Figma spec**: plan (ARCHITECTURE §15.1, §16.5) |
| Alert | `./alert` | set `7275:15091` (4) | `756:868`, **diffed identical** | figma/07 §1.1, §3, §4.2 | full anatomy | **read** | set |

---

## 2. Ghost masters diffed against the on-canvas sets (read)

Compared for each pair: property definitions (keys, types, defaults, options), variant names, and every descendant's type, name, size, auto-layout padding, gap and alignment, radius, fill and stroke (bound variable name or raw hex), effect style, text style, text auto-resize and alignment, ellipse arc data and opacity.

| Component | On-canvas set → variants | Ghost set → variants | Result |
|---|---|---|---|
| Badge | `7275:11374` → Neutral `11375`, Success `11378`, Warning `11381`, Critical `11384`, Info `11387`, Brand `11390` | `744:315` → `744:293`, `744:296`, `744:299`, `744:302`, `744:305`, `744:308` | identical |
| Delta | `7275:13743` → Up `13744`, Down `13747`, Flat `13750` | `752:269` → `752:255`, `752:260`, `752:265` | identical |
| Progress Bar | `7275:13526` → Brand `13527`, Warning `13533`, Critical `13539` | `751:367` → `751:349`, `751:355`, `751:361` | identical |
| Progress Ring | `7275:13545` → 25 `13546`, 50 `13551`, 75 `13556`, 100 `13561` | `751:388` → `751:368`, `751:373`, `751:378`, `751:383` | identical except one label width (30 vs 31 px, text rendering) |
| Alert | `7275:15091` → Info `15092`, Success `15098`, Warning `15104`, Critical `15110` | `756:868` → `756:825`, `756:836`, `756:846`, `756:857` | identical except two text widths in Critical (±1 px, text rendering) |
| Empty State | `7275:15168` → Orders `15169`, Search `15173` | `756:1149` → `756:1124`, `756:1134` | identical |
| Skeleton | `7275:15181` → Line `15182`, KPI `15186`, Row `15190` | **`756:1169`** (a COMPONENT_SET) → Line `756:1154`, KPI `756:1158`, Row `756:1162` | identical |

So the facts below hold for both the on-canvas sets and the masters the instances use. The lab specimen `7275:19743` is an instance of `756:1158` (Skeleton `Shape=KPI`); `756:1169` is its set, not the variant. The Badge ghost carries the description "Order, payment and fulfilment status. Tone maps 1:1 to semantic tokens."; the other six ghosts have empty descriptions.

---

## 3. Rules that apply to several components

- **Spacing in Figma is mostly unbound.** Apart from colours, text styles and effect styles, the only bindings in these sets are radii (Badge, Card, Alert, Skeleton KPI, Empty State) and Card's padding. Raw values that sit on the scale map directly: 2 → `--nz-space-0-5`, 4 → `--nz-space-1`, 6 → `--nz-space-1-5`, 8 → `--nz-space-2`, 12 → `--nz-space-3`, 16 → `--nz-space-4`, 20 → `--nz-space-5`, 24 → `--nz-space-6`, 32 → `--nz-space-8`. Off-scale values (3, 10, 14, radius 6) are flagged per component.
- **Stroke weights are never bound.** 1 px → `--nz-border-width-default`; 1.5 → `--nz-border-width-strong`; 2 → `--nz-border-width-focus`.
- **`radius 999`** → `--nz-radius-full` (emits 62.4375rem; DRY-RUN problem 5).
- **Icon sizes:** 16 → `--nz-size-icon-sm`, 20 → `--nz-size-icon-md`, 24 → `--nz-size-icon-lg`.
- **Numbers:** the `Numeric/*` styles say "Tabular figures (font-variant-numeric: tabular-nums)" in their description, but Figma renders proportional figures (`openTypeFeatures` empty; figma/01 §4). Code sets `tabular-nums` on every Numeric style and on Delta digits (`.nz-tabular-nums`, ARCHITECTURE §8.1).
- **Text never wraps in these sets.** Every label is auto-width (`WIDTH_AND_HEIGHT`). Alert's text frame clips long copy (figma/07 §4.2); code wraps.
- **No focus, hover or disabled states** are drawn for any of these components. The only interactive parts are Card's action and Alert's close, both bare icons in Figma. In code `Card.Action` is a slot and Alert's dismiss is an `IconButton` (ARCHITECTURE §15.3 "Component remapping").
- **Small text:** 12 px exists only as the proposals `--nz-font-body-s` and `--nz-font-label-s` (ARCHITECTURE §7.6). Every set here draws 14 px or larger.

---

## 4. Per component

### 4.1 Text

**Figma:** no component. 18 text styles, specimens in Doc/Typography `7275:12385` (figma/01 §4). Family Geist / Geist Mono; weights 400, 500, 600 only.

| `variant` | Token | Figma style | Weight · size / line height · tracking |
|---|---|---|---|
| `display-l` | `--nz-font-display-l` | Display/L | 600 · 56 (3.5rem) / 1.04 · -3% |
| `display-m` | `--nz-font-display-m` | Display/M | 600 · 44 / 1.08 · -2.5% |
| `heading-h1` | `--nz-font-heading-h1` | Heading/H1 | 600 · 32 / 1.2 · -2% |
| `heading-h2` | `--nz-font-heading-h2` | Heading/H2 | 600 · 24 / 1.3 · -1.5% |
| `heading-h3` | `--nz-font-heading-h3` | Heading/H3 | 600 · 20 / 1.4 · -1% |
| `heading-h4` | `--nz-font-heading-h4` | Heading/H4 | 600 · 16 / 1.5 · -0.5% |
| `body-l` | `--nz-font-body-l` | Body/L | 400 · 16 / 1.6 · 0 |
| `body-m` | `--nz-font-body-m` | Body/M | 400 · 14 / 1.5 · 0 |
| `body-m-strong` | `--nz-font-body-m-strong` | Body/M Strong | 500 · 14 / 1.5 · 0 |
| `label-l` | `--nz-font-label-l` | Label/L | 500 · 16 / 1.4 · -0.2% |
| `label-m` | `--nz-font-label-m` | Label/M | 500 · 14 / 1.4 · 0 |
| `label-m-strong` | `--nz-font-label-m-strong` | Label/M Strong | 600 · 14 / 1.4 · 0 |
| `numeric-display` | `--nz-font-numeric-display` | Numeric/Display | 600 · 40 / 1.0 · -3% · tabular |
| `numeric-kpi` | `--nz-font-numeric-kpi` | Numeric/KPI | 600 · 32 / 1.0 · -2.5% · tabular |
| `numeric-l` | `--nz-font-numeric-l` | Numeric/L | 600 · 24 / 1.1 · -1.5% · tabular |
| `numeric-m` | `--nz-font-numeric-m` | Numeric/M | 500 · 16 / 1.2 · -0.5% · tabular |
| `mono-m` | `--nz-font-mono-m` | Mono/M (Geist Mono) | 400 · 14 / 1.4 · 0 |
| `mono-m-strong` | `--nz-font-mono-m-strong` | Mono/M Strong (Geist Mono) | 500 · 14 / 1.4 · 0 |
| `body-s`, `label-s` | `--nz-font-body-s`, `--nz-font-label-s` | **proposal** (no Figma style) | 400 / 500 · 12 / 1.5 / 1.4 · 0 |

- **`tone`** → `text/*` (Nizivo Color, light/dark): `--nz-text-primary`, `-secondary`, `-tertiary`, `-disabled`, `-inverse`, `-on-brand`, `-on-accent`, `-brand`, `-success`, `-warning`, `-critical`, `-info`. Proposals: `--nz-text-accent`, `--nz-text-on-critical`.
- **Responsive sizes:** `--nz-type-display` [type/display 56/44/36], `--nz-type-h1` [type/h1 32/28/24] and `--nz-type-kpi` [type/kpi 32/28/28] exist but no text style is bound to them (figma/01 §4, figma/08 §6.1). Page 08 swaps the page title from H1 (desktop, tablet) to H2 (mobile) instead of resizing. Whether Text reads the `--nz-type-*` sizes is open (inventory "Missing design states").
- **Default:** Figma defines none. Body copy across the file is Body/M (14 px); doc leads use Body/M + `text/secondary`.
- Hard-coded: nothing. Text is 100 % on styles outside the scaled cover render (figma/01 §9).

### 4.2 Heading

**Figma:** the six display and heading styles above; no component. Inventory: constrained `level` (1–6) plus `variant`; visual style is independent of level.

Usage in the file (evidence for defaults; all `text/primary`):

| Where | Style | Source |
|---|---|---|
| Page title (Overview greeting; mobile "Orders" title) | Heading/H1 32 desktop/tablet, Heading/H2 24 mobile (a level swap, not a resize) | figma/08 §3, §4.4 |
| Top Bar page title (`<h1>` in code) | Heading/H3 | figma/06 §6.8 |
| Card title, Ranked List, card titles on page 08 | Heading/H4 | read (Card); figma/04 §4.6; figma/08 §4.11 |
| Empty State title, Modal and Drawer titles | Heading/H3 | read (Empty State); figma/07 §2 |

Rule: weight 600 with negative tracking on every heading style. Card's §10.5 sketch fixes `.nz-card-title` at `--nz-font-heading-h4` for every `level`.

### 4.3 Stack and 4.4 Inline

**No Figma spec.** Figma expresses layout as auto-layout on frames. On page 08, 0 % of gaps and paddings are bound (figma/08 §11).

- Gap values seen across the file: 2, 4, 6, 8, 12, 16, 20, 24, 32, 40 (all on the scale), plus off-scale 3, 10 and 14. The sets in this doc use 2, 4, 6, 8, 12, 16 and 20.
- `gap` takes token keys only (inventory §3.8): `0`, `0-5`, `1`, `1-5`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`, `20`, `24` → `--nz-space-*`.
- Alignment modes Figma uses: primary axis start, centre or space-between; counter axis start or centre. No baseline alignment and no wrapping auto-layout appear in the read sets.
- Vertical rhythm between page sections uses `grid/gutter` values (24/20/16), not `section/gap`, which no frame uses (figma/08 §6.1). `--nz-section-gap` [section/gap 32/24/20] exists.

### 4.5 Grid and GridItem

**Figma:** Doc/Grid `7275:12608`, Breakpoints `7275:12612`. Diagrams are rectangles, not layout grids, and are not bound to variables (figma/01 §7.3). Designer text: "12 columns on desktop, 8 on tablet, 4 on mobile. Cards snap to spans, never to pixels."

| Mode (frame width) | `--nz-grid-columns` | `--nz-grid-gutter` | `--nz-grid-margin` |
|---|---|---|---|
| Mobile (390) | 4 | 16 (1rem) | 16 |
| Tablet (1024) | 8 | 20 | 24 |
| Desktop (1440) | 12 | 24 | 32 |

- Mobile is the base; tablet values apply at `@media (--nz-sm)` (40rem, settled) and desktop at `(--nz-lg)` (80rem, provisional) (ARCHITECTURE §7.6). Frame widths are not breakpoints; `layout/viewport` is not emitted.
- Composition evidence (figma/08 §4.1, §6.1): desktop content 1128 px gives 72 px columns; 8 + 4 splits (744 / 360) snap to spans. KPI rows use gap 16, not the gutter, so they do not snap to 3-column spans. Tablet KPIs are 2 × 2; mobile is one column.
- `GridItem` `span`: no Figma property (inventory: `span`; figma/08 sketches `span={{ base: 4, sm: 8, lg: 8 }}` and `span="full"`).

### 4.6 Container

**No Figma frame.** Two variables carry it:

- `--nz-layout-content-max` [layout/content-max 358 / 976 / 1280] → `max-inline-size`.
- `--nz-grid-margin` [grid/margin 16 / 24 / 32] → `padding-inline` (page 08 content padding equals these values but is unbound; figma/08 §6.1).
- Open (inventory "content-max formula"): page 08 content never sets a max width; desktop content is 1128 (1440 − 248 sidebar − 64); tablet draws 900, not 976, because 976 ignores the 76 px rail.

### 4.7 Separator

**Figma:** no component. Dividers are drawn inside other components (read):

| Node | Where | Shape | Colour | Thickness |
|---|---|---|---|---|
| `746:249` | Dropdown Menu (ghost `746:204`), between item groups | RECTANGLE "Divider" 248 × 1, fixed | `{border/subtle}` fill | 1 ! |
| `754:926`, `754:939` | Order Summary (ghost `754:897`), between line items and totals | RECTANGLE "Divider" 330 × 1 | `{border/subtle}` fill | 1 ! |
| `756:1002` | Drawer header | bottom edge stroke only, inside | `{border/subtle}` | 1 ! |
| `756:1099` | Drawer footer | top edge stroke only, inside | `{border/subtle}` | 1 ! |

- Every divider found is horizontal, full width of its content box, 1 px, `--nz-border-subtle` [border/subtle]. The Modal set `7275:15139` has none (its footer is a `bg/subtle` band; figma/07 §4.4). No vertical divider was found. figma/01 §2 labels `border/subtle` "Dividers inside cards".
- Code: `<hr>` (inventory) with `border-block-start: var(--nz-border-width-default) solid var(--nz-border-subtle)`. Vertical orientation: no Figma spec.
- Spacing around a divider belongs to its container (the menu uses its own gap 2).
- Contrast: decorative. Light 1.15:1; dark `border/subtle` n850 vanishes on n850 overlays until the §15.3 override moves it to n800 (1.17:1).

### 4.8 Kbd

**Figma:** not a component. The same hand-built frame appears 8 times: `7275:14768`, `7275:14773` (Search Field), `755:895`, `755:927`, `755:936`, `755:940`, `755:944` (Command Menu), `I755:1033;755:879` (Top Bar) (figma/06 §6.11).

Anatomy (read, `7275:14768`):

| Part | Value | Token |
|---|---|---|
| Frame | horizontal auto-layout, hug × hug, 34 × 24, gap 0, clips | — |
| Padding | 1 ! / 6 ! / 1 ! / 6 ! | inline 6 = `--nz-space-1-5`; block 1 is off-scale, builder decides (the 24 px height comes from 20 px text + 1 + 1 + 1 px strokes inside) |
| Radius | 6 ! | off-scale; figma/06 §9.2 suggests `--nz-kbd-radius: var(--nz-radius-xs)` (4) |
| Fill | `{bg/subtle}` | `--nz-bg-subtle` |
| Stroke | `{border/default}` 1 ! inside | `--nz-border-default`, `--nz-border-width-default` |
| Text | "⌘K", Mono/M, `{text/secondary}` | `--nz-font-mono-m`, `--nz-text-secondary` |

- One frame holds a whole chord ("⌘⇧D", "↑↓", "esc"); Figma never draws one box per key.
- Contrast: text 6.26:1 (pass); border against fill 1.23:1 (decorative).
- "⌘K" is Mac-only text. Plan: `data-platform` per glyph and `data-nz-platform` from ThemeScript (inventory §4.1).

### 4.9 Image

**No Figma spec for the component.** Evidence for radius and fit:

| Where | Size | Radius | Fit |
|---|---|---|---|
| Asset library 3D renders `7275:12727`–`12732` | 180 × 180 | 0 | FILL (cover); FIT (contain) where placed on the Cover |
| Asset library product photos `12733`–`12740`, portraits `12741`–`12744` | 180 × 180 | 16 ! (= `radius/lg`) | FILL |
| Empty State render (read, `7275:15169`) | 140 × 140 | 0 | FIT (contain) |
| Product Card media (figma/05 §3.1) | 238 × 220 | 14 ! (off-scale) | FILL |
| Row and summary thumbnails (figma/05) | 40, 48 | 8 !, 10 ! | FILL |

- No ratio, radius or placeholder tokens exist. Inventory API: `src`, `alt`, `width`, `height` (all required), `ratio` (`1/1`, `4/5`, `3/2`, `16/9` → `data-ratio`), `priority`, `render`. No inline `style` (ARCHITECTURE §14.3).
- **No Figma raster ships** (renders, photos and portraits have unknown licences; ARCHITECTURE §14.3, inventory Q28).

### 4.10 Badge

**Figma:** set `7275:11374`, ghost `744:315` (identical, §2). Read.

Props → code (inventory): `Tone` (VARIANT, default Neutral) → `tone`; `Dot#744:91` (BOOLEAN, default true) → `dot`; `Label#744:84` (TEXT, default "Paid") → children.

Anatomy (every tone):

| Part | Value | Token |
|---|---|---|
| Root | horizontal auto-layout, hug × hug, 61 × 26, centred | — |
| Padding | 3 ! / 10 ! / 3 ! / 10 ! | off-scale, no snap in figma/02; builder decides (26 px height = 20 px label line + 3 + 3) |
| Gap | 6 ! | `--nz-space-1-5` |
| Radius | `{radius/full}` | `--nz-radius-full` |
| Dot | ELLIPSE 6 × 6 | no size token |
| Label | Label/M, auto width (no wrap) | `--nz-font-label-m` |

| Tone | Fill | Dot | Label |
|---|---|---|---|
| Neutral | `--nz-bg-muted` [bg/muted] | `--nz-icon-secondary` | `--nz-text-secondary` |
| Success | `--nz-bg-success-subtle` | `--nz-icon-success` | `--nz-text-success` |
| Warning | `--nz-bg-warning-subtle` | `--nz-icon-warning` | `--nz-text-warning` |
| Critical | `--nz-bg-critical-subtle` | `--nz-icon-critical` | `--nz-text-critical` |
| Info | `--nz-bg-info-subtle` | `{text/info}` ! (no `icon/info` in Figma; plan uses `--nz-icon-info`, proposal) | `--nz-text-info` |
| Brand | `--nz-bg-brand` (solid) | `--nz-text-on-brand` | `--nz-text-on-brand` |

- The dot is `aria-hidden`: the warning dot is 2.27:1 on its tint and decorative.
- Dark Info 3.29:1 and Critical 3.63:1 fail in Figma; the §15.3 overrides (dark `text/info` → blue/400, `text/critical` → red/400) fix them.
- Missing design states: sizes, an icon slot, whether solid is an emphasis axis (Brand is the only solid tone), count form.

### 4.11 Card

**Figma:** set `7275:13757`, no ghost; the set is never instanced (about 20 page 08 panels are raw frames). Read `7275:13758`, `13764`, `13770`.

Props → code (inventory, ARCHITECTURE §10.5): `Style` Surface | Subtle | Inverse (default Surface) → `tone`; `Title#752:4` (TEXT "Card title") → `Card.Title` (`level` 2–6, default 3); `Show action#752:8` (BOOLEAN true) → presence of `Card.Action`; Slot → `Card.Body`. New: `padding`, `elevation`, `render`; parts Root, Header, Title, Description, Action, Body, Footer.

Root (all tones):

| Part | Value | Token |
|---|---|---|
| Root | vertical auto-layout, fill width × hug, 360 wide | — |
| Padding | `{space/6}` on all sides | `--nz-space-6` (24) |
| Gap | 20 ! | `--nz-space-5` |
| Radius | `{radius/xl}` | `--nz-radius-xl` (20) |
| Header | horizontal, fill width, space-between, centred, gap 0, clips | figma/04 suggests header gap `--nz-space-3` in code |
| Title | Heading/H4, auto width | `--nz-font-heading-h4` |
| Action | INSTANCE `Icon/ellipsis` `738:166`, 20 × 20, bare icon (no button) | `--nz-size-icon-md` |
| Slot | FRAME 310 × 160 fixed, radius 12 !, dashed `{border/default}` [4,4], text "Slot" Label/M `{text/tertiary}` | design-time placeholder only: do not build |

Surface's stroke sits inside the box and counts towards layout (content width 310 = 360 − 2 × 24 − 2 × 1), the same as CSS `box-sizing: border-box`.

| Tone | Fill | Stroke | Effect | Title | Action icon (figma/04 §4.2) | Slot fill |
|---|---|---|---|---|---|---|
| Surface | `--nz-bg-surface` | `--nz-border-subtle` 1 ! inside | `Elevation/1 Card` → `--nz-elevation-1` | `--nz-text-primary` | `--nz-icon-secondary` | `bg/canvas` |
| Subtle | `--nz-bg-subtle` | **none** | none | `--nz-text-primary` | `--nz-icon-secondary` | `bg/canvas` |
| Inverse | `--nz-bg-inverse` | **none** | none | `--nz-text-inverse` | `--nz-icon-inverse` | `bg/inverse-elevated` |

- **Elevation:** Figma's Surface draws `Elevation/1`; the plan defaults `elevation` to 0 because the compositions draw no shadow (figma/08 §3), pending design question Q j.
- **Inverse:** the plan emits `data-nz-scheme="inverse"` and paints `--nz-bg-surface`, which resolves to the inverse scheme's surface (ARCHITECTURE §7.4, §10.5). Figma binds `bg/inverse` [n900 light] directly; the two agree in light mode.
- **Difference from the §10.5 sketch:** the sketch draws `--nz-border-subtle` on every tone; Figma's Subtle and Inverse have no stroke. Builder decides; list the choice on the Deviations page.
- **Padding knob** (evidence from the widgets, figma/04 §4.2): Card, Revenue Card, Ranked List and Insight Card use `space/6` (24); KPI Tile uses `space/5` (20). The §10.5 sketch maps `md` → `--nz-space-6`, `sm` → `--nz-space-5`.
- **Card.Description and Card.Footer: no Figma spec.** Elsewhere a secondary line under a title is Body/M + `text/secondary` (Alert description, read; Customer Card email, figma/05).
- Issues: Subtle against canvas is 1.04:1 (a nested Subtle card disappears without a border); there is no `border/inverse`; the Action needs a real 32 px `IconButton` with a 44 px touch target.

### 4.12 Delta

**Figma:** set `7275:13743`, ghost `752:269` (identical, §2). Read.

Props → code (inventory): `Trend` Up | Down | Flat (default Up) → derived from the sign of `value`; `Value#752:0` (TEXT "12.4%") → `value` (number) + `format` / `locale`. New: `comparison` (visually hidden phrase).

| Part | Value | Token |
|---|---|---|
| Root | horizontal auto-layout, hug × hug, 77 × 28, centred | — |
| Padding | top 4 !, end 10 !, bottom 4 !, start 8 ! (icon side 8, text side 10) | 4 → `--nz-space-1`, 8 → `--nz-space-2`; 10 is off-scale ("space has 8 and 12", figma/04 §4.1), builder decides |
| Gap | 4 ! | `--nz-space-1` |
| Radius | 999 ! (unbound; Badge binds it) | `--nz-radius-full` |
| Icon | INSTANCE 16 × 16, stroke coloured with the text token (figma/04 §4.1; `currentColor` in code) | `--nz-size-icon-sm` |
| Value | Label/M Strong | `--nz-font-label-m-strong` + `tabular-nums` (not Numeric in Figma, so digits jitter) |

| Trend | Fill | Text and icon | Icon |
|---|---|---|---|
| Up | `--nz-bg-success-subtle` | `--nz-text-success` | `Icon/trending-up` `738:386` |
| Down | `--nz-bg-critical-subtle` | `--nz-text-critical` | `Icon/trending-down` `738:382` |
| Flat | `--nz-bg-subtle` | `--nz-text-secondary` | `Icon/minus` `738:262` |

- Down shows no minus sign ("3.1%"); the visually hidden phrase must say "down" or "decreased".
- Dark Down is 3.63:1 in Figma (fixed by the dark `text/critical` override).
- The pill vanishes on a tinted KPI tile (`bg/success-subtle` = `bg/brand-subtle` = green/50, 1.00:1). The inventory lists a plain appearance as a missing design state.

### 4.13 ProgressBar

**Figma:** set `7275:13526`, ghost `751:367` (identical, §2). Read.

Props → code (inventory): `Tone` Brand | Warning | Critical (default Brand) → `tone` (`brand` / `success` / `warning` / `critical` / `neutral`). New: `value`, `max`, `label`, `showValue`, `indeterminate`. Native `<progress>`.

| Part | Value | Token |
|---|---|---|
| Root | vertical auto-layout, fill width × hug, 320 × 36, padding 0 | — |
| Gap (label row to track) | 8 ! | `--nz-space-2` |
| Top row | horizontal, fill width, space-between, clips | — |
| Label | Label/M, `{text/secondary}` ("Monthly goal") | `--nz-font-label-m`, `--nz-text-secondary` |
| Value | Numeric/M, `{text/primary}` ("68%") | `--nz-font-numeric-m`, `--nz-text-primary` |
| Track | fill width × 8 !, radius 4 !, clips, `{chart/track}` | `--nz-chart-track`; height 8 has no token; radius = half the height (a pill) |
| Fill | value % of track width × 8, radius 4 ! | per tone below |

| Tone | Figma fill | Code fill |
|---|---|---|
| Brand | `{chart/primary}` | `--nz-chart-primary` |
| Warning | `{text/warning}` ! (text token misused; renders brown) | `--nz-chart-warning` (proposal; alias of `--nz-icon-warning`) |
| Critical | `{text/critical}` ! (text token misused) | `--nz-chart-critical` (proposal; alias of `--nz-chart-negative`) |
| Success, Neutral | no Figma spec | builder decides from existing tokens; list on the Deviations page |

- Indeterminate: no Figma spec. Motion hints: the Upload description says the bar "animates width with easing/standard"; figma/03 suggests a `--nz-duration-base` transition. An indeterminate loop must use `--nz-duration-pulse` or `--nz-duration-spin` (stylelint rule, ARCHITECTURE §8.4).
- Fill against track (light): brand 5.55, warning 5.74, critical 4.96. Dark: brand 4.12, critical 3.11.
- Doc copy shows two gauges ("Plan storage 86%", "Low stock 12%"); those are Meter cases (§4.15).

### 4.14 ProgressRing

**Figma:** set `7275:13545`, ghost `751:388` (identical, §2). Read.

Props → code (inventory): `Value` 25 | 50 | 75 | 100 (default 25) → numeric `value` (+ `max`). New: `tone`, `size`, a centre slot. SVG with `role="progressbar"` (or `role="meter"`).

| Part | Value | Token |
|---|---|---|
| Root | 72 × 72, hug, padding 0 | no size token |
| Track | ELLIPSE 72 × 72, full circle, inner radius ratio 0.8 → ring 7.2 px thick, `{chart/track}` | `--nz-chart-track` |
| Value arc | ELLIPSE, starts at −π/2 (12 o'clock), runs clockwise, inner radius 0.8, flat ends, `{chart/primary}` | `--nz-chart-primary` |
| Label | Label/M Strong, `{text/primary}` ("25%"), placed absolutely and centred by hand | `--nz-font-label-m-strong`, `--nz-text-primary` |

- SVG geometry at 72 px: circle radius 32.4, `stroke-width` 7.2, `pathLength="100"`, rotated −90°. figma/03 proposes a 7 px ring-thickness constant.
- Tone, size and centre slot: no Figma spec; reuse ProgressBar's tone mapping. Cap style (flat or round) is an open design question.

### 4.15 Meter

**No Figma component.** Figma draws gauges three ways (none use `<meter>` semantics):

| Where | Anatomy | Source |
|---|---|---|
| Progress Bar Warning/Critical ("Plan storage 86%", "Low stock 12%") | ProgressBar anatomy (§4.13), track 8 high | read; figma/03 §4.7 |
| Discount Card usage `7275:14131` | vertical, gap 8 !; row: "Used" Label/M `{text/secondary}` + "310 / 500" Numeric/M `{text/primary}`; track 250 × 6 !, radius 3 !, `{chart/track}`, clips; fill radius 3, `{chart/primary}`; Expired fill `{chart/neutral}` | figma/05 §3.5 |
| Ranked List rows (ghost `752:444`) | vertical, gap 8 !; label Label/M `{text/primary}`, value Numeric/M `{text/primary}`; track 330 × 6 !, radius 3 !, `{chart/track}`; fill `{chart/primary}`, width relative to the leader | figma/04 §4.6 |

- Shared tokens: `--nz-chart-track`, `--nz-chart-primary`, `--nz-font-label-m`, `--nz-font-numeric-m`, gap `--nz-space-2`. Track height is 8 in the component and 6 in the compositions; neither has a token, so builder decides.
- Low, high and optimum ranges → tone: no Figma spec (figma/03 sketches `thresholds={{ warning: 80, critical: 95 }}` with a configurable direction). Colours as ProgressBar tones.
- Code: native `<meter>` (inventory §4.1); forced-colours rule on the fill (ARCHITECTURE §15.1).

### 4.16 Skeleton

**Figma:** set `7275:15181`, ghost set `756:1169` (identical, §2). Read.

Props → code (inventory): `Shape` Line | KPI | Row (default Line) → `shape` (`line` / `block` / `circle`). The KPI and Row compositions become each component's `status="loading"` rendering, not Skeleton shapes.

| Variant | Layout | Blocks (w × h, radius) |
|---|---|---|
| Line `7275:15182` | vertical, hug, 240 × 66, gap 12 ! | 240 × 14 r6 !, 180 × 14 r6 !, 120 × 14 r6 ! |
| KPI `7275:15186` | vertical, fill width × hug, 280 × 132, padding 20 !, gap 12 !, `{radius/xl}`, `{bg/surface}`, `{border/subtle}` 1 ! inside | 96 × 14 r6 !, 160 × 32 r8 !, 120 × 20 r999 ! |
| Row `7275:15190` | horizontal, hug, 386 × 40, gap 12 !, centred | 40 × 40 r8 !; text column (gap 8 !) 180 × 14 r6 !, 110 × 12 r6 !; 70 × 22 r999 !; 60 × 14 r6 ! |

- Block fill: `{bg/muted}` → `--nz-bg-muted` everywhere. Against `bg/surface`: 1.15:1 light, 1.29:1 dark (decorative).
- Radii: 8 → `--nz-radius-sm`; 999 → `--nz-radius-full`; **6 is off-scale** (figma/07 §8 suggests "`radius/2xs` 6, or snap blocks to 4/8"; builder decides). Gaps: 12 → `--nz-space-3`, 8 → `--nz-space-2`; KPI padding 20 → `--nz-space-5`.
- **Pulse** (lab specimen `7275:19743`, figma/09 §4.4): opacity 1 → 0.5 → 1, 1000 ms per half-cycle (2 s period), easing (0.42, 0, 0.58, 1), which is CSS `ease-in-out` and not a token. Its label says `duration/slower`, which is wrong. Code: `--nz-duration-pulse` (proposal: 2000 ms; 0 ms in Reduced, so the loop stops; ARCHITECTURE §13). The keyframes must leave the resting look as the static style.
- a11y: blocks `aria-hidden`; the region they replace gets `aria-busy` and visually hidden "Loading …" text; no live region (ARCHITECTURE §16.5).

### 4.17 EmptyState

**Figma:** set `7275:15168`, ghost `756:1149` (identical, §2). Read. Guidance (figma/07 §1.1): "A render, a headline, one action. No paragraphs."

Props → code (inventory): `Context` Orders | Search → content (docs recipes, not a prop); render → `media` slot; Button → `actions` slot; title → `title` (`level`).

| Part | Value | Token |
|---|---|---|
| Root | vertical auto-layout, 380 wide (fill width in the set; figma/07 recorded it as fixed), hug height; children centred on the cross axis | — |
| Padding | 32 ! on all sides | `--nz-space-8` |
| Gap | 16 ! | `--nz-space-4` |
| Radius | `{radius/xl}` | `--nz-radius-xl` |
| Fill | `{bg/subtle}` | `--nz-bg-subtle` |
| Media | RECTANGLE 140 × 140, image FIT (contain); Orders: box render, Search: tag render | no size token (figma/07 §8 proposes `size/empty-media` 140) |
| Title | Heading/H3, `{text/primary}`, centred, auto width ("No orders yet", "Nothing matches “stonewear”") | `--nz-font-heading-h3`, `--nz-text-primary` |
| Action | Button Md (40 high): Orders → Primary "Share your store" (ghost `744:70`); Search → Secondary "Clear search" (ghost `744:105`) | W1 `Button` |

- No description in Figma, by design. No size variants (inline, card, page).
- Dark: `bg/subtle` = `bg/surface` (both n900), so the container disappears; the §15.3 override moves dark `bg/subtle` to neutral/925.
- Long titles: no wrap rule drawn; code wraps and keeps the centring.

### 4.18 InlineError

**No Figma component.** The only error look is Input `State=Error` `7275:11422` (read):

| Part | Value |
|---|---|
| Field | `{bg/surface}`, stroke `{border/critical}` 1.5 ! inside, effect `Focus/Ring Critical` (code: `--nz-focus-ring-critical`), `{radius/md}` |
| Gap field → message | 6 ! (`--nz-space-1-5`) |
| Message | the help-text node recoloured: Body/M, `{text/critical}`, same copy as the help text ("Shown on product pages and checkout."), no icon |

- Figma signals the error by colour alone, which fails WCAG 1.4.1. **Plan:** one error look for Field and data widgets, icon + text, never colour alone (inventory §4.1; ARCHITECTURE §15.1), with an `action` slot (ARCHITECTURE §16.5). `data-error` is a load failure and `data-invalid` is validation; they are distinct.
- Tokens: text `--nz-font-body-m` + `--nz-text-critical` (dark override red/400, 4.62:1); glyph `--nz-icon-critical`.
- Glyph, its size and the icon-to-text gap: no Figma spec, so builder decides. Evidence: Alert Critical uses `Icon/circle-x` `738:141` in `icon/critical`; 14 px text pairs with 16 px icons elsewhere (Delta, Input leading icon). Moving the message to 12 px is a one-line hook change listed on the Deviations page (ARCHITECTURE §15.1).

### 4.19 Alert (T0 shell + dismiss leaf)

**Figma:** set `7275:15091`, ghost `756:868` (identical, §2). Read. Guidance (figma/07 §1.1): "Inline, inside a page or card. Title plus at most one line."

Props → code (inventory): `Tone` Info | Success | Warning | Critical (default Info) → `tone`; title and description → slots; close icon → a dismiss `IconButton` (client leaf). New: `action` slot, non-dismissible. No live role by default.

| Part | Value | Token |
|---|---|---|
| Root | horizontal auto-layout, fill width × hug, 480 × 71, items top-aligned (not centred) | — |
| Padding | 14 ! / 16 ! / 14 ! / 16 ! | block 14 is off-scale: snap to 12 or 16, do not add a 14 token (figma/07 §8); inline 16 → `--nz-space-4` |
| Gap | 12 ! | `--nz-space-3` |
| Radius | `{radius/lg}` | `--nz-radius-lg` (16) |
| Border, effect | none | — |
| Leading icon | INSTANCE 20 × 20 | `--nz-size-icon-md` |
| Text column | vertical, fill width, gap 2 !, clips (clipping is a Figma bug; code wraps) | `--nz-space-0-5` |
| Title | Label/M Strong, `{text/primary}` | `--nz-font-label-m-strong`, `--nz-text-primary` |
| Description | Body/M, `{text/secondary}` | `--nz-font-body-m`, `--nz-text-secondary` |
| Close | INSTANCE `Icon/x` `738:423`, 16 × 16, `{icon/secondary}`, bare (no button) | becomes `IconButton` (ARCHITECTURE §15.3) |

| Tone | Fill | Icon | Icon colour, Figma (figma/07 §3) → code |
|---|---|---|---|
| Info | `--nz-bg-info-subtle` | `Icon/info` `738:213` | `{icon/brand}` ! (green on blue; no `icon/info`) → `--nz-icon-info` (proposal) |
| Success | `--nz-bg-success-subtle` | `Icon/circle-check` `738:131` | `--nz-icon-success` |
| Warning | `--nz-bg-warning-subtle` | `Icon/triangle-alert` `738:391` | `--nz-icon-warning` (2.27:1 in Figma; light override amber/600) |
| Critical | `--nz-bg-critical-subtle` | `Icon/circle-x` `738:141` | `--nz-icon-critical` |

- Sample copy: Info "Payouts move to daily on Nov 1" / "No action needed."; Critical "Payment failed for order #1040" / "Card was declined."
- Contrast (light): titles and descriptions 5.7–15.6:1 on every tint; the dismiss icon 3.87–4.31:1.
- Not drawn: an action slot, a border or outline variant, non-dismissible, focus on the close control, wrapping text, a neutral tone.
