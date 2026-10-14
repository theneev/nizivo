# Week 3 forms and actions: Figma facts for builders

- File: `BIzJFf1wm8KP0YG2AVI1tP` ("Grove UI Library" when read, now "Nizivo UI Library"; ships as **Nizivo UI**). Open a node with `https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Nizivo-UI-Library?node-id=<id with : replaced by ->`.
- Scope: the week 3 entries of ARCHITECTURE §21.1 (W3–4, first half): Field + Fieldset, Input, Textarea, Checkbox, RadioGroup + Radio, Switch, SegmentedControl, NativeSelect, IconButton, and Tooltip as IconButton pairs it. Menu, Tabs, TabNav, the overlay engine and the icons package are week 4 and not covered here.
- Read 2026-10-14. **5 Figma calls in total, all read-only `use_figma` scripts that only returned data** (no setters, no create, no remove, no renames; no `get_design_context`, no screenshots). Nothing in the file changed.
  - Call 1 read the exact anatomy of Input `7275:11397`, Select `7275:11438`, Icon Button `7275:11357` and the Tooltip master `746:262`.
  - Call 2 read Checkbox `7275:11456`, Radio `7275:11479`, Switch `7275:11494` (including the glyph vectors inside the checkbox boxes), Segment `7275:14797` and the two segmented-control track frames `7275:14802` and `7275:18903`.
  - Call 3 scanned node ids for off-canvas ghost sets and diffed them. It exceeded the 20 KB return cap, so nothing came back; call 4 re-ran it with compact output (counts and first differences only). No data was lost.
  - Call 5 read the Checkbox ghost's glyph and every form control used in the Product detail (`7275:15860`) and Settings (`7275:16412`) compositions.
- Everything else comes from the existing notes (`00`–`11` in this folder), [component-inventory.md](../component-inventory.md), [ARCHITECTURE.md](../ARCHITECTURE.md) and the built token contract. Each fact says where it came from: "read" means one of the calls above; `figma/NN §x` means an existing note.

## 0. How to read this

- **Token names** are the names in `packages/tokens/dist/contract.json`, built on 2026-10-14 with `pnpm --filter @nizivo/tokens build` (236 tokens). The Figma variable is in brackets: `--nz-bg-muted` [bg/muted]. Colours have no `--nz-color-*` prefix. Space and radius are rem (`--nz-space-1-5` = 0.375rem); border widths stay px.
- **Code-owned tokens** that Figma does not have are already in the contract (ARCHITECTURE §7.6, §15.3; `packages/tokens/CONTRAST.md` "Proposals"). This week uses `--nz-border-control`, `--nz-border-control-hover`, `--nz-text-on-critical`, `--nz-bg-critical-hover`, `--nz-duration-fade`, `--nz-duration-spring` and `--nz-easing-spring` (a precomputed `linear()`), and `--nz-focus-halo`. They are never Figma bindings.
- **Text styles** are `--nz-font-<style>` shorthands (`--nz-font-label-m` [Label/M], `--nz-font-body-m` [Body/M], `--nz-font-body-m-strong`, `--nz-font-label-m-strong`, `--nz-font-mono-m`), with tracking in `--nz-tracking-<style>`.
- **`{x}`** means bound to variable `x` in Figma. **`!`** means hard-coded (not bound to any variable or style). After a bound token, `!` marks a semantic misuse (a text token used as a shape fill), or a binding straight to a primitive, which is mode-blind.
- **"builder decides"** means Figma's value is off the scale or missing. The builder picks a token and lists the choice on the docs "Deviations from Figma" page. Every such item is collected again in §5.
- **"no Figma spec"** means the file has nothing for that part: implement the inventory API with plan tokens.
- Colour values are Figma's. The contract re-points some tokens for contrast (ARCHITECTURE §15.3): `text/secondary`, `text/tertiary`, dark `text/critical`, dark `bg/subtle` (n925), the dark border ladder. Components use token names, never primitives (`--nz-p-*` is banned outside tokens), so the overrides apply without component changes. Ratios below are WCAG 2.2 on the built values.
- Every icon is a Lucide glyph (`Icon/<name>`, masters `738:*`, ghost-only), native 20 px with a 1.6 px stroke. Instances are scaled, so a 16 px icon draws 1.28 px and a 14 px icon 1.12 px (code: `strokeWidth={1.92}` on the 24 viewBox, ARCHITECTURE §14.2). Glyphs met this week: `Icon/search` `738:314`, `Icon/calendar` `738:98`, `Icon/chevrons-up-down` `738:127`, `Icon/check` `738:111`, `Icon/minus` `738:262`, `Icon/bell` `738:87`, `Icon/x` `738:423`, `Icon/circle-x` `738:141`.

---

## 1. Coverage

"Ghost" is the off-canvas master the file's instances use. "Subpath" is the plan's (component-inventory §1 and §6; one subpath per component, ARCHITECTURE §23.4 D-h). "Plan tier" is ARCHITECTURE §9.5.

| Component | Subpath | Figma source (node) | Ghost | Existing notes | This read | Plan tier | Builder works from |
|---|---|---|---|---|---|---|---|
| Field, Fieldset | `./field` (Field, Fieldset, `useFieldControl`) | no set; anatomy inside Input `7275:11397` | Input ghost `745:187` | figma/02 §5.4; figma/11 §4.18 | **read** (Input) + compositions | T0 shell + `FieldScope` leaf, split | Input anatomy + plan §10.6, §16.1 |
| Input | `./input` | set `7275:11397` (6) | `745:187`, **diffed identical** | figma/02 §5.4 | **read** | T0 in a thin client leaf | set |
| Textarea | `./textarea` | **none**; implied by the single-line "Description" Input in `7275:15860` | — | inventory §4.1 | **read** (composition) | T0 in a thin client leaf | **no Figma spec**: Input skin + plan §16.1 |
| Checkbox | `./checkbox` | set `7275:11456` (6) | `745:284`, **identical at instance level** (§2) | figma/02 §5.6; figma/05 §3.3 | **read** | T0 in a thin client leaf | set |
| RadioGroup, Radio | `./radio-group` | set `7275:11479` (4) | **none found** (§2) | figma/02 §5.7; figma/05 §3.8 | **read** | T0 in a thin client leaf | set |
| Switch | `./switch` | set `7275:11494` (4) | `745:286`, **diffed identical** | figma/02 §5.8; figma/08 §4.6, §4.11 | **read** + compositions | T0 in a thin client leaf | set |
| SegmentedControl | `./segmented-control` | Segment set `7275:14797` (2); track frames `7275:14802`, `7275:18903` | `755:982`, diffed identical (figma/06) | figma/06 §6.5; figma/08 §4.2 | **read** | T0 in a thin client leaf | set + track frames |
| NativeSelect | `./native-select` | **none of its own**; shares the Select trigger skin `7275:11438` | Select ghost `745:222` (not diffed) | figma/02 §5.5 | **read** (Select) | T0, server | Select trigger skin + shipped `select.css` |
| IconButton | `./icon-button` | set `7275:11357` (6) | **none found** (§2) | figma/02 §5.2 | **read** | T0 + T1 tooltip, split | set + Button's matrix |
| Tooltip (with IconButton) | `./tooltip` (shipped W1) | standalone COMPONENT `746:262` (instance `7275:11538` in the Menu row) | ghost-only (`746:262` has no parent) | figma/02 §5.11 | **read** | T1, client | master + shipped `tooltip.css` |

Seven of these have their own Figma set. Field, Fieldset, Textarea and NativeSelect have none (inventory §1).

---

## 2. Ghost masters (read)

Call 4 fetched every id in 744:230–345, 745:140–330 and 746:195–275 and kept the component sets. It found `744:263` Button, `744:315` Badge, `745:187` Input, `745:222` Select, `745:284` Checkbox, `745:286` Switch and `746:203` Menu Item (the inventory lists Menu Item's ghost as "not identified"; week 4 can use this id). It compared property definitions and, per variant, every descendant's type, name, size, auto-layout, radius, fills, strokes, effect style, text style, characters and component-property references.

| Component | On-canvas set → variants | Ghost set → variants | Result |
|---|---|---|---|
| Input | `7275:11397` → Default `11398`, Hover `11404`, Focus `11410`, Filled `11416`, Error `11422`, Disabled `11428` | `745:187` → `745:135`, `745:143`, `745:151`, `745:159`, `745:167`, `745:175` | identical (properties equal, 0 differences) |
| Checkbox | `7275:11456` → False/Default `11457`, False/Disabled `11460`, True/Default `11463`, True/Disabled `11467`, Indeterminate/Default `11471`, Indeterminate/Disabled `11475` | `745:284` → `745:223`, `745:226`, `745:229`, `745:234`, `745:239`, `745:244` | **identical at instance level.** Properties are equal. The 8 reported differences all sit in the four checked variants and are a traversal artefact: the canvas glyph instance exposes its `VECTOR` child, the ghost's instance (`745:231`, `745:241`) returned none, which shifted the following lines. Call 5 confirmed the ghost box holds the same `Icon/check` / `Icon/minus` at 14 × 14 on `{bg/brand}`. The glyph stroke colour inside the ghost was not compared |
| Switch | `7275:11494` → Off/Default `11495`, Off/Disabled `11499`, On/Default `11503`, On/Disabled `11507` | `745:286` → `745:263`, `745:267`, `745:271`, `745:275` | identical |
| Segment | `7275:14797` → Default `14798`, Active `14800` | `755:982` → Default `755:978`, Active `755:980` | identical (figma/06; not re-diffed) |
| Radio | `7275:11479` | **none found** in the scanned ranges | the inventory has none either; no composition instances a Radio (Payment Method draws a fake one, figma/05 §3.8) |
| Icon Button | `7275:11357` | **none found** in the scanned ranges | the compositions draw bare icons instead (Top Bar, Storefront Bar, Card action, Alert close) |
| Tooltip | — | `746:262` is the master itself (parent `none`) | ghost-only, as figma/02 recorded |

For Radio and Icon Button, Code Connect and `component.json` `figma.canonical` map to the on-canvas set with `ghosts: []` until design relinks. The Product detail and Settings compositions instance the ghosts (`745:159` Input Filled, `745:263` / `745:271` Switch, `745:229` Checkbox), so the facts below hold for what the compositions draw.

---

## 3. Rules that apply to several components

- **Spacing and size are unbound everywhere on these sets.** Only colours, text styles, effect styles and the `radius/md`, `radius/sm` (Tooltip bubble) and `radius/xs` radii are bound. Raw values on the scale map directly: 2 → `--nz-space-0-5`, 6 → `--nz-space-1-5`, 8 → `--nz-space-2`, 12 → `--nz-space-3`, 16 → `--nz-space-4`, 24 → `--nz-space-6`. **Off-scale: 3, 10 and 14** (flagged per component).
- **Heights:** 32 → `--nz-size-control-sm`, 40 → `--nz-size-control-md`, 48 → `--nz-size-control-lg` (none bound in Figma). Icons: 16 → `--nz-size-icon-sm`, 20 → `--nz-size-icon-md`. 14 (checkbox glyph) is off the icon scale.
- **Strokes are never bound.** 1 → `--nz-border-width-default`, 1.5 → `--nz-border-width-strong`, 2 → `--nz-border-width-focus`. Every control stroke is `INSIDE`, which is CSS `border` with `box-sizing: border-box`.
- **Radii:** 4 → `--nz-radius-xs` (bound on Checkbox), 8 → `--nz-radius-sm`, 12 → `--nz-radius-md` (bound on Input, Select, Icon Button), 10 on a 20 px box (Radio, Switch track) is a circle or pill → `--nz-radius-full`. 10 on the 38 px segmented track is off-scale (§4.7).
- **Control boundaries move to `--nz-border-control`** (ARCHITECTURE §15.3 "Component remapping"). Figma draws Input and Select at rest with `{border/default}` (1.27:1 on white) and Checkbox and Radio with `{border/strong}` (1.56:1); both fail WCAG 1.4.11. `--nz-border-control` is 3.55:1 light and 4.02:1 dark on `bg/surface` (3.10 / 3.12 at worst, on `bg/muted`). Hover: `--nz-border-control-hover`. `--nz-border-default` stays for button and card edges.
- **Focus.** Figma: Input Focus, Select Open and Button Focus draw `{border/focus}` at 1.5 px plus the `Focus/Ring` effect (a 4 px halo, green/500 at 28 %); Error draws `{border/critical}` 1.5 px plus `Focus/Ring Critical`. No selection control, segment, Icon Button or tooltip trigger has a focus state. **Code** (ARCHITECTURE §8.5, §15.1): every control's indicator is the generated 2 px solid outline, `outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px`, from `component.json` (`focusTarget` `self` for native inputs and buttons, `within` for an Input or Textarea group, `nested-input` for a segment). The halo is decoration only: `--nz-focus-halo` (colour), `--nz-focus-ring` and `--nz-focus-ring-critical` (Figma's two effects as box-shadows). An invalid field keeps the green outline and switches only the halo to critical. `border/focus` is 4.33–4.66:1 on light surfaces, 4.50 on `bg/subtle`, 7.81 on dark `bg/subtle`.
- **Interaction states in Figma become CSS, never props.** Hover → `@media (hover: hover) { :hover }`; Focus → `:focus-visible` / `:focus-within`; Filled → `:placeholder-shown` absent; Disabled → `:disabled`; Error → `data-invalid` on the field and `aria-invalid` on the control (`data-invalid` means "a message is presented", ARCHITECTURE §8.3).
- **Motion in the prototypes:** hover is `ON_HOVER` smart-animate 160 ms, cubic (0.2, 0, 0, 1); click and toggle are `ON_CLICK` 220 ms, same curve (read on Input, Icon Button, Checkbox, Switch and Segment). 160 ms is not a token: use `--nz-duration-fast` (140 ms) + `--nz-easing-standard` for colour, border and shadow (ARCHITECTURE §13.2 rule 2, critique C35). 220 ms is `--nz-duration-base`.
- **Selection-control row (Checkbox, Radio, Switch):** horizontal, hug, items centred, **gap 10 (off-scale)**, the control first and a Body/M label after it (`text/primary`, `text/disabled` when disabled). The row is 21 px tall (Body/M's 1.5 line height). No description line, no label-before-control variant, no error state. Code: the wrapping `<label class="nz-<name> nz-hit-target">` is the hit area (ARCHITECTURE §8.5); the 20 px box alone is under 24 × 24 (WCAG 2.5.8).
- **Disabled:** fills `{bg/disabled}` (unchecked boxes, Input field) or `{bg/muted}` (checked boxes); glyphs and labels `{text/disabled}`. Disabled pairs are exempt from 1.4.3 and 1.4.11 and are reported only (text-disabled on bg-disabled is 2.20 light, 2.07 dark).
- **Icon colour** is a stroke override on the instance's vector bound to `text/*` (Button, Icon Button, Checkbox glyph). Code uses `currentColor` and sets `color` on the part.

---

## 4. Per component

### 4.1 Field and Fieldset

**Figma:** no component. The field anatomy is the Input set's root (read, `7275:11398`). Guidance (figma/02 §3): "Label above, help below, 40px field. Errors say what to do, not what went wrong."

Props → code (inventory, ARCHITECTURE §10.6): `Label#745:0` → `label`; `Help text#745:14` → `description`; `Show help#745:21` (BOOLEAN, default true) → presence of `description`; `State=Error` → `error` (sets `data-invalid`); `State=Disabled` → `disabled`. New: `required`, `readOnly`, `name`, `validateOn`, `messages`, `ids`, function child (zero-JS mode).

| Part | Figma value | Token |
|---|---|---|
| Root | vertical auto-layout, fixed width 320 in the set (fill width in compositions), hug height, 320 × 93 with help | — |
| Gap (label → control → help) | 6 ! | `--nz-space-1-5` |
| Label | TEXT, Label/M, `{text/primary}`, auto width (no wrap); `{text/disabled}` when disabled | `--nz-font-label-m`, `--nz-text-primary` / `--nz-text-disabled` |
| Control | the 40 px "Field" frame (§4.2) | — |
| Help (description) | TEXT, Body/M, `{text/tertiary}`, auto width; **stays `{text/tertiary}` when disabled** (the label goes `text/disabled`) | `--nz-font-body-m`, `--nz-text-tertiary` (6.48:1 on white after the §15.3 override; Figma's n500 was 4.31) |
| Error | **no node of its own.** `State=Error` recolours the help node `{text/critical}` and keeps the help copy | plan: an error part after the description, icon + text (below) |

- **Error look (plan, not Figma):** one error channel, rendered after the description, as InlineError (W2 shipped, figma/11 §4.18): Body/M + `--nz-text-critical`, glyph in `--nz-icon-critical`. The glyph is `circle-x` (`Icon/circle-x` `738:141`, what Alert Critical draws), 16 px (`--nz-size-icon-sm`) by evidence (14 px text pairs with 16 px icons), gap builder decides. `circle-x` is Feather-derived: inlining it as the default error mark needs the Feather MIT notice (ARCHITECTURE §14.2). DOM order: label, control, description, error.
- **Required / optional marker: no Figma spec** (handoff Q30). Builder decides the glyph and colour; it must not be colour-only, and `required` reaches the control natively.
- **Counter: no Figma spec** (see Textarea, §4.3).
- **Disabled:** label `--nz-text-disabled`; whether help also dims is builder decides (Figma keeps it tertiary, which is inconsistent).
- **Read-only: no Figma spec.**
- **Spacing in compositions (read, Product detail `7275:15860`):** fields stack inside a card section at **gap 16** (`--nz-space-4`) under a Heading/H4 section title ("Details", card padding 24, `{bg/surface}`, `{border/subtle}`). A row of three fields ("Prices": Price, Compare-at, Cost) is horizontal, **gap 16**, equal widths (221 each in a 694 row). The composition fields hide the help (66 px tall = 20 + 6 + 40).

**Fieldset: no Figma spec** (no group legend or group error is drawn anywhere). Evidence for grouped controls (read):

| Where | Container | Title | Children |
|---|---|---|---|
| Product detail "Status" `7275:15949` | card, vertical, padding 24, gap 16 | "Status", Heading/H4 `{text/primary}` | three Switch rows, gap 16 |
| Product detail "Inventory" `7275:15967` | card, padding 24, gap 16 | "Inventory", Heading/H4 | Progress Bar, then one Checkbox ("Track inventory") |
| Settings "Billing emails" `7275:16473` | card, padding 24, gap 16 | "Billing emails", **Heading/H3** (the only H3 card title; figma/08 §4.11 calls it an outlier) | three Switch rows, gap 16 |

These titles are card titles, not legends. A legend style for `Fieldset` is builder decides (Label/M, the field label style, is the closest Figma evidence for a group-of-fields label; the card title stays a Heading outside the fieldset).

### 4.2 Input

**Figma:** set `7275:11397`, ghost `745:187` (identical, §2). Read. Description: "Text input. Focus: border/focus + Focus/Ring (140ms). Error: border/critical + Focus/Ring Critical, help text turns text/critical."

Props → code (inventory): `State` → CSS (`:hover`, `:focus-within`, `:placeholder-shown`) + `invalid` + `disabled`; `Value#745:7` → `value` / `defaultValue` / `placeholder`; `Leading icon#745:28` (BOOLEAN, default false) → `leadingIcon` slot; label and help → `Field`. New: `prefix`, `suffix`, `type` (`text` / `email` / `url` / `tel`).

- **`Value#745:7` is a dead property** (re-confirmed by this read): the "Value" text node has no component-property reference, so editing it on an instance does nothing. Compositions edit the text directly.

The control is the "Field" frame (in code, `.nz-input-group` wrapping the native `<input>` and any icons):

| Part | Figma value | Token |
|---|---|---|
| Field | horizontal auto-layout, fill width × **40**, items centred, clips | `--nz-size-control-md` |
| Padding | 0 / 12 ! / 0 / 12 ! | inline `--nz-space-3` |
| Gap (icon → value) | 8 ! | `--nz-space-2` |
| Radius | `{radius/md}` | `--nz-radius-md` |
| Fill | `{bg/surface}` | `--nz-bg-surface` |
| Stroke | `{border/default}` 1 ! inside | **code: `--nz-border-control`** (§3), `--nz-border-width-default` |
| Leading icon | INSTANCE `Icon/search` 16 × 16, hidden by default; its colour is inside the instance and was not read (Select's icons use `{icon/secondary}`, figma/02 §5.5) | `--nz-size-icon-sm`; colour builder decides (`--nz-icon-secondary` by Select's evidence), `aria-hidden` |
| Value | TEXT, Body/M, fill width, **auto height (wraps)** | `--nz-font-body-m`; code is single-line (a native `<input>` scrolls) |

| State | Fill | Stroke | Effect | Value text | Code |
|---|---|---|---|---|---|
| Default (placeholder) | `{bg/surface}` | `{border/default}` 1 | — | `{text/tertiary}` (placeholder look) | `::placeholder` `--nz-text-tertiary`; border `--nz-border-control` |
| Hover | `{bg/surface}` | `{border/strong}` 1 | — | `{text/tertiary}` | `--nz-border-control-hover` (3.75 / 5.32 at worst; Figma's border/strong is 1.56) |
| Focus | `{bg/surface}` | `{border/focus}` **1.5** | `Focus/Ring` | `{text/tertiary}` | group outline 2 px `--nz-border-focus` (`focusTarget: "within"`); optional halo `--nz-focus-ring`; border colour builder decides |
| Filled | `{bg/surface}` | `{border/default}` 1 | — | `{text/primary}` | `--nz-text-primary` |
| Error | `{bg/surface}` | `{border/critical}` **1.5** | `Focus/Ring Critical` | `{text/primary}` | `[aria-invalid]` / `data-invalid`: border `--nz-border-critical` (4.32 on white); halo `--nz-focus-ring-critical` only while focused; outline stays green |
| Disabled | `{bg/disabled}` | `{border/subtle}` 1 | — | `{text/disabled}` | `--nz-bg-disabled`, `--nz-text-disabled`; border builder decides (Select disabled keeps `border/default`; figma/02 §5.5) |

- **Invalid at rest: not drawn.** Figma's Error always carries the halo, so there is no "error, not focused" look. Builder decides: border `--nz-border-critical`, width 1 or 1.5 (`--nz-border-width-strong`), no halo.
- **Sizes: only 40.** Builder decides sm/lg from the control scale, matching Button and the shipped Select trigger: sm `--nz-size-control-sm` + `--nz-radius-sm`, lg `--nz-size-control-lg` (Button sm also drops to `--nz-space-3` padding and `--nz-space-1-5` gap).
- **Not drawn:** trailing slot, prefix/suffix text, clear button, password toggle, read-only, counter. Plan (§16.1): text affixes join `aria-describedby`; icons are `aria-hidden`.
- **Motion (prototype):** Default → Hover `ON_HOVER` 160 ms; Hover → Focus `ON_CLICK` 220 ms; the description says 140 ms. Code: border-color and box-shadow on `--nz-duration-fast` `--nz-easing-standard`.
- Composition use (read): 5 instances in Product detail, all `State=Filled` from the ghost: Title, Description, Price, Compare-at, Cost.

### 4.3 Textarea

**No Figma spec.** The evidence that a textarea is needed: Product detail's "Description" field (`7275:15910`) is a 40 px single-line Input holding "Hand-thrown in Bristol, glazed in moss." (inventory §4.1, critique M-C).

- Skin: the Input field (§4.2): `--nz-bg-surface`, `--nz-border-control` 1 px, `--nz-radius-md`, Body/M, inline padding `--nz-space-3`, the same state table. Block padding has no spec: builder decides (Input centres a 21 px line in 40 px, so 9.5 px; `--nz-space-2` gives a 37 px one-row box, `--nz-space-2-5` does not exist).
- Height: `field-sizing: content` with a `rows` fallback (ARCHITECTURE §16.1). Minimum rows and `resize` behaviour: builder decides.
- Character count (plan §16.1: `count`, soft limit by default, announced politely after a pause): no Figma spec. Nearest evidence for its look is the help text (Body/M, `--nz-text-tertiary`); 12 px would be `--nz-font-body-s` (allowed, decision 8c). Placement builder decides.
- Focus: `focusTarget: "within"` on `.nz-textarea-group` (ARCHITECTURE §8.5), like Input.

### 4.4 Checkbox

**Figma:** set `7275:11456`, ghost `745:284` (identical at instance level, §2). Read. Description empty.

Props → code (inventory): `Checked` False | True | Indeterminate (default False) → `checked` / `defaultChecked` (`true` / `false` / `'indeterminate'`), `onCheckedChange`; `State=Disabled` → `disabled`; `Label#745:43` (TEXT "Track inventory") → children.

| Part | Figma value | Token |
|---|---|---|
| Root | horizontal, hug × hug, 128 × 21, items centred | — |
| Gap | 10 ! | **off-scale**: builder decides (`--nz-space-2` or `--nz-space-3`) |
| Box | FRAME 20 × 20, horizontal auto-layout, content centred, clips | no size token (20 px = `--nz-size-icon-md`'s value; a private `--_nz-checkbox-size: 1.25rem` is clearer) |
| Box radius | `{radius/xs}` | `--nz-radius-xs` |
| Glyph | INSTANCE 14 × 14, `Icon/check` (checked) or `Icon/minus` (indeterminate); vector stroke 1.12 px | **off the icon scale** (16): builder decides 14 px (keep) or 16; internal `check` and `indeterminate dash` glyphs through the `indicator` slot (ARCHITECTURE §14.2) |
| Label | Body/M, auto width | `--nz-font-body-m` |

| Checked / State | Box fill | Box stroke | Glyph | Label | Code |
|---|---|---|---|---|---|
| False / Default | `{bg/surface}` | `{border/strong}` 1 ! inside | — | `{text/primary}` | `--nz-bg-surface`; border **`--nz-border-control`** (3.55 / 4.02 on surface) |
| False / Disabled | `{bg/disabled}` | `{border/strong}` 1 ! | — | `{text/disabled}` | `--nz-bg-disabled`; border builder decides (disabled, exempt) |
| True / Default | `{bg/brand}` | none | check, `{text/on-brand}` ! (text token on a vector) | `{text/primary}` | `--nz-bg-brand`; glyph `--nz-text-on-brand` (8.51 light; dark `text/on-brand` is green/950 on green/400, 5.17) |
| True / Disabled | `{bg/muted}` | none | check, `{text/disabled}` | `{text/disabled}` | `--nz-bg-muted`, `--nz-text-disabled` (2.20 / 2.07, exempt) |
| Indeterminate / Default | `{bg/brand}` | none | minus, `{text/on-brand}` | `{text/primary}` | as True |
| Indeterminate / Disabled | `{bg/muted}` | none | minus, `{text/disabled}` | `{text/disabled}` | as True / Disabled |

- **Checked fill against the page** (the box is the state indicator, WCAG 1.4.11): `bg/brand` is 8.51 light / 5.32 dark on `bg/surface`, 7.42 / 4.12 on `bg/muted`, 7.49 / 5.17 on `bg/brand-subtle` (a selected table row). Not yet in `contrast-pairs.json` (§6).
- **Forced colours:** `stateIndicator` `{ slot: "checkbox-input", state: "checked" / "indeterminate", paint: "fill" }`, and the component repeats the rule in its own stylesheet because its `background` in `nz.components` beats the generated `nz.base` rule (ARCHITECTURE §8.5 "Open (week 2)").
- **Glyph on a native input:** a native `<input type="checkbox">` has no children or pseudo-elements, so the glyph is a sibling element (or a mask) inside the wrapping label: builder decides. `check` and `minus` are not yet inlined (W2 holds `spinner` and `chevrons-up-down`); check Lucide's list of Feather-derived icons before inlining them (ARCHITECTURE §14.2).
- **Not drawn:** Hover, Focus, Invalid, a description line, a group, label placement other than after the box.
- **Motion (prototype):** False ↔ True `ON_CLICK` 220 ms cubic (0.2, 0, 0, 1); Indeterminate has none; the Disabled variants also toggle (a prototype bug). Code: background-color on `--nz-duration-fast`.
- **Other checkboxes in the file:** Product Row and the Table Header draw a hand-made 18 × 18 box, radius 5, `{border/strong}` 1.5 (figma/05 §3.3); they become this component.
- Composition use (read): one instance, "Track inventory", `Checked=True`, in Product detail "Inventory".

### 4.5 RadioGroup and Radio

**Figma:** set `7275:11479`, no ghost found (§2). Read. Description empty.

Props → code (inventory): `Selected` False | True → checked through the group's `value` / `defaultValue` / `onValueChange`; `State=Disabled` → `disabled`; `Label#745:50` (TEXT "Standard shipping") → children of `Radio`.

| Part | Figma value | Token |
|---|---|---|
| Root | horizontal, hug, 147 × 21, items centred, gap 10 ! | gap off-scale, as Checkbox |
| Circle | FRAME 20 × 20, content centred, radius 10 !, clips | `--nz-radius-full`; size as Checkbox's box |
| Dot (selected) | ELLIPSE 8 × 8, fill `{text/on-brand}` ! (text token on a shape) | no size token (builder decides; 8 px = `--nz-space-2`'s value); colour `--nz-text-on-brand` |
| Label | Body/M | `--nz-font-body-m` |

| Selected / State | Circle fill | Circle stroke | Dot | Label | Code |
|---|---|---|---|---|---|
| False / Default | `{bg/surface}` | `{border/strong}` 1 ! inside | — | `{text/primary}` | border `--nz-border-control` |
| False / Disabled | `{bg/disabled}` | `{border/strong}` 1 ! | — | `{text/disabled}` | `--nz-bg-disabled` |
| True / Default | `{bg/brand}` | none | `{text/on-brand}` | `{text/primary}` | `--nz-bg-brand` + dot `--nz-text-on-brand` (8.51 / 5.17) |
| True / Disabled | `{bg/muted}` | none | `{text/on-brand}` (white on n100: **1.15:1, invisible**) | `{text/disabled}` | dot builder decides: `--nz-text-disabled`, as Checkbox's disabled glyph |

- **No group anatomy** (no fieldset, legend, orientation or group error). Plan: native `<fieldset>` + `<legend>` and native radios, which give arrow-key roving (inventory).
- **No reactions** in the prototype (Checkbox has them).
- **Drawing the dot:** a native radio with `appearance: none` can draw the dot with an inset `box-shadow` or a radial gradient (no children needed); builder decides. Forced colours: `stateIndicator` `{ slot: "radio-input", state: "checked", paint: "fill" }`, repeated in the component stylesheet as for Checkbox.
- Not drawn: Hover, Focus, Invalid, description line.
- Payment Method (figma/05 §3.8) draws a fake 18 px radio with a 1.5 px stroke; ChoiceCard (v0.2) replaces it.

### 4.6 Switch

**Figma:** set `7275:11494`, ghost `745:286` (identical, §2). Read. Description: "Switch. Knob travels with easing/spring (duration/fast in Reduced mode = 0, colour cross-fades only)."

Props → code (inventory): `On` False | True → `checked` / `defaultChecked` / `onCheckedChange`; `State=Disabled` → `disabled`; `Label#745:55` (TEXT "Online store") → children. New: `pending` (the guidance says switches "apply instantly").

| Part | Figma value | Token |
|---|---|---|
| Root | horizontal, hug, 124 × 21, items centred, gap 10 ! | gap off-scale, as Checkbox |
| Track | FRAME **36 × 20**, horizontal auto-layout, padding 0 / 2 ! / 0 / 2 !, items centred, primary axis **MIN (off) / MAX (on)**, radius 10 !, clips | no size tokens: builder decides (`36 = 2 × 16 + 2 × 2`, so `inline-size: calc(2 * knob + 2 * pad)`); padding `--nz-space-0-5`; radius `--nz-radius-full` |
| Knob | ELLIPSE **16 × 16**, fill `{neutral/0}` ! (primitive, mode-blind), effect RAW drop shadow 0 1 2 0 `#000000` 18 % (pure black, not the neutral/950 tint of the effect styles) | size: builder decides (16 px = `--nz-size-icon-sm`'s value); fill and shadow: see below |
| Knob travel | 36 − 2 × 2 − 16 = **16 px** | `translate` by the knob size |
| Label | Body/M, after the track | `--nz-font-body-m` |

| On / State | Track fill (Figma) | Knob | Label | Code track | Contrast (light / dark) |
|---|---|---|---|---|---|
| Off / Default | `{neutral/300}` ! (primitive) | `{neutral/0}` ! | `{text/primary}` | **`--nz-border-control`** used as a fill (§15.3) | track vs `bg/surface` 3.56 / 4.03 (Figma's n300: 1.57 light) |
| Off / Disabled | `{bg/disabled}` | `{neutral/0}` ! | `{text/disabled}` | `--nz-bg-disabled` | exempt |
| On / Default | `{bg/brand}` | `{neutral/0}` ! | `{text/primary}` | `--nz-bg-brand` | 8.51 / 5.32 on `bg/surface` |
| On / Disabled | `{green/200}` ! (primitive; 10.52:1 on dark surface, so it is bright in dark mode) | `{neutral/0}` ! | `{text/disabled}` | builder decides: `--nz-bg-brand-muted` [green/100, green/900] is the nearest semantic token (exempt) | — |

- **Knob colour:** no semantic token exists (figma/02 asks for `control/knob`). `--nz-bg-surface` works in both modes: n0 on the off track 3.56 and on brand 8.51 (light); n900 on the off track 4.03 and on brand 5.32 (dark). Figma's white knob in dark mode would be 4.31 on the off track and 3.26 on brand. Builder decides; add the pair to `contrast-pairs.json` (§6).
- **Knob shadow:** raw, no token (figma/02 asks for `control/knob-shadow`). The nearest token, `--nz-elevation-1` (0 1 2 0 n950 4 % + 0 1 1 0 n950 3 %), is much lighter. Builder decides; the knob must not rely on the shadow for its edge (dark shadows read poorly; ARCHITECTURE §7.5 dark ring).
- **Motion:** knob `translate` on `--nz-easing-spring` with `--nz-duration-spring` (493 ms; 120 ms and `linear` when reduced), in the same transition item, on `translate` only (stylelint, ARCHITECTURE §8.4, §13.2 rule 1). Track colour on `--nz-duration-fast` + `--nz-easing-standard` (0 ms when reduced: the description's "colour cross-fades only" would then be instant; using `--nz-duration-fade` keeps a 120 ms fade under reduced motion: builder decides). The prototype instead toggles in 220 ms cubic (0.2, 0, 0, 1), and the Disabled variants also toggle (a prototype bug).
- **Forced colours:** track and thumb are both fills (`stateIndicator` entries for `switch-input` and `switch-thumb`, ARCHITECTURE §8.5), repeated in the component stylesheet.
- **Not drawn:** Hover, Focus, Invalid, Pending, sizes, description line, label before the track.
- **Composition use (read):** Product detail "Status" (Instagram shop on, Store link on, Wholesale off) and Settings "Billing emails" (Invoices on, Failed payments on, Usage reports off): label after the track, rows stacked at gap 16, no descriptions, no right-aligned (settings-row) layout anywhere.

### 4.7 SegmentedControl

**Figma:** Segment set `7275:14797` (live ghost `755:982`, diffed identical in figma/06). No container component: the track exists only as frames `7275:14802` ("Example · Segmented control", page 06) and `7275:18903` ("Range", Overview mobile). Read. Doc text `7275:14780`: "Underline tabs switch views; the segmented control switches ranges." So it is a radio group (`aria-checked` semantics through native radios), never tabs.

Props → code (inventory): `State` Default | Active → native `:checked` through the group's `value` / `defaultValue` / `onValueChange`; `Label#755:33` (TEXT "30D") → children of each item. New: `size`, `disabled`.

| Part | Figma value | Token |
|---|---|---|
| Track | horizontal auto-layout, hug (page 06, 295 × 38) or fill width (mobile "Range", 358 × 38), padding **3 !** all sides, gap **2 !**, radius **10 !**, `{bg/subtle}`, clips | padding off-scale (builder decides: `--nz-space-0-5` or `--nz-space-1`); gap `--nz-space-0-5`; radius off-scale; fill `--nz-bg-subtle` |
| Item | 56 × 32, hug width, padding **6 ! / 14 ! / 6 ! / 14 !**, aligned start/start, radius 8 ! | height `--nz-size-control-sm`; block 6 → `--nz-space-1-5`; inline 14 off-scale (builder decides `--nz-space-3` or `--nz-space-4`); radius `--nz-radius-sm` |
| Label, Default | Label/M, `{text/secondary}` | `--nz-font-label-m`, `--nz-text-secondary` (9.20 light / 11.41 dark on `bg/subtle`) |
| Item, Active (the thumb) | fill `{bg/surface}`, effect `Elevation/1 Card` | `--nz-bg-surface`, `--nz-elevation-1` |
| Label, Active | **Label/M Strong**, `{text/primary}` | `--nz-font-label-m-strong`, `--nz-text-primary` |

- **Concentric radius:** with padding 2, `calc(var(--nz-radius-sm) + var(--nz-space-0-5))` is exactly Figma's 10. With padding 3 it gives 11. Builder decides the padding; the formula keeps track and thumb concentric.
- **The thumb is invisible against the track:** `bg/surface` vs `bg/subtle` is 1.04:1 light and 1.03:1 dark (after the n925 override; 1.00 in Figma), and Elevation/1 vanishes in dark. Plan (ARCHITECTURE §15.1, §15.3): the selected segment draws `box-shadow: inset 0 0 0 1px var(--nz-border-control)` plus the weight change, in both modes (ring vs thumb 3.56 light, 4.03 dark), and forced colours draw `outline: 2px solid Highlight` on `.nz-segmented-control-item:has(> input:checked)`. The ring plus the elevation are two box-shadows on one element.
- **Width jitter:** Active is Label/M Strong (600) and Default Label/M (500), so an item grows from 56 to 57 px when selected. Builder decides how to reserve the bold width (for example a hidden bold copy of the label stacked in the same grid cell; `::after` is reserved for the hit area).
- **Track width on mobile:** "Range" `7275:18903` is fill width (358) but its five items hug (67, 46, 57, 56, 55), leaving empty track at the end. Evidence for an opt-in equal-width (`flex: 1`) layout: builder decides. Tablet trims the range to 3 segments (figma/08 §1).
- **Focus:** not drawn. Each item is a `<label>` wrapping a visually hidden native radio, so `component.json` uses `focusTarget: "nested-input"` and the outline lands on the item via `:has(> input:focus-visible)` (ARCHITECTURE §8.5). The outline on `bg/subtle` is 4.50 light.
- **Motion:** figma/06 recorded no reactions; this read finds `ON_CLICK` → Active, 220 ms cubic (0.2, 0, 0, 1), on the Default variant and on every Default instance in both track frames. A sliding thumb is not specified (figma/06 §8: optional, `--nz-duration-fast` + `--nz-easing-standard`, off in Reduced).
- **Not drawn:** Hover, Focus, Disabled (whole group or one item), sizes (32 only, = `--nz-size-control-sm`), icon-only or icon + text segments (builder decides: `--nz-size-icon-sm`, and an icon-only item needs an accessible name), a vertical orientation.
- Instances: Overview desktop "Range" (Today / 7D / 30D / 90D / 12M, 30D active) and mobile `7275:18903`; doc example `7275:14802`.

### 4.8 NativeSelect

**No Figma component.** It shares the Select trigger skin, set `7275:11438` (read). Description: "Select trigger. Opens Dropdown Menu or Date Range Picker on Elevation/3 with spring (easing/spring)." The native popup is the operating system's, so nothing from the Dropdown Menu applies.

| Part | Figma value | Token |
|---|---|---|
| Trigger | 240 × 40 fixed, horizontal, padding 0 / **10 !** / 0 / 12 !, gap 8 !, items centred | `--nz-size-control-md`; start `--nz-space-3`; end 10 off-scale; gap `--nz-space-2` |
| Radius | `{radius/md}` | `--nz-radius-md` |
| Fill / stroke | `{bg/surface}`, `{border/default}` 1 ! inside | `--nz-bg-surface`, **`--nz-border-control`** |
| Leading icon | `Icon/calendar` 16, `{icon/secondary}` (figma/02), boolean default **true** | `--nz-size-icon-sm`, `--nz-icon-secondary` |
| Value | **Body/M Strong**, `{text/primary}`, fill width | — (see deviation below) |
| Chevron | `Icon/chevrons-up-down` 16, `{icon/secondary}`, not toggleable | internal `chevrons-up-down` glyph (inlined in W2) |

| State | Fill | Stroke | Effect | Value | Code |
|---|---|---|---|---|---|
| Default | `{bg/surface}` | `{border/default}` 1 | — | `{text/primary}` | as shipped Select |
| Open | `{bg/surface}` | `{border/focus}` 1.5 | `Focus/Ring` | `{text/primary}` | native: no open state is styleable; use `:focus-visible` (generated outline) |
| Disabled | `{bg/disabled}` | `{border/default}` 1 (Input uses `border/subtle`) | — | `{text/disabled}`; icons stay `{icon/secondary}` | `--nz-bg-disabled`, `--nz-text-disabled` |

- **Match the shipped Select trigger, not Figma.** `packages/react/src/select/select.css` already deviates from this set: padding `--nz-space-3` on both sides (Figma end 10), value `--nz-font-label-m` (Figma Body/M Strong; Input's value is Body/M), icons `--nz-text-secondary` (Figma `icon/secondary`), border `--nz-border-control` with `--nz-border-control-hover` on hover, `data-size` sm/lg on the control scale, placeholder `--nz-text-tertiary`. NativeSelect should look identical to Select, so it reuses those values; list Figma's 10 px, Body/M Strong and `icon/secondary` on the Deviations page once for both.
- **Chevron on a native `<select>`:** `<select>` renders no `::before`/`::after`, so the chevron is a sibling element inside a wrapper (`pointer-events: none`), and `appearance: none` removes the platform arrow. `::after` on the wrapper is reserved for the hit area.
- **Leading icon:** Figma's Select shows one by default (`Leading icon#745:39`); the inventory gives NativeSelect plain-text options only. Whether NativeSelect takes a `leadingIcon` is builder decides.
- **Not drawn:** Hover (code: `--nz-border-control-hover`), Focus distinct from Open, Invalid (use Input's error look), placeholder, `multiple`.
- Plan tension for the builder (not a Figma fact): ARCHITECTURE §9.5 lists NativeSelect as T0 **server**, while inventory §1 says "every control is a thin client leaf" so it can read `FieldScope`. A server NativeSelect can still be wired through Field's zero-JS function child (`controlProps`).

### 4.9 IconButton

**Figma:** set `7275:11357`, no ghost found (§2). Read. Description: "Square icon-only action. Pair with Tooltip. Swap the nested Icon instance to change the glyph." Guidance (figma/02 §3): "40px square, 20px glyph. Always paired with a tooltip that names the action."

Props → code (inventory): `Variant` Secondary | Tertiary | Primary (default Secondary) → `variant` (default `secondary`); `State` Default | Hover → CSS; nested Icon swap → `icon` slot. New: `label` (required; becomes `aria-label` and the tooltip text), `tooltip` (default on; `false` stays server-safe), `size`. Inventory missing states: Pressed, Focus, Disabled, Selected (toggle), Sm 32 and Lg 48, Critical.

| Part | Figma value | Token |
|---|---|---|
| Root | 40 × 40 fixed, horizontal auto-layout, padding 0, gap 0, content centred | `--nz-size-control-md` (block and inline) |
| Radius | `{radius/md}` | `--nz-radius-md` |
| Icon | INSTANCE `Icon/bell` 20 × 20, stroke 1.6 bound to `{text/primary}` (Primary: `{text/on-brand}`) (figma/02 §5.2) | `--nz-size-icon-md`, `currentColor` |

| Variant | Default | Hover (Figma) | Pressed, Focus, Disabled (not drawn: take Button's, figma/02 §5.1) |
|---|---|---|---|
| Secondary | `{bg/surface}` + `{border/default}` 1 ! inside; icon `text/primary` | `{bg/hover}` + `{border/strong}` | Pressed `--nz-bg-pressed` + `--nz-border-strong`; Disabled `--nz-bg-disabled` + `--nz-border-subtle`, icon `--nz-text-disabled` |
| Tertiary | no fill; icon `text/primary` | `{bg/hover}` | Pressed `--nz-bg-pressed`; Disabled no fill, icon `--nz-text-disabled` |
| Primary | `{bg/brand}`; icon `text/on-brand` | `{bg/brand-hover}` | Pressed `--nz-bg-brand-pressed`; Disabled `--nz-bg-disabled`, icon `--nz-text-disabled` |
| Critical (not drawn) | — | — | Button's: `--nz-bg-critical` + `--nz-text-on-critical`, hover and pressed `--nz-bg-critical-hover` (ARCHITECTURE §15.3) |

- **Secondary's border stays `--nz-border-default`** (hover `--nz-border-strong`), as the shipped `button.css` does for Button: it is a button edge, not a form-control boundary, and the icon carries the meaning. Moving it to `--nz-border-control` would be a builder choice to list.
- **Primary has no highlight or drop shadow** here, while Primary Button draws one (`--nz-elevation-button`). Builder decides whether IconButton Primary carries it (list on the Deviations page either way).
- **Sizes (not drawn):** builder decides from Button's scale (`button.css`): sm `--nz-size-control-sm` + `--nz-radius-sm`, icon 16 (`--nz-size-icon-sm`); md 40 + `--nz-radius-md`, icon 20 (Figma); lg `--nz-size-control-lg` + `--nz-radius-md`, icon 20 or 24 (`--nz-size-icon-lg`). Note IconButton md uses a 20 px icon where Button md uses 16.
- **Focus:** not drawn; the generated outline (`focusTarget: "self"`). **Press:** `scale: var(--nz-scale-press)` on `--nz-duration-instant`, as Button (ARCHITECTURE §13.3).
- **Touch:** 40 px is below 44; the root takes `nz-hit-target` (coarse pointer grows it 2 px per side).
- **Toggle (`aria-pressed`): not drawn.** Evidence for one: Tagged Product Default/Added (figma/10). Pending: `pendingIndicator` (spinner, ARCHITECTURE §14.2), not drawn.
- **Motion (prototype):** Default → Hover `ON_HOVER` 160 ms → code `--nz-duration-fast`.
- Bare icons that become IconButtons once it exists (ARCHITECTURE §15.3): Toast close 16, Alert close 16 (`Icon/x` `738:423`), Banner close 18, Modal close 20, Card action (`Icon/ellipsis`). **Alert keeps `AlertDismiss` this week** (its removal is decided before 0.1.0); an IconButton can compose into it through `render`.

### 4.10 Tooltip, as IconButton pairs it

**Figma:** standalone COMPONENT `746:262` (ghost-only), one instance `7275:11538` in the Menu row on page 02. Read. Description: "Tooltip on bg/inverse. Delay 400ms, fade + 4px rise in duration/fast. Names icon-only actions and shortcut." **No frame draws an Icon Button with its tooltip**, so offset, placement and alignment relative to the trigger are not specified.

Props → code (inventory, ARCHITECTURE §23.4 D-d): `Label#746:10` (TEXT "Notifications") → `Tooltip.Popup` children, and for IconButton its `label`; the "Shortcut" text is not a property → `shortcut` (renders `Kbd`, week 3 with the `content` convenience prop).

| Part | Figma value | Token |
|---|---|---|
| Root | vertical, hug, 126 × 43, children centred (bubble above, arrow below: top placement only) | — |
| Bubble | horizontal, hug, 126 × 36, padding **8 ! / 12 ! / 8 ! / 12 !**, gap 8 !, items centred, clips | block `--nz-space-2`, inline `--nz-space-3`, gap `--nz-space-2` |
| Radius | `{radius/sm}` | `--nz-radius-sm` |
| Fill | `{bg/inverse}` | see the inverse note below |
| Effect | `Elevation/3 Popover` | `--nz-elevation-3` |
| Label | Label/M, `{text/inverse}`, auto width, no wrap | `--nz-font-label-m` |
| Shortcut | "N", Mono/M, `{text/tertiary}`, plain text (not a Kbd box) | `--nz-font-mono-m`; code renders `Kbd` |
| Arrow | POLYGON 12 × 7, `{bg/inverse}`, pointing down, centred | no token: builder decides (React Aria `OverlayArrow`, or none) |

**The shipped `tooltip.css` (W1 skeleton) differs from this master on every row.** Week 3 reconciles it:

| Property | Figma | Shipped skeleton | Note |
|---|---|---|---|
| Padding | 8 / 12 | `--nz-space-1-5` / `--nz-space-2` | Figma → `--nz-space-2` / `--nz-space-3` |
| Font | Label/M (14 px) | `--nz-font-label-s` (12 px) | Figma → `--nz-font-label-m`; 12 px would be a Deviations entry |
| Background | `bg/inverse` (light n900) | `--nz-bg-surface-raised` under `data-nz-scheme="inverse"` (dark n850 on a light page) | see below |
| Text | `text/inverse` (n0) | `--nz-text-primary` under inverse (dark n50) | — |
| Effect | Elevation/3 | none | `--nz-elevation-3` |
| Shortcut | Mono/M `text/tertiary` | — | `Kbd` |
| Arrow | 12 × 7 | none | builder decides |
| Max width | none drawn (auto width, no wrap) | `20rem` | keep the skeleton's cap; wrapping is a builder rule (inventory "a max-width wrap rule") |

- **Inverse:** the popup carries `data-nz-scheme="inverse"`, so its tokens resolve to the other theme (ARCHITECTURE §7.4). That route also fixes Figma's shortcut contrast: Figma's `text/tertiary` on `bg/inverse` is 4.03 (figma/02 §7) and, with today's light override (n600), would be **2.68:1 on n900** if painted directly; under the inverse scheme `--nz-text-tertiary` resolves to dark n400, 6.23 on n850 (`surface-raised`) and 6.87 on n900. So use the scheme, not `--nz-bg-inverse` + `--nz-text-tertiary`. Whether the surface is `--nz-bg-surface` (n900, matching Figma) or `--nz-bg-surface-raised` (n850) under the scheme is builder decides.
- **Motion** (ARCHITECTURE §13.3): 400 ms delay in the adapter; opacity on `--nz-duration-fade` (120 ms when reduced, so the fade survives); `translate` by `--nz-distance-lift` (4 px; 0 when reduced). The skeleton uses `--nz-duration-fast`, which is 0 ms when reduced.
- **Placement:** only top is drawn; the plan's `side` is logical (`top` / `bottom` / `start` / `end`, `data-side` resolved). Offset from the trigger: builder decides (the arrow is 7 px).
- **Forced colours:** the popup border `1px solid CanvasText` (already in `component.json` `stateIndicator`).
- **Naming:** IconButton's `label` is the accessible name (`aria-label`); the tooltip repeats it visually. Avoid announcing it twice (the tooltip's `aria-describedby` duplicating the name): builder decides.

---

## 5. Builder decides (consolidated)

Each item is a Figma value that is off the scale, missing a token, or not drawn. List the choice on the docs "Deviations from Figma" page.

| # | Component | Figma | Options |
|---|---|---|---|
| 1 | Checkbox, Radio, Switch | row gap 10 | `--nz-space-2` (8) or `--nz-space-3` (12) |
| 2 | Checkbox, Radio | box 20 × 20 | private `1.25rem` (or reuse `--nz-size-icon-md`'s value) |
| 3 | Checkbox | glyph 14 px (off the icon scale) | keep 14 or use `--nz-size-icon-sm` (16) |
| 4 | Radio | dot 8 × 8; disabled-selected dot white on `bg/muted` (1.15:1) | 8 px private; disabled dot `--nz-text-disabled` |
| 5 | Switch | track 36 × 20, knob 16, pad 2 | privates derived from the knob size; pad `--nz-space-0-5` |
| 6 | Switch | knob `{neutral/0}` primitive | `--nz-bg-surface` (passes on both tracks in both modes) |
| 7 | Switch | knob shadow raw `#000` 18 % | none, `--nz-elevation-1`, or a private shadow |
| 8 | Switch | on-disabled track `{green/200}` primitive | `--nz-bg-brand-muted` |
| 9 | Switch | colour cross-fade under reduced motion | `--nz-duration-fast` (0 ms reduced) or `--nz-duration-fade` (120 ms reduced) |
| 10 | SegmentedControl | track padding 3, radius 10 | padding `--nz-space-0-5` + concentric radius `calc(--nz-radius-sm + --nz-space-0-5)` = 10 |
| 11 | SegmentedControl | item inline padding 14 | `--nz-space-3` or `--nz-space-4` |
| 12 | SegmentedControl | bold label width jitter (56 → 57) | reserve the bold width |
| 13 | SegmentedControl | fill-width track with hugging items (mobile) | opt-in equal-width items |
| 14 | SegmentedControl | sizes, icon-only items, disabled | not drawn |
| 15 | Input, Textarea | invalid at rest (only drawn with the halo) | `--nz-border-critical`, 1 px or `--nz-border-width-strong`, no halo |
| 16 | Input | focus border 1.5 `border/focus` + halo | outline only, or outline + `--nz-focus-ring`; border colour on focus |
| 17 | Input | sizes (40 only) | sm/lg from the control scale, as Select |
| 18 | Input | leading-icon colour (not read) | `--nz-icon-secondary` |
| 19 | Input | disabled border `border/subtle` vs Select's `border/default` | pick one for both |
| 20 | Field | disabled help text stays `text/tertiary` | dim with the label or keep |
| 21 | Field | required marker (Q30), error glyph size and gap, legend style | not drawn |
| 22 | Textarea | block padding, min rows, resize, counter look | not drawn |
| 23 | NativeSelect | Figma end padding 10, Body/M Strong value, `icon/secondary` | match shipped Select (`--nz-space-3`, `--nz-font-label-m`, `--nz-text-secondary`) |
| 24 | NativeSelect | leading icon (Figma default on) | prop or not |
| 25 | IconButton | Primary without `--nz-elevation-button` | add or not |
| 26 | IconButton | sm and lg icon size | 16 / 20 or 24 |
| 27 | IconButton | Secondary border | `--nz-border-default` (Button) or `--nz-border-control` |
| 28 | Tooltip | arrow 12 × 7, offset, max width, surface under the inverse scheme | not specified beyond the master |
| 29 | All | 160 ms hover, 220 ms toggle | `--nz-duration-fast`, `--nz-duration-base` (C35) |

---

## 6. Contrast pairs the integrator must add

`packages/tokens/src/code-owned/a11y/contrast-pairs.json` already covers (do not duplicate): `text-primary`, `text-secondary`, `text-tertiary` on `surfaces` (which includes `bg-subtle`, `bg-hover`, `bg-muted`); `text-on-brand` on `bg-brand` / `-hover` / `-pressed`; `text-on-critical` on `bg-critical` / `-hover`; `text-inverse` on `bg-inverse`; `icon-secondary` on `surfaces`; `border-control` and `border-control-hover` on `surfaces` (covers Input, Select, NativeSelect, Checkbox and Radio boundaries and the segment ring on `bg-surface`); `border-critical` on `surfaces`; `border-focus` on `surfaces`, `bg-brand-subtle` and `status-subtle` (covers the segmented track); `text-disabled` on `surfaces`. Inverse surfaces (Tooltip) are covered by the other theme's rows.

New pairs (values on the built `tokens.css`, light / dark, worst case first):

| Foreground | On | Role | Light | Dark | Why |
|---|---|---|---|---|---|
| `bg-brand` | `surfaces`, `bg-brand-subtle` | non-text | 7.42 (muted) – 8.51 | 4.12 (muted) – 5.32 | checked Checkbox and Radio fill, Switch on-track: the fill is the state indicator (1.4.11); `bg-brand-subtle` is a selected table row |
| `border-control` | `bg-brand-subtle` | non-text | 3.13 | 3.91 | unchecked Checkbox inside a selected row |
| the knob token (`bg-surface` if adopted) | `border-control`, `bg-brand` | non-text | 3.56, 8.51 | 4.03, 5.32 | Switch knob on the off and on tracks |
| `border-control` (as the off-track fill) | `surfaces` | non-text | 3.10 (muted) – 3.56 | 3.12 – 4.03 | already covered by the existing `border-control` row; add only a `use` note "Switch off track" |
| `text-disabled` | `bg-disabled`, `bg-muted` | disabled (report) | 2.20 | 2.07 | disabled Input value, disabled checked glyph |
| knob token | `bg-disabled`, `bg-brand-muted` | disabled (report) | — | — | disabled Switch, if item 8 adopts `bg-brand-muted` |

`contrast-pairs.json` names backgrounds as token names without the prefix. If the pairs file does not accept `border-control` as a background, add the Switch off track as a code-owned alias (for example `control-track-off` → `border-control`) and check it there; that is a token decision, so it goes through the tokens package.

---

## 7. Extraction gaps

- Instance internals were read only for the Checkbox glyphs. Input's leading-icon colour, Icon Button's icon colour and the Select icons' colours are taken from figma/02, not re-read.
- The Checkbox ghost's glyph instances returned no child vector, so the ghost's glyph stroke colour was not compared (§2).
- Radio and Icon Button ghosts: none in the scanned id ranges; ids outside 744:230–345, 745:140–330 and 746:195–275 were not scanned.
- No screenshots: dark-mode conclusions are computed from token values, not rendered.
- The Select set was read for NativeSelect only; the Select ghost `745:222` was not diffed (week 4 Select work can do it).
