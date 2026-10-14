# Completeness critique of the Nizivo UI planning inputs

Date: 2026-10-14. Role: completeness critic for the "understand" phase. The inputs are the Figma extraction of "Grove UI Library" (`BIzJFf1wm8KP0YG2AVI1tP`) and eight research reports.

## 0. Scope, method and evidence rules

**Inputs read (19 of 19; none missing).** Every file was read in full: `figma/00`–`10` and `research/r1`–`r8`. No agent failed. Long files were read in pages, and every page was read.

**How each contradiction is judged.** Every item gets a verdict. Evidence ranks as follows, strongest first:
1. Local measurement or reproduction (EMPIRICAL)
2. Primary documentation or registry data
3. Designer-authored text in the Figma file
4. The author's own preference

Verdicts are also checked against the user's stated goal: everything must be "plugged in or plugged out later".

**Verification run in this critique:**
- **npm registry.** I queried `dist-tags` for 60 packages and package.json fields for 9. All version claims I could check **match the registry exactly**. See S-c.
- **Figma `whoami`.** It is read-only and exempt from rate limits. It shows which plan tiers the authenticated account holds. No report had checked this. See S-d.
- **`web-features@3.42.0` `data.json`.** I read it as data for 15 Baseline features; all match r2 and r3.
- **The installed `react@19.3.0` `react-server` build.** I inspected it to settle C27 / S6.

**ID scheme.** C = contradiction, S = suspect claim, G = coverage gap, M = missing component, D = decision. `StructuredOutput` refers to these IDs.

---

## 1. Contradictions

### 1.1 Naming, packaging and distribution

| ID | Contradiction | Side A | Side B | Verdict / stronger evidence |
|---|---|---|---|---|
| **C1** | Core package name, cascade-layer namespace and layer order | `@nizivo/ui`: all Figma reports, r2, r4, r6 | `@nizivo/react`: r1, r3, r5, r8. Layer `nizivo.*` in r1. Layer `nz.*` in r2, r3, r7, r8. **Three layer orders:** r1 `reset, tokens, components, utilities`; r2 `tokens, reset, base, components, utilities`; r8 `reset, tokens, base, components, patterns` | Both names are preferences. r8's argument (a framework-neutral `@nizivo/tokens`, a future `@nizivo/css`, a future non-React port) fits plug-in/plug-out best. Use the `nz` layer namespace, because it matches `--nz-` and `.nz-`. **A single canonical layer statement is mandatory**, because layer order is semver'd public API (r8 §8.1). Today three orders conflict, and r8's `nz.patterns` layer exists only in r8. |
| **C2** | CSS subpaths and the `exports` map | r1 uses `./styles/*.css` and puts `tokens.css` inside the React package. r5 imports `@nizivo/tokens/css`. r4 maps `./styles.css` to `dist/css/index.css`. | r2, r4 and r8 use `./css/*`. **r8 uses a `"./*"` wildcard export.** r1 explicitly says "do not use a `./*` wildcard, it exposes internals". r4 generates an explicit map and drift-checks it in CI. | **r4 wins.** Its map is EMPIRICAL (tsdown `exports: true` passed publint/attw and excluded `src/internal/**`), and r1 gives the reason. Reject r8's wildcard. |
| **C12** | Where domain compositions live (dashboard, commerce, storefront, shell) | Separate npm packages proposed by the Figma reports: `@nizivo/dashboard` (04), `@nizivo/commerce` (05, 10), `@nizivo/social` (10), `@nizivo/dates` (02), `@nizivo/icons` (01, r6), `@nizivo/themes` (01). r1 and r2 add `@nizivo/storefront`. | r4: one npm `@nizivo/blocks` holding dashboard, commerce and storefront. r8: **registry-only L4 patterns** (shadcn registry) for commerce, storefront, Sidebar, Mobile Tab Bar and dashboard compositions. Placement of KPI Tile, Delta and Card: **core** (r6, r8), **dashboard** (04), **blocks** (r4). Sidebar and MobileTabBar: **core `@nizivo/ui/shell`** (06, 08) vs **registry** (r8). | Operational evidence favours few npm packages. Every npm package needs a hand-made trusted-publisher entry with 2FA, and there is no scope-wide OIDC (r4 §6.1, primary npm docs). That argues against seven domain packages. r8's EMPIRICAL shadcn tests (E1–E7: no merge on update, overwrite only) show the registry is right for thin, consumer-owned compositions. 05 independently found most commerce items are thin compositions on generic primitives, which supports r8. **Exception:** Sidebar/AppShell is behaviour-heavy (off-canvas drawer, focus trap, cookie persistence, rail tooltips; 06 §6.2). Registry-only would freeze its a11y fixes in consumer copies, so 06 and 08 win for the shell. |
| **C13** | Placement of Progress Bar/Ring and Sparkline | `@nizivo/ui`: 03, r6 ("Progress Bar/Ring live in `@nizivo/ui` (pure CSS/SVG, no d3)") | `@nizivo/charts`: r4, r8 (Progress Ring in charts) | 03 and r6 are stronger. Progress has no d3 dependency, and it is used in non-chart contexts: Upload (02), Discount meter (05), Goals and Setup guide (08), merchant checklist (10). For Sparkline, use r6's slot model (`KpiTile chart={…}`) so that `ui` never imports `charts`. |
| **C19** | Version coupling | r4: one `fixed` group for tokens/ui/charts/blocks, with `@nizivo/lab` **independent 0.x**. r6 and 09 also describe lab as 0.x with its own changelog. | r8: `fixed: [["@nizivo/*"]]` (lab included) | r4 and r6 are stronger. A lab inside the fixed group means every shader experiment bumps core's version line. That contradicts r8's own D18 "work-in-progress valve". |
| **C22** | License | r5: **Apache-2.0** plus TRADEMARKS.md and DCO (patent grant, trademark reservation for a company project) | r4 package.json sketch has `"license": "MIT"`. r3 talks of "an MIT project". r6 says "Ours (MIT)". | This is a legal decision, not an evidence question. The registry confirms RAC is Apache-2.0 and Lucide is ISC, so the dependency licences are fine either way. r5 is the only report that argues it; the others assumed MIT. |

### 1.2 Component API contract

| ID | Contradiction | Side A | Side B | Verdict |
|---|---|---|---|---|
| **C3** | Composition API | `asChild`: 02 §5.1 and §9.8; 04 Card (`asChild` **and** `as`); 05 (`asChild`/`renderImage`); 06 §7.2 "Recommend `asChild`"; 10 (`asChild`/`renderImage`); 01 `Text as=` | `render` (element or function): r3 §4.2 (Base UI, RAC, Ariakit and Ark 6 converge on it); r8 D7 (rejects both `asChild` and `as`); r6 §8 (`render={<NextImage/>}`) | **`render` is stronger.** It is backed by an ecosystem survey of primary docs (r3, r8). The element form also serializes across the RSC boundary while function props do not (react.dev, cited by r8). The Figma-report authors chose `asChild` without comparing options. **Open nuance:** r8's "no `as`" leaves no recommended way to choose heading levels (01 `Text as="h1"`, 04 `Card.Title as="h3"`). Decide whether a *constrained* `as` union for semantic tags is allowed. |
| **C5** | Canonical state-attribute vocabulary (a public styling contract) | r2 and r8: `data-open`/`data-closed`, `data-checked`/`data-unchecked`, `data-starting-style`/`data-ending-style` (Base UI semantics) | r3: `data-entering`/`data-exiting`, `data-focus-visible`, `data-hovered` (RAC semantics). 02 and 07: `data-state="open\|closed"`. 06: `data-current`, `data-collapsed`, `data-selected`. 07: `data-swipe`. | There are five vocabularies. All agree that the vocabulary must be Nizivo-owned and mapped by the engine adapter. **The list itself must be fixed once**, independent of the engine. If the engine is RAC (D1), the r2/r8 Base UI names cost a non-identity mapping. That is acceptable, but decide it now. |
| **C6** | Class naming | r2 and r8: `nz-<component>-<part>` in kebab-case, declared semver'd API | r3 and r6 sketches use BEM: `nz-checkbox__control`, `nz-popover__dialog`, `nz-chart__line`, `nz-acc__summary`. 01: `.nz-text-heading-h1`. | **r2 and r8 win.** They define the contract, and the BEM fragments are illustrative code in other topics. Lint the chosen pattern with stylelint (r2 §4.9). |
| **C7** | Private and public CSS variables | r2: private `--_bg` per component, public hook `--nz-button-bg` read at the use site, hand-written CSS. r8: the same idea with `--_bg` set per variant. | r7: private `--_nz-button-bg: var(--nz-button-bg, var(--nz-bg-brand))`, **generated** from a DTCG component tier (`button.tokens.json`) by a custom Terrazzo plugin. 04: surface-context vars `--nz-surface-bg/-fg/-border`. | All three agree on the concept: hooks are read, never assigned. They differ on **naming** (`--_x` vs `--_nz-x`) and on **source** (hand-written vs generated). `--_nz-` avoids clashing with consumers' own `--_` vars. A generated tier adds a second source of truth unless component tokens live only in DTCG. **Decision needed.** |
| **C26** | Button defaults | Figma default is `Primary`, and r2's sketch defaults to `primary` with variants `primary\|secondary\|ghost\|critical` | 02 (guidance "Secondary for everything else") and r8 sketch default to `secondary`. The Figma variants are Primary/Secondary/Tertiary/Critical/Accent. | r2's `ghost` naming and its missing Tertiary/Accent variants contradict Figma. Use the Figma names. The default is a design decision; 02 and r8 cite designer guidance text, so their evidence is stronger. |
| **C27** | Whether server-safe components can use `useId` | r1 §2.4 and §4.1: "server-safe components cannot call hooks, so a server-safe `Field` must take explicit ids or wrap labels" | 02 §5.4: the Field shell renders on the server "with ids via `useId`" | **02 is right (VERIFIED).** r1 itself quotes React: `useId` "cannot be used in **async** Server Components". `react@19.3.0`'s `react-server` build exports `useId`. r1's blanket rule would force needless id props. See S6. |
| **C36** | Client-directive file convention, and the CI guard that enforces it | r1: every hook file is `*.client.tsx`. Its CI audit fails any `"use client"` file not named `*.client.js`, and any `*.client.js` without the directive. | r3: `_engines/react-aria/*.tsx` and `parts.tsx` with `'use client'` and no suffix. r8: `primitives/*.tsx`, `select.parts.tsx`. r4: a guard that compares each `src` directive with its `dist` output, independent of naming. r6: `ChartCrosshair.client.tsx`. | **The layouts of r3 and r8 would fail r1's guard.** r4's guard is tested (it passes on a good build and fails after stripping) and works with any naming. Adopt r4's guard. The `.client.tsx` suffix is optional; choose one convention. |

### 1.3 Tokens, theming and motion

| ID | Contradiction | Side A | Side B | Verdict |
|---|---|---|---|---|
| **C8** | Semantic token names | `--nz-bg-surface`, `--nz-text-primary`: 01, r1, r3, r6, r7. These keep the existing Figma `codeSyntax` shape `--grove-bg-*`. | `--nz-color-bg-surface`: r2, r8. Easing: `--nz-easing-*` (01, 09, r1, r6, r7, r8) vs `--nz-ease-*` (r2) vs `--nz-motion-ease-standard`/`--nz-motion-duration-md` (r3 §10.3; these exist nowhere else). Focus: `--nz-focus-ring` (01, r8) vs `--nz-focus-ring-color/-width` (r3). | **The `--nz-bg-*` family is stronger.** The file's codeSyntax already uses it, so Dev Mode and MCP `get_variable_defs` output stay recognisable once `grove` becomes `nz` (r7 §6.1, §8.4). Pick one easing namespace. r3's names are sketch errors. |
| **C9** | Theme attribute, default behaviour and mechanism | **Attribute:** `data-theme` (01, r5 Storybook decorator, r7 output) vs `data-nz-theme` (r1, r2, r8). **Motion attribute and values:** `data-motion="reduced"` (01, r7), `data-nz-motion="reduce"` (r2, r6), `data-nz-motion="full\|reduced\|off"` (09). | **Dark mode by default:** automatic from the OS in 01 ("prefers-color-scheme as the default"), r1 (`color-scheme: light dark` on `:root`) and r7 (a `prefers-color-scheme` block on `:root`). r2 makes it **opt-in only**: no `color-scheme` unless the app sets the attribute, so light-only host apps do not get dark scrollbars. **Mechanism:** `light-dark()` (r1, r2, r8 L0) vs duplicated blocks (r7 default; `light-dark()` "later, optional"). | The namespaced attribute wins: r2 cites a collision with daisyUI-style `data-theme`. **Defaults are a product decision.** For a library embedded into existing apps, r2's non-intrusive default has the better rationale. The mechanism depends on the browser floor (D7): `light-dark()` forces Safari ≥ 17.5 (web-features data in r2 §9), while blocks reach Safari 16.4, the Next 16 and Tailwind 4 floor. r2 flags two load-bearing behaviours as UNVERIFIED: `color-scheme: normal` resolving to light, and Lightning CSS lowering `light-dark()` inside custom properties. |
| **C9b** | Overriding reduced motion with "full" | r2: "No 'force full motion' override is offered, out of respect for the user's OS setting" | r6, r7 and 09 emit `:root:not([data-…motion="full"])`. 09 adds `off` for deterministic screenshots. | **r2 has the stronger a11y argument.** 09's `off` is a test-only need, and r5 already forces reduced mode in visual-regression tests. Ship `reduce` (and maybe `off` for tests). Treat `full` as a separate, explicitly justified decision. |
| **C10** | Spring → `linear()` baking | 09: 440 ms / 573 ms (0.5% settle, 25 samples). r7: 492→490 ms / 701 ms (0.1%). r2: 500 ms / 710 ms (0.1%, simplified). r6: **600 ms / 750 ms** (Motion's generator). Overshoot is 2.8% in 09 vs 3.0% elsewhere. The duration token is named `--nz-duration-spring` (r2, r6, 09) or `--nz-duration-spring-settle` (r7). | 07 §6.6 pairs overlay enter with `duration/base` (220 ms) and the spring. 01's motion principle says "modals … enter on spring". r2, r6 and r7 all say a spring easing **must not** be paired with an unrelated duration, because that distorts the physics. | No report is wrong. They use different rest thresholds and solvers, and **the result is four sets of numbers for the same token**. Decide on **one generator in the token build** with a documented threshold and sample count, plus the duration-pairing rule. Separately confirm with the designer that the order is `spring(mass, stiffness, damping, velocity)` (r2 flags this as UNVERIFIED). |
| **C11** | Breakpoints and sidebar widths | **Designer text** on page 08 (`7275:18744`): "Below 640px the sidebar becomes a five-tab bar and the top bar shrinks." 08 proposes `sm 640` and `lg 1280`. | 01, r2 (48rem/80rem) and r7 (768/1280) propose 768 for mobile→tablet. r7 read only `00` and `01`; r2 read only the snapshot. r5's Storybook tablet viewport is 834 px, while Figma uses 1024. Sidebar: tokens say 264/72/0, frames use 248/76 (06, 08). | **The designer-authored 640 wins** for mobile→tablet. The rail→expanded threshold has **no designer evidence**: 1280 is a guess in every report. The sidebar width conflict is unresolved, and both 06 and 08 escalate it to design. |
| **C35** | Figma-internal design contradictions (record and send to design) | Elevation: "flat by default" (01) vs Elevation/1 labelled "Resting cards". Card Surface uses Elevation/1 (04). Compositions show **no** shadows at rest (08). | `border-width/strong` is 1.5, but the header says "borders are 1px" (01). Hover runs at 160 ms everywhere, which is not a token (`fast` = 140); every report flags it. Toast guidance says "gone in 5s", but the Lab prototype shows 2.68 s (09). | Prototype compositions (08) are the strongest evidence of intended rest elevation. All of these need design sign-off before tokens freeze. |

### 1.4 Behaviour engine, overlays and configuration

| ID | Contradiction | Side A | Side B | Verdict |
|---|---|---|---|---|
| **C4** | Headless behaviour engine | r3: native-first T0 tier plus **React Aria** (`react-aria-components` 1.22.1 and `react-aria` hooks) behind a build-time adapter. It is the only report with **measured** bundle sets: dashboard set RAC 69.0 KB vs Base UI 88.3 vs Radix 42.9 (with gaps) vs Ark 58.9. | r8: "not decided here", yet every sketch and the package.json put **Base UI** in `dependencies`, citing shadcn's July 2026 default. 02: "React Aria fits date/listbox/i18n best; Radix or Base UI acceptable". 06 and 07: "one headless lib" (unnamed). 07 §9.1: the default implementation is native `<dialog>`/`popover`. | **r3 has the strongest evidence** (measurement, coverage matrix, 36-locale i18n, documented screen-reader matrix). The confidence is only medium: the cost is about 19 KB more per page than Base UI's simpler parts API and stable Toast. **All reports agree on the seam** (one adapter file per family; r3 §8, r8 §5.4, r4 §6.5, 06 §8, 07 §9.1), so this decision is reversible. Registry check: RAC depends on `client-only` and `@internationalized/date`. Base UI marks `date-fns` as an optional peer. **The engine choice therefore also picks the date library** (see G16). |
| **C16** | Configuration channel: router, link, image, icons, locale | Context providers: 06 `NizivoProvider router={{Link, useIsCurrent, navigate}}`; 08 `NizivoProvider linkComponent imageComponent icons locale`; 10 `components.Image/Link`; 07 `NizivoProvider icons={…}`; 05 a `createCommerce()` factory plus a client `CommerceProvider`; r3 `NizivoProvider` wrapping RAC `I18nProvider` and `RouterProvider`, described as "required for SSR locale and router links". | r1 D10: zero-provider default; context is only for intra-compound wiring. r6 §8: element slots, because "Server Components can't read context" and functions and component references don't serialize. r8 D13: an optional client `NizivoConfig` (locale, direction, portal, labels); links go through `render`. | **The RSC constraint decides this** (r1, r6 and r8 cite primary React docs). Provider-based link and image adapters would force `'use client'` onto server-safe parts such as NavItem, Card and ProductCard. They also lose on swappability. Use element slots and `render` for links and images. **Real residual conflict:** if the engine is RAC, non-`en-US` locales and router-aware links inside client islands need `I18nProvider` and `RouterProvider` (r3). The "zero-provider" promise therefore holds only for the default locale. 06's "auto-current NavItem via router hook" also needs a client island. |
| **C17** | Overlay layering and z-index | r1 D9: "top layer first" (native `popover`/`<dialog>`, portals only as fallback). 07 §6.5: z scale with **popover 1000 < drawer 1100 < modal 1200 < toast 1300 < tooltip 1400**, plus a LayerProvider with three toast-over-modal options. 01 §10.1: a different scale where **popover 1300 sits above modal 1200** and tooltip is 1500. | r3: **none of the six engines uses the top layer**. A grep of the installed dists found 0 `showPopover`, `showModal` or `anchor-name`. r3 chooses RAC portals plus its own Toast on `popover="manual"`. r2: `popover` needs **iOS 18.3**, above r2's own Safari 17.5 floor, so a fallback is needed. | **r3's tarball evidence shows r1's "top layer first" cannot be met by any engine in v1.** It becomes the planned native-swap path behind the adapter. The two z scales conflict on whether a popover sits above a modal. The mixed model (an RAC portal modal plus a top-layer toast) is **untested**. RAC hides content outside the modal from assistive tech, so a toast action may become unreachable. This needs a conformance test before it is adopted. |
| **C18** | React peer floor | `^19.2.0`: r1 D1 and r8 package.json. This is the import-driven floor (`Activity`, `useEffectEvent`) and matches Mantine 9 (registry-confirmed `^19.2.0`). | `^19.0.0`: r4 §6.4 and r6's `@nizivo/charts` and `@nizivo/lab` peers. r1 wants the lab at `^19.3.0` because it uses `use(browser())`. | **r1 is stronger.** What a package imports sets its real floor (r1 §3). r6's lab peer of `^19.0.0` contradicts r1's 19.3-only `browser()`. |

### 1.5 Charts and icons

| ID | Contradiction | Side A | Side B | Verdict |
|---|---|---|---|---|
| **C14** | Chart internals | 03: `d3-scale` + `d3-shape` + `d3-array`; pixel-space SVG; draw-in via `pathLength` + `stroke-dashoffset` (09 agrees); SVG bars; time scale with week ticks and a forced last tick. | r6: **its own ~10-line linear/band scale** (measured: d3-scale `scaleLinear` alone is 7.8 KB gz; area chart is 3.2 KB vs 10.4 KB with d3-scale); percent-space `viewBox` with `non-scaling-stroke` and **HTML labels**; **HTML/CSS bars**; draw via `clip-path` because "pathLength + dash interacts badly with non-scaling-stroke (UNVERIFIED)". | **r6 is stronger on size and SSR** (measured, with renderToString evidence that Recharts 3 emits no SVG). r6 leaves two holes. **Time axes** are not handled: the d3 subset with `scaleTime` is 17.6 KB, and 03's x-axis is a time scale. r6's argument against `pathLength` is unverified. The percent-space approach also needs early Safari QA (r6 Risk 2). |
| **C15** | Icon delivery | 01: "Code must use `lucide-react` (or an adapter) directly". 10: `lucide-react` as an optional peer through `IconProvider`. 05: a string registry `<Icon name="truck"/>` with `IconProvider`/`createIconSet`. 07: `NizivoProvider icons`. 04: an internal `icons` registry. | r6: `@nizivo/icons` **generated** from pinned `lucide-static`. The core imports no icon package; icons are `ReactNode` slots plus about 10 inlined glyphs. r8: slots typed `ReactNode`. | **r6 + C16 win.** A string-keyed registry needs a client context, so it cannot feed server-safe components. Registry check: `lucide-react` 1.56.0 is ISC with `sideEffects: false`, and `lucide-static` 1.56.0 exists. See **S1** for the stroke-width error in r6's own sketch. |

### 1.6 Toolchain, quality and release

| ID | Contradiction | Side A | Side B | Verdict |
|---|---|---|---|---|
| **C20** | TypeScript and lint strategy | r4: TS 7 at the root; d.ts via oxc (`isolatedDeclarations`); **oxlint** type-aware; ESLint rejected because typescript-eslint can't run on TS 7; TS 6-only tools isolated per package; API snapshot = concatenated d.ts. | r5: alias `typescript` → `@typescript/typescript6`, with TS 7 as `@typescript/native` (the Base UI pattern); a ts-morph API manifest; type tests on TS 6 and 7. **r1 D2 depends on `eslint-plugin-react-hooks` 7 `recommended-latest`** for React Compiler rules, plus a custom ESLint client/server rule. r4 notes oxlint's compiler rules are *experimental*. | The registry confirms TS 7.0.2's `.` export holds **only version info**, the API exists only under `./unstable/*`, 7.1 is still `-dev`, and `@typescript/typescript6` 6.0.2 exists. **r5's alias resolves r1's need** for ESLint with react-hooks, which r4's plan drops. Decide how compiler-rule enforcement works; otherwise r1's "compiler-clean code" policy has no enforcement. |
| **C21** | Release workflow | r4: split jobs (select-mode → version → pack → publish); `id-token` only on the publish job; a GitHub App token so the Version PR runs CI; environment `npm`; **sub-action inputs verified from `action.yml`**. | r5: one job with `id-token: write` at workflow level; environment `npm-publish`; action inputs marked UNVERIFIED; bootstraps new packages with `npm stage publish`. | **r4 wins:** its inputs are verified and it follows least privilege. r4 also resolves r8's UNVERIFIED Changesets 3 `fixed` schema question ("checked that the schema exposes `format`, `fixed`, …"). |
| **C23** | Size budgets vs measured costs | r4 §7.3 (brotli): overlay components (Select/Menu/Modal/Toast) **12 kB each**, all of `@nizivo/ui` **60 kB**. r5 §9.1: Select 9, Menu 8, Dialog 6, Toast 5, Tooltip 5, **Tabs 4 kB**. | r3 measured (gzip, standalone): RAC Select 59.5, Dialog 28.1, Tabs 31.9, Tooltip 14.3. Base UI 45.2/23.6/13.5/33.8. Radix 31.7/13.8/9.4/19.9. r3's own budgets: popover 32 kB, dashboard set 75 kB. | **The measurements win.** Brotli vs gzip is about a 10–15% difference and cannot close gaps of 3–8×. No engine fits r4's or r5's numbers. Derive budgets from r3's baseline. |
| **C24** | Docs site role | r4: `apps/docs` is "Storybook 10 (react-vite), deploys docs site". | r5: Storybook is internal workshop and test harness only; public docs on **Fumadocs 16** (Next 16), which doubles as an RSC consumer. r8: Fumadocs also serves the registry `/r/*.json`. | **r5 + r8 win** (dogfooding RSC, props manifest, registry hosting). Registry confirms `fumadocs-core` 16.17.2. |
| **C25** | Figma IDs for Code Connect and component maps | 04, 08 and 10 treat the on-canvas `7275:*` sets as canonical. | 06: the page copies (`7275:*`) have **0 instances**; the live sets are the off-canvas `755:*`. 10: alias both. r5 and r7: **custom Code Connect requires Organization or Enterprise**. | The plan check (S-d) shows **no Organization or Enterprise plan**, so Code Connect is moot for now. Use r7's repo-local `component-map.json` keyed by **both** IDs, and make the design team's relinking of ghosts a prerequisite (see G1). |

### 1.7 Smaller conflicts worth one line each

- **Segmented control.** 06 prefers a headless RadioGroup "for consistent focus styling"; r3 makes it T0 native radios. A design-time choice.
- **Glass.** 09 puts `unstable_LiquidGlass` in the lab; r6 says "do not ship SVG-displacement liquid glass in v1" (Chromium-only; `@supports` lies in Firefox). r6 has the stronger evidence.
- **Toast store.** r1 uses an external `useSyncExternalStore` store, 07 a framework-agnostic `createToastStore()`, and r3 RAC `useToastRegion`/`useToast` hooks. They are compatible only if the queue lives in a Nizivo store and RAC hooks only render it.
- **size-limit PR action.** r5 recommends `andresz1/size-limit-action`; r4 notes its last release was April 2024 and suggests a custom comment step.
- **Fixture folder names.** r4 uses `apps/playground-*`, r5 and r8 use `fixtures/*`. Trivial; pick one.
- **Focus-ring contrast.** 01 reports 1.45:1, r2 1.44, 06 about 1.3. The gap is small, and all three are far below 3:1.

---

## 2. Suspect claims

### S-a. Wrong by arithmetic or internal logic (fix before the design phase copies them)

| ID | Claim | Where | Why it is wrong | Correct value |
|---|---|---|---|---|
| **S1** | `createIcon` with `viewBox="0 0 24 24"`, `size = 20`, `strokeWidth = 1.6` reproduces the Figma icons | r6 §6.2 code | 1.6 × 20/24 renders as **1.33 px** at 20 px. Figma specifies 1.6 px at 20 px. | `strokeWidth ≈ 1.92` (non-absolute), as 02, 06, 09 and 10 all computed; or `absoluteStrokeWidth` with 1.6 |
| **S2** | `::before { inset: min(0px, (var(--nz-size-touch-min) - 100%) / 2) }` expands hit areas to 44 px | 02 §7 | For a 40 px control, (44 − 40)/2 = +2 px, and `min(0px, 2px)` = **0**. **No expansion happens**. The sign is wrong. | r8's `calc((touch-min − 100%) / −2)` is correct, but it only expands vertically. A 40×40 Icon Button also needs horizontal expansion. |
| **S3** | Button `:focus-visible { outline: none; box-shadow: var(--nz-focus-ring) }` | r8 §7.2 | `box-shadow` is not painted in `forced-colors` mode, so focus disappears in Windows Contrast Themes. The halo alone is about 1.45:1 (01, 02, r2). This contradicts the solid-outline rule in 01, 02, r2 and r5. | `outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px`, with the halo as optional decoration |
| **S4** | Per-component budgets of 4–12 kB for Tabs/Tooltip/Dialog/Select/overlays | r4 §7.3, r5 §9.1 | Infeasible against r3's measured engine costs (C23) | Calibrate from r3's sizes plus the T0 native tier |
| **S5** | Terrazzo lint `a11y/min-font-size: 12px` | r7 §7.4 | The Figma rule is "Nothing smaller than 14px" (01 Typography header). 01 left a 12 px caption as an open question for design. | 14 px, unless design adds a 12 px style |
| **S6** | "Server-safe components cannot call hooks … so a server-safe Field must take explicit ids" | r1 §2.4, §4.1 | React only bars `useId` in **async** Server Components, which r1 itself quotes. **VERIFIED in this critique:** `react@19.3.0`'s `cjs/react.react-server.production.js` (the `react-server` export condition) exports `use`, `useCallback`, `useDebugValue`, **`useId`** and `useMemo`. The rule is over-broad. | Allow `useId` in synchronous server-safe parts and keep the `id` override. Narrow r1's lint rule from "no hooks" to "no state, effect or context hooks". |
| **S7** | Button variants `primary\|secondary\|ghost\|critical`, default `primary` | r2 §4.4 | Diverges from Figma: Tertiary and Accent exist, and there is no "ghost". See C26. | Use the Figma names |
| **S8** | CSS sketch tokens `--nz-size-control-xs`, `--nz-focus-ring-width`, `--nz-motion-duration-md`, `--nz-motion-ease-standard` | r3 §10 | None of these exist in the Figma token set or in any token report | Use the token names from D5 |
| **S9** | "Figma `spring()` → 600 ms / 750 ms" stated as the spring duration | r6 §3.3 | Not wrong, but it uses Motion's default rest threshold. Settle times differ by up to 36% across reports (C10). | One generator, one threshold |
| **S10** | `popover="manual"` Toast for top-layer stacking (r3) inside a Safari ≥ 17.5 floor (r2) | r3 §8.9, r2 §9.1 | r2's own table gives iOS **18.3** for `popover`. No fallback is specified for iOS 17.5–18.2. | Specify a fallback, or raise the floor (D7) |

### S-b. Author-flagged UNVERIFIED items that gate a decision (deduplicated and ranked)

1. **Terrazzo 2.8 partial-permutation behaviour** (a `{theme:"dark"}`-only block emits only theme tokens) and **typography sub-variable names** (r7 §7.4, §15). These gate the token CSS shape (D5, D6).
2. **Whether `plugin-tailwind` can emit `@theme inline` with `var(--nz-*)` references** (r7). This gates the Tailwind adapter (D4).
3. **`color-scheme: normal` resolving `light-dark()` to light**, and whether **Lightning CSS lowers `light-dark()` inside custom properties** (r2). These gate the non-intrusive default and the legacy fallback (D6, D7).
4. **The `export * as X` namespace object (`__exportAll`) in a real Next 16 RSC build** (r1 §10.3, r3 §8.6). This gates the compound export pattern (D2). Plain-Node SSR is verified; RSC is not.
5. **An RAC portal modal combined with a top-layer `popover` toast**, focus and AT reachability (inferred from C17). This gates the overlay model (D8).
6. **End-to-end `pnpm@12.11.2 publish <tarball>` with GitHub OIDC** via changesets/action v2 (r4 §9.3). This gates release (D14). pnpm 12 being `latest` is registry-confirmed.
7. **The Figma `spring(a,b,c,d)` parameter order** (r2). This gates every spring curve (D12).
8. **RAC `useToast`/`useToastRegion` stability** and **RAC's `--trigger-width` variable name** (r3, r8). These gate the Toast and positioning adapters.
9. **`'use no memo'` at module scope** (r1). This gates compiler phase 2.
10. **`@vitejs/plugin-rsc` (TanStack Start) and React Router 8 RSC honouring `'use client'` in `node_modules`** (r1). Non-blocking fixtures.
11. **TokensBrücke with a fine-grained PAT**, the **`LIBRARY_PUBLISH` webhook for variables-only publishes on Pro**, and the **native Figma export format** (r7). These gate the extractor (D5).
12. **Safari behaviour of `vector-effect: non-scaling-stroke`**, and **`pathLength` combined with non-scaling stroke** (r6). These gate the chart geometry (D11).
13. **Firefox hydration of a customizable `<select>` with rich markup** (r3). This gates NativeSelect.
14. **The Storybook 10 viewport-global shape for Chromatic/Argos modes** (r5), **Argos OSS eligibility for a company project** (r5), and whether **Algolia DocSearch is still free for OSS** (r5).

UNVERIFIED items that **another report already resolves** (cross-reference them; don't re-research):
- tsdown `inputOptions.checks.moduleLevelDirective` (flagged by r1) was verified by r4 §3.2.
- The `overlay` property cross-browser (flagged by r6) is Chrome-only per r3 §5, from BCD data.
- `sibling-index()` support (flagged by r6) has been Newly Baseline since 2026-08-18 per r2 §9.2.
- The Changesets 3 `fixed` schema (flagged by r8) was checked in r4 §12.8.
- The changesets/action v2 input names (flagged by r5) were verified from `action.yml` by r4.

### S-c. Post-cutoff version claims checked against the npm registry today

**All checked claims are confirmed exactly.** No drift was found. Most of these facts are newer than this reviewer's training data, so the registry is the only evidence used here.

| Area | Confirmed (registry `latest` on 2026-10-14) |
|---|---|
| Frameworks | react / react-dom **19.3.0**; next **16.4.0** (canary 16.5.0-canary.9); react-router **8.4.0**; astro **7.3.8**; @astrojs/react **7.0.1**; @tanstack/react-start **1.169.1**; vite **8.3.4** |
| Tooling | typescript **7.0.2** (`next` = 7.1.0-dev.20261013.1; the `.` export is `./lib/version.cjs` only, and the API lives only under `./unstable/*`); @typescript/typescript6 **6.0.2**; pnpm **12.11.2** (latest-11 = 11.28.2); tsdown **0.23.1**; rolldown **1.2.13**; @changesets/cli **3.0.3**; size-limit **14.2.0** |
| Engines | @base-ui/react **1.9.0** (peer react ^17\|\|^18\|\|^19; optional peers date-fns ^4 and @date-fns/tz); react-aria-components **1.22.1** (Apache-2.0; `sideEffects: ["*.css"]`; deps include `client-only` and `@internationalized/date`); radix-ui **1.8.1**; @ark-ui/react **5.39.3** (next 6.0.0-next.0); @mantine/core **9.7.2** (peer react ^19.2.0, exact @mantine/hooks); @heroui/react **3.2.6** (peer tailwindcss >=4, react-aria-components ^1.21.1) |
| Tokens and styling | @terrazzo/cli **2.8.0**; style-dictionary **5.6.1**; tokens-bruecke **3.18.0**; @figma/code-connect **2.0.1**; tailwindcss **4.3.3**; @pandacss/dev **2.2.0**; class-variance-authority **0.7.1** (stale) |
| Quality and docs | storybook **10.6.2** (next 11.0.0-alpha.6); @storybook/addon-vitest **10.6.2**; vitest **5.0.4**; axe-core **4.14.0** vs @axe-core/playwright **4.13.0** (the skew r5 describes); fumadocs-core **16.17.2**; shadcn **4.21.4** |
| Heavy modules | lucide-react / lucide-static **1.56.0** (ISC); motion **14.2.0**; three **0.186.1**; @react-three/fiber **9.8.1** (peer `react >=19 <19.4`, confirming r6's warning); @paper-design/shaders-react **0.0.81** (Apache-2.0); geist **1.7.2** (peer `next >=13.2`, so Next-only as r6 says); d3-scale 4.0.2; d3-shape 3.2.0 |
| Maintenance signals | next-themes **0.4.6, last publish 2025-03-11** (19 months, which supports r1's "appears unmaintained"); cmdk **1.1.1, 2025-03-14** (stale, relevant to 06's Command Menu) |

**Baseline data, also confirmed today.** I read `web-features@3.42.0/data.json` as data and checked 15 features. Every status, date and version matches r2 §9 and r3 §5:

| Feature | Status | Since | Minimum versions / notes |
|---|---|---|---|
| `light-dark` | Newly | 2024-05-13 | Safari and iOS 17.5 |
| `popover` | Newly | 2025-01-27 | **iOS 18.3** |
| `anchor-positioning` | Not Baseline as a whole | — | Umbrella only full in Safari 27 |
| `linear-easing` | Widely | 2026-06-11 | |
| `starting-style` | Newly | 2024-08-06 | |
| `transition-behavior` | Newly | 2024-08-06 | |
| `customizable-select` | Not Baseline | — | No Firefox |
| `backdrop-filter` | Newly | 2024-09-16 | Safari 18 |
| `container-queries` | Widely | 2025-08-14 | |
| `cascade-layers` | Widely | 2024-09-14 | |
| `view-transitions` | Newly | 2025-10-14 | |
| `prefers-reduced-transparency` | Not Baseline | — | Chromium only |
| `field-sizing` | Newly | 2026-06-16 | |
| `dialog-closedby` | Not Baseline | — | No Safari |
| `popover-hint` | Not Baseline | — | No Safari |

The floor arithmetic in D7 therefore stands. `light-dark()` forces Safari 17.5, `popover` needs iOS 18.3, and glass via `backdrop-filter` needs Safari 18.

Not checked (outside registry reach): GitHub-side claims (Radix release gap, Headless UI dormancy, shadcn changelog contents, Lucide's brand-icon removal), npm policy dates (Aug 2026 / Jan 2027), Figma help-centre plan matrices and MCP limits. The identical numbers in r1, r2, r4 and r5 are now registry-confirmed, so cross-report agreement on the remaining claims is moderate corroboration.

### S-d. Figma plan reality (a gap no report closed; now partly closed)

- **`whoami`:** the authenticated Figma account holds Full seats on 8 teams. **7 are Starter, including "The Neev" (admin)**, and **1 is Pro**, a personal studio team. There is **no Organization or Enterprise plan**.
- **Consequences that are now certain:**
  - The Variables REST API is out (Enterprise-only, per r4, r5 and r7).
  - Custom Code Connect is out (Organization/Enterprise only).
  - The token pipeline must be plugin- or agent-driven and human-triggered, exactly as r7 designed it.
- **What the MCP call count does and does not prove.** This run made at least ~123 MCP calls in one day without a 429:

  | Report | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 |
  |---|---|---|---|---|---|---|---|---|---|---|
  | MCP calls | 12 | 10 | 13 | 9 | 12 | 14 | 11 | 11 | 15 | 16 |

  MCP limits are keyed to the *user's* seat and plan tier (r7's table is per seat). So the count only shows that the authenticated account has a Pro-tier MCP budget, through its Full seat on the one Pro team. **It does not show where the file lives.** REST limits follow the file's plan.
- **Where the file lives: a weaker, file-side signal.** The Grove collections carry 2–3 modes, and r7 says Starter cannot create modes. That points to a paid team, most likely the personal Pro team, but it does not rule out a team downgraded after the modes were created. **Confirm the file's team in the Figma UI.**
- **Design-phase implication.** r5 plans to publish the Community file from a Neev team profile. r7 warns that a Starter team "cannot create modes" and has prohibitive MCP and REST budgets. **Moving the file into "The Neev" (Starter) would put the multi-mode token setup and the agent extraction path at risk.**
  - Ownership must move to a Neev-owned *paid* team: at least Pro, and Organization for Code Connect.
  - The MCP session is also authenticated as an individual collaborator's account, not a Neev-owned service identity.
  - Both points are an ownership and continuity risk for a company OSS project.
- **Still unverifiable from here:** the exact MCP limits (r7: Starter 20/month, Pro 200/day and 10/min), the Pro mode cap of 10 per collection (forum source only), and whether `use_figma` counts against MCP limits.

---

## 3. Coverage gaps

### 3.1 Figma extraction gaps

| ID | Gap | Evidence |
|---|---|---|
| **G1** | **Ghost and duplicate masters were not diffed against the canonical sets** across most pages. 06 diffed its five sets and 10 diffed its five key-by-key. 04, 05, 07 and 08 did **not** diff the ghost Button `744:263`, Badge `744:315`, Input `745:187`, Delta `752:269`, Sparkline `747:288`, KPI Tile `752:380`, Order Row `753:644`, Product Row `753:476` and the others in the 08 §5 table against `7275:*`. Without the diff, "identical API" is assumed and the file's source of truth is unknown. | 04 §2, 05 §0, 07 §0, 08 §5 |
| **G2** | **componentPropertyDefinitions never read:** Order Summary `754:897`, Table Header `753:410`, Order Table Header `753:599`, Brand/Logo `739:64`, Social/Instagram `772:4302`. Customer Card `754:530` is only partial (TEXT props Name and Email are named; no raw JSON). The live Sidebar set `755:869` was never fingerprinted. | 05 §9, 06 §14, 01 §5 |
| **G3** | **Internals never traversed:** the ghost Badge, Button, Icon and Table Header masters (05, 07); Area Chart Hover `747:310` bindings (04); the Insight Accent CTA label colour (04); 08's instance internals; 10's checkout, order-placed and merchant-dashboard internals (screenshots only); 10's custom easing control points. | 04 §13, 05 §9, 08 §15, 10 §9 |
| **G4** | **Zero dark-mode renders.** Every dark-mode contrast verdict is computed from token hexes (all reports). The dark-mode bugs found are severe: Toast action 1.75:1, the scrim brightening the page, Segment thumb = track, brand-subtle = accent-subtle = success-subtle. A rendered dark pass of at least pages 02, 04, 06 and 07 is needed. | 02 §10, 04 §13, 07 §7, 08 §0.7 |
| **G5** | **Pages never reported:** the Cover page (`7275:11229`) and separator pages `----` 356:1000, `----` 356:1001 and `---` 7275:23025. 06 only confirmed they don't hold the 755/738/772 ghosts. | 00, 06 §1 |
| **G6** | **The "62 components" reconciliation requested by 01 was never done.** The count is 47 sets plus about 21 non-icon standalone ghosts (Dropdown Menu, Tooltip, Date Range Picker, Funnel, Heatmap, Revenue Card, Ranked List, Customer Card, Order Summary, Table Header ×2, Store Switcher, Command Menu, Top Bar, Breadcrumb, Pagination, Drawer, Mobile Top Bar, Order List Item, Post Badge, Brand/Logo), plus Social/Instagram and 74 icons. That is about 68–69, not 62. The cover meta is stale, or the inventory is incomplete. | 01 §14 |
| **G7** | **Assets.** Image fills (3D renders, product photos, portraits) were recorded by hash only, never exported. Licence and provenance are unknown (01, 06, r6). Shader sources are not retrievable (09, r6). Icon geometry was not diffed against `lucide-static` 1.56.0. | 01 §6, 09 §11 |
| **G8** | **Variable scopes.** 09 found all 20 Motion variables have **empty scopes**, which hides them from designers. No report checked scopes on Color, Space or Responsive. Scopes feed TokensBrücke's "include scopes" export and designer binding hygiene. | 09 §1 |
| **G9** | **Design-state coverage.** No component has responsive variants. Most sets lack Focus, Disabled, Loading and Error states. Mobile Tab Bar has 2 of 5 Active values. Patterns 1–8 have no mobile versions. Every report records these; they need **one consolidated design backlog**, which nobody produced. | all Figma reports |
| **G10** | **Code Connect map** was never queried (`get_code_connect_map`). The plan makes it moot (S-d), but it confirms no prior mapping exists. | — |

### 3.2 Decision areas nobody researched, or covered only partially

| ID | Area | Status in the reports | What is missing |
|---|---|---|---|
| **G11** | **Forms integration** (react-hook-form 7.90.0, Zod 4.6.7, TanStack Form 1.33.5, Conform 1.21.2; versions checked today) | Only native form participation (r1 §2.3, r3 T0) and a Field anatomy (02 §5.4). **Field ownership conflicts:** 02 treats it as a core foundation, r3 as T0 native, r8 says `SelectField` conveniences start in the registry. | Ref-as-prop to native inputs (`register`); `Controller` wrappers for custom controls (Select, Switch, Combobox, DateRangePicker, FileUpload); Standard Schema validation; error-id and `aria-describedby` wiring; `:user-invalid` timing vs submit; server-action errors via `useActionState`; uncontrolled vs controlled defaults; a reset contract (r1 mentions the React 19.3 `onReset`). |
| **G12** | **Data table** (@tanstack/react-table **9.3.1**, @tanstack/react-virtual 3.14.19) | 05 and 08 propose `Table` + `useRowSelection`; r3 notes RAC has a Table. | Headless table engine choice; server-driven sort, filter and pagination; select-all tri-state; bulk-action bar; sticky header; column sizing (fixed px columns in Figma); virtualization for 500+ rows (r5 bench); the responsive Table↔List swap (08 §6.3); RAC Table vs native `<table>` semantics. |
| **G13** | **Date and time** (@internationalized/date 3.12.4, date-fns 4.4.0, temporal-polyfill 1.0.6) | 02 proposes `@nizivo/dates` with a swappable adapter. r8 names `@internationalized/date`. r3 notes RAC date pickers. **None decides.** | The engine implicitly decides it (RAC → `@internationalized/date` as a hard dependency; Base UI → date-fns optional peer). Native Temporal status was not assessed. Time-zone policy (r1 requires an explicit `timeZone` to avoid hydration mismatches). Week start, non-Gregorian calendars, the compare-to-previous-period UX (03, 04), and the Apply/Cancel commit model. |
| **G14** | **i18n and RTL** | Partial: r8 §6.10 (logical properties, a `labels` prop, `direction`); r3 (RAC's 36 locales); 05 §7.3 (ICU messages, British spelling in Figma); r6 (explicit locale for Intl). | Message-format choice (Intl only vs FormatJS: @formatjs/intl 6.1.3, react-intl 12.1.4); plural rules for built-in strings; which locales ship (RAC's `optimize-locales-plugin` config); an inventory of hard-coded English strings; an RTL visual-regression matrix (r5's matrix omits RTL); a list of icons to mirror; text-expansion tests (tab bar labels at 75 px, 08 §7.3). |
| **G15** | **Overlay layering model** | Fragmented (C17): two z scales, top-layer vs portal, an untested toast-over-modal, portal-into-dialog (r3 §8.7), Activity close rules (r1 §2.5). | One layering spec and a conformance test set: nested overlays inside a Dialog, a toast action reachable while a modal is open, Activity hide/show, scroll-lock reference counting, and Firefox exit animations. |
| **G16** | **Dark-mode elevation** | Acknowledged by 01, 02, 04, 06, 07, r2 (placeholder alphas) and r7 (`shadow.tint`). **No option chosen and no design spec.** | Choose among surface-lightness steps (01's recommendation), a border hairline, higher shadow alpha, or a combination. It must be decided with design before tokens freeze. |
| **G17** | **Security and supply chain beyond publishing** | r4 and r5 cover OIDC, provenance, SHA-pinned actions, Renovate `minimumReleaseAge`, pnpm `allowBuilds`, Scorecard and SECURITY.md. | **CSP:** components write inline `style` for CSS variables (`--i`, `--v`, chart `--value`) and positioning engines write inline styles, so `style-src 'unsafe-inline'` or nonces are needed. Nobody checked whether RAC or Base UI inject `<style>`. Also missing: Trusted Types beyond the theme script (r1); an SBOM; a licence audit of the mix (Apache RAC, ISC Lucide, OFL fonts, CC0 Simple Icons, CC BY Figma Community, unknown image licences); the registry as a supply-chain vector (registry items declare `dependencies` that `shadcn add` installs); Instagram CDN proxying and privacy (r6 marks it UNVERIFIED); enforcing the GSAP ban with lint. |
| **G18** | **Hotkeys and the command menu** | 06 proposes a global hotkey registry (⌘K, ⌘B, F8 for toasts, menu shortcuts) with IME handling. | Library choice (tinykeys 4.0.1 exists) vs in-house; `aria-keyshortcuts` policy; command-menu virtualization; `cmdk` is stale (2025-03), and r3 suggests RAC Autocomplete + Menu instead. |
| **G19** | **Accessibility remediation ownership** | Every report finds the same token failures: `text/tertiary` 4.31:1, borders 1.27/1.57:1, `icon/warning` 2.45:1, dark `text/critical`/`text/info`, a 1.45:1 focus halo. r7 says fixes land in Figma and flow through sync. | Who decides and when. Code cannot ship WCAG 2.2 AA with today's tokens. Needs an interim code-owned override layer vs blocking on design, plus an expiry policy for r7's lint allowlist. |
| **G20** | **Loading, empty and error states; streaming** | Proposed per component (03, 04, 07 Skeleton, 08 §12). | One cross-component contract (`status` prop vs slots vs Suspense boundaries) and Skeleton-mirrors-layout tests. Not designed in Figma. |
| **G21** | **Brand and white-label configuration** | 01 (Logo slot), 10 (`brand` in the provider), r2 and r7 (`[data-nz-brand]`, resolver modifier). | The inventory of "Grove" strings (Brand/Logo, `grove.shop`, "Powered by Grove", "Accent reserved for Grove AI") and where brand config lives without a provider (C16). |
| **G22** | **Runtime performance beyond bundle size** | r5 covers size-limit and Vitest bench. | Web Vitals budgets for the RSC + RAC hydration cost on the docs and fixtures; glass and shader GPU budgets (r6 Risk 10, 09 §3.4) have no test. |

### 3.3 Consolidated list: UI elements in compositions without a (usable) component set

**M-A. Ghost-only masters** (used by instances; no master on any canvas page; cannot be edited or published)

| Element | Ghost id | Seen in | Proposed home |
|---|---|---|---|
| Dropdown Menu (surface) | 746:204 | 02 | core Menu.Content |
| Tooltip | 746:262 | 02, required by Icon Button | core |
| Date Range Picker | 746:267 | 02 | dates (engine-dependent) |
| Funnel Chart / Heatmap | 751:319 / 751:393 | 03, 08 P6 | charts |
| Revenue Card / Ranked List | 752:385 / 752:444 | 04, 08 | TrendCard + RankedList (core or pattern; D3) |
| Customer Card / Order Summary | 754:530 / 754:897 | 05, 07 Drawer | commerce pattern |
| Table Header ×2 (near-duplicates) | 753:410, 753:599 | 05, 08 | core Table.Header (merge) |
| Store Switcher, Command Menu, Top Bar, Breadcrumb, Pagination | 755:663/889/1031/998/1007 | 06, 08, 10 | core |
| Drawer | 756:1001 | 07, 08 P3 | core (Dialog-based) |
| Mobile Top Bar / Order List Item | 764:3397 / 764:3483 | 08 | core shell / commerce list presentation |
| Post Badge | 772:4419 | 10 | Badge recipe |
| Brand/Logo, Social/Instagram, Icon/* (74) | 739:64, 772:4302, 738:* | all pages | Logo slot; brand-icons entry; icons package |

**M-B. No component at all** (hand-built frames or shapes in compositions). "Bypassed" means a set exists but the composition re-draws the element.

| # | Element | Where | Nearest existing set | Proposed owner |
|---|---|---|---|---|
| 1 | AppShell / page frame | 08 all | Sidebar + Top Bar | core shell |
| 2 | PageHeader (title, meta, actions) | 08 all patterns | — | core |
| 3 | Section/Card panel (**Card set never used**, ~20 raw frames) | 08 | Card 7275:13757 (bypassed) | core |
| 4 | Text Link ("View all") | 04, 08 | — | core |
| 5 | Avatar (image, initials, square store mark; 28/32/40/52/94) | 05, 06, 08, 10 | — | core |
| 6 | Kbd (platform-aware) | 06 | — | core |
| 7 | Indicator dot / count badge on an icon (bell, bag) | 06, 10 | Badge | core |
| 8 | SegmentedControl track / container | 06, 08 | Segment items | core |
| 9 | TabList container (underline baseline); icon-only tabs | 06, 08, 10 | Tab items | core |
| 10 | Field (label, description, error) | 02 | Input anatomy | core (see G11) |
| 11 | Listbox/option popup for Select | 02 (implied) | Menu Item | core |
| 12 | Calendar Day cell | 02 | — | dates |
| 13 | Metric (label, number, delta, comparison) | 04 KPI + Revenue | — | core |
| 14 | Data table container, toolbar, footer range summary | 05, 08 | Product/Order Row | core Table / DataTable |
| 15 | Bulk-action bar | 08 P1 (implied) | — | core pattern |
| 16 | Hand-drawn checkbox (Product Row), fake radio (Payment Method), raw usage meter (Discount), hand-drawn upload progress | 02, 05 | Checkbox, Radio, Progress Bar (bypassed) | use core |
| 17 | Bare-icon actions (close, More, search, bell, back); Toast action as a TEXT node | 04–08, 10 | Icon Button, Button (bypassed) | core |
| 18 | Filter chips (single/multi) | 08 mobile | Variant Option, Segment | core ChipGroup / ToggleGroup |
| 19 | ListGroup (section label + card list); NavList (settings sub-nav) | 08 | Nav Item | core |
| 20 | Layout primitives: Split 8/4, Grid spans, Stack, Container | 08 | Responsive tokens only | core |
| 21 | Compact 7-day bar card; Goals list; Progress Ring grid | 08 | Bar Chart, Progress | charts variant / pattern |
| 22 | Setup guide / onboarding Checklist | 08 P8, 10 merchant | — | core pattern |
| 23 | Image/Media/AspectRatio/Thumbnail; media gallery with upload tile | 05, 08, 10 | Upload | core + commerce |
| 24 | "Live Render" media slot; 3D Feature tile with arrow pill; Float loop | 08, 09 | — | core slot + motion |
| 25 | Scrim/backdrop (raw RECT; **no token**) | 08 P3, 10 | — | core overlay |
| 26 | Sticky action bar (safe-area) | 10 (×4) | — | core pattern |
| 27 | Image hotspot stage, Pulse, Placing reticle, on-media Hint chip | 10 | Product Tag | core Hotspot + social |
| 28 | PageIndicator (dots, fraction chip); Carousel | 10 | — | core |
| 29 | On-media floating buttons (back, bag) | 10 | Icon Button | core variant + **on-media tokens** |
| 30 | Profile header (StoryRing avatar, stats, bio, **custom Follow/Share frames**) | 10 | Collection Circle, Button (bypassed) | social |
| 31 | Collections rail; Post grid; Post viewer modal with external prev/next | 10 | Shoppable Post, Modal | social |
| 32 | Bottom sheet (merchant tag flow) | 10 | Drawer | core Sheet |
| 33 | Hotspot editor | 10 | — | social/editor |
| 34 | Merchant custom tab bar | 10 | Mobile Tab Bar (bypassed) | core |
| 35 | Quantity stepper (PDP) | 10 | — | core NumberField |
| 36 | Collapsible order summary; express-pay buttons; contact/delivery form; shipping radios; promo-code row | 10 checkout | Order Summary, Payment Method, Input, Radio | commerce patterns + Disclosure |
| 37 | Rating stars | 10 | — | commerce |
| 38 | Hero section (shader backdrop + paper-fade scrim); glass card with stat chips | 09, 10 | Surface/Glass style | lab + core Surface |
| 39 | Stat tile (customer card, profile stats) | 05, 10 | KPI Tile (larger) | core Stat |
| 40 | Copy button (discount code) | 05 (implied) | — | core |
| 41 | Chart frame primitives: axis, grid, data table, chart empty/loading/error states | 03 | — | charts |

**M-C. Implied by the UI but absent from the file:**
- Row-actions menu; account menu; notifications popover; store-switcher list.
- Command menu (used on 08); a real date-range picker (08 uses a Select as a stand-in).
- "More" bottom sheet; toasts after Save/Fulfil; skeleton/loading pages.
- Sticky mobile save bar; sidebar off-canvas mode and collapse toggle.
- Mobile versions of Patterns 1–8.
- Textarea, character count, password toggle, prefix/suffix inputs (02).
- Combobox / search suggestions.
- Error, empty and loading variants for every widget.

---

## 4. The top 15 architecture decisions for the design phase

Evidence class abbreviations: **M** = measurement, **P** = primary doc or registry, **F** = designer text in Figma, **A** = author preference.

| # | Decision | Options on the table | Evidence for each |
|---|---|---|---|
| **D1** | Behaviour engine and adapter seam | (a) **Native-first T0 + React Aria** behind one adapter file per component (r3). (b) **Base UI** (r8 sketches; shadcn default since July 2026; MUI-funded; stable Toast). (c) **Radix** (lightest, but no combobox, number field, drawer or upload). (d) **Ark/Zag** (about 15% lighter than RAC, but mid-way through a breaking major). | (a) M: dashboard set 69.0 KB vs Base UI 88.3; P: 36 locales, named-screen-reader test matrix, Apache-2.0, `client-only` dependency (registry). (b) P: momentum; M: 1.28× RAC. (c) M: 42.9 KB, but mixing in a second engine for a combobox costs 97.4. (d) P: 6.0.0-next.0 on the `next` tag (registry). **All reports agree on the seam** (C4). |
| **D2** | Composition, compound exports, file convention | `render` (element or function) vs `asChild` vs `as` (C3). Namespace + flat exports vs static properties. `*.client.tsx` + r1's audit vs a naming-agnostic guard (r4) (C36). Whether a constrained `as` is allowed for heading levels. | `render`: P (Base UI, RAC, Ariakit, Ark 6 docs; React serialization rules). `asChild`: A (02, 06). Static properties break across RSC: P (Next docs, `react-server-dom-webpack` error string, r3). Namespace object in a Next RSC build: **UNVERIFIED** (S-b 4). |
| **D3** | Package topology and distribution channel | Core name `@nizivo/react` vs `@nizivo/ui` (C1). Domain code as separate npm packages (Figma reports) vs one `@nizivo/blocks` (r4) vs registry-only L4 patterns (r8) (C12). Shell in core vs registry. Progress in ui vs charts (C13). An icons package (r6). | P: per-package trusted-publisher setup with 2FA and no scope-wide OIDC (r4). M/EMPIRICAL: shadcn has no update merge, but non-Tailwind installs work through an `init` item (r8 E1–E7). F/analysis: commerce items are thin compositions (05); the shell is behaviour-heavy (06). |
| **D4** | Styling contract | Plain CSS + Lightning CSS + `@layer nz.*` (r2), vs vanilla-extract (deferred), vs Panda `cssgen`. Class pattern: kebab (r2, r8) vs BEM (C6). One state vocabulary (C5). Private-var prefix `--_` vs `--_nz-`, hand-written vs generated component tier (C7). `unstyled` prop (r8). A Tailwind v4 adapter (`layer(components)` + `@theme inline`). | P: cascade-layer semantics; Tailwind docs on third-party CSS in `components`. EMPIRICAL: HeroUI assigns vars on the element, which defeats ancestor overrides (r8); the Mantine and Radix Themes survey (r8 §4). UNVERIFIED: plugin-tailwind var references (S-b 2). |
| **D5** | Token source of truth, pipeline and naming; Figma hygiene | Builder: **Terrazzo 2.8** (DTCG 2025.10 resolver) vs **Style Dictionary 5.6** (no resolver; #1590 open). Extractor: TokensBrücke PR vs MCP `use_figma` dump vs REST (Enterprise only). Names: `--nz-bg-*` vs `--nz-color-bg-*` (C8). Prefix: build-time rename only vs a published rewrite step. Code-owned tier: breakpoints, z, scrim, info solids. Ghost relinking and a component map keyed by both IDs (C25). | P: registry confirms terrazzo 2.8.0, style-dictionary 5.6.1, tokens-bruecke 3.18.0; Figma REST variables are Enterprise-only (r4, r5, r7). **whoami: no Organization or Enterprise plan; Neev's team is Starter** (S-d). F: existing codeSyntax `--grove-bg-*`. |
| **D6** | Theme mechanism and defaults | `light-dark()` (r1, r2, r8) vs duplicated blocks (r7). Dark by OS default (01, r1, r7) vs opt-in (r2). Attribute `data-nz-theme` vs `data-theme`. Motion attribute values, and whether to offer `full` (C9b). Nested scopes, brand and density modifiers. Dark elevation approach (G16). | P: web-features (`light-dark()` Newly 2024-05-13, Widely 2026-11-13; Safari 17.5); CSS custom-property substitution (nested scopes). A: default intrusiveness. UNVERIFIED: `color-scheme: normal` behaviour and Lightning CSS lowering (S-b 3). |
| **D7** | Support floors | Browser: Safari 16.4 (Next 16 and Tailwind 4) vs 17.5 (`light-dark()`, r2) vs iOS 18.3 (`popover`); Firefox ESR 140 vs 153 (r3 open question). React: `^19.0` (r4, r6) vs `^19.2` (r1, r8), with lab at `^19.3` (C18). Node `>=22.12`. | P: web-features 3.42.0 tables (r2, r3); registry peers (Mantine `^19.2.0`, R3F `<19.4`); Node 20 EOL. Note: each floor raise unlocks a native swap behind the adapter (r3 §6.1). |
| **D8** | Overlay and layering model | Top layer first (r1) vs engine portals + z-index (r3 reality) vs a LayerProvider with options a/b/c (07). z scale: 01's or 07's ordering. Toast-over-modal strategy; portal-into-dialog; `overlay/scrim` token values; exit animations in Firefox. | M/P: no engine uses the top layer (r3 grep); `overlay` is Chrome-only (BCD); P: Activity close-on-hide (Next docs, r1). Untested: an RAC modal combined with a popover toast (S-b 5). F: "the backdrop only fades" (01 motion principle). |
| **D9** | RSC configuration channel | Zero-provider (r1) vs optional `NizivoConfig` (r8) vs a required provider (06, 08, 10). Links and images through `render` and element slots (r6, r8) vs context adapters (06, 08, 10) vs `createCommerce()` factories (05). Locale and time-zone determinism. | P: Server Components can't read context; functions don't serialize (react.dev). P: RAC needs `I18nProvider` for server/client locale matching (r3). EMPIRICAL: per-island `identifierPrefix` in Astro (r1). |
| **D10** | Responsive and layout system | Breakpoints 640/?/1280 (08) vs 768/1280 (01, r2, r7) (C11). Viewport media tokens vs container queries for components (r2, 04, 08). Sidebar widths 248/76 (frames) vs 264/72 (tokens). A config-driven nav (08 §12.3) feeding Sidebar, Rail, TabBar and CommandMenu. Content swaps (Table↔List, chart↔compact). | **F: "Below 640px …" (08) is the only designer threshold.** P: container size queries are Widely Baseline (r2). F: tablet and mobile compositions show content swaps, not just reflow (08 §6.3). |
| **D11** | Charts architecture | Own thin scales + d3-shape (r6) vs d3-scale (03) vs visx/ECharts/uPlot adapters behind `ChartFrame`. Percent-space SVG + HTML labels vs pixel SVG. Draw via `clip-path` vs `pathLength`. Time-axis strategy. Server-first geometry + 0.6 KB island. Mandatory data table and keyboard model. | M: own area chart 3.2 KB vs 10.4 KB with d3-scale; Recharts 3 SSR emits no SVG (r6). F: time axis, flipping tooltip, "dims siblings", max 3 categories + Other (03). UNVERIFIED: Safari non-scaling-stroke behaviour (S-b 12). |
| **D12** | Motion system | One spring generator, threshold and sample count (C10). Spring duration as a derived pair vs Figma's separate `duration/*`. CSS-first + own tiny hooks (r6) vs Motion 14 as an optional adapter. Reduced-motion policy: stop loops, keep fades ≤160 ms, `full` override or not. Package placement of Tilt, Magnetic, CountUp, Float (motion) vs Shader and Liquid glass (lab). | M: Motion `motion.div` 44.2 KB; LazyMotion 14.2 KB initial (r6). P: Motion SSR leaves content at `opacity:0` before hydration (r6). F: Lab keyframes deviate from tokens (09 §4); Figma's spring string format is unconfirmed. |
| **D13** | Icons and media assets | Generated `@nizivo/icons` from `lucide-static` (r6) vs a `lucide-react` peer (10) vs a string registry (05) (C15). Stroke rule 1.92 on a 24 viewBox (S1). Brand glyphs from Simple Icons (CC0) in a separate entry. No font files shipped (`geist` is Next-only). Image as a plain `<img>` primitive plus `render`/slots. | P: registry (lucide 1.56.0 ISC; geist peer `next >=13.2`). F: 74 Lucide icons at 20 px with 1.6 stroke; masters unparented (01). F: the Instagram glyph's own usage rule is violated by Sidebar and Post Badge (06, 10). |
| **D14** | Toolchain, quality gates, release and licence | TS 7 root (r4) vs `typescript6` alias (r5) (C20). oxlint vs ESLint + react-hooks for compiler rules. API snapshot (d.ts concat) vs ts-morph manifest. Budgets from measurements (C23). Storybook as workshop + Fumadocs as public docs (C24). Argos vs Chromatic. Fixed versioning with lab independent (C19). r4's split OIDC workflow (C21). **MIT vs Apache-2.0** (C22). | P: registry (TS 7 has no JS API; `@typescript/typescript6` exists; pnpm 12.11.2; changesets 3.0.3). M: r3 sizes; r4 tsdown experiment. P: npm trusted-publishing rules (48 h expiry, stage-only default for configs after 2026-09-03). |
| **D15** | Accessibility baseline and token remediation | Fix tokens in Figma first (r7 flow) vs a code-owned interim override layer. `text/tertiary` darkened vs restricted to ≥18 px. `border/control` ≥3:1. Focus = 2 px outline (+ optional halo) vs halo. Touch-target policy (pointer-coarse 44 px expansion vs control sizes). On-media tokens (10). A 12 px caption or not (S5). The Field contract for error announcement (G11). | M/P: contrast computed identically by every report (e.g. 4.31:1, 1.27:1, 1.45:1); WCAG 1.4.11, 2.4.11 and 2.5.8. F: "Nothing smaller than 14px"; "44px via padding on touch" (02 Button description). Conflict: S2, S3, S5. |

**Blocked on missing research (should become D16–D18 once G11–G13 are researched):** the forms and Field architecture (G11), the data-table engine (G12), and the date/time library (G13, which D1 partly decides).

---

## 5. What to do before the design phase starts

1. **Reconcile naming once** in a single "contract sheet": C1, C2, C5–C8, C9 and C36. Most contradictions here are vocabulary, not substance.
2. **Fix S1–S8** in whatever document the design phase inherits, so wrong numbers don't propagate.
3. **Run the four cheap verifications that gate decisions:**
   - a Next 16 RSC fixture with namespace compound exports (S-b 4)
   - a Terrazzo 2.8 partial-permutation dry run on a TokensBrücke export (S-b 1)
   - an RAC modal + popover-toast prototype (S-b 5)
   - confirmation with the designer of `spring()` parameter order and the rail→expanded breakpoint (S-b 7, C11)
4. **Commission short research** for G11 (forms), G12 (data table) and G13 (dates), and add a dark-mode render pass of pages 02, 04, 06 and 07 (G4).
5. **Settle Figma ownership** (S-d): confirm which team holds the file, and move it to a Neev-owned paid team before any community publishing or Code Connect planning. Then have design relink the ghosts (G1) so Figma IDs are stable before a component map is written.
