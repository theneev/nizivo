# Nizivo UI: architecture proposal, swappability-first (layered contracts)

Date: 2026-10-14. Lens: **swappability-first / layered contracts**. Inputs: critique `docs/research/00-critique.md`, research digest and r1–r8, Figma digest and pages 00–10, gap reports A/B/C, and the spike artifacts.

**About the spike evidence.** `scratchpad/spikes/REPORT.md` does not exist. Every spike verdict below was read from the raw artifacts, and one was re-run:

| Spike | Artifact read | What it shows |
|---|---|---|
| S1 Lightning CSS / `light-dark()` | `spikes/s1-lightningcss/matrix-results.json`, `matrix-varinside-results.json`, `out.*.css` | 84-row browser matrix (Chromium 156.0.8078.4, WebKit 27.2). Firefox did not launch in the sandbox (re-tried today: same failure), so Firefox is UNVERIFIED |
| S2 RSC namespace compounds | `spikes/s2-rsc/app/build-*.log`, `app/app/*/page.jsx`, `lib/src/**`, `lib/dist/**` | Next 16.4.0 builds with Turbopack and webpack |
| S3 Terrazzo | `spikes/s3-terrazzo/terrazzo.*.config.mjs`, `out/*.css` | Terrazzo 2.8.0 permutations, a `light-dark()` transform, plugin-tailwind vs a custom plugin, compiled with Tailwind 4.3.3 |
| S3 Style Dictionary | `spikes/s3-sd/` | **Nothing was run** (dependencies installed only). No Style Dictionary result is claimed |
| S4 spring → `linear()` | `spikes/s4-spring/spring.mjs`, `spring-results.json`, `check-css.mjs` | Own solver vs Motion 14.2.0. `check-css.mjs` re-run today: "ALL 12 linear() strings valid" in Chromium 156 and WebKit 27.2 |

---

## 1. Summary and thesis

**Thesis.** "Plug in or plug out later" is true only where three things exist together:
1. a **written contract**, as a file in the repo;
2. a **machine check** that fails when an implementation breaks the contract;
3. a **known price**, in bytes and in team hours.

Nizivo should have exactly the seams that pass that test, and no others. A seam without a check is a promise nobody keeps. A seam without a realistic second implementation is complexity with no payoff. This proposal therefore keeps 16 seams and drops or defers 15 (§3.1). For each one it gives the contract file, the check, the swap procedure and the cost.

**The architecture in one paragraph.** Figma variables arrive as a raw snapshot from any extractor. One normalizer turns that into a DTCG 2025.10 source. Terrazzo, behind a golden-file test, turns the source into token outputs whose only public surface is the `--nz-*` semantic names. The theme mechanism (`light-dark()` today, duplicated blocks as a compat output) is a property of that token file alone: component CSS contains no theme logic, and a stylelint rule enforces this. Component CSS is a separate framework-neutral layer. Its public surface (layers, `nz-*` classes, `data-slot`, one `data-*` vocabulary, `--nz-<component>-*` hooks) is extracted into a committed manifest and semver-diffed in CI. React components sit on top. Each behaviour family reaches its engine (React Aria by default) through one adapter file and a one-line `engine.ts`, and every adapter must pass an engine-agnostic conformance suite. Heavy modules (charts, motion, lab, icons) are separate packages that meet core only through element slots. Domain compositions (commerce, storefront, dashboard templates) ship later as consumer-owned registry items, generated from the same example sources the docs render.

**What the spikes changed.** These results overturn sketches in the reports:
1. **S2.** Building a namespace (`export * as Dialog`) from a `'use client'` file **fails the Next 16.4 build** in both Turbopack and webpack: "Element type is invalid … got: undefined". Building it from a **directive-free** `*.parts.ts` that re-exports `'use client'` leaves works. This corrects r3 §8.6 and r8 §6.1, and closes S-b 4.
2. **S1.** Native `light-dark()` inside unregistered custom properties nests correctly in Chromium and WebKit. With no `color-scheme` on `:root`, it resolves to light even under OS dark, so the non-intrusive default works. Lightning CSS's lowering of `light-dark()` for Safari 16.4 **breaks nested scopes**, and with no root scheme it renders transparent. Registering colour tokens with `@property` also breaks nesting. Consequences: the floor is Safari 17.5 for `light-dark()`, Lightning CSS must never lower it, and older browsers get a separately generated blocks file.
3. **S3.** Terrazzo emits clean partial blocks only with `only.modifiers` **plus** an `include`/`exclude` glob. The stock `plugin-tailwind` dereferences aliases to **primitives** (`--color-bg-surface: var(--nz-p-neutral-0)`), so Tailwind utilities would ignore nested themes. A ~20-line custom plugin emits `var(--nz-bg-surface)`, which Tailwind 4.3.3 compiles into utilities that follow scopes.
4. **S4.** One closed-form solver at a 0.1% settle band with adaptive sampling gives:
   - `spring(1,260,24,0)`: **493 ms**, 3.02% overshoot, 19 points, 224 bytes;
   - `spring(1,170,26,0)`: **702 ms**, no overshoot, 18 points, 211 bytes.

   For comparison, Motion's generator says 600 ms for the first spring. All strings are valid CSS in Chromium and WebKit.

**Explicit change to what the user was told.** The import becomes **`import { Button } from "@nizivo/react/button"`**, or `from "@nizivo/react"` through the root barrel. It is **not** `@nizivo/ui`.
- The core binding is named for its framework so that `@nizivo/tokens` (and later a published `@nizivo/css`) can stay framework-neutral and a future non-React binding has an obvious name (C1).
- Nothing is published yet, so the rename costs nothing today.

**v0.1 publishes three npm packages:** `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons`.

**The v0.1 tracer bullet** goes through every seam with about 20 component families:
- server-safe Button, IconButton, Badge, Card, Delta, KpiTile, ProgressBar, Skeleton, EmptyState and layout primitives;
- the Field system with native controls;
- three React Aria-backed families: Select, Dialog and Tooltip, each with its conformance suite;
- a Next 16 RSC fixture and a Vite fixture.

Charts, motion, the data table, dates, the command menu and the registry follow in v0.2 and v0.3 (§9).

---

## 2. Decision table

Evidence keys: **r1–r8** research reports (section), **C/S/G** critique ids, **GA/GB/GC** gap reports A/B/C (section), **S1–S4** spikes (artifact paths above), **F** Figma page report or token snapshot.

### 2.1 Open decisions D1, D3–D15

| # | Choice | Rationale (evidence) | How to reverse later | Blast radius if reversed |
|---|---|---|---|---|
| **D1** Behaviour engine + seam | **Native-first T0 + React Aria** (`react-aria-components` ^1.22.1, `react-aria` ^3.53.1 hooks) as the **only** T1 family. T2 own code (Toast on RAC hooks, FileUpload, disclosure nav). **Seam, per component:**<br>• `<c>.contract.ts`: public, engine-free types plus the `XEngine` interface.<br>• `engine.ts`: a one-line `export * from '../_engines/react-aria/<c>.client'`.<br>• Public `*.client.tsx` leaves own classes, `data-slot` and hooks. Adapters own only behaviour and state mapping.<br>• `packages/testkit/<c>.conformance.ts` runs per engine.<br>• Lint (`no-restricted-imports` + dependency-cruiser): only `_engines/**` may import `react-aria*`; a packed-`.d.ts` grep for `react-aria` must return 0. | • r3 §3.2 (measured gz): dashboard set RAC 69.0 vs Base UI 88.3 vs Radix 42.9 (with gaps); full set 104.0 vs 149.4; two engines (Radix + Base UI combobox) 97.4 > RAC overlay set 88.7.<br>• RAC is the only stable family covering combobox, number field, sheet and calendar. GA §1.4: Base UI has **no calendar**.<br>• 36 locales; documented AT matrix (r3 §6). Seam design from r3 §8.1–8.8 and r8 §5.4.<br>• **Seam cost:** state mapping (`stateAttrs`) + one `I18nProvider` per compound root (GB §A3), estimated ≤ 0.5 KB gz shared (measure in v0.1). Build-time selection adds 0 bytes (r3 §8.1). | 1. Write `_engines/base-ui/<c>.client.tsx` against `<c>.contract.ts`.<br>2. Run the testkit with that alias.<br>3. Compare `size-limit`.<br>4. Flip `engine.ts` one family at a time.<br>5. Changeset **minor**: "engine changed, no API change" (r3 §8.8, r8 §8.2). | **Consumers:** none if the suite passes; subtle AT differences go in the changelog.<br>**Nizivo:** `_engines/**` only, plus:<br>• the date picker (Base UI has no calendar, so own grid work, GA §4.8);<br>• locale strings (RAC catalogues no longer free, GB §A9);<br>• CSP profile notes (engine inline styles differ, GB §B1.2). |
| **D3** Package topology, naming, distribution | **npm-first hybrid.**<br>• **Published:** `@nizivo/tokens` (L0, framework-neutral), `@nizivo/react` (L1+L2, per-component subpaths, re-ships the CSS), `@nizivo/icons`. Then `@nizivo/charts` and `@nizivo/motion` (v0.2), and `@nizivo/lab` (independent 0.x, when needed).<br>• **Not published yet:** component CSS lives in a private workspace package `packages/css` (future `@nizivo/css`) and is copied into `@nizivo/react/dist/css`.<br>• **Shell** (Sidebar, TopBar, MobileTabBar, AppShell) is core: `@nizivo/react/shell`.<br>• **Domain kits** (commerce, storefront, dashboard templates, data-table wiring) become **shadcn-compatible registry items** generated from `patterns/**` (v0.3). No `@nizivo/dashboard/commerce/social/dates/blocks` npm packages.<br>• **Core name `@nizivo/react`, not `@nizivo/ui`.** | • C1 verdict: r8's framework-neutral tokens and future `@nizivo/css` fit plug-in/plug-out best.<br>• r4 §6.1: each package needs a hand-made trusted-publisher entry, and there is no scope-wide OIDC, so keep the count small.<br>• C12: registry for thin compositions (r8 E1–E7), shell in core (06 §6.2).<br>• pnpm's strict `node_modules` would make a `@nizivo/css` import a phantom dependency, so `@nizivo/react` re-ships the CSS. | • **Name:** pre-publish, free. Post-publish, add a `@nizivo/ui` re-export package (one more trusted publisher) plus a codemod.<br>• **CSS:** set `private:false` on `packages/css` and add it to the fixed group. Additive.<br>• **Registry → npm:** graduate a pattern into `@nizivo/react` (or `@nizivo/commerce`) and codemod the local import away. | • **Rename after 1.0:** every import (codemod).<br>• **CSS publish:** none.<br>• **Pattern graduation:** consumers who forked the item keep their copy. |
| **D4** Styling details | **Authoring and outputs:**<br>• Plain CSS + Lightning CSS. **Targets equal the support floor**, and a CI guard fails if `--lightningcss-light` appears in any output.<br>• The authoring tool is hidden behind the output contract.<br><br>**Hooks:**<br>• Component hooks are **hand-written** `--nz-<c>-<prop>[-<state>]`, read with a fallback and never assigned.<br>• Private variables use `--_nz-*`.<br>• The public hook list is **extracted from the CSS** into `contracts/api/**` and semver-diffed.<br>• No generated DTCG component tier in 0.x.<br><br>**Unstyled and Tailwind:**<br>• Unstyled = CSS-file granularity (`css/core.css` + chosen `css/<c>.css`). No per-instance `unstyled` prop in 0.x.<br>• Tailwind v4: a generated `tailwind.css` maps `--color-nz-<group>-<name>: var(--nz-<group>-<name>)` under `@theme inline`, produced by a ~20-line custom Terrazzo plugin. | • r2 §4.1–4.6; r8 §6.3–6.6.<br>• C7: `--_nz-` avoids clashing with consumers' `--_`.<br>• S1: lowering breaks nested scopes and renders transparent without a root scheme.<br>• S3: stock plugin-tailwind dereferences to primitives; the custom plugin compiled with Tailwind 4.3.3 emits `var(--nz-bg-surface)` (`out/tw-out.custom.css`).<br>• A generated component tier adds a second source of truth for hooks Figma does not have (C7, r7 §6.3). | • **Authoring swap** (vanilla-extract, Panda `cssgen`): build-only, accepted when the manifest diff is 0 and VR is clean.<br>• **Component tier:** add `code-owned/component/*.tokens.json` and a generator that emits the **same** hook names. Minor.<br>• **`unstyled` prop:** additive minor (context on client compounds, per part on server ones, r8 §6.6). | • **Authoring:** none.<br>• **A hook rename:** major for consumers using it, softened by `var(--new, var(--old))` aliases for one minor (r8 §8.3). |
| **D5** Token pipeline | **Source and build:**<br>• DTCG 2025.10 source split into `figma-owned/**` (normalizer output only) and `code-owned/**`, plus a resolver with `theme`, `motion` and `viewport` modifiers.<br>• **Terrazzo 2.8.0**, exact pin, behind `packages/tokens/build/` (the adapter), with **golden-file tests on every output**. Theme blocks use `only.modifiers` + `include`/`exclude` (S3).<br><br>**Extractors** (one raw format, one `normalize.ts`):<br>• TokensBrücke 3.18.0 → PR into `figma/raw/**` (primary);<br>• MCP `use_figma` snapshot dump, human-triggered (secondary);<br>• manual export (fallback).<br><br>**Code-owned tokens:** breakpoints, layers/z, scrim, focus halo, elevation ring and highlight, spring-derived durations, touch target, a11y overrides (§7.6).<br><br>**Drift:** `LIBRARY_PUBLISH` webhook → issue; nightly `/meta` check; CI invariant `normalize(raw) === figma-owned`; token diff comment; override drift, redundancy and expiry checks (GC §3.4). | • r7 §5–8. S-d: no Organization or Enterprise plan, so no Variables REST and no Code Connect.<br>• S3 (verified): `tokens.only-sets.css` and `tokens.scoped-include.css` give clean theme-only and motion-only blocks; `variableName` yields `--nz-bg-surface` (C8).<br>• Style Dictionary 5.6.1 has no resolver support (#1590, r7 §3.2). The S3-SD spike did not run, so no SD claim is made. | • **Builder → Style Dictionary:** write an SD config that reproduces the golden files. Theme permutations must be hand-rolled (r7).<br>• **Extractor → REST** (if the plan becomes Enterprise): a new adapter writing the same raw snapshot.<br>• **Code-owned → Figma-owned:** move the file and delete the code entry once design adds the variable. | **Consumers:** none (outputs are byte-compared).<br>**Nizivo:** `packages/tokens/build/**` or `figma/raw/**` only. |
| **D6** Theme mechanism | **Mechanism:**<br>• `light-dark()` in **one** `:root` block, generated by a resolver-reading transform (S3 `tokens.lightdark.css`).<br>• Colour tokens are never `@property`-registered.<br><br>**Default and attributes:**<br>• **Opt-in default:** no `color-scheme` on `:root`, so the page renders light. `<html data-nz-theme="system\|light\|dark">` sets `color-scheme`.<br>• Motion: `prefers-reduced-motion` **or** `[data-nz-motion="reduce"]` swaps motion tokens. There is **no `full`** override.<br><br>**Scopes:**<br>• Nested theme scopes are free.<br>• Brand: `[data-nz-brand]` files in `@layer nz.themes` override primitives and re-declare aliases.<br>• Inverse: `data-nz-scheme="inverse"` (Toast, Tooltip, Card `tone="inverse"`) flips `color-scheme` (GC §2.6).<br><br>**Dark elevation** (GC §2.3):<br>• floating surfaces use n850 (`bg/surface-raised`);<br>• `--nz-elevation-ring` white 8%;<br>• dark shadows at ×6 alpha;<br>• the highlight token is transparent.<br><br>**Component CSS contains no theme logic.** stylelint bans `light-dark(`, `prefers-color-scheme` and `[data-nz-theme` outside `packages/tokens`. **`tokens.blocks.css`** (duplicated blocks, same names) ships in v0.2 as the compat output. | • S1 (verified, Chromium + WebKit):<br>  – native nesting `d1=D, d1-l2=L, d1-l2-d3=D`;<br>  – no root scheme resolves to L under OS dark;<br>  – `@property` breaks nesting;<br>  – the lowered output breaks nesting.<br>• r2 §4.3: library embedded in existing apps, so non-intrusive (C9).<br>• C9b: no `full`, out of respect for the OS setting.<br>• GC §2: dark elevation. | • **To OS-dark by default:** add `color-scheme: light dark` to `:root` in the tokens output (one line).<br>• **To blocks:** import `tokens.blocks.css` instead of `tokens.css`. Component CSS is unchanged by construction.<br>• **Attribute name:** a token-build setting. | • **Default flip:** light-only host apps start seeing dark. A behaviour change, so major after 1.0.<br>• **Mechanism swap:** token file only. |
| **D7** Support floors | • **Browsers:** Chrome/Edge ≥ 123, Firefox ≥ 128 (ESR), Safari/iOS ≥ 17.5. Set by `light-dark()`; also covers `@starting-style`, `linear()`, `:has()` and container queries.<br>• **Popover:** `popover="manual"` for Toast only, feature-detected, with a `position: fixed` fallback.<br>• **Above-floor features** only as progressive enhancement behind `@supports`: anchor positioning, `field-sizing`, customizable select.<br>• **Runtime:** React `^19.2.0` (lab `^19.3.0`); Node ≥ 22.12 for tooling. | • Critique S-c: web-features 3.42.0 (`light-dark` Safari 17.5; `popover` iOS 18.3).<br>• GC row 3: the iOS 18.3 gap is **light dismiss only**; manual popovers work on 17.5.<br>• S1: lowering is not a viable fallback.<br>• r1 D1. | • **Lower to Safari 16.4:** make `tokens.blocks.css` the default and accept instant overlay entry (no `@starting-style`).<br>• **Raise:** each raise unlocks a native adapter behind `engine.ts` (r3 §6.1). | • **Lowering:** tokens default file + motion polish.<br>• **Raising:** additive. |
| **D8** Overlay + layering | **The GC §1.4 model:**<br>• **L1:** every portaled overlay shares one band (`--nz-z-overlay: 1000`) and is ordered by DOM/open order.<br>• **L2:** nested overlays portal into the parent popup's positioner.<br>• **L3:** Toast is the **only** top-layer citizen (`popover="manual"`, re-promoted; fallback `--nz-z-toast: 1100`).<br>• **L4:** chrome uses `--nz-z-raised 1`, `--nz-z-sticky 100`, `--nz-z-chrome 200`.<br><br>**Shared mechanics:**<br>• `--nz-bg-scrim`: light n900 @ 32%, dark #000 @ 60%.<br>• Scroll lock: only the engine's.<br>• Focus-return chain.<br>• `onOpenChange(open, {reason})` with `'hidden'` for Activity closes.<br>• Toast reachable over a modal through F8.<br>• Conformance O-01…O-25. | • C17: no engine uses the top layer (r3 grep).<br>• GC §1.3 (EMPIRICAL): RAC exempts `[data-react-aria-top-layer]` from inert.<br>• whatwg #9936: a native modal inerts toasts.<br>• Fixed per-type scales break nesting (C17). | Native `<dialog>`/`popover` adapters behind `engine.ts`, one component at a time, once GC §1.4's four blockers clear. O-08 and O-16 are the gates. | **Overlay adapters only.** Backdrop CSS keeps `.nz-dialog-backdrop` as an element; the native adapter must render that element (not style `::backdrop`) to keep the CSS contract. |
| **D9** Residual config | **No required provider.**<br><br>**Optional client `NizivoConfig`:**<br>• fields: `locale`, `labels`, `portalContainer`, toast defaults;<br>• **no `direction`** (GB #3).<br><br>**Server-safe parts:**<br>• take `locale` (default `'en-US'`; never `navigator.language` in render);<br>• every date formatter needs an explicit `timeZone`.<br><br>**React Aria adapter:** wraps each compound root in `EngineLocale` → `I18nProvider`.<br><br>**Strings and values:**<br>• Built-in strings: per-instance `labels` prop → config `labels` → English defaults. Catalogues at `@nizivo/react/locales/<tag>`; `formatLabel()` ~0.2 KB.<br>• Format once, where the value first renders.<br>• Dates cross the RSC boundary as ISO strings. | • C16 + settled 8.<br>• GB §A3 (PRIMARY source): RAC SSRs `en-US`, then switches to the browser locale after hydration.<br>• GB §A4: Node vs browser `formatRange` mismatch reproduced.<br>• GB §A2: 0.2 KB measured. | • **Remove config:** no-op for server parts.<br>• **Add a provider-only feature later:** additive.<br>• **Change the default locale:** a token of the build, but it alters SSR text. | **Locale default change:** every SSR snapshot changes. Major. |
| **D10** Responsive + layout | **Queries:**<br>• Components use **container queries** on their parts, never on themselves.<br>• Page layout uses viewport `@custom-media` built from code-owned breakpoints:<br>  – `--nz-bp-sm: 40rem`, from the designer's "Below 640px…";<br>  – `md` (64rem) and `lg` (80rem) are **provisional**: `$extensions.status: "provisional"`, outside semver until design confirms (settled 11).<br><br>**Core layout primitives:** Stack, Inline, Grid, Container, Split, PageHeader, Section.<br><br>**Shell in `/shell`:** AppShell, Sidebar, TopBar, MobileTopBar, MobileTabBar.<br><br>**Sidebar width:** the Figma-owned `--nz-layout-sidebar` (264 / 72 / 0 by viewport mode). The 248/76 frames go to design; changing them is a **value edit only**.<br><br>**Nav:** parts first. A config-driven nav (one serializable `items` array feeding Sidebar, TabBar and CommandMenu) is a registry `app-shell` pattern.<br><br>**DataView:** Table ↔ List swap by container query at `sm` (GA §3.8). | • C11: only 640 is designer-backed.<br>• r2 §4.8: viewport for page tokens, `@container` for parts; container size queries are Widely Baseline.<br>• 08 §6.3: content swaps.<br>• C11: sidebar conflict unresolved. | • **Breakpoint values:** token edits (visual minor; md/lg are already provisional).<br>• **Container → viewport for one component:** CSS only.<br>• **Graduate config nav to core:** additive. | **Shell CSS only.** |
| **D11** Chart internals | `@nizivo/charts` (v0.2). **Dependencies:** `d3-shape` + `d3-array` only.<br><br>**Scales:**<br>• own linear, band and point scales behind a **structural `ScaleLike`** interface (callable + `domain()` + `ticks()`), so d3-scale objects plug in unchanged;<br>• **time axis** for daily/weekly buckets: a point scale over ISO plain dates with every-Nth ticks plus a forced last tick (03);<br>• continuous irregular time goes through an opt-in `@nizivo/charts/d3` adapter (d3-scale `scaleTime`, 17.6 KB).<br><br>**Geometry:**<br>• percent-space SVG with `non-scaling-stroke` for lines and areas;<br>• **bars as SVG `<rect>` with % attributes**, not HTML `--v` (CSP Profile B, GB §B1.4);<br>• tick labels laid out by CSS grid, no per-label inline style.<br><br>**Draw-in:** `clip-path: inset()` keyframes, off under reduced motion.<br><br>**Frame and interaction:**<br>• `ChartFrame` (figure, caption, server data table, legend, `status` contract) plus a **renderer child** seam;<br>• `ChartInteraction` island ~0.6 KB.<br><br>**RTL:** axes don't mirror by default (`xDirection`). | • r6 §2.2–2.8 (measured): own AreaChart 3.2 KB vs 10.4 KB with d3-scale; Recharts 3 SSR emits no SVG.<br>• GB §B1.1 (EMPIRICAL): SSR `style` is blocked under strict CSP; SVG attributes survive.<br>• GB §A6.4: RTL policy.<br>• C14: time-axis hole. | • **Renderer:** put Recharts, ECharts or uPlot inside `ChartFrame`.<br>• **Scales:** pass d3 scales.<br>• **Draw-in:** switch to `pathLength` after Safari QA. | **Charts package only.** |
| **D12** Motion details | **One generator.**<br>• The **own closed-form damped-oscillator solver** in the token build (S4 `spring.mjs`).<br>• **Settle band:** ±0.1% of travel.<br>• **Sampling:** adaptive RDP, ε = 0.004.<br><br>**Output pairs:**<br>• `--nz-easing-spring` + `--nz-duration-spring` (493 ms);<br>• `--nz-easing-spring-soft` + `--nz-duration-spring-soft` (702 ms);<br>• JS physics export for `@nizivo/motion`.<br><br>**Duration rule:**<br>• a spring easing is used only with its paired duration, and only on `transform`/`scale`/`translate` (stylelint);<br>• Reduced mode: easing → `linear`, spring durations → 0 ms; fades stay ≤ 160 ms (Figma Reduced values).<br><br>**Libraries and packages:**<br>• CSS-first plus tiny hooks (`usePointerFx` 0.48 KB, `CountUp` 0.5 KB) in `@nizivo/motion`;<br>• Motion 14 only as an optional-peer adapter `@nizivo/motion/motion`;<br>• Lab stays separate (0.x); liquid glass is not shipped.<br><br>**Parameter order** `(mass, stiffness, damping, velocity)` is **assumed** and needs designer confirmation. | • C10: four sets of numbers today; one generator is required.<br>• S4 (verified): 0.1% settle = 492.3 ms → 493 ms, 3.02% overshoot, max error 0.0037; 702 ms, 0%, max error 0.0039. Motion: "600ms" (done at 554 ms). `check-css.mjs`: 12/12 strings valid.<br>• r6 §3: Motion 44.2 KB; SSR `opacity:0` trap. | • **Threshold/ε:** regenerate (visual minor).<br>• **Generator → Motion's:** replace one function; golden values change (visual). | **Animation timing only.** |
| **D13** Icons & media | **`@nizivo/icons`**, generated from pinned `lucide-static` 1.56.0 (SVGO 4 + own template):<br>• one ESM module per icon, server-safe;<br>• `viewBox 0 0 24 24`, **`strokeWidth` 1.92** (= 1.6 px at 20 px), size 20, `currentColor`;<br>• `aria-hidden` unless `title`;<br>• `data-mirror="rtl"` on a curated directional subset;<br>• `createIcon()` for custom icons;<br>• the full Lucide set is generated (zero bundle cost; per-icon subpaths plus a barrel);<br>• brand glyphs at `/brands` from simple-icons (CC0) with usage notes;<br>• `LICENSE` carries the ISC and Feather MIT notices.<br><br>**Core:** imports no icon package; at most 10 internal glyphs (list in §6.3).<br><br>**`Image`** (server-safe):<br>• a plain `<img>` with width/height;<br>• `data-ratio` presets instead of inline `aspect-ratio`;<br>• `render={<NextImage/>}` to use a framework image. | • Settled 7.<br>• r6 §6 (lucide-react 2.6 KB per 10 icons).<br>• S1-critique: 1.92.<br>• GB §A6.2–A6.3 (mirroring), §B1.3 (no inline style), §B5.1 (notices). | • **Use another icon set:** pass it into the slots (no change).<br>• **Regenerate from another source:** same names → no break. | **Icons package only.** |
| **D14** Toolchain & governance | **Build:**<br>• pnpm 12.11.2 workspaces + catalogs (11.28.x fallback);<br>• Turborepo 2.11;<br>• tsdown 0.23.1 unbundle (exact pin, shared preset).<br><br>**TypeScript:**<br>• `@typescript/native` (TS 7.0.2) for `tsc --noEmit`;<br>• oxc `.d.ts` via `isolatedDeclarations`;<br>• `typescript` aliased to `@typescript/typescript6` 6.0.2 for API tools (ts-morph manifest, ESLint parser).<br><br>**Lint:**<br>• oxlint 1.88 (type-aware, jsx-a11y, react);<br>• a **narrow ESLint 10 job** running only `eslint-plugin-react-hooks` 7 compiler rules;<br>• stylelint for the CSS contract (§6.4).<br><br>**Visual regression:** Vitest 5 browser `toMatchScreenshot` in a pinned Playwright Docker image for v0.1–0.2; Argos Pro from v0.3.<br><br>**Licence:** recommend Apache-2.0 + TRADEMARKS.md + DCO. This is a **user/legal decision**; MIT is an acceptable fallback.<br><br>**Versioning:**<br>• Changesets 3.0.3;<br>• `fixed: [[tokens, react, icons, charts, motion]]`;<br>• `@nizivo/lab` independent 0.x.<br><br>**Release:** r4's split jobs, with `id-token` only on the publish job. | • r4 §2–9; r5 §2–11.<br>• C20: the alias resolves r1's need for react-hooks rules.<br>• C21: r4 wins.<br>• C19: lab independent.<br>• C22: licence. | • **tsdown → tsc/bunchee:** unbundled output, so no consumer impact (r4 §6.5).<br>• **Linters:** swap once TS 7.1 ships an API.<br>• **VR vendor:** stories are CSF3 + Vitest, so vendors swap (r5 §15).<br>• **Licence:** cheap before the first external contribution; afterwards it needs contributor consent. **Decide before opening the repo.** | • **Tooling:** none for consumers.<br>• **Licence:** legal. |
| **D15** A11y remediation | **Figma first, with a time-boxed code override file in the token source.**<br>• Files: `code-owned/a11y/{primitives,light,dark}.overrides.tokens.json`, applied last in the resolver.<br>• Each entry records `figmaVariable`, `figmaValueAtOverride`, `wcag`, `issue`, `approvedBy` and `expires`.<br>• CI: contrast matrix over all permutations, plus drift, redundancy and expiry checks.<br>• Release gate: no stable publish with an AA miss.<br>• A public "Deviations from Figma" page lists every live override.<br><br>**Fixes:** GC §3.2, text ladder **Option A** (§7.6).<br><br>**Focus:** 2 px outline (settled 12).<br><br>**Target size:**<br>• primary coarse pointer: `::after` with `inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2))` on **both axes**;<br>• opt-in `data-nz-touch-targets="always"`.<br><br>**Type floor:** no 12 px style; lint a 14 px floor in rem. | • G19.<br>• GC §3 (all pairs recomputed).<br>• Corrects S2, S3 and S5. | • **Override entries:** removed by the redundancy check when Figma catches up.<br>• **Text ladder:** switch to Option C (values only). | **Visual only.** |

### 2.2 Gaps G11–G20

| # | Choice | Rationale (evidence) | How to reverse later | Blast radius |
|---|---|---|---|---|
| **G11** Forms | **Pieces:**<br>• **`Field`** is a server-safe, sync shell: `useId`, label and description from props.<br>• It wraps children in a **`FieldScope.client`** leaf (context + error slot).<br>• Controls are thin client leaves with complete SSR HTML.<br><br>**Validation:**<br>• Native validation stays on; `validateOn="submit"` by default.<br>• One error channel: `error` prop ?? `Form errors[name]` ?? native message.<br>• Optional client `Form`; `SubmitButton` (`useFormStatus`); `Fieldset` (server).<br>• `aria-describedby`, not `aria-errormessage`.<br><br>**Libraries:**<br>• No XField wrappers.<br>• RHF / TanStack Form / Conform are **docs recipes only**.<br>• `useFieldControl()` hook for third-party controls. | GA §2 (D16):<br>• `react-server` exports `useId`, not `useState`/`useContext` (EMPIRICAL);<br>• `invalid` delivery through React 19.3 (EMPIRICAL). | • **Add XField conveniences:** registry → npm, additive.<br>• **Engine-native Field:** rejected; it would lock Field to the engine (GA §2.8). | None. |
| **G12** Data tables | **Core:**<br>• **Native `<table>` server parts** in core (`/table`, 0 KB).<br>• One `TableSelection.client` island with form-based selection.<br>• `BulkActionBar`.<br>• Sort/filter/pagination through **URL `render` links**.<br>• `DataView` container-query swap.<br><br>**Registry only:** TanStack Table v9 + TanStack Virtual.<br><br>**Rejected:** RAC `Table`. | GA §3 (D17):<br>• RAC Table adds +29.0 KB gz and uses `role=grid`;<br>• `content-visibility` does nothing on `<tr>` (spec). | **RAC / AG Grid tables:** registry adapters; core is unchanged. | None. |
| **G13** Dates/time | **Public type:** ISO plain-date strings, never `Date`.<br><br>**Internals:**<br>• `@internationalized/date` 3.12.4 as an explicit dependency of the date entries;<br>• no Temporal polyfill;<br>• `timeZone` required with relative presets.<br><br>**Packaging and cost:**<br>• `@nizivo/react/unstable/date-range-picker` with a lazy calendar chunk (+21.4 KB);<br>• the Figma shape has no `DateInput` (−7 KB). | GA §4 (D18):<br>• BCD: Temporal is `preview` in Safari;<br>• polyfill 19.3 KB vs 5.8 KB. | **Internals → Temporal:** a patch (the public type is a string). | None. |
| **G14** i18n/RTL | **Strings:** `labels` prop + config + catalogues; `formatLabel()` 0.2 KB.<br><br>**Formatting:** `Intl` with explicit locale and time zone, formatting once.<br><br>**RTL:**<br>• logical properties only (`stylelint-use-logical`);<br>• `data-mirror` + `scale: -1 1` under `:dir(rtl)`;<br>• charts don't mirror by default;<br>• `dirOf()` helper.<br><br>**Testing:** a 10-locale + 2-pseudo matrix; RTL VR (~220 shots) from v0.3.<br><br>**Docs:** RAC `optimize-locales-plugin` (−4.8 KB). | GB Part A:<br>• formatter mismatch reproduced;<br>• RAC locale flip (source);<br>• locale bytes measured. | **ICU MessageFormat:** a later adapter; plural objects convert mechanically (GB §A2). | Catalogues only. |
| **G15** Overlay conformance | The `testkit` overlay suite GC §1.10 **O-01…O-25**, run per engine on Chromium, Firefox and WebKit under React 19.2 and 19.3 with Strict Mode on. v0.1 subset: O-01, 03, 04, 10, 11, 12, 15, 17, 20, 21, 22. | • C17.<br>• S-b 5 (O-06) is the gate for the toast-over-modal model. | — | — |
| **G16** Dark elevation | Two tonal levels + ring + ×6 shadows (D6 row). Dark `bg/subtle` = new n925. Dark borders shift one step. | GC §2: Material/Apple tonal grid; Radix ring. | Retune the ring alpha or the multiplier: token values. | Visual. |
| **G17** Security / supply chain | **CSP:**<br>• two **CSP profiles**: A (default; `style-src-attr 'unsafe-inline'` + nonces) and B (strict; the server-safe set);<br>• server-safe parts emit **no `style` attribute** (lint);<br>• `.nz-visually-hidden` is a class;<br>• Nizivo injects no `<style>`.<br><br>**DOM sinks:** none. `ThemeScript` is the server-only exception, with `nonce` and a published SHA-256. Trusted Types fixture.<br><br>**Provenance and SBOM:**<br>• `pnpm sbom` CycloneDX;<br>• `actions/attest@v4`, on the publish job only.<br><br>**Dependencies:**<br>• caret ranges for engine dependencies;<br>• pnpm `minimumReleaseAge 4320`, `trustPolicy`, `blockExoticSubdeps`, `allowBuilds {}` (verify the keys on pnpm 12);<br>• licence allowlist; GSAP ban; tarball content allowlist.<br><br>**Registry:** immutable `/r/v{x.y.z}/` URLs, a SHA-256 manifest and an item-policy linter.<br><br>**Assets:** an `ASSETS.md` provenance ledger; **no Figma raster image ships**.<br><br>**Instagram media:** through an app-side proxy. | GB Part B: CSP matrix (EMPIRICAL, Chromium 156 / WebKit 27.2); RAC injection behaviour (source). | **Profile B coverage:** grows as adapters replace engine inline styles. | — |
| **G18** Hotkeys / command menu | • Own `CommandMenu` on the engine (RAC Autocomplete + SearchField + Menu in Modal, +4.7 KB, lazy).<br>• Hotkeys: a `tinykeys` 4.0.1 module registry (1.0 KB), no provider.<br>• `Kbd` is server-safe and renders both glyph sets, switched by `data-nz-platform`.<br>• cmdk rejected. | GA §5 (D19): cmdk bundles Radix Dialog (a second engine); stale since 2025-03. | **Hotkeys:** swap the matcher behind `registerHotkey()`. | None. |
| **G19** A11y ownership | RACI (GC §3.4):<br>• the design-system designer is accountable for values;<br>• the a11y owner is responsible for the matrix;<br>• CODEOWNERS on `code-owned/a11y/**` needs both. | GC §3.4. | — | — |
| **G20** Loading/empty/error | **The contract**, on every data-display component:<br>• `status: 'ready'\|'loading'\|'empty'\|'error'` + `pending` + `empty`/`error` slots;<br>• the **Suspense fallback is the same component with `status="loading"`**;<br>• the library never fetches or suspends.<br><br>**Attributes and a11y:**<br>• `data-loading`, `data-pending`, `data-empty`, `data-error`;<br>• `aria-busy` + static hidden text; no live region in skeletons.<br><br>**Parts:** `InlineError`, `EmptyState`. Islands fail closed. A ±1 px geometry test across states. | GB Part C. | **A separate Skeleton export per widget:** rejected (it drifts). | — |

---

## 3. Layer architecture

```
                 ┌──────────────────────────────────────────────────────────────────────────┐
 CONSUMER        │ E0 theme · E1 restyle · E2 recompose · E3 re-skin · E4 fork  (§3.4)       │
                 └───────▲───────────────────▲───────────────────────▲──────────────────────┘
                         │ imports            │ copies (shadcn CLI)    │ CSS vars / attrs
 L7 DISTRIBUTION   npm: @nizivo/tokens · @nizivo/react · @nizivo/icons · (charts, motion, lab)
                   registry (v0.3): /r/v{x.y.z}/*.json  ← generated from patterns/** + examples
                         │                     ▲ registry items import PUBLIC @nizivo/* entries only
 L6 HEAVY MODULES  @nizivo/charts · @nizivo/motion · @nizivo/lab · @nizivo/icons
                   ── meet core ONLY via element slots (chart={<Sparkline/>}, leadingIcon={<Icon/>})
                         │
 L5 COMPONENTS     @nizivo/react/<c>: parts (*.client.tsx | server .tsx), props, render, slots,
                   labels, status, details   ── CONTRACT: <c>.contract.ts + contracts/api/react/<c>.json
                         │ internal import only (`./engine`)
 L4 BEHAVIOUR      _engines/react-aria/*.client.tsx · _engines/native/* · _engines/own/*
    ADAPTERS       ── CONTRACT: XEngine interface + vocabulary + testkit/<c>.conformance.ts
                         │ the ONLY modules allowed to import react-aria*
 L3 CSS CONTRACT   packages/css → @nizivo/react/{styles.css, css/core.css, css/<c>.css}
                   ── CONTRACT: contracts/layers.css · contracts/vocabulary.json · contracts/api/css/*.json
                         │ reads only --nz-* semantic tokens + own --_nz-* privates
 L2 TOKEN OUTPUTS  @nizivo/tokens/{tokens.css | tokens.blocks.css, tailwind.css, tokens.json, contract.json, index.js}
                   ── CONTRACT: contract.json (required semantic names) + golden files
                         │ THEME STRATEGY lives here and only here (light-dark() | blocks)
 L1 TOKEN BUILD    packages/tokens/build/ (Terrazzo 2.8 config + 4 plugins) · scripts/spring.ts
                   ── CONTRACT: DTCG 2025.10 source + nizivo.resolver.json
                         │
 L0 DESIGN SOURCE  Figma "Grove UI Library" ──(extractor adapter)──► figma/raw/** ──normalize.ts──► figma-owned/**
                   code-owned/** (breakpoints, layers, scrim, springs, a11y overrides)

 BESIDE THE STACK  testkit (conformance) · fixtures/* (tarball installs) · apps/workshop (Storybook)
                   · apps/docs (Fumadocs; renders *.example.tsx) · contracts/ (semver'd surface, CI-diffed)
```

**Dependency rules** (dependency-cruiser + `no-restricted-imports` in CI, r8 §11.5):
- L5 imports L4 only through `./engine`.
- Only L4 imports `react-aria*`.
- No JS imports CSS (r1 D7, r4 §6.3).
- L6 imports no L5 internals; `@nizivo/charts` imports nothing from `@nizivo/react` at all (structural types only).
- Registry sources import only `@nizivo/*` public entries.
- Nothing outside `packages/tokens` contains theme logic (stylelint).

### 3.1 Seam ledger: what is kept, what is dropped, and the price of each

**Kept seams.** The cost is the steady-state price; "est." means estimated until the v0.1 build measures it.

| # | Seam | Contract file | Machine check | Runtime cost | Team cost | Realistic 2nd implementation |
|---|---|---|---|---|---|---|
| K1 | Design source → repo (extractor) | `figma/raw/**` snapshot schema (TokensBrücke format) | `normalize(raw) === figma-owned` invariant | 0 | `normalize.ts` | MCP dump, manual export, REST (if Enterprise) |
| K2 | Token builder | DTCG source + resolver | Golden-file tests on every output | 0 | 4 small Terrazzo plugins | Style Dictionary 5.6.1 |
| K3 | Token names (the theme API) | `@nizivo/tokens/contract.json` | Tokens diff; consumer-theme validator in testkit | 0 | — | Any brand file, any consumer `:root` block |
| K4 | Theme strategy | "Component CSS has no theme logic" | stylelint ban; S1 matrix fixture | `light-dark()` saves bytes vs blocks (r1 risk: blocks ≈ 2× colour CSS) | One extra permutation config (verified S3) | `tokens.blocks.css` |
| K5 | CSS contract (layers, classes, `data-slot`, vocabulary, hooks) | `contracts/layers.css`, `vocabulary.json`, `api/css/*.json` | Manifest diff → changeset classification; VR | 0 | Extractor script (Lightning CSS visitor) | Re-skinned consumer CSS; vanilla-extract/Panda authoring |
| K6 | CSS authoring tool | Output contract (K5) | Manifest diff = 0 + VR | 0 | 0 | vanilla-extract, Panda `cssgen` (r2 §4.1) |
| K7 | Behaviour engine, per family | `<c>.contract.ts` + `XEngine` | `testkit/<c>.conformance.ts` per engine; `.d.ts` grep | est. ≤ 0.5 KB gz shared (`stateAttrs`, `EngineLocale`, details mapping) | One adapter file per family | Base UI, native, own |
| K8 | Composition (`render` + element slots) | `_contracts/render.ts` | Render-merge conformance; RSC fixture | est. ~0.4 KB gz (`renderElement` + `mergeProps`, server-safe) | — | Router links, `NextImage`, Motion elements |
| K9 | Heavy modules | Slot props typed `ReactNode` | dependency-cruiser: core never imports charts/icons | 0 | — | Recharts in `ChartFrame`, any icon set |
| K10 | Chart renderer + scales | `ChartFrame` child; `ScaleLike` | Chart conformance (data table, keyboard) | 0 | — | Recharts/ECharts/uPlot; d3-scale |
| K11 | Strings / locale | `XLabels` types; `formatLabel` | Catalogue lint (plural categories); locale-determinism test | 0.2 KB measured (GB §A2) | Catalogues | Any app i18n stack passing strings (GB §A2) |
| K12 | Form library | Control props (`name`, `value`, `onValueChange(v, details)`, `onBlur`, `ref` → focusable, `error`, `ids`) | Recipe tests (RHF/TanStack/Conform) | 0 | Docs recipes | Any form library |
| K13 | Variant augmentation | `@nizivo/react/augment` interface maps | expect-type test across subpath + barrel | 0 (types) | — | Consumer `declare module` + CSS |
| K14 | Distribution channel | Registry item policy; items import public entries | Item-policy linter; fixture `shadcn add` install | 0 | `shadcn build` in docs CI (v0.3) | npm graduation |
| K15 | Docs / workshop / VR vendor | `*.example.tsx` plain modules (r5 §2.1) | Both consumers build | 0 | — | Ladle, Argos ↔ Chromatic ↔ native |
| K16 | A11y overrides | `code-owned/a11y/*.overrides.tokens.json` | Drift/redundancy/expiry/contrast checks | 0 | One script | Figma fixes (the override deletes itself) |

**Dropped or deferred seams.** Each was cut because its price exceeds its value now.

| # | Seam | Decision | Price that justified the cut |
|---|---|---|---|
| X1 | Runtime engine registry or context | Dropped | Defeats tree-shaking and adds runtime cost (r3 §8.1) |
| X2 | Public headless `@nizivo/primitives` package | Dropped | A second public API to design and semver (r8 §5.2). L5 without CSS is already headless |
| X3 | One npm package per component | Dropped | ~50 trusted-publisher entries plus version skew (r4 §6.1, r8 §5.2) |
| X4 | Domain npm packages (`dashboard`, `commerce`, `social`, `dates`, `blocks`) | Dropped → registry / subpaths | A trusted-publisher entry each; thin compositions (C12); dates are subpaths (GA §4.7) |
| X5 | Per-instance `unstyled` prop | Deferred | Touches ~60 parts plus context; CSS-file granularity covers it; adding it later is a minor |
| X6 | Generated DTCG component-token tier | Deferred | A second source of truth for hooks Figma doesn't have (C7). Hooks are extracted instead |
| X7 | Runtime-configurable class or token prefix | Dropped | Impossible with zero-runtime CSS; the token prefix is a build setting (settled 5) |
| X8 | Publishing `@nizivo/css` now | Deferred | No non-React consumer yet. Flipping `private:false` later is additive |
| X9 | Router/Link/Image/Icon providers, `createCommerce()` factories | Dropped | They force `'use client'` on server parts (C16); factories break the namespace exports (GB §A2) |
| X10 | Form-library adapter packages | Dropped | A trusted publisher each, coupled to RHF 8 beta and TanStack Form 2 alpha (GA §2.8) |
| X11 | `LayerProvider` top-layer/z-index switch | Dropped | A required provider and a duplicated code path (GC §1.4) |
| X12 | Second engine for one widget | Dropped | 97.4 KB vs 88.7 KB (r3 §3.2) |
| X13 | Motion library in core | Dropped | 30–44 KB, and SSR leaves content at `opacity:0` (r6 §3) |
| X14 | Native top-layer overlay adapters | Deferred | Four blockers (GC §1.4) |
| X15 | Package-wide `#engine/*` import map as a single swap point | Deferred | Elegant, but tsdown unbundle handling of `imports` subpaths is UNVERIFIED; the per-component `engine.ts` is proven (r3 §8.2) |

### 3.2 The contract at each seam, and how to swap each layer

**L0/L1 Tokens (values, extractor, builder).**
- **Contract:** the DTCG source shape and the resolver modifiers (`theme: light|dark`, `motion: default|reduced`, `viewport: mobile|tablet|desktop`).
- **Swap token values (designer):**
  1. Edit Figma and publish.
  2. A webhook opens the "sync needed" issue.
  3. A TokensBrücke PR into `figma/raw/**` triggers `normalize`, then `tz check`/lint plus the contrast matrix, the build and golden diff, a token diff comment and VR.
  4. Merge and changeset: patch/minor labelled "visual" (r8 §5.5).
- **Swap the extractor:** write an adapter that emits the same raw snapshot, then run CI. Nothing downstream changes.
- **Swap the builder:**
  1. Add `build/style-dictionary/`.
  2. Make it reproduce every golden file (normalised whitespace).
  3. Flip the `build` script.
  4. Consumer impact: none.

**L2 Token outputs and theme.**
- **Contract:** `contract.json` lists every public `--nz-*` semantic name with its type, plus the layer it is emitted in.
- **Consumer: replace the whole theme.** Ship a CSS file that defines every name in `contract.json` inside `@layer nz.themes`, then run `npx -p @nizivo/tokens nz-check-theme ./my-theme.css`. The validator ships with the contract it checks: it parses the file, checks names against `contract.json` and runs the contrast matrix. No extra package.
- **Consumer: change the mechanism.** Import `@nizivo/tokens/tokens.blocks.css` (v0.2) instead of `tokens.css`.
- **Team:** add a brand by adding a resolver modifier context, which emits `brands/<name>.css`.

**L3 CSS contract.**
- **Contract:** the canonical layer statement, classes, `data-slot`, the vocabulary and hooks, all listed in `contracts/api/css/<c>.json`.
- **Swap the authoring tool:** rewrite the sources. CI requires that the CSS manifest diff equals 0 and that VR passes.
- **Consumer: re-skin one component (E3):**
  1. Import `css/core.css` plus the per-component files you keep.
  2. Copy `css/select.css` (or install the `select-css` registry item) into your layer.
  3. Edit it.

  The a11y floor (focus outline, hit target, forced-colours borders, visually hidden) lives in `nz.base` inside `core.css`, keyed on the stable classes, so it **survives the re-skin**.

**L4 Behaviour engine.** Use the r3 §8.8 procedure, made concrete:
1. Create `_engines/<engine>/<c>.client.tsx` implementing `XEngine`.
2. Run `pnpm testkit --engine=<engine> --component=<c>`. Vitest aliases `src/<c>/engine.ts` to that file and runs keyboard, axe `wcag22aa`, vocabulary, render-merge, SSR + hydrate (Next/Vite fixtures), RSC import and the overlay O-tests.
3. Compare `size-limit`.
4. Change the one line in `engine.ts`.
5. Write a changeset: minor, "engine changed".

**L5 One component.**
- **Team:** reimplement behind `<c>.contract.ts`, for example Select → native customizable select once Firefox ships it. Same conformance, minor release.
- **Consumer:** E1–E4 (§3.4), or replace the component entirely. Props mirror HTML and parts mirror APG, so call sites survive (r8 §5.5).

**L6 Heavy modules.**
- **Charts:** put another renderer inside `<ChartFrame>`, or pass d3 scales.
- **Motion:** the CSS tokens stay. Import `@nizivo/motion/motion` only if you want Motion.
- **Icons:** pass any `ReactNode`.
- **Lab:** optional peers, lazy-loaded.

**L7 Distribution.** A pattern exists once, in `patterns/**`, and is rendered by the docs and built into registry JSON.
- **Pattern → npm** (graduation: API unchanged for two minors and used in at least two products, r8 §12): move it into `@nizivo/react` and ship a codemod that rewrites the consumer's local import.
- **npm → registry:** "fork" items (E4) are generated from the same source.

### 3.3 Swap matrix (r8 §5.5 shape; spike-verified rows marked ✔)

| Swap | Where it happens | Consumer impact | Release |
|---|---|---|---|
| Token values (Figma edit) | `figma-owned/**` | Visual | patch/minor "visual" |
| Token name rename | Tokens + `$deprecated` alias (`--old: var(--new)`) | None during deprecation | minor → major |
| Theme mechanism `light-dark()` ⇄ blocks ✔ (S1, S3) | `tokens.css` vs `tokens.blocks.css` | Import line | none (both ship) |
| Builder Terrazzo ⇄ Style Dictionary | `packages/tokens/build` | None (golden files) | none |
| Tailwind adapter ✔ (S3) | Generated `tailwind.css` | Opt-in import | minor |
| CSS authoring | `packages/css` | None (manifest diff 0) | patch |
| Engine RAC ⇄ Base UI / native / own | `_engines/**`, `engine.ts` | None if conformance passes | minor |
| Namespace vs flat compound import ✔ (S2) | Consumer import style | Both work; namespace built in a directive-free module | — |
| One component's implementation | That component | None | minor |
| Chart renderer / scales | `ChartFrame` child / `ScaleLike` | Opt-in | — |
| Spring generator / threshold ✔ (S4) | `scripts/spring.ts` | Timing only | minor "visual" |
| Pattern registry ⇄ npm | `patterns/**` → package | Codemod | minor |
| Remove a component | Deprecate → remove | Codemod or fork item | minor → major |

### 3.4 Eject levels

| Level | The consumer does | Still receives from npm |
|---|---|---|
| **E0 Theme** | Overrides `--nz-*` semantic tokens in `@layer nz.themes` or unlayered CSS, or adds a brand file | Everything |
| **E1 Restyle** | `--nz-<c>-*` hooks, `className`, own CSS (unlayered beats every `nz.*` layer) | Everything |
| **E2 Recompose** | Builds from public parts, e.g. a registry pattern (`plan-card`, `select-field`) | Behaviour, a11y, component CSS, tokens |
| **E3 Re-skin** | Drops our `css/<c>.css`, owns a copy | Behaviour, markup, classes, vocabulary, the a11y floor in `nz.base` |
| **E4 Fork** | Full source including the adapter (registry `<c>-source`), labelled "no updates" | Tokens only |

E3 works only because JS never imports CSS and the selectors are semver'd (r8 §5.6). That is the main difference from a shadcn-only model.

---

## 4. Package map

**Budget rules (settled 13).** Every budget comes from a measurement plus 10%. Own-code numbers marked "target" are UNVERIFIED until the v0.1 build measures them; after that first build they become hard `size-limit` entries.
- **Engine numbers** are r3's method (esbuild, min+gzip, React external), with all RAC locales included: the worst case a consumer gets without `optimize-locales-plugin` (GB §A9).
- **Brotli budgets** in r4 §7.3 are replaced by gzip measured budgets (C23).

| Package | Purpose | Public exports (subpaths) | Dependencies / peers | Budget (gzip) | Versioning |
|---|---|---|---|---|---|
| **`@nizivo/tokens`** (v0.1) | L0 framework-neutral tokens: CSS, JSON, JS, Tailwind adapter | **CSS:**<br>• `./tokens.css`: `light-dark()`, all modifiers; the canonical `@layer` line first<br>• `./tokens.blocks.css` (v0.2 compat)<br>• `./brands/*.css` (later)<br>• `./tailwind.css` (`@theme inline` → semantic vars)<br><br>**Data:**<br>• `./tokens.json`: resolved DTCG + `$extensions.dev.nizivo` (Figma ids, deprecations)<br>• `./contract.json`: required public names<br>• `./figma/*.json`: Figma-importable modes<br><br>**JS:** `.` = typed name constants, `breakpoints`, spring physics; no runtime values needed<br><br>**bin:** `nz-check-theme` (validates a consumer theme against `contract.json` + contrast pairs)<br><br>`./package.json` | none | `tokens.css` raw size est. ~2–3 KB gz (estimate; measure at first build, then +10%). JS: tree-shaken constants | fixed group |
| **`@nizivo/react`** (v0.1) | L1 adapters (internal) + L2 components + re-shipped L3 CSS | **Components:**<br>• `.` root barrel (pure re-exports)<br>• `./<component>` (kebab, one per family: `button`, `icon-button`, `badge`, `card`, `delta`, `metric`, `kpi-tile`, `progress-bar`, `skeleton`, `empty-state`, `inline-error`, `layout`, `field`, `input`, `textarea`, `checkbox`, `radio-group`, `switch`, `select`, `dialog`, `tooltip`, …)<br>• `./shell` (v0.2), `./unstable/*`<br><br>**Utilities:**<br>• `./config`: optional client `NizivoConfig`<br>• `./augment`: types only<br>• `./i18n`: `formatLabel`, `formatNumber`, `dirOf`, server-safe<br>• `./locales/<tag>`<br>• `./theme-script`: server-safe `ThemeScript` with `nonce`<br><br>**CSS:**<br>• `./styles.css`: all-in-one<br>• `./css/core.css`: tokens + reset-free base + utilities<br>• `./css/<component>.css`<br><br>`./package.json` | **deps:** `react-aria-components` ^1.22.1, `react-aria` ^3.53.1 (caret ranges, so consumers dedupe; r3 §8.9)<br>**peers:** `react`, `react-dom` ^19.2.0; `@types/react` optional<br>`"sideEffects": ["**/*.css"]`, ESM-only | **Server-safe parts:** 0 KB client JS under RSC (r6 §2.5 pattern); SPA target ≤ 0.6 KB each.<br><br>**Shared helpers:** `renderElement` + `mergeProps` + `stateAttrs`, target ≤ 1 KB.<br><br>**Engine-backed (r3 §3.1/3.2, +10%):**<br>• Select ≤ 65.5 (59.5)<br>• Dialog ≤ 31 (28.1)<br>• Tooltip ≤ 16 (14.3)<br>• dashboard set ≤ 76 (69.0)<br><br>**Own:** Field + FieldScope target ≤ 2.5; each input leaf ≤ 1 (GA §8).<br><br>**CSS:** `styles.css` budget set at first build + 10% | fixed group |
| **`@nizivo/icons`** (v0.1) | Generated Lucide set + brand glyphs | • `.` barrel<br>• `./<icon-name>` (per-icon module; no directive)<br>• `./brands/<name>`<br>• `./create-icon`<br>• `./package.json` | **build-time only:** `lucide-static` 1.56.0 (pinned), `simple-icons` 16.35.0, SVGO 4<br>**peer:** `react` ^19.2.0 | ≈ 0.26 KB per icon (from lucide-react 2.6 KB / 10, r6 §6.1); 0 KB client when rendered by a Server Component | fixed group |
| **`@nizivo/charts`** (v0.2) | Server-first SVG charts | • `./frame` (ChartFrame, Legend, ChartTooltip, DataTable)<br>• `./sparkline`, `./area`, `./bar`, `./donut`, `./funnel`, `./heatmap`<br>• `./d3`: opt-in adapter, optional peer `d3-scale`<br>• `./styles.css`, `./css/*` | **deps:** `d3-shape` ^3.2.0, `d3-array` ^3.2.4<br>**peers:** `react` ^19.2.0<br>**No dependency on `@nizivo/react`** (structural types for `status`) | AreaChart ≤ 3.5 (3.2 measured); `ChartInteraction` island ≤ 0.7 (0.6); donut ≤ 3.2 (2.9) (r6 §2.2) | fixed group |
| **`@nizivo/motion`** (v0.2) | CSS-first motion helpers + tiny hooks | • `./count-up`, `./pointer-fx`<br>• `./springs`: JS physics from tokens<br>• `./motion`: adapter; optional peer `motion` ^14<br>• `./styles.css` | **optional peer:** `motion` | `usePointerFx` ≤ 0.55 (0.48); `CountUp` ≤ 0.55 (0.50) (r6 §3.2) | fixed group |
| **`@nizivo/lab`** (≥ v0.3, only when a consumer needs it) | Experimental: `ShaderSurface`, Rays/Mesh presets | • `./shader-surface`, `./presets/*`<br>• `./paper`: optional peer `@paper-design/shaders-react` `>=0.0.81 <0.1.0` | **peer:** `react` ^19.3.0 (r1 D1) | `ShaderSurface` ≤ 1.6 (1.4, r6 §4) | **independent 0.x** (C19) |
| `packages/css` (private; future `@nizivo/css`) | Authoring home of L3; built by Lightning CSS and copied into `@nizivo/react/dist/css` and `@nizivo/charts/dist/css` | — | `lightningcss` (dev) | — | — |
| `packages/testkit` (private) | Conformance suites, overlay O-tests, contract assertions | — | Vitest 5, Playwright, axe-core 4.14.0 (pnpm override) | — | — |
| `packages/tooling` (private) | tsconfig, tsdown preset (directive guard), oxlint/stylelint configs | — | — | — | — |
| Registry (v0.3, not npm) | `/r/v{x.y.z}/<item>.json` on the docs site | Items:<br>• `init`<br>• patterns (`plan-card`, `order-row`, `product-card`, `shipment-tracker`, `insight-card`, `trend-card`, `app-shell`, storefront set, `data-table`, `data-table-virtual`, page templates)<br>• re-skin items `<c>-css`<br>• forks `<c>-source` | Items depend on `@nizivo/*@~x.y.0` only (policy linter) | — | Generated per release |

**v0.1 publish count: 3.** Each needs one interactive 2FA trusted-publisher setup (r4 §9.3). A rehearsal on a throwaway package comes first (r5 §11.4).

---

## 5. Repo layout

```
nizivo/                                   (GitHub: <neev-org>/nizivo; slug is bound into npm trusted publishers)
├─ package.json                           private root; devEngines.packageManager pnpm@12.11.2
├─ pnpm-workspace.yaml                    catalogs; minimumReleaseAge: 4320; allowBuilds: {}; (+ trustPolicy, blockExoticSubdeps after pnpm-12 key check)
├─ turbo.json
├─ .changeset/config.json                 fixed: [[@nizivo/tokens, @nizivo/react, @nizivo/icons, @nizivo/charts, @nizivo/motion]]
├─ contracts/                             ◄ THE SEMVER'D SURFACE (human-reviewed, CI-diffed)
│  ├─ layers.css                          canonical @layer statement (single source; build injects it)
│  ├─ vocabulary.json                     global data-* + data-nz-* names/values/meanings → TS types, stylelint allowlist, docs page
│  └─ api/
│     ├─ react/<component>.json           generated (ts-morph on the TS6 alias): props, parts, defaults, details reasons
│     ├─ css/<component>.json             generated (Lightning CSS visitor): classes, data-slot, data-* used, public hooks read
│     └─ tokens.json                      generated: public token names + types
├─ packages/
│  ├─ tokens/                             @nizivo/tokens
│  │  ├─ figma/raw/**                     extractor output (TokensBrücke / MCP snapshot) — never hand-edited
│  │  ├─ src/figma-owned/**               normalize.ts output (DTCG 2025.10)
│  │  ├─ src/code-owned/
│  │  │  ├─ breakpoints.tokens.json       sm 40rem (designer); md/lg provisional
│  │  │  ├─ layers.tokens.json            z-raised/sticky/chrome/overlay/toast; bg/scrim
│  │  │  ├─ effects.tokens.json           elevation ring/highlight (dark ×6 shadows), focus halo
│  │  │  ├─ motion-derived.tokens.json    written by scripts/spring.ts (duration-spring pairs)
│  │  │  └─ a11y/{primitives,light,dark}.overrides.tokens.json   expiring, approved overrides (GC §3.4)
│  │  ├─ src/nizivo.resolver.json         sets + modifiers (theme, motion, viewport); overrides last
│  │  ├─ build/                           ◄ BUILDER ADAPTER: terrazzo.config.ts + plugins/{light-dark, tailwind-semantic, spring-linear, contract}
│  │  ├─ scripts/{normalize, spring, a11y-overrides-check, contrast-matrix}.ts, contrast-pairs.json
│  │  ├─ test/golden/**                   golden outputs (byte-compared)
│  │  └─ dist/                            tokens.css, tailwind.css, tokens.json, contract.json, index.js, index.d.ts
│  ├─ css/                                private — L3 authoring
│  │  ├─ src/{reset,base,utilities}.css   base = focus outline, hit target, forced-colors, visually-hidden
│  │  ├─ src/components/<component>.css
│  │  └─ build.ts                         Lightning CSS (targets = floor) + guards (no --lightningcss-*, layer line first, no theme logic)
│  ├─ react/                              @nizivo/react
│  │  ├─ src/_contracts/                  render.ts, merge-props.ts, state.ts (from vocabulary.json), details.ts, controllable.ts, labels.ts
│  │  ├─ src/_engines/
│  │  │  ├─ react-aria/<family>.client.tsx, locale.client.tsx   ◄ ONLY place importing react-aria*
│  │  │  ├─ native/…                      (T0 helpers: checkbox indeterminate, native-select)
│  │  │  └─ own/…                         (toast store + region, file-drop, disclosure-nav)
│  │  ├─ src/<component>/
│  │  │  ├─ <component>.contract.ts       public engine-free types (+ XEngine interface when engine-backed)
│  │  │  ├─ engine.ts                     ◄ SWAP POINT (one line)
│  │  │  ├─ <component>.tsx               server-safe parts (no directive)  — OR —
│  │  │  ├─ <part>.client.tsx             'use client' leaves (classes, data-slot, hooks wiring)
│  │  │  ├─ <component>.parts.ts          NO directive: namespace source (S2 rule)
│  │  │  ├─ index.ts                      NO directive: flat exports + `export * as X from './x.parts'`
│  │  │  ├─ <component>.labels.ts         English defaults
│  │  │  └─ <component>.example.tsx       plain-React examples = docs + stories + registry source
│  │  ├─ src/augment.ts, src/config/, src/i18n/, src/locales/<tag>.ts, src/unstable/<name>/
│  │  └─ tsdown.config.ts                 unbundle; entries src/index.ts + src/*/index.ts; exports generated + committed
│  ├─ icons/                              @nizivo/icons — generator/ (template, mirror.json, brand notes) + generated src/
│  ├─ charts/                             @nizivo/charts (v0.2)
│  ├─ motion/                             @nizivo/motion (v0.2)
│  ├─ lab/                                @nizivo/lab (independent 0.x)
│  ├─ testkit/                            conformance/<component>.conformance.ts, overlay/O-01…O-25
│  └─ tooling/                            tsconfig/, tsdown-preset/ (directive guard), oxlint/, stylelint-config/
├─ patterns/                              domain compositions (commerce, storefront, dashboard, app-shell, data-table) as *.tsx + *.css
│                                         → rendered in docs (v0.1+) → built into registry items (v0.3)
├─ apps/
│  ├─ docs/                               Fumadocs 16 (Next 16) — public docs, props tables from contracts/api, /r registry (v0.3)
│  └─ workshop/                           Storybook 10.6 react-vite (internal), CSF3 wrapping *.example.tsx
├─ fixtures/                              tarball installs: next-rsc (v0.1), vite-spa (v0.1), vite-ssr, astro, react-router-8, tanstack-start (v0.2), plain-html (CSS-only)
├─ design/component-map.json              Figma 7275:* AND 755:* ids → export + props map (C25)
├─ docs/{research, figma, adr}/
├─ ASSETS.md                              provenance ledger (GB §B5.2)
└─ .github/workflows/{ci.yml, release.yml}   release: split jobs, id-token only on publish (r4 §9.4)
```

**File convention (fixes C36).**
- `'use client'` appears only in `*.client.tsx` leaf modules.
- Server-safe modules have no suffix.
- `*.parts.ts` and `index.ts` never carry a directive.
- The r4 guard (src directive ⇔ dist directive) runs independently of naming.
- A second lint rule fails any `export * as` whose target module has a directive. This is the S2 trap.

---

## 6. Conventions with code sketches

### 6.1 The canonical `@layer` statement (settled 3: semver'd)

```css
/* contracts/layers.css — injected verbatim as the FIRST line of every CSS file Nizivo ships
   (tokens.css, styles.css, core.css, each css/<c>.css, charts and lab CSS). Re-declaring it is idempotent. */
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
```

This is r2 §4.2's order with two **reserved, initially empty** layers added. Adding them later would be additive, but reserving them now settles the order once.

| Layer | Holds | Why it is there |
|---|---|---|
| `nz.tokens` | Generated tokens: primitives, semantic aliases, modifiers, `color-scheme` switches | |
| `nz.themes` | Brand files, consumer themes written as `@layer nz.themes {…}`, `tokens.blocks.css` scopes | A theme wins over base tokens **regardless of import order**. Without it, `:root` and `[data-nz-brand]` on `<html>` tie on specificity and source order decides |
| `nz.reset` | Opt-in `reset.css` only | Components are reset-independent (r2 §4.2) |
| `nz.base` | **The a11y floor** keyed on stable classes: focus outline, coarse-pointer hit area, forced-colours borders, `scroll-padding` for sticky chrome and toasts | It survives an E3 re-skin |
| `nz.components` | One block per component | |
| `nz.patterns` | CSS of registry patterns (E2/E4 copies) | Pattern CSS overrides component CSS deterministically, while consumer unlayered CSS still wins |
| `nz.utilities` | `.nz-visually-hidden`, `.nz-tabular-nums`, `.nz-truncate` | |

**Tailwind recipe** (r2 §4.6). Nizivo nests under Tailwind's `components` layer, above preflight and below utilities:

```css
@import "tailwindcss";
@import "@nizivo/react/styles.css" layer(components);
@import "@nizivo/tokens/tailwind.css";   /* generated: --color-nz-bg-surface: var(--nz-bg-surface); …  (S3 custom plugin) */
```

### 6.2 The `data-*` vocabulary (one list, engine-independent: settled 4)

Rules:
1. **Native and ARIA first.** Server-safe native components style `:disabled`, `:checked`, `:focus-visible`, `[aria-current="page"]`, `[aria-expanded]` and `[aria-pressed="true"]` directly.
2. `data-*` is used when no native or ARIA state exists **on the element being styled**, or when Nizivo's meaning differs.
3. Every attribute is a **presence** attribute unless values are listed.
4. Adapters derive attributes from the engine's **render-state values** (for example RAC's `isEntering`, `isSelected`), **never by copying engine DOM attributes**. Engine attributes may also appear in the DOM, but no Nizivo CSS or docs reference them (r3 §8.3).

**Global state** (in `contracts/vocabulary.json`; emitted by `stateAttrs()`):

| Attribute | Values | Meaning | Emitted on | Source |
|---|---|---|---|---|
| `data-open` | — | Popup or disclosure is open | trigger, positioner, popup, panel | r2, r3 |
| `data-entering` / `data-exiting` | — | Enter/exit transition running; the element is kept mounted until it ends | popup, backdrop, toast | r3 (Base UI's `starting/ending-style` are mapped onto these) |
| `data-side` | `top\|right\|bottom\|left` | **Resolved physical** side; the API prop `side` accepts logical `start\|end` (GB §A6.1) | popup, arrow | r3 |
| `data-align` | `start\|center\|end` | Resolved alignment | popup | r3 |
| `data-highlighted` | — | Virtual focus within a collection | item | r2, r3 |
| `data-selected` | — | Selected item, tab, segment or toggle | item, tab, segment, row | r3 |
| `data-checked` / `data-indeterminate` | — | Checkbox-like state on non-native parts | menu checkbox item, select-all | r3 |
| `data-focus-visible` | — | Keyboard focus where `:focus-visible` can't apply (virtual focus) | item, day cell | r3 |
| `data-disabled` / `data-readonly` / `data-required` | — | Mirror of the attributes, on wrappers and parts | field, control, item | r3 |
| `data-invalid` | — | **An error message is currently presented**, not `:invalid` | field, control | GA §2.3 |
| `data-placeholder` | — | Select is showing its placeholder | select value | r3 |
| `data-orientation` | `horizontal\|vertical` | Composite orientation | tabs, segmented, separator | r3 |
| `data-loading` / `data-pending` / `data-empty` / `data-error` | — | Data lifecycle (G20); `data-pending` also on `Button pending` and `SubmitButton` | data-display roots, rows, buttons | GB §C2.2 |
| `data-mirror` | `rtl` | Flip in RTL via `scale: -1 1` under `:dir(rtl)` | directional internal glyphs, generated icons | GB §A6.3 |

**Variants:** `data-variant`, `data-size`, `data-tone`, plus a kebab-case attribute per variant prop (`data-full-width`, `data-padding`, `data-emphasis`, `data-layout`). The value set is the TS union, which is augmentable (§6.5).

**Component-local attributes.** These are semver'd per component manifest:
- `data-sort` (`<th>`), `data-interactive` (row), `data-presentation` (DataView), `data-collapsed` (Sidebar), `data-nested-open` (Dialog popup), `data-validate-on` (Field);
- calendar cells: `data-today`, `data-outside-month`, `data-unavailable`, `data-range-start`, `data-range-end`, `data-in-range`;
- `data-platform` (Kbd spans), `data-x-direction` (chart plot).

**Scope attributes** (`data-nz-*`, on ancestors or scope roots only):

| Attribute | Values | Set by |
|---|---|---|
| `data-nz-theme` | `light\|dark\|system` | App (`<html>`), any subtree |
| `data-nz-motion` | `reduce` | App (no `full`, C9b) |
| `data-nz-brand` | `<brand>` | App; brand file in `nz.themes` |
| `data-nz-density` | reserved (no values in 0.x) | — |
| `data-nz-scheme` | `inverse` | Toast, Tooltip, Card `tone="inverse"` |
| `data-nz-platform` | `apple\|other` | `ThemeScript` (Kbd) |
| `data-nz-touch-targets` | `always` | App opt-in (GC §3.6) |
| `data-nz-top-layer` | — | Toast region and live announcer (mapped by the adapter to RAC's exemption attribute) |

### 6.3 Class, slot and variable naming

| Thing | Rule | Example |
|---|---|---|
| Root class | `nz-<component>` (kebab, unhashed, fixed prefix) | `nz-kpi-tile` |
| Part class | `nz-<component>-<part>` | `nz-select-trigger` |
| `data-slot` | The class minus `nz-` | `data-slot="select-trigger"` |
| Semantic token | `--nz-<group>-<name>` from the Figma codeSyntax (settled 5) | `--nz-bg-surface`, `--nz-text-secondary`, `--nz-border-focus`, `--nz-space-4`, `--nz-radius-md` |
| Primitive (private) | `--nz-p-<hue>-<step>` | `--nz-p-green-700` |
| Public hook | `--nz-<component>-<prop>[-<state>]`; read, never declared by Nizivo | `--nz-button-bg-hover` |
| Private | `--_nz-<component>-<prop>`; set by variants and sizes only | `--_nz-button-bg` |
| Typography | `--nz-font-<style>` (composite `font` shorthand) + `--nz-tracking-<style>`; families `--nz-font-family-sans\|mono` | `--nz-font-label-m`, `--nz-tracking-heading-h1` |

The typography names are this proposal's scheme for the 18 Figma text styles. Terrazzo's typography output names are UNVERIFIED, so the `contract` plugin renames them if needed.

**Internal glyph list** (core imports no icon package; ≤ 10, GA §7): spinner, error mark, check, indeterminate dash, chevron (one glyph, rotated for sort, select and pagination), chevrons-up-down, close (×), eye/eye-off, plus/minus, calendar. Each is overridable through a slot prop.

### 6.4 Component CSS hooks: rules, and lints that enforce them

1. A hook is read as `var(--nz-<c>-<p>, var(--_nz-<c>-<p>))`. Variants and sizes set only `--_nz-*`. State rules set properties (r2 §4.4).
2. stylelint rules (in `@nizivo/stylelint-config`, also used for registry CSS):
   - no declaration of `--nz-<component>-*` inside `packages/css`;
   - token names must exist in `contract.json`;
   - logical properties only;
   - no `light-dark(`, `prefers-color-scheme` or `[data-nz-theme` outside tokens;
   - a `--nz-easing-spring*` value must sit in the same `transition`/`animation` as its paired `--nz-duration-spring*`;
   - `font-size` ≥ 14 px (expressed in rem);
   - every file starts with the canonical layer line.
3. **Per-state hooks** (`-hover`, `-pressed`) in 0.x only for Button, IconButton, Input, Select trigger, Card and NavItem (r2 §8 open question). Others get base hooks. Adding a hook later is a minor.
4. The CSS manifest records every hook. Removing one is a **major**; during deprecation the old one is aliased as `var(--nz-new, var(--nz-old, …))`.

### 6.5 Shared seam code (server-safe, no hooks)

```ts
// packages/react/src/_contracts/render.ts — NO directive. Used by server-safe and client parts alike.
import { cloneElement, createElement, isValidElement, type ReactElement } from 'react';
import { mergeProps } from './merge-props';                 // r8 §7.1: className concat, style merge, consumer-first handlers, ref merge

export type RenderProp<S> =
  | ReactElement                                             // element form: serializable from Server Components (react.dev)
  | ((props: Record<string, unknown>, state: S) => ReactElement);   // function form: client-only

export function renderElement<S>(tag: string, render: RenderProp<S> | undefined, state: S, props: Record<string, unknown>) {
  if (typeof render === 'function') return render(props, state);
  if (isValidElement(render)) return cloneElement(render, mergeProps(props, render.props as Record<string, unknown>));
  return createElement(tag, props);
}

/** Normalize any render prop to the function form adapters receive (r3 §8.4); falls back to the default tag. */
export const toRenderFn = <S,>(render: RenderProp<S> | undefined, tag: string) =>
  (props: Record<string, unknown>, state: S) => renderElement(tag, render, state, props);
```

```ts
// packages/react/src/_contracts/state.ts — generated from contracts/vocabulary.json (one source for TS, docs, stylelint)
export interface NzState {
  open?: boolean; entering?: boolean; exiting?: boolean; side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end'; highlighted?: boolean; selected?: boolean; checked?: boolean | 'indeterminate';
  focusVisible?: boolean; disabled?: boolean; readOnly?: boolean; required?: boolean; invalid?: boolean;
  placeholder?: boolean; orientation?: 'horizontal' | 'vertical';
}
const f = (b?: boolean) => (b ? '' : undefined);
export const stateAttrs = (s: NzState) => ({
  'data-open': f(s.open), 'data-entering': f(s.entering), 'data-exiting': f(s.exiting),
  'data-side': s.side, 'data-align': s.align, 'data-highlighted': f(s.highlighted), 'data-selected': f(s.selected),
  'data-checked': f(s.checked === true), 'data-indeterminate': f(s.checked === 'indeterminate'),
  'data-focus-visible': f(s.focusVisible), 'data-disabled': f(s.disabled), 'data-readonly': f(s.readOnly),
  'data-required': f(s.required), 'data-invalid': f(s.invalid), 'data-placeholder': f(s.placeholder),
  'data-orientation': s.orientation,
});

// _contracts/details.ts — (value, details) callbacks; a details object can grow in a minor (r8 §6.8)
export interface ChangeDetails<R extends string> { reason: R | 'unknown'; event?: Event }
export const details = <R extends string>(reason: R | 'unknown', event?: Event): ChangeDetails<R> => ({ reason, event });
```

```ts
// packages/react/src/augment.ts — types only. ONE declaring module (r8 §6.11). expect-type test in CI.
export interface ButtonVariantMap { primary: true; secondary: true; tertiary: true; critical: true; accent: true } // Figma names
export interface ControlSizeMap { sm: true; md: true; lg: true }                                                   // Figma Size
export interface ToneMap { neutral: true; brand: true; success: true; warning: true; critical: true; info: true }  // Figma Badge Tone
export type ButtonVariant = keyof ButtonVariantMap;
export type ControlSize = keyof ControlSizeMap;
export type Tone = keyof ToneMap;
// consumer: declare module '@nizivo/react/augment' { interface ButtonVariantMap { ai: true } }
//           + `.nz-button[data-variant="ai"] { --nz-button-bg: … }` in their own CSS
```

### 6.6 Server-safe Button with the Figma variants

```tsx
// packages/react/src/button/button.tsx — NO directive: zero client JS under RSC.
import type { ComponentProps, ReactNode } from 'react';
import type { ButtonVariant, ControlSize } from '../augment';
import { cx } from '../_contracts/merge-props';
import { renderElement, type RenderProp } from '../_contracts/render';
import { SpinnerGlyph } from '../_glyphs/spinner';           // internal glyph #1 (server-safe SVG)

export interface ButtonState { variant: ButtonVariant; size: ControlSize; pending: boolean; disabled: boolean }
export interface ButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Figma "Variant": Primary · Secondary · Tertiary · Critical · Accent ("Accent is reserved for Grove AI" — rename the
   *  guidance to the product's AI feature). @default 'secondary' — designer guidance: "One primary per view. Secondary for
   *  everything else, tertiary inside dense rows." (02 doc lead; C26). Figma's own default (Primary) is not the code default. */
  variant?: ButtonVariant;
  /** Figma "Size": sm 32 · md 40 · lg 48. @default 'md' */
  size?: ControlSize;
  /** Figma booleans "Leading icon"/"Trailing icon" become element slots (no icon package in core: settled 7). */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Busy state (GB #18: renamed from `loading`). Keeps focus, sets aria-disabled, blocks resubmission. */
  pending?: boolean;
  fullWidth?: boolean;
  /** settled 1 — e.g. render={<Link href="/plans" />} (element form works from Server Components). */
  render?: RenderProp<ButtonState>;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary', size = 'md', leadingIcon, trailingIcon, pending = false, fullWidth = false,
  disabled = false, render, className, type, children, ...rest
}: ButtonProps) {
  const native = render === undefined;
  return renderElement('button', render, { variant, size, pending, disabled }, {
    ...rest,
    className: cx('nz-button', className),
    'data-slot': 'button',
    'data-variant': variant,
    'data-size': size,
    'data-pending': pending ? '' : undefined,
    'data-disabled': disabled ? '' : undefined,
    'data-full-width': fullWidth ? '' : undefined,
    type: native ? (pending ? 'button' : (type ?? 'button')) : undefined,      // pending submit can't resubmit (GB §C2.3)
    disabled: native && disabled && !pending ? true : undefined,
    'aria-disabled': pending || (!native && disabled) ? true : undefined,
    children: (
      <>
        {pending
          ? <SpinnerGlyph className="nz-button-icon" data-slot="button-icon" aria-hidden="true" />  // width preserved (02)
          : leadingIcon != null && <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">{leadingIcon}</span>}
        <span className="nz-button-label" data-slot="button-label">{children}</span>
        {trailingIcon != null && <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">{trailingIcon}</span>}
      </>
    ),
  });
}
```

```css
/* packages/css/src/components/button.css → @nizivo/react/css/button.css */
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.components {
  .nz-button {
    /* privates: defaults = Secondary, Md (Figma) */
    --_nz-button-bg: var(--nz-bg-surface);        --_nz-button-bg-hover: var(--nz-bg-hover);
    --_nz-button-bg-pressed: var(--nz-bg-pressed); --_nz-button-fg: var(--nz-text-primary);
    --_nz-button-border: var(--nz-border-default); --_nz-button-height: var(--nz-size-control-md);
    --_nz-button-padding-inline: var(--nz-space-4); --_nz-button-gap: var(--nz-space-2);
    --_nz-button-radius: var(--nz-radius-md);      --_nz-button-font: var(--nz-font-label-m);

    position: relative; display: inline-flex; align-items: center; justify-content: center;
    gap: var(--nz-button-gap, var(--_nz-button-gap));
    block-size: var(--nz-button-height, var(--_nz-button-height));
    padding-inline: var(--nz-button-padding-inline, var(--_nz-button-padding-inline));
    border: var(--nz-border-width-default) solid var(--nz-button-border, var(--_nz-button-border));
    border-radius: var(--nz-button-radius, var(--_nz-button-radius));
    background: var(--nz-button-bg, var(--_nz-button-bg));
    color: var(--nz-button-fg, var(--_nz-button-fg));
    font: var(--nz-button-font, var(--_nz-button-font));
    transition: background-color var(--nz-duration-fast) var(--nz-easing-standard),   /* 140 ms token; Figma's 160 ms is not a token (C35) */
                scale var(--nz-duration-instant) var(--nz-easing-standard);
    @media (hover: hover) {
      &:hover:not(:disabled, [aria-disabled="true"]) { background: var(--nz-button-bg-hover, var(--_nz-button-bg-hover)); }
    }
    &:active:not(:disabled, [aria-disabled="true"]) {
      background: var(--nz-button-bg-pressed, var(--_nz-button-bg-pressed)); scale: var(--nz-scale-press);
    }
    &:is(:disabled, [data-disabled]) {
      background: var(--nz-bg-disabled); color: var(--nz-text-disabled); border-color: var(--nz-border-subtle);
    }
    &[data-pending] { cursor: progress; }
    &[data-full-width] { inline-size: 100%; }
  }
  .nz-button[data-variant="primary"] {
    --_nz-button-bg: var(--nz-bg-brand); --_nz-button-bg-hover: var(--nz-bg-brand-hover);
    --_nz-button-bg-pressed: var(--nz-bg-brand-pressed); --_nz-button-fg: var(--nz-text-on-brand); --_nz-button-border: transparent;
  }
  .nz-button[data-variant="tertiary"] { --_nz-button-bg: transparent; --_nz-button-border: transparent; }
  .nz-button[data-variant="critical"] {          /* tokens requested from design (GC §3.2); shipped via the a11y override file meanwhile */
    --_nz-button-bg: var(--nz-bg-critical); --_nz-button-bg-hover: var(--nz-bg-critical-hover);
    --_nz-button-bg-pressed: var(--nz-bg-critical-hover); --_nz-button-fg: var(--nz-text-on-critical); --_nz-button-border: transparent;
  }
  .nz-button[data-variant="accent"] {            /* Figma accent hover binds primitive lime/400 (mode-blind, 02): no semantic hover token yet */
    --_nz-button-bg: var(--nz-bg-accent); --_nz-button-fg: var(--nz-text-on-accent); --_nz-button-border: transparent;
    --_nz-button-bg-hover: color-mix(in oklab, var(--nz-bg-accent), var(--nz-text-on-accent) 8%);  /* interim until bg/accent-hover */
  }
  .nz-button[data-size="sm"] {
    --_nz-button-height: var(--nz-size-control-sm); --_nz-button-padding-inline: var(--nz-space-3);
    --_nz-button-gap: var(--nz-space-1-5); --_nz-button-radius: var(--nz-radius-sm);
  }
  .nz-button[data-size="lg"] {
    --_nz-button-height: var(--nz-size-control-lg); --_nz-button-padding-inline: var(--nz-space-5);
    --_nz-button-font: var(--nz-font-label-l);
  }
}
```

```css
/* packages/css/src/base.css — the a11y floor; survives E3 re-skins. Selector list generated from manifests (interactive: true). */
@layer nz.base {
  :where(.nz-button, .nz-icon-button, .nz-select-trigger, .nz-input-group, .nz-checkbox, .nz-switch /* … */):focus-visible {
    outline: var(--nz-border-width-focus) solid var(--nz-border-focus);   /* settled 12: forced-colors safe, ≥ 4.07:1 (GC §3.1) */
    outline-offset: 2px;
    box-shadow: 0 0 0 calc(var(--nz-border-width-focus) + 4px) var(--nz-focus-halo); /* decoration only; code-owned token */
  }
  @media (pointer: coarse) {                                              /* GC §3.6 — fixes S2: both axes, correct sign */
    :where(.nz-button, .nz-icon-button /* … */)::after {
      content: ""; position: absolute; inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2));
    }
  }
  :root[data-nz-touch-targets="always"] :where(.nz-button, .nz-icon-button /* … */)::after {
    content: ""; position: absolute; inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2));
  }
  @media (forced-colors: active) {
    :where(.nz-dialog-popup, .nz-popover-popup, .nz-select-popup, .nz-tooltip-popup, .nz-toast) { border: 1px solid CanvasText; }
  }
}
```

### 6.7 Engine-backed Select: the adapter seam end to end

```ts
// packages/react/src/select/select.contract.ts — public, engine-free (packed .d.ts grep for "react-aria" must be 0)
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import type { ChangeDetails } from '../_contracts/details';
import type { RenderProp } from '../_contracts/render';
import type { ControlSize } from '../augment';

export type SelectValueReason = 'item-press' | 'keyboard' | 'typeahead' | 'form-reset';
export type OpenReason = 'trigger' | 'escape' | 'outside-press' | 'item-press' | 'hidden' | 'programmatic';
export interface SelectRootProps {
  value?: string | null; defaultValue?: string | null;
  onValueChange?(value: string | null, details: ChangeDetails<SelectValueReason>): void;
  open?: boolean; defaultOpen?: boolean;
  onOpenChange?(open: boolean, details: ChangeDetails<OpenReason>): void;
  name?: string; required?: boolean; disabled?: boolean; readOnly?: boolean; invalid?: boolean;
  size?: ControlSize; children: ReactNode;
}
export interface SelectTriggerState { open: boolean; disabled: boolean; invalid: boolean; placeholder: boolean }
export interface SelectItemState { highlighted: boolean; selected: boolean; disabled: boolean; focusVisible: boolean }

/** Engine-side props: Nizivo DOM props (classes, data-slot, ids, aria from Field) + a normalized render function. */
type EnginePart<T extends keyof JSX.IntrinsicElements, S> =
  Omit<ComponentProps<T>, 'children'> & { children?: ReactNode; render: (props: Record<string, unknown>, state: S) => ReactElement };

/** What EVERY engine adapter for Select must implement. testkit/select.conformance.ts runs against this. */
export interface SelectEngine {
  Root(p: SelectRootProps): ReactElement;
  Trigger(p: EnginePart<'button', SelectTriggerState>): ReactElement;
  Value(p: EnginePart<'span', SelectTriggerState> & { placeholder?: ReactNode }): ReactElement;
  Popup(p: EnginePart<'div', { entering: boolean; exiting: boolean; side: 'top' | 'right' | 'bottom' | 'left' }> & {
    side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end'; sideOffset?: number }): ReactElement;
  List(p: EnginePart<'div', Record<string, never>>): ReactElement;
  Item(p: EnginePart<'div', SelectItemState> & { value: string; textValue?: string; disabled?: boolean }): ReactElement;
  Group(p: EnginePart<'div', Record<string, never>>): ReactElement;
  GroupLabel(p: EnginePart<'div', Record<string, never>>): ReactElement;
  Separator(p: EnginePart<'div', Record<string, never>>): ReactElement;
}
```

```ts
// packages/react/src/select/engine.ts — THE swap point. Changing this line is the whole engine swap for Select.
export * from '../_engines/react-aria/select.client';
// export * from '../_engines/base-ui/select.client';   // alternative family: must pass testkit/select.conformance.ts
```

```tsx
// packages/react/src/_engines/react-aria/select.client.tsx — ILLUSTRATIVE, not compiled. The ONLY Select module importing RAC.
'use client';
import { Select as RacSelect, Button as RacButton, SelectValue, Popover as RacPopover, ListBox, ListBoxItem,
         ListBoxSection, Header, Separator as RacSeparator } from 'react-aria-components';
import type { SelectEngine } from '../../select/select.contract';
import { stateAttrs } from '../../_contracts/state';
import { details } from '../../_contracts/details';
import { EngineLocale } from './locale.client';             // I18nProvider fed by NizivoConfig.locale ('en-US' default) — GB §A3

export const Root: SelectEngine['Root'] = ({ value, defaultValue, onValueChange, open, defaultOpen, onOpenChange,
  name, required, disabled, invalid, children }) => (
  <EngineLocale>
    <RacSelect selectedKey={value} defaultSelectedKey={defaultValue}
      onSelectionChange={(k) => onValueChange?.(k == null ? null : String(k), details('item-press'))}
      isOpen={open} defaultOpen={defaultOpen}
      onOpenChange={(o) => onOpenChange?.(o, details('unknown'))}   // RAC gives no reason; contract allows 'unknown'
      name={name} isRequired={required} isDisabled={disabled} isInvalid={invalid}
      validationBehavior="native">                                   // hidden native <select> → FormData + :invalid (GA §2.3)
      {children}
    </RacSelect>
  </EngineLocale>
);

export const Trigger: SelectEngine['Trigger'] = ({ render, ...dom }) => (
  <RacButton {...dom} render={(p, rp) => {
    const s = { open: rp.isOpen ?? false, disabled: rp.isDisabled, invalid: rp.isInvalid ?? false, placeholder: false };
    return render({ ...p, ...stateAttrs(s) }, s);                    // canonical vocabulary only
  }} />
);

export const Item: SelectEngine['Item'] = ({ value, textValue, disabled, render, ...dom }) => (
  <ListBoxItem {...dom} id={value} textValue={textValue} isDisabled={disabled} render={(p, rp) => {
    const s = { highlighted: rp.isFocused, selected: rp.isSelected, disabled: rp.isDisabled, focusVisible: rp.isFocusVisible };
    return render({ ...p, ...stateAttrs(s) }, s);
  }} />
);
// Value, Popup (placement → data-side/data-align; --trigger-width re-exposed as --nz-trigger-width), List, Group,
// GroupLabel, Separator follow the same shape.
```

```tsx
// packages/react/src/select/select-trigger.client.tsx — PUBLIC part: owns the CSS contract; engine owns behaviour.
'use client';
import { use, type ComponentProps, type ReactNode } from 'react';
import { Trigger as EngineTrigger } from './engine';
import { SelectScope } from './select-root.client';
import { FieldContext } from '../field/field-scope.client';
import { cx } from '../_contracts/merge-props';
import { toRenderFn } from '../_contracts/render';               // element|function|undefined → (props, state) => element
import { ChevronsUpDownGlyph } from '../_glyphs/chevrons-up-down';
import type { RenderProp } from '../_contracts/render';
import type { SelectTriggerState } from './select.contract';

export interface SelectTriggerProps extends Omit<ComponentProps<'button'>, 'children'> {
  leadingIcon?: ReactNode; children?: ReactNode; render?: RenderProp<SelectTriggerState>;
}
export function SelectTrigger({ className, leadingIcon, children, render, id, ...rest }: SelectTriggerProps) {
  const { size } = use(SelectScope);
  const field = use(FieldContext);                               // optional: works without <Field> (GA §2.1)
  return (
    <EngineTrigger
      {...rest}
      id={id ?? field?.ids.control}
      aria-describedby={[rest['aria-describedby'], field?.describedBy].filter(Boolean).join(' ') || undefined}
      className={cx('nz-select-trigger', className)} data-slot="select-trigger" data-size={size}
      render={toRenderFn(render, 'button')}>
      {leadingIcon != null && <span className="nz-select-icon" data-slot="select-icon" aria-hidden="true">{leadingIcon}</span>}
      {children}
      <ChevronsUpDownGlyph className="nz-select-chevron" data-slot="select-chevron" aria-hidden="true" />
    </EngineTrigger>
  );
}
```

```ts
// packages/react/src/select/select.parts.ts — NO DIRECTIVE. The namespace object is built here, on the server side of the
// boundary, from client references. Building it from a 'use client' file FAILS the Next 16.4 build (S2: ns-a vs ns-b).
export { SelectRoot as Root } from './select-root.client';
export { SelectTrigger as Trigger } from './select-trigger.client';
export { SelectValue as Value } from './select-value.client';
export { SelectPopup as Popup } from './select-popup.client';
export { SelectItem as Item, SelectGroup as Group, SelectGroupLabel as GroupLabel, SelectSeparator as Separator } from './select-items.client';

// packages/react/src/select/index.ts — NO DIRECTIVE
export * from './select-root.client';  export * from './select-trigger.client';  export * from './select-value.client';
export * from './select-popup.client'; export * from './select-items.client';
export * as Select from './select.parts';                       // settled 2: namespace AND flat
export type * from './select.contract';
```

```ts
// packages/testkit/src/conformance/select.conformance.ts — engine-agnostic; vitest runs it once per engine alias
export function selectConformance(engine: string) {
  describe(`Select [${engine}]`, () => {
    test('APG select-only combobox: Enter/Space/Arrow opens, typeahead, Home/End, Esc restores focus to trigger');
    test('vocabulary: only documented data-* drive styling; popup has data-open + data-side; item data-highlighted/selected');
    test('render merge: element and function forms keep ref, className, handlers (consumer-first)');
    test('form: name → hidden native element in FormData; required → native invalid → exactly one [data-slot=field-error]'); // GA §2.9 risk 3
    test('O-01 inside Dialog: listbox paints above the dialog, Esc closes only the listbox');
    test('O-15 Activity: navigate away while open → closed on return, <html> not locked');
    test('SSR + hydrate (Next RSC + Vite fixtures): zero warnings; namespace and flat imports both build');
    test('locale determinism: navigator.language = de-DE → no post-hydration text change');                                   // GB D-3
    test('axe wcag2a/aa, wcag21aa, wcag22aa: 0 violations; forced-colors: popup border visible');
  });
}
```

### 6.8 Dialog (the overlay model in one component)

```tsx
// Public parts (each a *.client.tsx leaf, namespace via dialog.parts.ts; GC §1.9 shape with settled 1/2 applied)
<Dialog.Root open={open} onOpenChange={(o, { reason }) => setOpen(o)} /* reason: 'escape'|'outside-press'|'close-part'|'hidden'|… */>
  <Dialog.Trigger render={<Button variant="secondary" />}>Edit product</Dialog.Trigger>
  <Dialog.Backdrop />                                         {/* .nz-dialog-backdrop — scrim token, fades only (Figma motion principle) */}
  <Dialog.Popup size="md" initialFocus={titleInputRef}>      {/* provides the nested-portal container (GC §1.4 L2) */}
    <Dialog.Title level={2}>Edit product</Dialog.Title>       {/* constrained `level` (settled 1 detail); style stays Heading/H3 */}
    <Dialog.Description>Changes publish to your store immediately.</Dialog.Description>
    <Dialog.Body>{/* the only scroller */}</Dialog.Body>
    <Dialog.Footer>
      <Dialog.Close render={<Button variant="tertiary" />}>Cancel</Dialog.Close>
      <Button variant="primary" type="submit" form="product">Save</Button>
    </Dialog.Footer>
  </Dialog.Popup>
</Dialog.Root>
// role: 'dialog' | 'alertdialog' on Root (alertdialog forces dismissOnOutsidePress=false; initial focus = least destructive).
```

```css
@layer nz.components {
  .nz-dialog-backdrop {
    position: fixed; inset: 0; z-index: var(--nz-z-overlay); background: var(--nz-bg-scrim);
    transition: opacity var(--nz-duration-base) var(--nz-easing-enter);
    &[data-entering] { opacity: 0; }
    &[data-exiting] { opacity: 0; transition-duration: var(--nz-duration-fast); transition-timing-function: var(--nz-easing-exit); }
  }
  .nz-dialog-positioner { position: fixed; inset: 0; z-index: var(--nz-z-overlay); display: grid; place-items: center; } /* never transformed */
  .nz-dialog-popup {
    background: var(--nz-dialog-bg, var(--nz-bg-surface-raised));              /* dark: n850 (GC §2.3) */
    box-shadow: var(--nz-elevation-4); border-radius: var(--nz-dialog-radius, var(--nz-radius-2xl));
    max-block-size: calc(100dvh - 2 * var(--nz-space-8));
    transition: scale var(--nz-duration-spring) var(--nz-easing-spring),          /* spring only on transforms, always with its pair (D12) */
                opacity var(--nz-duration-fast) var(--nz-easing-enter);           /* fades use duration tokens; Reduced mode keeps them ≤ 160 ms */
    &[data-entering] { opacity: 0; scale: 0.96; }                                  /* Reduced: spring → linear/0 ms, so only the fade remains */
    &[data-exiting] { opacity: 0; transition: opacity var(--nz-duration-fast) var(--nz-easing-exit); }
  }
}
```

Behaviour is owned by the adapter and checked by tests O-01…O-25 (GC §1.10):
- one scroll lock, owned by the engine;
- the focus-return chain;
- Esc closes the topmost overlay only;
- Activity closes with `reason: 'hidden'`;
- nested overlays portal into `Popup`;
- a toast stays reachable through F8.

### 6.9 Compound **server** Card (namespace without any client boundary)

```tsx
// packages/react/src/card/card.tsx — NO directive (server-safe). card.parts.ts re-exports; index.ts: flat + `export * as Card`.
type CardTone = 'surface' | 'subtle' | 'inverse';                  // Figma "Style": Surface | Subtle | Inverse
export function CardRoot({ tone = 'surface', padding = 'md', elevation = 0, render, className, ...rest }: CardRootProps) {
  return renderElement('div', render, { tone }, {
    ...rest, className: cx('nz-card', className), 'data-slot': 'card', 'data-tone': tone, 'data-padding': padding,
    'data-elevation': elevation || undefined,                       // rest elevation 0: compositions show no shadow at rest (C35) — design to confirm
    'data-nz-scheme': tone === 'inverse' ? 'inverse' : undefined,   // every nested token flips; no "on-inverse" token family (GC §2.6)
  });
}
export function CardHeader(p: PartProps<'div'>) { return part('div', 'card-header', p); }
export function CardTitle({ level = 3, ...p }: PartProps<'h3'> & { level?: 2 | 3 | 4 | 5 | 6 }) {
  return part(`h${level}`, 'card-title', p);                       // visual style is Heading/H4 at any level
}
export function CardDescription(p: PartProps<'p'>) { return part('p', 'card-description', p); }
export function CardAction(p: PartProps<'div'>) { return part('div', 'card-action', p); } // Figma "Show action" → presence; put an IconButton+Menu here
export function CardBody(p: PartProps<'div'>) { return part('div', 'card-body', p); }   // Figma "Slot"
export function CardFooter(p: PartProps<'div'>) { return part('div', 'card-footer', p); }

// usage from a Server Component: zero JS unless a client island is placed in CardAction
<Card.Root tone="surface">
  <Card.Header><Card.Title>Recent orders</Card.Title>
    <Card.Action><Button variant="tertiary" size="sm" render={<Link href="/orders" />}>View all</Button></Card.Action>
  </Card.Header>
  <Card.Body>…</Card.Body>
</Card.Root>
```

### 6.10 KpiTile (pattern-level core component; G20 contract; heavy module through a slot)

```tsx
// packages/react/src/kpi-tile/kpi-tile.tsx — NO directive. useId is allowed in a sync server component (S6, verified).
export function KpiTile({ label, value, format = 'compact', locale = 'en-US', delta, comparison, chart,
  tone = 'surface', status = 'ready', pending, empty, error, labels, render, className, ...rest }: KpiTileProps) {
  const L = { ...kpiTileLabels, ...labels };
  const id = useId();
  const st: DataStatus = status === 'ready' && value == null ? 'empty' : status;   // precedence error > loading > empty > ready
  return renderElement('div', render, { status: st, pending: !!pending }, {
    ...rest, role: 'group', 'aria-labelledby': id,                 // named group, not a landmark (GB §C2.3)
    className: cx('nz-kpi-tile', className), 'data-slot': 'kpi-tile',
    'data-tone': tone,                                              // Figma Tone: surface | tinted — decoupled from trend (04 issue)
    'data-loading': st === 'loading' ? '' : undefined, 'data-empty': st === 'empty' ? '' : undefined,
    'data-error': st === 'error' ? '' : undefined, 'data-pending': pending ? '' : undefined,
    'aria-busy': st === 'loading' || pending || undefined,
    children: (<>
      <p id={id} className="nz-kpi-tile-label" data-slot="kpi-tile-label">{label}</p>
      <div className="nz-kpi-tile-value-row" data-slot="kpi-tile-value-row">
        {st === 'loading' ? <><span className="nz-skeleton nz-kpi-tile-value-skeleton" aria-hidden="true" />
                              <span className="nz-visually-hidden">{formatLabel(locale, L.loading, { label: String(label) })}</span></>
        : st === 'error' ? (error ?? <InlineError>{formatLabel(locale, L.error, { label: String(label) })}</InlineError>)
        : st === 'empty' ? (empty ?? <span className="nz-kpi-tile-empty"><span aria-hidden="true">—</span>
                              <span className="nz-visually-hidden">{formatLabel(locale, L.noData)}</span></span>)
        : <><NumberValue className="nz-kpi-tile-value" value={value!} format={format} locale={locale} />
             {chart /* element slot: <Sparkline …/> from @nizivo/charts — core never imports charts (settled 6, C13) */}</>}
      </div>
      {st === 'ready' && delta != null &&
        <div className="nz-kpi-tile-footer" data-slot="kpi-tile-footer"><Delta value={delta} locale={locale} comparison={comparison} /></div>}
    </>),
  });
}
// As a Suspense fallback the SAME component is used: <Suspense fallback={<KpiTile label="Revenue" status="loading" />}>
```

### 6.11 AreaChart (heavy module; renderer and scale seams; CSP-safe geometry)

```tsx
// packages/charts/src/area/area-chart.tsx — NO directive: full SVG on the server (r6 §2.3); ~3.2 KB when hydrated in SPAs.
import { area, line, curveMonotoneX } from 'd3-shape';
import { max, nice } from 'd3-array';
import { ChartFrame } from '../frame/chart-frame';                    // figure + figcaption + server data table + legend + status
import { ChartInteraction } from '../frame/chart-interaction.client';   // 'use client' island ~0.6 KB; plain JSON crosses the boundary
import { linear, point, type ScaleLike } from '../scales';            // ScaleLike = callable + domain() + ticks(): d3 scales satisfy it

export function AreaChart({ data, x, y, compare, title, summary, locale = 'en-US', format = 'compact',
  xScale, yScale, status = 'ready', empty, error, xDirection = 'ltr' }: AreaChartProps) {
  const sx: ScaleLike<string> = xScale ?? point(data.map(x), [0, 100]);   // ISO plain dates as evenly spaced buckets (daily/weekly)
  const [, yMax] = nice(0, max(data, y) ?? 0, 4);
  const sy: ScaleLike<number> = yScale ?? linear([0, yMax], [100, 0]);
  const fmt = new Intl.NumberFormat(locale, typeof format === 'string' ? numberPreset(format) : format);
  const pts = data.map((d) => ({ px: sx(x(d)), py: sy(y(d)), label: x(d), value: fmt.format(y(d)) }));
  return (
    <ChartFrame title={title} summary={summary} table={pts} status={status} empty={empty} error={error}
      className="nz-area-chart" data-x-direction={xDirection} ticks={{ x: pickTicks(data.map(x)), y: sy.ticks(4).map(fmt.format) }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="nz-chart-plot">
        {sy.ticks(4).map((t) => <line key={t} x1={0} x2={100} y1={sy(t)} y2={sy(t)} className="nz-chart-grid" vectorEffect="non-scaling-stroke" />)}
        {compare && <path className="nz-chart-line" data-series="previous" vectorEffect="non-scaling-stroke"
          d={line<Datum>().x((d) => sx(x(d))).y((d) => sy(compare(d))).curve(curveMonotoneX)(data)!} />}
        <path className="nz-chart-area" d={area<Datum>().x((d) => sx(x(d))).y0(100).y1((d) => sy(y(d))).curve(curveMonotoneX)(data)!} />
        <path className="nz-chart-line" data-series="current" vectorEffect="non-scaling-stroke"
          d={line<Datum>().x((d) => sx(x(d))).y((d) => sy(y(d))).curve(curveMonotoneX)(data)!} />
      </svg>
      <ChartInteraction points={pts} label={title} />                {/* crosshair, tooltip, roving index, live region; fails closed */}
    </ChartFrame>
  );
}
```

- Tick labels are HTML laid out by a CSS grid with N equal columns: no per-label `style`, so it works under CSP Profile B (GB §B1.4).
- Draw-in: `@keyframes nz-chart-reveal { from { clip-path: inset(0 100% 0 0) } }`, with the inset sides swapped under `[data-x-direction=rtl]`. Disabled when the reduce tokens apply.
- **Renderer seam:** `<ChartFrame …><RechartsArea …/></ChartFrame>` keeps Nizivo's title, table, legend, status and a11y around a third-party renderer.

### 6.12 Field with a form-library recipe

```tsx
// Server Component, zero JS for the shell; controls are thin client leaves (GA §2.1–2.2)
<Field name="title" label="Product title" description="Shown on product pages and checkout." required
       messages={{ valueMissing: 'Enter a product title' }}>      {/* "Errors say what to do" (02) */}
  <Input defaultValue={product.title} />
</Field>
// DOM order: label, control, description, error (error adds an icon + text; never colour-only — fixes 02's WCAG 1.4.1 issue)
```

```tsx
// Recipe: react-hook-form 7.x — no Nizivo adapter package (GA §2.7). Contract used: ref → focusable, name, value,
// onValueChange(value, details), onBlur, disabled, error.
'use client';
import { useForm, Controller } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Field } from '@nizivo/react/field';
import { Input } from '@nizivo/react/input';
import { Select } from '@nizivo/react/select';

export function ProductForm({ onSave }: { onSave(v: ProductInput): void }) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<ProductInput>({ resolver: standardSchemaResolver(Product) });
  return (
    <form onSubmit={handleSubmit(onSave)} noValidate>
      <Field label="Product title" error={errors.title?.message}>
        <Input {...register('title')} />                                    {/* ref lands on the native <input> */}
      </Field>
      <Controller control={control} name="status" render={({ field, fieldState }) => (
        <Field label="Status" error={fieldState.error?.message}>
          <Select.Root name={field.name} value={field.value} onValueChange={(v) => field.onChange(v)} disabled={field.disabled}>
            <Select.Trigger ref={field.ref} onBlur={field.onBlur} />        {/* ref → trigger button: setFocus/shouldFocusError work */}
            <Select.Popup>
              <Select.Item value="active">Active</Select.Item>
              <Select.Item value="draft">Draft</Select.Item>
            </Select.Popup>
          </Select.Root>
        </Field>
      )} />
      <Button variant="primary" type="submit">Save</Button>
    </form>
  );
}
// Same contract serves TanStack Form (normalize Standard Schema issues to text), Conform (pass ids={{control, description, error}}),
// and React 19 `useActionState` (Form errors={state.fieldErrors}; echo values as defaultValue — ordering UNVERIFIED, GA §2.4).
```

---

## 7. Tokens and theming

### 7.1 Pipeline: Figma → repo → outputs

```
Figma (Grove collections only; foreign Clario/Pipkin/… ignored)
   │  designer publishes library ──► LIBRARY_PUBLISH webhook ─► relay ─► GitHub issue "sync needed" (+ nightly /meta check)
   ▼
EXTRACTOR ADAPTER (any one; all write the same raw snapshot format)
   ├─ TokensBrücke 3.18.0 plugin: DTCG 2025.10, modes split, styles incl. → bot PR into packages/tokens/figma/raw/**   (primary)
   ├─ Claude Code + Figma MCP use_figma: one collection per call (~20 KB cap) → same raw format                        (secondary)
   └─ manual export → same raw format                                                                                 (fallback)
   ▼
scripts/normalize.ts  ── grove→nz names, drop foreign collections, parse "spring(m,k,c,v)" into $extensions, px→rem for type/space
   ▼                       CI invariant: normalize(raw) === src/figma-owned/**  (code-first edits need label `tokens:code-first` + Figma push)
src/figma-owned/** + src/code-owned/** + nizivo.resolver.json   (DTCG 2025.10; modifiers theme / motion / viewport; a11y overrides last)
   ▼
scripts/spring.ts (one generator) ──► code-owned/motion-derived.tokens.json   (linear() + paired durations)
   ▼
BUILDER ADAPTER: build/terrazzo.config.ts (Terrazzo 2.8.0, exact pin) + plugins:
   light-dark (resolver-reading transform, S3) · tailwind-semantic (S3 custom) · spring-linear · contract
   ▼                       CI: golden files · tz lint · contrast matrix (all permutations) · a11y override drift/redundancy/expiry ·
   ▼                           token diff comment on PR · size check · VR
dist/: tokens.css · tokens.blocks.css (v0.2) · tailwind.css · tokens.json · contract.json · index.js/.d.ts · figma/*.json
   ▼
packages/css (Lightning CSS, targets = floor) consumes only names in contract.json  ──► @nizivo/react/dist/css/**
```

**Code → Figma (optional, human-triggered).** r7 §8.4's `figma-push` rewrites each variable's WEB codeSyntax to `var(--nz-…)` and proposes override values on a Figma **branch**, within the MCP budget. Merging that branch closes the loop through a normal sync.

### 7.2 Sample generated CSS

These are excerpts. The values come from `docs/figma/00-tokens-and-styles.md`. Where an a11y override applies, it is marked; those values are from GC §3.2.

**Default output (`tokens.css`).** Shape verified by S3 `out/tokens.lightdark.css`; browser behaviour verified by S1.

```css
@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.tokens {
  :root {
    --nz-css-version: "0.1.0";                                   /* JS/CSS skew handshake (r2 §4.9) */
    /* primitives (private) */
    --nz-p-neutral-0: #fff; --nz-p-neutral-50: #f6f7f4; --nz-p-neutral-300: #cbd0c8; --nz-p-neutral-600: #596058;
    --nz-p-neutral-700: #414741; --nz-p-neutral-850: #202421; --nz-p-neutral-900: #181b19; --nz-p-neutral-950: #101311;
    --nz-p-green-300: #79b993; --nz-p-green-400: #4c9e71; --nz-p-green-500: #2e8358; --nz-p-green-700: #1a573a;
    /* … 54 Figma primitives + 4 override primitives (neutral-450, neutral-925, red-400, blue-400) */

    /* semantic colour: ONE declaration each; light-dark() resolves per element (nested scopes free — S1) */
    --nz-bg-canvas:         light-dark(var(--nz-p-neutral-50),  var(--nz-p-neutral-950));
    --nz-bg-surface:        light-dark(var(--nz-p-neutral-0),   var(--nz-p-neutral-900));
    --nz-bg-surface-raised: light-dark(var(--nz-p-neutral-0),   var(--nz-p-neutral-850));
    --nz-bg-brand:          light-dark(var(--nz-p-green-700),   var(--nz-p-green-400));
    --nz-text-primary:      light-dark(var(--nz-p-neutral-900), var(--nz-p-neutral-50));
    --nz-text-secondary:    light-dark(var(--nz-p-neutral-700), var(--nz-p-neutral-300));   /* a11y override (Option A), expires 2027-01-31 */
    --nz-border-focus:      light-dark(var(--nz-p-green-500),   var(--nz-p-green-300));
    --nz-bg-scrim:          light-dark(rgb(24 27 25 / .32),     rgb(0 0 0 / .6));             /* code-owned (GC §1.5) */
    --nz-elevation-ring:    light-dark(transparent,             rgb(255 255 255 / .08));      /* code-owned (GC §2.3) */

    /* leaves */
    --nz-space-1-5: 0.375rem; --nz-space-2: 0.5rem; --nz-space-4: 1rem; --nz-radius-md: 0.75rem; --nz-radius-2xl: 1.75rem;
    --nz-border-width-default: 1px; --nz-border-width-focus: 2px;
    --nz-size-control-sm: 2rem; --nz-size-control-md: 2.5rem; --nz-size-control-lg: 3rem; --nz-size-touch-min: 2.75rem;
    --nz-font-family-sans: var(--font-geist-sans, "Geist Variable"), "Geist", ui-sans-serif, system-ui, sans-serif;  /* no font files (settled 15) */
    --nz-font-label-m: 500 0.875rem/1.4 var(--nz-font-family-sans);

    /* motion (Figma Default mode) */
    --nz-duration-instant: 80ms; --nz-duration-fast: 140ms; --nz-duration-base: 220ms;
    --nz-easing-standard: cubic-bezier(0.2, 0, 0, 1); --nz-easing-enter: cubic-bezier(0, 0, 0, 1); --nz-easing-exit: cubic-bezier(0.3, 0, 1, 1);
    --nz-easing-spring: linear(0, 0.007 1.5%, 0.027 3.1%, 0.06 4.8%, 0.108 6.7%, 0.211 10%, 0.559 20.2%, 0.658 23.5%, 0.742 26.7%,
      0.811 29.8%, 0.868 32.9%, 0.916 36.1%, 0.954 39.4%, 0.985 43%, 1.007 46.9%, 1.022 51.1%, 1.029 55.9%, 1.029 63.7%, 1); /* S4 */
    --nz-duration-spring: 493ms;                                  /* spring(1,260,24,0): ±0.1% settle, 3.02% overshoot */
    --nz-easing-spring-soft: linear(0, 0.006 1.2%, 0.021 2.4%, 0.083 5.2%, 0.161 7.8%, 0.462 17%, 0.555 20.3%, 0.637 23.6%,
      0.706 26.9%, 0.766 30.3%, 0.817 33.9%, 0.86 37.7%, 0.898 42.1%, 0.929 47%, 0.953 52.5%, 0.971 58.7%, 0.991 73.9%, 1);
    --nz-duration-spring-soft: 702ms;                             /* spring(1,170,26,0): no overshoot */
    --nz-scale-press: 0.98; --nz-distance-lift: 4px;

    /* layers (code-owned) */
    --nz-z-raised: 1; --nz-z-sticky: 100; --nz-z-chrome: 200; --nz-z-overlay: 1000; --nz-z-toast: 1100;

    /* responsive (viewport modifier, mobile-first: Mobile values at :root) */
    --nz-grid-columns: 4; --nz-grid-gutter: 1rem; --nz-grid-margin: 1rem; --nz-layout-sidebar: 0px; --nz-type-h1: 1.5rem;
  }

  /* opt-in theme (C9): no color-scheme on :root → light-dark() resolves LIGHT even on an OS-dark machine (S1, verified) */
  [data-nz-theme="light"]  { color-scheme: light; }
  [data-nz-theme="dark"]   { color-scheme: dark; }
  [data-nz-theme="system"] { color-scheme: light dark; }

  /* inverse scope (Toast, Tooltip, Card tone="inverse"): flips every nested token (GC §2.6) */
  :root, [data-nz-theme="light"], [data-nz-theme="system"] { --nz-scheme-inverse: dark; }
  [data-nz-theme="dark"] { --nz-scheme-inverse: light; }
  @media (prefers-color-scheme: dark) { [data-nz-theme="system"] { --nz-scheme-inverse: light; } }
  [data-nz-scheme="inverse"] { color-scheme: var(--nz-scheme-inverse); }

  /* reduced motion (Figma Reduced mode; emitted with only.modifiers + include — S3 tokens.scoped-include.css shape) */
  @media (prefers-reduced-motion: reduce) {
    :root {
      --nz-duration-instant: 0ms; --nz-duration-fast: 0ms; --nz-duration-base: 120ms;
      --nz-easing-standard: linear; --nz-easing-enter: linear; --nz-easing-exit: linear;
      --nz-easing-spring: linear; --nz-duration-spring: 0ms; --nz-easing-spring-soft: linear; --nz-duration-spring-soft: 0ms;
      --nz-scale-press: 1; --nz-distance-lift: 0px;
    }
  }
  [data-nz-motion="reduce"] { /* identical block — same generator call */ }

  /* viewport modifier → @custom-media (build-time; CSS vars can't be used in media queries) */
  @media (width >= 40rem) {                                      /* --nz-bp-sm: designer "Below 640px…" (settled 11) */
    :root { --nz-grid-columns: 8; --nz-grid-gutter: 1.25rem; --nz-grid-margin: 1.5rem; --nz-layout-sidebar: 72px; --nz-type-h1: 1.75rem; }
  }
  @media (width >= 80rem) {                                      /* --nz-bp-lg: PROVISIONAL — no designer evidence (C11) */
    :root { --nz-grid-columns: 12; --nz-grid-gutter: 1.5rem; --nz-grid-margin: 2rem; --nz-layout-sidebar: 264px; --nz-type-h1: 2rem; }
  }
}
```

**Brand scope (`brands/<name>.css`, later).** It sits in the `nz.themes` layer. Because `var()` substitutes at the element that **declares** the property, aliases that point at overridden primitives are re-declared on the scope (r2 §4.3):

```css
@layer nz.themes {
  [data-nz-brand="acme"] {
    --nz-p-green-700: #1d4ed8; --nz-p-green-400: #60a5fa;                 /* primitives */
    --nz-bg-brand: light-dark(var(--nz-p-green-700), var(--nz-p-green-400)); /* re-declared alias (generator does this) */
  }
}
```

**Compat output (`tokens.blocks.css`, v0.2).**
- It is generated with `only: { modifiers: ['theme'] }, exclude: ['color.p.**']` (S3 `out/tokens.only-sets.css`, verified clean). It uses the same names and the same scope attributes, with every scope re-declaring the theme tokens.
- It needs no `light-dark()`, so token resolution reaches Safari 16.4.
- Component CSS is only *tested* at the 17.5 floor (D7).

### 7.3 Prefix configuration

- **Token prefix:** a build-time setting, `NZ_TOKEN_PREFIX` (default `nz`), read by `variableName()` in the Terrazzo config (S3 used exactly this hook). `contract.json` records the prefix.
- **Class prefix:** fixed at `nz`. A runtime prefix is impossible with zero-runtime CSS (r7), and a rebuild-with-prefix option for two-versions-on-a-page is deferred (r2 §6 risk).
- **Brand leakage:** the normalizer maps `grove` → `nz`, and CI greps shipped files for `grove` (G21).

### 7.4 Drift detection

| Signal | Mechanism | Action |
|---|---|---|
| Designer published | `LIBRARY_PUBLISH` webhook (Pro: 150 file webhooks) → relay → issue listing `modified_variables` keys | Run the extractor; release is blocked while the issue is open (r7 §8.3) |
| Missed webhook | Nightly `GET /v1/files/:key/meta` version check | Same issue |
| Hand edit of Figma-owned JSON | `normalize(raw) === figma-owned` | PR fails |
| Override drift | Figma value ≠ `figmaValueAtOverride` | PR fails: "Figma changed this token" |
| Override redundant | Figma value equals the override or passes the matrix | PR fails: "delete override" |
| Override expired | `expires` passed (warn 14 days before) | Fails; extension needs both approvers |
| Public-surface change | `contracts/api/tokens.json` diff | Changeset must classify it as minor (add) or major (remove/rename without `$deprecated`) |

### 7.5 Code-owned tokens

| Token (CSS) | Value | Why code-owned | Becomes Figma-owned when |
|---|---|---|---|
| `--nz-bp-sm` | 40rem | Figma has frame widths, not breakpoints; 640 is designer text (08) | Design adds breakpoint variables |
| `--nz-bp-md`, `--nz-bp-lg` | 64rem, 80rem (**provisional**, outside semver) | No designer evidence (C11) | Design confirms |
| `--nz-z-raised/-sticky/-chrome/-overlay/-toast` | 1 / 100 / 200 / 1000 / 1100 | Layering is an engineering model (GC §1.5) | Never |
| `--nz-bg-scrim` | light n900 @ 32%, dark #000 @ 60% | Missing in Figma; `bg/inverse` brightens dark pages (08 §0.7) | Design adds `bg/scrim` |
| `--nz-elevation-ring`, `--nz-elevation-highlight` | dark white 8% / transparent | No dark elevation in Figma (G16) | Design binds effect colours to variables |
| `--nz-elevation-1..4` | Figma geometry; dark alpha ×6 | Effect styles are hard-coded and light-only | Same |
| `--nz-focus-halo` | `color-mix(in oklab, var(--nz-border-focus) 28%, transparent)` | Mode-aware replacement for the static Focus/Ring hex (GC §3.2) | Design binds Focus/Ring to a variable |
| `--nz-duration-spring(-soft)`, `--nz-easing-spring(-soft)` | 493 ms / 702 ms + `linear()` | Derived from Figma `spring()` strings by the one generator | Never (derived) |
| `--nz-layout-bottom-inset`, `--nz-layout-top-inset`, `--nz-toast-inset` | Set by shell and Toaster at runtime | Layout coupling (GC §1.5, §1.8) | Never |
| `--nz-scheme-inverse` | dark / light | Mechanism for inverse scopes | Never |

### 7.6 A11y overrides, and every token this proposal introduces

**Override file entries** (GC §3.2, all pairs recomputed there; Option A text ladder). Each is a **design proposal shipped temporarily**, with `expires` set and both owners approving.

| Token | Light | Dark | Fixes |
|---|---|---|---|
| `text/secondary` | n700 | n300 | Keeps hierarchy while tertiary moves up |
| `text/tertiary` | n600 (5.65 min) | n400 (5.32 min) | 4.31:1 failure (G19) |
| `text/critical` | (unchanged) | **red/400** (new) | Dark 3.11–4.01 |
| `text/info` | (unchanged) | **blue/400** (new) | Dark 2.81–3.63 |
| `icon/warning`, `border/warning` | amber/600 | (unchanged) | 2.13–2.45 |
| `icon/critical` | (unchanged) | red/400 | Dark 3.11 |
| `bg/critical` | red/600 | red/600 | No passing foreground in dark |
| `bg/subtle` | (unchanged) | **n925** (new) | Dark surface = subtle (1.00) |
| `border/subtle` / `border/default` / `border/strong` | (unchanged) | n800 / n700 / n600 | Dark separators vanish |

**New semantic tokens requested from design.** They ship via the override file until Figma adds them:
- `text/accent` (L green/700, D lime/300)
- `text/on-critical` (white)
- `bg/critical-hover` (red/700)
- `icon/info` (L blue/600, D blue/400)
- `border/control` (L **neutral/450** new, D n500)
- `border/control-hover` (L n500, D n400)

**New primitives requested:** neutral/450 `#828a81`, neutral/925 `#151816`, red/400 `#e47962`, blue/400 `#7098e0`.

**Complete list of tokens this proposal introduces.** Everything else traces to `00-tokens-and-styles.md`:
- the code-owned table in §7.5;
- the override additions above;
- the typography naming scheme `--nz-font-<style>` / `--nz-tracking-<style>` for the existing 18 text styles (§6.3).

**Explicitly not introduced:**
- no 12 px style (S5);
- no `--nz-color-*` names (C8);
- none of r3's S8 names.

**Two related CSS rules:**
- **Target size:** `nz.base` rule in §6.6 (fixes S2).
- **Type floor:** stylelint `font-size` ≥ 0.875rem, and the Terrazzo lint `minSizePx: 14` (fixes S5).

### 7.7 Builder configuration (the verified shapes, condensed)

```js
// packages/tokens/build/terrazzo.config.ts — condensed from spikes/s3-terrazzo/terrazzo.*.config.mjs (verified on 2.8.0)
const PREFIX = process.env.NZ_TOKEN_PREFIX ?? 'nz';
const variableName = (t) => `--${PREFIX}-${t.id.replace(/^color\./, '').replace(/\./g, '-')}`;   // → --nz-bg-surface (C8)
export default defineConfig({
  tokens: ['./src/nizivo.resolver.json'],
  plugins: [
    captureResolver,                                   // lets lightDark() read the other theme for the same token
    css({ filename: 'tokens.css', variableName, permutations: [
      { input: { theme: 'light', motion: 'default', viewport: 'mobile' }, transform: lightDark, prepare: rootBlock },
      { input: { motion: 'reduced' }, only: { modifiers: ['motion'] }, include: ['duration.**', 'easing.**', 'distance.**', 'scale.**', 'tilt.**', 'stagger.**', 'magnetic.**'],
        prepare: reducedBlocks },                      // media query + [data-nz-motion="reduce"]
      { input: { viewport: 'tablet' },  only: { modifiers: ['viewport'] }, include: VIEWPORT_TOKENS, prepare: media('--nz-bp-sm') },
      { input: { viewport: 'desktop' }, only: { modifiers: ['viewport'] }, include: VIEWPORT_TOKENS, prepare: media('--nz-bp-lg') },
    ]}),
    css({ filename: 'tokens.blocks.css', variableName, permutations: BLOCK_PERMUTATIONS /* only + exclude color.p.** (S3) */ }),
    tailwindSemantic({ filename: 'tailwind.css', prefix: 'nz' }),   // @theme inline { --color-nz-bg-surface: var(--nz-bg-surface); … } (S3 custom)
    contract({ filename: 'contract.json' }),                        // public names + types + layer; drives stylelint + check-theme
  ],
});
```

---

## 8. Figma → Nizivo mapping

**How to read this table.**
- **IDs:** both the on-canvas `7275:*` sets and the live off-canvas `755:*`/ghost masters go into `design/component-map.json` (C25).
- **Behaviour tier:** T0 = native (zero engine); T1 = React Aria; T2 = own code on platform APIs.
- **RSC column:**
  - **server**: no directive, zero client JS under RSC;
  - **leaf**: thin `'use client'` leaf with complete SSR HTML;
  - **client**: engine-backed;
  - **split**: server shell plus a small island.
- **Placement** follows the critique's verdicts (C12, C13, GA §4.7), not the digest's `pkg` field.

| Figma set (ids) | Figma props → Nizivo API | Package / subpath | Release | Tier | RSC |
|---|---|---|---|---|---|
| **01 Foundations** | | | | | |
| Grove variable collections | codeSyntax `--grove-*` → `--nz-*` | `@nizivo/tokens` | v0.1 | — | — |
| 18 text styles | `Text` (`variant`, constrained `element: 'p'\|'span'\|'div'\|'strong'\|'small'`), `Heading` (`level` 1–6 + `variant`) | `react/text` | v0.1 | T0 | server |
| Icon/* ×74 (738:69…738:426, unparented) | Generated, stroke 1.92 | `@nizivo/icons` | v0.1 | T0 | server |
| Brand/Logo 739:64 | Not shipped (Grove trademark, G21); a `logo` slot on the shell | — | — | — | — |
| Focus ring / Focus/Ring effect | 2 px outline + halo | `css/core.css` (`nz.base`) | v0.1 | — | — |
| Elevation 0–4, Surface/Glass | `--nz-elevation-*`; `Surface material="solid\|glass"` (backdrop-filter + fallbacks) | tokens; `react/surface` | v0.1 / v0.2 | T0 | server |
| Surface/Liquid Glass | Not shipped; Chromium-only lab enhancement at most (r6 §5) | (`@nizivo/lab`) | deferred | — | — |
| Grid/Container/Stack (Doc) | `Stack`, `Inline`, `Grid`, `Container`; `Split` (v0.2) | `react/layout` | v0.1 | T0 | server |
| Asset library (image fills) | `Image` (`data-ratio`, `render`); **no Figma raster ships** (GB §B5.2) | `react/image` | v0.2 | T0 | server |
| **02 Actions & Forms** | | | | | |
| Button 7275:11244 (ghost 744:263) | Variant P/S/T/Critical/Accent → `variant` (default **secondary**); Size sm/md/lg; Leading/Trailing icon → slots; State → CSS; + `pending` | `react/button` | v0.1 | T0 | server |
| Icon Button 7275:11357 | `label` (required: aria-label + tooltip), `variant` (+critical), `size` sm/md/lg (+xs 24 in-chip), `tooltip` | `react/icon-button` | v0.1 | T0 + T1 Tooltip | split |
| Badge 7275:11374 (ghost 744:315) | Tone neutral/success/warning/critical/info/brand → `tone`; Dot → `dot`; `emphasis` subtle\|solid | `react/badge` | v0.1 | T0 | server |
| Input 7275:11397 (ghost 745:187) | `Field` (label, description, error) + `Input` (`prefix`/`suffix`/`leadingIcon`); State → CSS / `data-invalid` | `react/field`, `react/input` | v0.1 | T0 | server Field + leaf |
| (M-C) Textarea, character count, password toggle | `Textarea` (`field-sizing: content`), `count`, `PasswordInput` | `react/textarea`, `react/password-input` | v0.1 / v0.3 | T0 | leaf |
| Select 7275:11438 | Value → `value`; Leading icon → slot; State → vocabulary; plus `NativeSelect` (plain-text options) | `react/select`, `react/native-select` | v0.1 / v0.2 | T1 / T0 | client / leaf |
| Checkbox 7275:11456 | Checked false/true/indeterminate → `checked` \| `'indeterminate'`; group via `Fieldset` | `react/checkbox` | v0.1 | T0 | leaf |
| Radio 7275:11479 | `RadioGroup` + `Radio` (fieldset/legend) | `react/radio-group` | v0.1 | T0 | leaf |
| Switch 7275:11494 | On → `checked`; `role=switch`; `pending` | `react/switch` | v0.1 | T0 | leaf |
| Menu Item 7275:11516 + Dropdown Menu 746:204 | State → `data-highlighted`/`selected` + `intent="critical"`; Shortcut → `shortcut` (Kbd); Checkbox/Radio items, Submenu | `react/menu` | v0.2 | T1 | client |
| Upload 7275:11548 | `FileUpload` (Dropzone, Trigger, List, Item); progress uses `ProgressBar` | `react/file-upload` | v0.2 | T2 | client |
| Tooltip 746:262 (ghost) | `content`, `shortcut`, `side`, delay 400; inverse scheme | `react/tooltip` | v0.1 | T1 | client |
| Date Range Picker 746:267 (ghost) | ISO `{start,end}`, presets (serializable), `timeZone`, `commit` apply\|instant | `react/unstable/date-range-picker` | v0.3 | T1 + lazy calendar | client |
| **03 Data Visualization** | | | | | |
| Chart Legend Item 7275:13291 | Mark Line/Dashed/Dot → `mark` | `charts/frame` | v0.2 | own | server |
| Chart Tooltip 7275:13303 (+ghost 747:287) | Series 1\|2 → derived | `charts/frame` | v0.2 | own island | split |
| Sparkline 7275:13323 (ghost 747:288) | Trend → derived from data; used in `KpiTile chart={…}` | `charts/sparkline` | v0.2 | own | server |
| Area Chart 7275:13336 | State Hover → island; `compare` series dashed | `charts/area` | v0.2 | own + island | split |
| Bar Chart 7275:13387 | SVG rect bars; dim siblings | `charts/bar` | v0.2 | own + island | split |
| Donut Chart 7275:13455 | Max 3 categories + "Other" (Figma rule) | `charts/donut` | v0.2 | own + island | split |
| Progress Bar 7275:13526 | Tone brand/warning/critical; `kind` progress\|meter; `indeterminate` | `react/progress-bar` (core, settled 6) | v0.1 | T0 (`<progress>`/SVG) | server |
| Progress Ring 7275:13545 | Value variants → numeric `value` | `react/progress-ring` (core, settled 6) | v0.2 | T0 SVG attrs | server |
| Funnel 751:319, Heatmap 751:393 (ghosts) | — | `charts/funnel`, `charts/heatmap` | v0.3 | own | server |
| **04 Dashboard Widgets** | | | | | |
| Delta 7275:13743 (ghost 752:269) | Trend → derived from sign; Value → numeric + `format`; `polarity` | `react/delta` | v0.1 | T0 | server |
| Card 7275:13757 | Style → `tone`; Title → `CardTitle`; Show action → `CardAction` presence | `react/card` | v0.1 | T0 | server |
| KPI Tile 7275:13780 (ghost 752:380) | Tone surface\|tinted → `tone` (decoupled from trend); Label/Value → props; `chart` slot; G20 `status` | `react/kpi-tile` (core, C12) | v0.1 | T0 | server |
| Metric (extracted, 7275:13783) | label + value + delta + comparison | `react/metric` | v0.1 | T0 | server |
| Numeric/* styles | `NumberValue` (server, `<data>`, tabular); `CountUp` (motion) | `react/number`; `motion/count-up` | v0.1 / v0.2 | T0 / leaf | server / leaf |
| Insight Card 7275:13829 | Tone brand/accent/inverse | registry `insight-card` | v0.3 | E2 pattern | server |
| Revenue Card 752:385 (ghost) | Card + Metric + AreaChart + period Select | registry `trend-card` (imports charts, so not core) | v0.3 | pattern | split |
| Ranked List 752:444 (ghost) | Generic bar list | `react/ranked-list` | v0.3 | T0 | server |
| **05 Commerce** (all thin compositions, so registry, C12) | | | | | |
| Product Card 7275:13989 | Status → `availability` + `publication` (G20 naming) | registry `product-card` | v0.3 | pattern | server |
| Variant Option 7275:14018 | Type Colour\|Size, State → core `ChoiceChip` (radio-based) + registry `variant-picker` | `react/choice-chip` + registry | v0.3 | T0 | leaf |
| Product Row 7275:14040 (ghost 753:476), Order Row 7275:14091 (ghost 753:644) | On core `Table*` parts; state → `data-selected`/`data-interactive` | registry `product-row`, `order-row` | v0.3 | pattern | server + selection island |
| Discount Card 7275:14130 | Status → `publication`; usage meter → `ProgressBar kind="meter"` | registry `discount-card` | v0.3 | pattern | server |
| Payment Method 7275:14174 | Core `ChoiceCard` (radio card) + registry `payment-method` | `react/choice-card` + registry | v0.3 | T0 | leaf |
| Shipment Tracker 7275:14195, Plan Card 7275:14284 | Step / Tier → props | registry | v0.3 | pattern | server |
| Customer Card 754:530, Order Summary 754:897 (ghosts) | — | registry | v0.3 | pattern | server |
| **06 Navigation** | | | | | |
| Nav Item 7275:14700 / **755:658** (live) | State Active → `aria-current` via `render={<Link/>}`; Collapsed → rail; Count → `count` | `react/shell` | v0.2 | T0 + Tooltip in rail | split |
| Sidebar 7275:14732 / **755:869** | Expanded → `--nz-layout-sidebar` (264/72/0); off-canvas below sm = modal Drawer | `react/shell` | v0.2 | T0 + T1 | split |
| Search Field 7275:14764 / **755:888** | `SearchField` (`<search>` + `type=search`) + `CommandTrigger` | `react/search-field` | v0.2 | T0 | leaf |
| Tab 7275:14781 / **755:961** | `Tabs` (panels, T1) + `TabNav` (links, T0) | `react/tabs` | v0.2 | T1 / T0 | client / server |
| Segment 7275:14797 / **755:982** | `SegmentedControl` (native radios; `data-selected`) | `react/segmented-control` | v0.2 | T0 | leaf |
| Store Switcher 755:663 | `WorkspaceSwitcher` (Menu-based) + commerce preset in registry | `react/shell` | v0.3 | T1 | client |
| Command Menu 755:889 | `CommandMenu` (lazy) + hotkeys | `react/command-menu`, `react/hotkeys` | v0.3 | T1 | client |
| Top Bar 755:1031, Mobile Top Bar 764:3397 | `TopBar`, `MobileTopBar` | `react/shell` | v0.2 | T0 | server |
| Breadcrumb 755:998 | Links via `render` | `react/breadcrumb` | v0.2 | T0 | server |
| Pagination 755:1007 | `getHref` / `render` links; `labels` | `react/pagination` | v0.2 | T0 | server |
| Kbd (detached frames) | Dual glyph sets + `data-nz-platform` | `react/kbd` | v0.2 | T0 | server |
| **07 Feedback & Overlays** | | | | | |
| Toast 7275:15071 | Tone success/critical/neutral; `toast()` store + `Toaster`; top layer | `react/toast` | v0.2 | T2 on RAC hooks | client |
| Alert 7275:15091, Banner 7275:15120 | Tone info/success/warning/critical, promo/warning; dismiss = IconButton | `react/alert`, `react/banner` | v0.2 | T0 + island | split |
| Modal 7275:15139 | Type Destructive → `role="alertdialog"` | `react/dialog` | v0.1 | T1 | client |
| Drawer 756:1001 (ghost) | `side` logical start\|end\|top\|bottom; modal default; bottom Sheet | `react/drawer` | v0.2 | T1 | client |
| Empty State 7275:15168 | Context Orders\|Search → `variant` empty\|no-results; `headingLevel` | `react/empty-state` | v0.1 | T0 | server |
| Skeleton 7275:15181 | Shape Line/KPI/Row → `Skeleton` primitive; components render their own loading state (G20) | `react/skeleton` | v0.1 | T0 | server |
| (new) InlineError | `action` slot | `react/inline-error` | v0.1 | T0 | server |
| **08 Overview Dashboard** | | | | | |
| Mobile Tab Bar 7275:18747 | Active → `aria-current`; 5 tabs; labels truncate | `react/shell` | v0.2 | T0 | server |
| AppShell, PageHeader, Section, Split (compositions) | Parts | `react/shell`, `react/page-header`, `react/layout` | v0.2 | T0 | server |
| DataTable + Table Header ghosts 753:410 / 753:599 (merged) | `Table*` parts, `TableSelection`, `BulkActionBar`, `DataView` | `react/table`, `react/data-view`; registry `data-table(-virtual)` | v0.2 / v0.3 | T0 + island | server + island |
| Order List Item 764:3483 | List presentation for DataView | registry `order-list-item` | v0.3 | pattern | server |
| FilterChip / ChipGroup (frames) | Native checkbox/radio chips | `react/chip-group` | v0.3 | T0 | leaf |
| Avatar / StoreMark (frames) | `Avatar` (image, initials, square) | `react/avatar` | v0.2 | T0 | server |
| Scrim RECT 7275:16092 | `--nz-bg-scrim` | tokens (code-owned) | v0.1 | — | — |
| Page templates (overview, resource index, detail form, settings, onboarding) | Composed from core parts | registry templates | v0.3 | pattern | split |
| **09 Lab** | | | | | |
| Rays 7275:19610 / Mesh 7275:19633 shaders | `ShaderSurface` + presets (WGSL → GLSL port; sources needed from the file owner) | `@nizivo/lab` | ≥ v0.3 (0.x) | own | split (poster SSR) |
| ToastEnterExit, CardLift + Press, SkeletonPulse, ChartDraw | Component CSS on motion tokens | css / charts | v0.1–v0.2 | — | — |
| Float, Stagger/Reveal, Tilt, Magnetic, CountUp | CSS utilities + `usePointerFx`, `CountUp` | `@nizivo/motion` | v0.2 | own | server / leaf |
| HeroSection, FeatureTile, ProfileCard | Patterns | registry | v0.3 | pattern | server |
| Parallax/Spotlight | — | deferred | — | — | — |
| **10 Instagram Storefront** (registry `storefront/*`, C12) | | | | | |
| Collection Circle 7275:19802 | StoryRing on core `Avatar` | registry | v0.3 | pattern | server |
| Shoppable Post 7275:19815, Post Badge 772:4419 | `Image` + core `Hotspot`; Badge recipe | registry | v0.3 | pattern | split |
| Product Tag 7275:19846 | Core `Hotspot` (button + popover) | `react/hotspot` + registry | v0.3 | T2 | client |
| Tagged Product 7275:19862, Storefront Bar 7275:19889, Post Viewer, Hotspot Editor | Patterns (editor later) | registry | v0.3+ | pattern | split |
| Social/Instagram glyph 772:4302 | Brand icon with usage note | `@nizivo/icons/brands/instagram` | v0.1 | T0 | server |
| Sticky Action Bar, Page Indicator, Quantity stepper | `StickyBar`, `PageIndicator`, `QuantityStepper` (native number + 2 buttons) | `react/*` | v0.3 | T0 | server / leaf |
| Rating stars, checkout forms | Patterns on Field, RadioGroup, ChoiceCard | registry commerce | v0.3 | pattern | split |

**Missing from Figma but in core** (M-C, GA §6): Popover (v0.2, T1), Combobox (v0.3, T1, +9.8 KB), NumberField (v0.3, T1, +9.8 KB), Form/SubmitButton/Fieldset/FormMessage (v0.2), LiveAnnouncer (v0.2), ThemeScript (v0.1).

**Design prerequisite (G1).** Design relinks the ghosts so IDs are stable before `component-map.json` freezes. Until then the map keys both IDs.

---

## 9. Roadmap

### v0.1: "every seam, end to end" (target: ~6 weeks for 2–3 engineers)

**Scope.**
1. **Tokens.**
   - TokensBrücke export PR; `normalize.ts`; resolver; Terrazzo with the verified permutations; spring generator.
   - The a11y override file (Option A plus the new tokens), contrast matrix, golden files.
   - `tokens.css`, `tailwind.css`, `tokens.json`, `contract.json`.
2. **CSS.** Canonical layers, `nz.base` a11y floor, utilities, stylelint contract rules, Lightning CSS guards.
3. **`@nizivo/react`:**
   - **Server-safe:** Text, Heading, Stack/Inline/Grid/Container, Button, Badge, Card, Delta, Metric, NumberValue, KpiTile, ProgressBar, Skeleton, EmptyState, InlineError, ThemeScript.
   - **Form:** Field (+FieldScope), Input, Textarea, Checkbox, RadioGroup, Switch.
   - **T1:** Tooltip, IconButton, Select, Dialog/AlertDialog.
   - **Plumbing:** `augment`, `config`, `i18n`, `en-US` labels.
4. **`@nizivo/icons`:** generated Lucide set + Instagram brand glyph.
5. **testkit:**
   - Select, Dialog and Tooltip conformance;
   - overlay subset O-01, 03, 04, 10, 11, 12, 15, 17, 20, 21, 22;
   - S1 theme matrix as a fixture (Chromium + WebKit; Firefox on Linux CI).
6. **Fixtures:** `next-rsc` (Turbopack **and** webpack builds) and `vite-spa`, both installing packed tarballs.
7. **Contracts:** `contracts/` with layers, vocabulary and the generated api manifests; `contracts:diff` in CI.
8. **Release:**
   - Changesets fixed group;
   - split release workflow with OIDC;
   - throwaway-package rehearsal, then `0.1.0` on the `next` dist-tag (pre mode).
9. **Docs:** Fumadocs skeleton (getting started for Next and Vite, tokens reference, component pages rendering `*.example.tsx`, props tables from manifests). Storybook workshop internal.

**Exit criteria** (each is a check that already has evidence of feasibility):
- [ ] The Next 16.4 fixture builds with **namespace and flat** imports of Select, Dialog and Card in both bundlers (S2 layout B). A server-only page emits **no** `@nizivo` client chunk (r5 §6.2).
- [ ] The r4 directive guard passes. The "no `export * as` from a directive module" lint passes.
- [ ] The S1 matrix fixture passes in CI (nested `data-nz-theme`, no-attribute → light, reduced motion). The Lightning CSS guard finds no `--lightningcss-*`.
- [ ] The contrast matrix has zero AA misses over all permutations, with every override approved and dated.
- [ ] Select, Dialog and Tooltip conformance are green on Chromium, Firefox and WebKit under React 19.2 and 19.3.
- [ ] `size-limit` budgets are set from the first build (+10%), and engine sets are ≤ r3 baselines +10%. The seam cost (`stateAttrs` + `EngineLocale` + `renderElement`) is measured and recorded in the seam ledger.
- [ ] The packed `.d.ts` grep for `react-aria` = 0. publint and attw pass.
- [ ] The Figma file's owning team is confirmed and moved to a Neev-owned paid team (S-d).
- [ ] The licence is decided by the user or legal before the repo opens.

### v0.2: "overlays, navigation, data display, heavy modules"
- Menu, Popover, Tabs/TabNav, SegmentedControl, Toast + LiveAnnouncer (top layer; **O-06 must pass first**), Alert, Banner, Drawer/Sheet.
- Shell (AppShell, Sidebar, NavItem, TopBar, MobileTopBar, MobileTabBar), PageHeader, Split, Breadcrumb, Pagination, SearchField, Kbd, Avatar, Image, Surface, ProgressRing, FileUpload, NativeSelect.
- Form, SubmitButton, Fieldset, FormMessage; `Table*` parts + selection + BulkActionBar + DataView.
- `@nizivo/charts` (Sparkline, Area, Bar, Donut, Frame) and `@nizivo/motion`.
- `tokens.blocks.css`; the full overlay O-suite.
- Fixtures: vite-ssr, astro, react-router-8, tanstack-start, plain-html.
- CSP Profile A/B CI; Trusted Types fixture; narrow ESLint react-hooks job.

### v0.3: "complex inputs, domain kits, i18n"
- Combobox, NumberField, QuantityStepper, PasswordInput, CommandMenu + hotkeys, `unstable/date-range-picker` + calendar, RankedList, ChoiceCard/ChoiceChip, ChipGroup, Hotspot, PageIndicator, StickyBar, WorkspaceSwitcher; Funnel, Heatmap.
- **Registry v1:**
  - `init`, commerce, storefront, dashboard templates, `trend-card`, `insight-card`, `app-shell`, `data-table(-virtual)`;
  - `<c>-css` re-skin items;
  - immutable versioned URLs, SHA-256 manifest, item-policy linter.
- Locale catalogues (de, en-GB, hi, ar, ja, …), RTL VR (~220 shots), Argos.
- Guidepup NVDA/VoiceOver jobs (non-blocking); `@nizivo/codemod` skeleton; `@nizivo/lab` 0.1 if a consumer needs it.

### v1.0: "freeze the contracts"
- **API and contracts:** API freeze across props, vocabulary, classes, hooks, layers and tokens. Deprecations removed, with codemods.
- **A11y debt:** every a11y override is either resolved in Figma or re-approved.
- **Design sign-off** on:
  - breakpoints md/lg;
  - dark elevation;
  - the text ladder;
  - toast timing (action toasts persist);
  - Card rest elevation;
  - sidebar widths;
  - the spring parameter order.
- **Quality gates:**
  - SR automation blocking for Select, Combobox, Menu, Tabs, Dialog and Toast;
  - fixtures green for 30 days.
- **Policy and publishing:** LTS policy published (r5 §11.3); Figma Community file published from the Neev team.

### Explicitly deferred (with the trigger that brings each back)

| Deferred item | Comes back when |
|---|---|
| Native top-layer dialog and popover adapters | GC §1.4's four blockers clear |
| React Compiler output | Phase 2 (r1 D2), client leaves only |
| Publishing `@nizivo/css` | A non-React consumer appears |
| Vue or Web Components bindings | Ark/Zag v2 is stable (r3 §12) |
| Real-time 3D (three/R3F) and liquid glass | — |
| Code Connect | Organization plan (S-d) |
| Native Temporal | `web-features` marks it Baseline (GA §4.1) |
| Per-instance `unstyled` | — |
| Generated component-token tier | — |
| `#engine/*` import map | — |
| A 12 px caption style | Design request (GC §3.7) |

---

## 10. Risks and mitigations; what to verify next

### 10.1 Risks

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| R1 | **The engine contract drifts toward RAC-only features**, so a swap stops being cheap | M / H | Contract minimalism (r3 §8.1.5): a public prop must be satisfiable by at least two engines (or native); extras are `unstable_`. Run the testkit against a **second adapter for at least one family** (the native Tooltip or a Base UI Select spike) by v0.3, so the seam is proven and not assumed |
| R2 | RAC Toast hooks (`useToast`, `useToastRegion`) change. They are not `UNSTABLE_`, but their stability is UNVERIFIED (r3) | M / M | Own store and region; hooks only render. O-06, O-07, O-09 and O-14 gate upgrades; Renovate group for `react-aria*` |
| R3 | S2's rule regresses (someone namespaces from a client file) | M / H (prod build breaks) | Lint rule + Next fixture build in CI on every PR (both bundlers) |
| R4 | `light-dark()` nesting or CSP behaviour differs in **Firefox** (S1 and GB §B1 ran only Chromium and WebKit) | L / H | Run the S1 matrix and the CSP matrix on Linux CI Firefox in week 1 |
| R5 | Terrazzo (small community, broke at 0.10 → 2.0) changes output | M / M | Exact pin, golden files, custom logic in plugins, DTCG source tool-neutral (r7 §13). The Style Dictionary swap is **untested** (spike not run): keep it documented, not promised |
| R6 | tsdown pre-1.0 breaks directive preservation | M / H | Exact pin; r4 guard; unbundled output so tsc/bunchee can replace it |
| R7 | pnpm 12 OIDC publish through Changesets is untested end to end, and its workspace keys are unverified | M / M | Day-1 rehearsal on a throwaway package; 11.28.x fallback (r4 §13) |
| R8 | Figma ownership: the file may sit in a personal Pro team; MCP sessions use an individual account | M / H | Move it to a Neev-owned paid team before v0.1 exit; bot accounts for TokensBrücke |
| R9 | The design is WIP. Token renames and new variants force churn | H / M | `unstable/*` lane, `$deprecated` aliases, additive variants, registry for domain kits, contracts diff that classifies every change |
| R10 | The a11y override layer becomes permanent debt | M / M | Expiry + redundancy + drift checks; a public deviations page; the release gate |
| R11 | RAC inline `VisuallyHidden` styles break under strict CSP Profile B | H for B users / M | Profile A is the default; B is guaranteed for the server-safe set only; per-release grep of engine inline styles (GB §D-1) |
| R12 | Locale-string weight (+4.8 KB dashboard, +13.4 KB date pickers) for consumers without the optimize plugin | H / L | Budgets measured with all locales; per-framework recipes (GB §A9) |
| R13 | Chart percent-space geometry: Safari `non-scaling-stroke` quirks; clip-path draw in RTL | M / M | Early WebKit VR; `xDirection` default `ltr`; pathLength fallback after QA |
| R14 | Two copies of tokens CSS (`@nizivo/tokens/tokens.css` and `@nizivo/react/css/core.css`) imported together with skewed versions | L / M | Fixed versioning; `--nz-css-version` dev warning; docs say "one or the other" |
| R15 | Sidebar width conflict (tokens 264/72 vs frames 248/76) and the rail breakpoint | H / L | Tokens are the source; changing them is a value edit; md/lg are provisional |
| R16 | Licence chosen after outside contributions | L / H | Decide before the repo opens (D14) |

### 10.2 What to verify next (ordered, each about a day or less)

1. **Firefox:** re-run `spikes/s1-lightningcss/matrix*.mjs` and the GB CSP matrix on a Linux runner. Add one probe for `color-scheme: var(--nz-scheme-inverse)` on the inverse scope: it is reasoned from S1, not run in it.
2. **S2 variant:** a **single** `'use client'` file with many parts, namespaced through a directive-free `*.parts.ts`. Layout B used two client files. Add it to the Next fixture; also run `hydrate.mjs` and record interactivity.
3. **O-06:** a RAC modal + `popover="manual"` toast at runtime (F8 reachability, no outside-dismiss, axe `aria-hidden-focus`).
4. **RAC adapter feasibility:** confirm the `render`-prop support and render-state field names (`isFocused`, `isSelected`, `isEntering`, placement) on Button, Popover, ListBoxItem and Modal in 1.22.1. The §6.7 sketch is illustrative.
5. **Terrazzo typography** composite output names and brand-scope alias re-declaration (S-b 1 remainder). Also check two `css()` plugin instances in one config (§7.7); the spike used separate config files.
6. **Seam cost:** measure `stateAttrs` + `EngineLocale` + `renderElement` on the Select and Dialog builds, and replace the estimates in §3.1.
7. **pnpm 12.11.2:** OIDC publish rehearsal; `trustPolicy` and `blockExoticSubdeps` key validation; whether `pnpm sbom` emits licence fields.
8. **Design confirmations** (one meeting):
   - `spring()` parameter order;
   - rail → expanded breakpoint;
   - sidebar 264/72 vs 248/76;
   - Card rest elevation;
   - text ladder Option A;
   - action-toast persistence;
   - accent hover token;
   - KPI Tile tinted semantics.
9. **Field recipe:** React 19.3 auto-reset vs `defaultValue` echo ordering (GA §2.4) in the Next fixture.
10. **Safari:** `vector-effect: non-scaling-stroke` + clip-path reveal on the area chart.
11. **`aria-rowcount`** on native tables with NVDA and VoiceOver (GA §3.7).
12. **Optional:** whether tsdown unbundle resolves package.json `imports` (`#engine/*`). If it does, X15 becomes a cheaper global swap point.
