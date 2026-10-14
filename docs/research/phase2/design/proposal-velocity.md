# Nizivo UI — Architecture proposal: small-team velocity and WIP-design reality

Date: 2026-10-14. Lens: **small-team velocity and WIP-design reality.** This proposal competes with two others. It takes the 16 settled decisions as constraints and does not re-open them.

**Evidence keys.**
- `rN §x`: research reports in `docs/research/`.
- `C/S/G/D`: items in `docs/research/00-critique.md`.
- `gap-a/b/c`: the gap reports.
- `S1–S4`: the spike folders under `scratchpad/spikes/`. No `REPORT.md` exists, so this proposal cites the raw spike outputs directly.
- `probe`: `scratchpad/design/probe/probe.mjs`, run today on Chromium 156.0.8078.4 and WebKit 27.2.
- `VERIFIED` means measured or run locally. `UNVERIFIED` means not yet checked.

---

## 1. Summary

### 1.1 Thesis

A small team building against a design that will keep changing runs out of engineer-hours long before it runs out of kilobytes. Those hours go to rework, release ceremony, drift between Figma and code, and bookkeeping between files. The architecture should therefore spend effort on four things.

1. **One source of truth per concern; generate everything else.**
   - Figma variables generate tokens, which in turn generate the CSS, JS refs, the Tailwind adapter and the token docs.
   - A per-component `component.json` generates barrels, namespace files, the `exports` map, size budgets, docs stubs, the Figma component map and conformance-test skeletons.
   - The TypeScript source generates the props manifest.
   - The CSS generates the hooks manifest.
   - Hand-written code is limited to component markup, CSS, and behaviour adapters.
2. **The fewest packages that still keep every layer swappable.**
   - v0.1 ships three npm packages: `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons`.
   - v0.2 adds `@nizivo/charts`.
   - Every other package from the reports is either a subpath or deferred, and its seam already exists.
3. **Lanes where change is free, sized for a design in progress:**
   - the `unstable/*` subpath, which semver does not cover;
   - dark mode shipped as *preview* until design has seen it rendered;
   - a time-boxed token override file for accessibility fixes, so design is not a blocker;
   - **docs examples instead of npm packages** for domain compositions (commerce, storefront, templates), which become registry items at v0.3.
4. **One behaviour engine that covers the whole Figma inventory**, so the team never hand-builds a calendar, combobox or number field. That engine is React Aria (r3). It sits behind a seam where one field in `component.json` decides which engine a component uses.

### 1.2 What changes from what the user was told

**The core package name is `@nizivo/react`, not `@nizivo/ui`.** The import is `import { Button } from "@nizivo/react"`, or `"@nizivo/react/button"` per component.

- The user said "React only for now". A framework-named package keeps `@nizivo/css` and any future `@nizivo/vue` free of naming collisions (r8 §5.2, C1).
- Renaming costs nothing before the first publish and a full deprecation cycle afterwards.
- The `@nizivo` scope is owned, so `@nizivo/ui` cannot be squatted and does not need reserving.
- If the user prefers `@nizivo/ui`, the change is one field per `package.json` until 0.1.0 ships.

### 1.3 Spike and probe results this plan is built on

All of these are VERIFIED. They override any report claim they contradict.

| # | Result | Consequence |
|---|---|---|
| S2 RSC | `export * as Dialog from './dialog.parts'` **fails** in a Next 16.4 Server Component when `dialog.parts.tsx` itself carries `'use client'`. Turbopack and webpack both fail with "Element type is invalid … got: undefined" (`s2-rsc/app/build-turbopack-with-ns-a.log`, `build-webpack.log`). tsdown puts the `__exportAll` namespace object *inside* the client module (`s2-rsc/lib/dist/dialog/dialog.parts.js`). The **Sheet shape passes** on both bundlers (`build-turbopack.log`, `build-webpack-ok.log`): a **directive-free** `sheet.parts.ts` re-exports from `*.client.tsx` leaves, and the barrel does `export * as Sheet from './sheet.parts'`. | **r3 §8.6's sketch is the failing pattern.** Its `parts.tsx` carries `'use client'` and is the target of `export * as`. Here the generator emits only the passing shape (§6.8), and a fixture page guards it. Hydration of the passing page was not recorded, so the v0.1 fixture re-runs it. |
| S1 theme | Native `light-dark()` nests correctly through scope attributes, including `var()` inside `light-dark()`, in Chromium 156 and WebKit 27.2 (`s1-lightningcss/matrix-results.json`, `matrix-varinside-results.json`). Lightning CSS lowering to Safari 16.4 **breaks nesting**: a dark scope inside a light root renders light. With an unset or `normal` root, every lowered token is **transparent**. Registering colours with `@property` also breaks nesting. `color-scheme: normal`/unset resolves to **light** whatever the OS says. Firefox did not launch in the sandbox, so Firefox is UNVERIFIED. | D6/D7: use `light-dark()` with a Safari 17.5 floor. There is no "lowered legacy" file. The default theme is opt-in. |
| S3 tokens | Terrazzo 2.8 partial permutations re-emit *every* token unless `only: { modifiers: [...] }` plus `exclude: ["color.p.**"]` are set. With both, the output is clean (`s3-terrazzo/out/tokens.only-sets.css`). A ~15-line `lightDark` transform works (`tokens.lightdark.css`). Official `plugin-tailwind` emits **primitive** refs plus an `@variant dark` block (`tailwind-theme.blocks.css`). A ~20-line custom plugin emits semantic refs (`tailwind-theme.custom.css`). The default `variableName` gives `--nz-color-bg-surface`; a `color.`-stripping mapper gives `--nz-bg-surface` (settled 5). | D5: Terrazzo with three small in-repo plugins. D4: the Tailwind adapter is generated by our own plugin. |
| S4 springs | Own analytic solver at a 0.1% settle threshold with RDP-adaptive `linear()` (ε 0.004) gives `spring(1,260,24,0)` → **493 ms**, 3.02% overshoot, 19 points, 224 B, max error 0.0037. `spring(1,170,26,0)` → **702 ms**, 18 points (`s4-spring/spring-results.json`). Motion 14.2's `toString()` says 600/750 ms, but its own done-scan gives 554/718 ms. **Re-run today:** all 12 generated strings pass `CSS.supports` in Chromium 156 and WebKit 27.2 (`s4-spring/check-css.mjs`). | D12: one generator and one threshold, with no Motion build dependency. |
| probe | `--nz-focus-halo: color-mix(in oklab, var(--nz-border-focus) 28%, transparent)` is declared once at `:root` and still resolves **per scope**: the halo is green/500 at L 0.547 in light and green/300 at L 0.732 in dark. `color-scheme: var(--nz-scheme-inverse)` makes Toast/Tooltip-style inverse surfaces resolve to the opposite theme. With no attribute set, the page stays white under OS dark. This holds in both engines. | The focus halo becomes theme-aware (it is static green/500 in Figma). Inverse surfaces need no `on-inverse` token family (gap-c §2.6). |

### 1.4 Delivery, and what is deferred

**Delivery** assumes 2 front-end engineers plus a designer at about 50%. Details are in §9.

| Release | Target | Contents |
|---|---|---|
| v0.1 | 6–8 weeks | Token pipeline end to end. 32 core components: forms, actions, overlays, display, layout. Icons. Docs site. Next, Vite and Astro fixtures. OIDC release. |
| v0.2 | weeks 7–12 | Charts, dashboard widgets, Toast, Drawer, Table, app shell. Dark mode becomes stable. |
| v0.3 | weeks 13–18 | Registry. Unstable date picker, combobox and command menu. CSP fixtures. |
| v1.0 | ~6–7 months | API freeze. Full overlay conformance, screen-reader automation, RTL visual regression. |

**Explicitly deferred, and why that is safe** (§9.5):
- `@nizivo/lab`: the Figma 3D items are raster images.
- A Motion adapter.
- An `unstyled` prop.
- Brand and density modifiers.
- `@nizivo/css`.
- Codemods.
- Shipping React Compiler output.
- Screen-reader automation before v1.

Each is additive behind a seam that ships in v0.1.

---

## 2. Decision table

Every row cites its evidence. "Reverse" says how to undo the decision later; "Blast radius" says what breaks if it is undone.

| ID | Decision | Choice | Rationale (evidence) | How to reverse later | Blast radius if reversed |
|---|---|---|---|---|---|
| **D1** | Behaviour engine | **Native-first (T0), then React Aria as the single engine family.** `react-aria-components` 1.22.1 covers T1 widgets. `react-aria` 3.53.1 hooks cover own-DOM parts: Toast region, tooltip trigger on our `<button>`, file drop. Both are regular `dependencies` with **caret** ranges so consumers dedupe (r3 §8.9). | **Weight:** the dashboard set is 69.0 KB gz on RAC vs 88.3 on Base UI (r3 §3.2), reproduced exactly in gap-a §1.5. **Coverage:** RAC has a calendar and range calendar for Figma's Date Range Picker (746:267). Base UI has **no calendar** (gap-a §1.4 item 6), which would force the team to build an APG grid by hand, the riskiest a11y work possible for a small team. RAC also has Autocomplete (command menu, **+4.7 KB**, gap-a D19), NumberField and Sheet. **Quality:** 36 locales and a documented screen-reader matrix (r3 §6.2). **Overlays:** RAC exempts `[data-react-aria-top-layer]` from `inert`, so a toast stays reachable over a modal (gap-c §1.3, source-verified). **Velocity:** one family means one Renovate group and one set of quirks. Mixing engines measured worst of all (97.4 KB, r3 §3.2). | Per component: write `_engines/<other>/<name>.client.tsx` against `<name>.contract.ts`. Run the same `test/conformance/<name>.spec.ts`. Change `"engine"` in `component.json`; `nz gen` rewrites two import specifiers. Ship a **minor** ("internal engine change"). For a whole-family swap, drop the RAC dependency when the last component moves. | **Consumers:** none if conformance passes; classes, `data-*`, props and CSS are unchanged. **Internally:** the data-* mapping becomes non-identity (Base UI `data-starting-style` → `data-entering`). Date pickers need their own grid. The toast's inert exemption must be re-implemented. Pages carry about +19 KB on Base UI (r3 §6.3). |
| **D1s** | Engine seam | **Contract plus adapter.** `<name>.contract.ts` holds engine-free public types. `_engines/react-aria/<name>.client.tsx` is the **only** file allowed to import `react-aria*`, enforced by oxlint `no-restricted-imports` (r4 §6.5). Barrels are generated in the S2-passing shape (§6.8). A **conformance-lite** suite (§6.8) runs in v0.1; the full overlay list (gap-c §1.10) arrives by v1.0. `isolatedDeclarations` forces explicit return types, and the API snapshot is grepped for `react-aria` to catch engine-type leaks (r3 §8.1). | The reports agree on the seam (C4). r3 §8 provides the conformance idea. S2 gives the export shape. Generating the files means a swap edits one JSON field, not hand-maintained re-exports. | Remove the seam: inline the adapter into the component. That is internal only. | None for consumers. |
| **D3a** | Package name | **`@nizivo/react`** for components. **This changes the earlier `@nizivo/ui` messaging** (§1.2). | C1. r8 §5.2: a future `@nizivo/css` or non-React port would otherwise collide with "ui". Renaming before publish costs nothing. | Before 0.1.0: rename. After: publish `@nizivo/ui` as a re-export shim (one more trusted-publisher entry) plus an import codemod. | Import specifiers only. |
| **D3b** | Package set | **v0.1:** `@nizivo/tokens` (framework-agnostic), `@nizivo/react` (all core components, CSS, `config`, `i18n`, `augment`, `unstable/*`), `@nizivo/icons` (generated). **v0.2:** `@nizivo/charts`. **No** `@nizivo/motion`: CSS motion lives in tokens and component CSS, and the ~1 KB of hooks sits at `@nizivo/react/motion` (r6 §3.2: own `usePointerFx` is 0.48 KB, CountUp 0.50). **No** `@nizivo/lab` before v1.0. **No** `@nizivo/dates`, `dashboard`, `commerce`, `social` or `blocks`. **No** `@nizivo/css` until a second framework or a plain-HTML consumer appears. | Every npm package needs its own interactive 2FA trusted-publisher setup. Configs expire after 48 h if unused, and there is no scope-wide OIDC (r4 §6.1, §9.3; C12 verdict). Subpaths already tree-shake (r1 D6). Charts gets its own package because it brings runtime deps (d3-shape, d3-array) and has a different release risk. `@nizivo/css` can be extracted later without breaking anyone, because `@nizivo/react/css/*` keeps shipping the same files (r8 §5.2). | To split a subpath into a package: publish the package and keep the old subpath as a re-export for one minor (non-breaking). To merge charts into react: re-export, then deprecate. | Install graph only. |
| **D3c** | Domain kits | **Core** gets everything with behaviour, state or a11y contracts: Metric, NumberValue, Delta, KpiTile, TrendCard, RankedList, the app shell (AppShell, Sidebar, TopBar, MobileTabBar, NavItem), Table and DataView. **Docs examples** (v0.2) cover thin compositions: the 8 commerce sets, 2 commerce ghosts, the storefront set, InsightCard and the 08 page templates. Each is a copyable `*.example.tsx` shown with full source. The **shadcn-compatible registry** (v0.3) is generated from the same files. | C12: the shell is behaviour-heavy, so it belongs in core. 05 found the commerce sets are thin compositions on primitives. r8 E1–E7 showed the registry has **no merge on update**, so it suits only consumer-owned code. A design in progress changes patterns the most, so keeping them out of semver costs nothing. Doing docs examples first postpones the registry infrastructure (pinned `shadcn build`, immutable URLs, SHA manifest, item-policy linter; gap-b §B6) until the patterns stop churning. | To graduate a pattern: `unstable/<x>`, then stable; the registry item becomes a re-export. To demote a core pattern: deprecate it in a minor and offer a registry fork. | Consumers keep their copied code, by design. |
| **D3d** | Channel | **npm only** through v0.2. **Hybrid from v0.3:** npm for anything with behaviour, a11y or contracts; the registry for compositions, per-component CSS re-skin items (r8 L3) and an `init` item. The registry is hosted on the Fumadocs site (settled 14) with immutable `/r/v{x.y.z}/` URLs plus a moving `/r/` alias, built only in CI (gap-b §B6). | r8 §3.5 (hybrid, npm first); C12; gap-b §B6. | Stop publishing items; existing copies are unaffected. | Minimal. |
| **D4a** | CSS authoring | **One plain `.css` file per component, compiled by Lightning CSS 1.33.** It substitutes `@custom-media`, minifies, emits per-component files, and concatenates `styles.css` (r2 §0, §4.5). JS never imports CSS (settled 9). | Zero runtime. Server-safe parts emit only classes and attributes. The output contract does not depend on the authoring tool (r2 §0). Velocity: nothing to learn, nothing to configure. | Write vanilla-extract or Panda `cssgen` sources that emit the same `dist/css/**`. Gates: the vocabulary stylelint check on the output, plus zero visual-regression diff. | None for consumers. |
| **D4b** | Component-token source | **Hand-written in each component's CSS file:** `--_nz-<c>-<prop>: var(--nz-<c>-<prop>, <semantic>)`. Hooks are per **component**, not per variant; consumers scope a hook with `[data-variant=…]`. Hooks are **read, never assigned** by the library. A Lightning CSS visitor extracts them into `api/css-hooks.json`, which feeds the docs tables and the API diff (a removed hook is breaking). | Figma has no component variables (r7 §6.3). A generated DTCG component tier would be a second source of truth plus a custom plugin (C7). Hand-writing means one file per component to edit. The pseudo-private pattern keeps nested themes working (r7 §6.3). | Generate the identical `--_nz-*` declarations from `code-owned/component/*.tokens.json` (r7's plugin). **The names are preserved**, so consumers see nothing. | None. |
| **D4c** | Private var prefix | **`--_nz-`** (C7). gap-a already uses it, and it avoids collisions with consumers' own `--_x` variables. stylelint fails any shipped rule that *assigns* a public `--nz-<component>-*` hook. | C7, r7 §6.3. | Rename with a find-and-replace (private names are not API). | None. |
| **D4d** | Unstyled mode | **No `unstyled` prop in 0.x.** To go unstyled, don't import that component's CSS: use `css/base.css` plus the per-component files you want. Markup, classes, `data-*` and behaviour remain (r8 §6.6, option 1). | Saves a context-plumbed prop on every part. The granular CSS already exists for r8's L3 re-skin. | Add the prop later. It is additive (minor). | None. |
| **D4e** | Tailwind v4 | A generated **`@nizivo/tokens/tailwind.css`** containing `@theme inline { --color-nz-bg-surface: var(--nz-bg-surface); … }` plus radius, shadow, ease and the `--breakpoint-nz-sm` key. It comes from our ~20-line Terrazzo plugin. The documented recipe: `@import "tailwindcss"; @import "@nizivo/react/styles.css" layer(components); @import "@nizivo/tokens/tailwind.css";`. | S3: official `plugin-tailwind` resolves aliases to primitives and adds `@variant dark`, which breaks nested themes. The custom output references semantic vars (`tailwind-theme.custom.css`). r2 §4.6 covers the layer recipe. The `nz` namespace avoids clobbering the consumer's palette (r2). | Rename or drop the file. It is generated. | Only the utility class names Tailwind consumers wrote. |
| **D5a** | Token builder | **Terrazzo 2.8.0, exact pin.** The resolver has sets `primitives` and `foundation` and modifiers `theme` (light/dark), `motion` (default/reduced) and `viewport` (base/sm). Permutations use `only.modifiers` plus `exclude: ['color.p.**']` (S3). Three in-repo plugins: `light-dark` (S3), `tailwind` (S3) and `js-refs`. A shared `variableName` strips `color.` and applies `NZ_TOKEN_PREFIX` (default `nz`). **Style Dictionary 5.6.1** is the documented swap target. | r7 §3.2, §5.1. Terrazzo has DTCG 2025.10 resolver support; Style Dictionary's resolver work has not started (#1590). S3 verified the three behaviours this depends on. | Write a Style Dictionary config emitting the same `dist/**`. A golden-file test on `dist` proves equivalence. | None for consumers. |
| **D5b** | Extractor | **TokensBrücke 3.18.0** (Plugin API, so it works on **any** Figma plan), triggered by the designer. **v0.1:** the designer exports split-mode DTCG JSON and uploads it through the GitHub web UI into `packages/tokens/figma/raw/` on a branch, which opens a PR. No PAT is pasted into Figma. **Upgrade:** use the plugin's push-to-PR with a bot account, once fine-grained PAT support is confirmed (r7 §8.1, UNVERIFIED). The **MCP `use_figma` dump** is the engineer fallback: about 6–8 calls per sync, Pro seat only (r7 §8.2). The **normalizer** is our own (~300 LOC, golden-tested). It allowlists `Grove *` collections and drops Clario, Pipkin, Merit and the rest (00 snapshot). | S-d: no Org/Enterprise plan, so no Variables REST API. The file's team is unknown. A designer-owned trigger fits a design in progress. The plugin path survives a Starter downgrade; the MCP path does not (20 calls a month on Starter). | Anything that writes `raw/**` in TokensBrücke's split-mode shape will do. On Enterprise, run `tokens-bruecke --file-key` in CI. | None downstream of `raw/`. |
| **D5c** | Code-owned tokens | Under `src/code-owned/`:<br>• **breakpoints:** `sm` = 40rem only. `md`/`lg` are reserved names with **no values** until design rules.<br>• **layers:** z raised 1, sticky 100, chrome 200, overlay 1000, toast 1100 (gap-c §1.5).<br>• **scrim:** light neutral/900 at 32%, dark #000 at 60% (gap-c §1.5, matching 08's `bg/inverse @ .32` evidence).<br>• **elevation ring and highlight** (gap-c §2.3), and **focus halo** (probe).<br>• **spring durations**, derived by the normalizer.<br>• **a11y overrides**, time-boxed (gap-c §3.4).<br>Each carries `$extensions["app.nizivo.override"\|"app.nizivo.proposal"]` naming the Figma variable it should become. | r7 §5.2; gap-c §1.5, §2.3, §3.4. Figma has no breakpoints, z-index or scrim (00). | Delete entries as design adds the variables. CI's redundancy check *forces* this (§7.6). | Values only. |
| **D5d** | Drift detection | **v0.1:**<br>• the CI invariant `normalize(raw) === src/figma-owned`;<br>• a sticky **token-diff PR comment** that flags removed or renamed public tokens as breaking;<br>• Argos visual regression on sync PRs;<br>• the release PR body prints the last sync date and Figma version.<br>**v0.2:** a `LIBRARY_PUBLISH` webhook through a tiny relay to a GitHub issue, only once the file is on a Neev-owned Pro team. **No nightly REST poll** while the file may be on Starter, which allows 6 requests a month. | r7 §8.1, §8.3, and its verified rate-limit facts. | Add or remove signals. Outputs are unaffected. | None. |
| **D6a** | Theme mechanism | **`light-dark()` in semantic colour tokens, declared once on `:root`.** Scopes only set `color-scheme`. Colour tokens are **never** registered with `@property`. | S1 shows native nesting works and that lowering and `@property` break it. The probe shows the halo and inverse scope resolve per scope. Duplicated blocks (r7's default) double the colour CSS and freeze consumers' `:root` overrides to the root theme (r7 §10). Inverse surfaces would also need extra blocks. | Switch Terrazzo to the only-modifiers block output (`s3-terrazzo/out/tokens.only-sets.css`), with the same names, and add `[data-nz-inverse]` blocks. | Colour CSS grows. Consumer `:root` overrides must also target `[data-nz-theme]`. The upside is a Safari 16.4 floor. |
| **D6b** | Default | **Opt-in.** `:root` declares no `color-scheme`, so pages render light even under OS dark (S1 `root=unset` rows; probe). `data-nz-theme="system"` follows the OS; `"light"`/`"dark"` force a theme. The quick-start puts `data-nz-theme="system"` on `<html>`. A server-safe `ThemeScript` (~250 B, `nonce` prop) persists the user's choice (r1 D8). | r2 §4.7 argues that a library embedded in host apps must not repaint them; C9. Spike-verified. | Emit `color-scheme: light dark` on `:root` (one line). | Visual, and only for apps that set no attribute. |
| **D6c** | Global attributes | `data-nz-theme` = `light\|dark\|system`. `data-nz-motion` = **`reduce` only**. `data-nz-platform` = `apple\|other`, set by `ThemeScript` for `Kbd` (gap-a §5.4). `data-nz-touch-targets` = `always` (gap-c §3.6). Reserved: `data-nz-density`, `data-nz-brand`. **No `full` motion value** (C9b). **No test-only `off`**: Playwright `animations: 'disabled'` covers screenshots. | r2 (namespaced attributes avoid clashes with daisyUI and next-themes `data-theme`); C9b. | Adding values is a minor. | None. |
| **D6d** | Nested, inverse, brand, density | Any element with `data-nz-theme` is a scope. Toast and Tooltip use an **opposite-scheme scope**, `color-scheme: var(--nz-scheme-inverse)` (gap-c §2.6, probe). **Brand and density come after 1.0**, as resolver modifiers (`[data-nz-brand]` overrides primitives; r2, r7 §6.2). The seam is reserved now. | gap-c §2.6; r7 §6.2. | Additive. | None. |
| **D6e** | Dark-mode status | Dark ships as **`preview` in v0.1**, using gap-c's computed tokens. It becomes **stable in v0.2**, after design reviews renders of pages 02, 04, 06 and 07. | G4: no dark render exists, and every dark verdict so far is computed from hexes. | Not applicable. | Not applicable. |
| **D7** | Support floors | **Browsers:** Chrome/Edge ≥ 123, **Firefox ≥ 129**, **Safari/iOS ≥ 17.5**. Safari 17.5 is what `light-dark()` needs (Baseline Newly 2024-05-13). Firefox 129 is where `@starting-style` and `transition-behavior` land (Baseline Newly 2024-08-06; S-c), which D12 uses for CSS-only enter/exit. The current Firefox ESR is 153 (r3), so 129 excludes nobody who is supported. **Runtime:** React/react-dom `^19.2.0` (settled 9); Node ≥ 22.12 for tooling. **Above the floor, progressive enhancement only:** `popover` (the Toast falls back to `position: fixed` with `--nz-z-toast`; manual popovers are unaffected by the iOS < 18.3 light-dismiss bug, gap-c §1.1), `field-sizing`, anchor positioning, customizable select, view transitions. Lightning CSS targets come from the same browserslist. | S1: a Safari 16.4 build cannot keep nested scopes with `light-dark()`. Next 16 and Tailwind 4 floor at Safari 16.4 (r1), so Nizivo deliberately sits above them, and the docs say so. | Reverse D6a (blocks), then set Lightning CSS targets to 16.4. | Colour CSS about doubles. Inverse scopes need blocks. Nothing else changes. |
| **D8** | Overlays and layering | **gap-c §1.4, adopted whole.**<br>• **Engine portals** for every overlay except Toast.<br>• **One z band** (`--nz-z-overlay`); DOM order stacks overlays last-in-first-out, like the top layer.<br>• **Nested overlays portal into the parent overlay's root**, through an engine-internal container chain: explicit `container` prop, then the parent overlay, then an ancestor `dialog:modal`/`:popover-open`, then `body`.<br>• **Toast is the only top-layer citizen** (`popover="manual"`, re-promoted on each new toast, with a fixed-position fallback).<br>• Scroll lock is the engine's single reference-counted lock.<br>• Focus return follows a fallback chain.<br>• Under Activity, the adapter owns `open`, and transient overlays close in a layout-effect cleanup.<br>• The Toaster mounts at the root, outside route Activity boundaries. | No engine uses the top layer (r3 grep; gap-c §1.3). Fixed per-type z scales break some nesting order (C17). A native `showModal()` would inert toasts (whatwg#9936). RAC's exemption keeps a toast reachable through F8. Removing per-type z numbers removes a whole class of bug. | Each component moves to native `<dialog>`/`popover` behind its adapter once its 4 gates clear (gap-c §1.4). | None for consumers; classes and `data-*` are the same. The z tokens are public: apps with chrome above 1000 raise `--nz-z-overlay`. |
| **D9** | Residual config | **Zero required providers.**<br>• Optional client `NizivoConfig` (`@nizivo/react/config`) with `locale` (default `'en-US'`), `labels` and `portalContainer`. **No `direction`** (gap-b #3).<br>• The RAC adapter **always** wraps engine roots in `I18nProvider locale={resolved}`. Without that, RAC renders `en-US` in SSR and then switches to the browser locale after hydration (gap-b §A3, source-verified).<br>• Server-safe parts take `locale` and `labels` props.<br>• Every date formatter **requires** `timeZone`.<br>• Values are formatted once, where they first render (gap-b §A4 reproduced a Node-versus-browser `formatRange` mismatch).<br>• Links and images go through `render` and element slots (settled 8). | gap-b §A2–A4; r1 D10; C16. | Adding config fields is additive. | None. |
| **D10** | Responsive and layout | **Components use container queries; only the page shell uses viewport media**, through build-time `@custom-media --nz-sm (width >= 40rem)`. **Only `sm` (640 px) is stable** (designer text, settled 11). `md` and `lg` are reserved and **not emitted** until design confirms them. **The `lg` decision blocks AppShell in v0.2** (C11). **Layout primitives** in core, all server-safe: Stack, Grid/GridItem and Container in v0.1; Split and PageHeader in v0.2. **Sidebar widths** come from the Figma variables `layout/sidebar` (264/72/0) through the pipeline; the frames' 248/76 goes to the design backlog. **Navigation** is one serializable `NavItem[]` array rendered by Sidebar, MobileTabBar and (v0.3) CommandMenu sources. | C11; 08 §6.3, §12.3; r2 §4.8.2. Tokens win over hand-measured frames because they sync automatically. | Adding breakpoints is a minor. Moving a component from container to viewport queries is internal CSS. | None. |
| **D11** | Chart internals | **`@nizivo/charts` (v0.2): server-first SVG plus HTML.**<br>• Runtime deps are **d3-shape and d3-array only**, with our own ~10-line linear and band scales.<br>• **Time axis:** our own UTC plain-date ticks (day/week/month, with a forced last tick per 03), instead of d3-scale/d3-time; `scaleTime` would cost 17.6 KB (C14).<br>• Area and line use a percent-space `viewBox` with `preserveAspectRatio="none"` and `non-scaling-stroke`.<br>• Axis labels are **HTML laid out by CSS grid**; bars are SVG `<rect>` in the SSR output. Both survive a strict CSP (gap-b §B1.4).<br>• Draw-in animates **`clip-path` from CSS keyframes**, because `pathLength` with non-scaling strokes is UNVERIFIED.<br>• One **`ChartInteraction`** island (0.6 KB, r6) receives pre-formatted strings.<br>• **`ChartFrame`** (figure, caption, data table, legend, status slots) accepts any renderer as a child. | r6 §2.2–2.5 measured our AreaChart at **3.2 KB** vs Recharts at 107.7 KB, and Recharts' SSR emits no SVG. C14. | Swap the internals (visx, a d3-scale time axis) behind the same props. Consumers can render any library inside `ChartFrame`. | The charts package only. |
| **D12** | Motion | **One generator**: `tooling/spring.ts`, a port of the S4 solver, with **one threshold** (\|x−1\| ≤ 0.001) and RDP ε 0.004. It emits `--nz-easing-spring` as `linear(…)` and `--nz-duration-spring: 493ms`, plus `-soft: 702ms`. **Pairing rule:** a spring easing is only ever paired with its own derived duration (C10). **Reduced mode:** easing `linear`, spring durations equal the Reduced value of `duration/base` (120 ms), and distance and tilt go to 0, as Figma's Reduced mode specifies. **CSS-first:** `@starting-style` plus `transition-behavior` for enter and exit. `CountUp` and `usePointerFx` (Tilt, Magnetic), about 1 KB total, live at `@nizivo/react/motion`. A Motion (motion.dev) adapter is **not planned**: 44.2 KB, and SSR leaves content at `opacity:0` (r6 §3.2). **Policy:** `prefers-reduced-motion` plus `data-nz-motion="reduce"`, with no `full`. The parameter order `spring(m,k,c,v)` is **assumed**; design must confirm it (S-b 7). | S4, with today's CSS validity re-run. A dependency-free solver is deterministic and reviewable. Motion's own `toString` duration overstates its settle time by 46–32 ms. | Changing the threshold changes token values (a patch with visual review). Swapping the generator is guarded by a golden test. | Visual timing only. |
| **D13** | Icons and media | **`@nizivo/icons`** is generated: SVGO 4.1 plus a ~150-line codegen from **exact-pinned `lucide-static` 1.56.0**.<br>• One ESM module per icon, server-safe, `currentColor`.<br>• Default `size=20` and **`strokeWidth=1.92`**, which renders 1.6 px at 20 px (settled 7, S1). `absoluteStrokeWidth` is opt-in.<br>• `aria-hidden` unless `title` is given.<br>• A curated directional subset gets `data-mirror="rtl"` (`mirror.json`, gap-b §A6).<br>• `createIcon`, an alias map for Lucide renames, and the **full** Lucide set.<br>• Brand glyphs come from simple-icons (CC0) under `/brands/*`; only Instagram at first, with a usage note.<br>Core imports no icon package; about 10 internal glyphs are inlined from one list in `_internal/glyphs.tsx`. **`Image`** is a server-safe `<img>`: `width`, `height` and `alt` required, `data-ratio` presets, and **no inline `style`** (gap-b §B1.4). `render` covers `next/image` and unpic. **No fonts** are shipped (settled 15). | r6 §6 (lucide-react costs 2.6 KB gz per 10 icons); C15; gap-b §A6, §B1.4. The generator is a one-off script, so maintenance is a version bump. | Regenerate from another source by changing the generator input. Consumers can pass any `ReactNode`. | The icons package only. |
| **D14a** | TypeScript | **TS 7.0.2** for typecheck, with **oxc isolated declarations** for `.d.ts` (r4 §5.3). `@typescript/typescript6` 6.0.2 is aliased only for tools that need the JS API. The props manifest comes from **ts-morph 28**, which bundles TS 6 (r5 §7). | r4/r5 split (C20); registry-confirmed. | Switch to the TS 7.1 API when it stabilises. | Tooling only. |
| **D14b** | Lint | **oxlint 1.88** (type-aware through tsgolint; `jsx-a11y`, `react`, hooks rules; `no-restricted-imports` for engine imports) plus **oxfmt**. **stylelint 17**, with `stylelint-use-logical` and our own **vocabulary rule**: shipped CSS may use only `nz-*` classes and documented `data-*`. React Compiler rules are **not enforced in 0.x**, because no compiled output ships (r1 D2). | r4 §7.1: typescript-eslint cannot run on TS 7. One linter means one config. | Add ESLint with the `typescript6` alias, for `react-hooks` compiler rules only, if compile phase 2 happens (C20). | Tooling only. |
| **D14c** | Visual regression | **Argos Pro** (about $100/month, r5 §5) from v0.1 with a small matrix: light, desktop, about 150 shots. **Fallback:** Vitest `toMatchScreenshot` in Docker, if the budget is refused. | A hosted review UI is what makes design-churn diffs cheap to approve. r5 §5 says Hobby is for personal projects only. | Swap the uploader. Stories stay CSF3 (r5). | CI only. |
| **D14d** | Licence | **Recommend Apache-2.0** plus `TRADEMARKS.md`, **no CLA**, **DCO deferred** (Apache §5 already licenses inbound contributions). **MIT** is an acceptable fallback. **This is a user and legal decision**; nothing in the plan depends on it (gap-b §B5). | r5 §11.1 (patent grant, trademark reservation for a company project); C22. | Relicensing before outside contributors arrive is trivial. | Legal only. |
| **D14e** | Versioning and release | **Changesets 3.0.3** with one **fixed** group, `[tokens, react, icons, charts]`. The `unstable/*` lane is outside semver, and prereleases use the `next` dist-tag. `@nizivo/lab`, if it ever exists, is independent 0.x (settled 10). **Toolchain:** pnpm 12.11.2 (fallback 11.28.x), Turborepo 2.11, tsdown 0.23.1 `unbundle`. `release.yml` follows r4's split jobs (settled 10), with **a day-1 rehearsal on a throwaway package**. Each package is bootstrapped at its *first* release, because unvalidated trusted-publisher configs expire after 48 h. | r4 §8–9, §12.8; C19, C21. | Move a package to `linked` after 1.0 (r8 §5.7). | Version numbers only. |
| **D15** | A11y remediation | **Figma first, plus a time-boxed override file in the token source** (gap-c §3.4). Overrides are applied as the last resolver source per context, and CI checks the contrast matrix, drift, redundancy and expiry. A **public deviations page** lists them, and **stable releases block on any AA failure**. **v0.1 token fixes** (all from gap-c §3.2):<br>• the **Option A** text ladder (light n900/n700/n600, dark n50/n300/n400);<br>• `border/control` (new primitive n450 in light, n500 in dark);<br>• dark `text/critical` and `text/info` move to new red/400 and blue/400;<br>• `bg/critical` becomes red/600 in both modes, with a new `text/on-critical`;<br>• `icon/warning` amber/600;<br>• `bg/scrim`, `text/accent` and `icon/info`.<br>**Targets:** gap-c's two-axis `::after` hit area on a coarse primary pointer, which fixes S2. **12 px:** none; the lint floor is 14 px, which fixes S5. **Focus:** a 2 px outline plus a decorative halo (settled 12). | gap-c §3; G19. Blocking on design is unbounded (S-d, G4); silent code fixes break the Figma round-trip. | The CI redundancy check deletes each override once Figma catches up. | Visual. |
| **G11** | Forms | **gap-a D16:**<br>• `Field` is a sync server-safe shell (`useId`, label and description from props).<br>• `FieldScope` is a `'use client'` leaf that owns the error slot.<br>• **Every control is a thin client leaf.** This **overrides r3's "Input is T0 server"**; the SSR HTML is still complete.<br>• Native constraint validation stays on, intercepted for inline messages, with **on-submit** timing by default.<br>• **One error channel:** `error` prop, then `Form errors[name]`, then the native message.<br>• `Form` and `SubmitButton` are optional clients.<br>• RHF, TanStack Form and Conform are **docs recipes only**.<br>**v0.1** ships Field, Fieldset, Input, Textarea, Checkbox, RadioGroup, Switch and Select wiring. **v0.2** adds Form, SubmitButton and FormMessage. | gap-a §2 (React 19.3 `react-server` exports `useId`; the `invalid` event reaches React's `onInvalid`; `type=hidden` cannot be `required`). | Make Field fully client. Internal only. | None. |
| **G12** | Data tables | **gap-a D17:**<br>• native `<table>` server-safe parts;<br>• **one** form-based selection island and a bulk bar;<br>• sort, filter and page **state in the URL** through `render` links;<br>• a container-query Table↔List `DataView`;<br>• **TanStack Table v9 and Virtual only in registry blocks.**<br>RAC `Table` (role `grid`, +29 KB) is rejected. **v0.2:** parts, selection, Pagination. **v0.3:** DataView, BulkActionBar, the registry block. | gap-a §3 (RAC grid role from grep; `content-visibility` is ineffective on `<tr>` per the spec). | Swap the registry block's engine. Core is unaffected. | None. |
| **G13** | Dates and time | **gap-a D18:**<br>• public values are ISO plain-date strings;<br>• `@internationalized/date` 3.12.4 is an **explicit** dependency of the date entries;<br>• no Temporal polyfill (19.3 KB; Safari has no Temporal);<br>• `timeZone` is required wherever "today" is involved;<br>• the trigger is the SSR surface, and the calendar is client-only and lazy.<br>Shipped as **`@nizivo/react/unstable/date-range-picker`** in v0.3, until design draws day-cell states. | gap-a §4; BCD Temporal `preview`. | Swap internals to native Temporal as a **patch**, once Baseline. | None. |
| **G14** | i18n and RTL | **gap-b rows 1–8:**<br>• serializable `labels` props with English defaults;<br>• plain-object catalogs at `@nizivo/react/locales/<tag>`, starting with en-US only and adding others on request;<br>• a ~0.2 KB `formatLabel` built on `Intl.PluralRules`, with no MessageFormat dependency (9.65 KB);<br>• **logical properties linted from the first commit**, which is cheap now and expensive later;<br>• the `data-mirror` icon subset;<br>• chart time axes do not mirror by default.<br>**RTL visual regression (ar-EG) and the pseudo-locale arrive at v1.0**; the mirror-geometry Playwright test arrives in v0.3. | gap-b Part A. | Additive. | None. |
| **G15** | Overlay conformance | **v0.1** runs gap-c's O-01, O-03, O-04, O-10, O-11, O-17, O-20 and O-22 on Chromium for PRs and Firefox/WebKit on main. **v0.2** adds O-02, O-05, O-06, O-07, O-09 (manual), O-12, O-13, O-14, O-15 and O-18. **O-06 is the gate for Toast GA.** **v1.0** covers all 25 cases on React 19.2.x and 19.3.x. | gap-c §1.10; S-b 5. | Not applicable. | Not applicable. |
| **G16** | Dark elevation | **gap-c §2.3:**<br>• every floating surface uses `bg/surface-raised` (n850);<br>• a 1 px white 8% ring (`--nz-elevation-ring`, transparent in light);<br>• black shadows at min(0.6, 6 × the light alpha);<br>• dark `bg/subtle` moves to a new n925;<br>• dark borders move one step lighter;<br>• the inner highlight is off.<br>All are code-owned proposals until the design render review. | gap-c §2; Material/Apple/Radix precedent. | These are token values, so retuning them is a patch. | Visual. |
| **G17** | Security and supply chain | **CSP Profile A** is documented: `style-src-attr 'unsafe-inline'` plus nonces.<br>• **Server-safe parts never emit `style`**, enforced by lint.<br>• **No DOM sinks**; the only exception is `ThemeScript`.<br>• npm provenance through OIDC.<br>• pnpm `minimumReleaseAge: 4320`, `allowBuilds: {}`, and (pending a pnpm 12 check) `trustPolicy` and `blockExoticSubdeps`.<br>• `dependency-review` with a licence allowlist.<br>• A tarball-content allowlist.<br>• An `ASSETS.md` **provenance ledger**: no Figma raster ships anywhere until it has an entry.<br>• A lint against `grove` strings.<br>**v0.3:** Profile A/B CI fixtures and a Trusted Types fixture. **v1.0:** SBOM plus `actions/attest@v4`. | gap-b Part B (React SSR `style` attributes are blocked by CSP and never repaired, measured; RAC injects `<style>` with a nonce). | Additive. | None. |
| **G18** | Hotkeys and command menu | **gap-a D19 (v0.3):**<br>• our own `CommandMenu` on RAC Autocomplete, SearchField and Menu inside Modal (**+4.7 KB**, lazy on first ⌘K);<br>• **cmdk rejected** (stale, and it bundles Radix Dialog);<br>• `@nizivo/react/hotkeys`, a module registry on tinykeys 4.0.1 (1.0 KB);<br>• `Kbd` is server-safe and platform-aware through `data-nz-platform`. | gap-a §5. | Swap the matcher. Internal only. | None. |
| **G19** | A11y ownership | This is D15. The RACI follows gap-c §3.4: design is accountable for values; an engineering a11y owner is responsible for the matrix. `code-owned/a11y/**` needs both in CODEOWNERS. | gap-c §3.4. | Not applicable. | Not applicable. |
| **G20** | Loading, empty and error | **gap-b Part C:**<br>• every data-display part takes `status: 'ready'\|'loading'\|'empty'\|'error'`, `pending`, and `empty`/`error` slots;<br>• **the Suspense fallback is the same component with `status="loading"`**;<br>• the frame persists and only the content region swaps;<br>• the library never fetches or suspends;<br>• `aria-busy` plus static visually-hidden text, with no live region inside skeletons;<br>• **Button `loading` is renamed `pending`**, staying focusable with `aria-disabled`;<br>• `status` is reserved for the data lifecycle, so domain states use domain names (`availability`, `fulfillmentStatus`). | gap-b Part C; 07's skeleton-mirrors-layout rule. | Additive. | None. |

---

## 3. Layer architecture

### 3.1 Diagram

```
                ┌──────────────────────────────────────────────────────────────────────────────┐
 DISTRIBUTION   │ npm: @nizivo/tokens · @nizivo/react · @nizivo/icons · (v0.2) @nizivo/charts       │
 (L6)           │ docs examples (v0.2) ──generated──► shadcn registry /r/v{x.y.z}/*.json (v0.3)     │
                └───────────────▲───────────────────────────────▲──────────────────────────────┘
                                │ public entries only            │ copies example source (consumer-owned)
 HEAVY (L5)     @nizivo/charts: server SVG/HTML + 1 island; deps d3-shape, d3-array; imports L2 public only
                                │
 PATTERNS (L4)  core patterns (KpiTile, TrendCard, RankedList, AppShell) → @layer nz.patterns
                docs/registry compositions (commerce, storefront, templates) → consumer code
                                │
 CSS (L3)       styles.css · css/base.css · css/<name>.css   ── first line: canonical @layer statement
                contract: nz-* classes, data-slot, data-* vocabulary, --nz-* tokens, --nz-<c>-* hooks
                                │ styles (never imported by JS)
 COMPONENTS(L2) @nizivo/react/<name>: props, parts, render, (value, details) callbacks
                server-safe modules (no directive) | *.client.tsx leaves | generated index.ts + *.parts.ts
                                │ internal import only (oxlint no-restricted-imports)
 ADAPTERS (L1)  src/_engines/react-aria/<name>.client.tsx — the ONLY importers of react-aria*
                maps props → engine, engine state → data-* vocabulary, --trigger-width → --nz-trigger-width
                                │
 TOKENS (L0)    @nizivo/tokens: tokens.css (@layer nz.tokens, light-dark()), tailwind.css, JS refs, JSON
                                ▲ generated
 PIPELINE (P)   Figma ─extract─► raw/ ─normalize─► src/{figma,code}-owned + resolver ─Terrazzo─► dist/
 ICONS (side)   lucide-static ─codegen─► @nizivo/icons ─► passed into L2 as ReactNode slots
 GENERATOR(G)   component.json ─nz gen─► index.ts, <name>.parts.ts, exports, size-limit, docs stub,
                                         design/component-map.json, conformance skeleton
```

### 3.2 The contract at each seam

| Seam | Contract (what both sides may rely on) | Enforced by |
|---|---|---|
| Figma → `raw/` | TokensBrücke split-mode DTCG 2025.10 shape (`{Collection}/{Mode}.tokens.json`) | A normalizer schema check |
| `raw/` → `src/figma-owned` | `normalize(raw)` is a pure function with golden tests; Figma ids live in `$extensions["dev.nizivo.figma"]` | CI invariant (D5d) |
| src → `dist` (L0) | Stable file names, plus the **token name list** in `api/tokens.json` (semantic, foundation, motion, responsive and code-owned names are public; `--nz-p-*` is private) | Token diff (removing a name is breaking); golden `dist` test |
| L0 → L3 | CSS reads only `--nz-*` names from `api/tokens.json`; never primitives | stylelint: `--nz-p-*` is banned outside `@nizivo/tokens` |
| L1 → L2 | `<name>.contract.ts` types. The adapter emits only vocabulary `data-*` and `--nz-trigger-width`, `--nz-available-width`, `--nz-available-height` and `--nz-transform-origin` (r3 §8.3) | Conformance spec; API snapshot grep for `react-aria` |
| L2 → consumers | Props, parts, `render`, `(value, details)` callbacks, `data-slot` names | `api/react.d.ts` snapshot plus `api/props.json` diff (a removed prop needs a major changeset) |
| L3 → consumers | `nz-*` classes, the `data-*` vocabulary (§6.2), hooks (`api/css-hooks.json`), the layer order, and the CSS file paths | stylelint vocabulary rule; hooks diff; the `exports` map drift check |
| L2 → L4/L5 | Charts and patterns import **only** public `@nizivo/react/*` entries; **core never imports charts or icons** (slots) | dependency-cruiser-style oxlint import rules |
| RSC boundary | `'use client'` appears only in `*.client.tsx` and `_engines/**`; generated barrels and `*.parts.ts` are directive-free (S2) | `check-directives` (src vs dist, r4 §5.2); naming lint; the Next fixture page renders `<Select.Root>` from a Server Component |
| Icons → L2 | Icons are plain `ReactNode`; core inlines only the ~10 listed glyphs | Lint: no `@nizivo/icons` or `lucide*` import in `packages/react` |

### 3.3 How to swap each layer

**Tokens and theme (values).**
1. Design edits Figma.
2. The designer exports through TokensBrücke into a PR.
3. CI normalizes the export, builds, and posts the token diff and visual regression.
4. Merging produces a patch or minor.

*Consumers who want their own theme* load a CSS file after ours that redefines semantic `--nz-*` names from `api/tokens.json`, either at `:root` using `light-dark()` or on any scope. There is no fork and no rebuild.

**Tokens (pipeline tool).**
1. Add `style-dictionary.config.mjs` emitting the same `dist/` files.
2. Run the golden `dist` test.
3. Delete the Terrazzo config.

There is no release impact.

**Behaviour engine, one component.**
1. Create `_engines/base-ui/select.client.tsx` implementing `select.contract.ts`.
2. Run `pnpm test:conformance select --engine base-ui` (keyboard, ARIA snapshot, vocabulary, form participation, SSR/hydration, nesting in Dialog).
3. Set `"engine": "base-ui"` in `select/component.json`.
4. Run `pnpm nz gen`, which rewrites `index.ts` and `select.parts.ts`.
5. The size-limit diff shows in the PR.
6. Ship a minor changeset: "Select: internal engine changed; no API change".

*Whole family:* repeat for each engine component, then remove `react-aria-components` from `dependencies`.

**Styling authoring.**
1. Replace `button.css` with `button.css.ts` (vanilla-extract), configured to emit `dist/css/button.css` with the same selectors.
2. The vocabulary rule runs on the emitted CSS, and Argos must show zero diff.

**A single component** (by Nizivo): change the implementation behind the same props and part contract and run its conformance spec. To pull a component out, move it to `unstable/` with a deprecated stable re-export for one minor.

**A single component** (by a consumer), in four levels (r8 §5.6):
- **Restyle:** set hooks or classes.
- **Recompose:** use parts with `render`.
- **Re-skin:** stop importing `css/<name>.css` and own a copy. This needs granular CSS imports.
- **Replace:** write their own component that emits the same `nz-*` classes and `data-*`, so our CSS still styles it.

**Heavy module (charts).** Internals such as scales, the time axis or the renderer change behind the props contract. A consumer can drop any chart library inside `<ChartFrame>` and keep the title, legend, data table, status states and tokens. Leaving `@nizivo/charts` costs nothing in core: `KpiTile` and `TrendCard` take a `chart` **slot**.

**Distribution channel.** Examples, registry items and npm components share one source tree.
- *npm → registry:* deprecate the npm export in a minor; the registry offers a fork item labelled "no updates".
- *Registry → npm:* the item graduates to `unstable/`; the registry item becomes a thin re-export.
- *Registry off:* stop publishing; copies already in consumer code are unaffected.

**Icon set.** Consumers pass any `ReactNode`. To re-seed `@nizivo/icons` from another source, change `scripts/generate.ts` to read it and keep `aliases.json` for name compatibility.

**Extractor.** Anything that writes `raw/**` in the same shape: the TokensBrücke plugin, the TokensBrücke CLI from an MCP snapshot, or the REST API on Enterprise.

---

## 4. Package map

Budgets are min+gzip with React external, measured with r3's esbuild method **including all 36 RAC locales**, which is the worst case a consumer can hit (gap-b §A9; `optimize-locales-plugin` saves 4.8 KB on the dashboard set). Each limit is the measurement plus about 10% (gap-a §8). An **estimate** row becomes a hard limit after the first build. Under RSC, server-safe parts ship 0 KB of client JS; the Next fixture asserts this.

| Package | Purpose | Public exports (all generated; no `./*` wildcard, C2) | Deps / peers | Budget | Version group | First release |
|---|---|---|---|---|---|---|
| **`@nizivo/tokens`** | Framework-agnostic tokens generated from Figma, plus code-owned tokens. `"sideEffects": ["**/*.css"]` | `./tokens.css` (all layers of tokens in `@layer nz.tokens`), `./tailwind.css`, `.` (JS: typed refs such as `tokens.bg.surface === 'var(--nz-bg-surface)'`, plus the name list), `./tokens.json` (resolved per context, for charts, canvas and non-CSS consumers), `./package.json` | none | `tokens.css`: start at r4's 8 kB brotli ceiling, then ratchet to the first build plus 10%. JS: about 0 (string constants) | fixed | v0.1 |
| **`@nizivo/react`** | Every core component and its CSS, plus config, i18n and motion hooks. ESM-only, `"sideEffects": ["**/*.css"]` (settled 9) | `.` (pure re-export barrel, no directive); `./<name>` for each component (§8); `./config` (client `NizivoConfig`); `./theme-script` (server `ThemeScript` and the `themeScript` string); `./i18n` (server-safe `formatLabel` and types); `./locales/<tag>` (v0.2); `./motion` (v0.2: `CountUp`, `usePointerFx`); `./hotkeys` (v0.3); `./augment` (types only: `ButtonVariantMap`, `SizeMap`, `ToneMap`, r8 §6.11); `./unstable/<name>` (outside semver); `./styles.css` (tokens + base + every component); `./css/base.css` (base and utilities, no tokens); `./css/<name>.css` (leaf files, no `@import`); `./css/manifest.json` (per-component CSS dependencies); `./reset.css` (opt-in); `./package.json` | **deps:** `@nizivo/tokens` (exact, via the fixed group), `react-aria-components ^1.22.1`, `react-aria ^3.53.1`; (v0.3) `@internationalized/date ^3.12.4`, `tinykeys ^4.0.1`. **peers:** `react`/`react-dom ^19.2.0`, and `@types/react` as an optional peer | **Server-safe set** (Button, Badge, Card, Delta, Progress, Skeleton, EmptyState, Text, Stack, Grid, Kbd, Image, Table parts…): 0 client KB under RSC. Each module ≤ 1 KB for SPA consumers (estimate). **Field + FieldScope + Form + SubmitButton:** ≤ 2.5 KB (gap-a target). **Each own control** ≤ 1 KB (target). **RAC standalone measurements (r3 §3.1) → limits:** Tooltip 14.3 → 16; Dialog 28.1 → 31; Tabs 31.9 → 35; Popover 29.4 → 32; Sheet 26.3 → 29; Menu 51.3 → 57; Select 59.5 → 66. **Dashboard set** (Dialog, Popover, Menu, Select, Tabs, Tooltip): 69.0 → **75** (r3 §8.8). **Increments over the dashboard set (gap-a §1.5):** Combobox +9.8 → 11; NumberField +9.8 → 11; CommandMenu +4.7 → 7.5 (lazy); calendar chunk +21.4 → 24 (lazy); date trigger ≤ 1.5. **Toast** (own, on hooks): ≤ 20 until measured, using RAC `UNSTABLE_Toast` at 19.9 as the ceiling. **CSS:** `styles.css` starts at r4's 25 kB brotli ceiling and ratchets; each leaf file ≤ 2 KB (estimate) | fixed | v0.1 |
| **`@nizivo/icons`** | A generated, tree-shakable Lucide set at the Figma stroke. `"sideEffects": false` | `./<icon-name>` (an explicit generated map of about 1,600 entries), `./brands/<name>`, `./create-icon`, `.` (barrel; the docs prefer subpaths), `./package.json` | **deps:** none (`lucide-static` 1.56.0 is a build-time devDependency). **peers:** `react ^19.2.0` | ≤ 0.3 KB per icon (lucide-react measured 2.6 KB per 10 icons, r6 §6.1); a tarball-size budget is tracked in CI | fixed | v0.1 (can slip to v0.2 without blocking anything, since core imports no icons) |
| **`@nizivo/charts`** | Server-first charts. ESM-only, `"sideEffects": ["**/*.css"]` | `./chart-frame`, `./area-chart` (line is an Area option), `./bar-chart`, `./donut-chart`, `./sparkline`, `./legend`, `./chart-tooltip`; (v0.3) `./funnel`, `./heatmap`; `./styles.css`, `./css/<name>.css` | **deps:** `d3-shape ^3.2.0`, `d3-array ^3`. **peers:** `@nizivo/react` (exact, fixed group), `react ^19.2.0` | AreaChart 3.2 → **3.6** (r6, measured); `ChartInteraction` island 0.6 → **0.8** (r6); Sparkline ≤ 2 (estimate); all charts ≤ 12 (estimate) | fixed | v0.2 |
| *`@nizivo/lab`* | 3D, shaders, liquid glass | Not created before v1.0 (§9.5) | (optional peers) | own ShaderSurface measured at 1.4 KB (r6) | **independent 0.x** (settled 10) | post-1.0, only on demand |
| *`@nizivo/css`* | Framework-neutral copy of L3 | Same paths as `@nizivo/react/css/*` | `@nizivo/tokens` | — | fixed | Only when a second framework or a plain-HTML consumer appears |
| *`@nizivo/codemod`* | Migrations | CLI | — | — | fixed | At the first deprecation that needs one |

**Never exported.** `src/_engines/**` and `src/_internal/**` are excluded from the generated `exports` entries; r4 verified the `!src/internal/**` glob exclusion. Generated barrels import adapter files by relative path, so those paths ship in `dist/`, but no `exports` key reaches them: a consumer cannot import `@nizivo/react/_engines/...`. Every package publishes `files: ["dist"]`, `type: module` and `engines.node >=22.12`, with no `require` condition (r4 §6.4).

**Private workspace packages** (not published): `@nizivo/tooling` (generator, checks, spring), `@nizivo/tsconfig`, `@nizivo/tsdown-preset`, `apps/docs`, `apps/workshop`, `fixtures/*`.

---

## 5. Repo layout

```
nizivo/                                   # github.com/<neev-org>/nizivo (public)
├─ .changeset/config.json                 # fixed: [["@nizivo/tokens","@nizivo/react","@nizivo/icons","@nizivo/charts"]]
├─ .github/
│  ├─ CODEOWNERS                          # tokens/src/figma-owned → design + 1 eng; code-owned/a11y → design-lead + a11y-owner
│  └─ workflows/ ci.yml  release.yml (the only workflow npm trusts)  tokens-sync.yml  nightly.yml
├─ apps/
│  ├─ docs/                               # Fumadocs 16.17 on Next 16.4: public docs, the largest RSC consumer
│  │  ├─ content/components/<name>.mdx    # stub generated once by nz gen; prose hand-written
│  │  ├─ content/patterns/*.mdx           # commerce/storefront/template examples (v0.2)
│  │  ├─ app/r/[...path]/                 # (v0.3) registry routes, built in CI only
│  │  └─ generated/                       # props tables (api/props.json), hooks tables, token tables, deviations page
│  └─ workshop/                           # Storybook 10.6 react-vite: internal workshop and test harness
│                                         # (addon-vitest, addon-a11y test:'error', Argos upload)
├─ fixtures/                              # install PACKED tarballs; one shared Playwright spec
│  ├─ next/   vite/   astro/              # v0.1
│  └─ react-router/ (v0.2)  tanstack/ (v0.3)
├─ packages/
│  ├─ tokens/
│  │  ├─ figma/raw/                       # extractor drop zone (committed for audit)
│  │  ├─ figma/tokensbruecke.settings.md  # exact export settings for designers
│  │  ├─ src/nizivo.resolver.json
│  │  ├─ src/figma-owned/                 # written ONLY by the normalizer
│  │  │  primitives  foundation  color/{light,dark}  motion/{default,reduced}  viewport/{base,sm}*  typography  effects
│  │  ├─ src/code-owned/
│  │  │  breakpoints  layers(z, scrim)  elevation(ring, highlight, dark shadows)  focus(halo)  motion-derived(spring durations)
│  │  │  a11y/{primitives,light,dark}.overrides.tokens.json     # time-boxed (gap-c §3.4)
│  │  ├─ plugins/ light-dark.ts  tailwind.ts  js-refs.ts  typography.ts
│  │  ├─ scripts/ figma-normalize.ts  token-diff.ts  figma-push.ts (agent, later)
│  │  ├─ terrazzo.config.ts
│  │  └─ dist/                            # generated
│  ├─ react/
│  │  ├─ src/
│  │  │  ├─ _internal/                    # never exported: render.ts, merge-props.ts, cx.ts, state-attrs.ts,
│  │  │  │                                #   use-controllable.client.ts, glyphs.tsx (the ~10 inlined icons)
│  │  │  ├─ _engines/react-aria/          # 'use client' adapters: select, menu, dialog, tooltip, tabs, popover,
│  │  │  │                                #   sheet, toast, combobox, number-field, calendar, command-menu, locale
│  │  │  ├─ button/      component.json  button.tsx  button.css  button.test.tsx  button.stories.tsx
│  │  │  │               button.example.tsx  index.ts(gen)
│  │  │  ├─ select/      component.json  select.contract.ts  select.parts.ts(gen)  index.ts(gen)  select.css  …
│  │  │  ├─ field/       field.tsx (server)  field-scope.client.tsx  …
│  │  │  ├─ unstable/<name>/…
│  │  │  ├─ config/  theme-script/  i18n/  motion/  augment.ts
│  │  │  └─ index.ts(gen)
│  │  ├─ styles/ layers.css  base.css  utilities.css  reset.css
│  │  ├─ test/conformance/<name>.spec.ts  test/ssr/render-all.test.ts
│  │  ├─ api/ react.d.ts  props.json  css-hooks.json   # generated, committed, diffed
│  │  ├─ .size-limit.json(gen)  tsdown.config.ts  package.json (exports generated)
│  ├─ icons/  scripts/generate.ts  mirror.json  aliases.json  src/(gen)  LICENSE (ISC + Feather MIT notices)
│  └─ charts/ src/_core/{scale,time-ticks,geometry}.ts  src/<chart>/…   (v0.2)
├─ registry/                              # (v0.3) item sources = docs examples; built by a pinned `shadcn build`
├─ tooling/
│  ├─ gen/                                # `nz gen` and `nz new <name> --tier engine|server|client`
│  ├─ checks/  check-directives.mjs  check-css-vocabulary.mjs  a11y-overrides-check.ts  tarball-allowlist.mjs
│  │           api-snapshot.mjs  contrast-matrix.ts
│  ├─ spring/  spring.ts  spring.golden.json
│  └─ tsconfig/  tsdown-preset/
├─ design/
│  ├─ component-map.json                  # generated: Figma canonical ids AND ghost ids → export (C25)
│  ├─ contrast-pairs.json                 # every fg/bg pair components use, with roles (gap-c §3.4)
│  └─ backlog.md                          # one consolidated design backlog (G9): states, tokens, ghost relinking
├─ ASSETS.md  LICENSE  TRADEMARKS.md  SECURITY.md  CONTRIBUTING.md  RELEASING.md
└─ package.json  pnpm-workspace.yaml  turbo.json  .oxlintrc.json  .oxfmtrc.json  .stylelintrc.json  knip.json  renovate.json

* Viewport tokens: `base` is the Mobile mode. The Tablet mode applies at `sm` (640 px). Desktop applies only once design confirms `lg`.
```

---

## 6. Conventions, with code sketches

The sketches are illustrative and have not been compiled. RAC prop names were checked against the installed `react-aria-components@1.22.1` type declarations:
- `Select` takes `value`/`defaultValue`/`onChange`; `selectedKey` is deprecated.
- `Popover` exposes `isEntering`, `isExiting` and `placement`, plus an internal `UNSTABLE_portalContainer`.
- Components accept `render(domProps, renderProps)`.
- `react-aria` exports `useToastRegion`, `useToast`, `useTooltipTrigger` and `UNSAFE_PortalProvider`.

### 6.1 The canonical layer statement (settled 3; fixed once)

```css
/* The FIRST LINE of every shipped CSS file: tokens.css, styles.css, css/base.css,
   each css/<name>.css, charts CSS and registry CSS. The order is semver'd public API.
   Every layer is declared now, including empty ones, because inserting a layer later is a major. */
@layer nz.tokens, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
```

| Layer | Contents | Owner |
|---|---|---|
| `nz.tokens` | Custom properties only, generated | `@nizivo/tokens` |
| `nz.reset` | Empty unless the consumer imports the opt-in `reset.css` | `@nizivo/react` |
| `nz.base` | Theme-scope rules, `.nz-hit-target` (gap-c §3.6), `[data-mirror]` (gap-b §A6), `Kbd` platform switching, `scroll-padding` insets | `@nizivo/react` |
| `nz.components` | Every core component and every chart | `@nizivo/react`, `@nizivo/charts` |
| `nz.patterns` | Compositions that restyle the components inside them: KpiTile, TrendCard, RankedList, AppShell, and docs/registry examples. Living in a later layer means they win **without specificity games** | `@nizivo/react`, consumers' copies |
| `nz.utilities` | `.nz-visually-hidden`, `.nz-truncate`, `.nz-text-link`. These must beat components | `@nizivo/react` |

Unlayered consumer CSS beats every one of these with no `!important` (r2 §4.2).
- **Tailwind recipe:** `@import "@nizivo/react/styles.css" layer(components);` nests all six layers inside Tailwind's `components` layer. Nizivo then sits above preflight and below utilities (r2 §4.6).
- RAC injects an anonymous `@layer {}` into `<head>`. It is created first, so it has the lowest priority (gap-b §B1.2).

### 6.2 The `data-*` vocabulary (settled 4; one table, fixed once)

State attributes are **presence attributes** unless values are listed. The names are chosen to match React Aria wherever RAC has a concept, so the RAC adapter is mostly an identity mapping. A Base UI adapter would have to map `data-starting-style` → `data-entering` and similar. **Native and ARIA come first.** CSS uses `:disabled`, `:focus-visible`, `:user-invalid`, `[aria-expanded]`, `[aria-current]`, `[aria-pressed]` and `[aria-sort]` wherever the platform already expresses the state. The `data-*` names exist only where it does not.

| Attribute | Values | On | Meaning | RAC source (adapter) | From |
|---|---|---|---|---|---|
| `data-open` | — | overlay roots, popups, disclosures | Open | `isOpen` | v0.1 |
| `data-entering` / `data-exiting` | — | popups, backdrops, toasts | Enter or exit animation is running; the node stays mounted until it ends | `isEntering` / `isExiting` | v0.1 |
| `data-side` | `top\|right\|bottom\|left` | positioned popups | Resolved **physical** side after flip and RTL. Props use logical values (gap-b §A6.1) | `placement` | v0.1 |
| `data-align` | `start\|center\|end` | positioned popups | Resolved alignment | `placement` (split) | v0.1 |
| `data-nested-open` | — | dialog popup | A child modal is open | own | v0.2 |
| `data-highlighted` | — | collection items | Keyboard or virtual focus, or pointer hover | `isFocused` (items) | v0.1 |
| `data-selected` | — | items, rows, tabs, segments | Selected | `isSelected` | v0.1 |
| `data-checked` / `data-indeterminate` | — | checkbox, radio, switch, menu check items | Checked / mixed | own (native input) / `isSelected` / `isIndeterminate` | v0.1 |
| `data-placeholder` | — | select value | No value chosen | `isPlaceholder` | v0.1 |
| `data-empty` | — | collections, data-display roots | No items (G20 `status="empty"`) | `isEmpty` | v0.1 |
| `data-disabled` / `data-readonly` / `data-required` | — | control roots, items | Mirror the native attribute | `isDisabled` / `isReadOnly` / `isRequired` | v0.1 |
| `data-invalid` | — | field, control | **An error message is currently presented.** This is *not* the same as "fails constraints" (gap-a §2.3) | own Field state, never RAC's `isInvalid` | v0.1 |
| `data-focus-visible` | — | parts whose focus is virtual or programmatic | Otherwise, use `:focus-visible` | `isFocusVisible` | v0.1 |
| `data-pressed` | — | engine pressables | Pointer or keyboard press. Native parts use `:active` | `isPressed` | v0.1 |
| `data-pending` | — | Button, SubmitButton, data-display roots, optimistic rows | An action or refresh is in flight | `isPending` | v0.1 |
| `data-loading` / `data-error` | — | data-display roots | `status="loading"` / `"error"` (load failure, which is different from `data-invalid`) | own | v0.1 |
| `data-orientation` | `horizontal\|vertical` | tabs, segmented control, separator, toolbar | Layout axis | `orientation` | v0.1 |
| `data-sort` | `ascending\|descending` | `<th>` | Mirrors `aria-sort` | own | v0.2 |
| `data-interactive` | — | table row, card | Has a stretched link | own | v0.2 |
| `data-mirror` | `rtl` | directional glyphs | Flips under `:dir(rtl)` | own | v0.1 |
| `data-x-direction` | `ltr\|rtl` | chart plot | Resolved `xDirection` (gap-b §A6.4) | own | v0.2 |
| `data-today`, `data-outside-month`, `data-unavailable`, `data-range-start`, `data-range-end`, `data-in-range` | — | calendar cells | gap-a §4.6 | `isToday`, `isOutsideMonth`, `isUnavailable`, `isSelectionStart`, `isSelectionEnd`, `isSelected` | v0.3 (unstable) |

**Variant attributes:** `data-variant`, `data-size`, `data-tone`, plus per-component enums declared in `component.json` such as `data-padding`, `data-layout` and `data-ratio`.

**Global ancestors only:**
- `data-nz-theme`, `data-nz-motion`, `data-nz-platform` and `data-nz-touch-targets`;
- reserved: `data-nz-density`, `data-nz-brand`;
- internal marker: `data-nz-top-layer`, used on the toast region and the live announcer (gap-c §1.3).

**Enforcement.** `tooling/checks/check-css-vocabulary.mjs` parses every shipped CSS file with Lightning CSS and fails if a selector uses a `data-*` name or value outside this table. Engine attributes such as `data-rac` or `data-focused` can appear in the DOM, but **no shipped CSS can target them**. That is the guarantee behind engine swaps.

### 6.3 Class, slot, file and hook naming

| Thing | Convention | Example |
|---|---|---|
| Root class / part class | `nz-<component>` / `nz-<component>-<part>`, kebab-case (C6) | `nz-select`, `nz-select-trigger` |
| Slot | `data-slot="<component>-<part>"` on every part | `data-slot="select-trigger"` |
| Public hook | `--nz-<component>-<prop>[-<state>]`, read with a fallback, **never assigned** | `--nz-button-bg-hover` |
| Private var | `--_nz-<component>-<prop>` | `--_nz-button-bg` |
| Components and parts | PascalCase. Parts are `<Component><Part>` flat, and `Component.Part` through the namespace | `SelectTrigger`, `Select.Trigger` |
| Enumerations | Lowercase Figma names. Never invented synonyms | `variant: 'primary' \| 'secondary' \| 'tertiary' \| 'critical' \| 'accent'`, `tone: 'critical'` (not `danger`) |
| Booleans | HTML-aligned, with no `is` prefix | `disabled`, `invalid`, `pending`, `fullWidth` |
| Callbacks | `on<X>Change(value, details)` with a Nizivo-owned `details.reason` (r8 §6.8) | `onOpenChange(open, { reason: 'escape' })` |
| Client files | `'use client'` appears **only** in `*.client.tsx` and `_engines/**`, enforced by a lint rule plus r4's src-vs-dist directive guard (C36) | `field-scope.client.tsx` |

### 6.4 `component.json` and the generator (the main velocity lever)

Each component folder has one manifest. `pnpm nz gen` derives every piece of bookkeeping from it. CI reruns the generator and fails on `git diff`.

```jsonc
// packages/react/src/select/component.json
{
  "name": "select",
  "status": "stable",                         // "unstable" moves it to src/unstable/select and ./unstable/select
  "tier": "engine",                           // server | client | engine | own
  "engine": "react-aria",                     // ← THE engine swap point (D1s)
  "parts": ["Root", "Trigger", "Value", "Popup", "Item", "Group", "GroupLabel", "Separator"],
  "cssDeps": ["base", "field", "popover"],    // feeds css/manifest.json, for granular imports
  "variants": { "size": ["sm", "md", "lg"] },
  "figma": { "canonical": ["7275:11438"], "ghosts": ["745:188"], "related": ["746:204"] },
  "budget": { "measuredKB": 59.5, "limitKB": 66, "source": "r3 §3.1 (RAC Select standalone)" },
  "docs": { "group": "Forms", "apg": "select-only combobox" }
}
```

**What it generates:**
1. `index.ts` and `<name>.parts.ts`, in the S2 passing shape.
2. The `package.json#exports` entry. tsdown's `exports: true` handles the JS; the generator adds CSS entries.
3. A `.size-limit.json` entry.
4. `design/component-map.json`, keyed by canonical **and** ghost Figma ids (C25).
5. `apps/docs/content/components/<name>.mdx`, once only; prose is then hand-written.
6. A `test/conformance/<name>.spec.ts` skeleton for engine and client tiers.
7. A Storybook CSF3 stub.

`pnpm nz new kpi-tile --tier server` scaffolds the whole folder. **Removing a component** means deleting the folder and regenerating, which is how "plug out" stays cheap.

### 6.5 Shared internals (server-safe)

```tsx
// packages/react/src/_internal/render.tsx — NO directive. Used by server-safe AND client parts.
// It must never import react-aria: those modules `import 'client-only'`, which throws under the
// react-server condition (r3 verified facts). That is why we own mergeProps.
import { cloneElement, isValidElement, type ReactElement } from 'react';
import { mergeProps } from './merge-props';   // ~40 LOC: classes concatenated (ours first), style shallow-merged,
                                              // handlers chained consumer-first (r8 §6.4), refs merged
export type RenderProp<P, S> = ReactElement | ((props: P, state: S) => ReactElement);

export function renderElement<P extends object, S>(tag: string, render: RenderProp<P, S> | undefined, state: S, props: P): ReactElement {
  if (typeof render === 'function') return render(props, state);   // function form: from client code, or server→server
  if (isValidElement(render))                                      // element form: RSC-serializable (r8 §6.2)
    return cloneElement(render, mergeProps(props, render.props as P));
  const Tag = tag as 'div';
  return <Tag {...(props as object)} />;
}
```

`useId` is allowed in **sync** server-safe parts, verified in `react@19.3.0` `react-server` (S6). `cloneElement` is also exported there (gap-a §1.4).

### 6.6 Button: server-safe, Figma variants, default `secondary`

```tsx
// packages/react/src/button/button.tsx — NO directive: zero client JS under RSC.
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { renderElement, type RenderProp } from '../_internal/render';
import { cx } from '../_internal/cx';
import { Glyph } from '../_internal/glyphs';
import type { ButtonVariant, Size } from '../augment';   // ButtonVariantMap is augmentable (r8 §6.11)

export interface ButtonState { variant: ButtonVariant; size: Size; pending: boolean; disabled: boolean }
export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Figma "Variant". Default 'secondary': "One primary per view. Secondary for everything else" (Figma 02 doc lead; C26). */
  variant?: ButtonVariant;            // 'primary' | 'secondary' | 'tertiary' | 'critical' | 'accent'
  size?: Size;                        // 'sm' | 'md' | 'lg' → size/control-sm|md|lg (32/40/48)
  leadingIcon?: ReactNode;            // Figma's "Leading icon" boolean becomes a slot (no INSTANCE_SWAP in Figma)
  trailingIcon?: ReactNode;
  pending?: boolean;                  // gap-b #18: `pending`, not `loading`
  fullWidth?: boolean;
  render?: RenderProp<ComponentPropsWithRef<'button'>, ButtonState>;
  children?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', leadingIcon, trailingIcon, pending = false, fullWidth,
  disabled = false, type = 'button', className, render, onClick, children, ...rest }: ButtonProps): React.JSX.Element {
  return renderElement('button', render, { variant, size, pending, disabled }, {
    ...rest,
    type: pending ? 'button' : type,                    // a pending submit button cannot resubmit
    disabled,
    'aria-disabled': pending || undefined,              // stays focusable while pending (gap-b §C2.3)
    onClick: pending && onClick ? swallow : onClick,    // a handler only exists when a client component rendered us
    className: cx('nz-button nz-hit-target', className),
    'data-slot': 'button', 'data-variant': variant, 'data-size': size,
    'data-pending': pending ? '' : undefined, 'data-full-width': fullWidth ? '' : undefined,
    children: (
      <>
        {pending
          ? <Glyph name="spinner" className="nz-button-icon" data-slot="button-icon" />
          : leadingIcon && <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">{leadingIcon}</span>}
        <span className="nz-button-label" data-slot="button-label">{children}</span>
        {trailingIcon && <span className="nz-button-icon" data-slot="button-icon" aria-hidden="true">{trailingIcon}</span>}
      </>
    ),
  });
}
const swallow = (e: { preventDefault(): void }) => e.preventDefault();
```

```css
@layer nz.tokens, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.components {
  .nz-button {
    --_nz-button-bg:        var(--nz-button-bg, var(--nz-bg-surface));           /* secondary = the default */
    --_nz-button-bg-hover:  var(--nz-button-bg-hover, var(--nz-bg-hover));
    --_nz-button-bg-active: var(--nz-button-bg-active, var(--nz-bg-pressed));
    --_nz-button-fg:        var(--nz-button-fg, var(--nz-text-primary));
    --_nz-button-border:    var(--nz-button-border, var(--nz-border-default));
    --_nz-button-radius:    var(--nz-button-radius, var(--nz-radius-md));
    --_nz-button-shadow:    none;
    display: inline-flex; align-items: center; justify-content: center; gap: var(--nz-space-2);
    block-size: var(--nz-size-control-md); padding-inline: var(--nz-space-4);
    border: var(--nz-border-width-default) solid var(--_nz-button-border); border-radius: var(--_nz-button-radius);
    background: var(--_nz-button-bg); color: var(--_nz-button-fg); box-shadow: var(--_nz-button-shadow);
    font: var(--nz-font-label-m); cursor: pointer;
    transition: background-color var(--nz-duration-fast) var(--nz-easing-standard),
                scale var(--nz-duration-instant) var(--nz-easing-standard);   /* Figma: hover 140 ms, press 80 ms */
    &[data-full-width] { inline-size: 100%; }
    @media (hover: hover) { &:hover:not(:disabled, [aria-disabled="true"]) { background: var(--_nz-button-bg-hover); } }
    &:active:not(:disabled, [aria-disabled="true"]) { background: var(--_nz-button-bg-active); scale: var(--nz-scale-press); }
    &:focus-visible {                                       /* settled 12: solid outline survives forced colours */
      outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px;
      box-shadow: var(--_nz-button-shadow), 0 0 0 calc(var(--nz-border-width-focus) + 4px) var(--nz-focus-halo); /* decoration */
    }
    &[data-pending] { cursor: progress; }
  }
  .nz-button[data-variant="primary"] {
    --_nz-button-bg: var(--nz-button-bg, var(--nz-bg-brand));
    --_nz-button-bg-hover: var(--nz-button-bg-hover, var(--nz-bg-brand-hover));
    --_nz-button-bg-active: var(--nz-button-bg-active, var(--nz-bg-brand-pressed));
    --_nz-button-fg: var(--nz-button-fg, var(--nz-text-on-brand));
    --_nz-button-border: transparent;
    --_nz-button-shadow: var(--nz-elevation-button);  /* Figma's raw Primary highlight + shadow (02), as a code-owned effect token */
  }
  .nz-button[data-variant="tertiary"] { --_nz-button-bg: var(--nz-button-bg, transparent); --_nz-button-border: transparent; }
  .nz-button[data-variant="critical"] {
    --_nz-button-bg: var(--nz-button-bg, var(--nz-bg-critical));                 /* red/600 in both modes (gap-c override) */
    --_nz-button-bg-hover: var(--nz-button-bg-hover, var(--nz-bg-critical-hover)); /* PROPOSED token (gap-c §3.2) */
    --_nz-button-fg: var(--nz-button-fg, var(--nz-text-on-critical));            /* PROPOSED token (gap-c §3.2) */
    --_nz-button-border: transparent;
  }
  .nz-button[data-variant="accent"] {                     /* "Accent is reserved for Grove AI": guidance in docs, not enforced */
    --_nz-button-bg: var(--nz-button-bg, var(--nz-bg-accent));
    --_nz-button-bg-hover: var(--nz-button-bg-hover, var(--nz-bg-accent-hover));   /* PROPOSED (02: hover bound to primitive lime/400) */
    --_nz-button-fg: var(--nz-button-fg, var(--nz-text-on-accent));
    --_nz-button-border: transparent;
  }
  .nz-button[data-size="sm"] { block-size: var(--nz-size-control-sm); padding-inline: var(--nz-space-3); gap: var(--nz-space-1-5);
                               --_nz-button-radius: var(--nz-button-radius, var(--nz-radius-sm)); }
  .nz-button[data-size="lg"] { block-size: var(--nz-size-control-lg); padding-inline: var(--nz-space-5); font: var(--nz-font-label-l); }
  .nz-button-icon { display: inline-flex; inline-size: var(--nz-size-icon-sm); block-size: var(--nz-size-icon-sm); }
  .nz-button[data-size="lg"] .nz-button-icon { inline-size: var(--nz-size-icon-md); block-size: var(--nz-size-icon-md); }
  /* Disabled comes LAST so it beats the variant rules, which have equal specificity */
  .nz-button:disabled { --_nz-button-bg: var(--nz-bg-disabled); --_nz-button-fg: var(--nz-text-disabled);
                        --_nz-button-border: var(--nz-border-subtle); --_nz-button-shadow: none; cursor: not-allowed; }
  @media (forced-colors: active) { .nz-button { border-color: ButtonText; } }
}
```

**Consumer restyle, with no fork.** `.checkout .nz-button[data-variant="primary"] { --nz-button-bg: var(--nz-bg-accent) }` in unlayered CSS, or `style={{ '--nz-button-radius': '999px' }}` on one instance.

**Links:** `<Button render={<Link href="/orders" />}>Orders</Button>`. The element form is serializable from a Server Component (r8 §6.2).

**`IconButton`** is the same module plus a required `label`. **With the default `tooltip`** (designer: "always paired with a tooltip"), it delegates to `icon-button.client.tsx`, which renders the `<button>` itself and wires `useTooltipTrigger`. A server-rendered child cannot receive client handlers. With `tooltip={false}` it stays server-safe.

### 6.7 Compound server component: Card

```tsx
// packages/react/src/card/card.tsx — NO directive. Every part is server-safe, so the namespace is trivially RSC-safe.
export function CardRoot({ tone = 'surface', padding = 'md', elevation = 0, render, className, ...rest }: CardRootProps): React.JSX.Element {
  return renderElement('div', render, { tone }, { ...rest, className: cx('nz-card', className), 'data-slot': 'card',
    'data-tone': tone /* Figma "Style": surface | subtle | inverse */, 'data-padding': padding,
    'data-elevation': elevation || undefined });
}
export function CardTitle({ level = 3, render, className, ...rest }: CardTitleProps): React.JSX.Element {
  // A constrained heading level, allowed by settled 1. No polymorphic `as`.
  return renderElement(`h${level}`, render, {}, { ...rest, className: cx('nz-card-title', className), 'data-slot': 'card-title' });
}
// CardHeader, CardDescription, CardAction (Figma's "Show action" boolean becomes a slot), CardBody, CardFooter: same shape.
```

```ts
// card/card.parts.ts (generated, no directive)
export { CardRoot as Root, CardHeader as Header, CardTitle as Title, CardDescription as Description,
         CardAction as Action, CardBody as Body, CardFooter as Footer } from './card';
// card/index.ts (generated, no directive)
export { CardRoot, CardHeader, CardTitle, CardDescription, CardAction, CardBody, CardFooter } from './card';
export * as Card from './card.parts';
```

```css
@layer nz.components {
  .nz-card {
    --_nz-card-bg: var(--nz-card-bg, var(--nz-bg-surface));
    --_nz-card-padding: var(--nz-card-padding, var(--nz-space-6));
    display: flex; flex-direction: column; gap: var(--nz-space-5);
    padding: var(--_nz-card-padding); border-radius: var(--nz-card-radius, var(--nz-radius-xl));
    background: var(--_nz-card-bg); color: var(--nz-text-primary);
    border: var(--nz-border-width-default) solid var(--nz-border-subtle);
    /* At rest: no shadow. The 08 compositions draw none, and C35 ranks compositions as the strongest evidence.
       Pending design sign-off; data-elevation="1" opts in to Elevation/1. */
    &[data-elevation="1"] { box-shadow: var(--nz-elevation-1); }
    &[data-tone="subtle"]  { --_nz-card-bg: var(--nz-card-bg, var(--nz-bg-subtle)); }
    &[data-tone="inverse"] { color-scheme: var(--nz-scheme-inverse); }  /* every nested token flips (probe); no on-inverse tokens */
    &[data-padding="sm"]   { --_nz-card-padding: var(--nz-card-padding, var(--nz-space-5)); }
  }
}
```

### 6.8 Engine-backed Select: the adapter seam and the RSC export shape

**Generated barrels.** This is exactly the S2 passing shape: the namespace target is directive-free and re-exports a client leaf.

```ts
// select/select.parts.ts — GENERATED. No directive (S2: `export * as` must never target a 'use client' module).
export { SelectRoot as Root, SelectTrigger as Trigger, SelectValue as Value, SelectPopup as Popup,
         SelectItem as Item, SelectGroup as Group, SelectGroupLabel as GroupLabel, SelectSeparator as Separator,
} from '../_engines/react-aria/select.client';          // ← import specifier written from component.json "engine"
// select/index.ts — GENERATED. No directive.
export { SelectRoot, SelectTrigger, SelectValue, SelectPopup, SelectItem, SelectGroup, SelectGroupLabel, SelectSeparator,
} from '../_engines/react-aria/select.client';
export * as Select from './select.parts';
export type * from './select.contract';
```

**The contract.** It is engine-free, and only these types reach the public `.d.ts`. `isolatedDeclarations` forces explicit return types, so RAC types cannot leak in through inference.

```ts
// select/select.contract.ts
export interface SelectRootProps<V extends string = string> {
  value?: V | null; defaultValue?: V | null;
  onValueChange?: (value: V | null, details: ChangeDetails<'item-press' | 'keyboard' | 'form-reset'>) => void;
  open?: boolean; defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: ChangeDetails<'trigger' | 'escape' | 'outside-press' | 'item-press' | 'hidden'>) => void;
  name?: string; required?: boolean; disabled?: boolean; invalid?: boolean; placeholder?: string;
  size?: Size; children: ReactNode;
}
export interface SelectPopupProps { side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end'; sideOffset?: number;
  container?: Element | null; className?: string; children: ReactNode }
export interface SelectItemProps<V extends string = string> { value: V; textValue?: string; disabled?: boolean;
  icon?: ReactNode; render?: RenderProp<ItemDomProps, ItemState>; className?: string | ((s: ItemState) => string | undefined); children: ReactNode }
```

**The adapter.** This is the only file that imports the engine for Select.

```tsx
// _engines/react-aria/select.client.tsx
'use client';
import { Select as RacSelect, Button as RacButton, SelectValue as RacValue, Popover as RacPopover,
         ListBox, ListBoxItem } from 'react-aria-components';
import { EngineLocale } from './locale.client';                      // always I18nProvider with the resolved locale (gap-b §A3)
import { useFieldContext } from '../../field/field-scope.client';    // optional: a Select works without <Field>
import { stateAttrs, splitPlacement } from '../../_internal/state-attrs';
import { cx } from '../../_internal/cx';
import { toRenderFn } from '../../_internal/render-fn';
import { Glyph } from '../../_internal/glyphs';

export function SelectRoot<V extends string>({ value, defaultValue, onValueChange, open, defaultOpen, onOpenChange,
  name, required, disabled, invalid, placeholder, size = 'md', children }: SelectRootProps<V>): React.JSX.Element {
  const field = useFieldContext();
  return (
    <EngineLocale>
      <RacSelect value={value} defaultValue={defaultValue}
        onChange={(v) => onValueChange?.(v as V | null, { reason: 'item-press' })}
        isOpen={open} defaultOpen={defaultOpen} onOpenChange={(o) => onOpenChange?.(o, { reason: o ? 'trigger' : 'escape' })}
        name={name ?? field?.name} isRequired={required ?? field?.required} isDisabled={disabled ?? field?.disabled}
        isInvalid={invalid ?? field?.invalid}        // Field owns the message; RAC never renders a second error (gap-a §2.3)
        validationBehavior="native"                  // a hidden native <select> carries name/required for forms
        placeholder={placeholder} aria-describedby={field?.describedBy}
        render={(dom, rp) => <div {...dom} {...stateAttrs({ open: rp.isOpen, disabled: rp.isDisabled, required: rp.isRequired })}
                                   className="nz-select" data-slot="select" data-size={size} />}>
        {children}
      </RacSelect>
    </EngineLocale>
  );
}

export function SelectTrigger({ leadingIcon, className, render, children }: SelectTriggerProps): React.JSX.Element {
  const user = toRenderFn(render);
  return (
    <RacButton render={(dom, rp) => {
      const state = { pressed: rp.isPressed, focusVisible: rp.isFocusVisible, disabled: rp.isDisabled };  // Nizivo state, never RAC's object
      const props = { ...dom, ...stateAttrs(state),
                      className: cx('nz-select-trigger nz-hit-target', className), 'data-slot': 'select-trigger' };
      return user ? user(props, state) : <button {...props} />;
    }}>
      {leadingIcon && <span className="nz-select-icon" data-slot="select-icon" aria-hidden="true">{leadingIcon}</span>}
      {children ?? <RacValue className="nz-select-value" data-slot="select-value" />}
      <Glyph name="chevrons-up-down" className="nz-select-chevron" />   {/* Figma: "the chevron says choose" */}
    </RacButton>
  );
}

export function SelectPopup({ side = 'bottom', align = 'start', sideOffset = 8, container, className, children }: SelectPopupProps): React.JSX.Element {
  return (
    <RacPopover placement={`${side} ${align}`} offset={sideOffset}
      UNSTABLE_portalContainer={resolveContainer(container)}   // engine-internal; the gap-c §1.6 chain: prop → parent overlay → modal ancestor → body
      render={(dom, rp) => {
        const [s, a] = splitPlacement(rp.placement, align);
        return <div {...dom} {...stateAttrs({ open: true, entering: rp.isEntering, exiting: rp.isExiting, side: s, align: a })}
                    className={cx('nz-select-popup', className)} data-slot="select-popup" />;
      }}>
      <ListBox className="nz-select-list" data-slot="select-list">{children}</ListBox>
    </RacPopover>
  );
}
// SelectItem maps ListBoxItem's isFocused → data-highlighted and isSelected → data-selected. Group, GroupLabel and Separator follow suit.
// The engine stylesheet aliases RAC's --trigger-width to --nz-trigger-width. Public CSS reads only --nz-*.
```

**Usage from a Server Component.** The namespace works here; S2 shows the shape, and the Next fixture re-checks it on every build.

```tsx
import { Field } from '@nizivo/react/field';
import { Select } from '@nizivo/react/select';
import { CalendarIcon } from '@nizivo/icons/calendar';
<Field label="Period" name="period">
  <Select.Root defaultValue="30d">
    <Select.Trigger leadingIcon={<CalendarIcon />} />
    <Select.Popup>
      <Select.Item value="7d">Last 7 days</Select.Item>
      <Select.Item value="30d">Last 30 days</Select.Item>
    </Select.Popup>
  </Select.Root>
</Field>
```

**Conformance-lite** (`test/conformance/select.spec.ts`, engine-agnostic). This is the swap gate.
1. `ariaSnapshot()` of the closed and open states matches the golden (role and name tree).
2. An APG keyboard script: open with Enter, Space and ArrowDown; navigate; typeahead; select; Escape returns focus to the trigger.
3. Every part carries exactly the vocabulary attributes expected for each state.
4. Form: with `name` set, `FormData` holds the value; `required` blocks submit; `reset` restores the default.
5. SSR: `renderToString` in Node, then hydration in the Vite fixture, with no warnings.
6. Nesting: Select inside Dialog (gap-c O-01).
7. axe passes on the open state.

### 6.9 Dialog (engine-backed overlay)

The parts are `Root`, `Trigger`, `Popup`, `Title`, `Description`, `Body`, `Footer` and `Close`. There is **no separate `Backdrop` part**: `Popup` renders the scrim, and `backdrop={false}` turns it off. Nested modals turn it off automatically, so only the root modal darkens the page (gap-c §1.7).

Contract minimalism (r3 §8.1): the API is what both RAC and Base UI can satisfy, because RAC couples overlay and modal.

```tsx
// Server Component page. The trigger and popup are client parts; Button arrives pre-rendered as a host <button>.
<Dialog.Root>
  <Dialog.Trigger render={<Button variant="critical">Delete product</Button>} />
  <Dialog.Popup role="alertdialog" size="sm">            {/* Figma Modal Type=Destructive → alertdialog: no outside dismiss */}
    <Dialog.Title>Delete “Stoneware mug”?</Dialog.Title>
    <Dialog.Description>This can't be undone.</Dialog.Description>
    <Dialog.Footer>
      <Dialog.Close render={<Button>Cancel</Button>} />   {/* initial focus goes to the least destructive action */}
      <form action={deleteProduct}><Button type="submit" variant="critical">Delete</Button></form>
    </Dialog.Footer>
  </Dialog.Popup>
</Dialog.Root>
```

```tsx
// _engines/react-aria/dialog.client.tsx (excerpt)
'use client';
export function DialogPopup({ role = 'dialog', size = 'md', backdrop, container, className, children }: DialogPopupProps): React.JSX.Element {
  const parent = useParentOverlay();                       // engine-internal context: nested-portal container and focus-return chain
  const showScrim = backdrop ?? parent == null;            // only the root modal renders a scrim
  return (
    <PortalContainer value={resolveContainer(container, parent)}>   {/* wraps react-aria UNSAFE_PortalProvider; never public */}
      <ModalOverlay isDismissable={role !== 'alertdialog'}
        render={(dom, rp) => <div {...dom} {...stateAttrs({ entering: rp.isEntering, exiting: rp.isExiting })}
                                  className={cx('nz-dialog-positioner', showScrim && 'nz-dialog-backdrop')} data-slot="dialog-backdrop" />}>
        <Modal render={(dom, rp) => <div {...dom} {...stateAttrs({ open: true, entering: rp.isEntering, exiting: rp.isExiting })}
                                         className={cx('nz-dialog-popup', className)} data-slot="dialog-popup" data-size={size} />}>
          <RacDialog role={role} className="nz-dialog-content">{children}</RacDialog>
        </Modal>
      </ModalOverlay>
    </PortalContainer>
  );
}
// DialogRoot controls `open` itself and closes with reason 'hidden' in a layout-effect cleanup under <Activity> (r1 §11.8; gap-c §1.6).
```

```css
@layer nz.components {
  .nz-dialog-positioner { position: fixed; inset: 0; z-index: var(--nz-z-overlay); display: grid; place-items: center;
                          padding: var(--nz-space-8); }                 /* one band; DOM order stacks (gap-c L1) */
  .nz-dialog-backdrop { background: var(--nz-bg-scrim);                  /* code-owned until design adds bg/scrim */
    transition: opacity var(--nz-duration-base) var(--nz-easing-enter);  /* "the backdrop only fades" (01) */
    &[data-entering] { opacity: 0; }
    &[data-exiting] { opacity: 0; transition-duration: var(--nz-duration-fast); transition-timing-function: var(--nz-easing-exit); } }
  .nz-dialog-popup {
    --_nz-dialog-width: var(--nz-dialog-width, 32rem);                  /* public hook read, never assigned */
    inline-size: min(var(--_nz-dialog-width), 100%); max-block-size: calc(100dvh - 2 * var(--nz-space-8));
    display: flex; flex-direction: column; border-radius: var(--nz-radius-2xl);
    background: var(--nz-bg-surface-raised); box-shadow: var(--nz-elevation-4);          /* dark: n850 + ring (G16) */
    transition: opacity var(--nz-duration-spring) var(--nz-easing-spring), scale var(--nz-duration-spring) var(--nz-easing-spring);
    &[data-entering] { opacity: 0; scale: var(--nz-scale-enter); }      /* 0.96, or 1 when reduced: a token swap, no media query */
    &[data-exiting] { opacity: 0; transition: opacity var(--nz-duration-fast) var(--nz-easing-exit); }  /* Figma: exit 140 ms ease-in */
    &[data-size="sm"] { --_nz-dialog-width: var(--nz-dialog-width, 25rem); }
    &[data-size="lg"] { --_nz-dialog-width: var(--nz-dialog-width, 45rem); } }
  .nz-dialog-body { overflow: auto; }                                    /* the only scroller */
  @media (forced-colors: active) { .nz-dialog-popup { border: 1px solid CanvasText; } }
}
```

`--nz-scale-enter` is a **code-owned motion token**: 0.96 by default and 1 when reduced. It comes from the Dropdown Menu description, "scale 0.96→1". Reduced motion is a token swap; markup never changes (r6 §3.4).

### 6.10 KpiTile: a server-safe pattern with the state contract

```tsx
// packages/react/src/kpi-tile/kpi-tile.tsx — NO directive. Lives in @layer nz.patterns.
export function KpiTile({ label, value, format = 'compact', locale = 'en-US', delta, comparison, chart,
  tone = 'surface', status = 'ready', pending, empty, error, labels, render, className, ...rest }: KpiTileProps): React.JSX.Element {
  const L = { ...kpiTileLabels, ...labels };                     // serializable strings (gap-b §A2)
  const id = useId();                                            // a sync server component may call it (S6)
  const st: DataStatus = status === 'ready' && value == null ? 'empty' : status;
  return renderElement('div', render, { status: st, pending: !!pending }, {
    ...rest, role: 'group', 'aria-labelledby': id,               // a named group, not a landmark (gap-b §C2.3)
    className: cx('nz-kpi-tile', className), 'data-slot': 'kpi-tile',
    'data-tone': tone,                                           // Figma "Tone": Surface|Tinted → surface|brand|accent, DECOUPLED from trend (04)
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
                                       <span className="nz-visually-hidden">{L.noData}</span></span>)
        : <><NumberValue className="nz-kpi-tile-value" value={value!} format={format} locale={locale} />
            {chart /* element SLOT, e.g. <Sparkline/> from @nizivo/charts. Core never imports charts (settled 6, C13) */}</>}
      </div>
      {st === 'ready' && delta != null && (
        <div className="nz-kpi-tile-footer" data-slot="kpi-tile-footer">
          <Delta value={delta} locale={locale} comparison={comparison} />  {/* trend derived from the sign; SR phrase built in */}
          {comparison && <span className="nz-kpi-tile-comparison">{comparison}</span>}
        </div>)}
    </>),
  });
}
```

```tsx
// Next 16: the Suspense fallback IS the component (G20)
<Suspense fallback={<KpiTile label="Revenue" status="loading" />}>
  <RevenueKpi />   {/* async server component → <KpiTile label="Revenue" value={123307.4} delta={0.124} comparison="vs last week"
                        chart={<Sparkline data={series} />} format="currency-compact" locale="en-GB" /> */}
</Suspense>
```

A test asserts that the root's bounding box is identical (±1 px) across `loading`, `ready`, `empty` and `error`, at three container widths (gap-b §C5). This is G20's "skeleton mirrors layout" requirement, made mechanical.

### 6.11 AreaChart (`@nizivo/charts`, server-first)

```tsx
// packages/charts/src/area-chart/area-chart.tsx — NO directive. Geometry is computed on the server; one island adds interaction.
import { area, line, curveMonotoneX } from 'd3-shape';
import { ticks, extent } from 'd3-array';
import { linear } from '../_core/scale';                  // ~10 lines (r6): d3-scale's scaleLinear alone is 7.8 KB
import { dateTicks } from '../_core/time-ticks';          // UTC plain-date day/week/month ticks; forced last tick (03)
import { ChartFrame } from '../chart-frame';
import { ChartInteraction } from '../_island/chart-interaction.client';   // ~0.6 KB (r6)

export function AreaChart({ data, x, series, title, description, locale = 'en-US', format, status = 'ready',
  interactive = true, xDirection = 'ltr', labels }: AreaChartProps): React.JSX.Element {
  // x values are ISO plain dates ('2026-10-07'): serializable, no time-zone ambiguity (gap-a §4.1)
  const ys = series.flatMap((s) => data.map((d) => d[s.key] as number));
  const [lo, hi] = extent(ys) as [number, number];
  const yTicks = ticks(Math.min(0, lo), hi, 5);           // niced domain fixes 03's "bar exceeds top tick" issue
  const sx = linear(0, data.length - 1, 0, 100);
  const sy = linear(yTicks[0], yTicks.at(-1)!, 100, 0);   // percent space; y flipped
  const shapes = series.map((s) => ({
    key: s.key, variant: s.variant ?? 'solid',            // Figma: this period solid + 10% wash; comparison dashed neutral
    line: line<Row>().x((_, i) => sx(i)).y((d) => sy(d[s.key] as number)).curve(curveMonotoneX)(data)!,
    area: s.area ? area<Row>().x((_, i) => sx(i)).y0(100).y1((d) => sy(d[s.key] as number)).curve(curveMonotoneX)(data)! : null,
  }));
  const fmtY = numberFormatter(locale, format?.y ?? 'compact');           // format once, on the server (gap-b §A4)
  return (
    <ChartFrame title={title} description={description} status={status} labels={labels}
      table={{ columns: [x, ...series.map((s) => s.key)], rows: data, format, locale }}>   {/* server-rendered data table: the a11y alternative */}
      <div className="nz-chart-plot" data-slot="chart-plot" data-x-direction={xDirection}>
        <svg className="nz-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g className="nz-chart-grid">{yTicks.map((t) => <line key={t} x1="0" x2="100" y1={sy(t)} y2={sy(t)} />)}</g>
          {shapes.map((s) => (
            <g key={s.key} className="nz-chart-series" data-variant={s.variant}>
              {s.area && <path className="nz-chart-area" d={s.area} />}
              <path className="nz-chart-line" d={s.line} />           {/* CSS: vector-effect: non-scaling-stroke */}
            </g>))}
        </svg>
        {/* HTML labels on CSS grids: no per-label inline style, so CSP Profile B is safe (gap-b §B1.4) */}
        <ol className="nz-chart-y-axis" aria-hidden="true" data-count={yTicks.length}>{yTicks.slice().reverse().map((t) => <li key={t}>{fmtY(t)}</li>)}</ol>
        <ol className="nz-chart-x-axis" aria-hidden="true" data-count={dateTicks(data, x).length}>
          {dateTicks(data, x).map((t) => <li key={t.iso}>{t.label}</li>)}</ol>
        {interactive && status === 'ready' && (
          <ChartInteraction                                  // props are serializable: indices, percents, pre-formatted strings
            points={data.map((d, i) => ({ x: sx(i), title: formatDate(locale, d[x] as string),
              rows: series.map((s) => ({ key: s.key, label: s.label, value: fmtY(d[s.key] as number) })) }))}
            labels={labels} />)}
      </div>
    </ChartFrame>
  );
}
```

```css
@layer nz.components {
  .nz-chart-plot { position: relative; aspect-ratio: var(--nz-chart-aspect, 18 / 7); }   /* Figma 720×280 */
  .nz-chart-svg { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; overflow: visible; }
  .nz-chart-grid line { stroke: var(--nz-chart-grid); stroke-width: 1px; vector-effect: non-scaling-stroke; }
  .nz-chart-line { fill: none; stroke: var(--nz-chart-primary); stroke-width: 2px; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  .nz-chart-area { fill: var(--nz-chart-primary); fill-opacity: 0.1; }
  .nz-chart-series[data-variant="dashed"] .nz-chart-line { stroke: var(--nz-chart-neutral); stroke-dasharray: 5 4; }
  .nz-chart-svg { animation: nz-chart-draw var(--nz-duration-chart-draw) var(--nz-easing-standard) both; }  /* 700 ms; 0 when reduced */
  .nz-chart-plot[data-x-direction="rtl"] .nz-chart-svg { scale: -1 1; }
  @keyframes nz-chart-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
}
```

Notes:
- **CSS references only `--nz-chart-*` tokens.** chart/neutral is 1.57:1 against the surface, so the comparison line is decorative, and the data table carries the values (03).
- **Under CSP Profile B**, the only inline geometry is SVG attributes, which survive a strict CSP (gap-b §B1.1).
- **`Sparkline`** is the same core with no axes, no frame and `aria-hidden`.
- **Safari's handling of `non-scaling-stroke` in percent space is UNVERIFIED** (r6 Risk 2). The first v0.2 task is a WebKit screenshot check.

### 6.12 Field, and a form-library recipe

Adopted from gap-a D16 and shortened here; the full sketch is in gap-a §2.2.

```tsx
// field/field.tsx — NO directive (sync, server-safe)
export function Field({ label, description, error, name, required, disabled, readOnly, ids, messages,
  validateOn, render, children }: FieldProps): React.JSX.Element {
  const base = useId();                                   // allowed: sync server-safe component (S6)
  const id = { control: ids?.control ?? `${base}-control`, label: ids?.label ?? `${base}-label`,
               description: ids?.description ?? `${base}-description`, error: ids?.error ?? `${base}-error` };
  // Zero-JS mode: children(controlProps). Otherwise FieldScope ('use client') owns the context and the error slot.
  return renderShell(render, { id, label, description, required, disabled, validateOn },
    typeof children === 'function'
      ? <>{children(controlProps(id, { name, required, disabled, readOnly, error, description }))}{error && <FieldError id={id.error}>{error}</FieldError>}</>
      : <FieldScope ids={id} describedBy={description ? id.description : undefined} name={name} error={error}
                    required={required} disabled={disabled} readOnly={readOnly} messages={messages}>{children}</FieldScope>);
}
// DOM order: label, control, description, error (icon + text). Figma recolours help text only, which fails WCAG 1.4.1 (02).
```

```tsx
// Recipe (docs only; Nizivo has no form-library dependency): react-hook-form 7.x
'use client';
const { register, control, handleSubmit, formState: { errors } } = useForm({ resolver: standardSchemaResolver(Product) });
<form onSubmit={handleSubmit(save)} noValidate>
  <Field label="Product title" error={errors.title?.message}>
    <Input {...register('title')} />                      {/* ref reaches the native <input>, so setFocus works */}
  </Field>
  <Controller control={control} name="status" render={({ field, fieldState }) => (
    <Field label="Status" error={fieldState.error?.message}>
      <Select.Root name={field.name} value={field.value} onValueChange={(v) => field.onChange(v)}>
        <Select.Trigger ref={field.ref} onBlur={field.onBlur} />
        <Select.Popup>{/* items */}</Select.Popup>
      </Select.Root>
    </Field>)} />
</form>
```

```tsx
// Recipe: React 19 server action (v0.2 <Form> maps errors by name and focuses the first invalid control)
const [state, action] = useActionState(saveProduct, {});
<Form action={action} errors={state.fieldErrors}>
  <Field name="title" label="Product title" required messages={{ valueMissing: 'Enter a product title' }}>
    <Input defaultValue={state.values?.title} />           {/* echo values back: React auto-resets uncontrolled fields */}
  </Field>
  <SubmitButton>Save</SubmitButton>                        {/* useFormStatus → pending; aria-disabled, focus kept */}
</Form>
```

TanStack Form 1.x and Conform 1.21 recipes follow gap-a §2.7. For Conform, its generated ids go into Field's `ids` prop.

---

## 7. Tokens and theming

### 7.1 Pipeline

```
FIGMA (move to a Neev-owned Pro team first; S-d)
  Grove Primitives · Grove Color (Light/Dark) · Grove Space · Grove Motion (Default/Reduced) · Grove Responsive (D/T/M)
  + Grove/* text styles + Grove/* effect styles          (Clario, Pipkin, … leftovers are ignored by the allowlist)
        │ EXTRACT. The designer clicks TokensBrücke: DTCG 2025.10, split modes, styles + metadata
        ▼
packages/tokens/figma/raw/{Collection}/{Mode}.tokens.json   ← PR (web upload in v0.1; plugin push later)
        │ NORMALIZE: scripts/figma-normalize.ts (ours, golden-tested)
        │   allowlist "Grove *" · grove → (no prefix) · FLOAT → dimension/duration/number
        │   cubic-bezier → cubicBezier · spring(m,k,c,v) → $extensions.spring + derived duration.spring tokens
        │   text styles → typography · effect styles → shadow · Figma ids/keys → $extensions["dev.nizivo.figma"]
        ▼
src/figma-owned/** (normalizer output only)   +   src/code-owned/** (engineers)   +   src/nizivo.resolver.json
        │ BUILD: Terrazzo 2.8 (exact pin) + plugins/{light-dark, typography, js-refs, tailwind}.ts
        ▼
dist/tokens.css · dist/tailwind.css · dist/index.js + .d.ts · dist/tokens.json (resolved per context)
        │ CI on the PR: tz check/lint · contrast-pairs matrix (all permutations) · overrides check · size budget
        │               token-diff sticky comment (breaking = removed/renamed public name) · Argos VRT · invariant
        ▼
merge → changeset → release.yml (OIDC) → @nizivo/tokens and every package in the fixed group
```

### 7.2 Resolver (excerpt)

```jsonc
// src/nizivo.resolver.json (DTCG 2025.10 resolver; later sources win)
{
  "sets": {
    "primitives": { "sources": [{ "$ref": "figma-owned/primitives.tokens.json" }, { "$ref": "code-owned/a11y/primitives.overrides.tokens.json" }] },
    "foundation": { "sources": [{ "$ref": "figma-owned/foundation.tokens.json" }, { "$ref": "figma-owned/typography.tokens.json" },
                                { "$ref": "figma-owned/effects.tokens.json" }, { "$ref": "code-owned/layers.tokens.json" },
                                { "$ref": "code-owned/elevation.tokens.json" }, { "$ref": "code-owned/focus.tokens.json" }] }
  },
  "modifiers": {
    "theme":    { "default": "light", "contexts": {
                  "light": [{ "$ref": "figma-owned/color/light.tokens.json" }, { "$ref": "code-owned/a11y/light.overrides.tokens.json" }],
                  "dark":  [{ "$ref": "figma-owned/color/dark.tokens.json" },  { "$ref": "code-owned/a11y/dark.overrides.tokens.json" }] } },
    "motion":   { "default": "default", "contexts": { "default": [{ "$ref": "figma-owned/motion/default.tokens.json" }],
                                                        "reduced": [{ "$ref": "figma-owned/motion/reduced.tokens.json" }] } },
    "viewport": { "default": "base", "contexts": { "base": [{ "$ref": "figma-owned/viewport/mobile.tokens.json" }],
                                                     "sm":   [{ "$ref": "figma-owned/viewport/tablet.tokens.json" }] } }
    // "desktop" context is added once design confirms `lg` (C11). Brand and density modifiers come after 1.0 (D6d).
  },
  "resolutionOrder": [{ "$ref": "#/sets/primitives" }, { "$ref": "#/sets/foundation" },
                      { "$ref": "#/modifiers/theme" }, { "$ref": "#/modifiers/motion" }, { "$ref": "#/modifiers/viewport" }]
}
```

### 7.3 Sample generated CSS

```css
/* @nizivo/tokens/tokens.css: GENERATED. Do not edit. */
@layer nz.tokens, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;
@layer nz.tokens {
  :root {
    /* primitives: private (--nz-p-*) */
    --nz-p-neutral-0: #fff; --nz-p-neutral-50: #f6f7f4; --nz-p-neutral-300: #cbd0c8; --nz-p-neutral-700: #414741;
    --nz-p-neutral-900: #181b19; --nz-p-neutral-950: #101311; --nz-p-green-300: #79b993; --nz-p-green-400: #4c9e71;
    --nz-p-green-500: #2e8358; --nz-p-green-700: #1a573a; --nz-p-green-950: #0a211a; /* … 54 Figma + 4 proposed steps */
    /* semantic colour: ONE declaration per token, both modes (plugins/light-dark.ts; S3) */
    --nz-bg-canvas:   light-dark(var(--nz-p-neutral-50), var(--nz-p-neutral-950));
    --nz-bg-surface:  light-dark(var(--nz-p-neutral-0),  var(--nz-p-neutral-900));
    --nz-bg-brand:    light-dark(var(--nz-p-green-700),  var(--nz-p-green-400));
    --nz-text-primary: light-dark(var(--nz-p-neutral-900), var(--nz-p-neutral-50));
    --nz-text-secondary: light-dark(var(--nz-p-neutral-700), var(--nz-p-neutral-300)); /* OVERRIDE (Figma n600/n400), expires 2027-01-31 */
    --nz-text-on-accent: var(--nz-p-green-950);              /* single-mode in Figma, so no light-dark() is emitted */
    --nz-border-focus: light-dark(var(--nz-p-green-500), var(--nz-p-green-300));
    /* foundation */
    --nz-space-4: 16px; --nz-radius-md: 12px; --nz-border-width-default: 1px; --nz-border-width-focus: 2px;
    --nz-size-control-md: 40px; --nz-size-touch-min: 44px;
    /* typography (plugins/typography.ts emits one `font` shorthand per Grove text style, in rem) */
    --nz-font-sans: var(--font-geist-sans, "Geist Variable"), "Geist", ui-sans-serif, system-ui, sans-serif;
    --nz-font-label-m: 500 0.875rem/1.4 var(--nz-font-sans);
    /* motion: default */
    --nz-duration-instant: 80ms; --nz-duration-fast: 140ms; --nz-duration-base: 220ms; --nz-duration-chart-draw: 700ms;
    --nz-easing-standard: cubic-bezier(0.2, 0, 0, 1); --nz-easing-exit: cubic-bezier(0.3, 0, 1, 1);
    --nz-easing-spring: linear(0, 0.007 1.5%, 0.027 3.1%, 0.06 4.8%, 0.108 6.7%, 0.211 10%, 0.559 20.2%, /* … */ 1); /* S4: 19 pts */
    --nz-duration-spring: 493ms; --nz-duration-spring-soft: 702ms;    /* derived; easing and duration always travel together */
    --nz-distance-lift: 4px; --nz-scale-press: 0.98; --nz-scale-enter: 0.96;
    /* code-owned */
    --nz-z-raised: 1; --nz-z-sticky: 100; --nz-z-chrome: 200; --nz-z-overlay: 1000; --nz-z-toast: 1100;
    --nz-bg-scrim: light-dark(rgb(24 27 25 / 0.32), rgb(0 0 0 / 0.6));                    /* PROPOSAL → Figma bg/scrim */
    --nz-focus-halo: color-mix(in oklab, var(--nz-border-focus) 28%, transparent);       /* resolves per scope (probe) */
    --nz-elevation-ring: light-dark(transparent, rgb(255 255 255 / 0.08));                /* G16 */
    --nz-scheme-inverse: dark;
    /* responsive: base = Figma Mobile */
    --nz-grid-columns: 4; --nz-grid-gutter: 16px; --nz-grid-margin: 16px; --nz-layout-sidebar: 0px; --nz-section-gap: 20px;
  }
  /* theme scopes set only colour-scheme (S1; probe). No color-scheme on :root, so the default is opt-in light. */
  [data-nz-theme="light"]  { color-scheme: light;      --nz-scheme-inverse: dark; }
  [data-nz-theme="dark"]   { color-scheme: dark;       --nz-scheme-inverse: light; }
  [data-nz-theme="system"] { color-scheme: light dark; --nz-scheme-inverse: dark; }
  @media (prefers-color-scheme: dark) { [data-nz-theme="system"] { --nz-scheme-inverse: light; } }
  /* reduced motion (Terrazzo only.modifiers ["motion"] + exclude primitives; S3). Values are Figma's Reduced mode. */
  @media (prefers-reduced-motion: reduce) { :root {
    --nz-duration-instant: 0ms; --nz-duration-fast: 0ms; --nz-duration-base: 120ms; --nz-duration-chart-draw: 0ms;
    --nz-easing-standard: linear; --nz-easing-spring: linear; --nz-duration-spring: 120ms; --nz-duration-spring-soft: 120ms;
    --nz-distance-lift: 0px; --nz-scale-press: 1; --nz-scale-enter: 1; } }
  [data-nz-motion="reduce"] { /* same block, for an in-app preference */ }
  /* viewport sm = Figma Tablet. The designer: "Below 640px the sidebar becomes a five-tab bar…" (settled 11) */
  @media (width >= 40rem) { :root {
    --nz-grid-columns: 8; --nz-grid-gutter: 20px; --nz-grid-margin: 24px; --nz-layout-sidebar: 72px; --nz-section-gap: 24px; } }
}
```

### 7.4 Prefix configuration

`NZ_TOKEN_PREFIX` (default `nz`) is read by:
- the Terrazzo `variableName` mapper, which also strips `color.` so the names follow settled 5;
- a Lightning CSS custom-property visitor that rewrites `--nz-`/`--_nz-` in component CSS during the CSS build.

Published packages always use `nz`; the setting exists for forks and white-label builds (`pnpm build --prefix acme`). The class prefix `nz-` is fixed (r8 §6.3). A **lint fails on any `grove` string** in shipped code (G21).

### 7.5 Drift detection and the review flow

| Signal | v0.1 | Later |
|---|---|---|
| Figma changed but the repo did not | The release PR shows the last sync date and the Figma version id from the export metadata | v0.2: `LIBRARY_PUBLISH` webhook through a relay to a GitHub issue (Pro only; r7 §8.3) |
| Value diff | Every extractor PR runs normalize, then build, then the **token-diff sticky comment**. Removed or renamed public names require a major changeset | — |
| Hand edits to Figma-owned files | Invariant `normalize(raw) === src/figma-owned`. Code-first edits need the `tokens:code-first` label plus a recorded Figma follow-up | v1.0: an agent `figma-push.ts` writes proposals to a Figma **branch** within the MCP budget |
| Visual impact | Argos runs on sync PRs (light, desktop) | Dark, mobile and RTL modes by v1.0 |
| `codeSyntax` drift (Dev Mode showing `--grove-*`) | A designer checklist item | `figma-push` rewrites `codeSyntax.WEB` to `var(--nz-…)` (r7 §8.4) |

### 7.6 Code-owned tokens

| File | Tokens | Value | Evidence | Leaves code when… |
|---|---|---|---|---|
| `breakpoints` | `sm` | 40rem (640 px) | Designer text on 08 (settled 11) | Never; it is code-owned by nature |
| `breakpoints` | `md`, `lg` | **No values** (reserved) | C11: no designer evidence | Design rules on them. `lg` is a v0.2 blocker for AppShell |
| `layers` | z: raised, sticky, chrome, overlay, toast | 1 / 100 / 200 / 1000 / 1100 | gap-c §1.5 | Never |
| `layers` | `bg/scrim` | light n900 at 32%, dark #000 at 60% | gap-c §1.5; 08 `bg/inverse @ .32` | Design adds `bg/scrim` to Grove Color |
| `elevation` | `elevation/ring`, `elevation/highlight`, dark shadow alphas, `elevation/button` | gap-c §2.3; Figma's raw Primary effect (02) | G16 | Design binds the effect styles to variables |
| `focus` | `focus/halo` | `color-mix(border/focus 28%)` | probe; it fixes Figma's static and drifting halo hex (gap-c §3.2) | Design binds Focus/Ring to a variable |
| `motion-derived` | `duration/spring`, `duration/spring-soft`, `scale/enter` | 493 / 702 ms, 0.96 (reduced: 120 / 120 ms, 1) | S4; 02 Dropdown Menu description | Never (derived) |
| `a11y/*.overrides` | The Option A ladder, `border/control`(-hover), dark red/400 and blue/400, n450 and n925 primitives, `bg/critical` red/600, `text/on-critical`, `bg/critical-hover`, `text/accent`, `icon/info`, `icon/warning` amber/600, dark `bg/subtle` n925, the dark border ladder | gap-c §3.2 values | gap-c §3.2–3.4 | CI's **redundancy** check fails once Figma matches the override, which forces its deletion. **Expiry** fails CI unless two owners renew |

Every entry carries `$extensions["app.nizivo.override"]` with `figmaVariable`, `figmaValueAtOverride`, `wcag`, `issue`, `approvedBy` and `expires`. The docs site's **"Deviations from Figma"** page is generated from these entries.

### 7.7 Consumer theming recipes (docs)

```css
/* 1. Rebrand globally. light-dark() keeps it theme-safe at :root; there is no [data-nz-theme] duplication (D6a). */
:root { --nz-bg-brand: light-dark(#5b21b6, #a78bfa); --nz-text-on-brand: light-dark(#fff, #1e1b4b); }
/* 2. Rebrand one subtree */
.marketing { --nz-radius-md: 999px; }
/* 3. Restyle one component everywhere, through its public hook */
.nz-card { --nz-card-padding: var(--nz-space-5); }
/* 4. A dark island inside a light page */
<aside data-nz-theme="dark">…</aside>
```

---

## 8. Figma component map

**Columns.**
- **Tier** is the behaviour tier: **native** (platform, zero or near-zero JS), **engine** (RAC adapter), **own** (our code on platform APIs), **comp.** (composition of other parts).
- **RSC:** *server* means no client JS; *client* means a `'use client'` leaf; *split* means a server shell plus a client leaf.
- **Ship** is the first release.
- The `ghost` ids are the off-canvas masters that design must relink (G1). `component.json` records both ids (C25).

### 8.1 Pages 01–04

| Figma set (node; ghosts) | Nizivo export | Package / subpath | Tier | RSC | Ship | Variant mapping / notes |
|---|---|---|---|---|---|---|
| 01 Tokens: Primitives, Color, Space, Motion, Responsive; text and effect styles | tokens | `@nizivo/tokens` | — | — | v0.1 | §7. `spring()` becomes `linear()` (S4) |
| 01 Semantic·Dark scope (7275:12304) | `data-nz-theme` + `ThemeScript` | react `/theme-script` | native | server | v0.1 | No ThemeProvider (r1 D8) |
| 01 Typography doc (7275:12385) | `Text`, `Heading` | react `/text` | native | server | v0.1 | `variant` = the 18 style names (`label-m`, `numeric-kpi`, …). `Heading` takes `level` 1–6, constrained (settled 1). `tone` = `primary\|secondary\|tertiary\|brand\|success\|warning\|critical\|info\|inverse\|on-brand`. Numeric styles are always tabular |
| 01 Icons (74; masters `738:*` parentless) | the icon set | `@nizivo/icons` | native | server | v0.1 | Full Lucide set at 1.92 on a 24 viewBox (settled 7) |
| 01 Brand/Logo (739:64 ghost) | **not a component**; a `logo` slot on AppShell | — | — | — | — | Grove is demo branding (G21) |
| 01 Focus ring | `:focus-visible` rule plus `--nz-focus-halo` | react `base.css` | native | — | v0.1 | settled 12 |
| 01 Elevation doc | `--nz-elevation-1..4` + ring | tokens | — | — | v0.1 | G16 |
| 01 Grid doc / Responsive | `Stack`, `Grid`/`GridItem`, `Container` | react `/stack`, `/grid`, `/container` | native | server | v0.1 | Columns 4 / 8 from tokens; 12 once `lg` is decided |
| 01 Asset library (18 images) | **not shipped** | — | — | — | — | `ASSETS.md` ledger first (gap-b §B5.2) |
| 01 Media | `Image` | react `/image` | native | server | v0.1 | `data-ratio` presets; no inline style |
| 02 Button (7275:11244; ghost 744:263) | `Button` | react `/button` | native | server | v0.1 | `primary\|secondary\|tertiary\|critical\|accent`, **default `secondary`**; `sm\|md\|lg`; `leadingIcon`/`trailingIcon` slots; `pending` |
| 02 Icon Button (7275:11357) | `IconButton` | react `/icon-button` | native + engine tooltip | split | v0.1 | `primary\|secondary\|tertiary` (+`critical`), **default `secondary`** as in Figma; `sm\|md\|lg`; `label` required; `tooltip` on by default |
| 02 Badge (7275:11374; ghost 744:315) | `Badge` | react `/badge` | native | server | v0.1 | `tone` = `neutral\|success\|warning\|critical\|info\|brand`; `dot` |
| 02 Input anatomy → Field | `Field`, `Fieldset` | react `/field` | own | split | v0.1 | G11; error carries an icon and text (fixes the colour-only error, 1.4.1) |
| 02 Input (7275:11397; ghost 745:187) | `Input`, `Textarea`, `PasswordInput` (v0.2) | react `/input`, `/textarea` | native | client leaf | v0.1 | Figma `State` maps to CSS/ARIA; `prefix`/`suffix`/`leadingIcon` slots; `field-sizing` |
| 02 Select (7275:11438; ghost 745:188) | `Select` (+ `NativeSelect`, T0) | react `/select` | engine | client | v0.1 | Trigger skin shared with MenuTrigger and DateRangePicker |
| 02 Checkbox / Radio / Switch | `Checkbox`, `CheckboxGroup`, `RadioGroup`/`Radio`, `Switch` | react `/checkbox`, `/radio-group`, `/switch` | native | client leaf | v0.1 | Native inputs; label is the hit target (gap-c §3.6). Switch off track uses `border/control` |
| 02 Menu Item + Dropdown Menu (7275:11516; ghost 746:204) | `Menu` (Root/Trigger/Popup/Item/Group/GroupLabel/Separator/CheckboxItem/RadioItem/Submenu) | react `/menu` | engine | client | v0.1 | Figma `State` decomposes into `data-highlighted`, `data-selected` and `tone="critical"`; `shortcut` slot uses `Kbd` |
| 02 Upload (7275:11548) | `FileUpload` | react `/file-upload` | own (native input + drop target on react-aria hooks) | client | v0.2 | Uses `ProgressBar`, not a hand-drawn bar |
| 02 Tooltip (ghost 746:262) | `Tooltip` | react `/tooltip` | engine | client | v0.1 | Opposite-scheme scope (gap-c §2.6) |
| 02 Date Range Picker (ghost 746:267) | `DateRangePicker`, `RangeCalendar` | react `/unstable/date-range-picker` | engine | split (trigger SSR, calendar lazy) | v0.3 | G13. Day-cell states are a design ask |
| 03 Chart Legend Item (7275:13291) | `ChartLegend`/`ChartLegendItem` | charts `/legend` | own | server | v0.2 | `mark` = `line\|dashed\|dot` (+`square`) |
| 03 Chart Tooltip (7275:13303; **ghost 747:287 is the one in use**) | `ChartTooltip` | charts `/chart-tooltip` | own | client (island) | v0.2 | Content mirrored into the live region |
| 03 Sparkline (7275:13323; ghosts 747:273/277) | `Sparkline` | charts `/sparkline` | own | server | v0.2 | Trend is derived from the data; Down uses chart/neutral (documented) |
| 03 Area Chart (7275:13336; ghost 747:289) | `AreaChart` | charts `/area-chart` | own | split | v0.2 | §6.11 |
| 03 Bar Chart (7275:13387) | `BarChart` | charts `/bar-chart` | own | split | v0.2 | Bars max 22 px, rounded at the data end; dim with opacity, not chart/secondary (1.59:1 in dark) |
| 03 Donut (7275:13455) | `DonutChart` | charts `/donut-chart` | own | split | v0.2 | `foldToOther` with at most 3 categories, then "Other" |
| 03 Progress Bar / Ring (7275:13526 / 13545) | `ProgressBar`, `ProgressRing`, `Meter` | **react** `/progress` | native | server | v0.1 | settled 6. `tone` = `brand\|warning\|critical` (+`success`, `neutral`). The ring's Value becomes a numeric `value` |
| 03 Funnel / Heatmap (ghosts 751:319 / 751:393) | `FunnelChart`, `Heatmap` | charts `/funnel`, `/heatmap` | own | server | v0.3 | HTML/CSS. The heatmap needs solid `chart/seq-1..5` from design |
| 04 Card (7275:13757) | `Card` (namespace) | react `/card` | native | server | v0.1 | `tone` = `surface\|subtle\|inverse`; the "Show action" boolean becomes the `Card.Action` slot |
| 04 Delta (7275:13743; ghost 752:269) | `Delta` | react `/delta` | native | server | v0.1 | Trend comes from the sign; `polarity`; screen-reader phrase built in |
| 04 KPI Tile (7275:13780; ghost 752:380) | `KpiTile` | react `/kpi-tile` | comp. | server | v0.2 | §6.10. Tone is decoupled from trend |
| 04 Revenue Card (ghost 752:385) | `TrendCard` (+ RevenueCard docs recipe) | react `/trend-card` | comp. | server | v0.2 | `actions` slot holds a period Select; `chart` slot holds AreaChart |
| 04 Ranked List (ghost 752:444) | `RankedList` | react `/ranked-list` | comp. | server | v0.2 | `<ol>`; bars use `ProgressBar` |
| 04 Insight Card (7275:13829) | docs example → registry | `apps/docs` → `/r` | comp. | server | v0.2 / v0.3 | "Never more than one per screen" is guidance |
| 04 Metric / NumberValue (extracted) | `Metric`, `NumberValue` | react `/metric`, `/number` | native | server | v0.2 | `<data value>`; format once |
| 04 CountUp | `CountUp` | react `/motion` | own | client | v0.2 | The server renders the final value |

### 8.2 Pages 05–08

| Figma set (node; ghosts) | Nizivo export | Package / subpath | Tier | RSC | Ship | Variant mapping / notes |
|---|---|---|---|---|---|---|
| 05 Product Card · Product Row (ghost 753:476) · Order Row (ghost 753:644) · Discount Card · Payment Method · Shipment Tracker · Plan Card | docs examples → registry items | `apps/docs` → `/r` | comp. | server (+ leaves) | v0.2 / v0.3 | Domain states get domain names: `availability`, `publication`, `paymentStatus`, `fulfillmentStatus` (gap-b §C2.1). The hand-drawn checkbox and fake radio are replaced by core parts (M-B #16) |
| 05 Variant Option (7275:14018) | `ChoiceCard` (generic radio or checkbox card) | react `/choice-card` | native | client leaf | v0.2 | `Type: Colour\|Size` becomes content; `State` becomes native `:checked`/`:disabled` |
| 05 Customer Card (ghost 754:530) · Order Summary (ghost 754:897) | docs examples → registry | — | comp. | server | v0.3 | Props never read (G2) |
| 06 Nav Item (7275:14700; live 755:658) | `NavItem` | react `/nav` | native | server | v0.2 | `render={<Link/>}`; `current` prop gives `aria-current` with no router hook (C16); `count` slot; collapsed is a shell state |
| 06 Sidebar (7275:14732; live 755:869) | `AppShell`, `Sidebar` (+ rail and off-canvas drawer under `sm`) | react `/shell` | comp. + engine (drawer) | split | v0.2 | Widths from `layout/sidebar` tokens. **Needs the `lg` decision** |
| 06 Search Field (7275:14764; live 755:888) | `SearchField` (+ `CommandTrigger`, v0.3) | react `/search-field` | native | client leaf | v0.2 | `<search>` + `type=search` |
| 06 Tab (7275:14781; live 755:961) | `Tabs` (+ `TabNav` with links) | react `/tabs` | engine (`Tabs`) / native (`TabNav`) | client / server | v0.1 | Tabs is 31.9 KB in RAC: use `TabNav` for page navigation |
| 06 Segment (7275:14797; live 755:982) | `SegmentedControl` | react `/segmented-control` | native (radios) | client leaf | v0.1 | r3 T0. Thumb in dark gets `bg/surface-raised` + ring (G16) |
| 06 Store Switcher (ghost 755:663) | docs recipe (Menu composition) | — | comp. | client | v0.3 | |
| 06 Command Menu (ghost 755:889) | `CommandMenu` + `/hotkeys` | react `/unstable/command-menu` | engine (Autocomplete) | client (lazy) | v0.3 | G18 |
| 06 Top Bar (ghost 755:1031) · 08 Mobile Top Bar (ghost 764:3397) | `TopBar`, `MobileTopBar` | react `/shell` | native | server | v0.2 | |
| 06 Breadcrumb (ghost 755:998) | `Breadcrumb` | react `/breadcrumb` | native | server | v0.2 | |
| 06 Pagination (ghost 755:1007) | `Pagination` | react `/pagination` | native | server | v0.2 | `getHref`; labels |
| 06 Kbd (detached frames) | `Kbd` | react `/kbd` | native | server | v0.1 | Both glyph sets rendered; CSS picks one via `data-nz-platform` |
| 07 Toast (7275:15071) | `Toaster`, `toast()` | react `/toast` | own (react-aria hooks + `popover=manual`) | client | v0.2 | `tone` = `success\|critical\|neutral`. The action is a real `Button`. Toasts with an action persist (design confirm). Gate: O-06 |
| 07 Alert (7275:15091) | `Alert` | react `/alert` | native (+ dismiss leaf) | split | v0.1 | `tone` = `info\|success\|warning\|critical`; Info uses `icon/info` |
| 07 Banner (7275:15120) | `Banner` | react `/banner` | native (+ dismiss leaf) | split | v0.2 | `tone` = `promo\|warning` |
| 07 Modal (7275:15139) | `Dialog` (`role="dialog"\|"alertdialog"`) | react `/dialog` | engine | client | v0.1 | `Type` Default/Destructive maps to `role` |
| 07 Drawer (ghost 756:1001) + 08 Scrim RECT | `Drawer`/`Sheet` | react `/drawer` | engine (RAC Modal/Sheet) | client | v0.2 | `side` is logical: `start\|end\|top\|bottom` (gap-b) |
| 07 Empty State (7275:15168) | `EmptyState` (+ `InlineError`, which is new) | react `/empty-state` | native | server | v0.1 | `Context: Orders\|Search` becomes content; `headingLevel` |
| 07 Skeleton (7275:15181) | `Skeleton` (+ every data part's `status="loading"`) | react `/skeleton` | native | server | v0.1 | `Shape: Line\|KPI\|Row` → `shape: line\|block\|circle`; composites render their own skeleton (G20) |
| 08 Mobile Tab Bar (7275:18747) | `MobileTabBar` | react `/shell` | native | server | v0.2 | `Active` becomes `aria-current`. Labels truncate with ellipsis plus `aria-label` (gap-b §A6.5) |
| 08 Order List Item (ghost 764:3483) | docs example (List presentation for `DataView`) | — | comp. | server | v0.3 | |
| 08 Table frames (ghosts 753:410, 753:599, near-duplicates) | `Table*` parts, `TableSelection`, `BulkActionBar`, `DataView` | react `/table`, `/data-view` | native + own island | server + island | v0.2 / v0.3 | G12; the two header ghosts merge |
| 08 Filters (detached) | `ChipGroup`/`FilterChip` | react `/chip-group` | native (checkbox/radio) | client leaf | v0.2 | |
| 08 Avatar (none) | `Avatar` | react `/avatar` | native | server | v0.2 | 28/32/40/52/94 sizes need tokens from design |
| 08 Page header, Split, Section | `PageHeader`, `Split`; Section = `Card` | react `/page-header`, `/split` | native | server | v0.2 | 08 drew Card as raw frames, about 20 times |
| 08 Overview + Patterns 1–8 templates | docs examples → registry blocks | `apps/docs` → `/r` | comp. | — | v0.2 / v0.3 | `data-table` block uses TanStack v9 (G12) |

### 8.3 Pages 09–10 and missing components

| Figma set (node; ghosts) | Nizivo export | Package / subpath | Tier | RSC | Ship | Variant mapping / notes |
|---|---|---|---|---|---|---|
| 09 Surface glass (7275:19634) | `Surface material="glass"` | react `/surface` | native (`backdrop-filter`) | server | v0.3 | Opaque fallback under `@supports not`, `forced-colors` and `prefers-reduced-transparency` (r6 §5) |
| 09 Rays / Mesh shaders, ShaderCanvas, LiquidGlass, Parallax | **deferred** | (`@nizivo/lab`, post-1.0) | — | — | — | §9.5 |
| 09 Hero, FeatureTile, ProfileCard | docs examples | — | comp. | server | v0.3 | |
| 09 Float / Tilt / Magnetic / Stagger | `usePointerFx`, CSS stagger via `--i` | react `/motion` | own | client | v0.3 | Tokens only. Stagger uses CSS classes, never inline styles in server parts (gap-b §B1) |
| 09 ToastEnterExit, ChartDraw, CardLift, SkeletonPulse | CSS in the components | — | — | — | v0.1–v0.2 | Motion recipes |
| 10 Collection Circle · Shoppable Post · Product Tag · Tagged Product · Storefront Bar · Post Badge (ghost 772:4419) · Post Viewer · Hotspot stage | docs examples → registry "storefront" set | `apps/docs` → `/r` | comp. | server + leaves | v0.3 | Instagram media through an app proxy only (gap-b §B7) |
| 10 Instagram glyph (ghost 772:4302) | `InstagramIcon` | icons `/brands/instagram` | native | server | v0.1 | CC0 plus the brand's usage rule |
| 10 Sticky Action Bar | `StickyBar` | react `/sticky-bar` | native | server | v0.2 | `env(safe-area-inset-bottom)`; sets `--nz-layout-bottom-inset` |
| 10 Page Indicator | `PageIndicator` | react `/page-indicator` | native | server | v0.3 | |
| 10 Hotspot Editor | **deferred** | — | — | — | post-1.0 | |
| Missing in Figma (M-B) | `Separator`, `VisuallyHidden` (class), `TextLink` (`.nz-text-link`), `QuantityStepper`, `NumberField`, `Combobox`, `Accordion` (`<details name>`), `CopyButton`, `Rating`, `Stat` | react | native / engine | mostly server | v0.1–v0.3 | Design asks are in `design/backlog.md` |

---

## 9. Phased roadmap

**Team assumption:** 2 front-end engineers, a designer at about 50%, and one engineer acting as a11y owner. The generator, the token pipeline and RAC carry most of the load. If the team is larger, the phases compress; if it is smaller, the **cut line** applies.

### 9.1 v0.1 — "Foundations + forms + core overlays" (6–8 weeks)

**Week 0 prerequisites** (owners outside engineering):
1. Move the Figma file to a **Neev-owned Pro team** (S-d).
2. Design relinks the ghosts for the v0.1 sets (G1).
3. Create the GitHub org repo and the npm trusted-publisher plan.
4. **Rehearse an OIDC publish with a throwaway package** (r4 §9.3; S-b 6).
5. The user and legal decide the licence.

**Engineering plan:**

| Weeks | Work |
|---|---|
| W1 | Monorepo setup (pnpm 12.11.2, turbo, tsdown preset, oxlint, stylelint with the vocabulary and logical-property rules) and the `nz gen` generator. Token pipeline end to end on a **real TokensBrücke export**: normalizer, Terrazzo, light-dark, typography, spring, the a11y overrides and the contrast matrix. |
| W2 | Server-safe components. Icons package. Docs skeleton (Fumadocs) with generated props, hooks and token tables. |
| W3–4 | The Field system and its controls. RAC adapters for Tooltip, Dialog, Select, Menu and Tabs, with conformance-lite. |
| W5 | Next, Vite and Astro fixtures from packed tarballs. Argos. size-limit at the measured values plus 10%. Deviations page. |
| W6 (+2 weeks buffer) | Hardening, design review of the light renders, then publish 0.1.0. |

**Scope: 32 exports.**
- **Foundations:** `tokens.css`, `tailwind.css`, `ThemeScript`, `NizivoConfig`, `formatLabel`.
- **Layout and type:** `Text`, `Heading`, `Stack`, `Grid`, `Container`, `Separator`.
- **Actions:** `Button`, `IconButton`.
- **Display:** `Badge`, `Kbd`, `Card`, `Delta`, `ProgressBar`, `ProgressRing`, `Skeleton`, `EmptyState`, `Alert`, `Image`.
- **Forms:** `Field`, `Fieldset`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Switch`, `SegmentedControl`, `Select`.
- **Overlays and navigation:** `Tooltip`, `Dialog`, `Menu`, `Tabs`, `TabNav`.
- **Icons:** the full Lucide set and the Instagram brand glyph.

**Cut line**, in order, if behind schedule: `Menu`, `Tabs`, `ProgressRing` and `Alert` move to v0.2. Then `@nizivo/icons` moves to v0.2; docs fall back to `lucide-react` with `strokeWidth={1.92}` through the slots. `Field`, `Select`, `Dialog`, `Button` and `Tooltip` are never cut.

**Exit criteria** (all measurable):
1. `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons` 0.1.0 are published by `release.yml` over OIDC with provenance, with no NPM_TOKEN anywhere.
2. The Next 16.4 App Router, Vite 8 SPA and Astro 7.3 fixtures install packed tarballs and pass the shared Playwright spec:
   - zero console errors and zero hydration warnings;
   - a server-only Next page ships **no** `@nizivo` client chunk;
   - `<Select.Root>` and `<Dialog.Root>` render through the **namespace** from a Server Component and are interactive after hydration (the S2 guard).
3. axe (`wcag2a`/`aa`/`21aa`/`22aa`) reports 0 violations on every story in light. Dark is reported but not blocking (preview).
4. Conformance-lite is green for Select, Menu, Dialog, Tooltip and Tabs: Chromium on PRs, Firefox and WebKit on main. The overlay cases listed under G15 pass.
5. The contrast matrix passes with overrides, and every override is listed on the deviations page with its expiry.
6. **At least one real Figma-to-PR token sync has been merged end to end.**
7. size-limit budgets are set at the measured values plus 10% and are green. The API snapshot, props manifest and hooks manifest are committed.
8. The docs are live at nizivo.neevtechnologies.in: getting started for Next, Vite and Astro (including the Tailwind recipe), tokens, theming, generated component pages, and `llms.txt`.
9. The designer signs off light renders of Button, Input, Select and Dialog.

### 9.2 v0.2 — "Dashboard + shell" (weeks 7–12)

**Scope.**
- **Charts:** `@nizivo/charts` (ChartFrame, AreaChart, BarChart, DonutChart, Sparkline, Legend, ChartTooltip).
- **Dashboard:** Metric, NumberValue, KpiTile, TrendCard, RankedList, `CountUp`.
- **Overlays:** Toast and LiveAnnouncer (gated on O-06), Popover, Drawer/Sheet.
- **Data:** Table parts, selection, Pagination, Breadcrumb, Avatar.
- **Shell:** AppShell, Sidebar, TopBar, MobileTopBar, MobileTabBar, NavItem, PageHeader, Split, StickyBar. These **need the `lg` decision by week 8**.
- **Forms:** FileUpload, ChipGroup, ChoiceCard, `Form`, `SubmitButton`, `FormMessage`, PasswordInput, SearchField, Banner.
- **Docs examples** for the commerce and storefront sets and the 08 templates.
- **Dark mode becomes stable**, after design reviews renders of pages 02, 04, 06 and 07.
- React Router 8 fixture. The locale catalog mechanism, starting with en-US plus whatever Neev needs.
- The `LIBRARY_PUBLISH` webhook.

**Exit criteria:**
- The overview dashboard (08) is rebuilt in the Next fixture from Nizivo parts only, with zero client JS for its server-rendered KPI row.
- The CLS of a streamed overview with delayed boundaries is below 0.01 (gap-b §C5).
- A WebKit `non-scaling-stroke` check passes.
- O-06, O-07 and O-15 are green.

### 9.3 v0.3 — "Distribution + hard widgets" (weeks 13–18)

**Scope.**
- **The registry:**
  - a pinned `shadcn build` in CI;
  - immutable `/r/v{x.y.z}/` URLs, a SHA-256 manifest and an item-policy linter;
  - items: `init`, the commerce set, the storefront set, templates, the `data-table` block (TanStack v9), and `<component>-css` re-skin items.
- **Unstable components:** DateRangePicker/RangeCalendar, Combobox, NumberField, QuantityStepper, CommandMenu with `/hotkeys`, Accordion (`<details>`), DataView, BulkActionBar, Funnel, Heatmap.
- **Also:** Surface glass, `usePointerFx`, a TanStack Start fixture.
- **Security fixtures:** CSP Profile A and B, and Trusted Types (report-only).
- **RTL:** a mirror-geometry Playwright test.

### 9.4 v1.0 — "Freeze" (about 6–7 months)

- **API review.** Each component is promoted or stays explicitly in `unstable`.
- **Overlays:** all of gap-c O-01 to O-25 on three browser engines and on React 19.2.x and 19.3.x.
- **Screen readers:** Guidepup NVDA and VoiceOver nightly; non-blocking until it has been green for 30 days, blocking after that.
- **Visual regression:** an RTL matrix (ar-EG plus the `en-XA` pseudo-locale), dark, and mobile.
- **A11y debt:** every override is resolved in Figma or re-approved.
- **Supply chain:** SBOM plus `actions/attest@v4`.
- **Governance:** `GOVERNANCE.md` with an RFC process and an LTS policy (r5 §11.3).
- **Figma:** the cleaned Figma Community file (r5 §12).
- **Codemods:** `@nizivo/codemod` only if a deprecation needs one.

### 9.5 Deferred on purpose, and why it is safe

| Deferred | Why it is safe | Seam that keeps the door open |
|---|---|---|
| `@nizivo/lab` (WebGL, shaders, liquid glass) | The Figma 3D items are raster IMAGE fills (r6 §4). Shader sources cannot be retrieved. SVG liquid glass works only in Chromium. | A separate package versioned independently at 0.x (settled 10); Surface glass covers the CSS case |
| Motion (motion.dev) adapter | CSS covers every Figma motion spec. Motion costs 44.2 KB, and its SSR leaves content at `opacity:0` (r6). | `render` function form lets consumers wrap parts with `motion.*` |
| `unstyled` prop | Granular CSS imports already give the same result. | Adding a prop is a minor |
| Brand and density modifiers | No consumer has asked for them. | Resolver modifiers plus the reserved `data-nz-brand`/`data-nz-density` names |
| `tokens.legacy.css` for Safari 16.4 | The floor is 17.5 (D7). Lowering does not work (S1). | Terrazzo can emit block output by switching config (S3) |
| `@nizivo/css` | There is no non-React consumer yet. | The `css/*` paths are already framework-neutral, so extraction does not break anyone |
| Screen-reader automation before v1.0 | It is flaky on hosted runners (r5 §14). Until then a manual AT pass runs each minor (r5 §4.2). | Conformance specs are written so Guidepup steps can be added later |
| React Compiler output | It crashes under `react-server` (r1 D2). | Compile phase 2 covers `*.client.tsx` only |
| Second-engine conformance | No swap is planned. | Contracts and specs are engine-agnostic by construction |
| Native top-layer overlays | They are blocked by 4 platform gates (gap-c §1.4). | Each is a one-component adapter swap |

---

## 10. Risks and mitigations; what to verify next

### 10.1 Risks

| Risk | Likelihood / impact | Mitigation | Revisit when |
|---|---|---|---|
| **The design keeps churning** (the WIP reality) | High / medium | The `unstable/*` lane; dark ships as preview; patterns live in docs examples and the registry rather than npm; token sync is a one-click PR with a diff; Argos approvals; 0.x semantics | A component's Figma set is unchanged for 2 sync cycles, which makes it a promotion candidate |
| **Figma file ownership and plan** (S-d) | Medium / high | Week-0 move to a Neev-owned Pro team. TokensBrücke works on any plan. The MCP path is optional. | A plan change |
| TokensBrücke output fails Terrazzo's strict validation (r7 risk) | Medium / medium | The normalizer runs `tz format` and goldens. Day-1 test on a real export. The MCP snapshot path is the fallback. | The first sync |
| RAC Toast hooks are unstable; RAC Sheet is new | Medium / medium | Own adapter on the hooks, caret ranges, and O-06/O-07/O-09/O-14 gates. Sheet falls back to Modal plus CSS (r3 §11) | Each RAC minor (Renovate group) |
| RAC Tabs weight (31.9 KB) on Tabs-only pages | Medium / low | `TabNav` (native links) for page tabs; budgets; an own APG Tabs adapter on react-aria hooks behind the seam if budgets fail | A size-limit failure |
| tsdown is pre-1.0; pnpm 12 OIDC through Changesets is untested | Medium / high | Exact pins, the shared preset, the directive guard, exports drift check, publint and attw; the rehearsal publish; pnpm 11.28 as fallback (r4 §13) | Each tsdown or pnpm minor |
| S2's shape regresses with a tsdown change | Low / high | The generator emits only the passing shape. The Next fixture renders the namespace from a Server Component on every build. | A tsdown upgrade |
| a11y override debt becomes permanent | Medium / medium | Expiry dates, the redundancy and drift checks, the public deviations page, and a release gate on AA | Each expiry date |
| The Safari 17.5 floor sits above Next and Tailwind's 16.4 | Low / medium | Documented. The block-output switch is ready (D6a reversal). | A consumer asks for 16.4 |
| Percent-space SVG behaves oddly in Safari | Medium / low | WebKit check as the first v0.2 task; pixel-space viewBox per container size as the fallback | v0.2 week 1 |
| Spring parameter order is wrong (S-b 7) | Low / low | A golden test pins the interpretation; design confirms; any fix is a token-value patch | Design answer |
| Team bandwidth | High / high | The cut line; codegen; one engine; three packages; registry, lab and RTL visual regression deferred | Every 2 weeks |
| CSP: RAC `VisuallyHidden` inline styles break under Profile B | Low / medium | Profile A is the default. B is guaranteed only for server-safe parts (gap-b §B1.3). A CI grep tracks engine inline styles. | v0.3 CSP fixtures |
| Argos cost or terms | Low / low | Fallback to Vitest screenshots in Docker (r5) | Budget review |

### 10.2 What to verify next, cheapest first

1. **A real TokensBrücke export through the normalizer and Terrazzo**, using `only.modifiers` plus the primitives exclude (S3 used hand-written tokens). Also confirm the typography plugin's `font` shorthand naming.
2. **The OIDC publish rehearsal** with pnpm 12.11.2 and `changesets/action` v2 split jobs (S-b 6).
3. **O-06 prototype:** an RAC modal plus a `popover="manual"` toast region with `data-react-aria-top-layer`. F8 must reach the toast action while the modal stays open (S-b 5).
4. **Hydration of the S2 passing shape** (`s2-rsc/hydrate.mjs` was never recorded), on the generated Select barrel.
5. **Firefox runs** of the S1 matrix and today's probe. Firefox did not launch in the sandbox.
6. **RAC element-form `render` for links inside collections:** a Menu item rendering `<Link>` with no `RouterProvider` (C16).
7. **Design answers:** the `spring()` parameter order; the `lg` threshold (needed by v0.2 week 8); sidebar widths 264/72 versus 248/76; Option A for the text ladder; `bg/scrim`; the dark render review; whether toasts with an action persist.
8. **pnpm 12 key validation** for `trustPolicy` and `blockExoticSubdeps` (gap-b §B4), and whether `pnpm sbom` emits licence fields.
9. **WebKit `non-scaling-stroke` in percent space** (r6 Risk 2), before chart work starts.
10. **Argos eligibility and terms** for a company OSS project (r5 open question).
