# Verdict: technical correctness and performance

Date: 2026-10-14. Panel role: judge, **technical correctness and performance** lens.

Inputs:
- The three proposals: `proposal-lean.md`, `proposal-seams.md` and `proposal-velocity.md`.
- The critique `docs/research/00-critique.md`.
- Raw spike artefacts S1–S4 under `scratchpad/spikes/`.
- Gap reports A, B and C, research reports r1–r8, and the Figma token snapshot `00`.

**`scratchpad/spikes/REPORT.md` does not exist.** All three proposals say so too. Every spike verdict below comes from the raw artefacts, and most were re-run for this verdict.

---

## 0. Bottom line

| Proposal | Overall | Verdict under this lens |
|---|---|---|
| **velocity** | **8.3** | The most API-accurate proposal. Its RAC 1.22.1 prop names were checked against installed types, and I confirmed them. It is the only one with a correct Firefox floor (129, which `@starting-style` needs), and its barrels match the S2-verified shape exactly. It has three sketch bugs, one verified in a browser (Accent hover goes transparent). |
| **seams** | **8.1** | The strongest set of guard rails: lints and CI checks that make the spike results permanent. Its budgets are r3 + 10%, correctly based. It makes one false browser-support claim (Firefox 128 "covers `@starting-style`"). Its RAC adapter sketch uses render-prop fields that do not exist (flagged by Seams as illustrative). |
| **lean** | **7.3** | The best performance evidence: its new measurements reproduce exactly, and its D-spike reproduces. It also has the most correctness defects in its sketches: a stroke formula that collapses to 1 user unit, tokens CSS never delivered by `@nizivo/react` or its Tailwind recipe, lazy-chunk budgets copied from a different engine base (off by up to 2.6×), a Card that assigns its own public hook, and an omitted RAC dependency. Its top-layer overlay model is coherent but carries the largest untested risk (the toast outlet). |

**No proposal has a fatal flaw under the lens's fail criteria.** All three:
- keep S1–S10 fixed: 1.92 stroke (or 1.6 absolute), the two-axis hit area with the correct sign, a 2 px outline with the halo as decoration, gzip budgets, a 14 px floor, `useId` allowed in sync server parts, the Figma variant names, one spring generator, and a popover fallback for iOS < 18.3;
- use the S2-passing export shape;
- never lower `light-dark()` and never `@property`-register colour tokens (S1);
- use S3's `only.modifiers` + exclude and the custom Tailwind plugin;
- produce S4's 493/702 ms;
- use no S8 token names.

The serious items are listed per proposal in §4 with evidence. Each can be fixed at sketch level, but each must not be copied into the plan as written.

**Package naming.** All three proposals rename the core package to **`@nizivo/react`** and say explicitly that this changes the earlier `@nizivo/ui` message. Under this lens that is correct: it keeps `@nizivo/tokens` and a future `@nizivo/css` framework-neutral, and nothing is published yet.

---

## 1. What I verified myself (reproducible; scripts in `scratchpad/verdict-correctness/`)

| # | Check | Result | Affects |
|---|---|---|---|
| V1 | **S1** matrix re-read: `matrix-results.json` and `matrix-varinside-results.json` (Chromium 156.0.8078.4, WebKit 27.2) | Confirmed:<br>• Native `light-dark()` nests D → L → D.<br>• With `:root` unset or `normal`, it resolves to **light** under OS dark.<br>• Lowered-for-16.4 output breaks nesting and renders **transparent** with no root scheme.<br>• `@property` registration breaks nesting (`d1-l2` = D). | D6, D7 for all |
| V2 | **S2** artefacts: build logs, `lib/dist`, pages | Confirmed. rolldown puts `__exportAll` **inside** the module that `export * as` targets. A `'use client'` target fails the prerender with "Element type is invalid … got: undefined" under both Turbopack and webpack. A directive-free `*.parts.ts` passes. | D3/settled 2 |
| V3 | **S2 extended** (new): a clone of the fixture, built with tsdown 0.23.1 and Next 16.4.0 | 1. **Lean's `engine.ts` hop** (`export * from './x.client'`) and **Seams' `export *` barrel** are both **elided by rolldown** into explicit named imports from the client modules. Dist therefore equals the S2-verified shape.<br>2. Namespace and flat imports for both shapes **build under Turbopack and webpack**, **hydrate with 0 console errors**, and **toggle on click**.<br>3. A Server Component passing a **server** `<Button>` into a **client** part's `render` prop arrives as a host `<button>` element (`isValidElement` true), and `cloneElement` + `onClick` work after hydration. This is Velocity's §6.9 pattern, and all three rely on it.<br>4. `/button-only` ships **no** Nizivo marker in any client chunk (the 0 KB claim).<br>5. Side effect: Seams' `export *` also **publishes internal contexts** (`SelContext` appears in `d.js`). | D1, D3, settled 2 |
| V4 | **S3** outputs: `out/*.css` and configs | Confirmed:<br>• Partial inputs without `only` re-emit every token.<br>• `only.modifiers` + exclude is clean.<br>• stock `plugin-tailwind` emits primitive refs plus an empty `@variant dark`; the custom plugin emits `var(--nz-bg-surface)`. | D4, D5 |
| V5 | **S4** `spring-results.json` | 492.3 → **493 ms**, 3.02% overshoot, 19 points, 224 B; **702 ms**, 18 points. Motion's `toString` gives 600/750 ms; its done-scan gives 554/718 ms. | D12 |
| V6 | **Lean's D-spike re-run** (`design/dialog-spike/run.mjs`) | Reproduced in Chromium 156 and WebKit 27.2:<br>• `cancel` is cancelable;<br>• the exit transition finishes before `close()`;<br>• an in-dialog manual popover is hittable and focusable, while a body-level one is **blocked** (whatwg #9936);<br>• `:root:has(dialog:modal)` applies `overflow: hidden`;<br>• **WebKit returns focus to nothing** (`""`), so focus return must be explicit.<br>Firefox does not launch in the sandbox. | D8 |
| V7 | **Velocity's probe re-run** (`design/probe/probe.mjs`) | Confirmed:<br>• `color-mix(in oklab, var(--nz-border-focus) 28%, transparent)` declared once at `:root` resolves **per scope** (light L 0.547, dark L 0.732);<br>• `color-scheme: var(--nz-scheme-inverse)` flips the subtree;<br>• with no attribute the page stays white under OS dark.<br>Tested on current engines only, not on the Safari 17.5 floor. | D6 for all; closes Seams' verify-next #1 |
| V8 | **Lean's M-lean sizes re-run** (`design/measure/*.mjs`, r3 method) | Exact: RAC dashboard **69.0**; Menu+Popover **51.3**; +Select **63.1**; +Tabs **65.5**; Modal+Dialog+Tooltip **33.4**; floating-ui **6.3**; hooks H1 **39.6**, H2 **44.2**, H3 **45.3** KB gz. | D1 |
| V9 | **Increments over Lean's real base** (new, `incr.mjs`) | Over hooks H1 (39.6):<br>• RAC `RangeCalendar` → **64.7 (+25.1)**; Lean budgets ≤ 24.<br>• RAC `Autocomplete`+`Menu`+`SearchField` → **59.5 (+19.9)**; Lean budgets ≤ 7.5.<br>Over the RAC dashboard set the same additions are +22.4 and +4.6, matching gap-a's +21.4 / +4.7. **Lean copied increments measured on a base it does not use.**<br>Also: `react-aria` tooltip hooks + stately = **7.2 KB** (Velocity's own-button tooltip path), vs 14.3 KB for RAC `Tooltip`. | D1, G13, G18 |
| V10 | RAC 1.22.1 and react-aria 3.53.1 types | Confirmed:<br>• `render?: (props, renderProps) => ReactElement`, with a rule to render the same element type;<br>• `SelectProps.selectedKey`, `defaultSelectedKey` and `onSelectionChange` are **`@deprecated`** in favour of `value`/`defaultValue`/`onChange`;<br>• `ButtonRenderProps` has **no `isOpen`/`isInvalid`**;<br>• `Popover.UNSTABLE_portalContainer`, `useToastRegion`, `useToast`, `useTooltipTrigger`, `UNSAFE_PortalProvider` and `I18nProvider` are exported. | D1 sketches |
| V11 | `stroke-width: calc(1.6 * 24 / var(--s))` (new, `calc.mjs`) | With `--s: 20` it gives **1.92px**, correct. With `--s: 20px` it gives **1px**: invalid at computed-value time, so it falls to the initial value. Because CSS beats SVG presentation attributes, the `stroke-width="1.92"` attribute **does not act as a fallback**. The same happens when the variable is unset and has no fallback. | Lean D13 |
| V12 | Velocity's Accent hover (new, `accent.mjs`) | `--_nz-button-bg-hover: var(--nz-button-bg-hover, var(--nz-bg-accent-hover))`. `--nz-bg-accent-hover` is in neither Figma nor Velocity's override list, so the hover background is **`rgba(0,0,0,0)`** in Chromium and WebKit. | Velocity D4/D15 |
| V13 | web-features 3.42.0 floors | `starting-style` and `transition-behavior` need **Firefox 129** and Safari 17.5/17.4. `light-dark` needs Firefox 120 and Safari 17.5. `popover` is macOS Safari 17 but **iOS 18.3** (light-dismiss bug only; gap-c §1.1). Anchor positioning is not Baseline (Safari 27 for the umbrella). `linear()` needs Safari 17.2; nesting 17.2; `:has` Firefox 121. | D7 for all |

---

## 2. Scores per decision (0–10, this lens only)

| ID | lean | seams | velocity | Recommended | Why (evidence) |
|---|---|---|---|---|---|
| **D1** Engine + seam | 7 | 7 | **8** | **Velocity**, plus Lean's hooks altitude as a measured opt-in | All pick React Aria behind a one-line seam, which is correct (C4).<br>**Lean**'s hooks altitude saves a real 20.2 KB (V8). But its sketch uses deprecated stately props (V10), the package map omits `react-aria-components` although four adapters import it, and its lazy budgets are misderived (V9).<br>**Seams**' adapter reads `rp.isOpen`/`rp.isInvalid`, which do not exist (V10; Seams marks it illustrative and lists it as verify-next #4), and uses deprecated props.<br>**Velocity** uses `value`/`onChange`, `UNSTABLE_portalContainer` and the `render` signature exactly as 1.22.1 types them (V10). Its budgets are r3 + 10% with locales included. |
| **D3** Packages / naming / distribution | 6 | 7 | **8** | **Velocity** | All three rename to `@nizivo/react`, correctly, and say so.<br>**Lean**: `@nizivo/react` has no dependency on `@nizivo/tokens`, and `styles.css` is component-layer only. Under pnpm strict installs a consumer gets no `--nz-*` unless they find and install tokens separately (see D4).<br>**Seams**: `core.css` re-ships tokens (the duplication is acknowledged, R14), and the `export *` barrels leak internals (V3.5).<br>**Velocity**: `@nizivo/tokens` is an exact dependency; `styles.css` holds tokens + base + components; `_engines/**` is excluded from `exports`; the explicit map matches C2. |
| **D4** Styling contract | 6 | **9** | 7 | **Seams**, plus Velocity's vocabulary checker | **Lean**:<br>• the Card sketch **assigns** `--nz-card-bg` per tone, which breaks ancestor hook overrides (r8's HeroUI finding) and contradicts Lean's own "never assigned" rule;<br>• the Tailwind recipe never imports `tokens.css`.<br>**Seams**: stylelint bans declaring `--nz-<c>-*`, bans theme logic outside tokens, requires the layer line, and a Lightning CSS guard fails on `--lightningcss-*` (it encodes S1).<br>**Velocity** has the right rules, but its Accent hover reads an undefined token and renders transparent (V12). |
| **D5** Token pipeline | **9** | 8 | **9** | **Velocity / Lean** (+ Seams' golden files and `contract.json`) | All use Terrazzo 2.8 with the S3-verified shapes (V4).<br>**Seams** schedules a **nightly** `/meta` REST check while the file's team is unknown, and a Starter file allows 6 REST requests a month (r7, S-d). Its v0.1 exit does require moving the file first.<br>Lean runs weekly until then; Velocity runs no poll at all until then. Both are correct. |
| **D6** Theme mechanism | 9 | 9 | 9 | **Seams** (`nz.themes` layer) with Velocity's probe-verified halo and inverse | All follow S1: `light-dark()` at `:root`, an opt-in default, no `@property`, `data-nz-theme`, and `reduce` only.<br>**Seams**' `nz.themes` layer is reasoned correctly: `:root` and `[data-nz-brand]` tie on specificity.<br>**Lean** correctly re-declares aliases on `[data-nz-brand]`.<br>Open for all: `light-dark()` inside `box-shadow`/`color-mix` is verified only on current engines, not Safari 17.5 (V7). |
| **D7** Support floors | 7 | 6 | **9** | **Velocity**: Chrome/Edge ≥ 123, **Firefox ≥ 129**, Safari/iOS ≥ 17.5 | **Seams** claims Firefox 128 "also covers `@starting-style`". **False**: it needs 129 (V13).<br>**Lean** also sets Firefox 128 and relies on `@starting-style` + `allow-discrete` for its native overlay entries. It does not claim coverage, but enter animations silently disappear on Firefox 128. Lean cites partial anchor-positioning support in Safari 26 (as gap-c §1.1 does), and the umbrella feature is not Baseline. `CSS.supports` on one property can be true where the full set is not, so feature detection must test the exact properties used. That is an implementation note, not an error by Lean.<br>**Velocity** sets 129 for exactly this reason. All three handle iOS < 18.3 `popover` correctly (fixes S10). |
| **D8** Overlays + layering | 6 | **8** | **8** | **Seams / Velocity** (gap-c model; O-06 gates Toast). Keep Lean's native Dialog as a gated swap | **Lean**'s top-layer-first model is coherent and backed by its own D-spike (V6). It answers all four gap-c §1.4 blockers with JS fallbacks: sequenced exit, a backdrop `pointerdown` handler, React re-portal, and explicit focus return. But the **toast-outlet-follows-modal** rule (N-02/O-08) is unproven. Re-portalling a `popover="manual"` region through React is an unmount/remount: popover state is lost, exits are cut and announcements may duplicate. Every Lean overlay depends on that untested rule, and two scroll-lock writers coexist (Lean's risk 5).<br>**Seams/Velocity** use RAC portals in one z band, with Toast as the only top-layer element. The RAC exemption is verified (gap-c §1.3), with O-06 as the gate. |
| **D9** Residual config | 9 | 9 | 9 | Any (identical) | All have no required provider, an optional client `NizivoConfig`, `I18nProvider` on every engine root (gap-b §A3), and an explicit `timeZone`.<br>V3.3 confirms element-form `render` across the RSC boundary in both directions. |
| **D10** Responsive / layout | 8 | 8 | **9** | **Velocity** (only `sm` emitted; `lg` after design) | Settled 11. Lean and Seams emit a provisional 1280 (Seams adds 1024) and label it provisional. Velocity emits nothing it cannot cite, and states that this blocks AppShell. |
| **D11** Charts | 8 | **9** | 7 | **Seams** | **Velocity**'s sketch builds the domain from `ticks(min, hi, 5)` **without `nice`**. `ticks(0, 123, 5)` gives `[0…120]`, so the data exceeds the top tick: the 03 defect it claims to fix.<br>**Lean** uses `niceDomain`. **Seams** uses `d3-array` `nice`, a structural `ScaleLike`, and an opt-in d3 time adapter, which closes C14's time-axis hole cleanly.<br>All use SVG `<rect>` bars, HTML labels and `clip-path` draw (CSP Profile B safe). |
| **D12** Motion | **9** | 8 | 8 | **Lean** | All use one generator: 493/702 ms at 0.1% (V5).<br>**Seams** says reduced fades "stay ≤ 160 ms", but its Dialog fades on `--nz-duration-fast`, which is 0 ms under Reduced.<br>**Velocity** puts a 3%-overshoot spring on `opacity` (it clamps; harmless but sloppy).<br>**Lean** keeps springs on transform and opacity with paired durations, and a 120 ms reduced spring. |
| **D13** Icons | 5 | **9** | **9** | **Seams / Velocity**: `strokeWidth=1.92` on a 24 viewBox, `absoluteStrokeWidth` opt-in | **Lean**'s `calc(1.6 * 24 / var(--_nz-icon-size))` gives **1 user unit (0.83 px at 20 px)** whenever the variable is a length or unset, and the 1.92 attribute cannot rescue it (V11). As written, that is a conditional S1 regression. It works only with a **unitless** variable and a fallback: `calc(1.6 * 24 / var(--_nz-icon-size, 20))`. |
| **D14** Toolchain / release | 8 | **9** | 8 | **Seams** | All use tsdown 0.23.1 unbundle, split-job OIDC, a fixed group with lab independent, and Apache-2.0 recommended.<br>**Seams** keeps the `typescript6` alias plus a narrow ESLint `react-hooks` job, which settles C20 as the critique asked.<br>**Lean** drops compiler-rule enforcement (a decision, justified).<br>**Velocity** sets CSS budgets from r4's **brotli** ceilings, while everything else is gzip (C23 discredited r4's numbers). |
| **D15** A11y remediation | **9** | 8 | **9** | **Lean / Velocity** | All use the gap-c values: Option A, `border/control`, red/400 and blue/400, `bg/critical` red/600, a 2 px outline plus halo, and the two-axis `::after` (S2/S3/S5 fixed).<br>**Lean**'s `.nz-hit-target { position: relative }` lives in `nz.base`, so the hit area survives a re-skin.<br>**Seams** says its a11y floor survives an E3 re-skin, but the `::after` relies on `position: relative` set in **component** CSS. |
| **Gaps** G11–G20 | 7 | **9** | 8 | **Seams** | All adopt gap-a/b/c.<br>**Lean**'s G13 (≤ 24 KB) and G18 (≤ 7.5 KB) budgets are off on its own base (V9). Its CSP Profile B coverage for own overlays is a real plus.<br>**Seams**' increments are correctly based on the RAC dashboard set.<br>**Velocity** pushes CSP fixtures to v0.3 and SBOM to v1.0; that is correct, just later. |
| **Average** | **7.5** | **8.2** | **8.3** | | |

The overall scores (Lean 7.3, Seams 8.1, Velocity 8.3) weight the serious flaws in §4 slightly above the plain averages.

---

## 3. Best idea to graft from each proposal

- **Lean: react-aria at the hooks altitude for engine widgets that dominate page weight.**
  - Measured and reproduced: Menu + Select + Tabs costs **45.3 vs 65.5 KB gz (−31%)**, and Menu alone **39.6 vs 51.3** (V8).
  - Graft it **per component, behind the same `engine.ts` seam**, for Menu and Select when size-limit fails, not as the default.
  - Re-measure every lazy chunk on the hooks base (V9).
  - Also worth keeping: Lean's native-overlay test set **N-01…N-04**, as the gate for any future native Dialog swap.
- **Seams: CI guards that make each spike verdict permanent.** The rule and the lint ship together:
  - a Lightning CSS output guard that fails on `--lightningcss-*` (S1);
  - a lint that fails any `export * as` whose target carries a directive (S2);
  - stylelint bans on theme logic outside `packages/tokens` and on declaring public `--nz-<c>-*` hooks;
  - `contract.json` plus `nz-check-theme`.

  Without these, a refactor silently reintroduces S1 or S2.
- **Velocity: a `component.json` → `nz gen` generator** that emits:
  - the directive-free `*.parts.ts` and `index.ts` in **exactly** the S2-verified shape (named re-exports straight from the client module);
  - the `exports` entries;
  - `size-limit` entries from measured values plus 10%;
  - the dual-ID Figma map.

  Its sketches check API facts against installed types (V10), and it is the only proposal with the correct **Firefox 129** floor.

---

## 4. Serious flaws, with evidence (none fatal)

### lean
1. **Tokens CSS is never delivered by `@nizivo/react`.**
   - Evidence: the §4 dependencies list no `@nizivo/tokens`; `styles.css` is the `nz.components` layer; the §6.1 Tailwind recipe imports `react/styles.css` and `tokens/tailwind.css` but not `tokens.css`.
   - Effect: as written, every `--nz-*` is undefined in that recipe, and pnpm strict installs will not provide tokens implicitly.
   - Fix: make `@nizivo/tokens` a fixed-group dependency, and either include tokens in the all-in-one sheet or put `tokens.css` in every recipe.
2. **Lazy-chunk budgets are taken from the wrong base.** CommandMenu is budgeted at ≤ 7.5 KB and RangeCalendar at ≤ 24 KB, copying gap-a's increments over the **RAC-components** dashboard set.
   - On Lean's hooks base, RangeCalendar measures **+25.1 KB** (V9).
   - CommandMenu, as Lean describes it ("RAC Autocomplete + SearchField + Menu"), measures **+19.9 KB** over the hooks Menu base (V9). If Lean meant its own hooks Menu inside Autocomplete, the proposal does not say so, and RAC `Autocomplete` is built to wrap RAC collection components, so the composition would need its own measurement.
   - Either way the budgets are not derived from a measurement of Lean's architecture, which conflicts with settled 13.
3. **D13 stroke formula.** It collapses to 1 user unit (0.83 px at 20 px) when `--_nz-icon-size` is a length or unset, and the attribute fallback is overridden by CSS (V11). That is a conditional regression of critique S1.
4. **Card assigns its own public hook.** `&[data-tone="subtle"] { --nz-card-bg: … }` defeats consumer ancestor overrides for those tones (r8's HeroUI finding) and contradicts Lean's stated rule.
5. **Missing dependency.** `react-aria-components` is absent from the dependency list, although the break-glass Dialog/Tooltip, RangeCalendar and Autocomplete adapters import it.
6. **D8 depends on an unproven toast outlet** (N-02/O-08): a React re-portal of a manual popover. It is coherent and spike-backed for dialog mechanics (V6), but the riskiest overlay plan for a v0.1 exit.
7. **Firefox floor of 128.** Native overlay enter animations use `@starting-style`/`allow-discrete`, which need Firefox 129. They degrade to instant (V13).
8. **Deprecated APIs.** The Select sketch uses `selectedKey`, `defaultSelectedKey` and `onSelectionChange` (V10).

### seams
1. **False browser-support claim.** D7 says Firefox ≥ 128 "also covers `@starting-style`". It needs **129** (V13).
2. **The RAC adapter sketch reads non-existent fields** `rp.isOpen` and `rp.isInvalid` from `ButtonRenderProps`, and uses deprecated Select props (V10). Seams labels it illustrative and lists it as verify-next #4.
3. **`export *` barrels publish internal contexts.** `SelContext` appears in the built `d.js` (V3.5). Use named re-exports, as Velocity's generator does.
4. **Nightly Figma REST `/meta` poll** while the file may be on a Starter team (6 requests a month, r7/S-d). It is mitigated only by the v0.1 exit criterion that moves the file.
5. **`tokens.blocks.css` "reaches Safari 16.4"** for tokens only. The component CSS is compiled at 17.5 targets (unlowered nesting, `linear()`), so the compat file does not make components work on 16.4.
6. **Minor:**
   - the reduced-motion fade claim (≤ 160 ms) contradicts its 0 ms `duration-fast`;
   - the a11y-floor `::after` depends on component-level `position: relative`.

### velocity
1. **Accent hover reads `--nz-bg-accent-hover` with no fallback**, and the token is in neither Figma nor the override list. The hover background is transparent in Chromium and WebKit (V12). Add it to the override file or give it a fallback.
2. **The AreaChart domain is not niced.** `ticks(min, hi, 5)` ends below `hi`, so the data exceeds the top tick: the 03 defect the sketch says it fixes. Use `nice()` first.
3. **The Button passes `disabled` and `type` through `render`** (invalid on `<a>`/`Link`) and omits `aria-disabled` for the non-native case. Lean and Seams branch on `nativeButton`.
4. **Minor:**
   - CSS budgets start from r4's brotli ceilings (a unit mix);
   - the spring easing is on `opacity`;
   - IconButton's default tooltip makes IconButton a client leaf, an honest trade-off that the sketch states.

---

## 5. Shared items the plan must carry (all three)

- **`mergeProps` must not create functions when it runs in a Server Component.** Merge refs and handlers only when both sides have them. Otherwise `render={<Link/>}` from a server `Button` sends a function to a client component and fails.
  - V3.3 verified only server → client element passing.
  - Add a server → client-`render` case with a ref to the RSC fixture.
- **The rolldown elision in V3.1 is load-bearing.** The `engine.ts` swap point and any `export *` exist only in source. The src-vs-dist directive guard (r4) must tolerate source modules that have no dist counterpart. Pin tsdown exactly, and keep the Next fixture (both bundlers, namespace + flat) on every PR.
- **Firefox is unverified** for S1, the D-spike and the probe. **Safari 17.5 itself is unverified** for:
  - `light-dark()` inside `color-mix()`/`box-shadow`;
  - `@starting-style` on `<dialog>`/`[popover]`.

  Only WebKit 27.2 was run. Add a floor-version lane before v0.1 exit.
- **RAC `render` must render the same element type** (V10). A Nizivo `render` that swaps `<button>` for `<a>` cannot pass through a RAC part. That constrains the public `render` contract on engine-backed parts, and the conformance suite must cover it.

---

## 6. Recommended choice per decision (mixed)

| ID | Choice |
|---|---|
| D1 | Velocity: RAC components as the default family; adapters use the non-deprecated 1.22.1 API; budgets are r3 + 10%. Graft Lean's hooks-altitude adapters for Menu/Select behind `engine.ts` when size-limit fails, re-measuring lazy chunks on the real base. |
| D3 | Velocity: v0.1 ships `@nizivo/tokens`, `@nizivo/react` (depends on tokens exactly) and `@nizivo/icons`; `@nizivo/charts` in v0.2. Import becomes `@nizivo/react`. Named re-exports only. |
| D4 | Seams' stylelint contract and Lightning CSS guard, plus Velocity's vocabulary checker; hooks are never assigned by the library. |
| D5 | Terrazzo 2.8 with the S3 shapes (any proposal). Seams' golden files and `contract.json`. No scheduled REST poll until the file is on a Neev-owned paid team (Lean/Velocity). |
| D6 | One `light-dark()` block, opt-in default, no `@property`. Seams' `nz.themes` layer for brand order-independence. Velocity's per-scope halo and inverse scope (probe-verified). |
| D7 | Velocity: Chrome/Edge 123, **Firefox 129**, Safari/iOS 17.5; React `^19.2.0`; Node ≥ 22.12. |
| D8 | gap-c model (Seams/Velocity): portals in one z band, Toast as the only top-layer element, O-06 gate. Lean's native Dialog is a later gated swap (N-01…N-04 + O-08). |
| D9 | Identical across all three; adopt as written. |
| D10 | Velocity: only `sm` (40rem) emitted; `md`/`lg` after design confirmation. |
| D11 | Seams: `ScaleLike`, `d3-array` `nice`, SVG `<rect>` bars, an opt-in `@nizivo/charts/d3` time adapter. |
| D12 | Lean: one generator (493/702 ms); springs only on transform and opacity with their paired durations; reduced spring 120 ms. |
| D13 | Seams/Velocity: `strokeWidth=1.92` on a 24 viewBox, `absoluteStrokeWidth` opt-in. Not Lean's calc. |
| D14 | Seams: TS 7 plus the `typescript6` alias, a narrow ESLint react-hooks job, split-job OIDC. |
| D15 | Lean/Velocity: gap-c values; `.nz-hit-target { position: relative }` in `nz.base`. |
| Gaps | Seams (correctly based increments), plus Lean's CSP Profile B guarantee for own server-safe parts. |
