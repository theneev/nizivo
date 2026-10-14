# R3: Behavior and accessibility primitive layer for Nizivo UI

Date: 2026-10-14. Scope: choose the headless behavior and accessibility layer for `@nizivo/*`, and design it so it can be swapped per component later.

> **TL;DR**
>
> 1. **Native first.** About a third of the Figma inventory needs no behavior library. Checkbox, radio, switch, segmented control, progress and meter, content accordions, simple selects, nav links and every display component can be plain server-rendered HTML with zero client JS.
> 2. **Use one engine family for everything else: React Aria.** That means `react-aria-components` 1.22.1 for most composite and overlay widgets, plus `react-aria` 3.53.1 hooks where we need our own DOM. In our measurements it is the lightest **stable, non-transitioning** family that covers the inventory (combobox, number field, sheet, drop zone). The one exception is top-nav flyouts, which we build in-house either way. Ark/Zag is about 15% lighter and slightly broader, but it is mid-way through a breaking major (Ark 6.0-next / Zag 2.0-next). React Aria's accessibility and i18n are the best of the options compared (36 locales, RTL, testing with named screen readers). It is Adobe-backed and Apache-2.0. It already uses the `render` composition prop and the `data-*` state styling model that we want to expose publicly.
> 3. **Put a build-time adapter boundary between the public API and the engine.** Each component gets one swap point (`<component>/engine.ts`), an engine-agnostic contract, Nizivo's own `data-*` state vocabulary and CSS variables, a public `render` prop, and a conformance test suite every engine must pass. Swapping an engine (to Base UI, Radix, native or our own code) is then a one-file change, and consumers' code and CSS do not change.
> 4. **Base UI 1.9.0 is the pre-qualified runner-up.** It has the best momentum: shadcn/ui switched its default to it in July 2026, and MUI funds a full-time team. But on identical component sets we measured it at 1.28–1.44x the gzip cost of React Aria (dashboard, overlay and full sets) and 2.06x Radix (dashboard set). **Radix 1.8.1** is the lightest and is actively developed again in 2026. It still has no combobox, autocomplete, number field, drawer or file upload, and its composition API (`asChild`) is now the outlier.
> 5. **Native platform, October 2026.** `<dialog>`, `popover`, invoker commands, `<details name>` and the core of CSS anchor positioning all ship in every current engine. Customizable `<select>` (no Firefox), `closedby` and `popover="hint"` (no stable Safari), `interestfor` (Chrome only) and top-layer exit animations (`overlay` property, Chrome only) are still gaps. Plan native upgrades per component behind the adapter rather than all at once.

---

## 1. Method and evidence base

- **Versions** come from the npm registry (`registry.npmjs.org/<pkg>`, queried 2026-10-14). **Repo health** comes from the GitHub REST and search APIs, queried 2026-10-14.
- **Browser support** comes from the primary datasets: `web-features` 3.42.0 (published 2026-10-09; the Baseline source used by MDN, caniuse and webstatus.dev) and `@mdn/browser-compat-data` 8.1.5 (published 2026-10-08). Current stable versions per BCD are Chrome 155 (2026-10-06), Edge 154, Firefox 157 (2026-09-29; ESR 153) and Safari / iOS Safari 27 (2026-09-14).
- **Bundle sizes were measured by us** rather than taken from bundlephobia. Bundlephobia reports whole-package size, which is meaningless for multi-component packages.
  - Tool: esbuild 0.25.10, `bundle + minify`, ESM, `NODE_ENV=production`, `browser`/`import` conditions, `react` and `react-dom` external.
  - Reported figure: gzip level 9.
  - Entry style: `export * from '<lib>/<component subpath>'`.
  - Cross-check: realistic usage entries (importing and rendering only the parts a dialog or popover needs) came within about 1 KB of the `export *` numbers. For example, Base UI popover was 40.2 KB vs 40.8 KB and Radix dialog 13.9 KB vs 13.8 KB. The table is therefore representative of real consumer cost.
  - Scripts and raw output (reproducible):
    - `scratchpad/bench/tools/measure.mjs`, `one.mjs`, `combos.mjs`, `zag.mjs`, `extra.mjs`
    - `scratchpad/bench/sizes.json`
- Anything not checked against a primary source is marked **UNVERIFIED**.

---

## 2. State of the art (October 2026)

### 2.1 Maintenance and status snapshot

| Library | Latest stable (date) | Stable releases, last 12 months | Repo: open issues / open PRs / PRs merged 2026-07-14 to 10-14 | Weekly npm downloads (Oct 5–11) | Backing | License |
|---|---|---|---|---|---|---|
| **Radix Primitives** (`radix-ui`) | **1.8.1** (2026-10-12); per-primitive e.g. `@radix-ui/react-dialog` 1.3.1 | 12, all since 2026-06-06. **Gap:** 1.4.3 (2025-08-13) to 1.5.0 (2026-06-06) | 120 / 108 / 66 | 16.97M (`radix-ui`); 73.9M (`@radix-ui/react-dialog`, mostly transitive) | WorkOS | MIT |
| **Base UI** (`@base-ui/react`) | **1.9.0** (2026-10-09); v1.0.0 stable 2025-12-11 | 11 (monthly minors) | 329 / 155 / 462 | 17.18M | MUI (full-time team) | MIT |
| **React Aria Components** (`react-aria-components`) | **1.22.1** (2026-10-09); `react-aria` 3.53.1 | 12 (roughly monthly) | 517 / 108 / 212 (monorepo incl. React Spectrum) | 4.94M (RAC), 9.97M (`react-aria`) | Adobe | Apache-2.0 |
| **Ark UI** (`@ark-ui/react`) / **Zag.js** | **5.39.3** (2026-10-05); `6.0.0-next.0` (2026-10-05); Zag 1.46.0, `2.0.0-next.3` | 27 | ark 0 / 8 / 190 (issues enabled; 47 issues closed in 3 months); zag 2 / 9 / 91 | 0.81M (ark), 1.13M (`@zag-js/react`) | Chakra team | MIT |
| **Ariakit** (`@ariakit/react`) | **0.4.41** (2026-10-05); still 0.x | 22 | 40 / 4 / 771 (bot share UNVERIFIED) | 1.39M | Ariakit FZ-LLC | MIT |
| **Headless UI** (`@headlessui/react`) | **2.2.10** (2026-04-07) | **1** | 88 / 22 / **0**; last push 2026-04-13 | 7.50M | Tailwind Labs | MIT |
| **Floating UI** (`@floating-ui/react` / `dom`) | 0.27.20 / 1.8.0 (both 2026-07-11) | 4 (`react`) | 38 / 38 / **3** | 26.2M / 103.9M | Community (atomiks) | MIT |

Sources:
- npm registry: https://registry.npmjs.org/radix-ui, https://registry.npmjs.org/@base-ui/react, https://registry.npmjs.org/react-aria-components, https://registry.npmjs.org/@ark-ui/react, https://registry.npmjs.org/@ariakit/react, https://registry.npmjs.org/@headlessui/react, https://registry.npmjs.org/@floating-ui/react
- npm downloads API: https://api.npmjs.org/downloads/point/last-week/<pkg>
- GitHub: https://github.com/radix-ui/primitives, https://github.com/mui/base-ui, https://github.com/adobe/react-spectrum, https://github.com/chakra-ui/ark, https://github.com/chakra-ui/zag, https://github.com/ariakit/ariakit, https://github.com/tailwindlabs/headlessui, https://github.com/floating-ui/floating-ui
- Ariakit license: the `license` file inside `@ariakit/react@0.4.41` reads "MIT License, Copyright (c) 2025-present Ariakit FZ-LLC". The GitHub API reports no SPDX id because the file is lowercase.

### 2.2 What changed in 2026, per library

**Radix (WorkOS) is active again, but it was dormant for about 10 months.** Source: changelog at https://github.com/radix-ui/primitives/blob/main/packages/react/radix-ui/CHANGELOG.md and the releases page https://www.radix-ui.com/primitives/docs/overview/releases. 2026 highlights:

- 1.5.0 (Jun 6): controlled ContextMenu; React 19.2 focus fixes.
- 1.6.0: `createSlot` generics; ToggleGroup now uses `radiogroup`/`toolbar` roles.
- 1.6.3 (Jul 20): `/* @__PURE__ */` annotations for real tree-shaking; per-primitive subpath entries such as `radix-ui/accordion`; dev-only checks dropped from production builds.
- 1.6.5: republished through CI with npm provenance.
- 1.6.6 and 1.6.7: reverted RSC-breaking changes.
- 1.7.0 (Oct 5): nested portalled layers usable inside modals; `Popover.Title`/`Description`; RSC compatibility fixes.
- 1.8.0 and 1.8.1 (Oct 12): `exactOptionalPropertyTypes` support; Toast viewport no longer forces Suspense client render.
- Commits continue daily as of 2026-10-13.

Our measurement confirms the 2026 tree-shaking work. Importing `{ Switch }` from the root `radix-ui` entry costs 5.0 KB gz, the same as the subpath import.

Radix still has no Combobox, Autocomplete, NumberField, Drawer or file upload. Composition is `asChild` only.

**Base UI (MUI) has been stable since 2025-12-11, with a monthly cadence.** Release notes: https://base-ui.com/react/overview/releases.

- 1.2: Drawer (preview).
- 1.3: Drawer stable.
- 1.4: OTPField; toasts can be updated by id.
- 1.6: OTP stable; APG-aligned accordion keys.
- 1.7: "smaller bundle size".
- 1.8: `createItems` collection API.
- 1.9 (Oct 9): menu filtering (preview); faster mounting of large lists.

v1.0.0 shipped "35 unstyled components". The current docs list these families: Accordion, AlertDialog, Autocomplete, Avatar, Button, Checkbox(+Group), Collapsible, Combobox, ContextMenu, Dialog, Drawer, Field/Fieldset/Form/Input, Menu, Menubar, Meter, NavigationMenu, NumberField, OTPField, Popover, PreviewCard, Progress, Radio(Group), ScrollArea, Select, Separator, Slider, Switch, Tabs, Toast, Toggle(Group), Toolbar, Tooltip. It has no file upload.

MUI calls Base UI "our long-term direction for foundational, unstyled components" (https://mui.com/blog/2026-and-beyond/). **shadcn/ui made Base UI its default in July 2026.** It reports that "Projects created on shadcn/create now pick Base UI over Radix 2 to 1", while "Radix is not being deprecated" (https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default).

Base UI vendors Floating UI's React interaction layer internally. The published package contains `@base-ui/react/floating-ui-react/` and depends only on `@floating-ui/react-dom` and `@floating-ui/utils`.

**React Aria (Adobe) releases monthly.**
- 1.21.0 (2026-09-01) added NavigationTree for sidebars, plus async and empty-state Menu (https://react-aria.adobe.com/releases/v1-21-0).
- 1.22.0 (2026-10-08) added **Sheet**, a swipeable edge overlay built on native scroll gestures, along with virtual-keyboard-aware overlay positioning and Turbopack support in `@react-aria/optimize-locales-plugin` 2.1.0 (https://react-aria.adobe.com/releases/v1-22-0).
- **Toast is still `UNSTABLE_`.** The 1.22.1 typings export `UNSTABLE_Toast`, `UNSTABLE_ToastRegion`, `UNSTABLE_ToastQueue` and others, and it is the only `UNSTABLE_` component in the index. The `react-aria` hooks package exports `useToast` and `useToastRegion` without a prefix; their documented stability is UNVERIFIED.
- It has a `render` prop for custom DOM elements (https://react-aria.adobe.com/customization).

**Ark UI / Zag is mid-way through a breaking major.** `@ark-ui/react@6.0.0-next.0` (2026-10-05) moves every component onto Zag v2:
- It replaces `data-scope`/`data-part` with one attribute per part (for example `data-popover-trigger`).
- It **adds `render` and deprecates `asChild`**.
- It changes Toaster, PinInput, Carousel and other APIs.
- It fixes real a11y gaps: accordion triggers previously had no heading wrapper, and Combobox and Listbox "Empty" states were not announced.

Source: https://github.com/chakra-ui/ark/releases/tag/%40ark-ui%2Freact%406.0.0-next.0. The 5.x line still gets fixes (https://ark-ui.com/docs/overview/changelog).

**Ariakit** releases often (0.4.41 brought dialog close semantics and shadow-root fixes; https://ariakit.com/changelog) but is still pre-1.0 after several years.

**Headless UI** is effectively dormant. It has one stable release in 12 months (2.2.10 on 2026-04-07, "stops rendering Portal during hydration"), 0 merged PRs in the last 3 months and 88 open issues (https://github.com/tailwindlabs/headlessui/releases).

**Floating UI** has slowed. `@floating-ui/react` is still 0.x and had 3 merged PRs in 3 months. Base UI vendors its React layer, and React Aria uses its own positioning. `@floating-ui/dom` (7.3 KB gz with `react-dom` bindings) remains a fine low-level fallback (https://floating-ui.com/docs/react).

---

## 3. Bundle cost (measured)

### 3.1 Per component, standalone (KB, min + gzip; React external)

| Component | Radix 1.8.1 | Base UI 1.9.0 | RAC 1.22.1 | Ark 5.39.3 | Ariakit 0.4.41 | Headless UI 2.2.10 |
|---|---:|---:|---:|---:|---:|---:|
| Dialog | **13.8** | 23.6 | 28.1 | 19.8 | 20.8 | 20.1 |
| Popover | **24.3** | 40.8 | 29.4 | 30.4 | 31.1 | 29.5 |
| Menu (dropdown) | **31.5** | 61.2 | 51.3 | 33.1 | 47.7 | 31.9 |
| Select / listbox | **31.7** | 45.2 | 59.5 | 33.3 | 42.6 | 33.8 |
| Combobox | – | 51.9 | 63.7 | **34.0** | 49.3 | 43.3 |
| Tabs | **9.4** | 13.5 | 31.9 | 12.7 | 20.7 | 10.7 |
| Toggle group | 8.7 | **8.4** | 15.9 | 8.7 | – | – |
| Checkbox | **5.9** | 8.4 | 15.2 | 10.7 | 9.7 | 9.5 |
| Radio group | **10.6** | 12.3 | 18.6 | 10.9 | 17.6 | 11.6 |
| Switch | **4.9** | 6.3 | 14.8 | 10.0 | – | 10.1 |
| Tooltip | 19.9 | 33.8 | **14.3** | 22.1 | 32.1 | – |
| Toast | **12.3** | 26.2 | 19.9 (UNSTABLE) | 13.9 | – | – |
| Slider | **10.2** | 14.8 | 14.4 | 14.5 | – | – |
| Accordion / disclosure | **9.0** | 9.6 | 14.3 | 11.6 | 11.0 | 9.6 |
| Navigation menu | **13.1** | 38.6 | – (NavigationTree only) | 18.4 | – | – |
| File upload / drop zone | – | – | 35.5 (DropZone + FileTrigger) | **13.8** | – | – |
| Drawer / sheet | – | 38.2 | **26.3** (Sheet) | (Drawer exists) | – | – |
| Number field | – | **13.9** | 26.8 (locale-aware parsing) | (exists) | – | – |

How to read standalone numbers:
- They include each library's shared core, so they overstate the cost when you use several components together.
- React Aria has the largest fixed core (about 14 KB: press, focus, i18n). That is why it loses on single tiny controls, which we will render natively anyway.
- Base UI's Tooltip and Popover carry its vendored Floating UI interactions layer. Tooltips appear on almost every dashboard, so this matters.

### 3.2 Amortized cost of realistic sets (what consumers actually pay)

| Set | Radix | `react-aria` hooks | Zag (raw machines) | Ark | **RAC** | Base UI |
|---|---:|---:|---:|---:|---:|---:|
| **Dashboard page:** dialog, popover, menu, select, tabs, tooltip | **42.9** | 46.0 | 50.3 | 58.9 | **69.0** | 88.3 |
| Overlay set: above + toast, slider, nav menu (no combobox) | **53.6** | – | – | – | – | – |
| Overlay set **with combobox** | 97.4 (Radix + Base UI combobox: **two engines**) | – | – | 85.2 | **88.7** (no nav menu) | 123.4 |
| Full set (+ number field, sheet/drawer, toggle group, accordion) | n/a (gaps) | – | – | – | **104.0** | 149.4 |

Implications:
- **Mixing engines is the most expensive option.** Radix plus one Base UI combobox (97.4) costs more than RAC's whole overlay set with a combobox (88.7), because the floating, focus and dismiss layers are duplicated. The engine decision is per family, not per row.
- **Radix is lightest wherever its coverage suffices.**
- **Ark is lighter than RAC on every measured set** (58.9 vs 69.0 dashboard; 85.2 vs 88.7 overlay set) and covers slightly more (navigation menu, file upload). It is deferred because of its in-progress breaking major (§2.2, §7), not because of weight or coverage.
- **RAC is the lightest *stable, non-transitioning* family that covers the Nizivo list.** It has no top-nav navigation menu; that piece is built in-house (T2) regardless of engine.
- **Base UI is the heaviest** (1.28x RAC on the dashboard page; 2.06x Radix).
- `react-aria` hooks are 33% lighter than RAC components for the same widgets. That gives us an in-family path to slim down any hot component, by building on hooks and owning the DOM, without adding a second engine.
- For reference: `@floating-ui/react-dom` alone is 7.3 KB gz, and `@floating-ui/react` with interactions is 19.1 KB gz.

---

## 4. Capability comparison

### 4.1 Coverage against the Nizivo inventory

✔ = first-class component; ◐ = partial or preview / needs composition; – = none.

| Need | Radix | Base UI | RAC | Ark | Ariakit | Headless UI | Native platform (Oct 2026) |
|---|---|---|---|---|---|---|---|
| Dialog / alert dialog | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ `<dialog>` + `showModal()` (light-dismiss `closedby` not in Safari) |
| Popover | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ `popover` + CSS anchor (core) |
| Menu / context menu / submenus | ✔ | ✔ (+Menubar) | ✔ | ✔ | ✔ | ◐ (no submenus) | – (no native menu semantics) |
| Select / listbox | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ customizable select: Chrome and Safari 27 only |
| Combobox / autocomplete / search suggestions | – | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ `<datalist>` (not stylable) |
| Tabs | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | – |
| Toggle group / segmented control | ✔ | ✔ | ✔ (+SelectionIndicator) | ✔ | ◐ | – | ✔ radio inputs (form semantics) |
| Checkbox / radio group / switch | ✔ | ✔ | ✔ | ✔ | ◐ (no switch) | ✔ | ✔ inputs (+`role="switch"`) |
| Tooltip | ✔ | ✔ | ✔ | ✔ | ✔ | – | ◐ `popover="hint"` (no Safari), `interestfor` (Chrome only) |
| Toast | ✔ | ✔ | ◐ UNSTABLE | ✔ | – | – | ◐ `popover="manual"` + live region (own) |
| Slider (range, two thumbs) | ✔ | ✔ | ✔ | ✔ | – | – | ◐ `<input type=range>`, single thumb only |
| Accordion | ✔ | ✔ | ✔ | ✔ | ◐ | ◐ | ✔ `<details name>` (heading caveat) |
| Navigation menu (top-nav flyouts) | ✔ | ✔ | – (NavigationTree for sidebar) | ✔ | – | – | ◐ disclosure nav with buttons + `popover` |
| File upload / drop zone | – | – | ✔ DropZone + FileTrigger | ✔ | – | – | ✔ `<input type=file>` + drag events |
| Drawer / bottom sheet | – | ✔ | ✔ Sheet (new 1.22) | ✔ | – | – | ◐ dialog + CSS |
| Number field (qty stepper) | – | ✔ | ✔ | ✔ | – | – | ◐ `type=number` has poor UX/a11y |
| Date picker / table / tree (future) | – | – | ✔ | ✔ | – | – | ◐ |

### 4.2 Architecture-relevant traits

| Trait | Radix | Base UI | RAC / `react-aria` | Ark / Zag | Ariakit | Headless UI |
|---|---|---|---|---|---|---|
| Composition | `asChild` (Slot, `cloneElement`); `createSlot` | `render` (element or `(props, state)`), `useRender`, `mergeProps` | `render` `(props, renderProps)`; contexts, slots, `useContextProps`; hooks with prop objects | `asChild` (5.x); **`render` added, `asChild` deprecated in 6.0-next** | `render` (element or function) | `as` + render-prop children |
| State styling hooks | `data-state="open\|closed\|checked…"`, `data-side`, `data-align`, `--radix-*` vars | `data-open`/`data-closed`, `data-starting-style`/`data-ending-style`, `--available-height`, `--anchor-width`, `--transform-origin` | `data-hovered`, `data-pressed`, `data-focus-visible`, `data-selected`, `data-entering`/`data-exiting`, `data-placement`, `--trigger-width`; className/style functions | v5 `data-scope` + `data-part` + `data-state`; v6 `data-<comp>-<part>` | `data-*` (e.g. enter/leave) | `data-open`, `data-focus`, `data-hover`, `data-closed`… |
| Tree-shaking / entry points | `sideEffects: false`; `/* @__PURE__ */` parts + per-primitive subpaths (`radix-ui/<name>`) since 1.6.3; root import of one primitive measured at 5.0 KB (same as subpath) | `sideEffects: false`; per-component subpaths (`@base-ui/react/<name>`); parts exposed as namespace objects (`export * as Dialog`); usage-based measurement matched `export *` within ~0.6 KB | `sideEffects: ["*.css"]`; per-component subpaths (`react-aria-components/<Name>`, `react-aria/<hook>`); root import also tree-shakes (dialog via root vs subpath: 27.8 vs 28.0 KB) | `sideEffects: false`; per-component subpaths (`@ark-ui/react/<name>`); one `@zag-js/*` package per machine | `sideEffects: false`; per-component subpaths (`@ariakit/react/<name>`) | `sideEffects: false`; **root entry only** (relies on bundler tree-shaking) |
| Exit animations | Presence suspends unmount "while your animation plays out" (docs describe CSS keyframe animations only; transitions not mentioned) (https://www.radix-ui.com/primitives/docs/guides/animation) | CSS transitions **or** animations via start/end attributes (https://base-ui.com/react/handbook/styling) | CSS transitions or keyframes via `data-entering`/`data-exiting` (https://react-aria.adobe.com/styling) | presence machine | yes | `transition` prop |
| RSC boundary | per-file `"use client"` (verified in `@radix-ui/react-dialog` dist) | per-file `'use client'` (verified `dialog/root/DialogRoot.mjs`) | **no directive; imports `client-only`**, which throws under the `react-server` condition, so the importing module must itself be `'use client'` (verified) | per-file `"use client"` | `"use client"` | `"use client"` |
| Positioning engine | `@floating-ui/react-dom` | vendored Floating UI React layer + `@floating-ui/react-dom` | own (`useOverlayPosition`), virtual-keyboard-aware | own (`@zag-js/popper` on Floating UI DOM) | own (Floating UI DOM) | `@floating-ui/react` |
| Uses native top layer / anchor positioning | No (grep of installed dists: 0 uses of `showPopover`, `showModal` or `anchor-name` in all six) | No | No | No | No | No |
| i18n / RTL | `DirectionProvider` | `DirectionProvider`; no built-in strings | `I18nProvider`, **36 locales of built-in strings**, RTL keyboard, 13 calendars, 5 numbering systems; locale-stripping plugin (https://react-aria.adobe.com/quality, https://react-aria.adobe.com/frameworks) | `LocaleProvider` | `dir`-aware | – |
| A11y evidence | Mature APG implementations | "adhere to the WAI-ARIA Authoring Practices", tested across "a broad spectrum of… screen readers" (https://base-ui.com/react/overview/accessibility) | Tested with VoiceOver (macOS Safari/Chrome, iOS), JAWS and NVDA (Firefox/Chrome), TalkBack (Android Chrome) (https://react-aria.adobe.com/quality) | v6 notes reveal and fix gaps (accordion headings, empty-state announcements) | Strong | Adequate |
| Interaction normalization | basic | good | **best**: `usePress`/`useHover` unify mouse, touch, keyboard and pen; hover only for mouse | good | good | good |
| SSR notes | Hydration fixes in 1.8.0 | `CSPProvider` (nonce), `PrehydrationScript` internal | Server and client locale must match (docs show Next.js and React Router setups) | 5.39.1 fixed `NavigationMenu.Content` SSR throw | – | 2.2.10 portal-during-hydration fix |
| License | MIT | MIT | **Apache-2.0** (compatible with an MIT project as a dependency; keep NOTICE if code is ever vendored) | MIT | MIT | MIT |

The ecosystem is converging on **`render`** as the composition prop: Base UI, RAC, Ariakit, and Ark 6.0. Radix's `asChild` is now the outlier. This decides Nizivo's public composition API.

---

## 5. How far can the native platform replace JS (October 2026)?

All data below is from `web-features` 3.42.0 and BCD 8.1.5. Baseline "Newly" means interoperable in all core browsers since that date; "Widely" means 30 months after Newly.

| Feature | Chrome / Firefox / Safari | Baseline | Verdict for Nizivo |
|---|---|---|---|
| `<dialog>` + `showModal()` | 37 / 98 / 15.4 | **Widely** (2024-09-14) | Usable. Top layer, inert background, Esc and focus return come built in. |
| `dialog.requestClose()` | 134 / 139 / 18.4 | Newly 2025-05-27 | Usable (cancelable close). |
| `<dialog closedby>` (light dismiss) | 134 / 141 / **Safari preview** | No | Needs a JS backdrop-click fallback. |
| `popover` attribute | 116 / 125 / 17 (iOS 18.3) | Newly 2025-01-27 (Widely about 2027-07) | Usable for toasts, simple disclosures and manual popovers. |
| `popover="hint"` | 151 / 153 / **Safari preview** | No | Not yet for tooltips. |
| `ToggleEvent.source`, `showPopover({source})` | 140 / 145 / 26.5; 137 / 144 / 26 | – | Helps own implementations that need to know the invoker. |
| **CSS anchor positioning, core:** `anchor-name`, `anchor()`, `anchor-size()`, `position-area`, `@position-try`, `position-try-fallbacks`, `position-visibility`, explicit `position-anchor` | 125 / **147** / 26 | Core keys Newly about 2026-01-13. The umbrella feature is still "not Baseline" because `position-anchor`'s initial value changed to `normal` in Chrome/Firefox 151 and Safari 27. | Usable as progressive enhancement with an explicit `anchor-name`/`position-anchor`. Do not rely on implicit anchoring defaults. Keep a JS fallback for older Firefox ESR 140 and Safari below 26. |
| Invoker commands (`commandfor`/`command`) | 135 / 144 / 26.2 | Newly 2025-12-12 | Usable for zero-JS open and close from server-rendered markup. **React 19.3.0 has no knowledge of `commandfor`** (no occurrences in `react-dom` 19.3.0), so use lowercase attributes, which React passes through, add TS augmentation, and listen for the native `command` event (there is no synthetic `onCommand`). |
| `interestfor` (hover/focus popovers) | 142 / – / – | No; BCD flags it experimental and non-standard-track. The Chromium intent-to-ship thread reportedly notes a negative WebKit position (UNVERIFIED primary). | Do not use (https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using_interest_invokers). |
| `<details name>` (exclusive accordion) | 120 / 130 / 17.2 | Newly 2024-09-03 | Usable for content accordions. `<summary>` maps to a button and can swallow heading semantics, so it is not a full APG accordion (https://daverupert.com/2019/12/why-details-is-not-an-accordion/). |
| `::details-content` | 131 / 143 / 18.4 | Newly 2025-09-16 | Usable for styling. |
| `interpolate-size` / `calc-size()` (animate to `auto`) | 129 / – / – | No | Height animation for details or accordions is Chrome-only; it snaps elsewhere. |
| `@starting-style`, `transition-behavior: allow-discrete` | 117 / 129 / 17.4–17.5 | Newly 2024-08 | Entry animations for dialog and popover are fine. |
| `overlay` property (keep an element in the top layer while it exits) | 117 / **–** / **–** | No | **The main practical blocker for native overlays.** Exit animations of native `<dialog>`/`[popover]` are cut short in Firefox and Safari. |
| `:open` pseudo-class | 133 / 136 / 26.5 | Newly 2026-05-11 | Usable for styling. |
| Customizable select (`appearance: base-select`, `::picker(select)`, `<selectedcontent>`, `::checkmark`) | 135 / **149 behind a flag** / **27 (2026-09-14)** | No | Progressive enhancement only. Firefox is not shipping yet (https://bugzilla.mozilla.org/show_bug.cgi?id=1958445). |
| `<input switch>` | – / – / 17.4 | No | Use `role="switch"` instead. |
| `field-sizing: content` | 123 / 152 / 26.2 | Newly 2026-06-16 | Auto-growing textarea without JS. |
| `inert` | – | Widely 2025-10-11 | Usable. |

React and SSR specifics we verified:

- **React DOM 19.3.0's nesting validator does not reject `<button>` inside `<select>`.** It restricts only `caption`, `col`, `colgroup` and `input` under `select`. So a customizable select will not dev-warn.
- **Hydration risk (inferred, UNVERIFIED).** Browsers without the relaxed select parser (today, Firefox) strip `<button>`/`<selectedcontent>` and rich markup inside `<select>` at parse time. Server-rendered rich select markup could therefore hydrate against a different DOM. Mitigation: native selects use **plain-text `<option>`s only**, plus `@supports (appearance: base-select)` styling.
- **The RSC "dot" rule is verified** in `react-server-dom-webpack` 19.3.0: "You cannot dot into a client module from a server component. You can only pass the imported name through." If a `'use client'` module exports a compound object (`export const Dialog = { Root, … }`), server components cannot use `<Dialog.Root>`. See §8.6 for the export pattern that avoids this.

**Bottom line on native:**
- Native already **fully** replaces JS for checkbox, radio, switch, segmented control in form contexts, progress and meter, content accordions and simple selects (with progressive styling).
- It **partially** replaces JS for dialog and popover. The open state, top layer and focus are native, but light dismiss in Safari, exit animations outside Chrome, and positioning fallbacks still need JS.
- It **cannot yet** replace menu, listbox/select (rich), combobox, tabs, tooltip, two-thumb slider, toast queueing or roving focus.

---

## 6. Recommendation

### 6.1 Decision

**Behavior layer = Native-first + one engine family (React Aria) + a build-time adapter boundary.**

| Tier | What | Client JS |
|---|---|---|
| **T0: Native / server** | Render plain semantic HTML from server-safe components. Covers checkbox, radio group, switch, segmented control (radio-based), progress, meter, content accordion (`<details name>`), `NativeSelect`, text and search inputs, nav item and sidebar links, and all display components (card, KPI tile, delta, alert, banner, skeleton, empty state, commerce cards). | 0 KB (tiny islands only for e.g. an indeterminate checkbox) |
| **T1: Engine (React Aria)** | `react-aria-components` for dialog and alert dialog, popover, menu and context menu, rich select, combobox and autocomplete, tabs, toggle-button group, tooltip, two-thumb slider, number field, sheet, disclosure group (APG accordion), navigation tree. Use `react-aria` hooks where Nizivo needs its own DOM: Toast (`useToastRegion`/`useToast`), upload drop target, chart-adjacent interactions, slim rewrites. | About 69 KB gz for a typical dashboard page; about 104 KB for the full set |
| **T2: Own, on the platform** | File upload (native `<input type=file>` plus drop zone), top-nav disclosure navigation (buttons plus `popover`), chart tooltips and legends (data-viz layer, not primitives) | 1–3 KB each |
| **Planned native swaps** (behind the adapter, gated by Baseline and conformance tests) | Popover and tooltip to `popover` + CSS anchor; Dialog to `<dialog>`; Select to customizable select | Shrinks T1 over time |

### 6.2 Rationale

1. **Coverage with one engine, without migration risk.** Two families cover (nearly) the whole inventory with a single engine: React Aria and Ark/Zag.
   - **React Aria** covers combobox, number field, sheet, drop zone and future date, table and tree. Only top-nav flyouts are missing, and we build those in-house regardless.
   - **Ark/Zag** is about 15% lighter (58.9 vs 69.0 KB dashboard; 85.2 vs 88.7 overlay set) and slightly broader. But it is mid-way through a breaking major: `@ark-ui/react@6.0.0-next.0` and `@zag-js/*@2.0.0-next.3` change data attributes, machine props and composition. Adopting 5.x now means migrating immediately, and adopting 6.0-next means building on a pre-release.
   - That transition, not weight or coverage, is why Ark is deferred.
   - Mixing engines is measurably the worst outcome (§3.2). It also creates cross-library layering bugs (focus traps and outside-click detection across portals).
2. **Weight.** It is the lightest stable, non-transitioning complete family: 69.0 KB on the dashboard set vs 88.3 for Base UI. Radix is lighter (42.9) but incomplete. The `react-aria` hooks layer (46.0 KB for the same set) gives an in-family way to slim hot paths. The T0 native tier removes its weak spot, the 14 KB core cost for trivial controls.
3. **Quality.** It has the strongest documented screen-reader and device test matrix, 36 locales of strings, RTL keyboard behavior and pointer, touch and keyboard normalization. This directly supports "accessible by default (WCAG 2.2 AA)" and "without compromising quality".
4. **API alignment.** It already uses `render`, `data-*` states and CSS variables, so Nizivo's public contract maps onto it with near-identity adapters.
5. **Durability.** It is Adobe-backed (React Spectrum depends on it), releases monthly, and its hooks API (3.x) has been stable for years. The license is Apache-2.0, which is fine as a dependency of an MIT library.
6. **SSR and RSC.** Its `client-only` import fails fast if an engine module is ever pulled into a server graph, which is exactly the guardrail we want. The documented Next.js and React Router locale setup prevents locale hydration mismatches.

### 6.3 Confidence

- **High:** native-first, the adapter boundary, `render` as the composition prop, a Nizivo-owned data-attribute vocabulary, and one engine at a time.
- **Medium:** React Aria rather than Base UI as that engine. The trade-off is about 19 KB per dashboard page plus best-in-class a11y and i18n, against Base UI's momentum, shadcn familiarity, simpler parts API and stable Toast.
- The adapter makes this choice reversible per component, so the medium-confidence call is cheap to revisit.

---

## 7. Rejected alternatives (and when to revisit)

| Alternative | Why not now | Revisit if… |
|---|---|---|
| **Base UI as the default engine** | 1.28x RAC and 2.06x Radix on the dashboard set (88.3 KB). Tooltip and Popover alone are 33.8 and 40.8 KB. No file upload. It is the strongest runner-up: stable, MUI-funded, shadcn default, best parts API. | MUI's size work (1.7 "smaller bundle") closes the gap to within about 10% of RAC, or contributors strongly prefer the shadcn mental model. Swap the whole family through the adapter. |
| **Radix as the default engine** | Lightest (42.9 KB dashboard), but no combobox, autocomplete, number field, drawer or file upload. Filling the gaps needs a second engine, and Radix + Base UI combobox costs 97.4 KB. `asChild`-only composition. Release gap from 2025-08-13 to 2026-06-06. The ecosystem default moved away (shadcn, July 2026). | Nizivo drops combobox, sheet and number field from scope, or Radix ships them. |
| **Ark UI / Zag** | Good weight (58.9 KB; raw Zag 50.3) and framework-agnostic machines. But v6 / Zag v2 breaking changes are in pre-release (6.0.0-next.0, 2026-10-05), so adopting 5.x now means an immediate migration. Small core team. | v6 is stable **and** Nizivo commits to Vue, Svelte or Web Components ports, where shared Zag machines are a real advantage. |
| **Ariakit** | Still 0.x. No slider, switch, toast or navigation menu. | 1.0 ships with broader coverage. |
| **Headless UI** | Dormant (1 release in 12 months, 0 merged PRs in 3 months, 88 open issues). Limited coverage (no tooltip, toast, slider or nav menu). | – |
| **Floating UI directly + own components** | `@floating-ui/react` is 0.x with low velocity (3 merged PRs in 3 months). Building menus, listboxes and comboboxes ourselves is high-risk a11y work. | Use only `@floating-ui/dom` as an optional positioning fallback for own native-popover components. |
| **Pure native, everything** | Menu, combobox, rich select, tabs, tooltip, two-thumb slider and toast still need JS. Customizable select, `closedby`, `popover=hint`, `interestfor` and `overlay` are not cross-browser (§5). | Re-check each row twice a year against `web-features`. Swap per component through the adapter. |
| **Exposing the engine publicly** (re-exporting RAC parts or types) | Locks consumers to the engine and makes every swap a breaking change. | Never. Offer an `unstable_` escape hatch at most. |

---

## 8. The adapter boundary (how swapping works)

### 8.1 Principles

1. **Engine-agnostic public contract per component.** Props, parts, state, data attributes, CSS variables and events are defined by Nizivo. No engine types appear in public `.d.ts` files (enforce with an API Extractor or `attw` check).
2. **Build-time selection with exactly one swap point per component** (`src/<component>/engine.ts`). There is no runtime engine registry, which would defeat tree-shaking and add runtime cost.
3. **One engine family active at a time** across overlay and composite widgets, to avoid duplicated cores and layering conflicts. Native and "own" adapters are allowed alongside it because they add no core.
4. **Conformance suite per component.** It covers keyboard, focus, ARIA, axe, data attributes, CSS variables, `render` merging, SSR and hydration, and RSC import. Every engine adapter must pass it before the swap-point line can change.
5. **Contract minimalism.** Public props are what at least two candidate engines (or native) can satisfy. Engine-specific extras are `unstable_`-prefixed.

### 8.2 Package and folder layout

```
packages/
  react/                                  # @nizivo/react (public, MIT)
    package.json                          # "exports": one subpath per component, "sideEffects": ["**/*.css"]
    src/
      _contracts/
        state-attrs.ts                    # Nizivo data-attribute vocabulary + helper
        render.ts                         # NzRenderProp + toRenderFn (element|function → function)
        provider.tsx                      # NizivoProvider (locale, navigate/useHref, portal container)
      _engines/
        react-aria/                       # default engine adapters, 'use client'
          popover.tsx  dialog.tsx  menu.tsx  select.tsx  combobox.tsx  tabs.tsx ...
        native/                           # zero/low-JS adapters (server-safe unless noted)
          checkbox.tsx  radio-group.tsx  switch.tsx  details-accordion.tsx  native-select.tsx
        own/                              # small Nizivo implementations on platform APIs
          file-drop.tsx  disclosure-nav.tsx
      popover/
        popover.contract.ts               # public types (engine-agnostic)
        engine.ts                         # ← THE swap point: one re-export line
        parts.tsx                         # 'use client' — public part components (flat named exports)
        index.ts                          # server-safe barrel: flat exports + namespace (see 8.6)
        popover.css                       # styles target Nizivo data-* + tokens only
  testkit/                                # private: conformance suites, run per engine
  engines-bench/                          # private: size-limit + per-engine size comparisons
```

```ts
// packages/react/src/popover/engine.ts — the only line that changes when swapping
export * from '../_engines/react-aria/popover';
// export * from '../_engines/native/popover';   // future: popover attr + CSS anchor
// export * from '../_engines/base-ui/popover';  // alternate family (whole-family swap)
```

### 8.3 Nizivo state vocabulary (public styling contract)

The names are chosen to coincide with React Aria and Base UI wherever possible, so the RAC adapter is mostly identity.

```ts
// _contracts/state-attrs.ts
export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';
export interface NzState {
  open?: boolean; entering?: boolean; exiting?: boolean;
  side?: Side; align?: Align;
  highlighted?: boolean; selected?: boolean; checked?: boolean | 'indeterminate';
  disabled?: boolean; invalid?: boolean; readOnly?: boolean; required?: boolean;
  focusVisible?: boolean; hovered?: boolean; pressed?: boolean;
  orientation?: 'horizontal' | 'vertical'; placeholder?: boolean;
}
const flag = (b?: boolean) => (b ? '' : undefined);
/** Emits Nizivo's documented data-* attributes. React drops `undefined`, renders '' as a bare attribute. */
export function stateAttrs(s: NzState) {
  return {
    'data-open': flag(s.open), 'data-closed': s.open === false ? '' : undefined,
    'data-entering': flag(s.entering), 'data-exiting': flag(s.exiting),
    'data-side': s.side, 'data-align': s.align,
    'data-highlighted': flag(s.highlighted), 'data-selected': flag(s.selected),
    'data-checked': flag(s.checked === true), 'data-indeterminate': flag(s.checked === 'indeterminate'),
    'data-disabled': flag(s.disabled), 'data-invalid': flag(s.invalid),
    'data-readonly': flag(s.readOnly), 'data-required': flag(s.required),
    'data-focus-visible': flag(s.focusVisible), 'data-hovered': flag(s.hovered),
    'data-pressed': flag(s.pressed), 'data-orientation': s.orientation,
    'data-placeholder': flag(s.placeholder),
  } as const;
}
```

Public CSS variables (set by adapters): `--nz-trigger-width`, `--nz-available-width`, `--nz-available-height`, `--nz-transform-origin`. Engine variables (`--trigger-width`, `--radix-*`, `--available-height`) are re-mapped in the adapter and never documented.

### 8.4 Public composition: `render` (element or function)

```ts
// _contracts/render.ts
import { cloneElement, type ReactElement, type Ref, type HTMLAttributes } from 'react';
import { mergeProps, mergeRefs } from 'react-aria'; // engine-family utility; swap for own 1 KB impl if engine changes

export type NzRenderProp<S> =
  | ReactElement
  | ((props: HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }, state: S) => ReactElement);

/** Normalize Nizivo's render prop to the function form all target engines accept. */
export function toRenderFn<S>(render?: NzRenderProp<S>) {
  if (!render || typeof render === 'function') return render;
  return (props: any) =>
    cloneElement(render, {
      ...mergeProps(props, render.props as object),
      ref: mergeRefs(props.ref, (render.props as any).ref),
    });
}
```

Rules, documented publicly and mirroring RAC and Base UI:
- Render the same element type.
- Render a single root element.
- Spread the received props.

Radix's `asChild` (if Radix is ever an engine) maps from the element form trivially.

### 8.5 Adapter sketch: Popover on React Aria (illustrative, not compiled)

```tsx
// _engines/react-aria/popover.tsx
'use client';
import { DialogTrigger, Popover as RacPopover, Dialog as RacDialog } from 'react-aria-components';
import type { PopoverRootProps, PopoverContentProps } from '../../popover/popover.contract';
import { stateAttrs, type Side, type Align } from '../../_contracts/state-attrs';
import { toRenderFn } from '../../_contracts/render';

const toPlacement = (side: Side, align: Align) =>
  align === 'center' ? side
  : side === 'top' || side === 'bottom' ? `${side} ${align}`
  : `${side} ${align === 'start' ? 'top' : 'bottom'}`;        // RAC: 'left top' | 'right bottom' …

export function Root({ open, defaultOpen, onOpenChange, children }: PopoverRootProps) {
  return <DialogTrigger isOpen={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>{children}</DialogTrigger>;
}

export function Content({ side = 'bottom', align = 'center', sideOffset = 8, alignOffset = 0,
  collisionPadding = 12, className, render, children, ...rest }: PopoverContentProps) {
  const userRender = toRenderFn(render);
  return (
    <RacPopover
      {...rest}
      placement={toPlacement(side, align) as any}
      offset={sideOffset}
      crossOffset={alignOffset}
      containerPadding={collisionPadding}
      className={(rp) => {
        const s = { open: true, entering: rp.isEntering, exiting: rp.isExiting, side: (rp.placement ?? side) as Side, align };
        return ['nz-popover', typeof className === 'function' ? className(s) : className].filter(Boolean).join(' ');
      }}
      render={(domProps, rp) => {
        const s = { open: true, entering: rp.isEntering, exiting: rp.isExiting, side: (rp.placement ?? side) as Side, align };
        const props = { ...domProps, ...stateAttrs(s) };          // Nizivo vocabulary on the DOM
        return userRender ? userRender(props, s) : <div {...props} />;
      }}
    >
      <RacDialog className="nz-popover__dialog">{children}</RacDialog>
    </RacPopover>
  );
}
```

`--nz-trigger-width` is set in `popover.css` as `--nz-trigger-width: var(--trigger-width)` inside the adapter's own stylesheet layer. Public CSS only reads `--nz-*`.

### 8.6 RSC-safe exports (avoid the "dot into a client module" error)

```ts
// popover/parts.tsx
'use client';
export { Root as PopoverRoot, Trigger as PopoverTrigger, Content as PopoverContent,
         Title as PopoverTitle, Close as PopoverClose } from './engine';

// popover/index.ts  — NO directive (server-safe barrel)
export * from './parts';                       // flat names: usable from Server Components
export * as Popover from './parts';            // namespace built on the server side of the boundary
export type * from './popover.contract';
```

- Never write `export const Popover = { Root, … }` inside a `'use client'` file. Server components would hit React's "You cannot dot into a client module" error.
- Building the namespace from flat client references in a directive-less barrel follows the same pattern Base UI uses (`dialog/index.mjs` has `export * as Dialog from "./index.parts.mjs"`, where the parts carry `'use client'`). Still, verify it in the conformance suite with a Next.js RSC fixture.
- The build must **preserve per-file directives** (e.g. bundle-less ESM output with `preserveModules`). See the build-tooling research.

### 8.7 Provider (optional; required for SSR locale and router links)

```tsx
// _contracts/provider.tsx
'use client';
import { I18nProvider, RouterProvider } from 'react-aria-components';
import { UNSAFE_PortalProvider } from 'react-aria';
export function NizivoProvider({ locale, navigate, useHref, portalContainer, children }: NizivoProviderProps) {
  let tree = children;
  if (portalContainer) tree = <UNSAFE_PortalProvider getContainer={() => portalContainer}>{tree}</UNSAFE_PortalProvider>;
  if (navigate) tree = <RouterProvider navigate={navigate} useHref={useHref}>{tree}</RouterProvider>;
  return <I18nProvider locale={locale}>{tree}</I18nProvider>;
}
```

- **Set `locale` explicitly in SSR frameworks.** In Next.js, read `accept-language` in the root layout and set `<html lang dir>`. React Aria's framework guide says the server and client locale must match (https://react-aria.adobe.com/frameworks).
- **Astro islands** are separate React roots, so each island that needs a non-default locale gets its own provider.
- **Portal container.** A future native `<dialog>` engine makes everything outside the modal inert. Overlays nested in a Dialog must therefore portal *into* the dialog. Make the Dialog adapter set the portal container for its subtree now, so the native swap does not break nested menus and selects.
- **Prop name (verified).** `UNSAFE_PortalProvider` is exported by `react-aria` 3.53.1 with `getContainer?: () => HTMLElement | null` (checked in its `.d.ts`). The `UNSAFE_` prefix means the adapter must own it and keep it out of the public API.

### 8.8 Swap procedure (per component)

1. Implement `_engines/<engine>/<component>.tsx` against `<component>.contract.ts`.
2. Run `testkit/<component>.conformance.ts` with the engine alias. It must pass Playwright keyboard and focus scripts, axe (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`), the data-attribute and CSS-variable assertions, `render` merging, SSR string snapshot + hydrate without warnings (Next.js App Router, Vite SPA, React Router v7 fixtures), and nested overlay layering inside Dialog.
3. Compare size with `size-limit` in the PR.
4. Change the one line in `engine.ts`.
5. Publish as a patch or minor with a changeset ("internal engine changed; no API change").

```jsonc
// .size-limit.json (budgets are starting points; tighten after the first release)
[
  { "name": "checkbox (native)",  "path": "packages/react/dist/checkbox/index.js", "import": "{ Checkbox }", "limit": "1 kB" },
  { "name": "popover",            "path": "packages/react/dist/popover/index.js",  "import": "{ PopoverRoot, PopoverTrigger, PopoverContent }", "ignore": ["react", "react-dom"], "limit": "32 kB" },
  { "name": "dashboard set",      "path": "packages/react/dist/index.js",          "import": "{ DialogRoot, PopoverRoot, MenuRoot, SelectRoot, TabsRoot, TooltipRoot }", "ignore": ["react", "react-dom"], "limit": "75 kB" }
]
```

### 8.9 Dependency policy for the engine

- `react-aria-components` and `react-aria` are regular `dependencies` with caret ranges, so consumer package managers dedupe them.
- **Toast policy (consistent with caret ranges):** build Nizivo Toast as an *own* adapter on the `react-aria` `useToastRegion`/`useToast` hooks, with `popover="manual"` for top-layer stacking above modals and a Nizivo `toast()` facade. Do **not** consume RAC's `UNSTABLE_Toast*` components. Pinning `react-aria-components` exactly would forfeit dedupe for every consumer. Fall back to an exact pin only if the hooks route is rejected. The hooks' documented stability is UNVERIFIED, so cover them with the conformance suite.
- Add a Renovate group for `react-aria*` and `@internationalized/*`, with the conformance suite as the merge gate.
- Recommend `@react-aria/optimize-locales-plugin` to consumers. It supports webpack, Rollup, esbuild, Vite and Turbopack (Next.js 15.4+). Snippets are verbatim from https://react-aria.adobe.com/frameworks:

```ts
// vite.config.ts (SPA)
import optimizeLocales from '@react-aria/optimize-locales-plugin';
export default { plugins: [{ ...optimizeLocales.vite({ locales: ['en-US', 'hi-IN'] }), enforce: 'pre' }] };
// webpack:   optimizeLocales.webpack({ locales: ['en-US'] })
// Turbopack: optimizeLocales.turbopack({ locales: ['en-US'] })   // Next.js 15.4+
```

---

## 9. Per-component recommendation

**Tier key:**
- **T0** = native, server-renderable, no engine.
- **T1** = React Aria engine.
- **T2** = own small implementation on platform APIs.
- "Later" = planned swap behind the adapter, with its gate.

| Component (Figma) | v1 implementation | Tier | Later swap and gate | Notes |
|---|---|---|---|---|
| Button, icon button, link button | `<button>` / `<a>`, `render` for router links | T0 | – | `:focus-visible` ring token; `aria-disabled` pattern for focusable disabled |
| Input, textarea, search field (plain) | `<input>`/`<textarea>` + label + description + error wiring | T0 | – | `field-sizing: content` (Newly 2026-06) for auto-grow; ids via props or `useId` in a client field |
| Checkbox (+ indeterminate) | `<input type=checkbox>` + `appearance:none` | T0 (+ 0.3 KB island for `indeterminate`) | – | Native form participation, `:checked`/`:indeterminate` |
| Radio group | `<fieldset>` + `<legend>` + radios | T0 | – | Native arrow-key roving |
| Switch | `<input type=checkbox role="switch">` | T0 | `<input switch>` only if all engines ship it | Safari-only today |
| Segmented control | Value picker: radio group styled as segments (T0). View switcher: Tabs (T1). | T0 / T1 | – | RAC `SelectionIndicator` if the animated pill is needed |
| Select (simple, form) | `NativeSelect`: `<select>` + `@supports (appearance: base-select)` styling; **plain-text options only** | T0 | Full customizable select once Firefox ships (`web-features: customizable-select` Baseline) | Avoids the hydration risk in §5 |
| Select (rich: icons, descriptions, groups, async) | RAC `Select` + `ListBox` + `Popover` | T1 | Native customizable select (same gate) | |
| Combobox / search with suggestions / command palette | RAC `ComboBox`; RAC `Autocomplete` + `SearchField` + `Menu` for command palette | T1 | – | Hardest widget; do not build our own |
| Menu, menu item, context menu, submenus | RAC `Menu`/`MenuTrigger`/`SubmenuTrigger` | T1 | – | No native equivalent |
| Popover | RAC `Popover` + `Dialog` | T1 | Native `popover` + CSS anchor (own adapter, explicit `anchor-name`) once Safari ≥ 26 and Firefox ≥ 147 dominate our analytics | |
| Tooltip | RAC `Tooltip` (14.3 KB standalone, smallest measured) | T1 | `popover="hint"` + anchor once Safari ships `hint` (currently preview). **Never** `interestfor` until it is cross-engine. | |
| Modal, dialog, alert dialog | RAC `Modal`/`ModalOverlay`/`Dialog` (`role="alertdialog"`) | T1 | Native `<dialog>` + invoker commands once Safari ships `closedby` and `overlay` (or exit animations) are interoperable | Portal-container rule (§8.7) prepares nested overlays |
| Sheet / drawer (mobile, storefront) | RAC `Sheet` (new in 1.22.0, so treat as preview; pin and test) or `Modal` + CSS slide | T1 | – | Fallback: Modal with CSS transforms |
| Toast | **Own adapter** on `react-aria` `useToastRegion`/`useToast` hooks + `popover="manual"` for top-layer stacking; Nizivo `toast()` facade | T2 (on T1 hooks) | RAC `Toast` once it drops `UNSTABLE_` | Keeps caret ranges (dedupe); exact-pinning RAC `UNSTABLE_Toast` only as fallback |
| Tabs | RAC `Tabs` | T1 | Own APG tabs (~2 KB) if Tabs-only pages exceed budget (RAC Tabs standalone 31.9 KB) | |
| Slider (single) | `<input type=range>` styled | T0 | – | |
| Slider (range, price filters) | RAC `Slider` with two thumbs | T1 | – | |
| Number field (qty stepper) | RAC `NumberField` (locale-aware parsing) | T1 | – | |
| Accordion, FAQ (content) | `<details name>` + `::details-content` styling; height animation only where `interpolate-size` exists | T0 | – | Heading caveat: use T1 when heading navigation matters |
| Accordion (app UI, APG semantics) | RAC `DisclosureGroup`/`Disclosure` | T1 | – | |
| Nav item, sidebar | Server-rendered links with `aria-current="page"`; collapsible groups via `<details>`; RAC `NavigationTree` for deep trees | T0 / T1 | – | |
| Navigation menu (top-nav flyouts) | Own APG disclosure navigation: buttons + `popover="auto"` + CSS anchor, with a JS positioning fallback | T2 | – | RAC has no NavigationMenu; menu roles are wrong for site navigation |
| Upload / drop zone | Native `<input type=file>` (the accessible path) + own drop target, optionally `react-aria` `useDrop` | T2 | – | RAC DropZone + FileTrigger is 35.5 KB standalone, too heavy for a thin wrapper |
| Progress bar / ring | `<progress>`, or `role="progressbar"` with `aria-valuenow` on an SVG ring | T0 | – | |
| Meter, KPI gauges | `<meter>` or `role="meter"` | T0 | – | |
| Alert, banner, empty state, skeleton | Server components; `role="status"`/`role="alert"`; dismiss button island | T0 | – | |
| Card, KPI tile, delta, insight card, commerce cards, order row, shipment tracker | Server components; interactive bits (menus, popovers) composed in as T1 islands | T0 | – | Keep islands small and lazy |
| Chart tooltip, legend, sparkline | Data-viz layer (own), not primitives | – | – | See data-viz research |
| 3D, shader, motion lab | Lazy client islands (`React.lazy` + `Suspense`); `prefers-reduced-motion` honored via Motion "Reduced" mode tokens | – | – | Not part of the primitive layer |

---

## 10. Implementation snippets (native tier)

### 10.1 Checkbox / Switch (server-safe, zero JS)

```tsx
// _engines/native/checkbox.tsx — no 'use client'; works in Server Components
import type { CheckboxProps } from '../../checkbox/checkbox.contract';
export function Checkbox({ label, description, invalid, className, ...input }: CheckboxProps) {
  return (
    <label className={['nz-checkbox', className].filter(Boolean).join(' ')} data-invalid={invalid ? '' : undefined}>
      <input type="checkbox" className="nz-checkbox__control" aria-invalid={invalid || undefined} {...input} />
      <span className="nz-checkbox__label">{label}</span>
    </label>
  );
}
// Switch = same markup with role="switch" on the input.
```

```css
@layer nz.components {
  .nz-checkbox__control { appearance: none; inline-size: var(--nz-size-control-xs); block-size: var(--nz-size-control-xs);
    border: 1px solid var(--nz-border-strong); border-radius: var(--nz-radius-xs); background: var(--nz-bg-surface); }
  .nz-checkbox__control:checked, .nz-checkbox__control:indeterminate { background: var(--nz-bg-brand); border-color: transparent; }
  .nz-checkbox__control:focus-visible { outline: var(--nz-focus-ring-width) solid var(--nz-focus-ring-color); outline-offset: 2px; }
  .nz-checkbox__control:disabled { opacity: .5; }
}
```

### 10.2 NativeSelect with customizable-select progressive enhancement

```tsx
export function NativeSelect({ options, ...props }: NativeSelectProps) {
  return (
    <select className="nz-native-select" {...props}>
      {options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
    </select>   // plain-text options only (hydration-safe in browsers without the relaxed select parser)
  );
}
```

```css
.nz-native-select { appearance: none; /* classic tokenized styling for every browser */ }
@supports (appearance: base-select) {
  .nz-native-select, .nz-native-select::picker(select) { appearance: base-select; }
  .nz-native-select::picker(select) { border-radius: var(--nz-radius-md); box-shadow: var(--nz-elevation-2); }
  .nz-native-select option:checked { background: var(--nz-bg-brand-subtle); }
}
```

### 10.3 Content accordion with `<details name>`

```tsx
export function ContentAccordion({ name, items }: { name: string; items: { id: string; title: string; body: React.ReactNode }[] }) {
  return items.map((it) => (
    <details key={it.id} name={name} className="nz-acc">
      <summary className="nz-acc__summary">{it.title}</summary>
      <div className="nz-acc__body">{it.body}</div>
    </details>
  ));
}
```

```css
.nz-acc::details-content { block-size: 0; overflow: clip;
  transition: block-size var(--nz-motion-duration-md) var(--nz-motion-ease-standard),
              content-visibility var(--nz-motion-duration-md) allow-discrete; }
.nz-acc[open]::details-content { block-size: auto; }
@supports (interpolate-size: allow-keywords) { :root { interpolate-size: allow-keywords; } } /* Chrome-only today; snaps elsewhere */
@media (prefers-reduced-motion: reduce) { .nz-acc::details-content { transition: none; } }
```

### 10.4 CSS anchor positioning for future own popovers and tooltips (progressive)

```tsx
// own adapter sets a unique anchor per instance
<button style={{ anchorName: `--nz-a-${id}` }} popoverTarget={`nz-p-${id}`}>…</button>
<div id={`nz-p-${id}`} popover="auto" className="nz-floating" style={{ positionAnchor: `--nz-a-${id}` }}>…</div>
```

```css
.nz-floating { position-area: block-end span-inline-end; position-try-fallbacks: flip-block, flip-inline;
  margin-block: var(--nz-space-2); }
@supports not (anchor-name: --x) { /* adapter lazy-loads @floating-ui/dom (7.3 KB gz) or uses react-aria positioning */ }
```

### 10.5 Invoker commands (future native Dialog engine; TS augmentation)

```ts
// types/dom-augment.d.ts (shipped in @nizivo/react)
import 'react';
declare module 'react' {
  interface ButtonHTMLAttributes<T> {
    commandfor?: string;
    command?: 'show-modal' | 'close' | 'request-close' | 'show-popover' | 'hide-popover' | 'toggle-popover' | `--${string}`;
  }
  interface DialogHTMLAttributes<T> { closedby?: 'any' | 'closerequest' | 'none'; }
}
```

```tsx
// Server Component: opens a native modal with zero JS in Chrome 135+, Firefox 144+, Safari 26.2+
<button type="button" commandfor="nz-dlg-1" command="show-modal">Open</button>
<dialog id="nz-dlg-1" closedby="any">…</dialog>
```

---

## 11. Risks and mitigations

| Risk | Likelihood / impact | Mitigation |
|---|---|---|
| React Aria Toast stays `UNSTABLE_` or changes shape | Medium / Medium | Own Toast adapter on `useToastRegion`/`useToast` hooks behind a Nizivo `toast()` facade (keeps caret ranges); conformance suite; exact-pin RAC `UNSTABLE_Toast` only as fallback |
| RAC `Sheet` is brand new (1.22.0, 2026-10-08) | Medium / Low | Ship Nizivo Sheet as preview; fallback adapter = Modal + CSS |
| RAC first-widget core cost (~14 KB) on light pages | High / Low–Medium | T0 native tier for simple controls; lazy-mount overlay content; size-limit budgets |
| RAC Tabs heavy standalone (31.9 KB) | Medium / Low | Own APG tabs adapter if budgets fail |
| Engine abstraction leaks (props or behaviors only one engine supports) | Medium / Medium | Contract minimalism; `unstable_` escape props; conformance tests per engine |
| Runtime cost of state-attribute normalization | Low / Low | One object spread per render; the RAC vocabulary is near-identity |
| Locale hydration mismatch in SSR | Medium / Medium | `NizivoProvider locale` required in SSR docs; Next.js and React Router setup per React Aria frameworks guide |
| Duplicate React Aria copies in consumer apps (version skew) | Medium / Low | Caret ranges; peer-compatible docs; `npm dedupe` guidance |
| Native overlay swap breaks nested overlays (inert outside a modal `<dialog>`) | Medium / High (on swap) | Portal-container rule now; nested-overlay test in the conformance suite |
| Customizable select hydration in non-supporting browsers | Medium / Medium | Plain-text options in `NativeSelect` (inferred risk; add a Firefox hydration test) |
| `commandfor` unknown to React types and events | High / Low | TS augmentation; native `command` event listener; feature-detect `'command' in HTMLButtonElement.prototype` (UNVERIFIED detection idiom) and add a polyfill if needed |
| Ecosystem sentiment (shadcn defaults to Base UI) attracts contributors to a different mental model | Medium / Low | Public API is Nizivo's own; the Base UI adapter remains a documented, tested alternate |
| Apache-2.0 dependency in an MIT project | Low / Low | Dependency only; if any RAC code is vendored, retain LICENSE and NOTICE |

---

## 12. Open questions

1. **Browser support floor.** Firefox ESR 140? Safari ≥ 17 or ≥ 18? This decides when the native popover, anchor and dialog swaps can happen.
2. **i18n scope.** Which locales, and is RTL in scope for v1? This sets the optimize-locales config and the RTL test matrix.
3. **Combobox and command palette in v1?** If not, Radix becomes viable as the lightest engine, at a 2x size win.
4. **Multi-framework roadmap** (Vue, Svelte, Web Components)? If yes, re-evaluate Zag v2 after Ark 6 is stable.
5. **Top-nav flyouts.** Are they in the Figma navigation set, or only sidebar, tabs and segmented control? This determines whether the own disclosure-nav adapter is needed in v1.
6. **Toast.** The recommendation is our own adapter on `react-aria` toast hooks from day one. Confirm the team accepts owning roughly 3 KB of queue and timer logic, versus exact-pinning RAC `UNSTABLE_Toast`.
7. **Tailwind.** Will Tailwind variants be offered on top of the `data-*` vocabulary? This affects the naming review with the styling-layer research.

---

## 13. Sources

**Libraries**
- Radix changelog: https://github.com/radix-ui/primitives/blob/main/packages/react/radix-ui/CHANGELOG.md
- Radix releases: https://www.radix-ui.com/primitives/docs/overview/releases
- Radix composition: https://www.radix-ui.com/primitives/docs/guides/composition
- Radix animation: https://www.radix-ui.com/primitives/docs/guides/animation
- Base UI releases: https://base-ui.com/react/overview/releases
- Base UI composition: https://base-ui.com/react/handbook/composition
- Base UI styling: https://base-ui.com/react/handbook/styling
- Base UI accessibility: https://base-ui.com/react/overview/accessibility
- MUI blog, "2026 and beyond": https://mui.com/blog/2026-and-beyond/
- shadcn/ui changelog: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default and https://ui.shadcn.com/docs/changelog/2026-01-base-ui
- React Aria releases: https://react-aria.adobe.com/releases/v1-22-0 and https://react-aria.adobe.com/releases/v1-21-0
- React Aria styling: https://react-aria.adobe.com/styling
- React Aria customization: https://react-aria.adobe.com/customization
- React Aria frameworks: https://react-aria.adobe.com/frameworks
- React Aria quality: https://react-aria.adobe.com/quality
- React Aria home: https://react-aria.adobe.com/
- Ark changelog: https://ark-ui.com/docs/overview/changelog
- Ark React 6.0.0-next.0 release: https://github.com/chakra-ui/ark/releases/tag/%40ark-ui%2Freact%406.0.0-next.0
- Ariakit changelog: https://ariakit.com/changelog
- Headless UI releases: https://github.com/tailwindlabs/headlessui/releases
- Floating UI React docs: https://floating-ui.com/docs/react

**Registries and APIs** (queried 2026-10-14)
- npm registry: https://registry.npmjs.org/
- npm downloads: https://api.npmjs.org/downloads/point/last-week/
- GitHub REST and search API: https://api.github.com/

**Platform data**
- web-features 3.42.0: https://www.npmjs.com/package/web-features
- MDN browser-compat-data 8.1.5: https://github.com/mdn/browser-compat-data
- MDN, customizable select: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select
- MDN, interest invokers: https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using_interest_invokers
- Chromium intent to ship, interest invokers: https://groups.google.com/a/chromium.org/g/blink-dev/c/bX1G_yDt6W4
- Mozilla bug 1958445 (base-select): https://bugzilla.mozilla.org/show_bug.cgi?id=1958445
- Dave Rupert, details is not an accordion: https://daverupert.com/2019/12/why-details-is-not-an-accordion/
- Hassell Inclusion, accessible accordions with details/summary: https://www.hassellinclusion.com/blog/accessible-accordions-part-2-using-details-summary/

**Local verification**
- Measurement scripts: `scratchpad/bench/tools/*.mjs`; results: `scratchpad/bench/sizes.json`
- Installed package inspection: `scratchpad/bench/deps/node_modules`
- React Flight error string: `scratchpad/bench/rsdw/node_modules/react-server-dom-webpack@19.3.0`
