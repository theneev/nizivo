# Nizivo UI architecture proposal: lean core, performance first

Date: 2026-10-14. Lens: **lean core / performance first**. Status: competing proposal for the design phase.

**Evidence keys used throughout**

| Key | Meaning |
|---|---|
| r1–r8 | Research reports in `docs/research/` (§ = section) |
| 01–10 | Figma page reports in `docs/figma/`; `00` = token snapshot |
| C/S/G/D/M | Critique IDs in `docs/research/00-critique.md` |
| gap-a/b/c | Gap reports (forms/tables/dates; i18n/security/states; overlays/dark/a11y) |
| S1–S4 | Phase-2 spikes in `scratchpad/spikes/` (s1 Lightning CSS + light-dark, s2 Next RSC exports, s3 Terrazzo, s4 spring). Raw result files were read directly; the spike REPORT.md did not exist when this was written |
| M-lean | Measurements run for this proposal: `scratchpad/design/measure/{lean-sets,hooks-sets}.mjs`. Same method as r3 (esbuild bundle + minify, ESM, production, React external, gzip -9). The harness reproduces r3's RAC dashboard baseline exactly (69.0 KB gz) |
| D-spike | Native `<dialog>` browser check run for this proposal: `scratchpad/design/dialog-spike/run.mjs`. Chromium 156.0.8078.4 and WebKit 27.2; Firefox failed to launch in the sandbox |
| WF | `web-features` 3.42.0 `data.json` (`scratchpad/gapb/dl-wf`) |

---

## 1. Summary and thesis

**Thesis: pay per interaction.** A page composed only of T0 components ships **zero bytes** of Nizivo JavaScript (the v0.1 exit test, §9). A display page that adds icon-button tooltips and a root Toaster pays only for those small own leaves. Interactivity is bought in the cheapest tier that still meets WCAG 2.2 AA:

1. **T0, native/server (0 KB):** semantic HTML from server-safe components.
2. **T2, own code on platform primitives (≤ 3 KB each, target):** `<dialog>.showModal()`, `popover`, `<details name>`, constraint validation, invoker commands. The browser supplies the top layer, inertness, Esc and focus.
3. **T1, one engine family (React Aria at the hooks altitude):** only for widgets the platform cannot do in Oct 2026 (menu, rich listbox, tabs, combobox, number field, calendar). Each sits behind a one-line swap point and can be loaded on intent.

CSS does the visual work: tokens, variants, states, container-query responsiveness, `light-dark()` theming, and `linear()` springs. There is no runtime styling, and server-rendered markup never carries a `style` attribute (so a strict CSP works, gap-b B1).

**The numbers behind the lens (measured unless marked).**

| Fact | Value | Source |
|---|---|---|
| RAC "dashboard" set (Modal, Dialog, Popover, Menu, Select, ListBox, Tabs, Tooltip) | 69.0 KB gz | r3 §3.2, reproduced by M-lean |
| Same widgets minus Modal/Dialog/Tooltip (what this proposal keeps on the engine) | 65.5 KB gz | M-lean |
| Same engine widgets at the **hooks** altitude (Menu + Select + Tabs) | **45.3 KB gz (−31%)** | M-lean |
| Menu alone: RAC components vs hooks | 51.3 vs **39.6 KB gz** | M-lean |
| What own native overlays replace on pages with no engine widget (RAC Modal + Dialog + Tooltip) | 33.4 KB gz → own target ≤ 5 KB (UNVERIFIED until built) | M-lean |
| Positioning fallback (`@floating-ui/dom`), loaded only where CSS anchor positioning is missing | 6.3 KB gz | M-lean |
| Own AreaChart + interaction island vs Recharts | 3.2 + 0.6 vs 107.7 KB gz | r6 |

Honest reading of these numbers: once any engine widget is on a page, moving Dialog/Tooltip off the engine saves only 3.5 KB (69.0 → 65.5), because the core is shared. The lean wins come from three places instead: **(a)** pages with no engine widget pay 0 engine bytes; **(b)** the hooks altitude cuts the engine itself by about 20 KB; **(c)** the engine can be moved off the critical path (intent/idle loading, v0.2).

**Package naming changes what the user was told.** The core package is **`@nizivo/react`**: `import { Button } from "@nizivo/react"` (or `"@nizivo/react/button"`). **`@nizivo/ui` is not used.** Framework-neutral tokens live in `@nizivo/tokens`. There are five npm packages in total (`tokens`, `react`, `icons`, `charts`, `lab`); domain kits ship as registry patterns.

**How the lens avoids painting itself into a corner.** Every native-first component has:
- an engine-agnostic contract (`<c>.contract.ts`);
- a single swap line (`engine.ts`);
- a conformance suite that every adapter must pass;
- a **break-glass React Aria adapter** for the own overlays most likely to hit a browser bug (Dialog, Tooltip), kept compiling and tested nightly.

The two native gaps that bite in v0.1 are handled explicitly:
- **Customizable select has no Firefox support** (WF). `NativeSelect` (T0, plain-text options) ships beside an engine `Select` for rich content. Both share one trigger skin.
- **Safari gaps** (`closedby`, `overlay`, `popover="auto"` light dismiss before iOS 18.3, anchor positioning before Safari 26) get small JS fallbacks inside the own adapters. Each fallback is deleted when the floor rises.

**Spike results that override earlier report text (stated once here, applied everywhere below).**
- **S2:** a namespace export built inside a `'use client'` module fails the Next 16.4 build under both Turbopack and webpack ("Element type is invalid … got: undefined"). It must be built in a **directive-free** `*.parts.ts` that re-exports from client leaves, which builds and renders. r3 §8.6's sketch (directive on `parts.tsx`) is wrong on this point.
- **S1:** do **not** lower `light-dark()` with Lightning CSS. Lowered output breaks nested scopes, and with no root `color-scheme` it resolves to transparent. Native `light-dark()` nests correctly. The floor is therefore Safari 17.5, with one token block.
- **S3:** Terrazzo partial permutations are clean only with `only.modifiers` plus `exclude`. The stock Tailwind plugin does not emit semantic `var()` references; a ~20-line custom plugin does.
- **S4:** one spring generator at a 0.1% settle threshold gives 493 ms / 702 ms. All 12 generated `linear()` strings are valid in Chromium 156 and WebKit 27.2.

---

## 2. Decision table

Format: **choice**, then rationale with evidence, how to reverse it, and blast radius. "T0/T1/T2" are the tiers defined in §1.

| ID | Decision | Choice | Rationale (evidence) | How to reverse later | Blast radius if reversed |
|---|---|---|---|---|---|
| **D1** | Behaviour engine and seam | **Three tiers per component, one engine family.** **T0** native/server: buttons, inputs, checkbox/radio/switch, segmented control as radios, `NativeSelect`, `<details>` accordion, progress/meter, table parts, all display components. **T2** own on platform primitives: Dialog/AlertDialog/Drawer/Sheet on `showModal()`; Popover on `popover="auto"`; Tooltip and Toast on `popover="manual"`; disclosure nav; file drop; table selection; hotkeys (tinykeys). **T1 = React Aria hooks** (`react-aria` + `react-stately`, caret ranges) for Menu, rich Select, in-page Tabs, Combobox, NumberField, range Slider. RAC components are allowed **inside** an adapter for RangeCalendar and Autocomplete (same family, shared core). **Seam:** `<c>.contract.ts` (public types) + `engine.ts` (one re-export line) + `_engines/<engine>/<c>.tsx` (the only engine import site) + a per-component conformance suite. Break-glass RAC adapters exist for Dialog and Tooltip. | Hooks Menu+Select+Tabs 45.3 KB vs RAC 65.5 KB; Menu 39.6 vs 51.3 (M-lean). A dialog-only page avoids 33.4 KB of RAC Modal/Dialog/Tooltip (M-lean). The platform covers dialog/popover/top layer (r3 §5, WF). D-spike: `cancel` interception allows exit animations, a popover inside a modal stays interactive, `:root:has(dialog:modal)` matches. React Aria is the only stable single family covering combobox, number field and calendar (r3 §4.1, §6–7): Base UI is 88.3 KB, Ark is mid-major, Radix has gaps and costs 97.4 KB once mixed. Owning the DOM lets us emit the state vocabulary directly and use a class-based visually-hidden element instead of RAC's inline-style one (gap-b B1.2). | Per component: write `_engines/<x>/<c>.tsx`, pass the conformance suite, change the one line in `engine.ts`, ship a patch changeset. Whole family: replace `_engines/react-aria/*`. | Consumer props, parts, classes, `data-*` and `--nz-*` are unchanged. Bundle size changes. Popup DOM placement changes (top layer vs portal), which is documented as non-public. RAC's 36-locale strings and `@internationalized/date` move with the family. |
| **D3** | Package topology, naming, distribution | **Five npm packages:** `@nizivo/tokens` (framework-neutral CSS/JSON/JS), `@nizivo/react` (all core components + static CSS + layout/shell/forms/table + ≤ 1 KB motion hooks + `unstable/*` lane), `@nizivo/icons`, `@nizivo/charts` (v0.2), `@nizivo/lab` (0.x, v0.3). **Import becomes `@nizivo/react`, not `@nizivo/ui`.** Domain kits (dashboard compositions, commerce, Instagram storefront, a TanStack data-table block) are **shadcn-compatible registry items** served from the docs site at immutable `/r/v{x.y.z}/` URLs. They import `@nizivo/react`. There are no `motion`, `dates`, `commerce`, `social`, `dashboard`, `blocks` or `themes` packages. Distribution is hybrid: npm for anything with behaviour or a contract; the registry for consumer-owned compositions. | Each npm package needs its own trusted-publisher entry with 2FA, and there is no scope-wide OIDC (r4 §6.1, C12). The registry has no update merge, so only thin compositions belong there (r8 E1–E7; 05 found commerce items are thin). AppShell/Sidebar is behaviour-heavy, so it stays in core (C12, 06 §6.2). Framework-neutral tokens leave room for non-React ports (r8, C1). Motion hooks are 0.48/0.50 KB (r6), too small for a package. Dates ride on the engine (gap-a §4.7). | Split a subpath into its own package: publish it, and leave a re-export shim at the old subpath for one major. Graduate a registry pattern to npm after two minors with no API change and use in two products (r8). | Import paths (codemod); one trusted-publisher setup per new package. |
| **D4** | Styling details | **Plain CSS, one file per component**, compiled by Lightning CSS (nesting, `@custom-media`, minify). Lightning CSS targets equal the D7 floor, so `light-dark()` passes through untouched (S1). **Public hooks** `--nz-<component>-<property>[-<state>]` are read with a fallback and never assigned. **Private values** are `--_nz-<name>`, set only by variant and size rules. **Component tokens are hand-written in component CSS.** A script extracts the hook list into `api/<c>.json` for docs and the semver diff, so CSS stays the single source of truth. **Unstyled** = skip the component's CSS file (granular files, no `@import`s); there is no `unstyled` prop. **Tailwind v4:** `@nizivo/tokens/tailwind.css` (`@theme inline` → `var(--nz-…)`) from a ~20-line Terrazzo plugin, with the recipe `@import "@nizivo/react/styles.css" layer(components)`. | Zero runtime, RSC-safe, and no consumer toolchain (r2 §4). A generated DTCG component tier is a second source of truth (C7). S3: the stock plugin-tailwind inlined primitive references and emitted an empty `@variant dark`; the custom plugin emitted `--color-bg-surface: var(--nz-bg-surface)` and Tailwind 4.3.3 compiled utilities against it. Static CSS is CSP-proof (gap-b B1). | Move hooks into a DTCG component tier (r7 plugin), or author in vanilla-extract/Panda `cssgen`. Either is allowed only if the emitted class/hook/attribute contract is byte-equivalent (CSS-contract diff gate). An `unstyled` prop can be added later (additive). | None for consumers while the contract diff is empty. |
| **D5** | Token pipeline | **Terrazzo 2.8.0** (exact pin) over a **DTCG 2025.10** source plus resolver. Sets: primitives. Modifiers: theme, motion, viewport (brand and density later). **Four small custom plugins:** `light-dark` transform (S3), Tailwind theme (S3), spring → `linear()` (S4 generator), typed JS var refs. Permutations use `only.modifiers` + `exclude: ["color.p.**"]` (S3). **Extractor:** TokensBrücke 3.18 → a `figma/raw/**` PR, human-triggered. **Fallback:** a Figma MCP `use_figma` snapshot run by an engineer (6–8 calls, within the Pro budget), never in CI. **Code-owned tokens:** breakpoints, z/layers, scrim, elevation ring and dark shadow alphas, spring durations, focus halo, ratio presets, a11y overrides. **Drift detection:** CI invariant `normalize(raw) == src/figma-owned`; a contrast matrix over every permutation; a scheduled `GET /v1/files/:key/meta` version check that opens a "sync needed" issue. It runs nightly once the file sits on a Neev-owned paid team, and weekly until then, because REST limits follow the file's plan (§7.5). The webhook relay waits until v0.3. | Terrazzo implements the DTCG resolver; Style Dictionary's resolver support is "not started" (#1590) (r7). The Variables REST API and custom Code Connect are unavailable on Starter/Pro (S-d). S3 verified the permutations, the `light-dark` transform and the Tailwind plugin. | Swap the builder to Style Dictionary 5.6.1 behind the same DTCG source. Golden-file tests on `dist/tokens.css` prove identical output. | Tokens package internals only. |
| **D6** | Theme mechanism | **One `:root` block of `light-dark()` aliases**, re-declared on `:root, [data-nz-brand]`. `color-scheme` is set only by `[data-nz-theme="light|dark|system"]`, on any element and nestable. **`:root` gets no `color-scheme` by default**, so light-only host apps are untouched. OS dark applies only when the app sets `data-nz-theme="system"`. **Motion:** `prefers-reduced-motion` **or** `[data-nz-motion="reduce"]`; there is no `full` and no `off`. **Brand:** `[data-nz-brand]` overrides primitives. **Density:** `[data-nz-density="compact|touch"]`. Toast and Tooltip use an **opposite-scheme scope** (gap-c §2.6). **Dark elevation:** two tonal levels + an 8% ring + ×6 shadows (gap-c §2.3). An optional server-safe `<ThemeScript nonce>` persists a user choice. Colour tokens are never `@property`-registered. | S1 (Chromium 156 and WebKit 27.2): native `light-dark()` resolved dark → light → dark nesting correctly; `color-scheme` unset or `normal` resolved to light even with the OS in dark (this closes r2's UNVERIFIED item); `@property` registration broke nesting. The namespaced attribute avoids `data-theme` clashes (r2, C9). A `full` override is rejected on a11y grounds (C9b); tests emulate reduced motion instead. | Switch the generator to duplicated `[data-nz-theme]` blocks (S3 `scoped-include` output) if the floor must drop below Safari 17.5. | `tokens.css` only. Attribute and token names are unchanged. |
| **D7** | Support floors | **Chrome/Edge ≥ 123, Firefox ≥ 128, Safari/iOS ≥ 17.5** (set by `light-dark()`). Above-floor features are enhancements with small fallbacks:<br>• CSS anchor positioning (Chrome 125, Firefox 147, Safari 26) → lazy `@floating-ui/dom` (6.3 KB) only where unsupported<br>• `popover="auto"` light dismiss (iOS 18.3) → outside-pointerdown fallback<br>• invoker commands (Safari 26.2) → zero-JS opening where present, click handler elsewhere<br>• `scrollbar-gutter` (Safari 18.2) is ignored below that version (macOS overlay scrollbars do not shift)<br>• `field-sizing` (Safari 26.2) falls back to `rows`<br>Not relied on: `closedby`, `overlay`, `popover="hint"`, customizable select.<br>React peer `^19.2.0`; lab `^19.3.0`; Node ≥ 22.12 for tooling. | WF rows: light-dark 17.5; popover iOS 18.3; anchor positioning not Baseline; scrollbar-gutter 18.2; invoker commands 26.2; starting-style 17.5. S1: lowering for 16.4 breaks nested themes, so 16.4 would need duplicated blocks. | Raising a floor deletes fallbacks (minor). Lowering below 17.5 = the D6 reversal plus a fallback review. | Support statement; fallback code only. |
| **D8** | Overlay and layering | **Top layer for everything Nizivo owns.** Dialog/AlertDialog/Drawer/Sheet use `showModal()`, Popover uses `popover="auto"`, Tooltip and Toast use `popover="manual"`. All render **in place**: SSR-able, no portal. **Engine popups** (Menu, Select list, Combobox, Calendar) portal into the **nearest open top-layer ancestor** of their trigger (`dialog:modal`, `dialog[open]`, `:popover-open`), else `body`, at `--nz-z-overlay`. **The Toast region follows the topmost open modal**: a module-level modal stack for Nizivo dialogs and a MutationObserver for consumer `<dialog>`s, re-portalled through React. **z tokens:** raised 1, sticky 100, chrome 200, overlay 1000, toast 1100 (fallback only). **Scrim:** `--nz-bg-scrim` (light n900 @ 32%, dark #000 @ 60%). **Scroll lock:** zero-JS `:root:has(.nz-dialog-popup:modal)`; engine modal popovers keep their own counter. **Exit:** intercept `cancel`, set `data-exiting`, await finite animations, then `close()`. **Light dismiss:** backdrop pointer handler. **Focus return:** explicit restore to the trigger. **Activity:** `close()` in a layout-effect cleanup. | r1 D9 (top layer first, SSR in place). gap-c §1.2/§1.4: fixed per-type z scales are retired, nesting is ordered by DOM, and toasts need the outlet rule. D-spike (Chromium 156, WebKit 27.2): `cancel` was cancelable and the exit transition finished before `close()`; an in-dialog manual popover was hittable and focusable while a body-level one was blocked (whatwg #9936 confirmed); `:root:has(dialog:modal)` matched and applied `overflow:hidden`; WebKit left focus on `body` after a mouse-opened dialog closed, so focus return must be explicit. | Point the Dialog/Popover/Tooltip `engine.ts` lines at the break-glass RAC adapters. That reverts to gap-c's portal + z-band hybrid. | Popup DOM placement (non-public). Pre-hydration opening through invoker commands is lost. z tokens and parts are unchanged. |
| **D9** | Residual configuration | **No provider required.** Server-safe components take an explicit `locale` (default `'en-US'`), a `timeZone` (required wherever "today" or relative dates appear) and `labels`. An optional client `<NizivoConfig locale labels portalContainer>` is read only by client leaves and engine adapters. Every engine root wraps `I18nProvider` with the resolved locale. There is no `direction` key: CSS follows `dir`, and own code reads `getComputedStyle(el).direction` when an event fires. Links and images go through `render` and element slots. | Settled 8. gap-b A3: without `I18nProvider`, RAC renders `en-US` during SSR and switches to the browser locale after hydration. r1 D10: Astro islands are separate roots. | Adding config keys is additive. | None. |
| **D10** | Responsive and layout | **Components respond to their container** (`@container` on parts; for example `DataView` swaps Table↔List at 40rem). Only shell and page tokens use viewport media, through build-time `@custom-media --nz-sm (width >= 40rem)` (the designer's 640, settled 11) and `--nz-lg (width >= 80rem)` (1280, **provisional, design to confirm**). There is no `md` until design supplies one. **Layout primitives are server-safe and emit no `style` attribute:** `Stack`, `Inline`, `Grid`/`GridItem` (spans as `data-span`, `data-span-sm`, `data-span-lg`), `Container`, `Split`, `AppShell` (CSS grid areas). **Sidebar widths** read `--nz-layout-sidebar` (Figma tokens 264/72 today); the 248/76 frame widths go to design and arrive through token sync. **Navigation** is a serializable `items` array prop shared by Sidebar, MobileTabBar and CommandMenu. Sidebar collapse is a 0.5 KB leaf plus a cookie. | C11: only 640 is designer-backed. Container queries are Widely Baseline (WF). 08 shows content swaps, not only reflow. gap-a §3.8: render-both plus a container query is the only SSR-deterministic swap. gap-b B1: no `style` attributes in server-safe components. | Thresholds are tokens (patch). A component can move between container and viewport queries in CSS only. | CSS only. |
| **D11** | Chart internals | **`@nizivo/charts`:** own ~10-line linear/band scales + `d3-shape` + `d3-array`, with geometry computed on the server. Percent-space SVG (`viewBox="0 0 100 100"`, `preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`). **Bars are SVG `<rect>`s with percentage attributes**, not HTML bars. **Labels sit in CSS flex/grid tracks**, so there are no `style` attributes. **Draw-in** uses `clip-path: inset()` keyframes on the series group, which avoids the unverified `pathLength` + non-scaling-stroke combination. **Time axis in v0.2:** evenly spaced series (index x; `Intl.DateTimeFormat` labels with explicit `timeZone`; tick thinning; forced last tick). Irregular timestamps come later. One **0.6 KB client island** (crosshair, tooltip, roving keys, live region) sits in a fail-closed boundary. The data table lives in a `<details>` (zero JS). **`ChartFrame` accepts any renderer child.** | r6 measured own AreaChart 3.2 KB vs 10.4 KB with d3-scale vs 107.7 KB for Recharts, and Recharts 3 SSR emits no SVG. gap-b B1.4: geometry must survive CSP Profile B. 03: the Figma charts are daily/weekly series. | Swap the renderer behind `ChartFrame` (Recharts/ECharts adapters). Internal scales can switch to `d3-scale` within the size budget. | Charts package only. |
| **D12** | Motion | **One generator** in the token build: a closed-form damped oscillator that settles when \|x − 1\| < 0.1%, with adaptive point placement at max error ≤ 0.004. Output: `spring` = 493 ms, 19 points, 224 B; `spring-soft` = 702 ms, 18 points, 211 B. **A spring easing is used only with its own duration token** (`--nz-duration-spring`, `--nz-duration-spring-soft`), and only on `transform`/`opacity`. **Reduced motion** is a token swap (Figma Reduced mode: linear easing, short durations, zero distances); loops stop and count-up is 0. Enter uses `@starting-style` + `allow-discrete`; exits of native overlays are JS-sequenced. **≤ 1 KB hooks** live in `@nizivo/react/motion` (CountUp, usePointerFx, Reveal). No Motion-library adapter ships. The lab holds GPU effects only. | S4: all 12 strings are valid in Chromium 156 and WebKit 27.2. Motion 14 gives 600/750 ms from a different rest threshold (C10, S9). r6: CSS-first; `motion.div` is 44.2 KB, and its SSR `opacity:0` pitfall is verified. 01 motion principles. | Changing the threshold or generator re-emits tokens (minor, visual). A Motion adapter can be added later as a subpath with an optional peer. | Animation timing only. |
| **D13** | Icons and media | **`@nizivo/icons`** is generated from pinned `lucide-static` 1.56.0: the whole set, one ESM module per icon, server-safe, `sideEffects:false`. The stroke renders 1.6 px **at every size** via CSS `stroke-width: calc(1.6 * 24 / var(--_nz-icon-size))`, with an attribute fallback of `1.92` (correct at 20 px). `createIcon` covers custom glyphs. `@nizivo/icons/brands/*` comes from Simple Icons (CC0) with usage notes: Instagram only for connect/follow links. **Core imports no icon package** and inlines at most 10 listed glyphs. **`Image`** is a server-safe `<img>` with required `width`/`height` and `data-ratio` presets (no inline style); `priority` maps to `fetchpriority="high"` plus eager loading; `render` covers `next/image`/unpic. No font files ship. | Settled 7 and critique S1 (stroke rule). r6: lucide-react 10 icons = 2.6 KB; slots keep core decoupled. gap-b B1: no `style` attributes. Settled 15. | Regenerate from another icon set with an alias map. | Icon names (alias map). |
| **D14** | Toolchain and governance | pnpm 12.11.2 exact (11.28 fallback) with catalogs; Turborepo. tsdown 0.23.1 with unbundle (exact pin) + Lightning CSS. **TS 7.0.2 only** (oxc d.ts via `isolatedDeclarations`; ts-morph bundles TS 6 for the API manifest), so **no `typescript6` alias** is needed while there is no ESLint. **oxlint** (type-aware, jsx-a11y, react, hooks rules) is the single linter; React Compiler rules wait for the compiler itself. Vitest 5 browser mode + axe 4.14 pinned. **VR:** Vitest `toMatchScreenshot` in a pinned Linux image until v0.3, then Argos Pro. Changesets 3 + OIDC with split jobs. Fixed version group `[tokens, react, icons, charts]`; `lab` independent at 0.x. **Licence: recommend Apache-2.0** (this is the user's decision). | r4: tsdown verified, oxlint on TS 7, OIDC split jobs. r5: axe version skew, Argos cost, Apache rationale. C19–C22. The core is mostly server components plus small leaves, so compiler-rule enforcement buys little today. | Add ESLint + the `@typescript/typescript6` alias for compiler rules. Switch VR vendor (Storybook modes are vendor-neutral). | Repo tooling only. |
| **D15** | Accessibility remediation | **Figma first, plus a time-boxed override file in the token source** (`code-owned/a11y/*.overrides.tokens.json`, applied last). Each entry records the Figma value, the WCAG SC, an issue link and an expiry date. CI fails on expiry, drift and redundancy; a public "Deviations from Figma" page lists live overrides; stable releases are blocked on any AA failure. **Values (gap-c §3.2):**<br>• Option A text ladder: light 900/700/600, dark 50/300/400<br>• `border/control`: neutral/450 light, n500 dark<br>• dark `text/critical` and `icon/critical` = red/400; `text/info` and `icon/info` = blue/400<br>• `bg/critical` = red/600 in both modes, plus `text/on-critical`, `text/accent`, `bg/critical-hover`, `bg/scrim`<br>**Focus:** 2 px outline plus an optional halo. **Target size:** a coarse-pointer `::after` expansion on both axes (gap-c §3.6). **No 12 px style**; lint `minSizePx: 14`. | gap-c §3: every pair recomputed and passing. Critique G19, S2, S3, S5. | Delete override entries as Figma fixes land; the CI redundancy check forces it. | Colour values only. |
| **G11** | Forms | **gap-a D16, adopted with lean defaults.** `Field` is server-safe (sync, uses `useId`). `FieldScope` (`'use client'`, ~0.5 KB) renders the error slot. Controls are ~0.3 KB client leaves that render complete SSR HTML. **Zero-JS mode** (function child) is documented first, for Server-Component forms. Native constraint validation stays on, with messages on submit by default. One error channel: `error` > `Form.errors[name]` > native message. No form-library dependency; recipes for RHF, TanStack Form and Conform. `SubmitButton` reads `useFormStatus`. | gap-a §2 (jsdom `invalid` test; `react-server` exports `useId`); C27, S6 | Field is engine-free; switching to an engine Field is a seam change. | Field and controls only. |
| **G12** | Data table | **gap-a D17.** Native `<table>` server parts (0 KB). One form-based selection island + `BulkActionBar` (≤ 2 KB target). URL-driven sort, filter and pagination via `render={<Link/>}`. `DataView` swaps Table↔List with a container query. TanStack Table v9 and TanStack Virtual appear only in registry blocks. | gap-a §3: RAC Table is `role=grid` and +29.0 KB; TanStack's 12.9–17.0 KB stays in the app. | Swap the registry block; core parts are unchanged. | None to core. |
| **G13** | Dates and time | **gap-a D18 on the hooks family.** Public values are ISO plain-date strings. `@internationalized/date` is an explicit dependency of the date entry. RAC `RangeCalendar` sits inside the adapter and is **lazy-loaded on trigger intent** (≤ 24 KB incremental chunk); the trigger is eager (≤ 1.5 KB). Explicit `timeZone`/`locale`. Ships at `@nizivo/react/unstable/date-range-picker` in v0.3. | gap-a §4: Temporal is not in Safari; the polyfill is 19.3 KB; the Calendar module is +21.4 KB. | Swapping internals to Temporal is a patch, because the public type is the string. | Date entry only. |
| **G14** | i18n and RTL | **gap-b Part A.** A serializable `labels` prop plus plain-object catalogs at `@nizivo/react/locales/<tag>`; a 0.2 KB `formatLabel` using `Intl.PluralRules`. Explicit `locale`. Logical properties plus `:dir()`. A curated mirror subset in icons (`data-mirror`). Chart axes do not mirror by default. A 10-locale test matrix, with ar-EG in VR. | gap-b A1–A9 (FormatJS at 9.65 KB rejected). | Additive. | None. |
| **G15** | Overlay conformance | **gap-c §1.10 O-01…O-25, plus four native-specific tests:**<br>• N-01 Esc/`cancel` exit sequencing, including 0 ms reduced motion and an infinite spinner inside the dialog<br>• N-02 toast outlet inside a native modal<br>• N-03 iOS scroll lock with `:has(dialog:modal)`<br>• N-04 focus return after mouse activation in WebKit<br>Every adapter, own and break-glass, runs the same suite on Chromium, Firefox and WebKit, under React 19.2 and 19.3. | D-spike; gap-c | n/a | n/a |
| **G16** | Dark elevation | **gap-c §2.3:** tonal + ring + retuned shadow. Floating surfaces use `bg/surface-raised`; dark `bg/subtle` becomes n925; the dark border ladder moves one step lighter; the inner-highlight token is transparent. | gap-c §2 | Token values | Tokens only |
| **G17** | Security and supply chain | **gap-b Part B.**<br>• CSP Profile A (default, `style-src-attr 'unsafe-inline'`) and Profile B (`style-src-attr 'none'`) are both tested in CI. **T0 components and own overlays are guaranteed under Profile B**: a lint bans the `style` JSX attribute in directive-free modules; own leaves write CSSOM only; the own hidden native `<select>` uses a class. T1 parts are guaranteed under Profile A. A `<meta property="csp-nonce">` recipe covers react-aria's injected `<style>`.<br>• No DOM-XSS sinks except the server-only ThemeScript; a Trusted Types fixture.<br>• CycloneDX SBOM + `actions/attest@v4`.<br>• Runtime dependency budget; a registry item-policy linter and SHA-256 manifest.<br>• No Figma raster ships without an `ASSETS.md` provenance entry. | gap-b B1–B7 (CSP matrix in Chromium 156 and WebKit 27.2) | n/a | n/a |
| **G18** | Hotkeys and command menu | **gap-a D19.** An own module-level registry on tinykeys 4.0.1 (1.0 KB). `CommandMenu` uses RAC Autocomplete + SearchField + Menu **inside our native Dialog**, as a lazy chunk (≤ 7.5 KB incremental over Menu). cmdk is rejected: stale, and it bundles Radix Dialog. `Kbd` renders both platforms' glyphs and CSS picks one. | gap-a §5 | Adapter swap | None |
| **G19** | Accessibility ownership | **D15 RACI.** The design-system designer is accountable for values. The a11y owner is responsible for the contrast matrix. CODEOWNERS on `code-owned/a11y/**` requires both. | gap-c §3.4 | — | — |
| **G20** | Loading, empty and error | **gap-b Part C.** `status: 'ready' \| 'loading' \| 'empty' \| 'error'` + `pending` + `empty`/`error` slots on every data-display component. The Suspense fallback **is** the same component with `status="loading"`. The library never fetches or suspends. `status` is reserved for this lifecycle; domain states use `availability`, `paymentStatus` and so on. Button `loading` is renamed `pending`. `InlineError` is added. Islands fail closed. | gap-b C1–C5 | Additive | None |

---

## 3. Layer architecture

```
            consumer app: Next 16 RSC · Vite SPA/SSR · Astro 7 · React Router 8 · TanStack Start
                 │ JS imports (per-subpath)                         │ CSS: one <link>/@import
 ┌───────────────▼───────────────────────────────┐   ┌──────────────▼────────────────────────┐
 │ L5 Distribution                                │   │ Registry (docs site) /r/v{x.y.z}/*.json│
 │ npm: @nizivo/tokens · react · icons · charts · │   │ dashboard · commerce · storefront ·    │
 │ lab  (explicit exports map, semver, OIDC)      │   │ data-table (TanStack) · re-skin CSS    │
 └───────────────┬───────────────────────────────┘   └──────────────┬────────────────────────┘
                 │                                      imports @nizivo/react (never the engine)
 ┌───────────────▼────────────────────────────────────────────────────────────────────────────┐
 │ L4 Heavy modules: @nizivo/charts (d3-shape/d3-array) · @nizivo/lab (WebGL2) · @nizivo/icons  │
 │    contract: element slots in, tokens + nz-* classes out; core never imports them            │
 ├────────────────────────────────────────────────────────────────────────────────────────────┤
 │ L3 Components (@nizivo/react): props · parts (namespace + flat) · render · (value, details) │
 │  ┌───────────────────────┬────────────────────────────┬──────────────────────────────────┐ │
 │  │ T0 server-safe        │ T2 own leaves              │ T1 engine adapters               │ │
 │  │ no directive, 0 KB    │ 'use client', platform API │ 'use client', react-aria hooks   │ │
 │  │ Button Card KpiTile   │ Dialog Popover Tooltip     │ Menu Select Tabs Combobox        │ │
 │  │ Table NativeSelect …  │ Toast Field controls …     │ NumberField Calendar …           │ │
 │  └───────────────────────┴─────────────┬──────────────┴─────────────────┬────────────────┘ │
 │        seam ①: <c>.contract.ts  +  engine.ts (one line)  +  conformance suite (per adapter)  │
 ├────────────────────────────────────────────────────────────────────────────────────────────┤
 │ L2 Styling: static CSS files in @layer nz.*                                                 │
 │    seam ②: .nz-<c>[-<part>] · data-slot · data-variant/size/tone · state vocabulary ·        │
 │            --nz-<c>-* hooks (read-only) · --_nz-* private                                    │
 ├────────────────────────────────────────────────────────────────────────────────────────────┤
 │ L1 Tokens & themes (@nizivo/tokens): tokens.css · tokens.json · tokens.js · tailwind.css    │
 │    seam ③: --nz-{bg,text,border,icon,chart,space,radius,size,duration,easing,…}-* names ·    │
 │            data-nz-{theme,motion,brand,density} scopes · --nz-p-* private                    │
 ├────────────────────────────────────────────────────────────────────────────────────────────┤
 │ L0 Token source: DTCG 2025.10 (figma-owned + code-owned) + resolver → Terrazzo 2.8          │
 │    seam ④: DTCG files + nizivo.resolver.json (tool-neutral)                                  │
 └──────────────────────────────▲─────────────────────────────────────────────────────────────┘
          Figma "Grove" ─TokensBrücke (or use_figma snapshot)→ figma/raw/** ─normalize→ src/figma-owned/**
```

### 3.1 Contract at each seam

| Seam | Public contract (semver'd) | Explicitly **not** public |
|---|---|---|
| ① Component | Props and `details` objects; part names (`Select.Root` = `SelectRoot`); the `render` prop (element or `(props, state)`); `labels` keys; `data-slot` values; documented events | Engine types (never in `.d.ts`); DOM nesting beyond documented parts; whether a popup is in the top layer or a portal; internal context |
| ② Styling | Class names; `data-slot`; variant attribute names and values; the state vocabulary (§6.2); `--nz-<component>-*` hook names; layer names and order; CSS file paths | `--_nz-*` private variables; selector specificity; rule order inside a layer |
| ③ Tokens | Semantic token names (`--nz-bg-*`, `--nz-text-*`, `--nz-border-*`, `--nz-icon-*`, `--nz-chart-*`, `--nz-space-*`, `--nz-radius-*`, `--nz-size-*`, `--nz-duration-*`, `--nz-easing-*`, `--nz-distance-*`, `--nz-scale-*`, `--nz-z-*`, `--nz-elevation-*`); scope attributes (`data-nz-*`); `tokens.json` paths | `--nz-p-*` primitives; how a theme is computed (`light-dark()` vs blocks) |
| ④ Source | DTCG files + resolver; `component-map.json` keyed by both Figma IDs (C25) | The build tool (Terrazzo today) |

### 3.2 How to swap each layer

**Tokens and theme (L1).**
- **Rebrand without forking:** ship `brand-x.css` that redefines `--nz-p-*` inside `[data-nz-brand="x"]`. Aliases re-resolve because they are re-declared on `[data-nz-brand]`.
- **Replace the whole token set:** drop `@nizivo/tokens/tokens.css` and supply any stylesheet that defines the public semantic names. Components read only `--nz-*` semantic names, and CI lints component CSS against `tokens.json` so no primitive leaks.
- **Swap the builder:** point Style Dictionary at the same DTCG source; the golden-file test on `dist/` must stay byte-identical.

**Styling (L2).**
- Per component: stop importing `css/<c>.css` and write your own rules against `.nz-<c>` and `data-*` (r8 "L3 re-skin"). No JS changes.
- Whole library: drop `styles.css`. Components still emit classes and attributes; nothing in JS depends on CSS (published JS never imports CSS, settled 9).
- Library-side authoring swap (to vanilla-extract or Panda `cssgen`): allowed only when the CSS-contract diff (class list, hook list, attribute selectors, layer statement) is empty.

**Behaviour engine (L3, seam ①).**
1. Write `_engines/<engine>/<component>.tsx` against `<component>.contract.ts`.
2. Run `tooling/testkit` conformance for that component with the engine alias: keyboard and focus scripts, axe `wcag22aa`, data-attribute and CSS-variable assertions, `render` merging, SSR string + hydration with zero warnings, RSC import, nesting O-tests, CSP Profile A/B.
3. Compare `size-limit` output in the PR.
4. Change the one line in `src/<component>/engine.ts`.
5. Release as a patch with a changeset ("engine changed; no API change").

The break-glass RAC adapters for Dialog and Tooltip are already written and green, so step 1 is done for the riskiest native components.

**A single component (L3).**
- Compose with `render` (element or function) on any part.
- Replace it in your app: you can render the documented markup yourself with `nz-*` classes and the CSS still applies (T0 components are pure markup contracts).
- Fork through the registry ("L4 fork" item, labelled "no updates").

**Heavy modules (L4).**
- Charts: `ChartFrame` accepts any renderer as a child (Recharts, ECharts SSR, visx), so the frame, caption, data table and states stay Nizivo's while the drawing is swapped. `KpiTile chart={…}` is an element slot, so core never depends on charts.
- Icons: every icon prop is a `ReactNode`, so any set plugs in. `@nizivo/icons` is optional.
- Lab: opt-in only; core and charts never import it.

**Distribution channel (L5).**
- npm → registry: the registry item for a component (r8 "fork") copies source that imports only `@nizivo/react/_contracts` helpers, which are public at `@nizivo/react/contracts`.
- Registry → npm (graduation): publish the pattern as a subpath of `@nizivo/react` and keep the registry item as a thin re-export for one minor.
- A private mirror: registry URLs are static JSON with SHA-256 manifests, so a company can host its own copy.

---

## 4. Package map

All packages are **ESM-only** (`"type": "module"`, fully specified `.js` specifiers, no top-level await), built with tsdown unbundle. Published JS never imports CSS, and each package declares `"sideEffects": ["**/*.css"]` (settled 9).

Budgets are **gzip, React external**, using the r3/M-lean method. "Measured" numbers come from r3, r6, gap-a or M-lean. "Target" numbers are UNVERIFIED until the first build, then become hard `size-limit` entries.

| Package | Purpose | Public exports (explicit map, no `./*` wildcard; C2) | Dependencies / peers | Budget (gz) | Version group |
|---|---|---|---|---|---|
| **`@nizivo/tokens`** | Framework-neutral design tokens: CSS variables, theme scopes, motion, responsive, Tailwind adapter | `./tokens.css`, `./tokens.json` (resolved DTCG), `./tokens.js` (+ `.d.ts`: typed `var()` refs, breakpoints, spring physics), `./tailwind.css`, `./custom-media.css`, `./package.json` | none | `tokens.css` ≤ 5 KB (target; ~200 declarations) | fixed |
| **`@nizivo/react`** | All core components: T0, T2 own leaves, T1 engine adapters, layout/shell, forms, table, Progress, motion micro-hooks, i18n catalogs, `unstable` lane, static CSS | `.` (directive-free barrel); one subpath per component (`./button`, `./card`, `./dialog`, `./menu`, `./select`, `./native-select`, `./field`, `./table`, `./data-view`, `./app-shell`, …, listed explicitly and drift-checked, r4); `./motion`; `./i18n`; `./locales/<tag>` (explicit list); `./config`; `./theme-script`; `./contracts` (render/mergeProps for registry forks); `./unstable/<name>` (explicit); `./styles.css`; `./css/<component>.css`; `./reset.css`; `./package.json` | deps (caret): `react-aria`, `react-stately` (imported only by `_engines/react-aria/*`), `@internationalized/date` (date entries only), `tinykeys` (hotkeys only), `@floating-ui/dom` (dynamic `import()` only where anchor positioning is missing). Peers: `react`, `react-dom` `^19.2.0`. `sideEffects: ["**/*.css"]` | **T0 pages: 0 B client JS** (CI assertion on the Next fixture); own leaves: input/checkbox/radio/switch ≤ 1 KB each, Field+Form ≤ 2.5 KB (gap-a), Dialog family ≤ 3 KB, Tooltip ≤ 2 KB, Popover ≤ 2 KB, Toast (store + region + announcer) ≤ 3.5 KB (targets); engine: Menu ≤ 42 KB (hooks measured 39.6 + own DOM), Menu+Select+Tabs ≤ 49 KB (measured 45.3 + own DOM); positioning fallback 6.3 KB (measured, lazy); `styles.css` ≤ 22 KB, `css/<c>.css` typically ≤ 1.5 KB (targets) | fixed |
| **`@nizivo/icons`** | Generated Lucide icons + brand glyphs | `.` (barrel of named icons), `./<icon-name>` (generated explicit list), `./brands/<name>`, `./create-icon`, `./package.json`; LICENSE carries the Lucide ISC + Feather MIT notices | none at runtime (`lucide-static` 1.56.0 is a build-time dev dependency). Peer `react ^19.2.0` | ≈ 0.26 KB per icon (lucide-react: 10 icons = 2.6 KB, r6); server-only usage ships 0 B | fixed |
| **`@nizivo/charts`** (v0.2) | Server-first SVG/HTML charts | `./area-chart`, `./bar-chart`, `./donut-chart`, `./sparkline`, `./legend`, `./chart-frame`, `./funnel-chart`, `./heatmap` (v0.3), `./core` (pure scale/layout functions), `./styles.css`, `./css/<chart>.css` | deps: `d3-shape`, `d3-array`. Peers: `react`, `react-dom ^19.2.0`, `@nizivo/react` (same fixed version) | AreaChart ≤ 3.5 KB (3.2 measured, r6); interaction island ≤ 0.7 KB (0.6 measured); server-only charts 0 B client | fixed |
| **`@nizivo/lab`** (v0.3) | Experimental GPU effects with server posters | `./shader-surface`, `./presets/rays`, `./presets/mesh`, `./styles.css` | none. Peers: `react ^19.3.0`, `@nizivo/react` | ShaderSurface ≤ 1.6 KB (1.4 measured, r6); ≤ 2 KB per preset (target) | **independent 0.x** |

**Not published:** `@nizivo/ui`, `@nizivo/motion`, `@nizivo/dates`, `@nizivo/dashboard`, `@nizivo/commerce`, `@nizivo/social`, `@nizivo/blocks`, `@nizivo/themes`. `@nizivo/codemod` comes before 1.0, when the first deprecation lands.

**Typical-page arithmetic.** Overview dashboard: KPI tiles, charts, a table with selection, row menus, icon-button tooltips, a toast and a confirm dialog. Estimated client JS: Menu engine (≤ 42 KB) + own leaves (Tooltip, Toast, Dialog, table selection ≈ 10 KB) + charts island (0.6 KB). That is ≈ 53 KB, **estimated**, against RAC components for the same overlay set (69.0 KB measured). With intent-loaded engine surfaces (v0.2), the initial cost drops to ≈ 11 KB, and the menu chunk loads on pointer-enter or focus of a trigger.

---

## 5. Repo layout

```
nizivo/                                   # GitHub: <neev-org>/nizivo (Apache-2.0 recommended)
├─ package.json                           # devEngines.packageManager pnpm@12.11.2, scripts only
├─ pnpm-workspace.yaml                    # catalogs; minimumReleaseAge 4320; allowBuilds {}
├─ turbo.json
├─ .changeset/config.json                 # fixed: [tokens, react, icons, charts]; lab independent
├─ .github/workflows/                     # ci.yml · release.yml (split jobs, id-token only on publish) · nightly.yml
├─ design/
│  ├─ component-map.json                  # Figma set → export; keyed by BOTH 7275:* and live/ghost ids (C25)
│  ├─ design-backlog.md                   # consolidated G9 states, ghost relinking, token asks
│  └─ ASSETS.md                           # provenance ledger; CI blocks unlisted binaries (gap-b B5.2)
├─ packages/
│  ├─ tokens/                             # @nizivo/tokens
│  │  ├─ figma/raw/**                     # TokensBrücke export (bot PR), never edited by hand
│  │  ├─ src/figma-owned/**               # normalizer output, DTCG 2025.10 (CI: normalize(raw) === this)
│  │  ├─ src/code-owned/
│  │  │  ├─ breakpoints.tokens.json       # sm 40rem (designer 640), lg 80rem (provisional)
│  │  │  ├─ layers.tokens.json            # z-raised/sticky/chrome/overlay/toast, bg/scrim
│  │  │  ├─ elevation.tokens.json         # ring, dark shadow alphas, focus halo
│  │  │  ├─ motion-derived.tokens.json    # duration/spring, duration/spring-soft (+ reduced)
│  │  │  ├─ media.tokens.json             # ratio presets for Image data-ratio
│  │  │  └─ a11y/{primitives,light,dark}.overrides.tokens.json   # expiring, applied last
│  │  ├─ nizivo.resolver.json
│  │  ├─ terrazzo.config.mjs
│  │  ├─ plugins/{light-dark,tailwind-theme,spring-linear,js-refs}.mjs
│  │  ├─ contrast-pairs.json              # every fg/bg pair components use (gap-c §3.4)
│  │  └─ dist/                            # tokens.css · tokens.json · tokens.js/.d.ts · tailwind.css · custom-media.css
│  ├─ react/                              # @nizivo/react
│  │  ├─ src/
│  │  │  ├─ _contracts/                   # render.ts, merge-props.ts, state.ts (vocabulary), layers.ts
│  │  │  │                                #   (portal container resolution, modal stack), labels.ts, format.ts
│  │  │  ├─ _engines/
│  │  │  │  ├─ native/                    # 'use client' own adapters: dialog.tsx popover.tsx tooltip.tsx toast.tsx …
│  │  │  │  ├─ react-aria/                # 'use client' hooks adapters: menu.tsx select.tsx tabs.tsx locale.tsx …
│  │  │  │  ├─ react-aria-components/     # break-glass + RAC-only adapters: dialog.tsx tooltip.tsx range-calendar.tsx
│  │  │  │  └─ current/attrs.ts           # string constants of the active family (e.g. top-layer exemption attr); no engine import
│  │  │  ├─ button/                       # button.tsx (server-safe) · button.css · button.example.tsx · button.test.tsx
│  │  │  ├─ select/                       # select.contract.ts · engine.ts · select.parts.ts · index.ts · select.css
│  │  │  ├─ dialog/                       # dialog.contract.ts · engine.ts · dialog.parts.ts · index.ts · dialog.css
│  │  │  ├─ card/                         # card.tsx · card.parts.ts · index.ts · card.css (all server-safe)
│  │  │  ├─ …                             # one folder per component; *.stories.tsx live in apps/workshop
│  │  │  ├─ locales/                      # de-DE.ts, fr-FR.ts, ar-EG.ts … (plain objects)
│  │  │  └─ unstable/                     # date-range-picker/, hotspot/, carousel/ (no semver)
│  │  ├─ css/                             # base.css (focus, hit-target, visually-hidden, scroll lock) · reset.css
│  │  ├─ api/                             # generated: props + hooks + slots manifest per component (ts-morph + CSS scan)
│  │  └─ tsdown.config.ts                 # from tooling/tsdown-preset
│  ├─ icons/                              # generator (svgo 4 + template) → dist/<icon>.js
│  ├─ charts/                             # src/core (scales, layout) · src/<chart> · src/interaction (island)
│  └─ lab/                                # 0.x
├─ tooling/                               # private workspace packages
│  ├─ tsdown-preset/  lightningcss-build/  use-client-guard/  exports-drift/
│  ├─ testkit/                            # conformance suites per component (engine-agnostic) + O-/N- overlay tests
│  ├─ contrast-check/  a11y-overrides-check/  css-contract-diff/  registry-lint/
│  └─ size/                               # size-limit config generated from api/*.json
├─ apps/
│  ├─ docs/                               # Fumadocs 16 on Next 16; renders *.example.tsx; hosts /r/v{x.y.z}/
│  └─ workshop/                           # Storybook 10 (react-vite), internal; Vitest addon + a11y addon
├─ registry/                              # registry item sources (patterns, re-skins, data-table block) → built into apps/docs
├─ fixtures/                              # packed-tarball installs: next-app-router, vite-spa, vite-ssr, astro, react-router-8, tanstack-start
└─ rfcs/
```

---

## 6. Conventions with code sketches

Token-name placeholders: `--nz-font-label-m`, `--nz-font-label-l` and `--nz-font-body-m` are **placeholders**. Typography sub-variable naming waits for the Terrazzo dry run (critique S-b 1). Every other `--nz-*` name below maps to an existing Figma variable (00) or to a code-owned token defined in §7.4. New semantic colours proposed by gap-c (`--nz-text-on-critical`, `--nz-bg-critical-hover`, `--nz-text-accent`, `--nz-icon-info`, `--nz-border-control`, `--nz-bg-scrim`) ship through the expiring override file (D15) until Figma adds them. `--nz-bg-accent-hover` is a **design request** (02 token additions); until it lands, Accent hover falls back to the resting colour.

### 6.1 The canonical layer statement (semver'd public API)

```css
@layer nz.tokens, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
```

Every shipped CSS file starts with this exact line. Repeating it is idempotent, so bundler chunk order cannot change precedence (r2 §4.2).

| Layer | Contents | Shipped content |
|---|---|---|
| `nz.tokens` | custom properties, `color-scheme` scopes, motion/density/brand scopes | `@nizivo/tokens/tokens.css` |
| `nz.reset` | opt-in element reset; components never depend on it | empty unless `reset.css` is imported |
| `nz.base` | `.nz-focus-ring`, `.nz-visually-hidden`, `.nz-hit-target`, modal scroll lock, shared keyframes | `css/base.css` |
| `nz.components` | one block per component, including charts and lab | `css/<c>.css`, `styles.css` |
| `nz.patterns` | **reserved** for registry patterns and consumer re-skins, so they beat components without `!important` (r8 §8.1) | empty in npm packages |
| `nz.utilities` | `.nz-truncate`, `.nz-tabular-nums` | `css/base.css` |

Unlayered consumer CSS always wins. With Tailwind v4: `@import "tailwindcss"; @import "@nizivo/react/styles.css" layer(components); @import "@nizivo/tokens/tailwind.css";`. The whole `nz.*` stack then sits above preflight and below utilities (r2 §4.5).

### 6.2 The one state vocabulary (engine-independent, adapter-emitted)

**Rule 1: native and ARIA first.** Where the platform or ARIA already carries the state for semantics, CSS selects that directly and no duplicate `data-*` is emitted:

`:disabled` · `:checked` · `:indeterminate` · `:focus-visible` · `:user-invalid` · `:placeholder-shown` · `[open]` · `:popover-open` · `:modal` · `[aria-expanded]` · `[aria-current]` · `[aria-pressed]` · `[aria-selected]` (listbox/tabs only) · `[aria-sort]`

**Rule 2: `data-*` only when** no native or ARIA carrier exists, or the state must appear on a different element (a trigger, a positioner). All are presence attributes unless a value set is listed.

| Group | Attribute | Values | Set on | Meaning |
|---|---|---|---|---|
| Overlay | `data-open` | presence | trigger, popup, backdrop | Disclosure is open |
| | `data-entering` / `data-exiting` | presence | popup, backdrop | Enter/exit animation running (exit is held until animations finish) |
| | `data-side` | `top\|right\|bottom\|left` | popup | Resolved placement after collision |
| | `data-align` | `start\|center\|end` | popup | Resolved alignment |
| | `data-nested-open` | presence | parent popup | A child overlay is open |
| | `data-placement` | `center\|start\|end\|top\|bottom` | dialog/drawer popup | Requested sheet side (logical; gap-b) |
| Collection | `data-highlighted` | presence | option, menu item, command row | Virtual focus (active descendant) |
| | `data-selected` | presence | option, table row, tab, segment, day cell | Selected (rows: never `aria-selected` in a `table`, gap-a §3.3) |
| | `data-checked` / `data-indeterminate` | presence | menu checkbox/radio items, custom checkables | Checked state where no native input exists |
| | `data-pressed` | presence | engine-driven pressables | Pointer/keyboard press in progress |
| | `data-disabled` | presence | non-form parts (menu item, tab) | Disabled where `:disabled` is unavailable |
| | `data-placeholder` | presence | select value | No value chosen |
| Field | `data-invalid` | presence | field, control | An error message is **presented** (gap-a §2.3) |
| | `data-required` / `data-readonly` | presence | field, control | Mirrors the attribute |
| | `data-validate-on` | `submit\|blur` | field | When native messages appear |
| Data | `data-loading` / `data-pending` / `data-empty` / `data-error` | presence | data-display root | Lifecycle (gap-b C2.2); `data-pending` also on Button |
| Structure | `data-orientation` | `horizontal\|vertical` | lists, tabs, steps | |
| | `data-collapsed` | presence | sidebar | Rail mode |
| | `data-interactive` | presence | card, table row | Has a stretched link (hover affordance) |
| | `data-sort` | `ascending\|descending` | `<th>` | Mirrors `aria-sort` for styling |
| | `data-presentation` | `table\|list` | DataView slots | |
| Calendar | `data-today` · `data-outside-month` · `data-unavailable` · `data-range-start` · `data-range-end` · `data-in-range` | presence | day cell | gap-a §4.6 |
| Misc | `data-mirror` | `rtl` | directional glyphs | Mirror under `:dir(rtl)` |
| | `data-platform` | `apple\|other` | Kbd glyph spans | Paired with `:root[data-nz-platform]` |
| | `data-x-direction` | `ltr\|rtl` | chart plot | Resolved axis direction |
| | `data-nz-top-layer` | presence | toast region, live announcer | Exempt from engine inerting. Own overlays (Toast, announcer) have no adapter, so they also set the engine's exemption attribute. They import its **name** from `_engines/current/attrs.ts`, a string constant re-exported from the active family (`data-react-aria-top-layer` today), which adds no engine bytes. A family swap updates it in one place |

**Variant attributes:** `data-variant`, `data-size`, `data-tone`. Any other enumerated presentational prop maps to `data-<prop>` with the same value (`data-elevation`, `data-padding`, `data-gap`, `data-span`, `data-span-sm`, `data-span-lg`, `data-ratio`, `data-emphasis`).

**Ancestor scopes (namespaced, never on components):** `data-nz-theme`, `data-nz-motion`, `data-nz-brand`, `data-nz-density`, `data-nz-platform`, `data-nz-touch-targets`, `data-nz-bottom-bar`.

**CSS variables set by components (read-only for consumers):** `--nz-trigger-width`, `--nz-available-width`, `--nz-available-height`, `--nz-transform-origin` on popups; `--nz-toast-inset` on `<html>`. They are written through CSSOM from client code, which CSP allows (gap-b B1.1).

### 6.3 Class and slot naming

- Root: `.nz-<component>` + `data-slot="<component>"`. Part: `.nz-<component>-<part>` + `data-slot="<component>-<part>"`. Kebab case only; stylelint pattern `^nz(-[a-z0-9]+)+$`; no BEM `__`/`--` (C6).
- Interactive roots also carry `.nz-hit-target` (coarse-pointer expansion, §6.7 CSS). `::after` is reserved for it on interactive roots.
- Consumer `className` is appended **after** ours. Consumer event handlers run **before** ours, and ours skip if `event.defaultPrevented` (r8).
- A part is "documented" when it has a `data-slot`. DOM between documented parts is not API.

### 6.4 Component CSS hooks

```css
/* public hook (read, never assigned by the library) → private fallback → token */
background-color: var(--nz-button-bg, var(--_nz-bg));
```

- **Name:** `--nz-<component>-<property>[-<state>]`, for example `--nz-button-bg`, `--nz-button-bg-hover`, `--nz-button-bg-active`, `--nz-button-fg`, `--nz-button-border-color`, `--nz-button-radius`, `--nz-button-height`, `--nz-button-padding-x`.
- **Per-state hooks** (`-hover`, `-active`) exist only on the most customised components: Button, IconButton, Input, Card and NavItem (r2 open question; additive later).
- **Private values** are `--_nz-<name>`. They are written only by variant and size rules, so a variant never overrides a consumer hook.
- **Overrides work at any level:** global (`:root { --nz-button-radius: 999px }`), per subtree, or per instance (`style={{'--nz-button-bg': 'hotpink'}}` from the consumer's own code).
- **Hooks are extracted** from CSS into `api/<c>.json`. A removed hook fails the semver check unless the changeset is major.

### 6.5 File and directive convention (fixed by spike S2)

```
src/select/
  select.contract.ts   # public types only                        — no directive
  engine.ts            # THE swap line: export * from '../_engines/react-aria/select'   — no directive
  select.parts.ts      # short names for the namespace             — no directive (S2: MUST be directive-free)
  index.ts             # flat names + `export * as Select`         — no directive
  select.css
src/_engines/react-aria/select.tsx                                 — 'use client' (only engine import site)
```

```ts
// src/select/select.parts.ts — directive-free; the namespace object is built on the SERVER side of the boundary
export {
  SelectRoot as Root, SelectTrigger as Trigger, SelectValue as Value, SelectPopup as Popup,
  SelectList as List, SelectItem as Item, SelectGroup as Group, SelectSeparator as Separator,
} from './engine';

// src/select/index.ts — directive-free
export { SelectRoot, SelectTrigger, SelectValue, SelectPopup, SelectList, SelectItem, SelectGroup, SelectSeparator } from './engine';
export * as Select from './select.parts';
export type * from './select.contract';
```

**Why this exact shape.** S2 built both patterns with tsdown 0.23.1 (unbundle) into a Next 16.4.0 app:
- **Pattern A** (`export * as Dialog` from a `'use client'` file) failed prerender under Turbopack and webpack with "Element type is invalid … got: undefined".
- **Pattern B** (directive-free `sheet.parts.ts` re-exporting `'use client'` leaves) built and rendered, and flat imports worked in both.

The `engine.ts` hop adds one more directive-free re-export, which must be added to the S2 fixture (§10).

**CI guard (`tooling/use-client-guard`)** fails the build when:
- a source file's directive differs from its `dist` output (r4);
- any `index.*`, `*.parts.*`, `engine.*` or `*.contract.*` file carries `'use client'`;
- any directive-free module imports `react-aria`, `react-stately` or `react-aria-components`;
- any directive-free module contains a `style=` JSX attribute (CSP Profile B, gap-b B1.3);
- the RSC fixture fails to render `<Select.Root>`, `<Dialog.Root>` and `<Card.Root>` from a Server Component under both bundlers.

### 6.6 The `render` helper (server-safe; imports nothing from the engine)

r3 §8.4's sketch imports `mergeProps` from `react-aria`. That would pull the engine (and its `client-only` import) into server-safe modules, so Nizivo owns a ~0.3 KB version.

```ts
// src/_contracts/render.ts — no directive. cloneElement/createElement/isValidElement are all exported
// by react@19.3.0's react-server build (gap-a §1.4), so this runs inside Server Components.
import { cloneElement, createElement, isValidElement, type ReactElement, type Ref } from 'react';
import { mergeProps } from './merge-props';

export type RenderProp<S> =
  | ReactElement                                                           // element form: RSC-serializable
  | ((props: Record<string, unknown> & { ref?: Ref<any> }, state: S) => ReactElement); // function form: client or same-module only

export function renderElement<S>(tag: string, render: RenderProp<S> | undefined, state: S, props: Record<string, any>) {
  if (typeof render === 'function') return render(props, state);
  if (isValidElement(render)) return cloneElement(render, mergeProps(props, render.props as Record<string, any>));
  return createElement(tag, props);
}
// merge-props.ts: className = ours + theirs; style shallow-merged (theirs wins); on* handlers chained
// (consumer first; ours skip when defaultPrevented); refs merged with a callback ref; other keys: theirs win.
```

Documented rules, the same as RAC and Base UI: render one element of the same kind; spread the received props; forward the ref.

### 6.7 Server-safe `Button` (Figma: Primary · Secondary · Tertiary · Critical · Accent)

```tsx
// src/button/button.tsx — NO directive: a Server Component by default, 0 bytes of client JS.
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../_contracts/render';

/** Open union (r8 §6.11): apps add variants via `declare module '@nizivo/react/augment'` + CSS in nz.patterns. */
export interface ButtonVariantMap { primary: true; secondary: true; tertiary: true; critical: true; accent: true }
export type ButtonVariant = keyof ButtonVariantMap;
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonState { variant: ButtonVariant; size: ButtonSize; pending: boolean; disabled: boolean }

export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Default 'secondary'. Designer guidance (02): "One primary per view. Secondary for everything else,
   *  tertiary inside dense rows. Accent is reserved for Grove AI." Critique C26 adjudicated this default. */
  variant?: ButtonVariant;
  size?: ButtonSize;                     // Figma Size: Sm 32 · Md 40 · Lg 48
  leadingIcon?: ReactNode;               // element slot; any icon set (settled 7)
  trailingIcon?: ReactNode;
  /** In-flight action (gap-b C2.3 rename of `loading`). Stays focusable, aria-disabled, submit → button. */
  pending?: boolean;
  fullWidth?: boolean;
  /** Swap the element, e.g. render={<a href="/new" />} or render={<Link href="/new" />}. */
  render?: RenderProp<ButtonState>;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary', size = 'md', leadingIcon, trailingIcon, pending = false, fullWidth,
  disabled = false, type = 'button', render, className, children, ...rest
}: ButtonProps) {
  const nativeButton = render === undefined;
  return renderElement('button', render, { variant, size, pending, disabled }, {
    ...rest,
    ...(nativeButton ? { type: pending && type === 'submit' ? 'button' : type, disabled: disabled && !pending } : {}),
    'aria-disabled': pending || (!nativeButton && disabled) || undefined,
    className: className ? `nz-button nz-hit-target ${className}` : 'nz-button nz-hit-target',
    'data-slot': 'button',
    'data-variant': variant,
    'data-size': size,
    'data-pending': pending ? '' : undefined,
    'data-full-width': fullWidth ? '' : undefined,
    children: (
      <>
        {pending
          ? <span className="nz-spinner" data-slot="button-spinner" aria-hidden="true" />   /* CSS-only; static under reduced motion */
          : leadingIcon && <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">{leadingIcon}</span>}
        <span className="nz-button-label" data-slot="button-label">{children}</span>
        {trailingIcon && <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">{trailingIcon}</span>}
      </>
    ),
  });
}
```

**Usage.** All of these are server-safe:
- `<Button variant="primary">Save</Button>`
- `<Button render={<Link href="/orders" />}>Orders</Button>`
- `<form action={save}><Button type="submit" variant="primary">Save</Button></form>`
- `SubmitButton` (a client leaf in `./field`) reads `useFormStatus()` and sets `pending` automatically.

```css
/* @nizivo/react/css/button.css */
@layer nz.tokens, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;

@layer nz.base {
  .nz-hit-target { position: relative; }
  @media (pointer: coarse) {                       /* gap-c §3.6: corrected S2 formula, both axes */
    .nz-hit-target::after { content: ""; position: absolute; inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2)); }
  }
  [data-nz-touch-targets="always"] .nz-hit-target::after { content: ""; position: absolute; inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2)); }
}

@layer nz.components {
  .nz-button {
    /* private: only variant/size rules write these */
    --_nz-bg: var(--nz-bg-surface);   --_nz-bg-hover: var(--nz-bg-hover);   --_nz-bg-active: var(--nz-bg-pressed);
    --_nz-fg: var(--nz-text-primary); --_nz-border: var(--nz-border-default);
    --_nz-h: var(--nz-size-control-md); --_nz-px: var(--nz-space-4); --_nz-gap: var(--nz-space-2); --_nz-radius: var(--nz-radius-md);

    display: inline-flex; align-items: center; justify-content: center; gap: var(--_nz-gap);
    min-block-size: var(--nz-button-height, var(--_nz-h));
    padding-inline: var(--nz-button-padding-x, var(--_nz-px));
    border: var(--nz-border-width-default) solid var(--nz-button-border-color, var(--_nz-border));
    border-radius: var(--nz-button-radius, var(--_nz-radius));
    background-color: var(--nz-button-bg, var(--_nz-bg));
    color: var(--nz-button-fg, var(--_nz-fg));
    font: var(--nz-font-label-m);                                  /* placeholder name (see §6 note) */
    cursor: pointer; text-decoration: none;
    touch-action: pan-x pan-y pinch-zoom;                          /* makes react-aria's injected <style> redundant (gap-b B1.3) */
    transition: background-color var(--nz-duration-fast) var(--nz-easing-standard),   /* 02: "hover 140ms standard" */
                border-color     var(--nz-duration-fast) var(--nz-easing-standard),
                scale            var(--nz-duration-instant) var(--nz-easing-standard); /* 02: "press scale 0.98" at 80ms */

    @media (hover: hover) {
      &:hover:not(:disabled, [aria-disabled="true"]) { background-color: var(--nz-button-bg-hover, var(--_nz-bg-hover)); }
    }
    &:active:not(:disabled, [aria-disabled="true"]) {
      background-color: var(--nz-button-bg-active, var(--_nz-bg-active));
      scale: var(--nz-scale-press);
    }
    &:focus-visible {                                              /* settled 12: solid outline carries the indicator */
      outline: var(--nz-border-width-focus) solid var(--nz-border-focus);
      outline-offset: 2px;
      box-shadow: 0 0 0 calc(var(--nz-border-width-focus) + 4px) var(--nz-focus-halo);  /* decoration only */
    }
    &:disabled, &[aria-disabled="true"]:not([data-pending]) {
      --_nz-bg: var(--nz-bg-disabled); --_nz-fg: var(--nz-text-disabled); --_nz-border: transparent; cursor: not-allowed;
    }
    &[data-pending] { cursor: progress; }

    &[data-variant="primary"]  { --_nz-bg: var(--nz-bg-brand); --_nz-bg-hover: var(--nz-bg-brand-hover); --_nz-bg-active: var(--nz-bg-brand-pressed);
                                 --_nz-fg: var(--nz-text-on-brand); --_nz-border: transparent; }
    &[data-variant="tertiary"] { --_nz-bg: transparent; --_nz-border: transparent; }
    &[data-variant="critical"] { --_nz-bg: var(--nz-bg-critical); --_nz-bg-hover: var(--nz-bg-critical-hover); --_nz-bg-active: var(--nz-bg-critical-hover);
                                 --_nz-fg: var(--nz-text-on-critical); --_nz-border: transparent; }        /* D15: red/600 + white = 5.69:1 both modes */
    &[data-variant="accent"]   { --_nz-bg: var(--nz-bg-accent); --_nz-bg-hover: var(--nz-bg-accent-hover, var(--nz-bg-accent));
                                 --_nz-fg: var(--nz-text-on-accent); --_nz-border: transparent; }

    &[data-size="sm"] { --_nz-h: var(--nz-size-control-sm); --_nz-px: var(--nz-space-3); --_nz-gap: var(--nz-space-1-5); --_nz-radius: var(--nz-radius-sm); }
    &[data-size="lg"] { --_nz-h: var(--nz-size-control-lg); --_nz-px: var(--nz-space-5); font: var(--nz-font-label-l); }
    &[data-full-width] { inline-size: 100%; }

    @media (forced-colors: active) { border-color: ButtonText; &:focus-visible { outline-color: Highlight; } }
  }
  .nz-spinner {
    inline-size: 1em; block-size: 1em; border-radius: var(--nz-radius-full);
    border: 2px solid currentColor; border-inline-end-color: transparent;
    animation: nz-spin 700ms linear infinite;
  }
  @media (prefers-reduced-motion: reduce) { .nz-spinner { animation: none; } }
  [data-nz-motion="reduce"] .nz-spinner { animation: none; }
}
```

Figma's raw Primary inner-highlight and shadow are not bound to an effect style (02), so they stay out until design binds them. The Figma prototype's 160 ms hover is not a token; the CSS uses `duration/fast` (140 ms), which matches the component description (C35).

### 6.8 Engine-backed `Select`: the adapter seam

Two exports share **one trigger skin** (`.nz-select-trigger`, also used by the DateRangePicker trigger):

| Export | Tier | Use when | Package entry |
|---|---|---|---|
| `NativeSelect` | **T0**, server-safe | Form value from plain-text options (the Figma Select with "Last 30 days"-style values). Progressive `appearance: base-select` styling in Chrome 135+ and Safari 27; native picker in Firefox | `@nizivo/react/native-select` (v0.1) |
| `Select` | **T1** (react-aria hooks) | Rich options: icons, descriptions, groups, async | `@nizivo/react/select` (v0.2) |

**Gate for collapsing them later:** customizable select becomes Baseline (WF lists Chrome 135 and Safari 27, but no Firefox). At that point a `native` adapter for the plain-text subset of `Select` can replace the engine through `engine.ts`.

```ts
// src/select/select.contract.ts — public, engine-free types (no react-aria types ever appear here)
export interface SelectChangeDetails { reason: 'item-press' | 'keyboard' | 'form-reset' | 'programmatic' }
export interface OpenChangeDetails { reason: 'trigger' | 'escape' | 'outside-press' | 'item-press' | 'hidden' | 'programmatic' }
export interface SelectRootProps {
  value?: string | null; defaultValue?: string | null;
  onValueChange?: (value: string | null, details: SelectChangeDetails) => void;
  open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean, details: OpenChangeDetails) => void;
  name?: string; required?: boolean; disabled?: boolean; invalid?: boolean;
  /** Serializable data API: usable straight from a Server Component. */
  items?: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>;
  labels?: Partial<{ placeholder: string; dismiss: string }>;
  children?: React.ReactNode;
}
export interface SelectItemProps { value: string; textValue?: string; disabled?: boolean; children?: React.ReactNode }
```

```ts
// src/select/engine.ts — the ONLY line that changes when the engine changes
export * from '../_engines/react-aria/select';
// export * from '../_engines/react-aria-components/select';   // fallback: RAC components (same family, +measured delta)
// export * from '../_engines/native/select';                  // future: customizable select, plain-text items only
```

```tsx
// src/_engines/react-aria/select.tsx — the only file in /select that imports the engine
'use client';
import { createContext, use, useMemo, useRef, Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import { useSelect, useListBox, useOption, useButton, usePopover, Overlay, I18nProvider, mergeProps as ariaMerge } from 'react-aria';
import { useSelectState, Item, Section, type Node } from 'react-stately';
import { FieldContext } from '../../field/field-scope';
import { useNizivoConfig } from '../../config/context';
import { resolvePortalContainer } from '../../_contracts/layers';   // nearest dialog:modal / dialog[open] / :popover-open, else body
import { renderElement } from '../../_contracts/render';
import type { SelectRootProps, SelectItemProps } from '../../select/select.contract';

const Ctx = createContext<SelectCtx | null>(null);

/* 1. Declaration parts. SelectItem and SelectGroup never render; the list renders from the collection.
      Under RSC, children rendered by a Server Component arrive already resolved, so the walk below sees
      SelectItem/SelectGroup elements even when a server-side wrapper produced them. Client wrappers are
      opaque: the documented rule is the react-stately rule, "items are direct children of SelectList". */
export function SelectItem(_: SelectItemProps): null { return null; }
export function SelectGroup(_: { label: ReactNode; children: ReactNode }): null { return null; }

/* 2. Nizivo parts → react-stately collection elements (the hooks-altitude cost: ~40 lines we own). */
function toCollection(nodes: ReactNode): ReactElement[] {
  return Children.toArray(nodes).flatMap((el): ReactElement[] => {
    if (!isValidElement<any>(el)) return [];
    if (el.type === Fragment) return toCollection(el.props.children);
    if (el.type === SelectGroup) return [<Section key={String(el.key)} title={el.props.label}>{toCollection(el.props.children)}</Section>];
    if (el.type === SelectItem) {
      const p = el.props as SelectItemProps;
      return [<Item key={p.value} textValue={p.textValue ?? textOf(p.children)}>{p.children}</Item>];
    }
    return [];
  });
}
const findListChildren = (nodes: ReactNode): ReactNode => /* depth-first: SelectPopup → SelectList → children */ walk(nodes, SelectList);

export function SelectRoot(props: SelectRootProps) {
  const field = use(FieldContext);                  // optional; null outside <Field>
  const { locale } = useNizivoConfig();             // 'en-US' unless an optional <NizivoConfig> says otherwise
  const items = useMemo(() => props.items                      // re-walk only when the declarations change
    ? props.items.map((i) => <Item key={i.value} textValue={i.label}>{i.label}</Item>)
    : toCollection(findListChildren(props.children)), [props.items, props.children]);
  const disabledKeys = props.items?.filter((i) => i.disabled).map((i) => i.value);
  const state = useSelectState({
    children: items, disabledKeys,
    selectedKey: props.value, defaultSelectedKey: props.defaultValue,
    onSelectionChange: (k) => props.onValueChange?.(k as string | null, { reason: 'item-press' }),
    isOpen: props.open, defaultOpen: props.defaultOpen,
    onOpenChange: (o) => props.onOpenChange?.(o, { reason: o ? 'trigger' : 'item-press' }),
    isDisabled: props.disabled ?? field?.disabled, isRequired: props.required ?? field?.required,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const aria = useSelect({ 'aria-labelledby': field?.ids.label, isDisabled: props.disabled ?? field?.disabled }, state, triggerRef);
  return (
    <I18nProvider locale={locale}>{/* gap-b A3: never let RAC flip to navigator.language after hydration */}
      <Ctx value={{ state, aria, triggerRef, field, props }}>
        {props.children}
        <NativeMirror />{/* form value + native required validation + autofill */}
      </Ctx>
    </I18nProvider>
  );
}

export function SelectTrigger({ render, className, children, ...rest }: TriggerProps) {
  const { state, aria, triggerRef, field } = use(Ctx)!;
  const { buttonProps } = useButton(aria.triggerProps, triggerRef);
  return renderElement('button', render, { open: state.isOpen }, ariaMerge(rest, buttonProps, {
    ref: triggerRef,
    id: field?.ids.control,
    'aria-describedby': field?.describedBy,
    className: `nz-select-trigger nz-hit-target${className ? ` ${className}` : ''}`,
    'data-slot': 'select-trigger',
    'data-open': state.isOpen ? '' : undefined,          // Nizivo vocabulary emitted directly: no mapping layer
    'data-invalid': field?.invalid || rest.invalid ? '' : undefined,
    children,
  }));
}

export function SelectPopup({ className, children }: PopupProps) {
  const { state, triggerRef, props } = use(Ctx)!;
  const popoverRef = useRef<HTMLDivElement>(null);
  const { popoverProps, underlayProps, placement } = usePopover({ triggerRef, popoverRef, placement: 'bottom start', offset: 4 }, state);
  if (!state.isOpen) return null;                      // closed overlays render nothing in SSR (gap-c O-17)
  return (
    <Overlay portalContainer={resolvePortalContainer(triggerRef.current)}>{/* inside a native modal → portal INTO it (D8) */}
      <div {...underlayProps} className="nz-select-underlay" />
      <div {...popoverProps} ref={popoverRef} className={`nz-select-popup${className ? ` ${className}` : ''}`}
           data-slot="select-popup" data-open="" data-side={sideOf(placement)} data-align={alignOf(placement)}>
        {/* own visually-hidden dismiss button: a CLASS, not react-aria's inline-style <DismissButton> (CSP Profile B) */}
        <button type="button" className="nz-visually-hidden" tabIndex={-1} onClick={state.close}>{props.labels?.dismiss ?? 'Dismiss'}</button>
        {children}
      </div>
    </Overlay>
  );
}

export function SelectList({ className }: { className?: string; children?: ReactNode }) {
  const { state, aria } = use(Ctx)!;
  const ref = useRef<HTMLUListElement>(null);
  const { listBoxProps } = useListBox(aria.menuProps, state, ref);
  return (
    <ul {...listBoxProps} ref={ref} className={`nz-select-list${className ? ` ${className}` : ''}`} data-slot="select-list">
      {[...state.collection].map((n) => n.type === 'section'
        ? <SectionView key={n.key} node={n} />
        : <OptionView key={n.key} node={n} />)}
    </ul>
  );
}

function OptionView({ node }: { node: Node<unknown> }) {
  const { state } = use(Ctx)!;
  const ref = useRef<HTMLLIElement>(null);
  const { optionProps, isSelected, isFocused, isDisabled } = useOption({ key: node.key }, state, ref);
  return (
    <li {...optionProps} ref={ref} className="nz-select-item" data-slot="select-item"
        data-selected={isSelected ? '' : undefined} data-highlighted={isFocused ? '' : undefined}
        data-disabled={isDisabled ? '' : undefined}>
      {node.rendered}
      <svg className="nz-select-item-indicator" aria-hidden="true" viewBox="0 0 24 24">{CHECK_PATH}</svg>{/* 1 of ≤10 inlined glyphs */}
    </li>
  );
}

/* 3. Form participation. Own class-hidden native <select>, NOT react-aria's HiddenSelect (inline-style
      VisuallyHidden → broken under CSP Profile B, gap-b B1.2). `type=hidden` cannot carry `required` (gap-a §1.4). */
function NativeMirror() {
  const { state, triggerRef, field, props } = use(Ctx)!;
  const name = props.name ?? field?.name;
  if (!name) return null;
  return (
    <select className="nz-visually-hidden" aria-hidden="true" tabIndex={-1} name={name}
            required={props.required ?? field?.required} value={(state.selectedKey as string) ?? ''}
            onChange={(e) => state.setSelectedKey(e.target.value || null)}                       /* browser autofill */
            onInvalid={(e) => { e.preventDefault(); triggerRef.current?.focus(); field?.reportValidity?.(e.currentTarget); }}>
      <option value="" />
      {[...state.collection].flatMap(flattenOptions).map((n) => <option key={n.key} value={String(n.key)}>{n.textValue}</option>)}
    </select>
  );
}
```

**Server Component usage.** All parts are client references, and the namespace comes from the directive-free `select.parts.ts` (S2 pattern B):

```tsx
import { Select } from '@nizivo/react/select';
import { Field } from '@nizivo/react/field';

export default function Page() {
  return (
    <Field label="Period" name="period">
      <Select.Root defaultValue="30d">
        <Select.Trigger><Select.Value /></Select.Trigger>
        <Select.Popup>
          <Select.List>
            <Select.Item value="7d">Last 7 days</Select.Item>
            <Select.Item value="30d">Last 30 days</Select.Item>
          </Select.List>
        </Select.Popup>
      </Select.Root>
    </Field>
  );
}
```

**What swapping costs.** Replacing this adapter with RAC components (`_engines/react-aria-components/select.tsx`) means writing ~120 lines and flipping the one line in `engine.ts`. Consumers see no change; bundle size changes by the measured delta (hooks 45.3 KB vs RAC 65.5 KB for Menu + Select + Tabs).

### 6.9 `Dialog`: own adapter on native `<dialog>` (top layer, SSR in place)

```tsx
// src/_engines/native/dialog.tsx
'use client';
import { createContext, use, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { renderElement } from '../../_contracts/render';
import { modalStack } from '../../_contracts/layers';     // module-level store; the Toaster re-portals into the topmost modal
import type { DialogRootProps, DialogPopupProps, OpenChangeReason } from '../../dialog/dialog.contract';

const Ctx = createContext<DialogCtx | null>(null);
const supportsInvokers = () => typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;

export function DialogRoot({ open: controlled, defaultOpen = false, onOpenChange, role = 'dialog',
  dismissOnOutsidePress = role !== 'alertdialog', children }: DialogRootProps) {
  const [inner, setInner] = useState(defaultOpen);
  const open = controlled ?? inner;
  const popupId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const setOpen = (next: boolean, reason: OpenChangeReason) => {
    if (controlled === undefined) setInner(next);
    onOpenChange?.(next, { reason });
  };
  return <Ctx value={{ open, setOpen, popupId, triggerRef, role, dismissOnOutsidePress }}>{children}</Ctx>;
}

export function DialogTrigger({ render, onClick, className, ...rest }: DialogTriggerProps) {
  const d = use(Ctx)!;
  return renderElement('button', render, { open: d.open }, {
    ...rest, ref: d.triggerRef, type: 'button',
    // APG dialog pattern: aria-haspopup only. No aria-expanded: it would announce "collapsed" on a button that opens a modal.
    'aria-haspopup': 'dialog', 'aria-controls': d.popupId,
    // Zero-JS open BEFORE hydration where invoker commands exist (WF: Chrome 135, Firefox 144, Safari 26.2).
    // React 19.3 passes unknown lowercase attributes through (r3 §5).
    commandfor: d.popupId, command: 'show-modal',
    onClick: (e: React.MouseEvent) => { onClick?.(e); if (!e.defaultPrevented && !supportsInvokers()) d.setOpen(true, 'trigger'); },
    className: `nz-dialog-trigger${className ? ` ${className}` : ''}`, 'data-slot': 'dialog-trigger', 'data-open': d.open ? '' : undefined,
  });
}

export function DialogPopup({ size = 'md', placement = 'center', initialFocus, returnFocus = true, className, render, children, ...rest }: DialogPopupProps) {
  const d = use(Ctx)!;
  const ref = useRef<HTMLDialogElement>(null);

  // React state → top layer. Layout effect so showModal() happens before paint.
  useLayoutEffect(() => {
    const el = ref.current!;
    if (d.open && !el.open) { el.showModal(); modalStack.push(el); focusInitial(el, initialFocus); }
    if (!d.open && el.open) {
      closeWithExit(el).then(() => {
        modalStack.remove(el);
        restoreFocus(d.triggerRef.current, returnFocus);   // D-spike: WebKit left focus on <body> → restore explicitly
      });
    }
  }, [d.open]);

  // Unmount or React <Activity> hide: a native modal hidden by display:none still blocks the page (gap-c §1.2.6, test O-16).
  useLayoutEffect(() => () => { const el = ref.current; if (el?.open) { el.close(); modalStack.remove(el); } }, []);

  // Native events → React state (after hydration).
  useEffect(() => {
    const el = ref.current!;
    if (el.open && !d.open) d.setOpen(true, 'trigger');   // opened natively (invoker) before hydration
    const onCommand = (e: Event) => { if ((e as any).command === 'show-modal') { e.preventDefault(); d.setOpen(true, 'trigger'); } };
    const onCancel = (e: Event) => { e.preventDefault(); d.setOpen(false, 'escape'); };        // D-spike: cancelable in Chromium 156 + WebKit 27.2
    const onPointerDown = (e: PointerEvent) => {                                               // backdrop press; no `closedby` in Safari (WF)
      if (d.dismissOnOutsidePress && e.target === el) d.setOpen(false, 'outside-press');
    };
    el.addEventListener('command', onCommand);
    el.addEventListener('cancel', onCancel);
    el.addEventListener('pointerdown', onPointerDown);
    return () => {
      el.removeEventListener('command', onCommand);
      el.removeEventListener('cancel', onCancel);
      el.removeEventListener('pointerdown', onPointerDown);
    };
  }, [d.dismissOnOutsidePress]);

  return renderElement('dialog', render, { open: d.open }, {
    ...rest, ref, id: d.popupId,
    role: d.role === 'alertdialog' ? 'alertdialog' : undefined,
    'aria-labelledby': `${d.popupId}-title`,
    className: `nz-dialog-popup${className ? ` ${className}` : ''}`,
    'data-slot': 'dialog-popup', 'data-size': size, 'data-placement': placement,   // placement="end" = Drawer, "bottom" = Sheet
    'data-open': d.open ? '' : undefined,
    'data-nz-portal-root': '',                                                      // engine popups inside portal HERE (D8)
    children: <div className="nz-dialog-content" data-slot="dialog-content">{children}</div>,  // clip here, never on the dialog (gap-c L2)
  });
}

/** Exit: hold the dialog open while FINITE animations run, then close(). Reduced motion (0 ms) → no
 *  animations → resolves at once, so `transitionend` can never hang the dialog (r2 risk). Infinite
 *  animations (a spinner in the body) are excluded or they would never finish. */
async function closeWithExit(el: HTMLDialogElement) {
  el.dataset.exiting = '';
  const finite = el.getAnimations({ subtree: true }).filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
  await Promise.allSettled(finite.map((a) => a.finished));
  el.close();
  delete el.dataset.exiting;
}
```

```css
/* @nizivo/react/css/dialog.css (excerpt) */
@layer nz.components {
  .nz-dialog-popup {
    padding: 0; border: 0; color: var(--nz-text-primary);
    background: var(--nz-bg-surface-raised);                   /* gap-c §2.3: floating surfaces use surface-raised */
    border-radius: var(--nz-radius-2xl); box-shadow: var(--nz-elevation-4);
    inline-size: min(var(--nz-dialog-width, 30rem), 100vw - 2 * var(--nz-space-4));
    max-block-size: calc(100dvh - 2 * var(--nz-space-8));
    /* 01: "modals and drawers enter on spring, exit in 140ms ease-in; the backdrop only fades" */
    transition: opacity var(--nz-duration-spring) var(--nz-easing-spring), translate var(--nz-duration-spring) var(--nz-easing-spring);
    @starting-style { &[open] { opacity: 0; translate: 0 var(--nz-distance-reveal); } }
    &[data-exiting] { opacity: 0; transition-duration: var(--nz-duration-fast); transition-timing-function: var(--nz-easing-exit); }
    &::backdrop { background: var(--nz-bg-scrim, rgb(24 27 25 / 0.32)); transition: opacity var(--nz-duration-base) var(--nz-easing-enter); }
    @starting-style { &[open]::backdrop { opacity: 0; } }
    &[data-exiting]::backdrop { opacity: 0; transition-duration: var(--nz-duration-fast); }
    &[data-placement="end"] { margin-inline-end: 0; block-size: 100dvh; max-block-size: none; border-start-end-radius: 0; border-end-end-radius: 0; }
    @media (forced-colors: active) { border: 1px solid CanvasText; }
  }
  .nz-dialog-content { display: grid; grid-template-rows: auto 1fr auto; max-block-size: inherit; overflow: clip; border-radius: inherit; }
}
@layer nz.base {
  /* Zero-JS scroll lock (D-spike: matched and applied in Chromium 156 + WebKit 27.2). iOS: test N-03. */
  :root:has(.nz-dialog-popup:modal) { overflow: hidden; scrollbar-gutter: stable; }
}
```

**Degradations handled in v0.1** (gap-c §1.4 blockers, made concrete):

| Gap | v0.1 handling | Removed when |
|---|---|---|
| `overlay` property is Chromium-only (no CSS-only exit in Firefox or Safari) | JS-sequenced exit: intercept `cancel`, hold with `data-exiting`, then `close()` (D-spike) | `overlay` is Baseline (then CSS-only exits) |
| `dialog[closedby]` missing in Safari | Backdrop `pointerdown` handler | `closedby` is Baseline |
| Toasts inert under `showModal()` (whatwg #9936; D-spike reproduced it) | The Toast region re-portals into the topmost modal (module modal stack; MutationObserver for consumer dialogs) | The spec makes top-layer elements above a modal interactive |
| Engine popups portalled to `body` are inert under a native modal | `resolvePortalContainer` → the nearest `[data-nz-portal-root]`, `dialog:modal`, `dialog[open]` or `:popover-open` | Never (a correct rule regardless of engine) |
| `moveBefore` missing in Safari | Re-portal through React only; never move nodes by hand | — |
| `::backdrop` custom-property inheritance (UNVERIFIED) | Literal fallback inside `var()`; in dark mode the scrim may show its light value (still a dark veil) | Verified in N-03 |
| iOS touch scroll under `overflow:hidden` (UNVERIFIED on 17.5–18.x) | Test N-03. If it fails, add an own ~0.4 KB `touchmove` guard to the Dialog adapter. Do not import react-aria into Dialog, which would put the engine core on dialog-only pages | N-03 passes |

### 6.10 Compound server `Card` (zero JS; namespace + flat)

```tsx
// src/card/card.tsx — NO directive. Server components may live in a namespace freely (no client boundary to dot through).
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../_contracts/render';

type Tone = 'surface' | 'subtle' | 'inverse' | 'brand' | 'accent';     // 04: Card Style + Insight Tone unified into one axis
export function CardRoot({ tone = 'surface', padding = 'md', elevation, interactive, render, className, ...rest }:
  ComponentPropsWithRef<'div'> & { tone?: Tone; padding?: 'none' | 'sm' | 'md' | 'lg'; elevation?: 0 | 1 | 2; interactive?: boolean; render?: RenderProp<{ tone: Tone }> }) {
  return renderElement('div', render, { tone }, {
    ...rest, className: `nz-card${className ? ` ${className}` : ''}`, 'data-slot': 'card',
    'data-tone': tone, 'data-padding': padding, 'data-elevation': elevation, 'data-interactive': interactive ? '' : undefined,
  });
}
export const CardHeader = (p: ComponentPropsWithRef<'div'>) => <div {...p} className={cx('nz-card-header', p.className)} data-slot="card-header" />;
/** Constrained heading level (settled 1 detail): the visual style stays Grove/Heading/H4 whatever the level. */
export function CardTitle({ level = 3, ...p }: ComponentPropsWithRef<'h3'> & { level?: 2 | 3 | 4 }) {
  const Tag = `h${level}` as 'h2' | 'h3' | 'h4';
  return <Tag {...p} className={cx('nz-card-title', p.className)} data-slot="card-title" />;
}
export const CardDescription = (p: ComponentPropsWithRef<'p'>) => <p {...p} className={cx('nz-card-description', p.className)} data-slot="card-description" />;
/** Figma "Show action" → presence of this slot. Put an <IconButton> + <Menu>, a <NativeSelect> or a link here (04). */
export const CardAction = (p: ComponentPropsWithRef<'div'>) => <div {...p} className={cx('nz-card-action', p.className)} data-slot="card-action" />;
export const CardBody = (p: ComponentPropsWithRef<'div'>) => <div {...p} className={cx('nz-card-body', p.className)} data-slot="card-body" />;
export const CardFooter = (p: ComponentPropsWithRef<'div'>) => <div {...p} className={cx('nz-card-footer', p.className)} data-slot="card-footer" />;
/** Whole-card link without nesting interactive content: stretched ::before on a positioned root. */
export const CardLinkOverlay = ({ render, ...p }: ComponentPropsWithRef<'a'> & { render?: RenderProp<{}> }) =>
  renderElement('a', render, {}, { ...p, className: cx('nz-card-link-overlay', p.className), 'data-slot': 'card-link-overlay' });

// src/card/card.parts.ts — directive-free
export { CardRoot as Root, CardHeader as Header, CardTitle as Title, CardDescription as Description,
         CardAction as Action, CardBody as Body, CardFooter as Footer, CardLinkOverlay as LinkOverlay } from './card';
// src/card/index.ts — directive-free
export * from './card';
export * as Card from './card.parts';
```

```css
@layer nz.components {
  .nz-card {
    --_nz-pad: var(--nz-space-6);
    position: relative; display: grid; gap: var(--nz-space-5); padding: var(--nz-card-padding, var(--_nz-pad));
    background: var(--nz-card-bg, var(--nz-bg-surface)); color: var(--nz-text-primary);
    border: var(--nz-border-width-default) solid var(--nz-card-border-color, var(--nz-border-subtle));
    border-radius: var(--nz-card-radius, var(--nz-radius-xl));
    container: nz-card / inline-size;                 /* children adapt to the card, not the viewport */
    &[data-tone="subtle"]  { --nz-card-bg: var(--nz-bg-subtle); }
    &[data-tone="brand"]   { --nz-card-bg: var(--nz-bg-brand-subtle); }
    &[data-tone="accent"]  { --nz-card-bg: var(--nz-bg-accent-subtle); }
    &[data-tone="inverse"] { color-scheme: var(--nz-scheme-inverse); }  /* gap-c §2.6: every nested token flips, no on-inverse family */
    &[data-elevation="1"] { box-shadow: var(--nz-elevation-1); }
    &[data-padding="sm"] { --_nz-pad: var(--nz-space-4); } &[data-padding="lg"] { --_nz-pad: var(--nz-space-8); } &[data-padding="none"] { --_nz-pad: 0; }
    &[data-interactive] { transition: translate var(--nz-duration-base) var(--nz-easing-standard), box-shadow var(--nz-duration-base) var(--nz-easing-standard); }
    @media (hover: hover) { &[data-interactive]:hover { translate: 0 calc(-1 * var(--nz-distance-lift)); box-shadow: var(--nz-elevation-2); background: var(--nz-bg-surface-raised); } }
    &:has(.nz-card-link-overlay:focus-visible) { outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px; }
  }
  .nz-card-title { font: var(--nz-font-heading-h4); margin: 0; }                      /* placeholder font token name */
  .nz-card-link-overlay::before { content: ""; position: absolute; inset: 0; border-radius: inherit; }
  .nz-card-action { position: relative; z-index: 1; }                                /* stays clickable above the overlay */
}
```

Lift happens only with `data-interactive`; 09 flags a lift on a non-interactive tile as a false affordance.

### 6.11 `KpiTile` (pattern, server-safe, status contract)

```tsx
// src/kpi-tile/kpi-tile.tsx — NO directive. Core never imports charts: the sparkline is an element slot (settled 6, C13).
import { useId, type ReactNode } from 'react';
import { NumberValue, type NumberFormat } from '../number-value/number-value';
import { Delta } from '../delta/delta';
import { formatLabel, type Label } from '../i18n/format-label';
import { renderElement, type RenderProp } from '../_contracts/render';

export type DataStatus = 'ready' | 'loading' | 'empty' | 'error';
export const kpiTileLabels = { loading: 'Loading {label}', error: "Couldn't load {label}", noData: 'No data' } satisfies Record<string, Label>;

export interface KpiTileProps {
  label: ReactNode; value?: number | null; format?: NumberFormat;                    // serializable Intl options or a preset name
  locale?: string;                                                                    // explicit; default 'en-US' (D9)
  delta?: number | null; comparison?: ReactNode;                                      // "vs last week"
  chart?: ReactNode;                                                                  // e.g. <Sparkline data={…}/> from @nizivo/charts
  tone?: 'surface' | 'brand' | 'accent';                                              // 04: tint groups a row; decoupled from trend
  status?: DataStatus; pending?: boolean; empty?: ReactNode; error?: ReactNode;       // gap-b C2.1
  labels?: Partial<typeof kpiTileLabels>;
  render?: RenderProp<{ status: DataStatus; pending: boolean }>;
  className?: string;
}

export function KpiTile({ label, value, format = 'compact', locale = 'en-US', delta, comparison, chart, tone = 'surface',
  status = 'ready', pending = false, empty, error, labels, render, className }: KpiTileProps) {
  const id = useId();                                                // allowed: sync server component (S6)
  const L = { ...kpiTileLabels, ...labels };
  const st: DataStatus = status === 'ready' && value == null ? 'empty' : status;
  const text = typeof label === 'string' ? label : '';
  return renderElement('div', render, { status: st, pending }, {
    role: 'group', 'aria-labelledby': id, 'aria-busy': st === 'loading' || pending || undefined,  // a named group, not a landmark
    className: `nz-kpi-tile${className ? ` ${className}` : ''}`, 'data-slot': 'kpi-tile', 'data-tone': tone,
    'data-loading': st === 'loading' ? '' : undefined, 'data-empty': st === 'empty' ? '' : undefined,
    'data-error': st === 'error' ? '' : undefined, 'data-pending': pending ? '' : undefined,
    children: (
      <>
        <p id={id} className="nz-kpi-tile-label" data-slot="kpi-tile-label">{label}</p>
        <div className="nz-kpi-tile-value-row" data-slot="kpi-tile-value-row">          {/* identical box in every state (CLS 0) */}
          {st === 'loading' ? (
            <><span className="nz-skeleton nz-kpi-tile-value-skeleton" aria-hidden="true" />
              <span className="nz-visually-hidden">{formatLabel(locale, L.loading, { label: text })}</span></>
          ) : st === 'error' ? (error ?? <span className="nz-inline-error">{formatLabel(locale, L.error, { label: text })}</span>
          ) : st === 'empty' ? (empty ?? <span className="nz-kpi-tile-empty"><span aria-hidden="true">—</span>
              <span className="nz-visually-hidden">{formatLabel(locale, L.noData)}</span></span>
          ) : (
            <><NumberValue className="nz-kpi-tile-value" value={value!} format={format} locale={locale} />
              {chart && <span className="nz-kpi-tile-chart" data-slot="kpi-tile-chart" aria-hidden="true">{chart}</span>}</>
          )}
        </div>
        {st === 'ready' && delta != null && (
          <div className="nz-kpi-tile-footer" data-slot="kpi-tile-footer">
            <Delta value={delta} locale={locale} comparison={comparison} />{/* trend derived from sign; sr-only "Up 12.4% vs last week" */}
          </div>
        )}
      </>
    ),
  });
}
```

Streaming: `<Suspense fallback={<KpiTile label="Revenue" status="loading" />}>`. The fallback **is** the component, so skeleton and content share geometry (gap-b C1). Count-up is opt-in: `value={<CountUp value={…} />}` from `@nizivo/react/motion` (0.5 KB, r6). It server-renders the final value, and reduced motion means count-up = 0.

### 6.12 `AreaChart` (heavy module, server geometry + 0.6 KB island)

```tsx
// @nizivo/charts/src/area-chart/area-chart.tsx — NO directive: the SVG is complete in SSR HTML (Recharts' is not, r6)
import { area, line, curveMonotoneX } from 'd3-shape';
import { ticks } from 'd3-array';
import { linearScale, niceDomain, thinLabels } from '../core/scale';          // own, ~10 lines + helpers
import { ChartFrame } from '../frame/chart-frame';                            // <figure>, caption, <details> data table, status slots
import { ChartInteraction } from '../interaction/chart-interaction';          // 'use client' island, 0.6 KB (r6), fails closed

export function AreaChart({ data, x, series, title, description, locale = 'en-US', timeZone = 'UTC',
  format, status = 'ready', interactive = true, animate = true, labels }: AreaChartProps) {
  const n = data.length;
  const [y0, y1] = niceDomain([0, Math.max(...series.flatMap((s) => data.map((d) => d[s.key])))], 5); // fixes 03's un-niced bar domain
  const sx = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);           // percent space; evenly spaced series (v0.2 time model)
  const sy = linearScale([y0, y1], [100, 0]);
  const yTicks = ticks(y0, y1, 5);
  const xLabels = thinLabels(data.map((d) => formatDate(d[x], { locale, timeZone })), 6);   // first + last always kept (03)
  return (
    <ChartFrame title={title} description={description} status={status} labels={labels}
                table={{ columns: [x, ...series.map((s) => s.key)], rows: data, locale, timeZone, format }}>
      <div className="nz-area-chart" data-slot="area-chart" data-animate={animate ? '' : undefined}>
        <ol className="nz-chart-y-axis" aria-hidden="true">{[...yTicks].reverse().map((t) => <li key={t}>{fmt(t, format, locale)}</li>)}</ol>
        <svg className="nz-chart-plot" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g className="nz-chart-grid">{yTicks.map((t) => <line key={t} x1="0" x2="100" y1={sy(t)} y2={sy(t)} />)}</g>
          {series.map((s, i) => (
            <g key={s.key} className="nz-chart-series" data-series={i + 1} data-variant={s.variant /* 'comparison' = dashed neutral (03) */}>
              {s.area && <path className="nz-chart-area" d={area<any>().x((_, j) => sx(j)).y0(100).y1((d) => sy(d[s.key])).curve(curveMonotoneX)(data)!} />}
              <path className="nz-chart-line" d={line<any>().x((_, j) => sx(j)).y((d) => sy(d[s.key])).curve(curveMonotoneX)(data)!} />
            </g>
          ))}
        </svg>
        <ol className="nz-chart-x-axis" aria-hidden="true">{xLabels.map((l) => <li key={l}>{l}</li>)}</ol>
        {interactive && <ChartInteraction points={toPercentPoints(data, series, sx, sy)} title={title} locale={locale} format={format} />}
      </div>
    </ChartFrame>
  );
}
```

```css
@layer nz.components {
  .nz-area-chart { display: grid; grid-template: "y plot" 1fr ". x" auto / auto 1fr; container: nz-chart / inline-size; }
  .nz-chart-y-axis { grid-area: y; display: flex; flex-direction: column; justify-content: space-between; font: var(--nz-font-body-m); color: var(--nz-text-tertiary); }
  .nz-chart-x-axis { grid-area: x; display: flex; justify-content: space-between; /* 03: edge labels clamp inward */ }
  .nz-chart-plot { grid-area: plot; inline-size: 100%; block-size: var(--nz-chart-height, 15rem); overflow: visible; }
  .nz-chart-grid line { stroke: var(--nz-chart-grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .nz-chart-series { --_nz-c: var(--nz-chart-primary); }
  .nz-chart-line { fill: none; stroke: var(--_nz-c); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .nz-chart-area { fill: var(--_nz-c); fill-opacity: 0.1; }                     /* 03: flat 10% wash */
  .nz-chart-series[data-variant="comparison"] .nz-chart-line { stroke: var(--nz-chart-neutral); stroke-dasharray: 5 4; }
  .nz-area-chart[data-animate] .nz-chart-series { animation: nz-chart-draw var(--nz-duration-chart-draw) var(--nz-easing-standard) both; }
  @keyframes nz-chart-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }   /* 01: "draw left→right in 700ms" */
  @media (prefers-reduced-motion: reduce) { .nz-area-chart .nz-chart-series { animation: none; } }
  [data-nz-motion="reduce"] .nz-area-chart .nz-chart-series { animation: none; }
}
```

Every geometry value is an SVG presentation attribute and every label sits in a flex track, so the static chart renders correctly under CSP Profile B (gap-b B1.4). The island writes the crosshair and tooltip positions through CSSOM. `text/tertiary` axis labels become AA through the D15 Option A override (n600, 6.48:1 on white). Open QA, as r6 flagged: Safari behaviour of `vector-effect` and of dash patterns under `non-scaling-stroke`.

### 6.13 `Field` with a form-library recipe

Architecture is gap-a D16:
- `Field` is server-safe and renders the label and description;
- `FieldScope` is a 0.5 KB client leaf that provides wiring context and the error slot;
- controls are thin client leaves.

**The lean default for Server Components is the zero-JS function-child mode.**

```tsx
// Server Component, zero Nizivo JS: native validation bubbles before/without hydration; errors come back via the action.
import { Field } from '@nizivo/react/field';

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <form action={createProduct}>
      <Field label="Product title" description="Shown on the product page" name="title" required error={error}>
        {(control) => <input {...control} className="nz-input" data-size="md" />}{/* plain HTML + nz classes: still fully styled */}
      </Field>
      <button className="nz-button nz-hit-target" data-variant="primary" data-size="md" type="submit">Save</button>
    </form>
  );
}
```

```tsx
// React Hook Form 7.90 recipe (docs only; Nizivo has no form-library dependency)
'use client';
import { useForm, Controller } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Field } from '@nizivo/react/field';
import { Input } from '@nizivo/react/input';
import { Select } from '@nizivo/react/select';

export function ProductForm({ onValid }: { onValid: (v: Product) => void }) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<Product>({ resolver: standardSchemaResolver(ProductSchema) });
  return (
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <Field label="Product title" error={errors.title?.message}>
        <Input {...register('title')} />{/* ref lands on the native <input>: RHF focus + setFocus work */}
      </Field>
      <Controller control={control} name="status" render={({ field, fieldState }) => (
        <Field label="Status" error={fieldState.error?.message}>
          <Select.Root name={field.name} value={field.value} onValueChange={(v) => field.onChange(v)}>
            <Select.Trigger ref={field.ref} onBlur={field.onBlur}><Select.Value /></Select.Trigger>
            <Select.Popup><Select.List>
              <Select.Item value="active">Active</Select.Item>
              <Select.Item value="draft">Draft</Select.Item>
            </Select.List></Select.Popup>
          </Select.Root>
        </Field>
      )} />
    </form>
  );
}
```

Contract the recipes rely on (gap-a §2.7):
- `ref` reaches the focusable element;
- every value control takes `name`, `value`/`defaultValue`, `onValueChange(value, details)`, `onBlur` and `disabled`;
- `Field` takes `error` and `ids` (Conform passes its own ids);
- one error channel;
- `aria-describedby`, never `aria-errormessage`.

---

## 7. Tokens and theming

### 7.1 Pipeline: Figma → repo → outputs

```
Figma "Grove UI Library" (Pro team; Variables REST not available, S-d)
  │  designer runs TokensBrücke 3.18 → "Push to GitHub PR" (bot account, single-repo token)       [primary]
  │  or an engineer runs a Figma MCP use_figma snapshot, one collection per call (~6–8 calls)      [fallback, never CI]
  ▼
packages/tokens/figma/raw/**                    raw export, untouched
  │  normalize.ts: grove→nz rename · drop non-Grove collections (Clario, Pipkin, …) · spring(m,k,c,v) parse ·
  │                unitless Motion floats → ms/px/deg · `tz format`
  ▼
src/figma-owned/**  (DTCG 2025.10)      +      src/code-owned/** (breakpoints, layers, elevation, motion-derived,
  │                                                              media ratios, a11y overrides with expiry)
  ▼  nizivo.resolver.json  (sets: primitives · modifiers: theme{light,dark}, motion{default,reduced}, viewport{mobile,tablet,desktop})
Terrazzo 2.8.0 + plugins: light-dark · spring-linear · tailwind-theme · js-refs
  ▼
dist/tokens.css · tokens.json · tokens.js/.d.ts · tailwind.css · custom-media.css
  ▼  CI on every token PR: normalize(raw)===figma-owned · contrast matrix (every permutation) · override expiry/drift/redundancy ·
     golden-file diff · size budget · token diff comment (removed/renamed public token = breaking) · VR screenshots
```

### 7.2 Sample generated `tokens.css` (abbreviated; values from `00`)

```css
/* @nizivo/tokens/tokens.css — generated by Terrazzo 2.8.0 — DO NOT EDIT */
@layer nz.tokens, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;

@layer nz.tokens {
  :root {
    --nz-css-version: "0.1.0";                       /* dev-only JS/CSS handshake (r2 §4.9) */
    /* primitives: private API (--nz-p-*) */
    --nz-p-neutral-0: #ffffff; --nz-p-neutral-25: #fbfbf9; --nz-p-neutral-50: #f6f7f4; --nz-p-neutral-600: #596058;
    --nz-p-neutral-700: #414741; --nz-p-neutral-850: #202421; --nz-p-neutral-900: #181b19; --nz-p-neutral-950: #101311;
    --nz-p-neutral-925: #151816;                     /* proposed primitive, via the a11y override file (gap-c §3.2) */
    --nz-p-green-300: #79b993; --nz-p-green-500: #2e8358; --nz-p-green-700: #1a573a; --nz-p-red-600: #b93a23;
    /* … remaining Figma primitives … */

    /* leaves */
    --nz-space-1-5: 6px; --nz-space-2: 8px; --nz-space-3: 12px; --nz-space-4: 16px; --nz-space-6: 24px;
    --nz-radius-sm: 8px; --nz-radius-md: 12px; --nz-radius-xl: 20px; --nz-radius-2xl: 28px; --nz-radius-full: 999px;
    --nz-border-width-default: 1px; --nz-border-width-strong: 1.5px; --nz-border-width-focus: 2px;
    --nz-size-control-sm: 32px; --nz-size-control-md: 40px; --nz-size-control-lg: 48px; --nz-size-touch-min: 44px;

    /* motion: Figma "Default" mode + derived spring pairs (S4) */
    --nz-duration-instant: 80ms; --nz-duration-fast: 140ms; --nz-duration-base: 220ms; --nz-duration-chart-draw: 700ms;
    --nz-easing-standard: cubic-bezier(0.2, 0, 0, 1); --nz-easing-enter: cubic-bezier(0, 0, 0, 1); --nz-easing-exit: cubic-bezier(0.3, 0, 1, 1);
    --nz-easing-spring: linear(0, 0.007 1.5%, 0.027 3.1%, 0.06 4.8%, 0.108 6.7%, 0.211 10%, 0.559 20.2%, 0.658 23.5%, 0.742 26.7%,
                               0.811 29.8%, 0.868 32.9%, 0.916 36.1%, 0.954 39.4%, 0.985 43%, 1.007 46.9%, 1.022 51.1%, 1.029 55.9%, 1.029 63.7%, 1);
    --nz-duration-spring: 493ms;                     /* spring(1,260,24,0): ζ 0.744, 3.0% overshoot, 0.1% settle */
    --nz-easing-spring-soft: linear(0, 0.006 1.2%, 0.021 2.4%, 0.083 5.2%, 0.161 7.8%, 0.462 17%, 0.555 20.3%, 0.637 23.6%, 0.706 26.9%,
                                    0.766 30.3%, 0.817 33.9%, 0.86 37.7%, 0.898 42.1%, 0.929 47%, 0.953 52.5%, 0.971 58.7%, 0.991 73.9%, 1);
    --nz-duration-spring-soft: 702ms;                /* spring(1,170,26,0): ζ 0.997, no overshoot */
    --nz-distance-lift: 4px; --nz-distance-reveal: 12px; --nz-scale-press: 0.98; --nz-scale-hover: 1.02;

    /* code-owned layers (gap-c §1.5) */
    --nz-z-raised: 1; --nz-z-sticky: 100; --nz-z-chrome: 200; --nz-z-overlay: 1000; --nz-z-toast: 1100;

    /* responsive page tokens: mobile first (Figma Responsive "Mobile" mode) */
    --nz-grid-columns: 4; --nz-grid-gutter: 16px; --nz-grid-margin: 16px;
    --nz-layout-sidebar: 0px; --nz-layout-content-max: 358px; --nz-type-h1: 24px; --nz-type-kpi: 28px; --nz-section-gap: 20px;
  }

  /* semantic aliases: RE-DECLARED on brand scopes so a nested brand re-resolves them (r2 §4.3) */
  :root, [data-nz-brand] {
    --nz-bg-canvas:         light-dark(var(--nz-p-neutral-50),  var(--nz-p-neutral-950));
    --nz-bg-surface:        light-dark(var(--nz-p-neutral-0),   var(--nz-p-neutral-900));
    --nz-bg-surface-raised: light-dark(var(--nz-p-neutral-0),   var(--nz-p-neutral-850));
    --nz-bg-subtle:         light-dark(var(--nz-p-neutral-25),  var(--nz-p-neutral-925));  /* override: dark n900 → n925 */
    --nz-bg-brand:          light-dark(var(--nz-p-green-700),   var(--nz-p-green-400));
    --nz-bg-critical:       var(--nz-p-red-600);                                           /* override: red/600 in both modes */
    --nz-text-primary:      light-dark(var(--nz-p-neutral-900), var(--nz-p-neutral-50));
    --nz-text-secondary:    light-dark(var(--nz-p-neutral-700), var(--nz-p-neutral-300));  /* override, Option A */
    --nz-text-tertiary:     light-dark(var(--nz-p-neutral-600), var(--nz-p-neutral-400));  /* override, Option A: 5.65:1 worst case */
    --nz-text-on-critical:  #ffffff;                                                       /* new (override file) */
    --nz-border-focus:      light-dark(var(--nz-p-green-500),   var(--nz-p-green-300));
    --nz-bg-scrim:          light-dark(rgb(24 27 25 / 0.32), rgb(0 0 0 / 0.6));            /* code-owned until Figma adds bg/scrim */
    --nz-focus-halo:        color-mix(in oklab, var(--nz-border-focus) 28%, transparent);  /* mode-aware; fixes the hex drift */
    --nz-elevation-ring:    light-dark(transparent, rgb(255 255 255 / 0.08));
    --nz-elevation-1: 0 0 0 1px var(--nz-elevation-ring), 0 1px 2px 0 light-dark(rgb(16 19 17 / .04), rgb(0 0 0 / .24)),
                      0 1px 1px 0 light-dark(rgb(16 19 17 / .03), rgb(0 0 0 / .18));
    /* … 58 Figma semantic tokens + gap-c additions; elevation-2..4 per gap-c §2.3 … */
  }

  /* scheme scopes: the ONLY place color-scheme is set. :root gets none by default (S1: unset → light) */
  [data-nz-theme="light"]  { color-scheme: light; }
  [data-nz-theme="dark"]   { color-scheme: dark; }
  [data-nz-theme="system"] { color-scheme: light dark; }
  :root, [data-nz-theme="light"], [data-nz-theme="system"] { --nz-scheme-inverse: dark; }
  [data-nz-theme="dark"] { --nz-scheme-inverse: light; }
  @media (prefers-color-scheme: dark) { [data-nz-theme="system"] { --nz-scheme-inverse: light; } }

  /* reduced motion: media query OR explicit attribute (no "full" override, C9b) */
  @media (prefers-reduced-motion: reduce) {
    :root { --nz-duration-instant: 0ms; --nz-duration-fast: 0ms; --nz-duration-base: 120ms; --nz-duration-chart-draw: 0ms;
            --nz-easing-standard: linear; --nz-easing-enter: linear; --nz-easing-exit: linear;
            --nz-easing-spring: linear; --nz-duration-spring: 120ms; --nz-easing-spring-soft: linear; --nz-duration-spring-soft: 120ms;
            --nz-distance-lift: 0px; --nz-distance-reveal: 0px; --nz-scale-press: 1; --nz-scale-hover: 1; }
  }
  [data-nz-motion="reduce"] { /* identical declarations */ }

  /* responsive: build-time custom media (variables cannot appear in media queries) */
  @media (width >= 40rem) {           /* --nz-sm: the designer's "below 640px …" threshold (settled 11) */
    :root { --nz-grid-columns: 8; --nz-grid-gutter: 20px; --nz-grid-margin: 24px; --nz-layout-sidebar: 72px;
            --nz-layout-content-max: 976px; --nz-type-h1: 28px; --nz-section-gap: 24px; }
  }
  @media (width >= 80rem) {           /* --nz-lg: PROVISIONAL 1280, rail → expanded; design must confirm (C11) */
    :root { --nz-grid-columns: 12; --nz-grid-gutter: 24px; --nz-grid-margin: 32px; --nz-layout-sidebar: 264px;
            --nz-layout-content-max: 1280px; --nz-type-h1: 32px; --nz-type-kpi: 32px; --nz-section-gap: 32px; }
  }
}
```

Shipped beside it:
- **`custom-media.css`:** `@custom-media --nz-sm (width >= 40rem); @custom-media --nz-lg (width >= 80rem);`, for consumers whose CSS pipeline understands custom media.
- **`tokens.js`:** `bp.sm === '40rem'` plus the spring physics `{ mass: 1, stiffness: 260, damping: 24 }`, for the rare JS consumer.

**Why light-dark() over duplicated blocks (S1, S3).** One block nests at any depth with no repetition, and system mode needs no script.
- The **non-intrusive default is verified**: with `:root` unset or `normal`, the light value resolves even when the OS is dark.
- **Never `@property`-register** a colour token. S1 shows registration freezes the value at `:root` and breaks nested scopes.
- The light-dark transform is a ~15-line Terrazzo plugin (S3, `tokens.lightdark.css`).

### 7.3 Prefix configuration

- **Published packages always use `nz`** (`--nz-*`, `.nz-*`, `data-nz-*`).
- The prefix is a **build-time setting** (`NZ_TOKEN_PREFIX`). It is read by Terrazzo's `variableName` and by a Lightning CSS visitor that rewrites custom-property names in component CSS. It exists for three cases:
  - the Figma round-trip: `grove` → `nz`, plus pushing `codeSyntax.WEB = var(--nz-…)` back to Figma so Dev Mode shows real names (r7);
  - white-label rebuilds from source;
  - a future opt-in isolated build when two Nizivo versions must coexist on one page (r2 version-skew risk).
- Class names and `data-*` attributes are not re-prefixed; they are component contract, not tokens.
- A lint fails CI if the string `grove` appears in any shipped file (r8).

### 7.4 Code-owned tokens (`src/code-owned/**`)

| Token | Value | Why code owns it |
|---|---|---|
| `breakpoint.sm` / `breakpoint.lg` | 40rem (640) / 80rem (1280, provisional) | Figma has frame widths only; 640 is designer text (08) |
| `z.raised/sticky/chrome/overlay/toast` | 1 / 100 / 200 / 1000 / 1100 | Not in Figma; gap-c retired both conflicting scales (C17) |
| `bg.scrim` | light n900 @ 32% (08 Pattern 3 evidence); dark #000 @ 60% | Missing in Figma; Figma's raw `bg/inverse @ .32` brightens dark pages |
| `elevation.ring`, dark shadow alphas (×6), `elevation.highlight` (transparent) | gap-c §2.3 | No dark elevation in Figma (G16) |
| `focus.halo` | `color-mix(in oklab, border/focus 28%, transparent)` | Figma halo hex is static and drifts (01) |
| `duration.spring`, `duration.spring-soft` (+ reduced) | 493 ms / 702 ms; reduced 120 ms | Derived by the one generator (S4) |
| `media.ratio.*` | 1/1, 4/5, 3/2, 16/9 | For `Image data-ratio` without inline style (gap-b B1.3) |
| `a11y/*.overrides` | gap-c §3.2 values, each with an `expires` date | Time-boxed until Figma fixes land (D15) |

### 7.5 Drift detection (Pro-plan compatible, small-team sized)

1. **Invariant:** CI recomputes `normalize(figma/raw)` and fails if `src/figma-owned` differs. Code-first token edits need the `tokens:code-first` label and a Figma push (r7).
2. **Scheduled version check:** `GET /v1/files/:key/meta` compares the file version with the last synced version, and opens or updates a "Figma sync needed" issue. Releases are blocked while that issue is open.
   - REST limits follow the plan of the team that **owns the file**. On a Starter team a PAT gets only 6 requests a month (r7), and the owning team is unknown (S-d).
   - So the check runs **nightly only after the file moves to a Neev-owned paid team** (critique §5 item 5). Until then it runs weekly, triggered manually.
3. **Override hygiene:** expiry (warn at 14 days, fail after), drift (the Figma value changed under an override) and redundancy (Figma caught up, so delete the override).
4. **v0.3:** the `LIBRARY_PUBLISH` webhook relay → `repository_dispatch` (r7), once someone owns the relay.
5. **Ghosts:** `design/component-map.json` maps both the canonical `7275:*` sets and the live/ghost ids (C25). Design relinking ghosts (G1) is a v1.0 prerequisite, not a v0.1 blocker.

---

## 8. Mapping: every Figma component set (and the important ghosts and missing pieces)

**Key.**
- Tier: **T0** native/server, 0 KB · **T2** own on platform APIs · **T1** react-aria hooks · **Reg** registry pattern (consumer-owned, imports `@nizivo/react`).
- RSC: **S** server-safe (no directive) · **C** client leaf · **S+C** server shell with a client leaf.
- Rel: first release.

All 47 sets come from `00`. Ghost ids are from the 02–10 reports and the critique's M-A list.

### 8.1 The 47 component sets

| Page | Figma set (id) | Nizivo export(s) | Package / entry | Tier | RSC | Rel |
|---|---|---|---|---|---|---|
| 02 | Button (7275:11244) | `Button` (primary/secondary/tertiary/critical/accent; default secondary) | react `/button` | T0 | S | v0.1 |
| 02 | Icon Button (7275:11357) | `IconButton` (label required → `aria-label`; tooltip on by default, per the designer) | react `/icon-button` | T0 + T2 tooltip | S+C | v0.1 |
| 02 | Badge (7275:11374) | `Badge` (tone, `dot`, `emphasis`) | react `/badge` | T0 | S | v0.1 |
| 02 | Input (7275:11397) | `Field` + `Input` (+ `Textarea`, `SearchField`; `PasswordInput` v0.3) | react `/field`, `/input`, `/textarea` | T0 control in a client leaf | S+C | v0.1 |
| 02 | Select (7275:11438) | `NativeSelect` (v0.1), `Select` (v0.2); shared trigger skin; DateRangePicker trigger | react `/native-select`, `/select` | T0 / T1 | S / C | v0.1 / v0.2 |
| 02 | Checkbox (7275:11456) | `Checkbox` (+ `indeterminate`), group via `Fieldset` | react `/checkbox`, `/fieldset` | T0 (native input) | C (Field wiring, `indeterminate`) | v0.1 |
| 02 | Radio (7275:11479) | `RadioGroup`, `Radio` | react `/radio-group` | T0 | C | v0.1 |
| 02 | Switch (7275:11494) | `Switch` (`<input type=checkbox role=switch>`) | react `/switch` | T0 | C | v0.1 |
| 02 | Menu Item (7275:11516) + Dropdown Menu ghost (746:204) | `Menu` parts: Root, Trigger, Popup, Item (`intent="critical"`), Group, Label, Separator, CheckboxItem, RadioItem, Submenu | react `/menu` | T1 | C | v0.1 |
| 02 | Upload (7275:11548) | `FileUpload` (native `<input type=file>` + drop target + `ProgressBar`) | react `/file-upload` | T2 | C | v0.2 |
| 03 | Chart Legend Item (7275:13291) | `ChartLegend`, `ChartLegendItem` | charts `/legend` | T0 | S | v0.2 |
| 03 | Chart Tooltip (7275:13303; ghost 747:287) | tooltip inside the chart island (not an ARIA tooltip; live region) | charts (internal) | T2 island | C | v0.2 |
| 03 | Sparkline (7275:13323) | `Sparkline` (fed to `KpiTile chart={…}`) | charts `/sparkline` | T0 | S | v0.2 |
| 03 | Area Chart (7275:13336) | `AreaChart` | charts `/area-chart` | T0 + 0.6 KB island | S+C | v0.2 |
| 03 | Bar Chart (7275:13387) | `BarChart` (SVG rects, niced domain) | charts `/bar-chart` | T0 + island | S+C | v0.2 |
| 03 | Donut Chart (7275:13455) | `DonutChart` (max 3 categories + Other; centre label swap) | charts `/donut-chart` | T0 + island | S+C | v0.2 |
| 03 | Progress Bar (7275:13526) | `ProgressBar` (`kind="progress\|meter"`) — **core** (settled 6) | react `/progress-bar` | T0 | S | v0.1 |
| 03 | Progress Ring (7275:13545) | `ProgressRing` (SVG arc via attributes) — **core** | react `/progress-ring` | T0 | S | v0.1 |
| 04 | Delta (7275:13743) | `Delta` (trend from sign, `polarity`, sr-only phrase) | react `/delta` | T0 | S | v0.1 |
| 04 | Card (7275:13757) | `Card` parts (tone, padding, elevation, `LinkOverlay`) | react `/card` | T0 | S | v0.1 |
| 04 | KPI Tile (7275:13780) | `KpiTile` (+ `Metric`, `NumberValue`) | react `/kpi-tile` | T0 | S | v0.1 |
| 04 | Insight Card (7275:13829) | `insight-card` pattern on `Card` + `Button` | registry | Reg | S | v0.2 |
| 05 | Product Card (7275:13989) | `product-card` (`publication` + `availability`, not `status`; gap-b C2.1) | registry (commerce) | Reg | S | v0.3 |
| 05 | Variant Option (7275:14018) | core `ChoiceGroup`/`ChoiceChip` (native radios) + `variant-picker` pattern | react `/choice-group` + registry | T0 / Reg | C | v0.2 / v0.3 |
| 05 | Product Row (7275:14040) | `product-table` on core `Table` + `TableSelection` | registry | Reg | S+C | v0.3 |
| 05 | Order Row (7275:14091) | `order-table` on core `Table` + `StatusBadge` maps | registry | Reg | S | v0.3 |
| 05 | Discount Card (7275:14130) | `discount-card` (ProgressBar `kind="meter"` + `CopyButton`) | registry | Reg | S+C | v0.3 |
| 05 | Payment Method (7275:14174) | `payment-method` on core `ChoiceCard` | registry | Reg | C | v0.3 |
| 05 | Shipment Tracker (7275:14195) | `shipment-tracker` on core `Steps` (`<ol>`, `aria-current="step"`) | registry + react `/steps` | Reg / T0 | S | v0.3 / v0.2 |
| 05 | Plan Card (7275:14284) | `plan-card` on `Card` (`featured`, not `Tier`) | registry | Reg | S | v0.3 |
| 06 | Nav Item (7275:14700; live 755:658) | `NavItem` (`render` link, `aria-current`, `count`) | react `/app-shell` | T0 | S | v0.1 |
| 06 | Sidebar (7275:14732; live 755:869) | `AppShell`, `Sidebar` parts; collapse leaf + cookie; off-canvas = Drawer below 40rem | react `/app-shell` | T0 + T2 | S+C | v0.2 |
| 06 | Search Field (7275:14764; live 755:888) | `SearchField` (`<search>` + `type=search`); `CommandTrigger` (v0.3) | react `/search-field` | T0 | C | v0.1 |
| 06 | Tab (7275:14781; live 755:961) | `TabNav` (links: "underline tabs switch views") v0.1; `Tabs` (panels) v0.2 | react `/tab-nav`, `/tabs` | T0 / T1 | S / C | v0.1 / v0.2 |
| 06 | Segment (7275:14797; live 755:982) | `SegmentedControl` (native radio group: "segmented control switches ranges") | react `/segmented-control` | T0 | C | v0.1 |
| 07 | Toast (7275:15071) | `Toaster` + `toast()` (store, `popover="manual"`, F8, outlet into modal) | react `/toast` | T2 | C | v0.1 |
| 07 | Alert (7275:15091) | `Alert` (tone info/success/warning/critical, `live`, dismiss leaf) | react `/alert` | T0 | S+C | v0.1 |
| 07 | Banner (7275:15120) | `Banner` (tone; `media` slot; dismiss + persistence adapter) | react `/banner` | T0 | S+C | v0.1 |
| 07 | Modal (7275:15139) | `Dialog`, `AlertDialog` (`role="alertdialog"`, no outside dismiss, initial focus on Cancel) | react `/dialog` | T2 (native) | C | v0.1 |
| 07 | Empty State (7275:15168) | `EmptyState` (`headingLevel`; `Context` axis becomes doc recipes) | react `/empty-state` | T0 | S | v0.1 |
| 07 | Skeleton (7275:15181) | `Skeleton` + every component's `status="loading"` | react `/skeleton` | T0 | S | v0.1 |
| 08 | Mobile Tab Bar (7275:18747; ghost 764:3482) | `MobileTabBar` (links + `aria-current`; "More" opens a Sheet) | react `/app-shell` | T0 + T2 | S+C | v0.2 |
| 10 | Collection Circle (7275:19802) | `collection-circle` + `story-ring` | registry (storefront) | Reg | S | v0.3 |
| 10 | Shoppable Post (7275:19815) | `shoppable-post` (single link; CTA visible on focus as well as hover) | registry | Reg | S | v0.3 |
| 10 | Product Tag (7275:19846) | `product-tag` on core `unstable/hotspot` (disclosure + `popover`, 0–1 coordinates) | registry + react `/unstable/hotspot` | Reg / T2 | C | v0.3 |
| 10 | Tagged Product (7275:19862) | `tagged-product` (toggle button `aria-pressed`) | registry | Reg | S+C | v0.3 |
| 10 | Storefront Bar (7275:19889) | `storefront-bar` on `TopBar` + `SearchField` + `IconButton` (container query, not a `Platform` prop) | registry | Reg | S | v0.3 |

### 8.2 Ghost-only masters (M-A)

| Ghost (id) | Nizivo | Package | Tier | RSC | Rel |
|---|---|---|---|---|---|
| Tooltip (746:262) | `Tooltip` (`popover="manual"`, 400 ms delay, instant on focus, Esc, hoverable) | react `/tooltip` | T2 (break-glass RAC adapter) | C | v0.1 |
| Date Range Picker (746:267) | `DateRangePicker` (presets + RangeCalendar, `commit="apply"`) | react `/unstable/date-range-picker` | T1 (RAC RangeCalendar, lazy) | C | v0.3 |
| Funnel (751:319), Heatmap (751:393) | `FunnelChart` (`<ol>`), `Heatmap` (`<table>`) | charts | T0 | S | v0.3 |
| Revenue Card (752:385) | `trend-card` (Metric + NativeSelect + AreaChart + Legend) | registry | Reg | S+C | v0.2 |
| Ranked List (752:444) | `ranked-list` (`<ol>` + ProgressBar) | registry | Reg | S | v0.2 |
| Customer Card (754:530), Order Summary (754:897) | `customer-card`, `order-summary` (Avatar, Stat, Money) | registry | Reg | S | v0.3 |
| Table Header ×2 (753:410, 753:599) | merged into core `TableHeader`/`TableHead`/`TableSortButton` | react `/table` | T0 | S | v0.2 |
| Store Switcher (755:663) | `WorkspaceSwitcher` (Menu with radio items) | react `/workspace-switcher` | T1 | C | v0.2 |
| Command Menu (755:889) | `CommandMenu` (native Dialog + RAC Autocomplete, lazy) + `/hotkeys` | react `/command-menu` | T1 | C | v0.3 |
| Top Bar (755:1031), Mobile Top Bar (764:3397) | `TopBar` parts (responsive by container query) | react `/app-shell` | T0 | S | v0.2 |
| Breadcrumb (755:998) | `Breadcrumb` (`<nav><ol>`, `aria-current`) | react `/breadcrumb` | T0 | S | v0.1 |
| Pagination (755:1007) | `Pagination` (links via `getHref`/`render`; buttons when client-driven) | react `/pagination` | T0 | S | v0.1 |
| Drawer (756:1001) | `Drawer`/`Sheet` = `DialogPopup placement="end\|bottom"`; non-modal pushes layout (gap-c) | react `/dialog` | T2 | C | v0.2 |
| Order List Item (764:3483) | `order-list` on core `DataView` + `List` | registry + react `/data-view` | Reg / T0 | S | v0.3 |
| Post Badge (772:4419) | `post-badge` = `Badge` + brand glyph (only where the action goes to Instagram) | registry | Reg | S | v0.3 |
| Instagram glyph (772:4302) | `InstagramIcon` | icons `/brands/instagram` | T0 | S | v0.1 |
| Lucide icons (738:*, 74) | all Lucide icons, generated | icons | T0 | S | v0.1 |
| Brand/Logo (739:64) | **no core Logo** (Grove is demo branding, G21); `AppShell`/`Sidebar` take a `logo` element slot | — | — | — | v0.2 |

### 8.3 Foundations, lab and missing components (M-B)

| Item | Nizivo | Package | Tier | RSC | Rel |
|---|---|---|---|---|---|
| Text styles (18) | `Text` (constrained `as`: p/span/div/label), `Heading` (`level` 1–6, visual `variant` decoupled) | react `/text` | T0 | S | v0.1 |
| Elevation / Glass | `Surface` (`elevation` 0–4, `material="glass"` with `@supports`, `prefers-reduced-transparency` and forced-colors fallbacks) | react `/surface` | T0 | S | v0.2 |
| Grid / Container / Stack / Split (08) | `Stack`, `Inline`, `Grid`/`GridItem`, `Container`, `Split` | react `/layout` | T0 | S | v0.1 (Split v0.2) |
| AppShell, PageHeader | `AppShell`, `PageHeader` (actions collapse into a Menu below `sm`) | react `/app-shell`, `/page-header` | T0 | S | v0.2 |
| Text link "View all" | `TextLink` (`render` for router links; 24 px min target) | react `/text-link` | T0 | S | v0.1 |
| Avatar / StoreMark | `Avatar` (image, initials, `shape="square"`) | react `/avatar` | T0 | S | v0.1 |
| Kbd | `Kbd` (renders both platforms' glyphs; CSS picks via `data-nz-platform`) | react `/kbd` | T0 | S | v0.1 |
| Filter chips | `ChipGroup` (native checkboxes/radios styled as chips) | react `/choice-group` | T0 | C | v0.2 |
| Data table, toolbar, bulk bar | `Table` parts, `TableSelection`, `BulkActionBar`, `DataView`, `List` | react `/table`, `/data-view` | T0 + T2 | S+C | v0.2 |
| Disclosure / accordion | `Accordion` (`<details name>`) | react `/accordion` | T0 | S | v0.1 |
| Steps / setup checklist | `Steps` | react `/steps` | T0 | S | v0.2 |
| Image / media | `Image` (required width/height, `data-ratio`, `render`) | react `/image` | T0 | S | v0.1 |
| Stat, CopyButton, InlineError | `Stat`; `CopyButton` (client, polite "Copied"); `InlineError` | react | T0 / T2 | S / C | v0.2 / v0.1 |
| QuantityStepper, NumberField, Combobox, range Slider | own stepper (native number + 2 buttons); engine for the rest | react | T2 / T1 | C | v0.3 |
| Carousel, PageIndicator, StickyActionBar, Hotspot | `unstable/carousel` (scroll-snap), `PageIndicator`, `StickyActionBar`, `unstable/hotspot` | react | T0 / T2 | S / C | v0.3 |
| Popover (generic) | `Popover` (`popover="auto"` + anchor positioning; outside-press fallback below iOS 18.3) | react `/popover` | T2 | C | v0.2 |
| Motion specimens (09) | `CountUp` (v0.2), `Reveal`, `usePointerFx` (Tilt/Magnetic, v0.3); `Float` as a CSS recipe | react `/motion` | T2 (≤ 1 KB) | C | v0.2–v0.3 |
| Rays / Mesh shader (09, 10) | `ShaderSurface` + `presets/rays`, `presets/mesh` (server poster; one frame under reduced motion) | lab | — | S+C | v0.3 (0.x) |
| Liquid Glass, Parallax/Spotlight (09) | **not shipped** (Chromium-only, no design spec) | — | — | — | deferred |
| Hero, FeatureTile, ProfileCard (09) | `hero-section`, `feature-tile`, `profile-card` patterns | registry | Reg | S | v0.3 |

---

## 9. Phased roadmap

Team assumption: 2–3 engineers plus part-time design. Dates are targets, not commitments.

### v0.1: "Zero-JS core" (≈ 6 weeks; npm dist-tag `next`)

**Week 1 (de-risk, no components):**
- repo + tooling;
- OIDC publish rehearsal with a throwaway package (pnpm 12.11.2 + changesets/action v2, r4 §9.3);
- TokensBrücke export → normalizer → Terrazzo dry run, including typography sub-variable names (S-b 1);
- the S2 RSC fixture extended with the `engine.ts` hop;
- a hooks `Menu` prototype measured against the 39.6 KB baseline;
- Firefox runs of S1 and the D-spike.

**Scope.**

| Area | Exports |
|---|---|
| Tokens | full Figma set + code-owned tokens + a11y override file; `tokens.css`, `tokens.json`, `tokens.js`, `tailwind.css`, `custom-media.css` |
| Icons | all Lucide icons generated + `createIcon` + `brands/instagram` |
| T0 | Text, Heading, VisuallyHidden, Stack, Inline, Grid, Container, Button, IconButton, TextLink, Badge, Avatar, Kbd, Card, Delta, NumberValue, Metric, KpiTile, ProgressBar, ProgressRing, Skeleton, EmptyState, InlineError, Alert, Banner, Accordion, NavItem, TabNav, Breadcrumb, Pagination, SegmentedControl, NativeSelect, Image |
| Forms (client leaves) | Field, Fieldset, Form, SubmitButton, Input, Textarea, Checkbox, RadioGroup, Switch, SearchField |
| T2 | Dialog, AlertDialog, Tooltip, Toaster/`toast()`, ThemeScript (server-only) |
| T1 | **Menu only** (hooks), plus break-glass RAC adapters for Dialog and Tooltip |
| Docs | Fumadocs: getting started (Next, Vite, Astro, React Router, TanStack Start), a page per shipped component from `*.example.tsx` + `api/*.json`. Storybook workshop internal |

**Exit criteria.** All are measurable, and all run in CI.
1. **Zero-JS proof:** in the Next 16.4 fixture, a page using only T0 components ships **0 bytes** of `@nizivo/react` client JS. The check scans client chunks for Nizivo markers, as S2's `measure.mjs` does.
2. **RSC exports:** namespace and flat imports from Server Components build under **Turbopack and webpack** (S2 pattern B + `engine.ts` hop); the directive guard, exports drift, publint and attw are green.
3. **Accessibility:** axe `wcag22aa` reports zero violations on every story in light, dark, forced-colors and reduced motion; the contrast matrix passes over all permutations (with the override file); target-size tests pass in coarse-pointer mode.
4. **Overlay conformance** on Chromium, Firefox and WebKit, under React 19.2.x and 19.3.x: N-01…N-04 and O-01, O-03, O-06, O-10, O-11, O-12, O-15, O-17, O-20, O-21, O-22. The break-glass RAC Dialog and Tooltip adapters pass the same set.
5. **Budgets enforced by `size-limit`:** each own leaf ≤ 1 KB; Field+Form ≤ 2.5 KB; Dialog ≤ 3 KB; Tooltip ≤ 2 KB; Toast ≤ 3.5 KB; Menu ≤ 42 KB; `tokens.css` ≤ 5 KB. A budget may only rise with a labelled PR.
6. **SSR:** the SSR suite reports no hydration warnings in the Next, Vite SSR and Astro fixtures. CSP Profile B shows zero violations on T0 stories and own overlays.
7. **Release:** 0.1.0 published through OIDC with provenance and an SBOM attestation.

### v0.2: "App shell + data" (≈ +6 weeks)

- **Charts:** `@nizivo/charts` (ChartFrame, Sparkline, Area, Bar, Donut, Legend, island).
- **Data:** Table parts + TableSelection + BulkActionBar + DataView/List; Steps; ChoiceGroup/ChoiceCard/ChipGroup; Surface (glass); FileUpload; CountUp; CopyButton; Stat.
- **Engine and overlays:** `Select` (hooks), `Tabs` (hooks), `Popover` (own), `Drawer`/`Sheet` (native dialog), `WorkspaceSwitcher`.
- **Shell:** AppShell, Sidebar (rail + off-canvas), TopBar, MobileTabBar, PageHeader, Split.
- **Registry v0:** overview-dashboard, resource-index, trend-card, ranked-list, insight-card, and the data-table (TanStack v9) block.
- **Intent/idle-loaded engine surfaces** for Menu and Select. The trigger stays a small leaf, and the engine chunk loads on pointer-enter/focus/idle. This ships only if the Next fixture shows lower TBT/INP with no conformance regression.
- **Exit:** the dashboard fixture page meets its measured budget, with CLS 0 across `status` transitions (gap-b C5).

### v0.3: "Commerce, storefront, power features" (≈ +8 weeks)

- **Features:** CommandMenu + `/hotkeys` + CommandTrigger; `unstable/date-range-picker` (lazy RangeCalendar); Combobox; NumberField; QuantityStepper; PasswordInput; range Slider; `unstable/hotspot`, `unstable/carousel`; PageIndicator; StickyActionBar; Funnel and Heatmap.
- **Registry:** commerce and storefront patterns.
- **Lab:** `@nizivo/lab` 0.x (ShaderSurface, Rays, Mesh).
- **Locales:** catalogs for the locales Neev names.
- **Quality:** Argos VR replaces in-repo screenshots; Guidepup NVDA and VoiceOver nightly, non-blocking.
- **Ops:** the Figma webhook relay.

### v1.0: "Stable contract"

- **Design prerequisites:** ghosts relinked (G1); G9 states delivered (focus, disabled, error, loading) for all shipped sets; a rendered dark pass (G4) signed off; breakpoint `lg` and sidebar widths confirmed; `spring()` parameter order confirmed.
- **Accessibility:** override file reduced to dated stragglers or empty; screen-reader jobs green for 30 days and then blocking; external a11y audit.
- **Contract:** API freeze; CSS-contract and API manifests locked; `@nizivo/codemod` with `deprecations/all`.
- **Platform review:** customizable select (Firefox), `closedby` and `overlay` (Safari), `popover="hint"`. Each native swap is evaluated behind its adapter.
- **Governance:** LTS and deprecation policy (r5).

### Explicitly deferred

- A Motion-library adapter.
- three.js / R3F (r6: 130–244 KB; R3F pins React < 19.4).
- Liquid glass.
- `@nizivo/css` split (until a non-React consumer appears).
- vanilla-extract/Panda authoring.
- Shipping React Compiler output (r1 D2).
- Non-React ports.
- Data-table virtualization beyond the registry block.
- An RTL visual-regression matrix, unless Neev declares RTL a v1 requirement.
- Code Connect (needs an Organization plan, S-d).
- A 12 px text style.
- A `full` motion override.

---

## 10. Risks, mitigations and what to verify next

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| 1 | **Own native overlays hit edge cases** (iOS scroll lock, Firefox exit timing, focus return, `::backdrop` variables) | Medium / medium | Conformance N-/O- tests on three engines; **break-glass RAC adapters for Dialog and Tooltip are kept green**, so falling back is one line in `engine.ts`; D-spike already covered the core mechanics in Chromium and WebKit |
| 2 | **Hooks-altitude effort** (collection mapping, own DOM) overruns a small team | Medium / medium | v0.1 ships one engine widget (Menu). RAC components are allowed inside any adapter as the fallback (same family; measured cost 51.3 vs 39.6 KB for Menu). Build-vs-measure checkpoint in week 1 |
| 3 | **The engine core lands on most admin pages anyway** (row menus everywhere), shrinking the lean advantage to the hooks delta | High / low | Intent/idle loading in v0.2 moves ~40 KB off the critical path, measured by TBT/INP in the Next fixture; budgets make regressions visible |
| 4 | **Firefox is unverified** for S1, S2 and the D-spike (it would not launch in the sandbox) | Medium / high | Firefox lanes are mandatory before v0.1 exit (week 1 task); the spec and MDN predict the same behaviour |
| 5 | **Two scroll-lock writers** on `<html>` (the CSS `:has` lock + react-aria's counter for engine modal popovers) | Low / medium | The CSS lock writes no inline style, and react-aria saves and restores inline styles only, so they do not fight; test O-10 covers nested Select-in-Dialog. If iOS needs JS locking (N-03), add a ~0.4 KB own touch guard to Dialog rather than importing react-aria into it |
| 6 | **Native modal + engine popup layering**: a page-level engine popup can paint under an unrelated open top-layer element (tooltip, toast, non-modal popover) | Low / low | Tooltips close on pointer-leave/Esc; non-modal popovers light-dismiss on outside press; toasts are intentionally on top; O-01/O-03/O-12 tests. Later experiment: show engine popups with `popover="manual"` too (we own the DOM), unifying on the top layer |
| 7 | **Spring parameter order** `spring(mass, stiffness, damping, velocity)` is assumed (S-b 7) | Medium / low | One-line generator change; design confirmation is a v0.1 week-1 ask |
| 8 | **Token pipeline:** TokensBrücke output may fail Terrazzo strict validation; typography sub-variable names are unknown | Medium / medium | Week-1 dry run; the normalizer absorbs format differences; font token names stay placeholders until then |
| 9 | **Design debt** (ghosts, missing states, dark mode never rendered, a11y failures) | High / medium | The override layer with expiry, the `unstable/` lane, and `design/design-backlog.md` as one consolidated list (G9); v1.0 is gated on design, v0.x is not |
| 10 | **CSP:** react-aria injects `<style>` and SSRs inline styles in some hooks | Medium / low | Own DOM avoids `VisuallyHidden`/`HiddenSelect`/`DismissButton`; `touch-action` lives in our CSS; a `csp-nonce` meta recipe; Profile B guaranteed for T0 and own overlays only |
| 11 | **Figma file ownership** (Pro vs Starter; an individual's MCP identity) | Medium / high | Move the file to a Neev-owned paid team before publishing or automating (critique §5); the extractor sits behind an adapter |
| 12 | **Pre-1.0 tooling** (tsdown 0.23, pnpm 12 rewrite, Changesets 3, Terrazzo 2.x) | Medium / medium | Exact pins; Renovate approval for minors; unbundled output keeps tsc/bunchee as fallbacks; golden-file tests on tokens |
| 13 | **Consumers expect a "batteries-included" Select everywhere** and find NativeSelect's Firefox picker off-brand | Medium / low | Docs decision guide; engine `Select` from v0.2; identical trigger skin; the collapse gate is documented |

**Verify next, in order:**
1. **Firefox:** rerun S1 (`light-dark()` nesting), S2 (RSC builds don't depend on the browser) and the D-spike (cancel interception, in-dialog popover, `:has(dialog:modal)`).
2. **Real iOS Safari 17.5 and 18.x:** `:root:has(dialog:modal)` scroll lock under touch, `popover="auto"` outside-tap fallback, and the cancel-intercepted exit.
3. **RSC fixture with the `engine.ts` hop** (S2 pattern B plus one more directive-free re-export) under Turbopack and webpack.
4. **Hooks Menu adapter, built for real:** measure own-DOM overhead over 39.6 KB; confirm the collection walk from Server-Component children; run axe and keyboard tests.
5. **Toast outlet into a native modal** with React re-portalling: tests O-06, O-08 and N-02, and screen-reader announcement count (O-09).
6. **`light-dark()` inside shadow lists** (`--nz-elevation-*`) and inside `::backdrop` in WebKit 17.5/18.x.
7. **Terrazzo dry run** on a real TokensBrücke export, including typography and partial permutations, with `only.modifiers` plus `exclude`.
8. **`clip-path` draw-in and `non-scaling-stroke` dashes** on SVG in Safari (r6 risk 2).
9. **OIDC publish rehearsal** with pnpm 12.11.2 through changesets/action v2.
10. **Design confirmations:** the Button default (`secondary`), the breakpoint `lg`, sidebar widths 264/72 vs 248/76, the Option A text ladder, and toast persistence for actions.
