# 09 · 3D, Shader & Motion Lab — extraction + architecture report

- Figma file: `BIzJFf1wm8KP0YG2AVI1tP` (Grove UI Library → ships as **Nizivo UI**, `@nizivo/*`)
- Page: **"Grove · 09 3D, Shader & Motion Lab"** `7275:19608`
- Section: **"Grove · 11 3D, Shader & Motion Lab"** `7275:19609` (4000 × 1722). The page is numbered 09 but the section label says 11, so the numbering is inconsistent.
- Read on 2026-10-14. Access was read-only: 15 Figma MCP calls in total (3 of them errored), with no mutations.
- Screenshots: `scratchpad/figma/shots/09-lab-section.png` (3000 px), `09-lab-rays-hero.png` (1280 px), `09-lab-mesh-glass.png` (640 px)
- **No COMPONENT_SETs exist on this page.** It holds 136 nodes: 45 FRAME, 36 TEXT, 23 VECTOR, 17 INSTANCE, 14 RECTANGLE and 1 ELLIPSE. Every instance points to a local Grove component (Button, Toast, KPI Tile, Skeleton, Sparkline, Delta) or a local Icon/* component.
- **No non-Grove leftovers are referenced.** Every bound variable resolves to `Grove Color` or `Grove Space`, and every style is `Grove/*`.

---

## 0. TL;DR for the code pipeline

1. **The "3D" is pre-rendered raster, not real-time 3D.** All nine render placements (six library tiles and three hero props) are `IMAGE` fills using six unique image hashes. Hero Store, Orb and Tag reuse the Storefront, Insights and Discounts tile images. Nothing on the page implies three.js or WebGL for 3D. The tech is optimized transparent AVIF/WebP in `<img>`, with 2D CSS transform loops on top.
2. **The page has two custom Figma SHADER fills**, and both are animated and unnamed:
   - **Rays**: flowing silk light ribbons.
   - **Mesh gradient**: soft four-colour field.
   
   Their source could not be read: `get_shader` was refused because of ownership, and `list_file_shaders` returned `[]`. The web port is therefore a **visual approximation**. The implementation is a WebGL2 fragment shader in `@nizivo/lab`, with an SSR poster fallback.
3. **The frosted card uses `Grove/Surface/Glass`** (backdrop-blur 24 plus shadow), which is plain CSS `backdrop-filter`. **`Grove/Surface/Liquid Glass` has zero consumers anywhere in the file**, and so does `Surface/Inner Highlight`. The page demonstrates frosted glass, not liquid glass. Liquid glass can only be a lab approximation.
4. **The motion specimens use manual keyframes, and their values are hard-coded.** They are not variable-bound, and no `animationStyles` are used.
   - Chart-draw and Card-lift match their tokens exactly.
   - Toast-enter, Skeleton-pulse and all hero float loops **deviate from the tokens their labels claim**. Details are in §4.
5. **Several Grove Motion tokens have no specimen anywhere on the page:** `tilt/max-deg`, `magnetic/pull`, `stagger/item`, `duration/count-up`, `easing/spring`, `easing/spring-soft`, `scale/press` and `distance/reveal`. Parallax and cursor effects have neither tokens nor specimens. Their specs below are derived from tokens only and are not designed choreography.
6. **`easing/spring*` uses `spring(…)`, which is invalid CSS.** Precomputed `linear()` curves and the missing `duration/spring*` tokens are given in §6.

---

## 1. Page inventory (node IDs)

```
SECTION 7275:19609 "Grove · 11 3D, Shader & Motion Lab" (4000×1722, radius 2)
├─ FRAME 7275:19610 "Lab · Rays hero" 1280×640 @(80,80) r=32 clip  fill=SHADER(Rays)  timeline 4s
│  ├─ RECTANGLE 7275:19611 "Paper fade" 760×640  GRADIENT_LINEAR #f6f5ef @0.92 → @0.70 (60%) → @0 (100%)  [hard-coded]
│  ├─ FRAME 7275:19612 "Copy" 560×222 @(80,170)  auto-layout V gap20
│  │  ├─ TEXT 7275:19613 "Commerce that grows with you"  Grove/Display/L, text/primary
│  │  ├─ TEXT 7275:19614 "One calm workspace for products, orders and payouts."  Grove/Body/L, text/secondary
│  │  └─ FRAME 7275:19615 "Actions" H gap12
│  │     ├─ INSTANCE 7275:19616 Button [744:263] Variant=Primary Size=Md State=Default, Label "Start free trial", Trailing icon=true (Icon/arrow-right 738:73)
│  │     └─ INSTANCE 7275:19617 Button Variant=Secondary Size=Md, Label "Book a demo"
│  ├─ RECTANGLE 7275:19622 "Render · Store" 460×460 @(720,80)  IMAGE(8f64353790…) FIT  + keyframes TRANSLATION_Y
│  ├─ RECTANGLE 7275:19627 "Render · Orb"   150×150 @(1090,420) IMAGE(9be01264be…) FIT + keyframes TRANSLATION_Y
│  └─ RECTANGLE 7275:19632 "Render · Tag"   130×130 @(640,430) rot 12° IMAGE(7d2b02796f…) FIT + keyframes ROTATION
├─ FRAME 7279:81 "Lab · Rays hero" 1280×640 @(2623,344) r=32 — CHILDLESS duplicate, fill=SHADER(Rays) only, timeline 4s  ← scratch/export frame?
├─ FRAME 7275:19633 "Lab · Mesh + glass" 640×640 @(1440,80) r=32 clip  fill=SHADER(Mesh)  timeline 2s
│  └─ FRAME 7275:19634 "Glass card" 362×428  V pad16/16/24/16 gap16 r=28  fill #fff@0.42, stroke #fff@0.7 1px inside, effect style Grove/Surface/Glass
│     ├─ RECTANGLE 7275:19635 "Portrait" 328×240 r=18 IMAGE(b7900b915e…) FILL
│     ├─ FRAME 7275:19636 "Meta" V pad0/8 gap4 → TEXT "Priya Raman" (Heading/H3, text/primary), "Founder, Kiln & Thread" (Body/M, text/secondary)
│     └─ FRAME 7275:19639 "Stats" H pad0/8 gap8 → 3× chip FRAME (7275:19640 Orders, 7275:19643 Rating, 7275:19646 Since)
│          chip: V pad10/12 gap2 r=14 fill #fff@0.55; value Numeric/M text/primary; label Label/M text/secondary
├─ FRAME 7275:19649 "Lab · 3D render library" 1104×842 @(80,800) V pad48 gap32 r=28 fill bg/surface  timeline 2s (no keyframes inside)
│  ├─ Header: "3D render library" (Heading/H2) + "Clay and frosted green glass, one light. Always on a tinted card, never on white." (Body/M, text/secondary)
│  ├─ Row 7275:19653 H gap24: Tile·Shipping 7275:19654 (bg/brand-subtle), Tile·Checkout 7275:19660 (bg/accent-subtle), Tile·Payments 7275:19666 (bg/inverse)
│  └─ Row 7275:19672 H gap24: Tile·Discounts 7275:19673 (bg/accent-subtle), Tile·Storefront 7275:19679 (bg/brand-subtle), Tile·Insights 7275:19685 (bg/inverse)
│      Tile = V pad20 gap12 r=28, 320×312 → RECTANGLE "Render" 280×220 IMAGE FIT; Footer H (TEXT Heading/H3 FILL + "Pill" 40×40 r=999 bg/surface with Icon/arrow-up-right 20px icon/primary)
└─ FRAME 7275:19691 "Lab · Motion specimens" 1040×842 @(1264,800) r=28 fill bg/surface (NOT auto-layout)  timeline 4s
   ├─ Header: "Motion specimens" (Heading/H2) + "Every animation below is driven by a Grove/Motion token. Play the frame to preview." (Body/M)
   ├─ Cell 7275:19695 "Toast · enter" 448×300 r=20 bg/subtle → label "duration/base · easing/enter" (Mono/M text/tertiary); INSTANCE 7275:19709 Toast [756:820] Tone=Success
   ├─ Cell 7275:19710 "Chart · draw" → label "duration/chart-draw · easing/standard"; VECTOR 7275:19717 "Line" 360×100 stroke chart/primary 3px round
   ├─ Cell 7275:19718 "Card · lift" → label "distance/lift · scale/hover"; INSTANCE 7275:19732 KPI Tile [752:380] Tone=Surface Trend=Up ("Returning rate", "$48,290", Delta 12.4%)
   └─ Cell 7275:19733 "Skeleton · pulse" → label "duration/slower · loop"; INSTANCE 7275:19743 Skeleton [756:1169] Shape=KPI
```

> **Corrected 2026-10-14 (week 2 read):** `756:1169` is the Skeleton component set, not the `Shape=KPI` variant. The specimen `7275:19743` is an instance of `756:1158` (`Shape=KPI`); the other variants are Line `756:1154` and Row `756:1162`. See [11-w2-server-safe-components.md](11-w2-server-safe-components.md) §2 and §4.16.

### All documentation text on the page, verbatim

| Node | Text |
|---|---|
| 7275:19651 | 3D render library |
| 7275:19652 | Clay and frosted green glass, one light. Always on a tinted card, never on white. |
| 7275:19693 | Motion specimens |
| 7275:19694 | Every animation below is driven by a Grove/Motion token. Play the frame to preview. |
| 7275:19697 / 19698 | Toast · enter — `duration/base · easing/enter` |
| 7275:19712 / 19713 | Chart · draw — `duration/chart-draw · easing/standard` |
| 7275:19720 / 19721 | Card · lift — `distance/lift · scale/hover` |
| 7275:19735 / 19736 | Skeleton · pulse — `duration/slower · loop` |
| Hero copy | "Commerce that grows with you" / "One calm workspace for products, orders and payouts." / "Start free trial" / "Book a demo" |
| Glass card | "Priya Raman" / "Founder, Kiln & Thread" / 1,906 Orders · 4.9 Rating · 2021 Since |
| Tiles | Shipping, Checkout, Payments, Discounts, Storefront, Insights |

The page has no Dev Mode annotations, no node descriptions and no documentationLinks, because there are no components on it. None of the Grove Motion variables has a description, and **all 20 have empty `scopes`**, which hides them from every Figma property picker.

---

## 2. Visual language

- **Calm, editorial and spacious.** The page is warm off-white "paper" (`#f6f5ef`), not pure white. Brand greens run from deep forest `green/600-700` to lime `lime/300`, with a single **orange accent that appears only inside the Rays shader**.
- **Radii are large and soft:** 28–32 on showcase frames and tiles, 20 on specimen cells, and pill (999) on buttons and affordances. Radii 32, 18 and 14 are off-scale (§7).
- **Shadows are very low-contrast** and tinted with neutral/950. Glass uses a 16/40/-8 shadow at 10 %.
- **Material language:**
  - Clay (matte off-white) combined with frosted green glass, under one light.
  - Renders always sit on tinted tiles (`bg/brand-subtle`, `bg/accent-subtle`, `bg/inverse`) and never on white. That is an explicit art-direction rule (7275:19652).
- **Motion personality:**
  - Slow ambient loops: a 4 s float/bob of 8–14 px and a ±6° sway.
  - Fast, crisp UI transitions of 140–220 ms with a strong ease-out (`cubic-bezier(0.2,0,0,1)`).
  - Nothing bouncy is demonstrated, even though spring tokens exist.
- **Grain** at 0.025–0.03 sits on both shaders, giving a filmic and slightly tactile feel.
- **Density:** the hero is generous (Display/L 56 px and 40 px controls). Specimens use Label/M Strong with Mono/M token captions.

---

## 3. Shader experiments (Figma SHADER fills)

### 3.1 Raw shader property definitions (verbatim from the fill's `propertyMetadata`; instance values equal the defaults)

**Rays.** The applied fill id is `d4f1b93f0f6afdb57ab2f3555611afc78bc1e215/60962437ab10e7a266ac1568bbd2e27aedd8e47c`, and `listAvailableShaders` lists it as `967f8e2d-c236-41c7-b44f-1aa2511d9566/60962437…`. Its name is empty, type `fill`, imported. It is used on 7275:19610 and 7279:81.

| defId | name | type | default | hex | nearest Grove primitive (CIE76 ΔE) |
|---|---|---|---|---|---|
| 2540194389:3795827174 | ground | COLOR | (0.965, 0.961, 0.937, 1) | #f6f5ef | neutral/50 (1.8) |
| 4130485509:33465210 | ray1 | COLOR | (0.129, 0.420, 0.282, 1) | #216b48 | green/600 (1.3) |
| 2575344715:3504030248 | ray2 | COLOR | (0.773, 0.882, 0.384, 1) | #c5e162 | lime/300 (4.0) |
| 2556707313:1449221598 | ray3 | COLOR | (0.961, 0.651, 0.247, 1) | #f5a63f | amber/500 (**10.6, off-palette**) |
| 3352353951:1730039928 | speed | NUMBER | 0.5 | | |
| 3440007944:4169534642 | angle | NUMBER | 18 (deg) | | |
| 3594028300:2961770056 | intensity | NUMBER | 1.2 | | |
| 3623013977:3401512652 | width | NUMBER | 1 | | |
| 3671303981:859147366 | grain | NUMBER | 0.025 | | |

**Mesh gradient.** The applied fill id is `1b667ebae86108c0890b07a303985a8f1066d863/728a9a9cf991339036ce66ddc900e71f9897f427`, and the available-list id is `8518d131-ab6d-4df1-9063-4a89c1fd01e6/728a9a9c…`. Its name is empty, type `fill`, imported. It is used on 7275:19633.

| defId | name | type | default | hex | nearest |
|---|---|---|---|---|---|
| 2920517363:385043638 | color1 | COLOR | (0.871, 0.925, 0.878) | #deece0 | green/100 (3.3) |
| 3568544580:3655538862 | color2 | COLOR | (0.773, 0.882, 0.384) | #c5e162 | lime/300 (4.0) |
| 3351187373:2310996784 | color3 | COLOR | (0.129, 0.420, 0.282) | #216b48 | green/600 (1.3) |
| 3139703444:3090832514 | color4 | COLOR | (0.965, 0.961, 0.937) | #f6f5ef | neutral/50 (1.8) |
| 2405737805:2795803376 | softness | NUMBER | 1.4 | | |
| 3730280461:1276617392 | speed | NUMBER | 0.3 | | |
| 3786171159:3991035438 | grain | NUMBER | 0.03 | | |

Shaders available to the file but **not used**: "Dynamic lighting" (effect, not imported, `5e8e864c-…/557320302f…`) and "Liquid Glass" (fill shader, not imported, `3139c8d7-…/65aaa675…`). This shader is distinct from the `Grove/Surface/Liquid Glass` GLASS effect style.

### 3.2 Visual description, from the screenshots

- **Rays:** about 15 thin, softly blurred ribbons that sweep diagonally (about 18° from vertical) in green, lime and orange. Their thickness and blur vary, as though the light is out of focus. They sit on a warm paper ground with fine grain, and they animate by drifting and waving (`speed`).
- **Mesh:** a soft four-point colour field. It is lime at the top-right, deep green at the bottom-left, and pale mint and paper in the middle. It has light grain and drifts slowly (`speed` 0.3, a 2 s frame timeline).

### 3.3 Issues

- Both shaders are **unnamed**. They should be named `Grove/Shader/Rays` and `Grove/Shader/Mesh`.
- Shader colours are raw RGB and **not token-bound**, because Figma shader properties can't bind variables. That means **no dark-mode behaviour is defined**.
- `ray3` orange `#f5a63f` **is not in the Grove palette**. The nearest primitive is amber/500 at ΔE 10.6.
- `#f6f5ef` "paper" is not a token. It is closest to neutral/50 (#f6f7f4, ΔE 1.8). Either add `bg/paper` or snap it to neutral/50.
- 7279:81 is a childless duplicate of the Rays hero. It is likely a scratch or export frame, so it should be deleted or renamed `Lab · Rays (bare)`.
- **Hero copy over the animated shader has unreliable contrast.** The paper fade drops to alpha ≈0.28 at the headline's right edge (x≈640) and ≈0.50 at the body's right edge (x≈540). Worst cases are below.

  | Text | Behind it | Contrast |
  |---|---|---|
  | `text/secondary` | ray1 (dark green), headline end | **1.78:1** |
  | `text/secondary` | ray1, body end | **2.74:1** |
  | `text/primary` | ray1, headline end | 4.77:1 (passes, because large text) |

  Because the rays move, the result is non-deterministic. The fix is to keep paper-fade alpha ≥ 0.9 across the whole copy column (0 → 640 px). An alternative is to have the shader mask its rays out of the copy region with a `copyMask` uniform.

### 3.4 Tech, cost and fallbacks

| | Rays | Mesh gradient |
|---|---|---|
| Tech | WebGL2 fragment shader on one full-viewport triangle. No three.js: the runtime is about 2 KB plus 1–2 KB of GLSL. WebGPU is unnecessary, though it could be added later through the renderer adapter (§9). | Same runtime. A CSS-only approximation (stacked radial gradients plus static SVG `feTurbulence` grain) is good enough for the poster and the reduced or low-power path. |
| JS cost | ~4–6 KB min+gz including the shared `ShaderCanvas` runtime | ~1 KB more once the runtime is shared |
| GPU cost | 1280×640 at DPR 2 is about 3.3 MP per frame. Per-pixel work covers about 3 bands × N ribbons, analytic soft falloff and a hash grain. Expect ~1–3 ms per frame on integrated GPUs. Battery drain on mobile is the main concern. | Cheaper: 4-colour weighted blend with noise warp |
| Budget rules | Cap DPR at 1.5 and fps at 30 for ambient work. Pause when off-screen (IntersectionObserver) and when the tab is hidden (`visibilitychange`). Use **one shared WebGL context** per page, because browsers cap live contexts at about 16. | Same |
| SSR / hydration | The server renders a **poster**: a CSS gradient or a pre-rendered AVIF of frame t=0. The `<canvas>` is created only in `useEffect` after mount and crossfades in on the first rendered frame. No `window` access happens during render, so there is no hydration mismatch. The poster, not the canvas, is the LCP element. | Same |
| Reduced motion | Set `speed = 0` and render **one static frame** (Grove Motion Reduced mode zeroes every distance token). An alternative is to skip WebGL and keep the poster. | Same |
| Other fallbacks | No WebGL2 or a lost context, `Save-Data` / `prefers-reduced-data`, or a low-end device (`deviceMemory` ≤ 2) all fall back to the poster only. | Same |
| A11y | The canvas is decorative: `aria-hidden="true"` and `role="presentation"`, never focusable. Text contrast is guaranteed by the scrim, never by the shader. | Same |
| Package | **@nizivo/lab** | **@nizivo/lab** (with the CSS poster as a server export) |

---

## 4. Motion specimens: keyframes against tokens

Notes on reading the keyframes:
- Each keyframe's `easing` describes the segment **arriving** at that keyframe. The data confirms this: the toast's 0.52 s keyframe carries `easing/enter` and its 3.34 s keyframe carries `easing/exit`.
- The first keyframe's easing (0.5,0,0.5,1) is Figma's default and is inert.
- Times are seconds on the top-level frame timeline.

### 4.1 Toast · enter — INSTANCE 7275:19709 (Toast [756:820] Tone=Success), frame timeline 4 s

| Track | Keyframes (t s → value, easing) |
|---|---|
| OPACITY | 0.30→0 · 0.52→1 cubic(0,0,0,1) · 3.20→1 HOLD · 3.34→0 cubic(0.3,0,1,1) |
| TRANSLATION_Y | 0.30→16 · 0.52→0 cubic(0,0,0,1) · 3.20→0 HOLD · 3.34→8 cubic(0.3,0,1,1) |

| Aspect | Value in keyframes | Token | Match |
|---|---|---|---|
| Enter duration | 220 ms | duration/base 220 | ✓ |
| Enter easing | (0,0,0,1) | easing/enter | ✓ |
| Enter distance | **16 px** | distance/reveal = **12** | ✗ hard-coded and off-token |
| Exit duration | 140 ms | duration/fast 140 | ✓ (missing from the label) |
| Exit easing | (0.3,0,1,1) | easing/exit | ✓ (missing from the label) |
| Exit distance | 8 px | equals distance/float (8), which is semantically the wrong token | ✗ needs `distance/exit` or a 50 % reveal |
| Visible time | **2.68 s** (0.52 → 3.20) | no token | ✗ gap |

**Code mapping:**
- The enter is CSS only. Use `@starting-style { opacity:0; translate:0 var(--nz-distance-reveal) }` with `transition: opacity var(--nz-duration-base) var(--nz-easing-enter), translate …`.
- The exit uses `transition-behavior: allow-discrete` so it works on `[popover]` / `display`.
- No JS is needed for the motion itself. The toast queue (timers, pause on hover and focus) lives in core `@nizivo/ui` Toast.

**A11y:** an auto-dismiss under 3 s on a toast that has an **action** ("View") fails WCAG 2.2.1 (Timing Adjustable). The fix is to propose `duration/toast` ≥ 5000 ms, pause on hover and focus-within, and never auto-dismiss toasts with actions (or give them ≥ 10 s). The live region should be `role="status"` (polite).

**Cross-reference to page 07:** in the Toast instance, the action text "View" (I7275:19709;756:793) is filled with **`bg/accent` (a background token used as a text colour)**. That gives 11.8:1 in Light but **1.75:1 in Dark** (lime/400 on white `bg/inverse`), which fails. It needs a `text/on-inverse-accent` token.

The success icon (icon/success #2e8358) on bg/inverse reaches 3.72:1, which passes the 3:1 bar for non-text.

### 4.2 Chart · draw — VECTOR 7275:19717 (stroke chart/primary 3 px, round cap)

| Track | Keyframes |
|---|---|
| PATH_TRIM_END | 0.20→0 · 0.90→1 cubic(0.2,0,0,1) |

This specimen matches its tokens exactly: 700 ms = `duration/chart-draw` and (0.2,0,0,1) = `easing/standard`.

**Code:** SVG `pathLength="1"` with `stroke-dasharray:1; stroke-dashoffset:1→0` as a CSS animation. It needs no JS, works in RSC, and is triggered by a `data-inview` attribute, which is optional through the motion package. In Reduced mode the duration is 0, so the line renders fully drawn.

**Package:** `@nizivo/charts` uses the CSS recipe directly. The recipe is also exported from `@nizivo/motion/css`.

### 4.3 Card · lift — INSTANCE 7275:19732 (KPI Tile [752:380] Tone=Surface Trend=Up)

| Track | Keyframes |
|---|---|
| TRANSLATION_Y | 1.00→0 · 1.22→−4 cubic(0.2,0,0,1) · 2.60→−4 HOLD · 2.82→0 cubic(0.2,0,0,1) |
| SCALE_XY | 1.00→1 · 1.22→1.02 cubic(0.2,0,0,1) · 2.60→1.02 HOLD · 2.82→1 cubic(0.2,0,0,1) |

The tokens match: −4 = distance/lift, 1.02 = scale/hover, 220 ms = duration/base and easing/standard. The label omits the duration and easing.

**Gaps:**
- There is **no elevation change on lift**. The KPI Tile carries no effect style at all; it should probably go from Elevation/1 to Elevation/2.
- There is no `scale/press` (0.98) state.
- The lift is shown on a **non-interactive** KPI Tile. Lift should apply only to interactive cards (link or button). Applied to static content it creates a false affordance.
- Content nit: the label "Returning rate" sits next to a currency value "$48,290".

**Code:** CSS only: `@media (hover:hover){ .card[data-interactive]:hover { translate:0 calc(var(--nz-distance-lift)*-1); scale:var(--nz-scale-hover); box-shadow:var(--nz-elevation-2) } }`, plus `:active { scale: var(--nz-scale-press) }`. The `:focus-visible` state shows the focus ring and **no lift**, so the layout stays stable for keyboard users. All of this belongs in core `@nizivo/ui` Card CSS.

### 4.4 Skeleton · pulse — INSTANCE 7275:19743 (Skeleton [756:1169] Shape=KPI)

> **Corrected 2026-10-14 (week 2 read):** the instance's main component is `756:1158` (`Shape=KPI`); `756:1169` is its component set (§1).

| Track | Keyframes |
|---|---|
| OPACITY | 0→1 · 1→0.5 · 2→1 · 3→0.5 · 4→1, all EASE_IN_AND_OUT (0.42,0,0.58,1) |

- **Mismatch:** the label says `duration/slower` (480 ms), but the half-cycle is **1000 ms** (a 2 s period). The easing (0.42,0,0.58,1) is CSS `ease-in-out`, which is **not a Grove token**.
- **Hazard:** naively mapping this loop onto Reduced-mode `duration/slower` (160 ms) would make the pulse *faster* in reduced mode, at roughly 3 Hz. **Loops must stop in Reduced mode, not shorten.**

**Code:** CSS `@keyframes nz-pulse` with `animation: nz-pulse var(--nz-duration-pulse, 2000ms) var(--nz-easing-ambient) infinite`. In Reduced mode use `animation:none; opacity:.7`. Core `@nizivo/ui` Skeleton should also set `aria-hidden` on the blocks, with `aria-busy="true"` on the region it replaces.

### 4.5 Hero ambient float loops (frame 7275:19610, timeline 4 s, presumably looping)

| Node | Track | Keyframes | Token check |
|---|---|---|---|
| 7275:19622 Render · Store | TRANSLATION_Y | 0→0 · 2→−10 ease-in-out · 4→0 ease-in-out | **−10 ≠ distance/float 8** |
| 7275:19627 Render · Orb | TRANSLATION_Y | 0→−8 · 1.5→+6 · 4→−8 (asymmetric) | **range 14 ≠ 8** |
| 7275:19632 Render · Tag | ROTATION (base 12°) | 0→0 · 2→−6 · 4→0 | −6 equals tilt/max-deg numerically, but that token is meant for pointer tilt |

- All three use (0.42,0,0.58,1) or (0.5,0,0.5,1), and neither is a Grove easing. The 4 s period has no duration token.
- **Proposed tokens:** `duration/ambient` = 4000, `easing/ambient` = `cubic-bezier(0.45,0,0.55,1)` (sine in-out), `distance/float` (8, already exists), and `rotate/sway` = 6deg.
- **Code:** CSS `@keyframes` on `translate`/`rotate` only, which stays on the compositor and needs no JS. Stagger the phase with `animation-delay: calc(var(--i) * -1.3s)`. In Reduced mode, `animation: none`.
- **Package:** `@nizivo/motion` (`<Float>` and the CSS class), because it is token-backed and CSS-only.

---

## 5. Surfaces: glass, liquid glass, grain

### 5.1 Glass card — FRAME 7275:19634, effect style `Grove/Surface/Glass` (its only consumer in the file)

| Property | Value | Token? |
|---|---|---|
| backdrop blur | 24 | style-bound, but the effect colours are hard-coded inside the style |
| shadow | 0 16 40 −8 #1013111a | same as above |
| fill | #ffffff @ 0.42 | ✗ no alpha-white or glass token |
| stroke | #ffffff @ 0.70, 1 px inside | ✗ |
| radius | 28 | ✗ unbound (value equals radius/2xl) |
| padding / gap | 16, 16, 24, 16 / 16 | ✗ unbound (space/4, space/6) |
| Portrait radius | 18 | ✗ off-scale |
| Stat chip | r 14 (off-scale), pad 10/12 (10 is off-scale), gap 2, fill #fff @ 0.55 | ✗ |

**Contrast** (white @ 42 % over the mesh colour behind it):

| Behind the card | `text/primary` | `text/secondary` |
|---|---|---|
| Light mint (color1) | 15.5 | 5.8 |
| Lime | 13.9 | 5.2 |
| **Deep green (color3)** | 6.6 | **2.47 ✗** |

The chips at 55 % reach 4.37:1 for `text/secondary`, which is still under 4.5. The fix is to raise the glass fill to ≥ 0.6 when it sits over dark backdrops, or add a `surface/glass-fill-strong` token.

**Tech:**
- CSS only: `background: var(--nz-surface-glass-fill); backdrop-filter: blur(24px) saturate(1.2); -webkit-backdrop-filter: …; border: 1px solid var(--nz-surface-glass-border); box-shadow: …`.
- `@supports not (backdrop-filter: blur(1px))` falls back to an opaque `bg/surface` at 0.92.
- Where supported, `@media (prefers-reduced-transparency: reduce)` makes it opaque.
- Dark mode needs its own values; none are defined (white 42 % over a dark mesh would look milky).

**Cost:** backdrop blur is GPU work proportional to the element's area. Over an animated shader it **recomputes every frame**, so that combination should drop the shader to 30 fps or freeze it behind large glass surfaces.

**RSC:** server component with no JS.

**Package:** core **`@nizivo/ui`**. It is a foundation effect style, so expose it as `<Surface material="glass">` or a `.nz-surface-glass` utility.

### 5.2 Liquid Glass — `Grove/Surface/Liquid Glass` (GLASS effect), **0 consumers anywhere in the file**

- The style holds `radius 12` (frost), `refraction 0.25`, `depth 14`, `lightAngle 135°`, `lightIntensity 0.55` and `dispersion 0.12`.
- **There is no CSS equivalent.** The realistic web approximations are listed below. The Surface/Glass recipe is the base layer, and Liquid Glass is a progressive enhancement on top of it.
  1. **SVG `feDisplacementMap` + `backdrop-filter: url(#lg)`** with a displacement map generated per element size. Chromium supports this; Safari and Firefox ignore `url()` in backdrop-filter, so they keep the blur fallback. The specular rim is a CSS inset highlight: `Surface/Inner Highlight` (0 1 0 0 #ffffffb2) plus a conic or linear rim at `lightAngle`. Dispersion is approximated with three channel-offset displacement passes, which is expensive.
  2. **A WebGL pass**, only when the backdrop is itself our shader canvas. The same context then renders the refraction of the shader texture under the glass rect, which looks right and costs little. It cannot refract arbitrary DOM.
- **Cost:** high. The SVG filter runs every frame whenever the backdrop changes. Restrict it to small elements (pills, toolbars, nav bars) and never apply it to scrolling lists.
- **SSR:** the server renders the Surface/Glass fallback, and the client upgrades after feature detection. **Reduced motion / transparency:** use the opaque surface.
- **Package:** **`@nizivo/lab`** (experimental, `unstable_LiquidGlass`).
- The design system has no designed specimen of Liquid Glass. Before building it, the designers should either add a Lab specimen or delete the style.

### 5.3 Grain / noise

Grain exists only as a shader uniform (0.025–0.03). There is no NOISE or TEXTURE effect on any node.
- **Tech:** a static SVG `feTurbulence` data-URI overlay at about 3–4 % opacity with `mix-blend-mode: multiply`, or the shader's own grain.
- **Cost:** negligible when it is static. Never animate grain, because it flickers and hurts accessibility.
- **Package:** a CSS utility in `@nizivo/lab`, or folded into the shader backdrops.

---

## 6. Token-only effects (no specimen on the page)

The Grove Motion collection (modes Default and Reduced, 20 vars, all with empty scopes and no descriptions):

| Variable | Default | Reduced | WEB codeSyntax |
|---|---|---|---|
| duration/instant | 80 | 0 | var(--grove-duration-instant) |
| duration/fast | 140 | 0 | var(--grove-duration-fast) |
| duration/base | 220 | 120 | var(--grove-duration-base) |
| duration/slow | 320 | 120 | var(--grove-duration-slow) |
| duration/slower | 480 | 160 | var(--grove-duration-slower) |
| duration/count-up | 900 | 0 | var(--grove-duration-count-up) |
| duration/chart-draw | 700 | 0 | var(--grove-duration-chart-draw) |
| easing/standard | cubic-bezier(0.2, 0, 0, 1) | linear | var(--grove-easing-standard) |
| easing/enter | cubic-bezier(0, 0, 0, 1) | linear | var(--grove-easing-enter) |
| easing/exit | cubic-bezier(0.3, 0, 1, 1) | linear | var(--grove-easing-exit) |
| easing/spring | spring(1, 260, 24, 0) ✗ invalid CSS | linear | var(--grove-easing-spring) |
| easing/spring-soft | spring(1, 170, 26, 0) ✗ invalid CSS | linear | var(--grove-easing-spring-soft) |
| distance/lift | 4 | 0 | var(--grove-distance-lift) |
| distance/reveal | 12 | 0 | var(--grove-distance-reveal) |
| distance/float | 8 | 0 | var(--grove-distance-float) |
| tilt/max-deg | 6 | 0 | var(--grove-tilt-max-deg) |
| scale/press | 0.98 | 1 | var(--grove-scale-press) |
| scale/hover | 1.02 | 1 | var(--grove-scale-hover) |
| stagger/item | 40 | 0 | var(--grove-stagger-item) |
| magnetic/pull | 6 | 0 | var(--grove-magnetic-pull) |

The distance, duration and stagger values are **unitless floats**. The token build must append `ms`, `px` and `deg` according to each group. The emitter needs a group-to-unit map: `duration/* → ms`, `distance/* → px`, `tilt/* → deg`, `stagger/* → ms`, `magnetic/* → px`, `scale/* → unitless`.

### 6.1 Spring tokens → CSS `linear()`, solved numerically with mass, stiffness, damping and initial velocity 0

| Token | ω₀ | ζ | Overshoot | Settle (0.5 %) |
|---|---|---|---|---|
| easing/spring (1, 260, 24) | 16.12 rad/s | 0.744 (under-damped) | 2.8 % | **≈ 440 ms** |
| easing/spring-soft (1, 170, 26) | 13.04 rad/s | 0.997 (≈ critical) | 0 % | **≈ 573 ms** |

```css
--nz-easing-spring: linear(0, 0.0484, 0.1467, 0.2703, 0.4012, 0.5275, 0.6418, 0.7403, 0.8217, 0.8863, 0.9357, 0.9718, 0.9969, 1.0131, 1.0225, 1.0269, 1.0278, 1.0264, 1.0236, 1.0201, 1.0165, 1.013, 1.0098, 1.0071, 1);
--nz-duration-spring: 440ms;
--nz-easing-spring-soft: linear(0, 0.0462, 0.145, 0.2551, 0.3664, 0.4776, 0.5698, 0.6495, 0.7213, 0.7765, 0.8219, 0.8611, 0.8904, 0.9138, 0.9335, 0.948, 0.9595, 0.969, 0.9759, 0.9813, 0.9858, 0.989, 0.9915, 0.9935, 1);
--nz-duration-spring-soft: 573ms;
```

These are 25 samples. The token build should regenerate them with a solver at around 40 samples rather than hand-editing them.

- **New tokens needed:** `duration/spring` and `duration/spring-soft`, because `linear()` requires an explicit duration.
- **JS export:** emit `{ type:'spring', mass:1, stiffness:260, damping:24 }` for gesture-driven springs, so that Motion (framer-motion) and our own tiny solver can consume it.

### 6.2 Effect specs (derived from tokens; the choreography is not designed and needs design sign-off)

| Effect | Token(s) | Proposed behaviour | Tech | Runtime cost | SSR / hydration | Reduced mode | Package |
|---|---|---|---|---|---|---|---|
| **3D pointer tilt** | tilt/max-deg 6 | `rotateX/Y` follows the pointer position over the element, clamped to ±6°, with `perspective(800px)`. Releases back with easing/spring-soft. Optional specular sheen via `--nz-tilt-x/y` in a gradient. | CSS + tiny JS (~0.6 KB): pointermove → rAF-batched writes to CSS vars | Low (compositor transform only) | Hydration-safe: static by default, attaches listeners in an effect. Active only under `(hover:hover) and (pointer:fine)`. | 0° (token Reduced = 0), and listeners are not attached | **@nizivo/motion** (token-backed) |
| **Magnetic hover** | magnetic/pull 6 | The element translates toward the pointer, up to 6 px, while the pointer is within the element bounds plus a radius. Releases with easing/spring. Only for primary CTAs and icon buttons. | Tiny JS (~0.5 KB), shared rAF | Low | Same as tilt. Never moves the hit target away from the pointer: translate the **inner** visual only. | Off | **@nizivo/motion** |
| **Stagger** | stagger/item 40 | Children enter with a `--i × 40 ms` delay, capped at about 8 items (320 ms) so long lists don't drag. | CSS only: the server writes `style={{'--i': i}}`, and `transition-delay: calc(var(--i) * var(--nz-stagger-item))` | ~0 | RSC-safe | 0 delay, which the Reduced token already gives | **@nizivo/motion** (`<Stagger>` server component plus CSS) |
| **Count-up** | duration/count-up 900, Numeric/* text styles ("tabular-nums; animate with count-up") | The number animates from 0 (or the previous value) to the target with easing/standard on first view or on value change. Formatting uses `Intl.NumberFormat` (currency, percent, compact). | Client JS (~0.7 KB), rAF, shared frame loop | Low | **Split.** The server renders the **final formatted value**, so there's no CLS or hydration mismatch and no-JS shows the correct number. The client resets visually to the start only after IntersectionObserver fires. Use `font-variant-numeric: tabular-nums` with a reserved width. | No animation; the final value is shown | **@nizivo/motion** |
| **Press** | scale/press 0.98 | `:active` scale on buttons and interactive cards | CSS | ~0 | RSC | 1 (Reduced = 1) | core **@nizivo/ui** CSS |
| **Reveal on scroll** | distance/reveal 12, duration/slow 320, easing/enter | Section and element enter from opacity 0 and translateY 12 | CSS scroll-driven animations (`animation-timeline: view()`) behind `@supports`. The fallback is an IntersectionObserver toggling `data-inview`. | ~0 / tiny | Content must stay visible with no JS. Start the hidden state only under `html[data-nz-js]` so there's no FOUC risk. | No transform, instant | **@nizivo/motion** |
| **Parallax** | none, which is a **token gap** | Layered hero props move at 0.9×/1.1× scroll | CSS `animation-timeline: scroll()` on `translate`. Leave it static where unsupported. | ~0 JS; layer promotion | RSC-safe | Off | **@nizivo/lab** (unspecified) |
| **Cursor effects** (custom cursor, follower, spotlight) | none | Not specified. A pointer-tracked spotlight gradient on cards is possible (`--mx/--my` vars). | Tiny JS | Low to moderate. A follower element forces continuous rAF. | Client island | Off | **@nizivo/lab** (not recommended for product UI) |
| **Real-time 3D** (GLB models) | none | Not designed. The renders are raster. If ever needed, use a `<Model3D>` adapter with lazy three.js / R3F behind a subpath. | WebGL (three.js ~150 KB+) | High | Poster image on the server, then a lazy client island | Poster | **@nizivo/lab/three** (optional peer dep, never default) |

---

## 7. Token binding audit (hard-coded values)

Correctly bound:
- All text uses Grove text styles.
- Text and icon colours on this page are Grove Color variables. The one misuse is the Toast "View" (§4.1).
- Tile fills are bound.
- Button and KPI padding and radius are bound inside their components.

**Hard-coded or unbound values on this page:**

| Node | Property | Value | Should be |
|---|---|---|---|
| 7275:19610, 7275:19633, 7279:81 | cornerRadius | 32 | no token (radius/2xl = 28): add `radius/3xl` or snap to 28 |
| 7275:19611 Paper fade | gradient | #f6f5ef @ .92/.70/0 | `bg/paper` plus an `overlay/paper-fade` gradient token |
| 7275:19634 Glass card | fill / stroke / radius / padding / gap | #fff@.42 / #fff@.70 / 28 / 16·24 / 16 | surface/glass-fill, surface/glass-border, radius/2xl, space/4, space/6 |
| 7275:19635 Portrait | radius | 18 | off-scale: lg 16 or xl 20 |
| 7275:19640/43/46 chips | radius / padding / fill | 14 / 10·12 / #fff@.55 | off-scale radius and padding. Use surface/glass-chip. |
| 7275:19649 library frame | padding / gap / radius | 48 / 32 / 28 | space/12, space/8, radius/2xl (unbound) |
| 7275:19653/19672 rows | gap | 24 | space/6 |
| Tiles (×6) | padding / gap / radius | 20 / 12 / 28 | space/5, space/3, radius/2xl |
| Pills (×6) | size / radius | 40 / 999 | size/control-md, radius/full |
| 7275:19691 specimens + cells | radius | 28 / 20 | radius/2xl / radius/xl |
| All keyframes | values / easings | §4 | Figma can't bind keyframes, so the code must reference tokens by name. Add a **Code Connect-style mapping** or a naming convention in the layer name, e.g. `motion: reveal`. |
| Shader colours | all | §3 | Figma can't bind them. The code maps uniforms to tokens (§9). |
| Button 7275:19616 effects (component on page 02) | inner + drop shadow | 0 1 0 #ffffff29 inset, 0 1 2 #0a211a2e | not an effect style (raise with the page 02 owner) |
| Button hover reactions (page 02) | SMART_ANIMATE | **160 ms**, cubic(0.2,0,0,1) | 160 is not a token: use duration/fast 140 or base 220 |

Also: the `Grove/Surface/Glass` style colours are hard-coded, and no dark variants exist for any surface or elevation style.

---

## 8. Icons

All icons are local and non-remote, and they are standalone COMPONENTs (not sets):
- `Icon/arrow-right` 738:73
- `Icon/arrow-up-right` 738:83
- `Icon/circle-check` 738:131
- `Icon/x` 738:423
- `Icon/trending-up` 738:386

The names are Lucide's, and the icons are stroke-based with round caps. Stroke weight scales with size: 1.28 at 16, 1.44 at 18 and 1.6 at 20, which is about **1.92 at a 24 grid**. Lucide uses 2, so these were probably re-imported or scaled.

**Code options:** use `lucide-react` with `strokeWidth={1.92}` (or `absoluteStrokeWidth`), or generate an `@nizivo/icons` package from these components. The Toast icon size is 18, which is off the size/icon-* scale (16/20/24).

---

## 9. Architecture: making effects pluggable

### 9.1 Layering (dependencies only point downward)

```
@nizivo/tokens   ← generated from Figma variables (Color, Space, Motion Default/Reduced, Responsive)
   │               emits: CSS vars (prefix configurable, default --nz-), JS consts, linear() springs, units
   ▼
@nizivo/ui       ← core. Micro-interactions are plain CSS in each component and consume motion tokens directly
   │               (press, hover-lift, overlay enter/exit, skeleton pulse, focus). NO dependency on motion/lab.
   │               Surface material="glass" lives here (CSS only).
   ▼ (optional, app-level)
@nizivo/motion   ← opt-in, small (<5 KB total). Provider + reduced-mode, shared frame loop, token-backed
   │               JS effects: Reveal, Stagger, CountUp, Float, Tilt, Magnetic, InView, spring utils,
   │               adapters (css | waapi | motion-lib). Each export is its own subpath; sideEffects:false.
   ▼
@nizivo/lab      ← opt-in, 0.x, experimental. GPU/unspecified effects: ShaderCanvas, RaysBackdrop,
                   MeshGradientBackdrop, unstable_LiquidGlass, Parallax, Spotlight, Grain, Model3D (/three).
                   Never imported by ui/charts/commerce. Graduates effects to motion/ui via an RFC.
```

Rules:
- Core components accept **slots** such as `backdrop`, `media` and `decoration` as `ReactNode`. They never import an effect. Plugging an effect in or out means passing or omitting a child, which is a zero-cost swap.
- **The placement rule:** if Grove Motion has a token for it and it is CSS or < 1 KB JS, it goes in `@nizivo/motion`. If it is GPU, untokenized or undesigned, it goes in `@nizivo/lab`.

### 9.2 Motion mode (one switch for the whole system)

```ts
type MotionMode = 'system' | 'full' | 'reduced' | 'off';
<NizivoMotionProvider mode="system" quality="auto" />   // client, ~0.4 KB
// writes <html data-nz-motion="full|reduced|off" data-nz-quality="high|low|poster">
```

- The CSS tokens resolve from a **single source**:
  - `:root` holds the Default values.
  - `@media (prefers-reduced-motion: reduce) { :root:not([data-nz-motion=full]) { …Reduced } }`
  - `[data-nz-motion=reduced] { …Reduced }`
  - `[data-nz-motion=off] { --nz-duration-*: 0ms; …; animation-play-state: paused }`
- `off` is used for deterministic screenshot and visual-regression tests.
- The `useMotionMode()` hook is for JS effects. Loops (float, pulse, shaders) check `mode !== 'full'` and **stop** rather than shorten.
- The server can render it without the provider, and CSS media queries still apply. The provider is only an override.

### 9.3 The effect contract (how anything gets plugged in)

```ts
// @nizivo/motion/core: shared by motion and lab
export interface EffectDefinition<P> {
  id: string;                                   // 'lab.rays', 'motion.tilt'
  requires?: Array<'webgl2' | 'backdrop-filter' | 'scroll-timeline' | 'fine-pointer'>;
  reduced: 'static' | 'off' | 'instant';        // behaviour under reduced motion
  poster?: (props: P) => React.ReactNode;       // server-safe fallback (RSC)
  mount(el: HTMLElement, props: P, ctx: EffectContext): EffectInstance<P>;
}
export interface EffectInstance<P> { update(p: Partial<P>): void; pause(): void; resume(): void; destroy(): void; }
export interface EffectContext {
  frame: FrameLoop;           // ONE shared rAF for the page (tilt, magnetic, count-up, shaders)
  mode: MotionMode; quality: 'high' | 'low' | 'poster';
  tokens: TokenReader;        // reads computed --nz-* vars and re-emits on theme change
  visibility: VisibilitySignal; // IntersectionObserver + document.hidden
}
export function useEffectDefinition<P>(def: EffectDefinition<P>, props: P): React.RefCallback<HTMLElement>;
export function registerEffect(def: EffectDefinition<any>): void; // optional global registry for CMS-driven pages
```

- Renderer adapters hide the engine behind `ShaderCanvas`: `webgl2` is the default, `webgpu` is a future option, and `css` is the fallback poster. Swapping engines doesn't change the component API.
- Animation drivers: `css` is the default. `waapi` covers imperative enter and exit. `motion` is an optional adapter that maps tokens to Motion library transitions, so apps already using Motion get the Nizivo presets (`import { transitions } from '@nizivo/motion/adapters/motion'`).

### 9.4 Shader definitions: uniforms bound to tokens

```ts
export const rays = defineShader({
  id: 'lab.rays',
  fragment: raysGLSL,                       // re-authored; Figma source not accessible
  uniforms: {
    ground:    { type: 'color', token: 'bg/paper',      fallback: '#f6f5ef' },
    ray1:      { type: 'color', token: 'chart/primary', fallback: '#216b48' }, // ≈ green/600
    ray2:      { type: 'color', token: 'bg/accent',     fallback: '#c5e162' }, // ≈ lime/300
    ray3:      { type: 'color', token: 'illus/warm',    fallback: '#f5a63f' }, // NEW token needed (off-palette)
    speed:     { type: 'float', default: 0.5, reduced: 0 },
    angle:     { type: 'float', default: 18, unit: 'deg' },
    intensity: { type: 'float', default: 1.2 },
    width:     { type: 'float', default: 1 },
    grain:     { type: 'float', default: 0.025 },
  },
  poster: { css: 'radial/linear gradient approximation', image: '/posters/rays-t0.avif' },
});
```

- Colour uniforms read CSS variables at mount, and re-read them when `data-theme` or `prefers-color-scheme` changes, so **dark mode works automatically** once dark token values exist.
- Props override the token defaults per instance: `<RaysBackdrop ray3="var(--nz-chart-cat-3)" speed={0.3} />`.

### 9.5 Component APIs (sketches)

```tsx
// @nizivo/lab: split (server poster + client island)
<RaysBackdrop speed angle intensity width grain colors={{ground, ray1, ray2, ray3}}
  quality="auto" fps={30} dpr={1.5} paused? className />          // aria-hidden canvas
<MeshGradientBackdrop colors={[c1,c2,c3,c4]} softness={1.4} speed={0.3} grain={0.03} />
<unstable_LiquidGlass refraction={0.25} depth={14} lightAngle={135} lightIntensity={0.55}
  dispersion={0.12} frost={12} as="div">…</unstable_LiquidGlass>  // falls back to Surface glass

// @nizivo/ui: server
<Surface material="solid|glass" elevation={0|1|2|3|4} radius="2xl" padding="4" asChild?>
<FeatureTile tone="brand|accent|inverse" media={<img…/>} title="Shipping" href="/shipping" />
   // whole tile is the link (stretched-link); arrow pill is aria-hidden decoration
<HeroSection backdrop={<RaysBackdrop/>} scrim="paper" media={<FloatingRenders/>}>
  <HeroSection.Title/> <HeroSection.Description/> <HeroSection.Actions/>
</HeroSection>   // pattern; shell is RSC, the backdrop island is client

// @nizivo/motion
<Float distance="float" period="ambient" phase={0..1} sway?>{img}</Float>     // server + CSS
<Reveal as="section" distance="reveal" once>…</Reveal>                       // CSS + optional IO island
<Stagger step="item" max={8}>{items}</Stagger>                               // server, writes --i
<CountUp value={48290} format={{style:'currency',currency:'USD'}} from={0} /> // split
<Tilt max="tilt/max-deg" glare?>{card}</Tilt>                                 // client
<Magnetic pull="magnetic/pull">{button}</Magnetic>                            // client, moves inner only
```

### 9.6 File layout (per package)

```
packages/lab/src/
  runtime/        shader-canvas.ts (WebGL2 ctx pool, resize, DPR, fps cap), renderer-webgl2.ts, renderer-css.ts
  shaders/        rays/{rays.frag.glsl, rays.def.ts, RaysBackdrop.tsx, RaysPoster.tsx}
                  mesh/{mesh.frag.glsl, mesh.def.ts, MeshGradientBackdrop.tsx, MeshPoster.tsx}
  glass/          liquid-glass.ts (SVG displacement generator), LiquidGlass.tsx
  scroll/         Parallax.tsx (CSS scroll-timeline)
  pointer/        Spotlight.tsx
  three/          Model3D.tsx  (subpath export, peerDep three, never in index)
  index.ts        re-exports only stable-ish experiments; each also has its own subpath
packages/motion/src/
  core/           provider.tsx, mode.ts, frame-loop.ts, effect.ts (contract), token-reader.ts, spring.ts
  css/            motion.css (recipes: reveal, float, pulse, draw, lift, press)
  effects/        Float, Reveal, Stagger, CountUp, Tilt, Magnetic, InView
  adapters/       motion.ts (Motion library presets), waapi.ts
```

`package.json`: `"sideEffects": ["*.css"]` and `exports` per subpath. Put `"use client"` only on island files. Size budgets are enforced in CI with size-limit: motion core ≤ 2 KB, each effect ≤ 1 KB, lab runtime ≤ 4 KB, each shader ≤ 2 KB.

### 9.7 Testing

- **Visual regression:** run with `data-nz-motion="off"` and `?nz-shader=poster`. The result is deterministic.
- **Unit:** spring solver against the `linear()` snapshots, and token unit mapping.
- **Playwright:**
  - `prefers-reduced-motion` emulation asserts that no running animations exist (`document.getAnimations().length === 0`) and that no WebGL context is created.
  - A WebGL-unavailable run asserts the poster renders.
- **Performance:** a Lighthouse trace on the hero page asserts the LCP element is the poster or heading, CLS is 0, and the long-task budget holds.

---

## 10. Issues, consolidated

1. Toast enter distance is 16 px against `distance/reveal` 12. The exit distance of 8 px borrows `distance/float`, and the visible time of 2.68 s has no token and is too short for an actionable toast (WCAG 2.2.1).
2. Skeleton pulse runs a 1000 ms half-cycle while its label says `duration/slower` (480). Its easing is not a token, and Reduced mode would make it faster unless loops are stopped.
3. Hero floats use −10 px and 14 px ranges against `distance/float` 8. Their easings and the 4 s period are not tokens.
4. The Button hover prototype uses 160 ms, which is not a token (page 02).
5. `easing/spring*` is invalid CSS and has no duration token (§6.1).
6. Motion variables have empty scopes and no descriptions, so designers can't discover or bind them.
7. `Grove/Surface/Liquid Glass` and `Surface/Inner Highlight` have 0 consumers.
8. Glass fill, stroke and chip alphas are hard-coded, with no dark-mode glass values.
9. Shaders are unnamed, use raw colours, and include an off-palette orange (`ray3` #f5a63f).
10. Contrast:
    - `text/secondary` over hero rays falls as low as 1.78:1.
    - Glass card `text/secondary` over the deep-green mesh is 2.47:1.
    - `text/tertiary` on `bg/subtle` is **4.16:1** (Mono/M 14 px captions fail AA 4.5).
    - The Toast "View" action is **1.75:1 in Dark**.
11. The 3D tile arrow pill is 40×40, under touch-min 44. Its white-on-tint boundary is 1.06–1.14:1. Make the whole tile the hit target and the pill decorative.
12. Tiles have no hover, focus or pressed states.
13. Card-lift is demonstrated on a non-interactive KPI Tile, with no elevation change and no press state.
14. Off-scale radii (32, 18, 14) and unbound spacing appear across the showcase frames (§7).
15. 7279:81 is a childless duplicate frame. The section name ("11") and page name ("09") disagree.
16. There are no specimens for tilt, magnetic, stagger, count-up, spring, press, reveal, parallax or cursor, even though their tokens exist.
17. There is no `bg/paper` token, even though the paper colour is used in the hero, the paper fade and both shaders.
18. There are no breakpoint, `duration/ambient`, `easing/ambient`, `duration/pulse`, `duration/toast`, `rotate/sway`, `parallax/*` or `surface/glass-*` tokens.

## 11. Extraction gaps

- **Shader source was not accessible.** `get_shader` failed for both ids ("Cannot access this custom tool source. Verify the ID and that you own the tool"), and the full fill id returned "invalid id". The web shaders are therefore re-authored approximations from screenshots and uniforms. Getting the GLSL from the designer, or a `export_video` MP4 reference, would allow a closer match.
- `list_file_shaders` returned `{"shaders":[]}` even though two nodes reference shader fills.
- The motion was not rendered with `export_video`, so no video was checked. The motion data comes from manual keyframe data, which is complete.
- Image bytes were not exported. Only the hash prefixes are recorded: 8f64353790 (store), 9be01264be (orb), 7d2b02796f (tag), 0441fd0fec (shipping), d74001dd2d (checkout), f284864a03 (payments) and b7900b915e (portrait). Formats, dimensions and transparency are unknown, and `download_assets` would be needed.
- No `animationStyles` exist on any node; all motion is manual keyframes. No Dev Mode annotations or descriptions exist on the page.
- Dark-mode rendering of the Lab was not inspected: the frames have no explicit variable mode, so they show Light.
