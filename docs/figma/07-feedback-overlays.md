# Grove · 07 Feedback & Overlays — extraction + architecture analysis

- Figma file: `BIzJFf1wm8KP0YG2AVI1tP` (Grove UI Library; ships as **Nizivo UI**, `@nizivo/*`)
- Page: **Grove · 07 Feedback & Overlays** `7275:15065`. Single SECTION `7275:15066` (4000 x 2299).
- Read: 2026-10-14, strictly read-only (use_figma scripts only `return` data).
- Screenshots: `scratchpad/figma/shots/07-feedback-overlays-section.png` (3000 px), `07-toast-set.png`, `07-modal-set.png`.
- Token names refer to `00-tokens-and-styles.md`. In code every `grove` prefix becomes the configurable `--nz-` prefix.

---

## 0. TL;DR for downstream agents

1. **The Figma prop surface is almost empty.** All six component sets have exactly **one VARIANT axis** and **zero BOOLEAN, TEXT or INSTANCE_SWAP props**. The only non-variant prop on the page is Drawer's `Title#756:0` (TEXT). The React APIs below therefore come from **anatomy and slots, not Figma props**. Code Connect isn't worth doing until the design team adds props such as `Dismissible`, `Show action`, `Show description`, `Icon` swap and label TEXT props.
2. **Orphaned main components.** Every one of the 33 instances on this page points to a main component that has `parent: null` and can't be reached from any page: Button set `744:263` (10), Badge `744:315` (2), Input set `745:187` (1), Drawer `756:1001` (1), Order Summary `754:897` (1), and Icon/* `738:*` (20). The canonical Button `7275:11244` and Input `7275:11397` on page 02 are **different nodes with different keys**, so these instances **do not track edits** to the page-02 components. Even the canonical page-02 Button uses the orphaned `738:*` icons, which means **no on-canvas icon library exists anywhere in the file**. This needs confirmation from the design team; it may be leftovers from a copy or import.
3. **No overlay foundations exist:** no scrim/overlay token, no z-index tokens, no open/close motion spec or prototype on this page (the only prototype reactions are Button ON_HOVER swaps), and no Drawer component set. Code has to provide Portal, Layer, Scrim, FocusScope, ScrollLock, DismissableLayer, Presence and LiveAnnouncer. Proposed tokens are in section 8.
4. **No page-07 Grove component references a non-Grove collection or style** (Clario, Pipkin, Merit and the rest). Every resolved binding is in Grove Color, Grove Space or Grove Primitives, and every text and effect style is `Grove/*`. A global variable search for scrim/overlay/z/elevation names matched only `Pipkin Tokens: shadow/offset`, which is a file-level leftover that no node on this page binds to. One semantic-layer bypass: the orphaned Button `Variant=Critical, State=Hover` (`744:182`) binds **`Grove Primitives:red/700`** directly, and no `bg/critical-hover` token exists.
5. **Contrast failures** (details in section 7): in **dark mode the Toast action is 1.75:1** (a background token, `bg/accent`, is used as a text fill), the dark Toast success icon is 2.29:1, the light Warning icon is 2.27:1 (Alert and Banner), and the dark Critical button label is 4.01:1. In dark mode, `bg/subtle` and `bg/surface` are the same color, so the Empty State container and the Modal footer disappear.
6. **Design debt:** every padding and gap in all six sets is **unbound**; only radii and colors are tokenized. Some raw values are **off-scale**: Alert padding 14, Skeleton radius 6, icon size 18, hover transition 160 ms. Close affordances are bare 16, 18 or 20 px icons, not Icon Button instances.

---

## 1. Page structure

| Doc frame | id | Contents |
|---|---|---|
| Doc/Toast | `7275:15067` (536x400) | Header + Toast set `7275:15071` |
| Doc/Alert | `7275:15087` (626x556) | Header + Alert set `7275:15091` |
| Doc/Banner | `7275:15116` (1126x435) | Header + Banner set `7275:15120` |
| Doc/Modal | `7275:15135` (1138x462) | Header + Modal set `7275:15139` |
| Doc/Drawer | `7275:15158` (586x1056) | Header + Stage `7275:15162` (490x870, radius 16 raw, stroke border/brand) holding **Drawer instance `7275:15163`** → main `756:1001` (orphaned standalone COMPONENT, not a set) |
| Doc/Empty state | `7275:15164` (938x540) | Header + Empty State set `7275:15168` |
| Doc/Skeleton | `7275:15177` (1116x368) | Header + Skeleton set `7275:15181` |

Doc frame chrome: `bg/surface`, radius 28 (2xl), padding 48, gap 32. Header: H2 title plus Body/M `text/secondary`, gap 6 (raw). Component-set frames have a dashed `border/brand` stroke with 24 padding (doc chrome only).

### 1.1 Designer guidance (verbatim, all doc TEXT outside component sets)

| Component | Guidance text (node) |
|---|---|
| Toast | "Bottom-centre confirmation. One line, one optional action, gone in 5s." (`7275:15070`) |
| Alert | "Inline, inside a page or card. Title plus at most one line." (`7275:15090`) |
| Banner | "Page-wide, above content. Promo uses the brand tint and a render." (`7275:15119`) |
| Modal | "Blocking decisions only. Destructive confirm is the one red button." (`7275:15138`) |
| Drawer | "Slides from the right for detail without losing the list." (`7275:15161`) |
| Empty state | "A render, a headline, one action. No paragraphs." (`7275:15167`) |
| Skeleton | "Loading placeholders mirror the final layout, never a spinner." (`7275:15180`) |

No text exists outside the section. All component sets and variants have empty `description` and empty `documentationLinks`. There are no a11y notes, no motion notes, and no do/don't panels.

### 1.2 Raw `componentPropertyDefinitions` (read on each COMPONENT_SET)

```json
Toast       7275:15071 {"Tone":{"type":"VARIANT","defaultValue":"Success","variantOptions":["Success","Critical","Neutral"]}}
Alert       7275:15091 {"Tone":{"type":"VARIANT","defaultValue":"Info","variantOptions":["Info","Success","Warning","Critical"]}}
Banner      7275:15120 {"Tone":{"type":"VARIANT","defaultValue":"Promo","variantOptions":["Promo","Warning"]}}
Modal       7275:15139 {"Type":{"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Destructive"]}}
Empty State 7275:15168 {"Context":{"type":"VARIANT","defaultValue":"Orders","variantOptions":["Orders","Search"]}}
Skeleton    7275:15181 {"Shape":{"type":"VARIANT","defaultValue":"Line","variantOptions":["Line","KPI","Row"]}}
Drawer      756:1001 (standalone COMPONENT, orphaned) {"Title#756:0":{"type":"TEXT","defaultValue":"Order #1042"}}
```

Variant matrices are complete for their single axes, since a single axis has no missing combinations. What's missing are the **axes themselves**: size, state (hover/focus on actions), dismissible, with/without action, and with/without description. Naming is inconsistent: Modal uses `Type`, Empty State uses `Context` (content rather than structure), Skeleton uses `Shape` (compositions rather than shapes), and the others use `Tone`. Banner's `Promo` is a purpose, not a tone.

### 1.3 Prototype reactions

The only reactions are `ON_HOVER → CHANGE_TO` on Button instances (`7275:15126`, `7275:15133`, `7275:15147`, `7275:15148`, `7275:15156`, `7275:15157`, `7275:15172`, `7275:15176`, `I7275:15163;756:1100`, `I7275:15163;756:1112`), each targeting the orphaned Button hover variants `744:77` (Primary/Hover, `bg/brand-hover`), `744:112` (Secondary/Hover, `bg/hover`) and `744:182` (Critical/Hover, **`Grove Primitives:red/700`**). The transition is SMART_ANIMATE, `cubic-bezier(0.2,0,0,1)` (= `easing/standard`), **160 ms**, which is off-token (`duration/fast`=140, `duration/base`=220).
There are **no** open/close, overlay, toast-enter or drawer-slide prototypes on the page.

---

## 2. Visual language (from screenshots)

- Warm off-white canvas (`bg/canvas` neutral/50) with white doc cards. The feel is calm, editorial and commerce-oriented (a ceramic-shop narrative: "Moss & Kiln", stoneware, candles).
- **Large radii:** toast and alert 16 (`radius/lg`), banner, empty state, drawer and KPI skeleton 20 (`radius/xl`), modal 28 (`radius/2xl`), buttons and inputs 12.
- **Soft two-layer shadows:** `Elevation/3 Popover` on toasts and `Elevation/4 Modal` on modal and drawer. Low-opacity neutral/950 tints, no hard borders on overlays.
- **Tinted feedback backgrounds** with no borders: info blue/50, success green/50, warning amber/50, critical red/50, promo green/50 (brand-subtle).
- **Toasts are dark pills** (`bg/inverse`) with lime (`bg/accent`) action text and a small tone-coloured icon. This is the strongest accent moment on the page.
- **3D clay-style renders** (IMAGE fills) in Banner/Promo (72 px) and Empty State (140 px), consistent with the "render" guidance.
- Medium density: 40 px controls, Geist type, H3 titles in overlays, Label/M for UI text.
- **No glass:** `Surface/Glass` and `Surface/Liquid Glass` styles exist in the file but are unused here. All overlays are opaque surfaces.
- No scrim is shown behind Modal or Drawer. The Drawer is shown in a stage frame, not over a list.

---

## 3. Icons

All icon instances are **local (remote=false) but orphaned** COMPONENTs (`parent: null`, on no page), named `Icon/<lucide-name>`. Each has the description: *`Lucide "<name>" · 20px, 1.6 stroke · recolour via icon/* tokens.`* Strokes are round cap and round join, and the master stroke is bound to `icon/primary`.

| Main | id | key | Used in |
|---|---|---|---|
| Icon/circle-check | `738:131` | a7b8457601258b25bd1b6a2e75ec6f0a6296c9be | Toast Success (18 px), Alert Success (20) |
| Icon/circle-x | `738:141` | 29b5a83d24bf4b6cfc277bc5cae5b19f6766dc5e | Toast Critical (18), Alert Critical (20) |
| Icon/info | `738:213` | c41ab576801374f1b37823ed9da205088c67d201 | Toast Neutral (18), Alert Info (20) |
| Icon/triangle-alert | `738:391` | 18f2b7c42e599834500dae953721807debcd8ab1 | Alert Warning (20), Banner Warning (24) |
| Icon/x | `738:423` | a1675960d2bdf74515416e37094bf08df4c114b1 | Close everywhere: Toast 16, Alert 16, Banner 18, Modal 20, Drawer 20 |

Instances are **scaled**, so stroke scales with them: 18 px → 1.44, 16 px → 1.28, 24 px → 1.92. Code mapping: use `lucide-react` (or any Lucide build) behind an icon adapter, with non-absolute stroke. Lucide's 24-unit viewBox at stroke-width ≈1.92 gives 1.6 px at 20 px. **18 px is not a size token** (`icon-sm` is 16, `icon-md` 20, `icon-lg` 24).

Icon colour overrides (all bound):
- Toast: success → `icon/success`, critical → `icon/critical`, neutral → `icon/inverse`; close → `icon/inverse`.
- Alert: info → **`icon/brand`** (green on a blue tint, a semantic mismatch because there is no `icon/info`), success → `icon/success`, warning → `icon/warning`, critical → `icon/critical`; close → `icon/secondary`.
- Banner: warning → `icon/warning`; close → `icon/secondary`.
- Modal and Drawer close → `icon/secondary`.

---

## 4. Component-by-component extraction

Legend: `pad` is T,R,B,L. **RAW** means not bound to a variable. Colours are always bound unless marked RAW.

### 4.1 Toast — set `7275:15071`
Variants: `Tone=Success` `7275:15072` (226x44), `Tone=Critical` `7275:15077` (316x44), `Tone=Neutral` `7275:15082` (274x44). Default: Success.

Anatomy (identical across tones):
```
Toast (COMPONENT, H auto-layout, HUG x HUG, pad 12,12,12,16 RAW, gap 12 RAW, align MIN/CENTER)
  fill bg/inverse · radius radius/lg (16) · effect Grove/Elevation/3 Popover
├─ Icon (INSTANCE Icon/circle-check | circle-x | info, 18x18 — off-token size)
├─ Message (TEXT, Grove/Label/M, text/inverse, WIDTH_AND_HEIGHT — never wraps)
├─ Action (TEXT, Grove/Label/M Strong, fill bg/accent  ← background token used as text colour) "View" / "Retry" / "Undo"
└─ Icon (INSTANCE Icon/x, 16x16, icon/inverse)  ← bare icon, no button wrapper
```
- States shown: none (no hover or focus on Action or close, no enter/exit, no stacked/queued view, no swipe).
- Hard-coded: padding 12/12/12/16, gap 12 (space/3 and space/4 exist but are unbound). Icon 18 px. No max-width or truncation rule.
- The **Action is a TEXT node, not a Button**, so it has no hit area, no hover or focus, and no pressed state.

### 4.2 Alert — set `7275:15091`
Variants: `Tone=Info` `7275:15092`, `Tone=Success` `7275:15098`, `Tone=Warning` `7275:15104`, `Tone=Critical` `7275:15110` (all 480x71, FILL width). Default: Info.
```
Alert (COMPONENT, H, FILL x HUG, pad 14,16,14,16 RAW (14 off-scale), gap 12 RAW, align MIN/MIN)
  fill bg/info-subtle | bg/success-subtle | bg/warning-subtle | bg/critical-subtle · radius radius/lg · no stroke · no effect
├─ Icon (Icon/info | circle-check | triangle-alert | circle-x, 20x20; colour icon/brand | icon/success | icon/warning | icon/critical)
├─ Text (FRAME V, FILL x HUG, gap 2 RAW, clipsContent=true)
│   ├─ Title (TEXT Grove/Label/M Strong, text/primary, WIDTH_AND_HEIGHT)
│   └─ Description (TEXT Grove/Body/M, text/secondary, WIDTH_AND_HEIGHT)
└─ Icon (Icon/x 16x16, icon/secondary)  ← bare
```
- Layout bug: the texts are hug-width (`WIDTH_AND_HEIGHT`) inside a clipping FILL frame, so **long copy gets clipped instead of wrapping**. Code should wrap.
- No action slot, no border option, no non-dismissible variant, no focus state on close.

### 4.3 Banner — set `7275:15120`
Variants: `Tone=Promo` `7275:15121` (980x104), `Tone=Warning` `7275:15128` (980x79). Default: Promo.
```
Banner (COMPONENT, H, FILL x HUG, pad 16,24,16,24 RAW, gap 20 RAW, align MIN/CENTER, clip)
  fill bg/brand-subtle (Promo) | bg/warning-subtle (Warning) · radius radius/xl (20)
├─ [Promo] Render (RECTANGLE 72x72, IMAGE fill FIT)   |  [Warning] Icon (Icon/triangle-alert 24x24, icon/warning)
├─ Text (FRAME V, FILL, gap 2 RAW, clip)
│   ├─ Title (Grove/Heading/H4, text/primary)
│   └─ Description (Grove/Body/M, text/secondary)
├─ Button (INSTANCE orphaned Button 744:263 — Promo: Variant=Primary "Add storefront" 744:70; Warning: Variant=Secondary "Update card" 744:105; Size=Md 40px)
└─ Icon (Icon/x 18x18 — off-token, icon/secondary)  ← bare
```
- Only 2 tones (no info, critical or success). No responsive or mobile variant (980 px only). The same Text-clipping issue as Alert.
- The Button instances carry RAW effects on Primary (`INNER_SHADOW 0,1 #ffffff@0.16; DROP_SHADOW r2 0,1 #0a211a@0.18`), which aren't the `Surface/Inner Highlight` style (Button-owner debt).

### 4.4 Modal — set `7275:15139`
Variants: `Type=Default` `7275:15140` (480x226), `Type=Destructive` `7275:15149` (480x212). Default: Default.
```
Modal (COMPONENT, V, 480 fixed, pad 0, gap 0, clip)
  fill bg/surface · radius radius/2xl (28) · effect Grove/Elevation/4 Modal
├─ Header (FRAME H, FILL, pad 20,20,8,24 RAW, gap 12 RAW, align MIN/CENTER)
│   ├─ Title (TEXT Grove/Heading/H3, text/primary, HEIGHT = wraps)  "Rename collection" / "Delete 3 products?"
│   └─ Icon (Icon/x 20x20, icon/secondary)  ← bare close, NOT Icon Button 7275:11357
├─ Body (FRAME V, FILL, pad 8,24,24,24 RAW, gap 16 RAW)
│   ├─ [Default] Input (orphaned Input 745:187 / State=Filled 745:159; Label "Collection name", Value "Autumn ceramics")
│   └─ [Destructive] Text (Grove/Body/L, text/secondary, HEIGHT)
└─ Footer (FRAME H, FILL, pad 16,24,16,24 RAW, gap 12 RAW, align MAX (right), fill bg/subtle)
    ├─ Button Secondary "Cancel" (744:105)
    └─ Button Primary "Save" (744:70)  |  Button Critical "Delete products" (744:175, bg/critical, text/inverse)
```
- **No scrim or backdrop is depicted, and no overlay token exists.** The design has only one width (480): no size scale, no mobile or full-screen variant, no scrolling-body spec (max-height), no loading state on confirm, and no icon in the destructive header.
- The header is asymmetric (20 right vs 24 left padding, optically aligning the close icon).

### 4.5 Drawer — instance `7275:15163` → standalone COMPONENT `756:1001` (orphaned, not a set)
Props: `Title#756:0` TEXT, default "Order #1042". No variants (no side, size or modal axis).
```
Drawer (COMPONENT, V, 440x820 fixed, pad 0, gap 0, clip)
  fill bg/surface · radius [20,0,0,20] (left corners only, RAW — radius/xl unbound) · effect Grove/Elevation/4 Modal
├─ Header (FRAME H, FILL, pad 20,20,20,24 RAW, gap 12, border-bottom 1 border/subtle)
│   ├─ Title (FRAME V, gap 4) → Title TEXT (Grove/Heading/H3) + Badges (H, gap 6: Badge 744:315 "Paid", "Unfulfilled")
│   └─ Icon (Icon/x 20x20)  ← bare close
├─ Body (FRAME V, FILL x FILL, pad 24 RAW, gap 16)
│   ├─ Order Summary (INSTANCE orphaned 754:897 — paddings bound space/6, radius/xl, border/subtle)
│   └─ Ship to (Label/M Strong + 2x Body/M text/secondary)
└─ Footer (FRAME H, FILL, pad 16,24,16,24 RAW, gap 12, border-top 1 border/subtle)
    ├─ Button Secondary "Print label" (FILL)
    └─ Button Primary "Fulfil order" (FILL)
```
- Its contents are commerce-specific (an Order detail). The design-system component should be a generic `Drawer`/`Sheet`, with the order view as a recipe in `@nizivo/commerce`.

### 4.6 Empty State — set `7275:15168`
Variants: `Context=Orders` `7275:15169`, `Context=Search` `7275:15173` (both 380x304). Default: Orders.
```
EmptyState (COMPONENT, V, 380 fixed width, pad 32 RAW, gap 16 RAW, align MIN/CENTER)
  fill bg/subtle · radius radius/xl
├─ Render (RECTANGLE 140x140 IMAGE FIT)  — box (Orders) / tag (Search)
├─ Title (TEXT Grove/Heading/H3, text/primary, centre)  "No orders yet" / "Nothing matches “stonewear”"
└─ Button (Orders: Primary "Share your store"; Search: Secondary "Clear search")
```
- `Context` is content, not structure. In code it should become docs recipes, not a prop. There's no description slot (by design: "No paragraphs") and no size variant (inline, card or page).

### 4.7 Skeleton — set `7275:15181`
Variants: `Shape=Line` `7275:15182` (240x66), `Shape=KPI` `7275:15186` (280x132), `Shape=Row` `7275:15190` (386x40). Default: Line.
```
Line: V gap 12 RAW → 3x Block RECT (240/180/120 x 14, radius 6 RAW, fill bg/muted)
KPI : V pad 20 RAW gap 12, bg/surface, border/subtle 1, radius radius/xl → Block 96x14 r6, Block 160x32 r8, Block 120x20 r999 (all RAW radii)
Row : H gap 12 → Block 40x40 r8 | Text(V gap 8: 180x14 r6, 110x12 r6) | Block 70x22 r999 | Block 60x14 r6
```
- **Radius 6 is off-scale** (xs=4, sm=8). The 999 radius should be `radius/full`. No shimmer or pulse spec, and no reduced-motion note. The block colour `bg/muted` on `bg/surface` is 1.15:1, which is acceptable for decorative content but barely visible.

---

## 5. Hard-coded values (design debt the code pipeline must normalise)

| Node | Raw value | Nearest token |
|---|---|---|
| Toast variants `7275:15072/15077/15082` | pad 12/12/12/16, gap 12 | space/3, space/4 |
| Toast leading icon `7275:15073` etc. | 18 px | size/icon-md 20 (or new icon-sm-plus) |
| Alert variants `7275:15092/98/104/110` | pad **14**/16, gap 12 | **off-scale** → space/3 (12) or space/4 (16) |
| Alert/Banner Text frames | gap 2 | space/0-5 |
| Banner variants `7275:15121/15128` | pad 16/24, gap 20 | space/4, space/6, space/5 |
| Banner close `7275:15127/15134` | 18 px | 16/20 |
| Modal Header `7275:15141/15150` | pad 20/20/8/24, gap 12 | space/5, space/2, space/6, space/3 |
| Modal Body `7275:15144/15153` | pad 8/24/24/24, gap 16 | space/2, space/6, space/4 |
| Modal Footer `7275:15146/15155` | pad 16/24, gap 12 | space/4, space/6, space/3 |
| Drawer `756:1001` | radius 20 (TL/BL only), header/body/footer padding | radius/xl, space/* |
| Empty State `7275:15169/15173` | pad 32, gap 16 | space/8, space/4 |
| Skeleton blocks | radius **6**, 8, 999; sizes 12/14/20/22/32/40 | off-scale 6; radius/sm; radius/full |
| Skeleton KPI `7275:15186` | pad 20, gap 12 | space/5, space/3 |
| Button (orphaned 744:70) | raw effects inner+drop shadow | Surface/Inner Highlight + Elevation/1 |
| Button Secondary (744:105), Input field | strokeWeight 1 unbound | border-width/default |
| Button hover reactions | 160 ms | duration/fast 140 |
| Doc Stage `7275:15162` | radius 16, pad 24, gap 32 | (doc chrome only) |

Bound correctly: every colour fill/stroke on this page, all component radii (except Drawer and Skeleton blocks), all text styles (no raw text), and effect styles on Toast, Modal and Drawer.

---

## 6. Overlay needs (each answered)

### 6.1 Scrim / backdrop — **MISSING**
No scrim is drawn behind Modal or Drawer, and no `overlay/*` or `scrim` variable exists (confirmed by snapshot and variable search). Proposal:
- `--nz-overlay-scrim`: light `neutral/950 @ 40%`, dark `neutral/950 @ 64%`.
- Optional `--nz-overlay-scrim-blur: 0` (opt-in 4–8 px; could reuse a Surface/Glass-style blur for a "glass" theme).
- Modal and Drawer render `::backdrop` (native `<dialog>`) or `<Overlay>` with this token. A non-modal Drawer has no scrim.

### 6.2 Focus trap / scroll lock / dismissal
- **Modal (Default):** `role="dialog"` + `aria-modal="true"`, labelled by the Title and described by the Body. Trap focus; initial focus goes to the first form field (Input) or the Content. Esc closes, outside click closes, and focus returns to the trigger. Lock body scroll with `scrollbar-gutter: stable` to avoid layout shift.
- **Modal (Destructive) → AlertDialog:** `role="alertdialog"`, `aria-describedby` required, **initial focus on Cancel**, **no outside-click dismiss** (Esc allowed → cancel), and the confirm button supports async/loading.
- **Drawer:** a modal by default, with the same behaviour as Dialog. "Without losing the list" suggests an optional `modal={false}` mode (no trap, no scroll lock, no scrim, `role="dialog"` without aria-modal, list stays interactive). That's a **design decision to confirm**.
- Close buttons need `aria-label` ("Close"). The Figma close is a bare icon: use **Icon Button `7275:11357`** (page 02) in both design and code.

### 6.3 Toast queue / stacking / positions / timeouts / swipe
- Guidance: bottom-centre, one line, one optional action, auto-dismiss at 5 s.
- Proposed defaults: `position="bottom-center"`, `max` 3 visible (the rest queue), `gap` space/2, `offset` space/6 plus `env(safe-area-inset-bottom)` plus a CSS var so it can clear the Mobile Tab Bar (page 08, `7275:18747`). Newest toast sits nearest the edge.
- **Timeouts and WCAG 2.2.1:** 5 s with an action ("Undo", "Retry") is too short unless timers **pause on hover, focus-within and document hidden**. Recommend: Success/Neutral 5 000 ms; **Critical persists (Infinity) or ≥ 10 s**; any toast with an action ≥ 8 s. Design must confirm.
- Actions must also be reachable another way. Provide `altText` for the action (Radix pattern) and an F8 hotkey that focuses the toast region.
- Swipe: pointer-driven swipe-down to dismiss (direction follows position), with a threshold of about 50 px or a velocity check. Esc dismisses the focused toast.
- Max width isn't specified. Propose `min(420px, 100vw - 2*grid/margin)` with wrapping at 2 lines max.

### 6.4 Live regions
- Toast: region `role="region" aria-label="Notifications (F8)"` containing a list. Success and Neutral are `role="status"` (polite, atomic). **Critical is `role="alert"` (assertive).** Never steal focus.
- Alert: **don't default to `role="alert"`**. An Alert that is present on page load shouldn't announce. Use a `live` prop: `'off'` (default for static), `'polite'`, `'assertive'` (critical injected after a user action).
- Banner: not live by default; it's a `<section aria-label>` region.
- Skeleton: the container gets `aria-busy="true"` plus a visually hidden "Loading <thing>…" in a status region, and blocks get `aria-hidden`.
- Empty State (Search): the results container should announce "No results for “x”" through a polite status region.

### 6.5 z-index / layering — **no tokens**
Prefer the native **top layer** (`<dialog>.showModal()`, `popover`) where possible, and keep z tokens for non-top-layer fallbacks and sticky UI:
`--nz-z-base 0 · raised 1 · sticky 100 · app-bar 200 · banner 250 · dropdown/popover 1000 · drawer 1100 · modal 1200 · toast 1300 · tooltip 1400`.
**Architectural decision (LayerManager):** a native modal `<dialog>` makes everything outside it inert, **including a portalled toaster**. While a modal is open, a toast's action ("Undo") would be unreachable. Options: (a) the Toaster uses `popover="manual"` and re-shows itself whenever a modal opens so it sits above the modal in the top layer; or (b) a `ToastViewport` renders inside the active dialog (nested viewport via context); or (c) a non-native modal (aria-modal plus `inert` on siblings, excluding the toaster) with z tokens. Also: Select, Menu and Tooltip opened from inside a Dialog must portal into the dialog or use popover top-layer. Hide this choice behind a `LayerProvider` so it can be swapped.

### 6.6 Enter/exit motion — **not specified on this page (inferred spec)**
Motion tokens exist globally (Default/Reduced modes). Proposed mapping:

| Surface | Enter | Exit |
|---|---|---|
| Scrim | opacity 0→1, duration/base 220, easing/enter | opacity →0, duration/fast 140, easing/exit |
| Modal | opacity + scale 0.98→1 (scale/press) + translateY distance/float 8, duration/base, easing/enter | reverse, duration/fast, easing/exit |
| Drawer (right) | translateX(100%)→0, duration/slow 320, easing/enter | → 100%, duration/base 220, easing/exit |
| Toast | translateY(distance/reveal 12)+opacity, duration/base, easing/enter; reflow siblings with easing/standard | opacity + translateY or swipe-out, duration/fast, easing/exit |
| Skeleton | pulse opacity 1→0.55 loop ~1.2 s or shimmer | crossfade to content, duration/fast |
| Alert/Banner dismiss | — | height collapse + fade, duration/base, easing/exit |

Reduced mode: the tokens already give linear easing and 0/120 ms durations, so use opacity only, with no translate or scale and no skeleton animation. `easing/spring*` aren't valid CSS: use `linear()` approximations, or `@nizivo/motion` for spring-driven toast decks and sheet drags. Exit animations are implemented with `@starting-style` + `transition-behavior: allow-discrete` (native dialog/popover), or with a `Presence` component that delays unmount.

### 6.7 Glass surfaces
`Grove/Surface/Glass` (backdrop-blur 24 plus a shadow) and `Grove/Surface/Liquid Glass` (Figma-native GLASS, no CSS equivalent) exist but **no overlay on this page uses them**. Recommend a `surface="solid" | "glass"` prop on Toast, Dialog and Drawer, defaulting to solid. Glass maps to `backdrop-filter: blur(24px)` plus a translucent `bg/surface` (needs a new `bg/surface-glass` token with alpha) behind `@supports`, with a solid fallback. Ship it in core as an opt-in theme flag or in `@nizivo/lab`.

---

## 7. Accessibility and contrast (computed from snapshot hexes)

| Pair | Ratio | Verdict |
|---|---|---|
| Light Toast message `text/inverse` on `bg/inverse` | 17.36 | pass |
| Light Toast action `bg/accent`(lime/300) on `bg/inverse` | 11.80 | pass |
| **Dark Toast action `bg/accent`(lime/400) on `bg/inverse`(white)** | **1.75** | **FAIL** (4.5 needed). Root cause: a bg token used as text |
| Light Toast success icon green/500 on neutral/900 | 3.72 | pass (≥3) |
| **Dark Toast success icon green/300 on white** | **2.29** | **FAIL** (3:1 non-text) |
| Dark Toast critical icon red/500 on white | 4.33 | pass |
| Light Alert texts (primary, secondary) on all tints | 5.7–15.6 | pass |
| Light Alert Info icon `icon/brand` on blue/50 | 5.71 | pass, but semantically wrong colour |
| Light Alert Success icon green/500 on green/50 | 4.11 | pass |
| **Light Alert/Banner Warning icon amber/500 on amber/50** | **2.27** | **FAIL** (3:1). Use amber/600 or amber/700 (`text/warning` = 6.11) |
| Light Alert Critical icon red/500 on red/50 | 3.91 | pass |
| Light dismiss `icon/secondary` on tints | 3.87–4.31 | pass |
| Dark Alert Critical icon red/500 on neutral/850 | 3.63 | pass (marginal) |
| Light Critical button label white on red/600 | 5.69 | pass |
| **Dark Critical button label `text/inverse`(neutral/900) on red/500** | **4.01** | **FAIL** at 14 px Medium (Button owner; Modal Destructive depends on it) |
| Dark Primary button green/950 on green/400 | 5.17 | pass |
| Skeleton `bg/muted` on `bg/surface` (light / dark) | 1.15 / 1.29 | decorative; low visibility |
| **Dark `bg/subtle` vs `bg/surface` (Empty State container, Modal footer)** | **1.00** | **collapse**: both neutral/900 |

Hit targets: every button here is Md 40 px (`control-md`), below `size/touch-min` 44. Nothing on the page meets 44. Close icons are 16, 18 or 20 px with no padded wrapper, which fails WCAG 2.5.8 (24 px minimum) unless the code pads them. The Toast Action is a bare text node, roughly 33x20. Code: use IconButton sm (32) with a ≥44 px hit area under `@media (pointer: coarse)` using a pseudo-element, and render the Toast action as a ghost or link Button.

Other a11y issues:
- Colour plus icon convey tone, which is fine. Add a visually hidden tone prefix ("Error:") for SR in Toast and Alert when the message doesn't say it.
- Modal Destructive has no warning icon (optional).
- Focus-visible states aren't designed for any interactive element on this page. Use `Grove/Focus/Ring` / `Focus/Ring Critical` (the latter is for the destructive confirm).

---

## 8. Token and foundation gaps surfaced by this page

1. `overlay/scrim` (light and dark) and an optional `overlay/scrim-blur`.
2. A `z/*` layer scale (section 6.5).
3. `icon/info` and `border/info` (and solid `bg/info`, `bg/success`, `bg/warning` for future high-emphasis toasts).
4. `text/accent` or `text/accent-on-inverse` to replace `bg/accent` as the Toast action text colour (must resolve to ≥4.5:1 in both modes; in dark mode on a white inverse it needs a dark lime or green such as green/700).
5. `icon/warning-strong` or a changed `icon/warning` (amber/600+) for ≥3:1 on `bg/warning-subtle`.
6. `bg/critical-hover` and `bg/critical-pressed` (orphaned Button binds the primitive red/700).
7. Dark-mode `bg/subtle` must differ from `bg/surface` (e.g. neutral/850 or a dedicated `bg/surface-sunken`).
8. Component size tokens: `size/dialog-sm|md|lg` (e.g. 400/480/640), `size/drawer-md` 440, `size/toast-max` 420, `size/empty-media` 140, `size/banner-media` 72.
9. A toast duration token (`duration/toast` 5000, `duration/toast-action` 8000) or a documented constant.
10. Skeleton animation tokens (`duration/skeleton-pulse`, shimmer gradient stops) plus `radius/2xs` 6, or snap blocks to 4/8.
11. `space/3-5` (14) **should not be added**. Snap the Alert to 12 or 16.
12. Glass surface tokens (`bg/surface-glass` with alpha) if glass overlays are wanted.

---

## 9. Proposed React architecture (pluggable, everything swappable)

### 9.1 Cross-cutting design

- **One tone vocabulary** for all feedback: `type FeedbackTone = 'neutral' | 'info' | 'success' | 'warning' | 'critical'`, plus `'brand'` for Banner (Figma "Promo"). Styling goes through `data-tone` and CSS variables (`--nz-feedback-bg`, `--nz-feedback-icon`, …) defined in one tone map, so adding a tone is CSS-only.
- **Icon registry:** `<NizivoProvider icons={{ success, critical, info, warning, close }}>`. The default adapter is Lucide (circle-check, circle-x, info, triangle-alert, x) at 20 px, ~1.92 stroke on a 24 viewBox. Every component also accepts `icon={ReactNode | false}`.
- **Compound components + `asChild` slots** (Root, Icon, Title, Description, Actions, Close) so consumers can replace any part, and a simple props API layered on top for the 90 % case.
- **Behaviour engine behind internal primitives** (`@nizivo/ui/primitives`: Portal, Presence, FocusScope, DismissableLayer, ScrollLock, LayerProvider, LiveAnnouncer, VisuallyHidden). The default implementation uses native `<dialog>` and popover, so the engine can be swapped for React Aria, Base UI or another headless library without changing the public API.
- **Framework-agnostic toast store** (`createToastStore()`, plain TS, `useSyncExternalStore` binding). Multiple toasters are supported via `toasterId`, and the renderer is pluggable.
- **Persistence adapter** for dismissible Banners and Alerts (`dismissKey` + `persistence={localStorageAdapter | cookieAdapter | custom}`).
- **State via data attributes:** `data-state="open|closed"`, `data-side`, `data-swipe="start|move|end|cancel"`, `data-tone`. All styling is zero-runtime CSS with the configurable `--nz-` prefix, which keeps it RSC-safe.
- **Motion** uses tokens through CSS. The opt-in `@nizivo/motion` package adds springs, gesture drag for sheets and the toast deck.

### 9.2 Per-component API (summary; Figma → code mapping)

**Toast** (client; pattern; `@nizivo/ui`)
```ts
toast(message, opts?) ; toast.success|critical|neutral|info|warning(message, opts?) ; toast.promise(p, {loading, success, error})
toast.update(id, opts) ; toast.dismiss(id?)
type ToastOptions = { id?: string; tone?: FeedbackTone; icon?: ReactNode|false; description?: ReactNode;
  action?: { label: string; onClick: () => void; altText: string }; dismissible?: boolean /*true*/;
  duration?: number /*5000; critical: Infinity*/; onDismiss?(); onAutoClose?(); toasterId?: string }
<Toaster position="bottom-center" max={3} offset gap hotkey={['F8']} swipeDirection="down" pauseOnHover pauseOnFocusLoss surface="solid|glass" label="Notifications" />
<Toast.Root tone><Toast.Icon/><Toast.Message/><Toast.Action altText/><Toast.Close/></Toast.Root>  // custom renderers
```
Mapping: `Tone` → `tone` (Success/Critical/Neutral, plus info and warning for parity with Alert), Message → `message`, Action TEXT → `action.label`, trailing Icon/x → `dismissible`.

**Alert** (split: server shell, client dismiss island; composite; `@nizivo/ui`)
```tsx
<Alert tone="info" title="…" description="…" icon? action? dismissible? onDismiss? dismissLabel="Dismiss" live="off|polite|assertive" variant="subtle|outline" />
<Alert.Root tone><Alert.Icon/><Alert.Content><Alert.Title/><Alert.Description/></Alert.Content><Alert.Actions/><Alert.Dismiss/></Alert.Root>
```

**Banner** (split; composite; `@nizivo/ui`)
```tsx
<Banner tone="brand|warning|info|critical|success" media={<img/>} title description action={<Button/>} dismissible onDismiss dismissKey persistence aria-label layout="inline|stacked(auto on narrow)" />
<Banner.Root/Media/Content/Title/Description/Actions/Dismiss>
```
Mapping: `Tone=Promo` → `tone="brand"` with the media slot; `Tone=Warning` → `tone="warning"` with the icon in the media slot.

**Dialog / AlertDialog** (client; pattern; `@nizivo/ui`)
```tsx
<Dialog open defaultOpen onOpenChange modal size="sm|md|lg|full" dismissOnOutsideClick dismissOnEsc initialFocus returnFocus>
  <Dialog.Trigger asChild/>
  <Dialog.Content surface="solid|glass">        // portal + scrim + focus scope + scroll lock
    <Dialog.Header><Dialog.Title/><Dialog.Description/><Dialog.Close/></Dialog.Header>
    <Dialog.Body/>                              // scrollable, max-height calc(100dvh - 2*space/6)
    <Dialog.Footer align="end|between|stretch"/>
  </Dialog.Content>
</Dialog>
<AlertDialog tone="critical" onConfirm={async () => …} confirmLabel cancelLabel …>  // role=alertdialog, focus Cancel, no outside dismiss, loading confirm
confirm({ title, description, tone, confirmLabel }) => Promise<boolean>   // optional imperative helper
```
Mapping: `Type=Default` → `<Dialog>`, `Type=Destructive` → `<AlertDialog tone="critical">`.

**Drawer** (client; pattern; `@nizivo/ui`)
```tsx
<Drawer side="right|left|bottom|top" size="sm|md|lg|full" modal={true} … same parts as Dialog: Drawer.Header (Title + Drawer.Meta slot for badges) / Body / Footer / Close>
```
Responsive: `side` accepts a responsive object `{ base: 'bottom', md: 'right' }` (bottom sheet on Mobile). Drag-to-close and snap points go in `@nizivo/motion`. The Order Detail recipe goes in `@nizivo/commerce`.

**EmptyState** (server; composite; `@nizivo/ui`)
```tsx
<EmptyState media title description? actions headingLevel={3} size="sm|md|lg" surface="subtle|none" />
<EmptyState.Root/Media/Title/Description/Actions>
```
Mapping: `Context=Orders|Search` → docs recipes and presets, not a prop.

**Skeleton** (server; primitive; `@nizivo/ui`)
```tsx
<Skeleton shape="text|rect|circle|pill" width height radius animation="pulse|shimmer|none" />
<Skeleton.Text lines={3} widths={['100%','75%','50%']} />
<Skeleton.Group label="Loading orders">…</Skeleton.Group>   // aria-busy + status text
// Layout skeletons live with their component: KPITile.Skeleton, ProductRow.Skeleton (mirrors final layout per guidance)
```
Mapping: `Shape=Line` → `Skeleton.Text`, `Shape=KPI` → `KPITile.Skeleton` (page 04), `Shape=Row` → `ProductRow.Skeleton`/`OrderRow.Skeleton` (page 05).

### 9.3 Package placement
- `@nizivo/ui`: Toast/Toaster, Alert, Banner, Dialog, AlertDialog, Drawer, EmptyState, Skeleton, and overlay primitives (internal or `@nizivo/ui/primitives` subpath export).
- `@nizivo/motion` (opt-in): spring presets (from `easing/spring*`), toast deck, sheet drag and snap points, swipe physics.
- `@nizivo/commerce`: Order Drawer recipe and Order Summary (the Drawer demo content).
- `@nizivo/lab`: Liquid Glass surface (no CSS equivalent).

---

## 10. Extraction notes and gaps

- 11 Figma calls (1 failed on the 20 KB return limit and was re-split; no rate-limit errors).
- The orphaned main components' **location** couldn't be determined: `parent` is null and `removed` is false. They may be soft-deleted mains retained for instances, or leftovers from a copy. The design team should confirm and re-link the instances to `7275:11244` (Button), `7275:11397` (Input) and the page-02 Badge, and publish a real Icon page.
- The Drawer main component's inner padding bindings were read only at depth 3. The Header, Body and Footer frames showed no bound variables, so they're treated as RAW.
- Image renders (Banner 72 px, Empty State 140 px) are IMAGE fills. The asset source and format (PNG/WebP) and dark-mode variants weren't inspected.
- No motion, timing or a11y annotations exist on the page. Everything in sections 6.3–6.6 beyond "bottom-centre / one action / 5 s" is an engineering proposal, not designer intent.
