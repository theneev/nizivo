# Week 4 Menu, Tabs and TabNav: Figma facts for builders

- File: `BIzJFf1wm8KP0YG2AVI1tP` ("Nizivo UI Library", formerly "Grove UI Library"; ships as **Nizivo UI**). Open a node with `https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Nizivo-UI-Library?node-id=<id with : replaced by ->`.
- Scope: the week 4 component entries of ARCHITECTURE §21.1 (W3–4, second half): Menu (with the Dropdown Menu surface), Tabs and TabNav, plus the Tooltip and IconButton placement facts that [12-w3-forms.md](12-w3-forms.md) §4.9–§4.10 left open, and a reconciliation of the shipped Select popup against the Dropdown Menu master (Select's description says it "opens Dropdown Menu"). The overlay engine, `engineDom` conformance, `@nizivo/icons` and `tokens.json` have no Figma input beyond what is noted here.
- Read 2026-10-15. **5 Figma calls in total, all read-only `use_figma` scripts that only returned data** (no setters, no create, no remove, no renames; no `get_design_context`, no screenshots). Nothing in the file changed.
  - Call 1 read the Menu Item set `7275:11516` (every variant, every descendant, bindings and reactions) and the parent chain, properties, variants and instances of `746:203`, `746:204` and `746:262`.
  - Call 2 read the full Dropdown Menu master `746:204` with positions, diffed the ghost Menu Item `746:203` against `7275:11516` variant by variant, and read the Doc/Menu "Row" frame `7275:11515`, the overrides on instance `7275:11537` and the Tooltip master `746:262`.
  - Call 3 read the live Tab set `755:961`, re-diffed it against the page copy `7275:14781`, and read every Tab instance's parent strip (5 strips).
  - Call 4 listed the `Icon/*` masters in `738:1`–`738:460` (74 icons), counted Icon Button instances and listed where `Icon/ellipsis` and `Icon/chevron-right` are used.
  - Call 5 read the Top Bar `755:1031` (notifications button, avatar), the Product Row `753:417` and Card header `7275:13765` ellipsis triggers, and resolved three icon-colour variable ids.
- Everything else comes from the existing notes (`00`–`12` in this folder), [component-inventory.md](../component-inventory.md), [ARCHITECTURE.md](../ARCHITECTURE.md), the shipped CSS in `packages/react/src/` and the built token contract. Each fact says where it came from: "read" means one of the calls above; `figma/NN §x` means an existing note.
- Style names now read back as `Nizivo/Body/M`, `Nizivo/Mono/M`, `Nizivo/Label/M Strong` and `Nizivo/Elevation/3 Popover` (figma/02 and figma/06 recorded `Grove/*`; the rename is figma/11's header). This note writes them without the prefix.

## 0. How to read this

- **Token names** are the names in `packages/tokens/dist/contract.json`, built on 2026-10-15 with `pnpm --filter @nizivo/tokens build` (**237** tokens; 62 checked contrast pairs pass). The Figma variable is in brackets: `--nz-bg-hover` [bg/hover]. Colours have no `--nz-color-*` prefix. Space and radius are rem (`--nz-space-1-5` = 0.375rem); border widths stay px.
- **Code-owned tokens** used this week: `--nz-scale-enter` (0.96; 1 when reduced, from the Dropdown Menu description), `--nz-duration-fade` (140 ms; 120 ms reduced), `--nz-duration-spring` (493 ms; 120 ms reduced) with `--nz-easing-spring` (a precomputed `linear()`; `linear` reduced). They are never Figma bindings.
- **Text styles** are `--nz-font-<style>` shorthands (`--nz-font-body-m` [Body/M], `--nz-font-mono-m` [Mono/M], `--nz-font-label-m` [Label/M], `--nz-font-label-m-strong` [Label/M Strong]), with tracking in `--nz-tracking-<style>`.
- **`{x}`** means bound to variable `x` in Figma. **`!`** means hard-coded (not bound). After a bound token, `!` marks a semantic misuse (a background token used as a stroke or indicator).
- **"builder decides"** means Figma's value is off the scale or missing. The builder picks a token and lists the choice on the docs "Deviations from Figma" page. Every such item is collected again in §5.
- **"no Figma spec"** means the file has nothing for that part: implement the inventory API with plan tokens.
- Colour values are Figma's; the contract re-points some tokens for contrast (ARCHITECTURE §15.3: `text/secondary`, `text/tertiary`, dark `text/critical`, dark `bg/subtle`, the dark border ladder). Components use token names, never primitives. Ratios below are WCAG 2.2 on the built values, light / dark; **dark numbers are computed, not rendered**.
- Every icon is a Lucide glyph (`Icon/<name>`, masters `738:*`, ghost-only; a specimen frame `7275:11886` "Icon components" sits on page 01). Native 20 px with a 1.6 px stroke; a 16 px instance draws 1.28 px (code: `strokeWidth={1.92}` on the 24 viewBox, ARCHITECTURE §14.2). Glyphs met this week: `Icon/package` `738:271`, `Icon/trash-2` `738:378`, `Icon/check` `738:111`, `Icon/chevron-right` `738:120`, `Icon/ellipsis` `738:166`, `Icon/bell` `738:87`.

---

## 1. Coverage

"Ghost" is the off-canvas master the file's instances use. "Subpath" is the plan's (ARCHITECTURE §5.2, inventory §3). "Plan tier" is ARCHITECTURE §9.5.

| Component | Subpath | Figma source (node) | Ghost | Existing notes | This read | Plan tier | Builder works from |
|---|---|---|---|---|---|---|---|
| Menu (rows) | `./menu` | Menu Item set `7275:11516` (4) in Doc/Menu `7275:11511` | `746:203`, **diffed identical** (§2) | figma/02 §5.9; inventory §3 Menu row | **read** | T1, client (RAC `MenuTrigger` + `Popover` + `Menu` + `SubmenuTrigger`) | set + Dropdown master |
| Menu (surface) | part `Menu.Popup` | **none on canvas**; standalone COMPONENT `746:204` "Dropdown Menu", one instance `7275:11537` | ghost-only (`746:204` has no parent) | figma/02 §5.12; figma/11 (divider) | **read** | — | master |
| Tabs | `./tabs` | Tab set `7275:14781` (3) in Doc/Tabs `7275:14777`; tab bar example frame `7275:14791` | `755:961`, **diffed identical** (re-diffed) | figma/06 §6.4, §7.1; figma/08 §4.5–4.9 | **read** + 4 composition strips | T1, client (RAC `Tabs` + `TabList` + `Tab` + `TabPanel`) | set + strips |
| TabNav | `./tabs` (same subpath, second namespace) | **none of its own**: the same Tab visual | `755:961` | figma/06 §6.4 ("Route/URL-backed views") | **read** (strips) | T0, server (native links, 0 KB) | Tab set + `aria-current` |
| Tooltip placement (with IconButton) | `./tooltip`, `./icon-button` (shipped) | Tooltip `746:262`; Icon Button set `7275:11357`; Top Bar `755:1031` | ghost-only / none / ghost-only | 12 §4.9, §4.10 | **read** | shipped | §4.6 |
| Select popup (reconciliation) | `./select` (shipped) | Select trigger `7275:11438`; the popup it opens is the Dropdown Menu `746:204` | `745:222` (not diffed) | figma/02 §5.5; 12 §4.8 | — (uses the Menu read) | shipped | §4.3 |

- **`./tabs` exports two compound namespaces** (Tabs and TabNav). ARCHITECTURE §6 (the "`component.json` drives the bookkeeping" paragraph) records that `component.json` cannot express that yet and needs a schema change before Tabs is built; `nz gen`'s component map attributes every Figma node of a multi-export manifest to its first export.
- Suggested `figma` blocks for `component.json` (ids only; `canonical`, `ghosts`, `variantsSeen`, `related`):
  - Menu: `canonical ["7275:11516"]`, `ghosts ["746:203"]`, `variantsSeen ["746:157", "746:167", "746:187"]` (the variants the Dropdown master instances; Selected `746:177` has no instance anywhere), `related ["746:204", "7275:11511"]`.
  - Tabs: `canonical ["7275:14781"]`, `ghosts ["755:961"]`, `variantsSeen ["755:952", "755:958"]`, `related ["7275:14791", "7275:14777"]`.
  - Select (already shipped) lists `746:204` under `related`; nothing to change.

---

## 2. Ghost masters (read)

| Component | On-canvas set → variants | Ghost → variants | Result |
|---|---|---|---|
| Menu Item | `7275:11516` → Default `11517`, Hover `11522`, Selected `11527`, Critical `11532` | COMPONENT_SET `746:203` → Default `746:157`, Hover `746:167`, Selected `746:177`, Critical `746:187` | **identical**: same property definitions (`Label#746:0`, `Shortcut#746:5`, `State`) and description; per variant every descendant's type, name, size, auto-layout, sizing, radius, fills, strokes, effect, text style, characters and property references compared, 0 differences in all four. The inventory's "ghost set not identified" is now `746:203` |
| Dropdown Menu | none | COMPONENT `746:204`, no properties, parent chain empty | ghost-only. One instance, `7275:11537` in the Doc/Menu Row, **no overrides**. Its six rows instance the **ghost** Menu Item: `746:207`, `746:229`, `746:239` (Default), `746:218` (Hover), `746:250` (Critical) |
| Tab | `7275:14781` → Default `14782`, Hover `14785`, Active `14788` | `755:961` → Default `755:952`, Hover `755:955`, Active `755:958` | identical (re-diffed this read, reactions aside: the copies' reactions point at their own set) |
| Tooltip | — | COMPONENT `746:262`, parent chain empty | ghost-only; one instance `7275:11538`, loose in the Doc/Menu Row |
| Icon Button | `7275:11357` (6) | none (12 §2) | **0 instances on every variant** |

Code Connect and `component.json` key both ids (§1). Nothing in the compositions instances a Menu, a Tooltip or an Icon Button: row "…" menus, the account menu and the notifications button are drawn bare (§4.6; figma/08 TL;DR 9).

---

## 3. Rules that apply to several components

- **Spacing and size are unbound everywhere on these sets.** Only colours, text styles, the effect style and `radius/sm` (Menu Item) and `radius/lg` (Dropdown) are bound. Raw values on the scale: 2 → `--nz-space-0-5`, 4 → `--nz-space-1`, 6 → `--nz-space-1-5`, 8 → `--nz-space-2`, 24 → `--nz-space-6`. **Off-scale: 10 (Menu Item padding and gap, group label start, Tab gap) and 36 (Menu Item height).**
- **Strokes are included in layout** on the Dropdown master: the first child sits at 7 = 1 (stroke) + 6 (padding), and the master is 262 = 248 + 2 × 6 + 2 × 1. That is CSS `border` + `padding` with `box-sizing: border-box`; nothing to compensate. The Tab strips report `strokesIncludedInLayout` too (41 = 40 + 1).
- **Interaction states in Figma become CSS or ARIA, never props.** Menu Item Hover → `[data-highlighted]` (pointer and keyboard); Selected → `[data-checked]` on checkbox and radio items (inventory); Critical → `tone="critical"` (the inventory's name; figma/02 §5.9 wrote `intent`). Tab Hover → `@media (hover: hover) { :hover }`; Active → `[data-selected]` (Tabs) or `[aria-current='page']` (TabNav).
- **Focus is not drawn** on Menu Item, Tab or the Dropdown. Code: the generated 2 px outline (`outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px`) from `component.json` `interactive` (for example `menu-trigger`, `menu-item`, `tabs-tab`, `tab-nav-link`) with `focusTarget: "self"`; `base.css` already matches `[data-focus-visible]` and offers `[data-focus-inset]` (offset −2 px) for items that sit flush or inside a clipping box. `border/focus` is 4.66 / 6.87 on `bg/surface-raised`, 4.34 / 5.87 on `bg/hover` (covered by the existing `border-focus` row).
- **Motion in the prototypes:** hover is `ON_HOVER` smart-animate **160 ms**, custom cubic (0.2, 0, 0, 1) (Menu Item Default → Hover, Tab Default → Hover); Tab Hover → Active is `ON_CLICK` **220 ms**. Code: `--nz-duration-fast` (140 ms) + `--nz-easing-standard` for colour (ARCHITECTURE §13.2 rule 2, C35); 220 ms is `--nz-duration-base`.
- **Icon colour** is a stroke on the instance's vectors bound to `icon/*` (Menu Item: `icon/secondary`, `icon/brand`, `icon/critical`). Code uses `currentColor` and sets `color` on the icon part.
- **Shortcut text** is plain Mono/M `{text/tertiary}` in both Menu Item and Tooltip, not a key box. The shipped `tooltip.css` resets the Kbd frame (`.nz-tooltip-popup .nz-tooltip-shortcut { padding: 0; border: 0; background: none }`); Menu's shortcut follows the same precedent and keeps `aria-keyshortcuts` on the item (W3 review fix).

---

## 4. Per component

### 4.1 Menu: the row (Menu Item)

**Figma:** set `7275:11516`, ghost `746:203` (identical, §2). Read. Description: "Row inside Dropdown Menu / Command Menu. Hover bg/hover, selected bg/brand-subtle + check." Doc text `7275:11513/14`: "Grouped actions with shortcuts. Destructive items sit last, after a divider."

Props → code (inventory, figma/02 §5.9): `State=Hover` → `[data-highlighted]`; `State=Selected` → `[data-checked]` on `Menu.CheckboxItem` / `Menu.RadioItem` (a plain action item has no selected state); `State=Critical` → `tone="critical"`; `Label#746:0` (TEXT "Duplicate product") → children; `Shortcut#746:5` (TEXT "⌘D") → `shortcut` (renders `Kbd`). The leading icon and the check have **no boolean** in Figma: code makes `icon` an optional slot and the check an internal glyph through the `indicator` slot (ARCHITECTURE §14.2). Link items: `href` or `render={<Link/>}` (ARCHITECTURE §9.2 rule 3).

| Part | Figma value | Token |
|---|---|---|
| Row | horizontal auto-layout, **248 × 36** (fixed in the set; 248 = the popup's inner width), items centred, start-aligned | width: fill the popup; height **off-scale** (36 sits between `--nz-size-control-sm` 32 and `-md` 40): builder decides (a private `--_nz-menu-item-height: 2.25rem` as `min-block-size`, or padding-block `--nz-space-2` around the 21 px line = 37) |
| Padding | 0 / **10 !** / 0 / **10 !** | inline **off-scale**: builder decides (`--nz-space-2` or `--nz-space-3`; the shipped Select item uses `--nz-space-3`) |
| Gap (icon → label → shortcut → check) | **10 !** | **off-scale**: builder decides (`--nz-space-2` or `--nz-space-3`) |
| Radius | `{radius/sm}` | `--nz-radius-sm` |
| Leading icon | INSTANCE `Icon/package` 16 × 16, stroke 1.28 `{icon/secondary}` | `--nz-size-icon-sm`, `--nz-icon-secondary`, `aria-hidden` |
| Label | TEXT, Body/M, `{text/primary}`, **fill width, auto height (wraps)**, no truncation | `--nz-font-body-m`, `--nz-text-primary`; `flex: 1` |
| Shortcut | TEXT, Mono/M, `{text/tertiary}`, hug | `--nz-font-mono-m`, `--nz-text-tertiary` (6.48 / 6.23 on `bg/surface-raised`; Figma's n500 was 4.31) |
| Check | INSTANCE `Icon/check` 16 × 16, **hidden** except Selected; last child (after the shortcut) | `--nz-size-icon-sm`, internal `check` glyph |

| State | Fill | Leading icon | Label | Shortcut | Check |
|---|---|---|---|---|---|
| Default | none | `{icon/secondary}` | `{text/primary}` | visible | hidden |
| Hover | `{bg/hover}` | `{icon/secondary}` | `{text/primary}` | visible | hidden |
| Selected | `{bg/brand-subtle}` | `{icon/brand}` | `{text/brand}` | **hidden** | **visible**, `{icon/brand}` |
| Critical | none | `Icon/trash-2`, `{icon/critical}` | `{text/critical}` | visible (`{text/tertiary}`) | hidden |

Code: `[data-highlighted]` → `--nz-bg-hover`; `[data-checked]` → `--nz-bg-brand-subtle`, `--nz-text-brand`, icons `--nz-icon-brand`; `[data-tone='critical']` → `--nz-text-critical`, icon `--nz-icon-critical`. Ratios: `text/brand` on `bg/brand-subtle` 7.49 / 7.37; `text/critical` on `bg/hover` 5.29 / 4.62; all covered by existing rows (§6).

- **The highlight fill is not a focus indicator.** `bg/hover` on `bg/surface-raised` is **1.08 light / 1.17 dark**, so it is a pointer hint only. Keyboard focus must be the generated outline on `.nz-menu-item[data-focus-visible]`; because rows sit 2 px apart inside a 6 px padded popup that may scroll, `data-focus-inset` (outline inside the row) is the likely choice: builder decides. The shipped Select item has the same 1.08 fill and relies on the same outline.
- **Selected puts the check at the end, in the shortcut's place**, and keeps the leading icon (recoloured). The shortcut is hidden while selected. A leading check column (common in checkbox menus) would be a Deviations entry. How a **radio** item marks its selection is not drawn (the same check, or a dot): builder decides.
- **The single `State` axis mixes highlight, selection and intent** (figma/02 §5.9), so these combinations are not drawn: Selected + Hover, Critical + Hover, Disabled. Builder decides: checked + highlighted keeps `--nz-bg-brand-subtle` (or switches to `--nz-bg-hover` with `--nz-text-brand`, 7.91 / 5.87); critical + highlighted uses `--nz-bg-hover` (or `--nz-bg-critical-subtle`); disabled uses `--nz-text-disabled` for label and icon, as Select's item does.
- **Not drawn:** submenu trigger (glyph `Icon/chevron-right` `738:120` exists, used at 16 px in Breadcrumb; it must mirror in RTL with `data-mirror="rtl"`), a description line, a group with a checkbox or radio heading, long-label truncation, max height and scrolling, loading.
- **Motion (prototype):** Default → Hover `ON_HOVER` 160 ms on the set and on every Default row inside the Dropdown master. Code: background on `--nz-duration-fast` or none; an instant highlight keeps keyboard travel crisp: builder decides.
- **Touch:** 36 px rows are above 24 (WCAG 2.5.8) and below 44 (`size/touch-min`).

### 4.2 Menu: the surface (Dropdown Menu)

**Figma:** standalone COMPONENT `746:204` (ghost-only, no properties), instance `7275:11537`. Read. Description: "Popover menu. Enter: scale 0.96→1 + fade, easing/spring, origin = trigger. Exit: fade 140ms."

| Part | Figma value | Token |
|---|---|---|
| Popup | vertical auto-layout, **hug** (262 × 237), padding **6 !** all sides, gap **2 !** between children | padding `--nz-space-1-5`; gap `--nz-space-0-5` |
| Radius | `{radius/lg}` | `--nz-radius-lg` |
| Fill | `{bg/surface-raised}` | `--nz-bg-surface-raised` |
| Stroke | `{border/subtle}` 1 ! inside | `--nz-border-width-default` solid `--nz-border-subtle` |
| Effect | `Elevation/3 Popover` | `--nz-elevation-3` |
| Group | FRAME, hug (62 × 30), padding **6 ! / 0 / 4 ! / 10 !**, clips | block `--nz-space-1-5` / `--nz-space-1`; inline-start must equal the item's inline padding (both 10) so the label lines up with the row icons: map both to **the same** token (builder decides which, §4.1) |
| Group label | TEXT "Product", Label/M, `{text/tertiary}` | `--nz-font-label-m`, `--nz-text-tertiary` |
| Divider | RECTANGLE 248 × 1, fill `{border/subtle}`, inset by the popup padding (not edge to edge), spaced only by the 2 px gaps | `block-size: var(--nz-border-width-default)`, `--nz-border-subtle`; `role="separator"` from the engine |

Content order (read): group label "Product" → Default "Edit product ⌘E" → Hover "Duplicate product ⌘D" → Default "Preview on store ⌘P" → Default "Print barcode labels ⌘L" → divider → Critical "Delete product ⌫". Code: `Menu.Group` + `Menu.GroupLabel` around the four actions, `Menu.Separator`, then the critical item outside the group. Figma's ⌘ glyphs are Apple-only; `Kbd` resolves `mod` per platform (`data-nz-platform` from ThemeScript).

- **Width:** hug (262 = 248 + 2 × 6 + 2 × 1). No minimum is drawn; the shipped Select popup uses `min-inline-size: var(--nz-trigger-width)`. A Menu opened from a 20 px "…" icon would be narrower than its rows, so Menu needs its own minimum: builder decides (content width, or a private `min-inline-size`).
- **Dark mode double edge:** `--nz-elevation-3` already adds a 1 px `--nz-elevation-ring` (white 8 %) in dark, and Figma adds a `border/subtle` stroke. Both together draw two edges in dark. Builder decides: keep the border (it is also what forced colours repaint, `stateIndicator` paint `border`) and accept the ring, or drop one.
- **Placement and offset: not drawn.** The master sits loose in the Row frame, 32 px from the Menu Item set, with no trigger; "origin = trigger" is the only placement fact. Code: `side="bottom"`, `align="start"`, offset as the shipped Select (`sideOffset = 8`): builder decides.
- **Motion** (description; ARCHITECTURE §13.2 rule 1, §13.3): `scale` from `--nz-scale-enter` on the spring pair; opacity reuses the spring's duration on a normal easing; exit fades on `--nz-duration-fade` + `--nz-easing-exit`; `transform-origin: var(--nz-transform-origin)` (the engine's trigger-side origin). The shipped precedent is `packages/react/src/dialog/dialog.css` lines 43–55 (condensed here):

  ```css
  transition:
    scale var(--nz-duration-spring) var(--nz-easing-spring),
    opacity var(--nz-duration-spring) var(--nz-easing-enter);
  &[data-entering] { opacity: 0; scale: var(--nz-scale-enter); }
  &[data-exiting] { opacity: 0; transition: opacity var(--nz-duration-fade) var(--nz-easing-exit); }
  ```

  Reduced: scale 1, spring 120 ms linear, fade 120 ms, so the fade survives. Not prototyped in Figma.
- **Forced colours:** the popup border `1px solid CanvasText` via `stateIndicator` `{ slot: "menu-popup", paint: "border" }` (every `"overlay": true` component must list it); a checked item needs `{ slot: "menu-item", state: "[data-checked]", paint: "highlight" }`, repeated in the component stylesheet as `select.css` does for `[data-selected]` (its `[data-highlighted]` background wins otherwise).
- **Not drawn:** max height and scroll, a search or filter row, an empty state, a mobile sheet presentation, nested (submenu) surfaces.

### 4.3 Select popup vs the Dropdown Menu master (reconciliation)

The Select trigger's description says it "Opens Dropdown Menu or Date Range Picker on Elevation/3", and figma/02 §5.9 says Select options reuse the Menu Item visual. The shipped `packages/react/src/select/select.css` popup (W1 skeleton) differs on most rows. Week 4's `select.css` pass and Menu should share one item recipe:

| Property | Dropdown Menu `746:204` + Menu Item | Shipped `select.css` | Note |
|---|---|---|---|
| Popup radius | `{radius/lg}` (16) | `--nz-radius-md` (12) | → `--nz-radius-lg` |
| Popup edge and shadow | `{border/subtle}` 1 + Elevation/3 | `--nz-elevation-4`, no border | → `--nz-elevation-3` + border (dark double edge, §4.2) |
| Popup fill | `{bg/surface-raised}` | `--nz-bg-surface-raised` | same |
| List padding | 6 | `--nz-space-1-5` | same |
| Gap between rows | 2 | 0 | → `--nz-space-0-5` |
| Row height and padding | 36, inline 10, block 0 (centred) | block `--nz-space-2`, inline `--nz-space-3` (37 tall) | builder decides once for both (§4.1) |
| Row font | Body/M | inherits (no `font` on the item) | → `--nz-font-body-m` |
| Highlight | `{bg/hover}` | `--nz-bg-hover` | same |
| Selected | `{bg/brand-subtle}`, `{text/brand}`, `{icon/brand}`, trailing check | `font-weight: 600` only | → the Menu Item Selected look |
| Group label | Label/M `{text/tertiary}`, padding 6 / 0 / 4 / 10 | `--nz-font-label-s`, `--nz-text-secondary`, inline `--nz-space-3` | → Label/M + `--nz-text-tertiary` (12 px would be a Deviations entry) |
| Separator | 1 px `{border/subtle}`, spaced by the 2 px gaps | `margin-block: var(--nz-space-1-5)` | builder decides (Figma's spacing is tighter) |
| Disabled | not drawn | `--nz-text-disabled` | keep |
| Enter motion | scale 0.96 → 1 on the spring + fade | opacity on `--nz-duration-fast` (0 ms when reduced) | → §4.2 motion; at least move the entry fade to `--nz-duration-fade` |

### 4.4 Tabs

**Figma:** set `7275:14781`, live ghost `755:961` (identical, §2). Read. Description: empty. Doc text `7275:14780`: "Underline tabs switch views; the segmented control switches ranges." So Tabs are the WAI-ARIA tabs pattern (or TabNav links), never a radio group (figma/06 §7.1).

Props → code (inventory): `State=Default | Hover` → CSS; `State=Active` → `[data-selected]` through `value` / `defaultValue` / `onValueChange`; `Label#755:29` (TEXT "All orders") → children of `Tabs.Tab`. Parts: Tabs Root, List, Tab, Panel. New (not drawn): `disabled`, icon and count slots, `orientation`, `activationMode`.

| Part | Figma value | Token |
|---|---|---|
| Tab | vertical auto-layout, hug × **40**, padding **8 ! / 2 ! / 0 / 2 !**, gap **10 !**, items centred, no fill | height `--nz-size-control-md`; block-start `--nz-space-2`; inline `--nz-space-0-5`; gap **off-scale** (it only places the indicator at the bottom: 8 + 20 + 10 + 2 = 40, so code can pin the indicator to the bottom edge instead) |
| Label | TEXT, hug, 20 tall | Default `--nz-font-label-m` + `--nz-text-secondary`; Hover `--nz-text-primary`; Active `--nz-font-label-m-strong` + `--nz-text-primary` |
| Indicator | RECTANGLE fill width × **2**, at the bottom of the tab (y 38–40), inside the 2 px inline padding | no token: 2 px = `--nz-border-width-focus`'s value (figma/06 proposes `--nz-tab-indicator-size: var(--nz-border-width-focus)`); builder decides. Draw it with `::before` or an inset `box-shadow`: `::after` is reserved for the hit area |
| Tab list ("strip") | FRAME, horizontal, padding 0, **gap 24 !**, bottom stroke `{border/subtle}` 1 inside (0 / 0 / 1 / 0), clips; hug in the doc example (391 × 41), **fill width** in the compositions | gap `--nz-space-6`; `border-block-end: var(--nz-border-width-default) solid var(--nz-border-subtle)` |

| State | Label | Indicator | Code |
|---|---|---|---|
| Default | Label/M `{text/secondary}` | none (the 2 px space is kept) | `--nz-text-secondary` (9.54 on `bg/surface`, 8.87 on `bg/canvas` light; covered) |
| Hover | Label/M `{text/primary}` | `{border/strong}` | `@media (hover: hover)`; `--nz-border-strong` (1.57 / 2.68 on `bg/surface`: a hover hint only, decorative) |
| Active | **Label/M Strong** `{text/primary}` | `{bg/brand}` ! (a background token as an indicator) | `[data-selected]`: `--nz-bg-brand` (8.51 / 5.32 on `bg/surface`, 7.91 / 5.73 on `bg/canvas`; covered by the existing `bg-brand` row) |

- **The indicator sits on top of the hairline, it does not overlap it.** The strip is 41 tall (40 + the 1 px inside stroke, strokes included in layout); the indicator fills y 38–40 of the tab and the hairline y 40–41 of the strip. Code that pulls the tab down with `margin-block-end: -1px` to cover the hairline would deviate: builder decides.
- **Width jump:** Active is Label/M Strong (600), Default and Hover Label/M (500): "All orders" grows 67 → 69, "Unfulfilled" 73 → 75. Reserve the bold width; SegmentedControl shipped the same fix in week 3 (a hidden bold copy of the label in the same grid cell; D-ab), so reuse it.
- **Hit area:** inline padding is 2, so the target is the text width plus 4: "All" is **22 × 40**. It passes WCAG 2.5.8 only through the spacing exception (the 24 px gap); the gap itself is dead space. Builder decides: widen the inline padding (moving the gap into the tab), or `nz-hit-target`.
- **Focus: not drawn.** The generated outline with a 2 px offset would cross the hairline and be cut by a scrolling list (`overflow-x: auto`): `data-focus-inset` is the likely choice; builder decides. Keyboard: arrows move, Home/End, roving tabindex (RAC).
- **Panel: no Figma spec** (no `tabpanel` node anywhere). Spacing after the strip in the compositions (figma/08 §4.5): the Products and Orders toolbars stack the strip and the filters at gap 16 (`--nz-space-4`) inside padding 16 / 24.
- **Motion (prototype):** Default → Hover `ON_HOVER` 160 ms; Hover → Active `ON_CLICK` 220 ms; a per-tab cross-fade. **No sliding indicator is specified** (figma/06 §6.4); one would be an optional enhancement, off when reduced.
- **Not drawn:** Disabled, icon or count slots, overflow (scroll buttons or fade), vertical orientation, sizes, a contained/pill variant. Page 10's profile tabs (`7275:20790`, 130 × 48, icon-only, `bg/inverse` indicator) are a custom frame, not this set (v0.2 storefront).

Strips found (read; every Tab instance's parent):

| Strip | Where | Size | Tabs (active first) |
|---|---|---|---|
| `7275:14791` "Example · Tab bar" | Doc/Tabs, page 06 | 391 × 41, hug | All orders · Unfulfilled · Unpaid · Open · Archived |
| `7275:15780` "Tabs" | Pattern 1 Products, Toolbar `7275:15779` | 1078 × 41, fill | All · Active · Draft · Archived |
| `7275:16023` "Tabs" | Pattern 3 Orders, Toolbar `7275:16022` | 1078 × 41, fill | Unfulfilled (active) · All · Unpaid · Open · Archived |
| `7275:16140` "Tabs" | Pattern 4 Customers, Content `7275:16101` | 1128 × 41, fill | VIP (active) · All · Subscribers · At risk |
| `7275:16253` "Tabs" | Pattern 5 Discounts, Content `7275:16208` | 1128 × 41, fill | All · Active · Scheduled · Expired |

All five: gap 24, padding 0, bottom `{border/subtle}` 1 px, clip; tabs left-aligned and hugging (no equal-width layout). Every composition strip is a status filter over a list, which figma/06 §7.1 maps to **TabNav** (URL query state); none is drawn with panels.

### 4.5 TabNav

**No Figma component.** TabNav is the Tab visual (§4.4) on links: `<nav aria-label>` + a list of `<a>`, the current one `aria-current="page"` (figma/06 §6.4, §7.2). Server-safe, 0 KB (ARCHITECTURE §9.5, risk R11).

- Every value in §4.4 applies; the Active row maps to `[aria-current='page']` instead of `[data-selected]`.
- Link composition: `render={<Link href="…" />}` (ARCHITECTURE §9.2 rule 3; Button's example uses the same form).
- Focus: native `:focus-visible` on the link, `focusTarget: "self"`.
- Keyboard: Tab between links (native); no arrow-key roving (a nav landmark, figma/06 §6.1).
- Forced colours: the active link's indicator is a background and is repainted, so the current page needs a visible non-colour mark; the Label/M Strong weight already carries it. Builder decides whether to add `stateIndicator` `{ slot: "tab-nav-link", state: "[aria-current='page']", paint: "highlight" }` (or a `CanvasText` indicator).
- **Not drawn:** a vertical sub-nav. The Settings sub-nav (Pattern 7, `7275:16412`, Nav Item × 7, gap 4, 232 wide) is a NavList built from Nav Items (figma/08 §4.11), not TabNav.

### 4.6 Tooltip and IconButton placement (gaps left by week 3)

**No frame places a Tooltip on a trigger.** The only Tooltip instance (`7275:11538`, 125 × 43) sits loose in the Doc/Menu Row, and the Icon Button set has 0 instances (§2). So offset, side and alignment relative to a trigger are not specified anywhere; the shipped values (`side="top"`, `sideOffset = 8` in `tooltip.client.tsx`; IconButton passes `tooltip.side`) stay builder choices.

- **Master geometry (read):** root vertical auto-layout, gap 0, children centred on the cross axis: bubble 126 × 36, then the arrow (POLYGON 12 × 7, `{bg/inverse}`, pointing down, centred by the auto-layout). The arrow touches the bubble. If code adds an arrow (`OverlayArrow`), the offset should include its 7 px; the shipped `tooltip.css` draws none (a Deviations entry).
- **The trigger that most needs a tooltip is not the Icon Button set.** The Top Bar (`755:1031`, 71 tall, padding 14 / 32, gap 24, `{bg/canvas}`) ends with:
  - "Notifications" `755:1040`: FRAME **40 × 40, radius 999** (a circle, `--nz-radius-full`), `{bg/surface}`, `{border/default}` 1, `Icon/bell` 20 centred, plus an **8 × 8 ELLIPSE `{bg/critical}`** unread dot at (24, 9). The Icon Button set is radius/md 12 with no badge, so this is a composition deviation: either IconButton supports a round shape and a dot (not in the inventory API), or the docs list it. Builder decides.
  - "Avatar" `755:1045`: a 40 px image ellipse, the implied account-menu trigger (a Menu trigger, inventory "Account menu" row, docs v0.2).
  - Both sit 15 px from the top of a bar at the top of the viewport, so a `side="top"` tooltip has no room and must open below. React Aria flips on collision; the IconButton docs example already passes `tooltip={{ side: 'bottom' }}`.
- **Menu triggers in the compositions are bare icons:** Card header "Action" (`7275:13767`, `Icon/ellipsis` 20 `{icon/secondary}` at the end of a 24 px header row) and Product Row "More" (`753:432`, `Icon/ellipsis` 20 at the end of a 65 px row, padding 12 / 20, glyph colour not overridden). Both are 20 × 20 targets. Plan (figma/04 §12 item 5, figma/05 §3.3): `IconButton` (sm, 32) as `Menu.Trigger` via `render`, with `label` as the name.
- `Icon/ellipsis` is used 14 times (direct instances), also inside the Mobile Tab Bar "More" item (`764:3438`, v0.2).

---

## 5. Builder decides (consolidated)

Each item is a Figma value that is off the scale, missing a token, or not drawn. List the choice on the docs "Deviations from Figma" page.

| # | Component | Figma | Options |
|---|---|---|---|
| 1 | Menu, Select | row height 36 | private `2.25rem` min-block-size, or `--nz-space-2` block padding (37) |
| 2 | Menu, Select | row inline padding and gap 10 | `--nz-space-2` or `--nz-space-3` (one choice; the group label's inline start follows it) |
| 3 | Menu | checked + highlighted, critical + highlighted, disabled (not drawn) | §4.1 |
| 4 | Menu | radio item mark (not drawn) | the check, or a dot |
| 5 | Menu | check at the end, replacing the shortcut | keep, or a leading check column |
| 6 | Menu | keyboard focus (fill is 1.08 / 1.17) | generated outline, likely `data-focus-inset` |
| 7 | Menu | popup minimum width (hug in Figma) | content width or a private minimum |
| 8 | Menu, Select | dark double edge (border + elevation ring) | keep the border, drop one |
| 9 | Menu | placement and offset (not drawn) | `bottom` / `start`, offset 8 as Select |
| 10 | Menu | 160 ms highlight fade | `--nz-duration-fast` or instant |
| 11 | Select | popup radius, elevation, gaps, selected look, group label, separator, entry motion | §4.3 |
| 12 | Tabs, TabNav | indicator 2 px, no token | private, or `--nz-border-width-focus` |
| 13 | Tabs, TabNav | indicator above vs over the hairline | keep Figma's stacking, or overlap by 1 px |
| 14 | Tabs, TabNav | bold width jump 67 → 69 | reserve the bold width (SegmentedControl's fix) |
| 15 | Tabs, TabNav | inline padding 2 (22 px "All" target) | wider padding, or `nz-hit-target` |
| 16 | Tabs, TabNav | focus (not drawn) | generated outline, likely `data-focus-inset` |
| 17 | Tabs | gap 10 label → indicator | pin the indicator to the bottom; no token needed |
| 18 | Tabs, TabNav | disabled, icon, count, overflow, vertical, sizes (not drawn) | plan tokens |
| 19 | TabNav | forced-colours mark for the current link | weight only, or a `stateIndicator` |
| 20 | Tooltip | arrow 12 × 7, offset | none (shipped) or `OverlayArrow` + offset including 7 px |
| 21 | IconButton | Top Bar's round 40 px button with an unread dot | support a round shape and dot, or list it |
| 22 | All | 160 ms hover, 220 ms click | `--nz-duration-fast`, `--nz-duration-base` (C35) |

---

## 6. Contrast pairs the integrator must add

`packages/tokens/src/code-owned/a11y/contrast-pairs.json` already covers almost everything this week paints (do not duplicate): `text-primary`, `text-secondary`, `text-tertiary`, `text-critical` and `text-brand` on `surfaces` (which includes `bg-surface-raised` and `bg-hover`); `text-brand` and `icon-brand` on `bg-brand-subtle`; `icon-secondary`, `icon-critical` and `icon-brand` on `surfaces`; `bg-brand` on `surfaces` (the tab indicator on `bg-surface`, `bg-subtle` and `bg-canvas`); `border-focus` on `surfaces` and `bg-brand-subtle`; `text-disabled` on `surfaces`; `border-subtle` and `border-strong` on `panels` (decorative). Inverse surfaces (Tooltip) use the other theme's rows.

New rows (values on the built `tokens.css`, light / dark):

| Foreground | On | Role | Light | Dark | Why |
|---|---|---|---|---|---|
| `bg-hover` | `bg-surface-raised` | decorative | 1.08 | 1.17 | Menu and Select item highlight: recorded so the gate shows it is a hint, not the focus indicator (§4.1) |
| `bg-brand-subtle` | `bg-surface-raised` | decorative | 1.14 | 1.07 | Menu checked item fill: the check glyph and `text-brand` carry the state |
| `text-primary` | `bg-brand-subtle` | text | 15.29 | 15.68 | only if the checked item keeps `text-primary` (Figma uses `text-brand`) |
| `text-tertiary` | `bg-brand-subtle` | text | 5.71 | 6.68 | only if a checked item keeps its shortcut visible (Figma hides it) |

`use` notes to add on existing rows: `bg-brand` "Tabs and TabNav active indicator" (7.91 / 5.73 on `bg-canvas`, 8.51 / 5.32 on `bg-surface`); `icon-brand` on `bg-brand-subtle` "Menu checked item glyph"; `text-critical` and `icon-critical` on `surfaces` "Menu critical item (also highlighted)" (5.29 / 4.62 on `bg-hover`); `border-strong` "Tab hover indicator" (decorative, 1.57 / 2.68 on `bg-surface`).

---

## 7. Extraction gaps

- No screenshots: every dark-mode number is computed from token values, not rendered, and the dark double edge (§4.2) is inferred from `--nz-elevation-3`'s definition.
- On-canvas Menu Item `7275:11516` instance counts were not read; the ghost's instances (all inside `746:204`) were. The Select ghost `745:222` is still not diffed.
- The Product Row "More" glyph and the Top Bar bell returned no bound stroke colour (their vectors were not reached by the read); the Card header's ellipsis is `{icon/secondary}`.
- The Dropdown master's `strokesIncludedInLayout` flag was not printed; the positions (first child at 7, width 262) show it.
- `Icon/*` ids were scanned only in `738:1`–`738:460` (74 masters found).
- Nothing in the file specifies Tabs panels, Menu submenus, menu scroll behaviour, or any tooltip, menu or tab state in dark mode.
