# Grove · 02 Actions & Forms — extraction + architecture analysis

- Figma file: `BIzJFf1wm8KP0YG2AVI1tP` ("Grove UI Library"), product ships as **Nizivo UI** (`@nizivo/*`).
- Page: `Grove · 02 Actions & Forms` (page `7275:11238`), single SECTION `7275:11239` (3500 x 2011).
- Read on 2026-10-14, read-only. 7 `use_figma` calls (2 of them exceeded the 20 KB return cap and were re-run split + diffed; no data lost) + 3 `get_screenshot` calls = 10 Figma calls. No 429s.
- Screenshots (local):
  - `/private/tmp/claude-501/-Users-amansharma-Documents-nizivo/7c73004f-bda8-4b08-8fc6-5624b64cd3c2/scratchpad/figma/shots/02-actions-forms-section.png` (whole section, 3000 px)
  - `.../shots/02-button-set.png` (Button set 7275:11244 at 1x)
  - `.../shots/02-menu-row.png` (Menu Item set + Dropdown Menu + Tooltip row 7275:11515 at 1x)
- Token names below are Grove variable names (CSS `--grove-<name>`; must become a configurable prefix such as `--nz-`). `P:` = bound directly to a **Grove Primitives** variable (bypasses the semantic layer). `!` = hard-coded value (not bound to any variable/style).
- **No non-Grove (Clario/Pipkin/Merit/…) variables or styles are referenced anywhere on this page.** Every color binding resolved to Grove Color or Grove Primitives; every text style is `Grove/*`.

---

## 1. Page inventory

| Doc frame | Node | Contents |
|---|---|---|
| Doc/Button | 7275:11240 (1900x344) | Header 7275:11241, **Button** set 7275:11244 |
| Doc/Icon Button | 7275:11353 | Header 7275:11354, **Icon Button** set 7275:11357 |
| Doc/Badge | 7275:11370 | Header 7275:11371, **Badge** set 7275:11374 |
| Doc/Input | 7275:11393 | Header 7275:11394, **Input** set 7275:11397 |
| Doc/Select | 7275:11434 | Header 7275:11435, **Select** set 7275:11438 |
| Doc/Selection controls | 7275:11451 | Header 7275:11452, frame "Sets" 7275:11455 → **Checkbox** 7275:11456, **Radio** 7275:11479, **Switch** 7275:11494 |
| Doc/Menu | 7275:11511 | Header 7275:11512, frame "Row" 7275:11515 → **Menu Item** set 7275:11516, instance **Dropdown Menu** 7275:11537, instance **Tooltip** 7275:11538 |
| Doc/Date picker | 7275:11539 | Header 7275:11540, instance **Date Range Picker** 7275:11543 |
| Doc/Upload | 7275:11544 | Header 7275:11545, **Upload** set 7275:11548 |

Standalone main components used on this page but **not** in the shared snapshot's component-set list (they are plain COMPONENTs, not sets):

| Component | Main component id | Props | Description (verbatim) |
|---|---|---|---|
| Dropdown Menu | 746:204 | none | "Popover menu. Enter: scale 0.96→1 + fade, easing/spring, origin = trigger. Exit: fade 140ms." |
| Tooltip | 746:262 | `Label#746:10` TEXT default "Notifications" | "Tooltip on bg/inverse. Delay 400ms, fade + 4px rise in duration/fast. Names icon-only actions and shortcut." |
| Date Range Picker | 746:267 | none | "Date range popover: presets + month grid. Range fill bg/brand-subtle, ends bg/brand. Opens from Select (calendar)." |

Their parent chain (and that of the Icon/* components, ids 738:*) returns empty from this page context (`removed=false`, `remote=false`). They are local to the file but their page could not be resolved (incremental page loading); the ids predate every listed page id, so they likely sit on the Cover page or a hidden/utility page. See Extraction gaps.

Doc frame styling: `bg/surface` fill, radius 28 (= radius/2xl), padding 48, vertical gap 32, on a `bg/canvas`-like section. Doc headers: title `Grove/Heading/H2`, lead `Grove/Body/M`.

---

## 2. Visual language (from screenshots)

- **Calm, light, merchant-admin feel.** Warm off-white canvas (neutral/50 `#f6f7f4`), white cards with large 28 px radius and no shadow. Copy is commerce-admin ("Product title", "Track inventory", "Standard shipping", "Online store", "Duplicate product", "Drop product images").
- **Color:** deep forest green brand (`bg/brand` = green/700 `#1a573a`) for primary and selected states, lime (`bg/accent` = lime/300 `#c6e06a`) reserved for "Grove AI", brick red for critical. Status color is used sparingly, in subtle tinted pills (badges) only.
- **Shape:** soft-rounded rectangles, not pills. Controls use radius/md 12 (Sm button radius/sm 8, menu rows radius/sm 8, checkbox radius/xs 4). Only badges are fully round (radius/full).
- **Density:** comfortable. 40 px controls, 14 px Geist (Label/M for actions, Body/M for values), 16/20 px Lucide icons at 1.6 px stroke. Hairline 1 px neutral borders.
- **Depth:** essentially flat. Exceptions: Primary button has a hard-coded inner top highlight plus a tiny green-tinted drop shadow ("pressable" feel). Popovers (menu, tooltip, date picker) use `Grove/Elevation/3 Popover`. No glass on this page.
- **Focus:** a translucent 4 px green halo (`Grove/Focus/Ring`). At 1x the ring is effectively **invisible** on the Primary and Critical focus variants in the screenshot (see contrast section). Input and Select focus are legible only because they also switch to a 1.5 px `border/focus` stroke.
- **Motion cues** (descriptions + prototype reactions): hover 140–160 ms with standard easing, press scale 0.98, 80 ms press, 220 ms click/toggle, springs for popover entry and the switch knob, a 400 ms tooltip delay, instant drag-over feedback.

---

## 3. Documentation text on the page (verbatim)

| Node | Title | Guidance |
|---|---|---|
| 7275:11242/43 | Button | "One primary per view. Secondary for everything else, tertiary inside dense rows. Accent is reserved for Grove AI." |
| 7275:11355/56 | Icon button | "40px square, 20px glyph. Always paired with a tooltip that names the action." |
| 7275:11372/73 | Badge | "Status at a glance. Colour carries meaning, the label carries it for everyone." |
| 7275:11395/96 | Input | "Label above, help below, 40px field. Errors say what to do, not what went wrong." |
| 7275:11436/37 | Select | "A trigger for menus and pickers. The chevron says \"choose\", not \"expand\"." |
| 7275:11453/54 | Checkbox, radio & switch | "Checkbox for lists, radio for one-of-many, switch for settings that apply instantly." |
| 7275:11513/14 | Dropdown menu | "Grouped actions with shortcuts. Destructive items sit last, after a divider." |
| 7275:11541/42 | Date range picker | "Presets first — most merchants compare the same few windows." |
| 7275:11546/47 | Upload | "Drag-over state responds instantly; progress is shown in place, never in a modal." |

Component-set descriptions (verbatim; `documentationLinks` empty on all sets):

- **Button**: "Grove Button. Variants: Primary · Secondary · Tertiary · Critical · Accent (AI only). Motion: hover 140ms standard, press scale 0.98 (scale/press), focus ring Focus/Ring. Min hit area 44px via padding on touch."
- **Icon Button**: "Square icon-only action. Pair with Tooltip. Swap the nested Icon instance to change the glyph."
- **Badge**: "Order, payment and fulfilment status. Tone maps 1:1 to semantic tokens."
- **Input**: "Text input. Focus: border/focus + Focus/Ring (140ms). Error: border/critical + Focus/Ring Critical, help text turns text/critical."
- **Select**: "Select trigger. Opens Dropdown Menu or Date Range Picker on Elevation/3 with spring (easing/spring)."
- **Checkbox**: (empty) — **Radio**: (empty)
- **Switch**: "Switch. Knob travels with easing/spring (duration/fast in Reduced mode = 0, colour cross-fades only)."
- **Menu Item**: "Row inside Dropdown Menu / Command Menu. Hover bg/hover, selected bg/brand-subtle + check."
- **Upload**: "Media dropzone. Drag over: tint + border/brand within duration/instant. Upload progress bar animates width with easing/standard."
- Variant-level descriptions: all empty.

---

## 4. Icons

All icons are **local** components (`remote=false`) named `Icon/<lucide-name>`, each described as: `Lucide "<name>" · 20px, 1.6 stroke · recolour via icon/* tokens.` Native size is 20 px with 1.6 px stroke. Instances are scaled, so the stroke scales too: 16 px → 1.28 px, 14 px → 1.12 px. In Lucide's 24-unit viewBox that is `strokeWidth ≈ 1.92` (non-absolute).

| Icon | Main id | Key | Used in |
|---|---|---|---|
| Icon/plus | 738:288 | e1792faaf8bf5ec3b446f7bdddecc0620857900a | Button leading icon (all 27 variants) |
| Icon/chevron-down | 738:114 | d916a611cbeaecba9ca75b8b01ec4ea6558d7c07 | Button trailing icon (hidden by default) |
| Icon/bell | 738:87 | f69c52314d68de832ea90fd5083c8f475069bcae | Icon Button |
| Icon/search | 738:314 | 6558076ca9519d427011a3161071407fcdd66aca | Input leading icon (hidden by default) |
| Icon/calendar | 738:98 | 3fc92a8f1e0aeded21ce7cf494a2a4df1406de8b | Select leading icon |
| Icon/chevrons-up-down | 738:127 | 65857553642670583bca97c13fcd5a4ebaebd36f | Select chevron |
| Icon/check | 738:111 | 6573d1830f2aef518e242947ee4b7b3da758f09f | Checkbox (14 px), Menu Item selected |
| Icon/minus | 738:262 | e8bb73e3d3a0486543f8d4b9abfa9166a39d2a6a | Checkbox indeterminate (14 px) |
| Icon/package | 738:271 | 1b708b25f59160152137d63e0604d257150fa576 | Menu Item leading icon |
| Icon/trash-2 | 738:378 | 1a81671b8054ae1e096ab83b9625ca383759a9e4 | Menu Item critical |
| Icon/upload | 738:403 | 1ca7f9a1e7edfffa9574d30f60212a4e5e368a88 | Upload |
| Icon/chevron-left / chevron-right | (in Date Range Picker instance) | — | Date picker month nav |

Findings:
- No component exposes an **INSTANCE_SWAP** property. Icons are changed by manually swapping nested instances (the Icon Button description says so). That means there are no `preferredValues`, and the code API should take `ReactNode` icon slots.
- Icon color is applied as a **stroke** override bound to `text/*` tokens inside Button and Icon Button (`text/on-brand`, `text/primary`, `text/inverse`, `text/on-accent`, `text/disabled`), and `icon/*` elsewhere (`icon/secondary`, `icon/brand`, `icon/critical`, `icon/primary`). This contradicts the icons' own description ("recolour via icon/* tokens"). In code, icons should use `currentColor` and only receive an `icon/*` color when it intentionally differs from the text.
- The 14 px check/minus inside Checkbox is not on the icon size scale (`size/icon-sm` = 16).
- Icon sizes 16/20 match `size/icon-sm|md` but are not bound.

---

## 5. Components

### 5.1 Button — COMPONENT_SET 7275:11244 (27 variants)

**Raw componentPropertyDefinitions**
```json
{
  "Label#744:0":         {"type":"TEXT","defaultValue":"Button"},
  "Leading icon#744:28": {"type":"BOOLEAN","defaultValue":true},
  "Trailing icon#744:56":{"type":"BOOLEAN","defaultValue":false},
  "Variant": {"type":"VARIANT","defaultValue":"Primary","variantOptions":["Primary","Secondary","Tertiary","Critical","Accent"]},
  "Size":    {"type":"VARIANT","defaultValue":"Md","variantOptions":["Md","Sm","Lg"]},
  "State":   {"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Hover","Pressed","Focus","Disabled"]}
}
```
Default variant: `Variant=Primary, Size=Md, State=Default` (7275:11245).

**Variant matrix** (5 x 3 x 5 = 75 possible, 27 exist)

| Size | Primary | Secondary | Tertiary | Critical | Accent |
|---|---|---|---|---|---|
| Md | D H P F X (11245/49/53/57/61) | D H P F X (11265/69/73/77/81) | D H P F X (11285/89/93/97/11301) | D H P F X (11305/09/13/17/21) | D H X (11325/29/33). **Missing Pressed, Focus** |
| Sm | D only (11337) | D only (11345) | none | none | none |
| Lg | D only (11341) | D only (11349) | none | none | none |

D=Default H=Hover P=Pressed F=Focus X=Disabled. **No Loading state exists anywhere.** Size option order is `Md, Sm, Lg` (non-monotonic).

**Anatomy (default)**
```
COMPONENT 100x40  hug-width / fixed 40  H  pad 0{space/0} 16{space/4} 0 16{space/4}  gap 8{space/2}  center/center
  radius 12{radius/md}  fill {bg/brand}  effect RAW inner(0,1,0,0,#fff@16%) + drop(0,1,2,0,#0a211a@18%)!
├─ INSTANCE "Leading icon"  16x16  Icon/plus  stroke {text/on-brand} 1.28   refs visible→Leading icon
├─ TEXT "Label"  Grove/Label/M  {text/on-brand}  "Button"  hug              refs characters→Label
└─ INSTANCE "Trailing icon" 16x16  Icon/chevron-down  HIDDEN               refs visible→Trailing icon
```

**Size scale**

| Size | Height | Pad X | Gap | Radius | Icon | Label style | Matches token |
|---|---|---|---|---|---|---|---|
| Sm | 32 | 12 {space/3} | 6 {space/1-5} | 8 {radius/sm} | 16 (1.28) | Label/M | size/control-sm (height **not bound**) |
| Md | 40 | 16 {space/4} | 8 {space/2} | 12 {radius/md} | 16 (1.28) | Label/M | size/control-md (not bound) |
| Lg | 48 | 20 {space/5} | 8 {space/2} | 12 {radius/md} | 20 (1.6) | Label/L | size/control-lg (not bound) |

**Per-variant token bindings (root fill / stroke / effect; label + icon color)**

| Variant | Default | Hover | Pressed | Focus | Disabled |
|---|---|---|---|---|---|
| Primary | bg/brand; RAW highlight+shadow; text/on-brand | bg/brand-hover; RAW fx | bg/brand-pressed; RAW fx | bg/brand; **fx=Focus/Ring (highlight+shadow dropped)** | bg/disabled; no fx; text/disabled |
| Secondary | bg/surface + border/default 1! inside; text/primary | bg/hover + border/strong | bg/pressed + border/strong | bg/surface + border/focus **1.5!** + Focus/Ring | bg/disabled + border/subtle; text/disabled |
| Tertiary | no fill; text/primary | bg/hover | bg/pressed | no fill + Focus/Ring | no fill; text/disabled |
| Critical | bg/critical; text/inverse | **P:red/700** | **P:red/700** (identical to hover) | bg/critical + Focus/Ring | bg/disabled; text/disabled |
| Accent | bg/accent; text/on-accent | **P:lime/400** | missing | missing | bg/disabled; text/disabled |

**Hard-coded values:** the RAW effect on Primary (x5 variants incl. Sm/Lg) duplicates `Grove/Surface/Inner Highlight` + an Elevation/1-like shadow with a green tint (`#0a211a`, not the neutral/950 used by the effect styles). Stroke weights 1 (x6) and 1.5 (x1) are not bound to `border-width/default|strong`. Spacing and radius are fully bound; Button is the only set on the page with bound spacing.

**Prototype reactions:** Default → Hover `ON_HOVER` smart-animate 160 ms cubic(0.2,0,0,1). Hover → Pressed `ON_PRESS` 80 ms. The curve equals `easing/standard`. 80 ms = `duration/instant`. **160 ms does not match `duration/fast` (140) or the description ("hover 140ms").** Focus is not wired.

**Issues**
1. Sparse matrix: 27/75. Sm/Lg exist only for Primary/Secondary Default. Accent has no Pressed/Focus. No Loading.
2. Critical Hover and Pressed are the same color and are bound to a primitive (P:red/700). Accent hover is bound to P:lime/400. Token gaps: `bg/critical-hover`, `bg/critical-pressed`, `bg/accent-hover`, `bg/accent-pressed`. **Mode-blind consequence:** in dark mode `bg/accent` already = lime/400, so Accent hover is identical to Accent default. Critical hover in dark is `text/inverse` (neutral/900) on red/700 = **2.10:1**.
3. Critical label uses `text/inverse`, which flips in dark mode to neutral/900 on red/500 = **4.01:1** (fails AA for 14 px medium). A `text/on-critical` token is needed.
4. Focus is only the translucent `Focus/Ring` halo on Primary/Tertiary/Critical. The composite ring on white is **1.45:1**, which fails WCAG 1.4.11 / 2.4.11. Focus variants also replace the Primary highlight effect, because Figma allows only one effect style per node. In code the focus ring must be layered with the elevation (multiple box-shadows or outline).
5. Secondary focus border 1.5 = border-width/strong. The `border-width/focus` = 2 token is never used.
6. Hit targets: Sm 32 and Md 40 are below `size/touch-min` 44. "44px via padding on touch" should become a coarse-pointer hit-area expansion (`::before` inset), not layout padding.
7. `Leading icon` defaults to **true** in Figma. Code should default to no icon (an explicit slot).
8. No icon-only, full-width or link (`asChild`) forms are documented. No INSTANCE_SWAP for icons.
9. Primary is the Figma default, but the guidance says "Secondary for everything else". Pick a code default deliberately (recommendation: `secondary`, or make `variant` required).

**Proposed API**
```tsx
<Button
  variant?: 'primary' | 'secondary' | 'tertiary' | 'critical' | 'accent'   // Figma Variant
  size?: 'sm' | 'md' | 'lg'                                                  // Figma Size (default 'md')
  leadingIcon?: ReactNode                                                    // Figma "Leading icon" bool + nested swap
  trailingIcon?: ReactNode                                                   // Figma "Trailing icon"
  loading?: boolean  loadingText?: string                                    // NEW (aria-busy, spinner replaces leading icon, width preserved)
  fullWidth?: boolean
  asChild?: boolean                                                          // Slot: render <a>/<Link>
  disabled?: boolean  /* + all <button> attrs, ref as prop (React 19) */
>{children /* Figma Label */}</Button>
```
State=Hover/Pressed/Focus/Disabled → CSS `:hover`, `:active` (+ `transform: scale(var(--nz-scale-press))`), `:focus-visible`, `:disabled`/`[aria-disabled]`, never props. Styling via `data-variant`/`data-size` attributes on a recipe, so variants can be added or removed without touching behavior.
- Behavior/a11y: native `<button type="button">`, no headless primitive needed. `aria-busy` while loading.
- RSC: **server** (no state; event handlers come from client parents).
- Tier: primitive. Package: `@nizivo/ui`.

---

### 5.2 Icon Button — COMPONENT_SET 7275:11357 (6 variants)

```json
{
  "Variant": {"type":"VARIANT","defaultValue":"Secondary","variantOptions":["Secondary","Tertiary","Primary"]},
  "State":   {"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Hover"]}
}
```
Variants: Secondary Default 7275:11358, Secondary Hover 11360, Tertiary Default 11362, Tertiary Hover 11364, Primary Default 11366, Primary Hover 11368. The matrix is complete over its two axes.

Anatomy: COMPONENT 40x40 fixed, pad 0, center/center, radius 12{radius/md}. Secondary: bg/surface + border/default 1!; Hover: bg/hover + border/strong. Tertiary: no fill / bg/hover. Primary: bg/brand / bg/brand-hover. Child INSTANCE "Icon" 20x20 Icon/bell, stroke `text/primary` (Primary: `text/on-brand`) 1.6. No TEXT or BOOLEAN props. Reactions: ON_HOVER 160 ms.

Issues: no Pressed, Focus or Disabled states, no sizes (Button has Sm/Lg), no Critical variant, no toggle/pressed (`aria-pressed`) state. Icon is not a property (manual swap). 40 px < 44 touch. Primary has no highlight/shadow, unlike Primary Button. Stroke weight hard-coded. The guidance requires a Tooltip, which lives as a standalone component (746:262) on this page and has no set.

Proposed API:
```tsx
<IconButton icon={<PlusIcon/>} label="Add product" /* required → aria-label + tooltip text */
  variant?: 'primary'|'secondary'|'tertiary'|'critical' size?: 'sm'|'md'|'lg'
  tooltip?: boolean | ReactNode /* default true */ shortcut?: string pressed?: boolean asChild? />
```
- a11y: native button, `aria-label` required (enforce in types), `aria-pressed` for toggles. Tooltip uses the WAI-ARIA tooltip pattern.
- RSC: **split** (server button; the Tooltip wrapper is a client island).
- Tier: primitive. Package: `@nizivo/ui`.

---

### 5.3 Badge — COMPONENT_SET 7275:11374 (6 variants)

```json
{
  "Label#744:84": {"type":"TEXT","defaultValue":"Paid"},
  "Dot#744:91":   {"type":"BOOLEAN","defaultValue":true},
  "Tone": {"type":"VARIANT","defaultValue":"Neutral","variantOptions":["Neutral","Success","Warning","Critical","Info","Brand"]}
}
```
Variants: Neutral 7275:11375, Success 11378, Warning 11381, Critical 11384, Info 11387, Brand 11390.

Anatomy: COMPONENT hug 61x26, H, pad **3! 10! 3! 10!**, gap **6!**, radius 999{radius/full}. Children: ELLIPSE "Dot" 6x6 (refs visible→Dot) and TEXT "Label" Grove/Label/M (refs characters→Label).

| Tone | Fill | Dot | Label |
|---|---|---|---|
| Neutral | bg/muted | icon/secondary | text/secondary |
| Success | bg/success-subtle | icon/success | text/success |
| Warning | bg/warning-subtle | icon/warning | text/warning |
| Critical | bg/critical-subtle | icon/critical | text/critical |
| Info | bg/info-subtle | **text/info** (no icon/info token) | text/info |
| Brand | **bg/brand (solid)** | text/on-brand | text/on-brand |

Issues: padding 3/10 is off the space scale (no 3 or 10 token). Gap 6 = space/1-5 but unbound. Brand is solid while all others are subtle, so emphasis is inconsistent; propose an `emphasis: 'subtle'|'solid'` axis. Label/M (14 px medium) makes a 26 px badge, and no 12 px caption style exists for a compact badge. No size, icon slot or count form. Contrast: light mode is all ≥ 5.1:1. **Dark: Info 3.29:1 and Critical 3.63:1 fail AA.** The warning dot (amber/500 on amber/50) is 2.27:1, which is decorative because the label carries meaning; mark the dot `aria-hidden`.

Proposed API: `<Badge tone="neutral|success|warning|critical|info|brand" emphasis?="subtle|solid" dot? icon?>{label}</Badge>`. Tone→token mapping lives in one recipe ("Tone maps 1:1 to semantic tokens"). Domain mapping (order/payment/fulfilment status → tone) belongs in `@nizivo/commerce` (`<OrderStatusBadge status>`), not core.
- a11y: plain text in a `<span>`, no role. Never rely on dot color alone.
- RSC: **server**. Tier: primitive. Package: `@nizivo/ui`.

---

### 5.4 Input (+ field anatomy) — COMPONENT_SET 7275:11397 (6 variants)

```json
{
  "Label#745:0":         {"type":"TEXT","defaultValue":"Product title"},
  "Value#745:7":         {"type":"TEXT","defaultValue":"e.g. Stoneware mug"},
  "Help text#745:14":    {"type":"TEXT","defaultValue":"Shown on product pages and checkout."},
  "Show help#745:21":    {"type":"BOOLEAN","defaultValue":true},
  "Leading icon#745:28": {"type":"BOOLEAN","defaultValue":false},
  "State": {"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Hover","Focus","Filled","Error","Disabled"]}
}
```
Variants: Default 7275:11398, Hover 11404, Focus 11410, Filled 11416, Error 11422, Disabled 11428.

Anatomy (default):
```
COMPONENT 320x93 fixed-width/hug  V  gap 6!
├─ TEXT "Label"  Label/M  text/primary            refs characters→Label
├─ FRAME "Field" 320x40 fill-width/fixed-40  H pad 0 12! 0 12!  gap 8!  center  radius 12{radius/md}
│    fill bg/surface  stroke border/default 1! inside  clip
│  ├─ INSTANCE "Leading icon" 16x16 Icon/search  HIDDEN   refs visible→Leading icon
│  └─ TEXT "Value"  Body/M  text/tertiary (placeholder look)  fill-width, auto-height   ← NO refs
└─ TEXT "Help"   Body/M  text/tertiary         refs visible→Show help, characters→Help text
```

| State | Field fill | Field stroke | Effect | Label | Value | Help |
|---|---|---|---|---|---|---|
| Default | bg/surface | border/default 1 | — | text/primary | text/tertiary (placeholder) | text/tertiary |
| Hover | bg/surface | border/strong 1 | — | text/primary | text/tertiary | text/tertiary |
| Focus | bg/surface | border/focus 1.5 | Focus/Ring | text/primary | text/tertiary | text/tertiary |
| Filled | bg/surface | border/default 1 | — | text/primary | text/primary "Stoneware mug — Sage" | text/tertiary |
| Error | bg/surface | border/critical 1.5 | Focus/Ring Critical | text/primary | text/primary | **text/critical** (same copy) |
| Disabled | bg/disabled | border/subtle 1 | — | text/disabled | text/disabled | text/tertiary (not disabled) |

Reactions: Default → Hover ON_HOVER 160 ms. Hover → Focus ON_CLICK 220 ms (cubic 0.2,0,0,1).

Issues
1. **Figma bug:** `Value#745:7` is defined, but **no layer references it**. Editing "Value" on an instance does nothing.
2. The State axis conflates interaction (Hover/Focus), data (Filled), validation (Error) and availability (Disabled). Error always carries the focus halo, so there is no "error at rest" and no error+focus distinction.
3. The error message re-uses the help node and only its color changes. There is no error icon or distinct text, so the error is signalled by color alone (WCAG 1.4.1) and contradicts "Errors say what to do".
4. Missing: sizes (only 40; no sm/lg despite control tokens), required/optional marker, trailing slot (clear, unit/suffix, password toggle), prefix/suffix text, read-only, character count, textarea.
5. Disabled help text stays text/tertiary (inconsistent with the disabled label).
6. Value text is fill-width with auto-height, so it wraps. A single-line input must truncate or scroll.
7. All spacing is unbound (gap 6 = space/1-5, pad 12 = space/3, gap 8 = space/2 exist). Stroke weights unbound. Height not bound to size/control-md.
8. Contrast: placeholder and help `text/tertiary` on white = **4.31:1 (fails AA 4.5 for 14 px)**. Resting border `border/default` on white = **1.27:1** (fails 1.4.11 3:1 for the component boundary). Focus border 4.66:1 and error border 4.33:1 pass 3:1.

Proposed API (composable field system shared by every form control):
```tsx
<Field label="Product title" description="Shown on product pages and checkout."
       error?: ReactNode required? optional? disabled? invalid?>
  <Input placeholder="e.g. Stoneware mug" leadingIcon?={<SearchIcon/>} trailing?={…}
         size?: 'sm'|'md'|'lg' value|defaultValue onChange readOnly name …/>
</Field>
// convenience: <TextField label description error … /> = Field + Input
```
Mapping: Label → `label`; Value → `placeholder` / `value`; Help text + Show help → `description` (rendered when present); Leading icon → `leadingIcon`; State=Error → `invalid` + `error` (sets `aria-invalid`, `aria-describedby` → error id, shows icon + message); Disabled → `disabled`; Hover/Focus/Filled → CSS (`:hover`, `:focus-within` on the field shell, `:placeholder-shown`).
- a11y: native `<input>` + `<label htmlFor>`. Description and error ids are wired via `aria-describedby`; `aria-required`. No headless primitive needed.
- RSC: **split**. The Field shell plus an uncontrolled input render on the server (ids via `useId`, explicit prop wiring rather than React context, which RSC cannot use). Controlled values, clear buttons and counters are client.
- Tier: primitive (Input) + foundation (Field). Package: `@nizivo/ui`.

---

### 5.5 Select — COMPONENT_SET 7275:11438 (3 variants)

```json
{
  "Value#745:35":        {"type":"TEXT","defaultValue":"Last 30 days"},
  "Leading icon#745:39": {"type":"BOOLEAN","defaultValue":true},
  "State": {"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Open","Disabled"]}
}
```
Variants: Default 7275:11439, Open 11443, Disabled 11447.

Anatomy: COMPONENT 240x40 fixed, H pad **0 10! 0 12!** gap **8!**, center, radius 12{radius/md}, fill bg/surface, stroke border/default 1!. Children:
- INSTANCE "Leading icon" 16 Icon/calendar, stroke icon/secondary (refs visible→Leading icon)
- TEXT "Value" **Body/M Strong** text/primary, fill-width (refs characters→Value)
- INSTANCE "Chevron" 16 Icon/chevrons-up-down, icon/secondary (not toggleable)

Open: stroke border/focus 1.5! + Focus/Ring. Disabled: bg/disabled, border/default (Input disabled uses border/subtle), value text/disabled, **icons stay icon/secondary**. No reactions.

**What Select really is.** The description says "Opens Dropdown Menu or Date Range Picker on Elevation/3 with spring". The Doc lead says "A trigger for menus and pickers". So this is a **popover trigger**, not a `<select>`. The Dropdown Menu shown on this page is an *action* menu (shortcuts, group label, divider, destructive item). The value-picking popup is implied (Menu Item "Selected + check"), but no listbox popup is drawn. Code therefore needs:
- `Select`: single-value picker. WAI-ARIA **select-only combobox** (button `role="combobox"` + `aria-expanded`/`aria-controls` → `role="listbox"`, `option` + `aria-selected`, typeahead, Home/End, Esc returns focus). Its options re-use the Menu Item visual (Selected → bg/brand-subtle + check).
- `DateRangePicker` trigger: same trigger visual, opens a non-modal dialog (see 5.13).
- `MenuButton`: same trigger visual opening an action `Menu` (role=menu).
- `NativeSelect` (optional plug-in): the same skin on `<select>` with `appearance:none`, for mobile and simple forms.

All four share one `SelectTrigger`-style recipe (`.nz-trigger`) and one anchored `Popover` layer.

Issues: no Hover, Focus (keyboard focus distinct from Open), Error/invalid, or placeholder/empty state. No label/help anatomy (unlike Input), so it must compose with `Field`. Value is Body/M Strong vs Input value Body/M (pick one). The chevron cannot be hidden or swapped. Padding 10 is off-scale. Disabled icons not dimmed. The open popover is not drawn attached to the trigger (no width-matching or offset spec).

Proposed API:
```tsx
<Select value|defaultValue onValueChange open|defaultOpen onOpenChange
        placeholder leadingIcon size invalid disabled name /* hidden input for forms */>
  <SelectItem value="30d" icon? shortcut? disabled?>Last 30 days</SelectItem>
  <SelectGroup label="…">…</SelectGroup> <SelectSeparator/>
</Select>
```
- Headless primitive needed: popover positioning (Floating UI, or CSS anchor positioning + `popover` attribute with fallback) + listbox collection (typeahead, active-descendant).
- RSC: **client**. Tier: composite. Package: `@nizivo/ui`.

---

### 5.6 Checkbox — COMPONENT_SET 7275:11456 (6 variants)

```json
{
  "Label#745:43": {"type":"TEXT","defaultValue":"Track inventory"},
  "Checked": {"type":"VARIANT","defaultValue":"False","variantOptions":["False","True","Indeterminate"]},
  "State":   {"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Disabled"]}
}
```
Variants: False/Default 7275:11457, False/Disabled 11460, True/Default 11463, True/Disabled 11467, Indeterminate/Default 11471, Indeterminate/Disabled 11475 (complete over 3x2).

Anatomy: COMPONENT hug 128x21, H gap **10!**, center. FRAME "Box" 20x20 radius 4{radius/xs}, clip. TEXT "Label" Body/M (refs characters→Label).

| Checked/State | Box fill | Box stroke | Glyph |
|---|---|---|---|
| False/Default | bg/surface | border/strong 1! | — |
| False/Disabled | bg/disabled | border/strong 1! | — |
| True/Default | bg/brand | — | Icon/check 14 px, text/on-brand 1.12 |
| True/Disabled | bg/muted | — | check, text/disabled |
| Indet./Default | bg/brand | — | Icon/minus 14 px, text/on-brand |
| Indet./Disabled | bg/muted | — | minus, text/disabled |

Label: text/primary, or text/disabled when disabled. Reactions: False↔True ON_CLICK 220 ms (Indeterminate has none). The Disabled variants also carry ON_CLICK toggles (11460↔11467), the same prototype bug as Switch.

Issues: no Hover, Focus or Error/invalid states and no description line. The row is 21 px tall and the box is 20 px: under 24 px (WCAG 2.5.8) and 44 touch, so the label must be part of the hit area. The unchecked border `border/strong` on white is **1.57:1** (fails 3:1). Gap 10 is off-scale. The 14 px glyph is off the icon scale.

Proposed API: `<Checkbox checked|defaultChecked: boolean | 'indeterminate' onCheckedChange label description invalid disabled name value/>` + `<CheckboxGroup label description error value|defaultValue onValueChange>` (fieldset/legend).
- a11y: native `<input type="checkbox">` styled with `appearance:none` (or visually hidden plus a box). `indeterminate` must be set via a ref (`el.indeterminate = true`), which needs a client effect. `aria-checked="mixed"` is native when indeterminate.
- RSC: **split** (server for plain uncontrolled; a client island when indeterminate or controlled).
- Tier: primitive. Package: `@nizivo/ui`.

---

### 5.7 Radio — COMPONENT_SET 7275:11479 (4 variants)

```json
{
  "Label#745:50": {"type":"TEXT","defaultValue":"Standard shipping"},
  "Selected": {"type":"VARIANT","defaultValue":"False","variantOptions":["False","True"]},
  "State":    {"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Disabled"]}
}
```
Variants: False/Default 7275:11480, False/Disabled 11483, True/Default 11486, True/Disabled 11490.

Anatomy: COMPONENT hug 147x21, H gap 10!. FRAME "Radio" 20x20 radius **10!** (should be radius/full). TEXT "Label" Body/M.
- Unselected: bg/surface + border/strong 1!.
- Selected: bg/brand + ELLIPSE 8x8 filled **text/on-brand** (a text token used on a shape).
- Selected/Disabled: bg/muted + ELLIPSE text/on-brand (white) → **1.15:1, the selected dot is invisible**. Checkbox disabled uses text/disabled, so the two are inconsistent.
- Unselected/Disabled: bg/disabled.
- No reactions.

Issues: no Hover/Focus/Error states, no description line, no group (fieldset/legend) anatomy. Unselected border 1.57:1. Same hit-target issue as Checkbox.

Proposed API: `<RadioGroup label description error value|defaultValue onValueChange name orientation disabled><Radio value label description disabled/></RadioGroup>`.
- a11y: native radios in `<fieldset><legend>` give arrow-key roving for free (WAI-ARIA radio group semantics).
- RSC: **split** (uncontrolled server render; controlled is client). Tier: primitive. Package: `@nizivo/ui`.

---

### 5.8 Switch — COMPONENT_SET 7275:11494 (4 variants)

```json
{
  "Label#745:55": {"type":"TEXT","defaultValue":"Online store"},
  "On":    {"type":"VARIANT","defaultValue":"False","variantOptions":["False","True"]},
  "State": {"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Disabled"]}
}
```
Variants: Off/Default 7275:11495, Off/Disabled 11499, On/Default 11503, On/Disabled 11507.

Anatomy: COMPONENT hug 124x21, H gap 10!. FRAME "Track" 36x20, H pad 0 **2!** 0 **2!**, radius **10!**, clip, primary-axis align MIN (off) / MAX (on). ELLIPSE "Knob" 16x16 fill **P:neutral/0**, effect **RAW drop-shadow 0 1 2 0 #000000 @18%** (pure black, not the neutral/950 tint used by the effect styles). TEXT "Label" Body/M.

| On/State | Track fill |
|---|---|
| Off/Default | **P:neutral/300** |
| Off/Disabled | bg/disabled |
| On/Default | bg/brand |
| On/Disabled | **P:green/200** |

Reactions: ON_CLICK toggles Off↔On (and disabled↔disabled, a prototype bug) 220 ms cubic(0.2,0,0,1). The description says "easing/spring … Reduced mode … colour cross-fades only", but the prototype uses a cubic curve.

Issues: three fills bound to primitives, so they are mode-blind. In dark mode the off track stays light grey neutral/300 on a near-black surface. Token gaps: `control/track-off`, `control/track-on-disabled`, `control/knob`, `control/knob-shadow`. No Focus/Hover/Error and no pending/loading state, although the guidance says switches "apply instantly", so async saves need a pending state. Off track vs surface is **1.57:1**, and knob vs off track is 1.57:1 (fails 3:1). Hit target 36x20.

Proposed API: `<Switch checked|defaultChecked onCheckedChange label description disabled pending? name value/>`.
- a11y: `<button role="switch" aria-checked>` (client), or `<input type="checkbox" role="switch">` for a server-renderable uncontrolled form. Space/Enter toggle. Announce the result for async saves via a polite live region.
- Motion: knob translate with a spring approximated by CSS `linear()`. Under reduced motion only the color cross-fades.
- RSC: **split**. Tier: primitive. Package: `@nizivo/ui`.

---

### 5.9 Menu Item — COMPONENT_SET 7275:11516 (4 variants) and the Dropdown Menu it implies

```json
{
  "Label#746:0":    {"type":"TEXT","defaultValue":"Duplicate product"},
  "Shortcut#746:5": {"type":"TEXT","defaultValue":"⌘D"},
  "State": {"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Hover","Selected","Critical"]}
}
```
Variants: Default 7275:11517, Hover 11522, Selected 11527, Critical 11532.

Anatomy (default): COMPONENT **fixed 248**x36, H pad 0 **10!** 0 **10!**, gap **10!**, radius 8{radius/sm}.
- INSTANCE "Leading icon" 16 Icon/package, icon/secondary (always visible; no boolean)
- TEXT "Label" Body/M text/primary, fill-width, auto-height (wraps; no truncation)
- TEXT "Shortcut" **Grove/Mono/M** text/tertiary
- INSTANCE "Check" 16 Icon/check, HIDDEN (no boolean)

| State | Fill | Icon | Label | Shortcut | Check |
|---|---|---|---|---|---|
| Default | — | icon/secondary | text/primary | visible | hidden |
| Hover | bg/hover | icon/secondary | text/primary | visible | hidden |
| Selected | bg/brand-subtle | icon/brand | text/brand | **hidden** | icon/brand |
| Critical | — | Icon/trash-2 icon/critical | text/critical | visible | hidden |

Reaction: Default → Hover ON_HOVER 160 ms.

Issues: the single State axis mixes interaction (Hover), selection (Selected) and intent (Critical), so Critical+Hover and Selected+Hover cannot be expressed. Missing: Disabled, keyboard highlight (should equal Hover → `data-highlighted`), submenu chevron, checkbox/radio item, description line, Critical hover. No booleans for icon, shortcut or check. Fixed 248 width (should fill the menu). Shortcut contrast 4.31:1 on white (fails AA). Padding/gap 10 off-scale.

**Dropdown Menu instance 7275:11537 → main 746:204** (COMPONENT, no props): 262x237, V pad **6!** gap **2!**, radius 16{radius/lg}, fill bg/surface-raised, stroke border/subtle 1!, effect Grove/Elevation/3 Popover. Content, in order:
1. FRAME "Group" (pad 6/0/4/10) with TEXT "Group label" "Product" (Label/M, text/tertiary)
2. Menu Item "Edit product ⌘E"
3. Menu Item Hover "Duplicate product ⌘D"
4. "Preview on store ⌘P"
5. "Print barcode labels ⌘L"
6. RECTANGLE "Divider" 248x1 border/subtle
7. Critical "Delete product ⌫" (from screenshot)

Description: "Enter: scale 0.96→1 + fade, easing/spring, origin = trigger. Exit: fade 140ms." This confirms that **Menu Item implies a full Menu component**: an action menu with groups, labels, separators, shortcuts and destructive-last ordering.

Proposed API (compound, headless-backed):
```tsx
<Menu>                       // Root: open|defaultOpen|onOpenChange, modal?
  <Menu.Trigger asChild><Button …/></Menu.Trigger>
  <Menu.Content align side sideOffset>   // Elevation/3, radius/lg, motion tokens
    <Menu.Group><Menu.Label>Product</Menu.Label>
      <Menu.Item icon={<PencilIcon/>} shortcut="⌘E" onSelect disabled>Edit product</Menu.Item>
    </Menu.Group>
    <Menu.Separator/>
    <Menu.Item intent="critical" icon={<TrashIcon/>} shortcut="⌫">Delete product</Menu.Item>
    <Menu.CheckboxItem/> <Menu.RadioGroup><Menu.RadioItem/></Menu.RadioGroup>  // "Selected" visual
    <Menu.Sub>…</Menu.Sub>
  </Menu.Content>
</Menu>
```
Mapping: State=Hover → `data-highlighted` (pointer or keyboard). Selected → `aria-checked` (menu) / `aria-selected` (listbox option). Critical → `intent="critical"` (orthogonal to highlight). Shortcut → `shortcut` prop rendered in Mono/M plus `aria-keyshortcuts`. Label → children.
- a11y: WAI-ARIA **Menu Button** pattern: `role=menu`/`menuitem`, roving focus or active-descendant, arrows/Home/End/typeahead, Enter/Space activate, Esc closes and restores focus to the trigger, Tab closes.
- Shared visual: one `ItemRow` recipe for Menu.Item, SelectItem, Command menu rows (the description mentions a Command Menu) and Date-picker presets.
- RSC: **client**. Tier: composite. Package: `@nizivo/ui`.

---

### 5.10 Upload — COMPONENT_SET 7275:11548 (3 variants)

```json
{ "State": {"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Drag over","Uploading"]} }
```
Variants: Default 7275:11549 (360x167), Drag over 11556 (360x168), Uploading 11563 (360x**185**, so the layout shifts).

Anatomy (default): COMPONENT 360 fixed-width, hug height, V pad **28! 24! 28! 24!** gap **12!**, center, radius 20{radius/xl}, fill bg/subtle, stroke border/strong 1! inside **dashed 6/5**.
- FRAME "Icon wrap" 44x44 radius **22!**, bg/surface + border/subtle 1!, containing Icon/upload 20, icon/primary
- FRAME "Frame" (H gap 4!) containing TEXT "Drop product images or" (Label/M text/primary) + TEXT "browse" (Label/M Strong text/brand)
- TEXT "PNG, JPG or WebP · up to 20 MB" (Body/M text/tertiary)

Drag over: fill bg/brand-subtle, stroke border/brand **1.5** dashed. Icon wrap becomes bg/brand with the icon in text/on-brand. Text becomes "Release to upload" (layer renamed). "browse" hidden.
Uploading: the title row is removed and replaced by TEXT "Uploading 3 of 5 images" (Label/M) plus FRAME "Progress" 240x6 radius 3! fill **chart/track** with RECTANGLE 144x6 (60%) fill **chart/primary**. Then the hint.
No props besides State: copy strings are not exposed. No reactions.

Issues: missing Error (wrong type, too large, failed), Complete/Success, Disabled, Focus (the dropzone and the "browse" control must be keyboard reachable), a file list or thumbnails, cancel/retry/remove, and per-file progress. The progress bar is hand-drawn with chart/* tokens instead of re-using **Progress Bar** (page 03, set 7275:13526). Padding 28 is off-scale and 24 = space/6 is unbound. Radii 22/3 should be radius/full. The dashed 6/5 pattern cannot be reproduced by CSS `border-style: dashed`; use an SVG `rect` stroke-dasharray or a background-image. The hint `text/tertiary` on bg/subtle is 4.16:1 (fails AA). "Drag-over state responds instantly" → `duration/instant`.

Proposed API (headless state + pluggable transport):
```tsx
<FileUpload accept="image/png,image/jpeg,image/webp" maxSize={20_000_000} multiple
            onFilesAccepted onFilesRejected disabled uploader?={adapter /* S3 presign, tus, custom */}>
  <FileUpload.Dropzone>  {/* data-dragging, data-disabled */}
    <FileUpload.Trigger>browse</FileUpload.Trigger>  {/* real <button> → hidden <input type=file> */}
  </FileUpload.Dropzone>
  <FileUpload.List>{file => <FileUpload.Item file={file}/* progress, status, retry, remove *//>}</FileUpload.List>
</FileUpload>
```
- a11y: the drop target is not keyboard-operable on its own, so the "browse" button is the accessible path. Progress uses `role=progressbar` + `aria-valuenow`, and an `aria-live="polite"` summary ("Uploading 3 of 5 images"). Errors are announced assertively and tied to the input.
- RSC: **client**. Tier: pattern. Package: `@nizivo/ui` (transport adapters can ship separately).

---

### 5.11 Tooltip — standalone COMPONENT 746:262 (instance 7275:11538)

Props: `Label#746:10` TEXT "Notifications". Anatomy: V wrapper 125x43.
- FRAME "Bubble": H pad **8! 12! 8! 12!**, gap 8!, radius 8{radius/sm}, fill bg/inverse, effect Elevation/3 Popover. Contains TEXT "Label" (Label/M, text/inverse) and TEXT "Shortcut" "N" (Mono/M, text/tertiary).
- POLYGON "Arrow" 12x7 bg/inverse (points down; top placement only).

Description: delay 400 ms, fade + 4 px rise in duration/fast.

Issues: one placement only, the shortcut cannot be toggled, no max-width/wrapping rule. Shortcut contrast is 4.03:1 (light) and 4.31:1 (dark), both failing AA. Elevation/3 is a dark-on-dark shadow in dark mode (no dark elevation). It is not part of the 07 Feedback page, yet Icon Button requires it.

Proposed API: `<Tooltip content="Notifications" shortcut="N" side="top|right|bottom|left" delay={400} disabled?><IconButton …/></Tooltip>` + `TooltipProvider` (shared delay group / skip-delay).
- a11y: WAI-ARIA tooltip pattern. Shows on hover after the delay and immediately on keyboard focus. Esc dismisses. Hoverable and persistent (WCAG 1.4.13). The trigger gets `aria-describedby`; for icon-only triggers the accessible name comes from `aria-label`, not the tooltip.
- RSC: **client**. Tier: composite. Package: `@nizivo/ui`.

---

### 5.12 Dropdown Menu — standalone COMPONENT 746:204 (instance 7275:11537)

Covered under 5.9 (Menu). The container is not parameterised (no props). In code it is `Menu.Content`.

---

### 5.13 Date Range Picker — standalone COMPONENT 746:267 (instance 7275:11543)

Anatomy (525x386): V pad **20!** gap **16!**, radius 20{radius/xl}, bg/surface-raised, border/subtle 1!, Elevation/3 Popover.
- "Body" H gap 20!:
  - "Presets" V 167 wide, pad-right 16!, gap 2!, right border border/subtle. Six rows 150x36 (pad 8!/10!, radius/sm, Body/M): Today, Yesterday, **Last 7 days** (selected: bg/brand-subtle, text/brand), Last 30 days, This quarter, Year to date.
  - "Calendar" 296 wide V gap 8!:
    - "Month" header (space-between): Icon/chevron-left 20 (icon/secondary), "October 2026" Label/M Strong, Icon/chevron-right 20.
    - "Weekdays" row: 7 x 42x28 (Mo–Su).
    - Weeks 1–5: 7 x 42x36 **plain FRAMEs** (no Day component). Range cells bg/brand-subtle, end cells bg/brand (contrast 7.49:1 between them), a today dot under the 8th, outside-month days muted.
- "Footer" H gap 8!: "Oct 1 – Oct 7, 2026" Body/M Strong, then Button Secondary "Cancel" and Button Primary "Apply" (real Button instances).

Issues: no Day-cell component, so there are no hover, focus, disabled/unavailable, today, start/end/in-range or outside-month states as variants. Month navigation uses bare 20 px icons, not Icon Buttons (20 px targets fail 2.5.8). Single month only, no time, no compare-to-previous-period (common in analytics). Presets have hard-coded padding. Apply/Cancel implies a commit model.

Proposed API:
```tsx
<DateRangePicker value|defaultValue={{start,end}} onValueChange presets={[{label,range}]}
  minValue maxValue isDateUnavailable locale weekStartsOn numberOfMonths={1|2}
  commit?: 'apply'|'instant' /* footer Apply/Cancel vs live */ trigger?={<SelectTrigger/>} />
// lower-level: <RangeCalendar/>, <Calendar/>, <DatePresets/>
```
- a11y: WAI-ARIA **Date Picker Dialog** + **grid** pattern. Arrows move by day/week, PageUp/PageDown by month (Shift for year), Home/End by week, Enter selects start/end. The dialog is labelled, focus moves into the grid and returns to the trigger. Presets form a listbox/radiogroup. The month heading is a live region.
- Requires a date-math adapter (Temporal / date-fns / @internationalized/date) so the date library can be swapped.
- RSC: **client**. Tier: heavy. Package: `@nizivo/dates` (opt-in).

---

## 6. Hard-coded values (design debt summary)

| Set | Node path | Value | Token that exists / gap |
|---|---|---|---|
| Button | root (Primary x5) | effect inner(0,1,0,0,#fff 16%) + drop(0,1,2,0,#0a211a 18%) | Surface/Inner Highlight + Elevation/1 exist (different tint) → create `Elevation/Button` or compose |
| Button, Icon Button, Input, Select, Checkbox, Radio, Upload, Menu, Picker | strokes | 1 / 1.5 | border-width/default, border-width/strong (unbound everywhere); focus should use border-width/focus 2 |
| Input | root gap 6; Field pad 12, gap 8 | | space/1-5, space/3, space/2 exist (unbound) |
| Select | pad 10/12, gap 8 | | 10 off-scale; 12/8 exist |
| Badge | pad 3/10, gap 6 | | 3, 10 off-scale; 6 exists |
| Checkbox/Radio/Switch | gap 10 | | off-scale |
| Radio box / Switch track | radius 10 | | radius/full |
| Switch | track pad 2; knob shadow #000 18% | | space/0-5; no knob-shadow style |
| Menu Item | pad 10, gap 10 | | off-scale |
| Upload | pad 28/24, gap 12, gap 4; radius 22, 3 | | 28 off-scale; space/6, space/3, space/1, radius/full |
| Dropdown Menu | pad 6, gap 2, group pad 6/4/10 | | space/1-5, space/0-5; 10 off-scale |
| Tooltip | pad 8/12, gap 8 | | space/2, space/3 |
| Date Range Picker | pad 20, gaps 16/20/8/2, preset pad 8/10 | | space/5, space/4, space/2, space/0-5; 10 off-scale |
| All controls | heights 32/40/48, icons 16/20 | | size/control-*, size/icon-* exist; never bound |

Primitive bindings that bypass the semantic layer (mode-blind): Button Critical hover/pressed `P:red/700`, Accent hover `P:lime/400`, Switch off track `P:neutral/300`, knob `P:neutral/0`, on-disabled track `P:green/200`.

Semantic misuse: Radio dot and checkbox glyph use `text/on-brand`; Badge Info dot uses `text/info`; Upload progress uses `chart/track`/`chart/primary`; Button icons use `text/*`.

---

## 7. Accessibility — contrast and targets (computed from token hexes)

| Pair | Light | Dark | Verdict |
|---|---|---|---|
| Primary label text/on-brand on bg/brand | 8.51 | 5.17 | pass |
| Critical label text/inverse on bg/critical | 5.69 | **4.01** | dark fails (needs text/on-critical) |
| Critical hover (P:red/700) | 8.26 | **2.10** | dark fails |
| Accent label on bg/accent | 11.46 | 9.66 | pass |
| text/tertiary (placeholder, help, shortcut, hint) on surface | **4.31** | **4.03** | fails AA 4.5 for 14 px |
| text/tertiary on bg/inverse (tooltip shortcut) | **4.03** | **4.31** | fails |
| Input border/default vs surface | **1.27** | **1.29** | fails 1.4.11 (3:1) |
| Checkbox/Radio border/strong vs surface | **1.57** | — | fails |
| Switch off track vs surface | **1.57** | 11.07 (primitive, mode-blind) | light fails |
| Focus/Ring composite vs surface | **1.45** | **1.37** | fails where the ring is the only indicator |
| Focus/Ring Critical composite vs surface | **1.40** | — | fails |
| border/focus (green/500) vs surface | 4.66 | — | pass |
| border/critical vs surface | 4.33 | — | pass |
| Radio disabled-selected dot | **1.15** | — | invisible |
| Badge tones (text on subtle fill) | 5.14–6.11 | Info **3.29**, Critical **3.63** | dark fails |
| Menu selected text/brand on bg/brand-subtle | 7.49 | 7.37 | pass |
| Disabled text on disabled bg | 2.20 | 2.07 | exempt (1.4.3), but low |

No neutral border token reaches 3:1 on white (neutral/400 `#9ea59c` = 2.53:1; neutral/500 `#747c73` = 4.31:1 is the lightest that passes). A `border/control` token (about neutral/500) is needed for input, checkbox, radio and switch boundaries.

Focus recommendation: `outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px`, optionally keeping the translucent halo as decoration. Define it as one `:focus-visible` utility used by every control, and give dark mode its own ring color (the Focus/Ring effect color is hard-coded).

Targets vs `size/touch-min` 44 (WCAG 2.5.8 needs 24): Button Sm 32, Md 40, Icon Button 40, Select/Input 40, Menu Item 36, Checkbox/Radio box 20 (row 21), Switch 36x20, date-picker nav 20. Provide a shared `hitArea` utility (`::before { inset: min(0px, (var(--nz-size-touch-min) - 100%) / 2) }` under `@media (pointer: coarse)`).

---

## 8. Motion (as specified vs as prototyped)

| Interaction | Spec (description) | Prototype |
|---|---|---|
| Button hover | 140 ms standard | 160 ms cubic(0.2,0,0,1) |
| Button press | scale 0.98 (scale/press) | 80 ms (duration/instant), no scale in variants |
| Input hover/focus | Focus 140 ms | hover 160 ms; click→focus 220 ms |
| Checkbox/Switch toggle | Switch: easing/spring; Reduced: color cross-fade only | 220 ms cubic(0.2,0,0,1) |
| Menu/Select popover | scale 0.96→1 + fade, easing/spring, origin = trigger; exit fade 140 ms | not prototyped |
| Tooltip | delay 400 ms, fade + 4 px rise, duration/fast | not prototyped |
| Upload | drag-over within duration/instant; progress width easing/standard | not prototyped |

`easing/spring` (`spring(1, 260, 24, 0)`) is not valid CSS. Ship it as a precomputed `linear()` easing token, with a JS spring only in `@nizivo/motion`. Reduced motion comes from the Grove Motion "Reduced" mode, mapped to `@media (prefers-reduced-motion: reduce)` overriding the duration/easing variables.

---

## 9. Architecture recommendations from this page (plug-in / plug-out friendly)

1. **Layering**
   - tokens (`@nizivo/tokens`: CSS variables generated from Grove variables, with a configurable prefix)
   - headless behavior (one engine wrapped behind Nizivo-owned hooks/components: popover, listbox/collection, menu, tooltip, date grid; React Aria fits date/listbox/i18n best, Radix or Base UI are acceptable)
   - styled components (`@nizivo/ui`)
   - domain patterns (`@nizivo/commerce`, `@nizivo/dates`)

   Swapping the behavior engine must not change the public props.
2. **Variant recipes as data.** Each component exposes `data-variant`, `data-size`, `data-tone` and `data-intent` attributes plus one CSS recipe file. Adding or removing a variant (for example `accent`) is a recipe change, not a component change. Interaction states are CSS/ARIA selectors (`:hover`, `:focus-visible`, `[data-highlighted]`, `[data-state=open]`, `[aria-invalid]`, `[aria-checked]`), never props. This is why Figma's `State` axes do not become props.
3. **Slots, not booleans.** Figma booleans (Leading icon, Trailing icon, Show help, Dot) become `ReactNode` slots or optional content. Icons are `ReactNode`, so any icon set can be plugged in; `@nizivo/icons` is a thin Lucide preset (strokeWidth ≈ 1.92 in a 24 viewBox → 1.6 px at 20 px, sizes from size/icon-*, `currentColor`).
4. **One control-size scale.** `size: 'sm'|'md'|'lg'` maps to size/control-sm|md|lg for Button, IconButton, Input, Select and the DateRangePicker trigger (Figma has sizes only on Button). Icons map to size/icon-sm|md, and radius follows the size (sm → radius/sm).
5. **Field system.** A single `Field` (label, description, error, required, disabled, invalid, ids) wraps Input, Select, CheckboxGroup, RadioGroup, Switch, FileUpload and DateRangePicker. Error rendering and announcement are consistent, and an error icon plus text means color is never the only signal.
6. **Shared overlay layer.** One `Popover`/anchored-positioning primitive (Elevation/3, radius/lg, enter/exit motion, collision handling, portal, dark elevation variant) is used by Menu, Select, Tooltip and DateRangePicker. Elevation is a token, not baked into each component.
7. **Shared collection/item row.** One `ItemRow` recipe plus collection behavior (typeahead, active-descendant, disabled skipping) is used by Menu, Select, Command menu and date presets. Menu Item's `State` axis decomposes into `highlighted × selected × intent × disabled`.
8. **Polymorphism.** `asChild` (Slot) on Button, IconButton, Menu.Item and the triggers, so routers and links plug in without wrappers.
9. **Form-native first.** Native `<button>`, `<input>` (text, checkbox, radio) and `<fieldset>`. Custom controls (Select, Switch-as-button, FileUpload) render hidden inputs with `name`/`value`, so server actions and form libraries work unchanged. Use React 19 `ref` as a prop.
10. **Token additions requested from this page:** bg/critical-hover, bg/critical-pressed, bg/accent-hover, bg/accent-pressed, text/on-critical, border/control (≥3:1), control/track-off, control/track-on-disabled, control/knob, control/indicator-disabled, icon/info, a dark Focus/Ring, Elevation/Button (or composition rule), and a 12 px caption text style. Darken text/tertiary (or restrict it to ≥ 18 px). Decide the 10 px question (add space/2-5 or snap 10 → 8/12).

---

## 10. Extraction gaps

- The main components of Icon/* (738:*), Dropdown Menu (746:204), Tooltip (746:262) and Date Range Picker (746:267) resolve (local, not removed), but their parent chain returns empty from this page context, so their page/frame location is unresolved. Not read: their variant/prop definitions beyond what is listed, and the full Icon/* inventory.
- Two `use_figma` reads exceeded the 20 KB return cap and were re-run split by component, with non-default variants reported as diffs against the default variant. Lines identical to the default variant are implied, not repeated.
- Instance trees were collapsed after 2 same-name siblings. Three Dropdown Menu items (Preview on store ⌘P, Print barcode labels ⌘L, Delete product, critical, ⌫) and the date-picker day cells beyond the first two per row were taken from the screenshot, not from node reads.
- Screenshots are light mode only. Dark-mode conclusions are computed from token values, not rendered.
- `get_screenshot` does not upscale beyond natural size, so set-level shots are 1x. The Focus/Ring visibility claim is from a 1x render plus computed contrast.
- Effect-style internals and variable values come from the shared snapshot (`00-tokens-and-styles.md`), not re-read.
- Responsive behavior: there are no breakpoint variants on this page.
