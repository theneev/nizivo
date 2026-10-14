# Verdict: feasibility, design fidelity and roadmap

Date: 2026-10-14. Judge lens: **is it realistic for a small team with a WIP design?** That means:
- a v0.1 that is small, ships in weeks and has real exit criteria;
- fidelity to the Figma file and the designer's guidance (variant names, defaults, density, motion intent, the 640 px breakpoint);
- practical Figma hygiene (ghost masters, leftover collections, missing states);
- no decisions locked in that the WIP design will invalidate.

Proposals judged: `proposal-lean.md`, `proposal-seams.md` and `proposal-velocity.md`. All three were read in full.

## 0. Evidence notes

- **`scratchpad/spikes/REPORT.md` does not exist.** All three proposals say so. Their spike claims (S1–S4) were checked against the raw artifacts, and all three read them the same way. No proposal misreports a spike.
- **Reproduced by this judge today:**
  - **Lean's hooks-altitude measurement** (`design/measure/hooks-sets.mjs` against `bench/deps`). Menu hooks 39.6 KB gz; plus Select 44.2; plus Tabs **45.3**.
  - **Lean's RAC comparison** (`design/measure/lean-sets.mjs`). RAC dashboard 69.0 (r3 repro); RAC Menu + Popover 51.3; RAC Menu + Select + Tabs **65.5**; RAC Modal + Dialog + Tooltip 33.4; `@floating-ui/dom` 6.3.
  - Both sets match lean's table exactly.
  - **`web-features` `starting-style`** (`gapb/dl-wf`) needs **Firefox 129** (and Safari 17.5). Lean and seams set Firefox ≥ 128 while their enter animations use `@starting-style`. Velocity's 129 is correct.
  - **RAC 1.22.1 types.** `react-stately` `SelectProps.selectedKey` and `onSelectionChange` are `@deprecated`. Velocity's "checked against installed types" claim holds. Lean's hooks adapter sketch (`useSelectState({ selectedKey, onSelectionChange })`) and seams' illustrative RAC sketch (`selectedKey=`) use deprecated props.
- **Not reproducible as stored:** lean's native-dialog D-spike (`design/dialog-spike/run.mjs`) and velocity's probe (`design/probe/probe.mjs`) exist as scripts only, with no persisted result file. Their reported results are plausible but are cited here as UNVERIFIED-by-judge.
- **Figma spot-checks** (`docs/figma/00`, `01`, `02`, `04`, `07`, `09`) are in §3.

**Package name (explicit change from what the user was told).** All three proposals, and this verdict, move the core package from `@nizivo/ui` to **`@nizivo/react`**. The import becomes:
- `import { Button } from "@nizivo/react"`, or
- `"@nizivo/react/button"` per component.

The reason is that `@nizivo/tokens` stays framework-neutral, and a future `@nizivo/css` or non-React binding has an unambiguous name (critique C1). Nothing is published yet, so the rename is free today.

---

## 1. Overall ranking (through this lens)

| Proposal | Score /10 | One-line reason |
|---|---|---|
| **Velocity** | **8.5** | The only plan with a buffer, an ordered cut line, week-0 owners outside engineering, and exit gates tied to design reality (a real Figma sync, designer sign-off, dark as "preview"). It has a few fidelity bugs, and week 1 is overloaded. |
| **Seams** | **6.5** | A sound and feasible engine choice with a disciplined seam ledger. But it front-loads contract and manifest infrastructure that will churn with a WIP design. It has no cut line, no buffer and no design gate, and it breaks Figma's reduced-motion intent. |
| **Lean** | **4.5** | Strong measurements and good fidelity on tokens and motion. But v0.1 commits a small team to own native top-layer overlays (which gap-c rejected for v1) **and** parallel break-glass RAC adapters **and** a hooks-altitude engine **and** about 50 exports in about 6 weeks with no cut line. That is not shippable as written. |

**How the overall scores are weighted.** They weight v0.1 shippability (§2), which has no per-decision row, more heavily than the mean of the §4 per-decision scores. The per-decision means are roughly 6.7 (lean), 7.1 (seams) and 8.3 (velocity). Lean's overall score falls well below its mean because its roadmap is the least feasible.

---

## 2. Roadmap feasibility, side by side

| | Lean | Seams | Velocity |
|---|---|---|---|
| Team assumed | 2–3 eng + part-time design | 2–3 eng | 2 FE eng + designer at ~50% + an a11y owner |
| v0.1 duration | ≈ 6 weeks | ~6 weeks | 6–8 weeks (6 + **2 weeks buffer**) |
| v0.1 exports | ≈ 50: 33 T0, 10 form leaves, Dialog/AlertDialog/Tooltip/Toaster (own native), Menu (hooks), **plus** break-glass RAC Dialog and Tooltip | ≈ 26 (16 server-safe, 6 form, Tooltip/IconButton/Select/Dialog on RAC) | 32 (5 RAC families: Tooltip, Dialog, Select, Menu, Tabs) |
| Riskiest v0.1 work | Own top-layer overlays (iOS scroll lock, Firefox exit timing, toast re-portalled into the topmost modal through a MutationObserver), all unverified in Firefox and iOS (lean risks 1 and 4; verify-next 1, 2 and 5); hooks-altitude collection mapping and own DOM (lean risk 2) | `contracts/` manifests with semver classification; `XEngine` interfaces with a public leaf **plus** an engine adapter per part; private `packages/css`; testkit package | W1 holds monorepo + `nz gen` generator + the full token pipeline on a real export |
| Fixtures in v0.1 exit | Next, Vite SSR, Astro; plus CSP Profile B; plus SBOM attestation | next-rsc (both bundlers), vite-spa | Next, Vite, Astro |
| Conformance in v0.1 exit | N-01…N-04 + 11 O-tests × 3 engines × React 19.2/19.3, for own **and** break-glass adapters | 11 O-tests + 3 suites × 3 engines × 2 React | Conformance-lite on 5 families; Chromium on PRs, Firefox and WebKit on main |
| Cut line | **None** | **None** | **Ordered.** Menu, Tabs, ProgressRing and Alert go first, then icons. Field, Select, Dialog, Button and Tooltip are never cut |
| Design gates | None in v0.1; dark shipped as stable | None in v0.1; dark shipped as stable | **A real Figma→PR sync merged**; **designer signs off light renders**; **dark = preview** until rendered review |
| Non-engineering prerequisites | Listed as risks | **Exit criteria:** Figma file moved to a Neev paid team; licence decided | **Week-0 owners:** Figma move, licence, OIDC rehearsal, ghost relink for v0.1 sets |
| Verdict | Not shippable in 6 weeks; the riskiest work sits on the critical path twice | Shippable, but tooling-heavy for 0.x with no slack | **Shippable**; the cut line and buffer make the schedule credible |

**Why lean's v0.1 fails the feasibility test.**
- gap-c §1.4 explicitly rejects "top layer first" for v1. It names four blockers: `overlay` is Chromium-only; whatwg #9936 makes top-layer elements inert under a modal; `closedby` is missing in Safari; `moveBefore` is missing in Safari.
- Lean answers each blocker with its own JS fallback, then keeps RAC break-glass adapters green "nightly" in case those fallbacks fail. For the two riskiest components, that means two implementations, both inside v0.1.
- Its hooks altitude reproduces (−31%), but it moves collection mapping, an own hidden native `<select>` and own popup DOM into Nizivo's maintenance surface.
- Each choice is defensible on its own. Stacked into one 6-week v0.1 with no cut line, they are not.

---

## 3. Design-fidelity spot-checks (Figma report → proposals)

| Figma fact (source) | Lean | Seams | Velocity |
|---|---|---|---|
| Button variants Primary/Secondary/Tertiary/Critical/Accent; Size Sm 32 / Md 40 / Lg 48; guidance "One primary per view. Secondary for everything else" (02 §5.1, line 59) | Yes: names; default `secondary` | Yes | Yes |
| Icon Button Figma default **Secondary**; "Always paired with a tooltip" (02 lines 60, 204) | Yes: tooltip on | Yes | Yes: default `secondary` stated explicitly; tooltip on by default |
| Button icon 16 px at Sm/Md, 20 px at Lg (02 size table) | not sized | not sized | Yes: sizes `icon-sm` / `icon-md` |
| Secondary **disabled** = `bg/disabled` + **`border/subtle`** (02 bindings table) | No: border set to `transparent` | Yes | Yes |
| Primary has a RAW inner highlight + green-tinted shadow (02 anatomy) | dropped until design binds it (explicit) | silent (dropped) | Yes: code-owned `--nz-elevation-button` |
| Accent hover bound to primitive lime/400 and mode-blind; `bg/accent-hover` is a token gap (02 issue 2) | falls back to the **resting** colour (no hover feedback) | `color-mix` interim (has hover) | No: reads `var(--nz-bg-accent-hover)`, which is **not defined** in its §7.6 code-owned or override lists, so the hover background is invalid and paints transparent |
| Secondary hover/pressed also switch the border to `border/strong` (02) | No | No | No (shared miss; minor) |
| Icon stroke: 16 px Button icon at **1.28**, 20 px at **1.6**, so stroke scales proportionally (= 1.92 on a 24 viewBox) (02 anatomy and size table) | No: CSS `calc(1.6*24/size)`: 1.6 px at **every** size, which deviates at 16 px. Settled 7 permits it, but the file's evidence does not | Yes: 1.92 | Yes: 1.92 default; `absoluteStrokeWidth` opt-in |
| Card Style **Surface/Subtle/Inverse**; padding 24; gap 20; Elevation/1 on the set, but 08 compositions draw no shadow at rest (04 §4.2, C35) | Yes (and also folds in Insight tones `brand`/`accent`, following 04's own suggestion); rest elevation off | Yes: literal; rest elevation 0, "design to confirm" | Yes: literal; rest elevation 0, pending sign-off |
| KPI Tile Tone **Surface/Tinted**, but Tinted is **two fills coupled to Trend** (brand-subtle when Up, accent-subtle when Down); 04 recommends decoupling (04 §4.3) | Yes: `surface\|brand\|accent` | No: keeps `tinted`, which leaves it ambiguous which tint | Yes: `surface\|brand\|accent` |
| Toast Success/Critical/Neutral; Alert Info/Success/Warning/Critical; Banner Promo/Warning; Modal Default/Destructive → alertdialog; Empty State Context is content; "gone in 5s" (07) | Yes | Yes | Yes (all three send toast persistence to design) |
| Tooltip: "Delay 400ms, fade + 4px rise in duration/fast" (02 line 34) | Yes: 400 ms | Yes | Yes |
| Motion: "Overlays enter on spring, exit in 140ms ease-in; the backdrop only fades" (01 line 82) | Yes | Yes | Yes |
| **Reduced**: "keeps fades, drops travel … fades stay ≤160ms"; Reduced `fast` = 0, `base` = 120 (01 lines 62, 83; 00) | Yes: spring duration → 120 ms; distances 0 | No: spring durations → **0 ms**, and the dialog fade runs on `duration/fast` (**0** in Reduced), so **modals lose their fade**. This contradicts Figma and seams' own D12 text | Yes: spring → 120 ms; scale-enter → 1 |
| Responsive collection Desktop/Tablet/Mobile (cols 12/8/4, sidebar 264/72/0, content-max 1280/976/358); the only designer threshold is "Below 640px …" (00, C11) | Yes: all three modes emitted (values match 00 exactly); `lg` 80rem marked provisional; no `md` | ~ `sm` stable; **invents `md` 64rem** (no evidence) plus `lg` 80rem, both provisional | ~ `sm` only; md and lg **not emitted**, so Figma's Desktop **values** never ship until design names a threshold; the `lg` decision is a **dated v0.2 gate** |
| Lab: 3D = raster images; shader sources unreadable (`get_shader` refused) (09 lines 15, 20) | No: schedules `@nizivo/lab` with Rays/Mesh in v0.3 | on demand, ≥ v0.3 | Yes: deferred until after 1.0 |
| Dark mode: **no rendered dark pass exists** (G4) | No: ships as stable; axe gated on dark | No: ships as stable | Yes: **preview** in v0.1; stable after design reviews renders of 02/04/06/07 |
| Density: no density in Figma | No: invents `data-nz-density="compact\|touch"` values | Yes: reserved, no values | Yes: reserved, no values |

**Figma hygiene.**

| Hygiene item | Lean | Seams | Velocity |
|---|---|---|---|
| Ghost masters | `component-map.json` keyed by canonical **and** ghost ids; relinking is a v1.0 prerequisite (correctly non-blocking) | same; relink before the map freezes | `component.json` → generated map with `canonical`/`ghosts`/`related`, the most practical single source. But it puts "design relinks ghosts for v0.1 sets" on the **week-0 critical path** with a 50% designer. This should be non-blocking, because the map keys both ids |
| Leftover collections | normalizer drops Clario, Pipkin and the rest | normalizer drops them | normalizer **allowlists `Grove *`**, which is safer against new strays |
| Missing states (G9) | `design/design-backlog.md` | **no consolidated backlog artifact** (0 hits); only a design-confirmation meeting list | `design/backlog.md`, plus a graduation rule: "Figma set unchanged for 2 sync cycles → promotion candidate" |

---

## 4. Per-decision scores (0–10, this lens only) and recommendation

| ID | Lean | Seams | Velocity | Recommended choice (may mix) |
|---|---|---|---|---|
| **D1** Engine + seam | 3 | 7 | 8 | **Velocity:** native T0 + RAC components as the single family behind `<c>.contract.ts` + one adapter file; the engine is selected by the `component.json` field. **Graft lean's measured hooks-altitude path** (Menu 39.6 vs 51.3 KB, reproduced) as a documented per-component **budget escape hatch**, used only when a `size-limit` budget fails. Do not use it as the default in v0.1. |
| **D3** Packages / naming / distribution | 6 | 6 | 9 | **Velocity:** `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons` in v0.1; `@nizivo/charts` in v0.2; motion hooks at `@nizivo/react/motion` (no separate motion package, which saves a trusted-publisher setup); no lab before a real consumer asks; domain kits as docs examples (v0.2) → registry (v0.3) from the same source. **Name: `@nizivo/react`** (changes the `@nizivo/ui` messaging). |
| **D4** Styling details | 6 | 8 | 8 | **Velocity + seams:** plain CSS + Lightning CSS; hand-written hooks extracted to a manifest; no `unstyled` prop; a custom Tailwind plugin. Add seams' cheap stylelint contract rules (layer line first, no theme logic outside tokens, spring/duration pairing) and velocity's output vocabulary check. Keep velocity's Figma-faithful Button details (icon sizes, Primary effect token, disabled `border/subtle`). **Fix accent hover** with a code-owned `bg/accent-hover` (light lime/400 as Figma binds it; dark value from design). |
| **D5** Token pipeline | 8 | 7 | 9 | **Velocity:** Terrazzo 2.8.0 exact pin; a designer-triggered TokensBrücke export uploaded as a PR (no PAT in Figma in v0.1); a Grove allowlist normalizer; **no REST polling while the file may be on Starter**; webhook once on a Neev-owned paid team; **"one real sync merged" as a v0.1 exit gate**. Add lean's and seams' **release block while a "sync needed" issue is open**. |
| **D6** Theme | 6 | 7 | 9 | **Velocity:** `light-dark()` once on `:root`; opt-in default; `data-nz-theme`; `reduce` only; inverse scope through `--nz-scheme-inverse`; **dark = preview until a rendered design review**; brand and density names reserved with **no values**. Reject lean's invented density values and seams' v0.2 `tokens.blocks.css` (nobody has asked for Safari 16.4). |
| **D7** Floors | 6 | 7 | 9 | **Velocity:** Chrome/Edge 123, **Firefox 129** (verified: `@starting-style`), Safari/iOS 17.5; React `^19.2.0`; Node ≥ 22.12. Lean's extra fallbacks (anchor positioning via lazy floating-ui, iOS 18.3 light dismiss, invokers) exist only because of its own native overlays. |
| **D8** Overlays | 3 | 8 | 8 | **Velocity/seams (gap-c §1.4 adopted whole):** RAC portals in one z band ordered by DOM; nested overlays portal into the parent; Toast is the only top-layer citizen, **gated on O-06 in v0.2**; native `<dialog>`/`popover` stay the planned per-component swap. Velocity's automatic root-only scrim (gap-c design ask #10) is simpler for consumers than seams' explicit Backdrop part. |
| **D9** Residual config | 8 | 8 | 8 | Equivalent across all three: no required provider; optional client `NizivoConfig`; `I18nProvider` always wrapped; explicit `locale`/`timeZone`. Use velocity's wording. |
| **D10** Responsive / layout | 8 | 6 | 7 | **Mix:** emit all three Figma Responsive modes (lean). `sm` = 40rem is stable. Desktop values sit at a **provisional `lg`**, marked outside semver (`$extensions.status: provisional`, docs banner). **No `md`** (seams' 64rem has no evidence). Keep velocity's **dated gate**: design confirms the `lg` threshold and the 264/72 vs 248/76 sidebar widths by v0.2 week 8, before AppShell ships. |
| **D11** Charts | 8 | 7 | 8 | **Lean/velocity:** own scales + d3-shape/d3-array; percent-space SVG; HTML labels; `clip-path` draw-in; 0.6 KB island; `ChartFrame` renderer seam; v0.2. The time axis uses velocity's UTC plain-date ticks (evenly spaced daily/weekly, which is what 03 draws). **The WebKit `non-scaling-stroke` check is the first v0.2 task.** Seams' opt-in `./d3` subpath can wait. |
| **D12** Motion | 9 | 5 | 9 | **Lean/velocity:** one generator at a 0.1% settle (493/702 ms); a spring easing always with its paired duration; **Reduced: spring easing → linear, spring duration → Reduced `base` (120 ms), travel → 0**, so fades survive as Figma requires. Reject seams' 0 ms spring durations. |
| **D13** Icons / media | 7 | 8 | 9 | **Velocity:** generated from pinned `lucide-static` 1.56.0; **`strokeWidth` 1.92 non-absolute default** (matches Figma's 1.28 at 16 px and 1.6 at 20 px); `absoluteStrokeWidth` opt-in; alias map for Lucide renames; `Image` with no inline style; icons may slip to v0.2 without blocking core. |
| **D14** Toolchain / governance | 8 | 7 | 8 | **Velocity:** pnpm 12.11.2, tsdown 0.23.1, TS 7 + `typescript6` alias for API tools only, oxlint + stylelint, no compiler rules in 0.x, Changesets fixed group, OIDC split jobs with a day-1 rehearsal. **Argos Pro is a user budget decision.** Fall back to lean's in-repo Vitest screenshots until v0.3. Licence: recommend Apache-2.0; the user and legal decide before the repo opens. |
| **D15** A11y remediation | 8 | 8 | 8 | Same substance in all three (gap-c override file with expiry, drift and redundancy checks, Option A, deviations page). Use **velocity's staging**: AA blocking in light for v0.1; dark reported, not blocking, while it is preview. |
| **gaps** G11–G20 | 6 | 7 | 8 | **Velocity's staging:** Field system + controls in v0.1; Form/SubmitButton, table parts, Toast (O-06) and charts in v0.2; DataView, BulkActionBar, date picker (unstable), command menu, CSP A/B fixtures and registry in v0.3; RTL VR, SR automation and SBOM by v1.0. Lean puts Toast and CSP Profile B into v0.1 and adds a 10-locale + ar-EG VR matrix, which is too much too early. Keep the consolidated `design/backlog.md` (lean and velocity). |

---

## 5. Best idea to graft from each proposal (unique to it)

- **Lean: NativeSelect beside the engine Select, with one shared trigger skin and a documented collapse gate.**
  - What it is: a zero-JS, server-safe `NativeSelect` for plain-text options (the Figma Select's "Last 30 days" values), sharing its trigger skin with the engine `Select`.
  - The gate: when customizable select becomes Baseline (Firefox), a native adapter replaces the engine for the plain-text subset through `engine.ts`.
  - Why it matters: it gives Server-Component forms a real select with no JS while the engine Select matures.
  - Runner-up: lean's reproduced hooks-altitude measurement, kept as a per-component budget escape hatch (D1).
- **Seams: the seam ledger.**
  - The rule: keep a seam only when it has a contract file, a machine check and a known price in bytes and hours.
  - In practice, seams keeps 16 seams and explicitly drops or defers 15 (runtime engine registry, `@nizivo/primitives`, per-component packages, `unstyled` prop, LayerProvider and others).
  - Why it matters: this discipline stops a small team from over-building flexibility that a WIP design will invalidate. It belongs in `CONTRIBUTING.md`/ADR form.
  - Also graft seams' two non-engineering exit gates: the Figma file moved to a Neev-owned paid team, and the licence decided before the repo opens.
- **Velocity: design-reality exit gates for v0.1.**
  - At least one real Figma → TokensBrücke → PR sync merged end to end.
  - The designer signs off light renders of Button, Input, Select and Dialog.
  - Dark ships as **preview** until design reviews rendered dark pages.
  - An **ordered cut line** with a never-cut core (Field, Select, Dialog, Button, Tooltip).
  - Why it matters: no other proposal ties "done" to the design's actual state.

---

## 6. Fatal and serious flaws (with evidence)

### Lean
1. **Serious; fatal to the v0.1 schedule as written.**
   - v0.1 ships own top-layer overlays (Dialog, AlertDialog, Tooltip, Toast) **and** keeps break-glass RAC adapters for Dialog and Tooltip passing the same conformance suite on 3 engines × 2 React versions.
   - gap-c §1.4 rejected top-layer-first for v1 and listed four blockers.
   - Lean's own fallbacks are unverified in Firefox and iOS (risks 1 and 4; verify-next 1, 2 and 5): toast re-portal into the topmost modal via a MutationObserver, JS-sequenced exit, a backdrop `pointerdown` handler, explicit WebKit focus restore, and an iOS `:has()` scroll lock.
2. **Serious.** The hooks-altitude engine moves collection walking, popup DOM and an own hidden `<select>` into Nizivo's code.
   - The saving is real (both sides reproduced: 45.3 vs 65.5 KB).
   - But lean's own risk 2 flags team overrun, and its sketch already uses deprecated react-stately props (`selectedKey`, `onSelectionChange`; `@deprecated` in 1.22.1).
3. **Serious.** v0.1 is about 50 exports plus 3 SSR fixtures (Next, Vite SSR, Astro), CSP Profile B, SBOM attestation and docs for 5 frameworks, in ≈ 6 weeks with **no cut line and no buffer**.
4. **Fidelity.**
   - Icon stroke is fixed at 1.6 px at every size; Figma shows 1.28 at 16 px.
   - Button disabled drops `border/subtle`.
   - Accent hover falls back to the resting colour.
   - Primary's highlight and shadow are dropped.
   - v0.1 has no styled Select (NativeSelect only; native picker in Firefox).
5. **WIP lock-in.**
   - Dark ships as stable despite G4 (no dark render exists).
   - It invents `data-nz-density="compact|touch"` values with no Figma source.
   - It schedules `@nizivo/lab` Rays/Mesh for v0.3 although the shader sources are unreadable (09: `get_shader` refused; 3D is raster).
6. **Minor.** The Firefox 128 floor conflicts with `@starting-style`, which needs Firefox 129 (web-features, verified).

### Seams
1. **Serious (design fidelity).**
   - Reduced motion sets spring durations to 0 ms, and the dialog fade runs on `duration/fast` (0 ms in Figma Reduced). Modals therefore lose their fade entirely.
   - This contradicts 01's "Reduced mode keeps fades … fades stay ≤160ms" and seams' own D12 text.
2. **Serious (feasibility for a WIP design).** v0.1 front-loads:
   - `contracts/` manifests with semver classification on every change;
   - `XEngine` interfaces with a public `*.client.tsx` leaf **and** an engine adapter per part (two layers per part);
   - a private `packages/css`, a testkit package and an S1 matrix fixture.

   Every Figma-driven change will churn the manifests. There is no cut line and no buffer.
3. **Moderate.**
   - A separate `@nizivo/motion` package (one more trusted-publisher setup) for about 1 KB of hooks.
   - A `tokens.blocks.css` compat output in v0.2 with no requester.
   - The drift table's nightly `/meta` REST check assumes the file move that seams gates v0.1 on, but does not say so. It offers no interim cadence while the file may still be on Starter, which allows 6 REST requests a month (r7). Lean (weekly, manual) and velocity (no poll) both handle the interim.
4. **Fidelity / lock-in.**
   - It invents a provisional `md` 64rem with no designer evidence (C11).
   - It keeps KPI tone `tinted`, although Figma's Tinted is two different fills coupled to Trend (04 §4.3).
5. **Process.**
   - There is no consolidated design backlog artifact (G9).
   - There is no designer sign-off gate.
   - Dark ships as stable without a render review.
   - The Firefox 128 floor conflicts with `@starting-style`.

### Velocity
1. **Moderate (feasibility).** W1 bundles the monorepo, the bespoke `nz gen` generator (barrels, exports, size-limit, docs stubs, component map, conformance and Storybook skeletons) and the full token pipeline on a real export, all for 2 engineers. The +2 week buffer and the cut line mitigate it, but the generator should start minimal (barrels, exports, component map) and grow.
2. **Minor bug (fidelity).** Accent hover reads `var(--nz-bg-accent-hover)`, which no code-owned or override file defines (§7.6). The hover background becomes invalid and paints transparent. Ship a code-owned `bg/accent-hover`.
3. **Moderate (fidelity).** Suppressing `md`/`lg` means Figma's designer-authored Desktop mode values (12 columns, sidebar 264, content-max 1280) never reach consumers until design names a threshold. Only the threshold is unknown, not the values. Emit them at a provisional `lg` outside semver (lean's approach).
4. **Moderate (design dependency).** "Design relinks the ghosts for the v0.1 sets" is a week-0 prerequisite for a designer at about 50%. It should not block anything, because `component.json` already keys both ids. Move it to a v1.0 / Code Connect prerequisite.
5. **Minor.** Argos Pro (about $100 a month) from v0.1 is a user budget decision; the Vitest-screenshot fallback must be the default if it is refused.

---

## 7. Recommended v0.1 (velocity base, with grafts)

**Week 0 (owners outside engineering, dated):**
- Confirm the Figma file's team and move it to a Neev-owned paid team.
- Licence decision (Apache-2.0 recommended).
- npm trusted-publisher plan and an OIDC rehearsal on a throwaway package.
- One design meeting covering:
  - the `spring()` parameter order;
  - the `lg` threshold and sidebar widths (needed by v0.2 week 8);
  - the Option A text ladder;
  - `bg/scrim` and `bg/accent-hover`;
  - toast persistence;
  - KPI tint semantics.

**Not on the critical path:** ghost relinking.

**W1, de-risk first** (lean's week-1 spike discipline):
- A real TokensBrücke export through the Grove-allowlist normalizer and Terrazzo.
- The S2 fixture rebuilt on the generated barrel, **with hydration recorded**.
- Firefox reruns of S1 and the probe.
- The monorepo plus a **minimal** generator (barrels, exports, component map).

**W2–W5:** velocity's plan.
- Server-safe set, icons and Fumadocs skeleton.
- Field + controls.
- RAC adapters for Tooltip, Dialog and Select first, then Menu and Tabs (above the cut line).
- `NativeSelect` (lean graft).
- Next, Vite and Astro fixtures.
- size-limit at measured values + 10%.
- The deviations page.

**W6 + 2 weeks buffer:** hardening, then publish 0.1.0 on `next`.

**Cut line:** velocity's order. Menu, Tabs, ProgressRing and Alert go first, then icons. Field, Select, Dialog, Button and Tooltip are never cut.

**Exit criteria.** Velocity's nine criteria, plus seams' two:
- Figma ownership confirmed and moved;
- licence decided.

**Fidelity fixes** carried into the base:
- a code-owned `bg/accent-hover`;
- Desktop mode values emitted at a provisional `lg`;
- non-absolute 1.92 icon stroke;
- Reduced: spring duration = 120 ms;
- Secondary hover/pressed border → `border/strong`;
- Accent pressed (missing in Figma) logged in `design/backlog.md`.

**Governance:** seams' seam ledger as an ADR. A new seam needs a contract file, a check and a price.
