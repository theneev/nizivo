# R2: Styling and theming strategy (zero-runtime) and consumer interop for Nizivo UI

Research date: 2026-10-14. Scope: `@nizivo/*` React design-system library (Neev Technologies). It has to work in Next.js App Router (RSC, SSR, streaming), in a Vite SPA, and in Astro islands, React Router framework mode and TanStack Start.
Inputs: the Figma token snapshot (`scratchpad/figma/00-tokens-and-styles.md`), plus primary sources fetched today and cited inline. "UNVERIFIED" marks claims I could not confirm from a primary source.

---

## 0. TL;DR (the decision)

**Recommendation: plain, hand-authored CSS. Each component gets its own `.css` file, compiled by Lightning CSS and shipped as static files inside a namespaced cascade layer (`@layer nz.*`). The token CSS is generated from the Figma variables.**

- **Stable public class names and attributes.** Every component and part gets a stable class (`nz-button`, `nz-card-header`). Variants are `data-*` attributes (`data-variant`, `data-size`, `data-tone`). States use native pseudo-classes and ARIA first (`:disabled`, `:focus-visible`, `[aria-invalid="true"]`), then a canonical Nizivo `data-*` state set (`data-open`, `data-checked`, `data-highlighted`, `data-starting-style`/`data-ending-style`). Every behavior primitive is mapped onto that set, so the primitive library can be swapped without touching CSS.
- **How consumers override.**
  - Consumer CSS with no layer (CSS Modules, globals, Tailwind's `utilities` layer if they import us into `layer(components)`) always beats library CSS, with no `!important` and no specificity games.
  - `className` and `style` pass through on every part.
  - Public per-component "hook" variables (`--nz-button-bg`, `--nz-button-bg-hover`) are read with a fallback. The library never assigns them, so a hook works both on the element and inherited from any ancestor.
- **Delivery.**
  - `import "@nizivo/ui/styles.css"` (everything, one file) is the default.
  - `@nizivo/ui/css/core.css` plus per-component files `@nizivo/ui/css/<name>.css` serve the size-sensitive.
  - Component JS never imports CSS. That one rule removes most framework-specific CSS problems: `sideEffects` tree-shaking, Astro `noExternal`, Next.js chunk ordering, test runners choking on `.css`.
- **Theming.**
  - Semantic colors use `light-dark()`, switched by `color-scheme`. That property is set by namespaced attributes: `data-nz-theme="light|dark|system"`. Nested themes then cost nothing.
  - Multi-brand: `[data-nz-brand]` re-declares primitives, and the semantic aliases are re-declared there too.
  - Density: `[data-nz-density]` remaps the size tokens.
  - Reduced motion: `prefers-reduced-motion` plus a `[data-nz-motion="reduce"]` override.
  - Responsive: Figma's Responsive modes become `@media` (page-level tokens, mobile-first) and `@container` (components).
  - Figma `spring()` becomes build-time `linear()` plus duration pairs. The two springs in the file are computed in section 8.3.
- **Tailwind v4 interop.**
  - The library does not ship Tailwind classes, so consumers never need `@source` scanning.
  - We ship a first-class adapter, `@nizivo/ui/tailwind.css`, which maps our tokens into Tailwind's `@theme inline`.
  - A documented one-line import recipe puts our CSS between preflight and utilities.
- **Tooling is swappable later.** The *consumer contract* is static layered CSS files, stable class and attribute names, and `--nz-*` variables. Behind that contract, the authoring layer (plain CSS today; vanilla-extract or Panda `cssgen` later), the token generator (Terrazzo or Style Dictionary) and the primitives can each be replaced without a breaking change.

Rejected:
- **Runtime CSS-in-JS (Emotion, styled-components):** it has a runtime cost and needs `'use client'` or per-instance style payloads under RSC.
- **Consumer-must-compile systems (StyleX source, Panda `designSystem`, a Tailwind preset or `@source` scanning):** they put the library's toolchain on the consumer.
- **Pigment CSS:** on hold.
- **Linaria:** works, but it is a Babel-evaluation build step with no advantage over plain CSS for a library.

---

## 1. Criteria

| # | Criterion | Why it matters for Nizivo |
|---|---|---|
| C1 | **RSC compatibility.** Server-only components (Card, Badge, KPI tile, Skeleton, Empty state) must render with zero client JS and no `'use client'`. | Next.js App Router is a primary target. |
| C2 | **Zero runtime.** No style injection, no style hashing at runtime, no Context needed for styles. | "Lightweight and very performant". Avoids hydration mismatches. |
| C3 | **Override ergonomics.** Layers so consumer CSS wins, `className`/`style` passthrough, public CSS variables. | Public open-source library. People will customize. |
| C4 | **CSS granularity.** One stylesheet versus per-component. | Tree-shaking for size-sensitive apps. |
| C5 | **Delivery and framework handling.** Next App Router, Vite, Astro, React Router, TanStack Start. | "Flawlessly in all". |
| C6 | **Consumer toolchain burden.** Does the consumer need a compiler, plugin, preset or scan config? | Plug-in / plug-out promise. Non-Tailwind users. |
| C7 | **Tailwind v4 interop.** Tokens through `@theme`, preflight, layer order. | Most React apps in 2026 use Tailwind. |
| C8 | **Theming power.** Light/dark, nested, multi-brand, density, reduced motion, responsive. | Figma has Light/Dark, Default/Reduced and Desktop/Tablet/Mobile modes. |
| C9 | **Maintenance and longevity of the tool.** | The tool must outlive the WIP phase. |
| C10 | **Swap-ability.** Can the authoring tool change without a breaking change for consumers? | Explicit user requirement. |

---

## 2. State of the art (verified 2026-10-14)

Versions and dates come from the npm registry (`https://registry.npmjs.org/<pkg>`, `dist-tags.latest` plus `time`), queried today.

| Tool | Latest | Published | Status, with sources |
|---|---|---|---|
| Plain CSS + Lightning CSS | lightningcss 1.33.0 | 2026-07-20 | Active. It transpiles nesting, `light-dark()` (needs `color-scheme` on an ancestor), custom media (`drafts.customMedia`), range media queries and oklch fallbacks ([Lightning CSS transpilation](https://lightningcss.dev/transpilation.html)). |
| PostCSS | 8.5.30 | 2026-10-12 | Active (alternative pipeline). |
| CSS Modules | (bundler feature) | n/a | Supported natively by Next.js, Vite and Astro ([Next.js CSS docs, updated 2026-08-25](https://nextjs.org/docs/app/getting-started/css); [Astro styling](https://docs.astro.build/en/guides/styling/)). |
| vanilla-extract | @vanilla-extract/css 1.21.3 | 2026-10-08 | Active. The Rollup plugin is "useful for library development". It emits `.css` per module with `preserveModules`, or one file with `extract`. A custom `identifiers` function gives stable names ([docs](https://vanilla-extract.style/documentation/integrations/rollup/)). Turbopack support in the Next plugin is *experimental* (Next ≥ 16) ([docs](https://vanilla-extract.style/documentation/integrations/next/)). That only matters if consumers compile, which they would not. |
| Panda CSS | @pandacss/dev 2.2.0 | 2026-10-09 | **v2.0 shipped 2026-09-29.** It has a Rust/Oxc engine, is ESM-only, needs Node 22+, and adds the `panda lib` / `designSystem` publishing flow. Output layers are `reset, base, tokens, recipes, utilities` ([Panda v2 blog](https://panda-css.com/blog/panda-css-v2)). Library options: the consumer runs Panda (`designSystem`), or the library ships a CSS file (`panda cssgen`, "the app gets no theming from its own config"), or a preset ([Panda component-library guide](https://panda-css.com/docs/guides/component-library)). |
| StyleX | @stylexjs/stylex 0.19.1 | 2026-09-15 | Active, still 0.x. Atomic and compile-time. `useLayers` defaults to `false`. `classNamePrefix` defaults to `'x'`. `runtimeInjection` is for dev only ([babel-plugin config](https://stylexjs.com/docs/api/configuration/babel-plugin/)). Official guidance on publishing a *library* (pre-compiled CSS versus consumer compiles) was not found: **UNVERIFIED**. Third-party design systems ship pre-compiled and note that consumers must keep the default `x` prefix and match StyleX versions ([normal-ui PR](https://github.com/imsus/normal-ui/pull/10)). |
| Tailwind CSS | 4.3.3 | 2026-07-16 | Active. The default layer order is `theme, base, components, utilities`. Preflight lives in `base` ([Preflight docs](https://tailwindcss.com/docs/preflight)). `@theme inline` is for variables that reference other variables ([Theme docs](https://tailwindcss.com/docs/theme)). Third-party component CSS belongs in `components` so utilities can override it ([Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles)). Browser floor is Chrome 111, Safari 16.4, Firefox 128 ([Compatibility](https://tailwindcss.com/docs/compatibility)). |
| Pigment CSS | @pigment-css/react 0.0.31 | 2026-05-22 | **"Alpha phase, currently, on hold"** ([repo](https://github.com/mui/pigment-css)). MUI says it is not being developed and the focus moved to Base UI ([MUI blog](https://mui.com/blog/2026-and-beyond/)). |
| Linaria / wyw-in-js | @linaria/core 8.2.0; @wyw-in-js/transform 2.5.1 | 2026-08-10 / 2026-09-03 | Maintained. An official Next.js integration exists through `turbopack.rules` ([wyw-in-js Next.js](https://wyw-in-js.dev/bundlers/nextjs)). It is still a Babel-evaluate-at-build-time pipeline. |
| Emotion | @emotion/react 11.14.0 | **2024-12-09** (no release in about 22 months) | Runtime. Under RSC it requires client components. The only RSC thread is a 2023 discussion ([emotion#3119](https://github.com/emotion-js/emotion/discussions/3119)). |
| styled-components | 6.6.0 (7.0 pre-releases) | 2026-10-12 | Maintenance mode was announced in 2025 ([Max Stoiber](https://x.com/mxstbr/status/1908201327811059926); [OpenCollective](https://opencollective.com/styled-components/updates/thank-you)). Releases have since resumed. In 6.6.0, "each server-rendered instance now carries its own inline `<style>`" under RSC, and "server rendering on the edge runtime is not supported" ([releases](https://github.com/styled-components/styled-components/releases)). It is still runtime CSS-in-JS. |
| React Spectrum S2 `style` macro | @react-spectrum/s2 1.8.1 | 2026-10-09 | A build-time atomic macro. Consumers need Parcel or `unplugin-parcel-macros` ([S2 styling](https://react-spectrum.adobe.com/styling)). Noted as precedent only. |

Precedents in how comparable libraries ship styles:
- **Mantine** (@mantine/core 9.7.2). Ships `styles.css`, a `styles.layer.css` variant wrapped in `@layer mantine`, and per-component `*.layer.css` files. Users must import a component's dependencies (Button needs UnstyledButton). The docs say "do not import both `styles.css` and `styles.layer.css`" ([Mantine styles](https://mantine.dev/styles/mantine-styles)).
- **Base UI** (@base-ui/react 1.9.0). Unstyled. It exposes state as data attributes (`data-checked`, `data-highlighted`, `data-starting-style`, `data-ending-style`) and CSS variables (`--anchor-width`, `--available-height`, `--transform-origin`). `className` and `style` can be functions of state ([Base UI styling](https://base-ui.com/react/handbook/styling)).
- **Radix Themes** (3.3.0). One `@radix-ui/themes/styles.css` import plus `<Theme>` props.
- **Chakra UI** (3.37.0). Still Emotion-based at runtime (version from npm).

Framework versions today, from npm:

| Package | Version | Published |
|---|---|---|
| next | 16.4.0 | 2026-10-06 |
| react | 19.3.0 | 2026-09-09 |
| astro | 7.3.8 | 2026-10-08 |
| react-router | 8.4.0 | 2026-09-15 |
| @tanstack/react-start | 1.169.1 | 2026-10-13 |
| vite | 8.3.4 | 2026-10-08 |

The task brief says "React Router v7 framework mode". npm `latest` is now **8.x**, and its styling guide still offers side-effect imports, the `links` export, or React 19 `<link precedence>` ([React Router styling](https://reactrouter.com/explanation/styling)).

---

## 3. Options compared

Legend: ✅ good, ⚠️ workable with caveats, ❌ fails the criterion.

| Option | C1 RSC | C2 zero-runtime | C3 overrides | C4 granularity | C5 delivery | C6 consumer burden | C7 Tailwind v4 interop | C8 theming | C9 longevity | C10 swap-ability |
|---|---|---|---|---|---|---|---|---|---|---|
| **A. Plain CSS + custom properties + `@layer`, compiled by Lightning CSS (RECOMMENDED)** | ✅ classNames only | ✅ | ✅ stable classes, layers, hooks | ✅ per-component files plus all-in-one | ✅ one CSS import in every framework | ✅ none | ✅ `layer(components)` plus `@theme inline` adapter | ✅ full native CSS | ✅ it is the platform | ✅ the contract is the output |
| B. CSS Modules shipped raw (`.module.css` imported from JS) | ✅ | ✅ | ❌ hashed names. Consumers can't target parts, and names change per bundler. | ✅ automatic | ⚠️ needs CSS-in-JS-import in every consumer bundler, plus `sideEffects`. Order depends on import graph ([Next.js ordering](https://nextjs.org/docs/app/getting-started/css)). | ⚠️ bundler must support CSS Modules from node_modules | ⚠️ | ✅ | ✅ | ⚠️ |
| B'. CSS Modules as authoring, pre-compiled to static CSS with stable names | ✅ | ✅ | ⚠️ only with deterministic naming | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (equivalent to A with more tooling) |
| C. vanilla-extract, pre-compiled by our build | ✅ | ✅ | ⚠️ needs a custom `identifiers` fn for stable names. Hashed vars unless `createGlobalThemeContract`. | ✅ `preserveModules` | ✅ static CSS | ✅ none if pre-compiled | ✅ same as A | ✅ typed contracts | ✅ active | ✅ can swap in later behind A's contract |
| D. Panda CSS 2.x, `designSystem` | ✅ | ✅ with `transform: true` | ⚠️ atomic classes. Override via its own API. | ✅ | ⚠️ | ❌ consumer must run Panda | ⚠️ Panda `base` and `utilities` layer *names* collide with Tailwind's (same names merge) unless renamed (rename option **UNVERIFIED**) | ✅ | ⚠️ v2 is two weeks old | ⚠️ |
| D'. Panda `cssgen` static CSS | ✅ | ✅ | ⚠️ atomic and recipe classes. "No theming from [app] config." | ⚠️ | ✅ | ✅ | ⚠️ layer-name collision as above | ⚠️ | ⚠️ | ⚠️ |
| E. StyleX | ✅ compiled | ✅ | ❌ atomic. `className` overrides fight its model. Overrides must be passed as StyleX styles. | ✅ | ⚠️ | ❌/⚠️ consumer compiles, or pins prefix and version | ⚠️ `useLayers` off by default | ✅ `defineVars`/`createTheme` (hashed vars) | ⚠️ 0.x | ❌ the API leaks into consumers |
| F1. Tailwind v4, ship class strings in JSX (shadcn model) | ✅ | ✅ | ⚠️ needs `tailwind-merge` (runtime JS) for conflicts | ✅ | ❌ consumer must `@source` our dist and run Tailwind | ❌ Tailwind is mandatory | ✅ native | ⚠️ | ✅ | ❌ |
| F2. Tailwind v4 as internal compiler to static CSS | ✅ | ✅ | ⚠️ global atomic classes (`.flex`) collide with the consumer's Tailwind unless `prefix(nz)` | ⚠️ one blob | ✅ | ✅ | ⚠️ two Tailwind outputs, duplicate utilities | ⚠️ | ✅ | ⚠️ |
| G. Pigment CSS | ✅ | ✅ | ⚠️ | ✅ | ⚠️ needs a bundler plugin | ❌ | ⚠️ | ✅ | ❌ on hold | ❌ |
| H. Linaria / wyw-in-js | ✅ | ✅ | ⚠️ hashed | ✅ | ⚠️ | ⚠️ unless pre-compiled | ⚠️ | ✅ | ⚠️ | ⚠️ |
| I. Emotion / styled-components | ❌ client-only (Emotion), or per-instance inline styles with no edge runtime (styled-components 6.6) | ❌ | ⚠️ | ⚠️ | ⚠️ needs a registry or SSR integration per framework | ⚠️ | ⚠️ | ✅ | ⚠️ maintenance / stale | ❌ |

---

## 4. Recommendation and architecture

### 4.1 What we commit to (the public styling contract)

These are semver-governed. Breaking any of them is a major release.

1. **Layer names.** `nz` with the sub-layers `nz.tokens`, `nz.reset`, `nz.base`, `nz.components`, `nz.utilities`.
2. **Class names.** `nz-<component>` for roots and `nz-<component>-<part>` for parts. Kebab-case, never hashed.
3. **Attributes.**
   - Variants: `data-variant`, `data-size`, `data-tone`, plus component-specific ones.
   - Canonical state attributes (section 4.4).
   - `data-slot="<part>"` on every part, useful for Tailwind `*:data-[slot=icon]:` targeting.
   - Theme-scope attributes: `data-nz-theme`, `data-nz-brand`, `data-nz-density`, `data-nz-motion`.
4. **CSS custom properties.**
   - `--nz-p-*` primitives.
   - `--nz-<group>-<name>` semantic tokens.
   - `--nz-<component>-<prop>[-<state>]` public hooks.
   - `--_*` private variables (not public API, may change anytime).
5. **CSS entry points.** `styles.css`, `css/core.css`, `css/<component>.css`, `tokens.css`, `tailwind.css`.

Everything *behind* this contract can be swapped: the authoring syntax (plain CSS, vanilla-extract, Panda `cssgen`), the token generator, the build tool and the behavior primitives. This is the plug-in / plug-out guarantee.

### 4.2 Layer model

Every CSS file the library ships starts with the same layer statement. Repeating it is legal and idempotent, and it fixes the order no matter which file a bundler happens to load first:

```css
@layer nz.tokens, nz.reset, nz.base, nz.components, nz.utilities;
```

- `nz.tokens`: primitives, semantic aliases, motion, density, responsive, and `color-scheme` switches.
- `nz.reset`: **empty by default.** An opt-in `@nizivo/ui/reset.css` exists for apps without any reset. Components never depend on it (see section 4.7, "reset-independence").
- `nz.base`: shared building blocks such as `.nz-focus-ring`, `.nz-visually-hidden` and the `@property` registrations.
- `nz.components`: one block per component.
- `nz.utilities`: a few library-owned helpers (`nz-tabular-nums`, `nz-truncate`).

Why this works for consumers:
- Any **unlayered** author CSS beats any layered CSS, whatever the specificity or source order. Panda's v2 notes state the same rule: "any unlayered rule beats every layered rule" ([Panda v2](https://panda-css.com/blog/panda-css-v2)). Mantine adopted layers for the same reason ([Mantine](https://mantine.dev/styles/mantine-styles)).
- So a consumer's CSS Module class, global CSS, or inline style on a part always wins. No `!important`.
- Cascade layers are Baseline *widely available* since 2024-09-14 (section 9).

Inside the library, specificity still matters, but only against our own rules. Keep the base rule at (0,1,0) and the variant/state rules at (0,2,0)–(0,3,0). `:where()` flattening is optional, not load-bearing. Use it only for reset-like defaults in `nz.base`.

### 4.3 Token output (generated from Figma)

The token pipeline (tooling choice belongs to a separate report: Terrazzo `@terrazzo/cli` 2.8.0 (2026-10-13) or Style Dictionary 5.6.1 (2026-10-10), versions from npm) emits `tokens.css`. The emission rule: **leaf tokens are declared only at their scope root. Alias tokens are re-declared on every scope element that can change what they point to.**

The reason: a custom property's `var()` references are substituted on the element where the property is declared, and descendants then inherit the *resolved* value. Tailwind's docs describe the same trap as the reason for `@theme inline` ([Theme docs](https://tailwindcss.com/docs/theme)). An alias declared only on `:root` would ignore a nested brand override of the primitives.

```css
/* @nizivo/tokens/tokens.css (generated; abbreviated) */
@layer nz.tokens, nz.reset, nz.base, nz.components, nz.utilities;

@layer nz.tokens {
  /* --- Primitives: leaves, at :root only (brands override them below) --- */
  :root {
    --nz-css-version: "0.1.0";             /* JS/CSS version handshake (section 4.9) */
    --nz-p-green-300: #79b993;
    --nz-p-green-400: #4c9e71;
    --nz-p-green-700: #1a573a;
    --nz-p-neutral-0: #ffffff;
    --nz-p-neutral-50: #f6f7f4;
    --nz-p-neutral-900: #181b19;
    --nz-p-neutral-950: #101311;
    /* ...54 primitives... */

    /* Space / radius / size: leaves */
    --nz-space-2: 8px;  --nz-space-3: 12px;  --nz-space-4: 16px;
    --nz-radius-sm: 8px; --nz-radius-md: 12px; --nz-radius-full: 999px;
    --nz-border-width-default: 1px; --nz-border-width-focus: 2px;
    --nz-size-control-sm: 32px; --nz-size-control-md: 40px; --nz-size-control-lg: 48px;
    --nz-size-touch-min: 44px;

    /* Typography (Geist / Geist Mono): composite `font` shorthands + tracking */
    --nz-font-family-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
    --nz-font-family-mono: "Geist Mono", ui-monospace, monospace;
    --nz-font-label-m: 500 14px/1.4 var(--nz-font-family-sans);
    --nz-font-body-m: 400 14px/1.5 var(--nz-font-family-sans);
  }

  /* --- Semantic colors: ALIASES, so re-declared on every brand scope --- */
  :root, [data-nz-brand] {
    --nz-color-bg-canvas:  light-dark(var(--nz-p-neutral-50),  var(--nz-p-neutral-950));
    --nz-color-bg-surface: light-dark(var(--nz-p-neutral-0),   var(--nz-p-neutral-900));
    --nz-color-bg-brand:   light-dark(var(--nz-p-green-700),   var(--nz-p-green-400));
    --nz-color-text-primary: light-dark(var(--nz-p-neutral-900), var(--nz-p-neutral-50));
    --nz-color-border-focus: light-dark(var(--nz-p-green-500), var(--nz-p-green-300));
    /* ...58 semantic tokens... */

    /* Elevation: Figma has no dark variants; shadow colour is themed per layer */
    --nz-shadow-1: 0 1px 2px 0 light-dark(#1013110a, #00000052), 0 1px 1px 0 light-dark(#10131108, #0000003d);
  }

  /* --- Color-scheme switches (light-dark() resolves per element) --- */
  [data-nz-theme="light"]  { color-scheme: light; }
  [data-nz-theme="dark"]   { color-scheme: dark; }
  [data-nz-theme="system"] { color-scheme: light dark; }

  /* --- Brands: override primitives only; the aliases above re-resolve on the same element --- */
  /* (shipped as separate files: @nizivo/tokens/brands/<brand>.css) */

  /* --- Density: override leaf size/space tokens --- */
  [data-nz-density="compact"] {
    --nz-size-control-sm: 28px; --nz-size-control-md: 32px; --nz-size-control-lg: 40px;
  }
}
```

Notes:
- **Default behavior is non-intrusive.** No `color-scheme` is set on `:root` unless the app adds `data-nz-theme`. The CSS initial value `normal` resolves `light-dark()` to the light value, so a light-only consumer site doesn't suddenly get dark scrollbars or form controls. Apps opt in with `<html data-nz-theme="system">` (or `dark`/`light`).
  - "System" needs no JS and no inline script, so there is no hydration mismatch.
  - A persisted user choice can be rendered server-side from a cookie. The theme-switching runtime is out of scope here.
- **Attributes are namespaced (`data-nz-theme`, not `data-theme`)** to avoid clashing with daisyUI-style `data-theme` values. For apps already on `next-themes` / `.dark`, document a one-liner: `.dark { color-scheme: dark } .light { color-scheme: light }`, or point `next-themes` at `attribute="data-nz-theme"`.
- **`light-dark()` needs `color-scheme`, and it accepts only colors (and, from Safari 27, images).** MDN: "the `color-scheme` must have a value of `light dark`" for it to work ([MDN light-dark()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)); `<image>` support landed in Safari 27 ([web.dev Sept 2026](https://web.dev/blog/web-platform-09-2026)).
  - So non-color tokens such as whole shadows can't be switched with `light-dark()`. Shadows are composed from per-layer `light-dark()` *colors*, as above.
  - The dark shadow alphas above are placeholders. The Figma file has no dark elevation, so this is a design gap.
- **Don't register semantic color tokens with `@property { syntax: "<color>" }`.** A registered `<color>` would compute `light-dark()` on the declaring element (`:root`), which breaks nested themes. Unregistered custom properties carry the token stream to the use site. *Reasoned from the CSS custom-properties spec, not separately tested here: verify with a Playwright fixture.*
- **The `--nz-` prefix** replaces Figma's `--grove-` code syntax at generation time. Figma's codeSyntax should be updated to match, so Dev Mode shows the real names.

### 4.4 Component CSS conventions

**Selectors and variants.** Use a root class plus `data-*` attributes rather than modifier classes. The reasons:

1. Props map 1:1 to attributes (`data-variant={variant}`), with no class-string assembly and no `clsx` dependency.
2. They never collide with the consumer's `className`.
3. Tailwind can target them (`data-[variant=critical]:…`).
4. They are readable in DevTools.
5. An attribute selector has the same specificity as a class.

Booleans are presence attributes (`data-loading=""` / omitted) and selected with `[data-loading]`.

**State precedence.** Use native and ARIA states first: `:disabled`, `:focus-visible`, `:user-invalid` (Baseline widely, 2026-05-02), `[aria-invalid="true"]`, `[aria-expanded="true"]`, `[aria-selected="true"]`, `[aria-current="page"]`. Next come the canonical Nizivo data states, emitted by *our* wrapper components whatever primitive sits underneath:

| Canonical attribute | Meaning | Typical source |
|---|---|---|
| `data-open` / `data-closed` | Disclosure state | Popover, Select, Menu, Modal, Tooltip |
| `data-checked` / `data-unchecked` / `data-indeterminate` | Toggle state | Checkbox, Switch, Radio, Segment |
| `data-highlighted` | Virtual focus | Menu item, Select option |
| `data-pressed` | Active press (touch-safe) | Button, Icon button |
| `data-disabled` | Disabled when `:disabled` isn't available (non-form elements) | Menu item, Tab |
| `data-starting-style` / `data-ending-style` | Enter/exit animation hooks | Overlays (Base UI semantics) |
| `data-side` / `data-align` | Placement after collision handling | Popovers, tooltips |

Base UI already uses most of these names ([Base UI styling](https://base-ui.com/react/handbook/styling)). If the primitive layer becomes React Aria (which emits `data-hovered`, `data-pressed`, `data-focus-visible`, …) or a home-grown hook, the adapter in our wrapper maps to the canonical set. **CSS never references a vendor-specific attribute.** This keeps the primitive layer pluggable.

**Variables: private resolved values, public hooks, states set the property.**

```css
/* @nizivo/ui/css/button.css */
@layer nz.tokens, nz.reset, nz.base, nz.components, nz.utilities;

@layer nz.components {
  .nz-button {
    /* private (not API): variants and sizes only write these */
    --_bg: var(--nz-color-bg-brand);
    --_bg-hover: var(--nz-color-bg-brand-hover);
    --_bg-active: var(--nz-color-bg-brand-pressed);
    --_fg: var(--nz-color-text-on-brand);
    --_border: transparent;
    --_h: var(--nz-size-control-md);
    --_px: var(--nz-space-4);

    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--nz-space-2);
    min-block-size: var(--nz-button-height, var(--_h));
    padding-inline: var(--nz-button-padding-x, var(--_px));
    margin: 0;
    border: var(--nz-border-width-default) solid var(--nz-button-border-color, var(--_border));
    border-radius: var(--nz-button-radius, var(--nz-radius-sm));
    background-color: var(--nz-button-bg, var(--_bg));
    color: var(--nz-button-fg, var(--_fg));
    font: var(--nz-font-label-m);
    text-decoration: none;
    cursor: pointer;
    transition-property: background-color, border-color, color, scale;
    transition-duration: var(--nz-duration-fast);
    transition-timing-function: var(--nz-ease-standard);

    /* states set the PROPERTY, reading a per-state public hook first */
    @media (hover: hover) {
      &:hover:not(:disabled, [aria-disabled="true"]) {
        background-color: var(--nz-button-bg-hover, var(--_bg-hover));
      }
    }
    &:active:not(:disabled, [aria-disabled="true"]),
    &[data-pressed] {
      background-color: var(--nz-button-bg-active, var(--_bg-active));
      scale: var(--nz-scale-press);
    }
    &:focus-visible {
      outline: var(--nz-border-width-focus) solid var(--nz-color-border-focus);
      outline-offset: 2px;
    }
    &:disabled, &[aria-disabled="true"] {
      --_bg: var(--nz-color-bg-disabled);
      --_fg: var(--nz-color-text-disabled);
      cursor: not-allowed;
    }

    /* variants and sizes: only touch private vars */
    &[data-variant="secondary"] {
      --_bg: var(--nz-color-bg-surface);
      --_bg-hover: var(--nz-color-bg-hover);
      --_bg-active: var(--nz-color-bg-pressed);
      --_fg: var(--nz-color-text-primary);
      --_border: var(--nz-color-border-default);
    }
    &[data-variant="critical"] { --_bg: var(--nz-color-bg-critical); /* ... */ }
    &[data-size="sm"] { --_h: var(--nz-size-control-sm); --_px: var(--nz-space-3); }
    &[data-size="lg"] { --_h: var(--nz-size-control-lg); --_px: var(--nz-space-5); }

    @media (forced-colors: active) {
      border-color: ButtonText;
      &:focus-visible { outline-color: Highlight; }
    }
  }

  .nz-button-icon { inline-size: var(--nz-size-icon-sm); block-size: var(--nz-size-icon-sm); flex: none; }
}
```

Why it is shaped this way:
- **Public hooks (`--nz-button-*`) are never assigned by the library.** So they inherit, and a consumer can set `--nz-button-radius: 999px` on a section, a theme root, or one button through `style`. If the library assigned them on `.nz-button`, inherited values would be shadowed.
- Each state reads its own hook (`--nz-button-bg-hover`), so overriding the rest color doesn't kill hover feedback.
- `@property` is **reserved** for the few variables that must animate or must not leak (`inherits: false`): progress-ring angle, gradient stops in the shader lab, a count-up number. It is not applied to every variable, because registration changes inheritance and computed-value semantics.

**React side, RSC-safe.** No hooks are needed for purely presentational components, so they stay server components.

```tsx
// packages/ui/src/button/button.tsx: no 'use client'
import type { ComponentPropsWithRef } from "react";
import { cx } from "../internal/cx"; // 3-line string join, no dependency

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "critical";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx("nz-button", className)}
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "" : undefined}
      aria-busy={loading || undefined}
    />
  );
}
```

Interactive components (Select, Menu, Modal, Toast) carry `'use client'` because of behavior, not styling. Their styling is exactly the same static CSS.

### 4.5 Packaging and delivery

**Files shipped (`@nizivo/ui`):**
```
dist/
  styles.css            # tokens + core + every component (the default import)
  css/core.css          # tokens + nz.base + nz.utilities (required with per-component files)
  css/button.css        # leaf files: no @import, no tokens; just the layer statement + component
  css/select.css
  ...
  tailwind.css          # Tailwind v4 adapter (section 4.6)
  reset.css             # optional global reset in nz.reset
  index.js / *.d.ts     # JS NEVER imports CSS
```
Heavy domains ship as their own packages with their own CSS, all in the same layer scheme. That keeps chart, shader and storefront CSS out of the core:

| Package | CSS file |
|---|---|
| `@nizivo/charts` | `@nizivo/charts/styles.css` |
| `@nizivo/lab` (3D, shader and motion lab) | its own file |
| `@nizivo/storefront` | its own file |

**package.json:**
```json
{
  "name": "@nizivo/ui",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./button": { "types": "./dist/button/index.d.ts", "default": "./dist/button/index.js" },
    "./styles.css": "./dist/styles.css",
    "./reset.css": "./dist/reset.css",
    "./tailwind.css": "./dist/tailwind.css",
    "./css/*.css": "./dist/css/*.css",
    "./package.json": "./package.json"
  }
}
```

Why "JS never imports CSS":
- **Bundler-specific behavior.** Side-effect CSS imports inside library JS depend on each bundler: `sideEffects` mistakes silently drop styles, Next.js orders CSS by import graph and merges chunks ([Next.js "Ordering and Merging"](https://nextjs.org/docs/app/getting-started/css)), and Node-based test runners and plain-Node SSR choke on `.css`.
- **Astro.** For packages whose CSS path lacks an extension, Astro asks you to add them to `vite.ssr.noExternal` ([Astro styling](https://docs.astro.build/en/guides/styling/)).
- **Mantine precedent.** It also requires explicit stylesheet imports ([Mantine](https://mantine.dev/styles/mantine-styles)).
- **Escape hatch.** A later, *optional* `@nizivo/unplugin` could auto-inject per-component CSS for people who want it. That is additive, not part of the contract.

**Per framework:**

| Framework | Recommended import | Notes |
|---|---|---|
| Next.js 16 App Router | `import "@nizivo/ui/styles.css"` in `app/layout.tsx` (server component), or `@import` inside `globals.css` | Next allows external stylesheets "anywhere in the `app` directory" and recommends keeping CSS imports in a single entry ([docs](https://nextjs.org/docs/app/getting-started/css)). `experimental.cssChunking` defaults to `true`, and Turbopack also offers `'graph'` ([cssChunking](https://nextjs.org/docs/app/api-reference/config/next-config-js/cssChunking)). Layers make our precedence immune to chunk order. |
| Vite SPA (Vite 8) | `import "@nizivo/ui/styles.css"` in `main.tsx` | Nothing else needed. |
| Astro 7 (React islands) | `import "@nizivo/ui/styles.css"` in the layout frontmatter | The extension is present, so no `noExternal` is needed ([Astro](https://docs.astro.build/en/guides/styling/)). Import in the layout rather than inside the island so CSS also applies to server-only usage. |
| React Router 7/8 framework mode | Side-effect import in `root.tsx`, or `links` export with `import href from "@nizivo/ui/styles.css?url"` | Per the [React Router styling guide](https://reactrouter.com/explanation/styling). |
| TanStack Start | `import appCss from "@nizivo/ui/styles.css?url"` plus `head().links`, or a side-effect import | `?url` links are "route head output"; side-effect imports become manifest-managed assets ([TanStack Start CSS](https://tanstack.com/start/latest/docs/framework/react/guide/css-styling)). |

React 19's `<style href precedence>` / `<link precedence>` hoisting and dedup ([react.dev `<style>`](https://react.dev/reference/react-dom/components/style)) is *not needed* by our model. Keep it in reserve for the lab package, if a shader demo ever needs component-scoped dynamic CSS.

**Per-component CSS.**
- `core.css` is mandatory. Leaf component files have **no** `@import`s, so nothing gets inlined twice in consumers' bundlers.
- A generated manifest (`dist/css/manifest.json`, component → required leaf files) documents internal dependencies, e.g. `select` needs `menu-item` and `popover`.
- **UNVERIFIED estimate:** fifty components of hand-written CSS typically land around 10–20 KB brotli in total. Set CSS size budgets in CI (size-limit on `styles.css` and on each leaf), so the "single file is fine" claim stays honest.

### 4.6 Tailwind v4 interop

The rules:
1. **We do not ship Tailwind class strings.** Consumers never need `@source "../node_modules/@nizivo/ui"`, and non-Tailwind users are first-class.
2. **Layer placement.** `@layer` order is first-declaration order:
   - If the consumer imports our CSS *before* `@import "tailwindcss"`, our `nz` layer is declared first. Preflight (`base`) then beats us, which is bad.
   - If they import it *after* without a layer, `nz` is declared after `utilities`, and our rules beat `className="p-0"`, which is also bad.
   - The correct recipe nests us inside Tailwind's `components` layer, which is exactly where the Tailwind docs put third-party component CSS ([Adding custom styles](https://tailwindcss.com/docs/adding-custom-styles)).

```css
/* app/globals.css (consumer, Tailwind v4) */
@import "tailwindcss";                                  /* declares theme, base, components, utilities */
@import "@nizivo/ui/styles.css" layer(components);       /* becomes components.nz.* */
@import "@nizivo/ui/tailwind.css";                       /* @theme inline token mapping */
```

Resulting precedence: `theme` < `base` (preflight) < `components.nz.*` (Nizivo) < `utilities` < unlayered consumer CSS. So `<Button className="rounded-full px-8">` works without `!important`.

3. **Preflight conflicts.**
   - Preflight's `* { border: 0 solid }` and element resets ([Preflight](https://tailwindcss.com/docs/preflight)) sit in `base`, below us.
   - **Reset-independence rule:** every component explicitly sets every property it relies on (border style, margin, font, line-height, list-style, `img` display, `button` background). Otherwise it renders differently with preflight, with modern-normalize, and with no reset.
   - Enforce it with a visual-regression matrix of {no reset, Tailwind preflight, modern-normalize}.

4. **The adapter (`@nizivo/ui/tailwind.css`)** is generated from the same token source. It maps our variables into Tailwind namespaces with `@theme inline`. Tailwind's docs say to use `inline` "when defining theme variables that reference other variables", so utilities emit `var(--nz-…)` and resolve at the element. Nested themes and brands then work for utilities too ([Theme docs](https://tailwindcss.com/docs/theme)).

```css
/* @nizivo/ui/tailwind.css (generated) */
@theme inline {
  --color-nz-canvas: var(--nz-color-bg-canvas);
  --color-nz-surface: var(--nz-color-bg-surface);
  --color-nz-brand: var(--nz-color-bg-brand);
  --color-nz-fg: var(--nz-color-text-primary);
  --color-nz-fg-muted: var(--nz-color-text-secondary);
  --color-nz-border: var(--nz-color-border-default);
  /* ...all semantic colors... */
  --radius-nz-sm: var(--nz-radius-sm);
  --radius-nz-md: var(--nz-radius-md);
  --shadow-nz-1: var(--nz-shadow-1);
  --shadow-nz-2: var(--nz-shadow-2);
  --ease-nz-standard: var(--nz-ease-standard);
  --ease-nz-spring: var(--nz-ease-spring);
  --font-nz-sans: var(--nz-font-family-sans);
  --font-nz-mono: var(--nz-font-family-mono);
  --breakpoint-nz-tablet: 48rem;   /* mirrors the build-time custom media (section 8.2) */
  --breakpoint-nz-desktop: 80rem;
}
/* Opt-in: align Tailwind's dark: variant with Nizivo's explicit theme attribute */
/* @custom-variant dark (&:where([data-nz-theme="dark"], [data-nz-theme="dark"] *)); */
```

- Usage: `bg-nz-surface text-nz-fg border-nz-border rounded-nz-md shadow-nz-1`. These are already light/dark aware through `light-dark()`, so `dark:` is rarely needed.
- We namespace with `nz-` so we don't override the consumer's palette. A consumer who *wants* our palette as their palette can add `--color-*: initial` themselves ([Theme docs](https://tailwindcss.com/docs/theme)).
- **Floors differ.** Tailwind v4's floor is Safari 16.4 / Chrome 111 / Firefox 128. Ours is slightly higher (section 9.1). Document it.

### 4.7 Theming matrix

| Need | Mechanism | Scope / nesting |
|---|---|---|
| Light / dark / system | `light-dark()` in semantic tokens, plus `color-scheme` set by `[data-nz-theme]` | Nesting is automatic, because `color-scheme` inherits and `light-dark()` resolves per element. |
| Multi-brand | `@nizivo/tokens/brands/<brand>.css` overrides primitives under `[data-nz-brand="<brand>"]`. Semantic aliases are re-declared on `[data-nz-brand]`. | Nestable (a brand inside a brand). |
| Density | `[data-nz-density="compact\|comfortable"]` overrides leaf size and space tokens. | Nestable. Components read leaves at the element. |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` re-assigns motion tokens to Figma's *Reduced* mode. `[data-nz-motion="reduce"]` forces it. | No "force full motion" override is offered, out of respect for the user's OS setting. |
| High contrast | `@media (forced-colors: active)` per component, using system colors. `@media (prefers-contrast: more)` can swap `border-subtle` for `border-strong`. | Both are Baseline widely. |
| Theme component | `<NizivoTheme theme brand density motion>` renders a `div` with the four data attributes. It is a server component with zero JS. | Root theming should go on `<html>`, set by the app. |

### 4.8 Figma modes mapped to CSS

#### 4.8.1 Motion (Default / Reduced)

```css
@layer nz.tokens {
  :root {
    --nz-duration-instant: 80ms;  --nz-duration-fast: 140ms; --nz-duration-base: 220ms;
    --nz-duration-slow: 320ms;    --nz-duration-slower: 480ms;
    --nz-duration-count-up: 900ms; --nz-duration-chart-draw: 700ms;
    --nz-ease-standard: cubic-bezier(0.2, 0, 0, 1);
    --nz-ease-enter: cubic-bezier(0, 0, 0, 1);
    --nz-ease-exit: cubic-bezier(0.3, 0, 1, 1);
    /* springs ship as easing + duration PAIRS; the duration is baked into the curve */
    --nz-ease-spring: linear(0, 0.007 1.5%, 0.026 3%, 0.055 4.5%, 0.105 6.5%, 0.15 8%, 0.215 10%, 0.462 17%, 0.562 20%, 0.667 23.5%, 0.746 26.5%, 0.813 29.5%, 0.869 32.5%, 0.915 35.5%, 0.956 39%, 0.986 42.5%, 1.009 46.5%, 1.022 50.5%, 1.029 55.5%, 1.028 63%, 1.008 84%, 1);
    --nz-duration-spring: 500ms;
    --nz-ease-spring-soft: linear(0, 0.004 1%, 0.023 2.5%, 0.042 3.5%, 0.079 5%, 0.154 7.5%, 0.372 14%, 0.467 17%, 0.567 20.5%, 0.641 23.5%, 0.704 26.5%, 0.766 30%, 0.817 33.5%, 0.862 37.5%, 0.901 42%, 0.932 47%, 0.955 52.5%, 0.972 58.5%, 0.984 65.5%, 0.992 73.5%, 1);
    --nz-duration-spring-soft: 710ms;
    --nz-distance-lift: 4px; --nz-distance-reveal: 12px; --nz-distance-float: 8px;
    --nz-scale-press: 0.98; --nz-scale-hover: 1.02; --nz-stagger-item: 40ms;
  }
  @media (prefers-reduced-motion: reduce) {
    :root { /* Figma "Reduced" mode */
      --nz-duration-instant: 0ms; --nz-duration-fast: 0ms; --nz-duration-base: 120ms;
      --nz-duration-slow: 120ms;  --nz-duration-slower: 160ms;
      --nz-duration-count-up: 0ms; --nz-duration-chart-draw: 0ms;
      --nz-ease-standard: linear; --nz-ease-enter: linear; --nz-ease-exit: linear;
      --nz-ease-spring: linear; --nz-duration-spring: 0ms;
      --nz-ease-spring-soft: linear; --nz-duration-spring-soft: 0ms;
      --nz-distance-lift: 0px; --nz-distance-reveal: 0px; --nz-distance-float: 0px;
      --nz-scale-press: 1; --nz-scale-hover: 1; --nz-stagger-item: 0ms;
    }
  }
  [data-nz-motion="reduce"] { /* same block, generated */ }
}
```

- **The 0 ms trap.** A transition with zero duration does not run, so `transitionend` never fires. The behavior layer must detect completion with `element.getAnimations()` (Base UI's `data-ending-style` model) or with timers, never with the event alone. Make this a contract test for any primitive we plug in. If a primitive can't comply, the generator can emit `0.01ms` instead of `0ms` for that token. That is a documented deviation from Figma.
- **JS consumers** (`@nizivo/lab`, chart count-up) read the same values from `@nizivo/tokens/motion.js`, which exports the raw spring parameters and the generated `linear()` strings. They also check `matchMedia('(prefers-reduced-motion: reduce)')` *and* the closest `[data-nz-motion]`.

#### 4.8.2 Responsive (Desktop / Tablet / Mobile)

Figma gives *frame widths* (1440/1024/390), **not breakpoints**. That is a design decision to close. The proposal below is mobile-first, with tablet starting at 48rem (768px) and desktop at 80rem (1280px), so the 1024 frame gets tablet values and the 1440 frame gets desktop values.

```css
/* source (Lightning CSS drafts.customMedia; @custom-media has no native browser support per web-features) */
@custom-media --nz-tablet (width >= 48rem);
@custom-media --nz-desktop (width >= 80rem);

@layer nz.tokens {
  :root {                                   /* Mobile = base */
    --nz-grid-columns: 4; --nz-grid-gutter: 16px; --nz-grid-margin: 16px;
    --nz-layout-sidebar: 0px; --nz-layout-content-max: 358px; --nz-section-gap: 20px;
    /* fluid type between the Mobile (390) and Desktop (1440) values; rem intercept keeps zoom working */
    --nz-type-display: clamp(2.25rem, 1.7857rem + 1.9048vw, 3.5rem); /* 36 -> 56 */
    --nz-type-h1: clamp(1.5rem, 1.3143rem + 0.7619vw, 2rem);         /* 24 -> 32 */
  }
  @media (--nz-tablet)  { :root { --nz-grid-columns: 8;  --nz-grid-gutter: 20px; --nz-grid-margin: 24px; --nz-layout-sidebar: 72px;  --nz-layout-content-max: 976px;  --nz-section-gap: 24px; } }
  @media (--nz-desktop) { :root { --nz-grid-columns: 12; --nz-grid-gutter: 24px; --nz-grid-margin: 32px; --nz-layout-sidebar: 264px; --nz-layout-content-max: 1280px; --nz-section-gap: 32px; } }
}
```

- **Page-level tokens** (grid, sidebar, section gap, display type) use `@media`, because they describe the viewport.
- **Components use container queries** (size queries are Baseline widely since 2025-08-14). Examples: KPI tile number size, product card stacking, Insight card layout, sidebar collapse.
  - The rule: a component sets `container: nz-card / inline-size` on its root, and its *inner parts* respond with `@container nz-card (width < 20rem) { … }`. An element cannot query its own size.
  - Caveat: `inline-size` containment stops the root from shrink-wrapping its content. Only containers whose width comes from their parent (block, grid or flex cells with a definite basis) should declare it. Document this per component.
- The type tokens with fixed per-mode values (`type/kpi` 32/28/28) can become `cqi`-based `clamp()` inside the KPI tile instead of viewport media.
- Breakpoints are also exported as JS constants and as Tailwind `--breakpoint-nz-*` (section 4.6), because custom media can't be shared at runtime.

#### 4.8.3 Figma `spring()` to CSS `linear()`

- **Format.** The Figma Motion collection stores springs as strings: `"spring(1, 260, 24, 0)"` and `"spring(1, 170, 26, 0)"`.
  - I interpreted them as `(mass, stiffness, damping, initialVelocity)`. **UNVERIFIED:** Figma's help center only documents a "Bounce" field and saving springs as variables ([Figma: Adjust easing](https://help.figma.com/hc/en-us/articles/41414048690839-Adjust-an-animation-s-easing)). Confirm with the designer.
- **CSS has no spring timing function.** `linear()` (Baseline widely, 2026-06-11) approximates one, but **the duration is part of the curve**. That is why Motion's generator emits `500ms linear(…)` together ([Motion docs](https://motion.dev/docs/ai-generate-css-springs-and-easings-llm)), and why generator tools derive duration from when the spring settles ([Josh Comeau](https://joshwcomeau.com/animation/linear-timing-function)).
- **Our generator.** The token build gets a ~40-line damped-oscillator solver. It samples the spring until it is within 0.1% of rest, simplifies the points to a ±0.002 tolerance, and emits `--nz-ease-<name>` plus `--nz-duration-<name>`. The solver I used for this report produced:

| Token | Params | Damping ratio ζ | Settle (0.1%) | Overshoot | Points |
|---|---|---|---|---|---|
| `spring` | m=1, k=260, c=24 | 0.744 | 500 ms | ~3.0% | 22 |
| `spring-soft` | m=1, k=170, c=26 | 0.997 | 710 ms | 0% | 21 |

  (Values are in the snippet in section 4.8.1. Script: `scratchpad/scripts/spring.py`.)

- **Usage.** `transition: transform var(--nz-duration-spring) var(--nz-ease-spring);`. Never pair a spring easing with a different duration token: that distorts the physics.
- **Composite variables are fragile.** A single composite variable like `--nz-transition-spring: 500ms linear(...)` fits the `transition` shorthand, but it breaks when people split the longhands. Ship the pair.

### 4.9 Guardrails (build and lint)

**Build: Lightning CSS** for the component and token files (Node API `bundle`/`transform`).

```js
// scripts/build-css.mjs
import { bundle, browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";

const targets = browserslistToTargets(
  browserslist("chrome >= 123, edge >= 123, firefox >= 128, safari >= 17.5, ios_saf >= 17.5")
);
export function buildCss(filename) {
  return bundle({
    filename,
    targets,                       // lowers only what the floor lacks (e.g. nesting is fine; ranges ok)
    minify: true,
    drafts: { customMedia: true }, // @custom-media --nz-tablet ...
    errorRecovery: false,
  });
}
```

**Custom media prelude.** `@custom-media` is substituted only when its definition is in the same bundle. So the build prepends a shared `src/styles/custom-media.css` prelude to every token and leaf source file before Lightning CSS runs. The *published* files contain no `@custom-media` and no `@import`, so the "leaf files have no imports" contract holds. Components should mostly use `@container` anyway; the prelude is mainly for tokens and page-level layout.

**Version handshake.** `tokens.css` declares `--nz-css-version`. A dev-only client helper (`<NizivoDevChecks/>`, tree-shaken in production) compares it with the JS package version and warns on a missing or mismatched stylesheet. It catches "forgot to import CSS" and "two versions installed".

**Lint.**
- Stylelint:
  - `selector-class-pattern: ^nz-[a-z0-9-]+$`
  - custom properties must match `^(--nz-|--_)`
  - no raw hex or rgb colors in component files
  - `declaration-no-important`
  - `selector-max-specificity: 0,3,0`
  - every rule inside `@layer nz.*`
- Baseline linting: `@eslint/css` `use-baseline`, with `available` set to a year matching the floor and `@supports` blocks exempt ([@eslint/css](https://npmjs.com/package/@eslint/css)). There is also a stylelint equivalent sourced from web-features.

**Tests.**
- Playwright visual matrix: {Chromium, Firefox, WebKit} × {**no `data-nz-theme` at all**, light, dark, system, nested dark-in-light, nested brand-in-brand} × {no reset, Tailwind preflight} × {default, compact} × {motion, reduced}.
- The "no theme attribute" case verifies the load-bearing assumption in section 4.3. `color-scheme: normal` should make `light-dark()` resolve to the light value, so a light-only consumer page is unchanged. That follows the CSS Color 5 spec, but MDN only documents the `light dark` case.
- A Next.js App Router fixture that renders presentational components as server components with zero client JS.

---

## 5. Rejected alternatives and why

| Alternative | Why rejected | Could it come back? |
|---|---|---|
| **Emotion** | Runtime injection. Requires client components under RSC (no official RSC support found; [emotion#3119](https://github.com/emotion-js/emotion/discussions/3119)). Last release 2024-12-09. Fails C1, C2 and C9. | No. |
| **styled-components** | Runtime. Maintenance mode announced in 2025. 6.6.0's RSC model ships an inline `<style>` per server-rendered instance and doesn't support the edge runtime ([releases](https://github.com/styled-components/styled-components/releases)). Fails C2 and the "lightweight" goal. | No. |
| **Pigment CSS** | "Alpha … on hold". MUI says it is not being developed ([repo](https://github.com/mui/pigment-css), [MUI](https://mui.com/blog/2026-and-beyond/)). | Only if revived and 1.0. |
| **Linaria / wyw-in-js** | Works, and has an official Turbopack path ([wyw-in-js](https://wyw-in-js.dev/bundlers/nextjs)). But it is build-time JS evaluation with hashed names and no benefit over plain CSS for a library. | Not needed. |
| **StyleX** | Atomic classes plus a "pass styles, not classNames" philosophy clash with the className/CSS-override ergonomics a public library needs. Library publishing is ambiguous (consumer compile versus pinned `x` prefix and version). Layers are off by default ([config](https://stylexjs.com/docs/api/configuration/babel-plugin/)). Still 0.x. | No (it leaks into consumers). |
| **Panda CSS 2.x (`designSystem`)** | Forces consumers to run Panda. The `cssgen` path loses app-level theming ([guide](https://panda-css.com/docs/guides/component-library)). Its layer names (`base`, `utilities`) are the same as Tailwind's, so they merge unless renamed. v2 is 15 days old. | Yes: `cssgen` or recipes as an *authoring* layer behind our contract, if typed recipes are wanted later. |
| **Tailwind v4 classes in JSX (shadcn model)** | Makes Tailwind mandatory for consumers and needs `@source` scanning of node_modules. Merging conflicts needs `tailwind-merge` at runtime. Version coupling to the consumer's Tailwind. | We support Tailwind users through the *adapter* instead. A shadcn-style copy-paste registry could be a separate, later distribution channel. |
| **Tailwind v4 as internal compiler to static CSS** | Emits global atomic classes that collide with the consumer's own Tailwind output unless prefixed (`prefix(nz)` gives `nz:flex`). That means two utility systems on one page. Tailwind itself discourages heavy `@apply`. | No. |
| **Raw CSS Modules shipped to consumers** | Hashed, bundler-dependent class names make parts un-targetable. It also requires JS-imports-CSS, with the ordering and `sideEffects` hazards. | CSS Modules as *authoring*, compiled with deterministic names, is equivalent to the recommendation. Allowed if contributors prefer it. |
| **vanilla-extract** | Not rejected. *Deferred.* It is the best "typed CSS" swap-in: it pre-compiles to static CSS ([rollup plugin](https://vanilla-extract.style/documentation/integrations/rollup/)), and with a custom `identifiers` fn plus `createGlobalThemeContract` it can produce exactly our class and variable contract. Not chosen as the default because it adds a TS→CSS toolchain and slows contributor onboarding. Plain CSS plus Lightning CSS plus stylelint plus generated token types reaches the same output with fewer moving parts. | Yes, without consumer impact. |

---

## 6. Risks and mitigations

| Risk | Likelihood / impact | Mitigation |
|---|---|---|
| **Consumers import our CSS in the wrong place relative to Tailwind** (preflight wins, or we beat utilities) | High / Medium | Ship a copy-paste recipe for each framework. The dev-only checker can detect "Tailwind preflight loaded after nz" by reading `document.styleSheets` layer order (best effort). Add a docs troubleshooting page. |
| **`light-dark()` floor.** Baseline low 2024-05-13; widely available on 2026-11-13 (computed: low + 30 months). Older Safari (< 17.5) breaks semantic colors, because the property becomes invalid at computed time. | Low (Oct 2026) / High if hit | Floor set at Safari 17.5. The token generator keeps a `colorStrategy: "blocks"` option, which emits classic duplicated `[data-nz-theme=dark]` and `prefers-color-scheme` blocks, as a fallback file (`tokens.legacy.css`). Lightning CSS can lower `light-dark()` ([docs](https://lightningcss.dev/transpilation.html)), but **whether it lowers inside custom-property values is UNVERIFIED**. Test before relying on it. |
| **Nested-theme correctness** depends on unregistered custom properties carrying `light-dark()` to the use site | Low / High | A Playwright fixture with dark inside light inside dark. Never `@property`-register color tokens. |
| **Alias tokens declared on `:root` don't follow nested brand or density overrides** | Medium / Medium | The generator enforces "leaves at root, aliases re-declared on scope selectors", plus a unit test on the generated CSS. Component-tier hooks are never assigned. |
| **Figma design gaps.** No breakpoints. No dark elevation. Hard-coded shadow colors. No `overlay/scrim`, `info` solid, `border/info` or `icon/info` tokens. The `spring()` param order is unconfirmed. | Certain / Medium | Track in the design backlog. The generator fails loudly on unknown formats. |
| **Accessibility of the Figma focus ring.** `Focus/Ring` is a 4px green/500 shadow at ~28% alpha, which blends to about #C5DCD1. I computed its contrast at **1.44:1 against white and 1.42:1 against canvas**, far below the 3:1 non-text contrast expected for focus indicators (WCAG 1.4.11; 2.4.13 at AAA). Box-shadow rings also vanish in forced-colors mode. Separately, `text/tertiary` (neutral/500) is 4.31:1 on white and 4.03:1 on neutral/900, below 4.5:1 for body text. | Certain / High (WCAG 2.2 AA target) | Use a solid `outline: 2px solid var(--nz-color-border-focus)` (green/500 is 4.66:1 on white) with `outline-offset: 2px`, optionally plus the soft halo. Raise or restrict `text/tertiary`. Report both to design. |
| **Anchor positioning hype.** The core is Newly available since 2026-01-13 (Chrome 125 / Firefox 147 / Safari 26), but the umbrella web-features entry is *not* Baseline, because the `position-visibility: anchor-valid/anchor-visible` values are Safari-27-only. Anchor animations and transitions are not in Firefox. | Medium / Medium | Positioning stays in the swappable behavior layer (JS collision handling). CSS anchor positioning is a progressive enhancement behind `@supports (anchor-name: --a)`. |
| **Exit animations in Firefox.** `transition-behavior: allow-discrete` is Baseline, but the web-features "display animation" entry (transitioning `display`) is not Baseline (no Firefox), and `overlay` is Chromium-only. | Medium / Low | Overlays close instantly in Firefox (acceptable degradation), or the primitive keeps them mounted until `getAnimations()` settles (`data-ending-style` model). |
| **Single `styles.css` grows** with charts, lab and storefront | Medium / Medium | Heavy domains live in separate packages and CSS files. CI size budgets apply. Per-component leaf files are there for the size-sensitive. |
| **Version skew** (two `@nizivo/ui` versions on one page) means identical class names with different rules | Low / Medium | `--nz-css-version` handshake warning. A future opt-in build flag can re-prefix CSS and JS (`nz` → custom), mirroring StyleX's `classNamePrefix` and Mantine's prefix options. |
| **Next.js CSS chunk merging** reorders CSS | Low / Low | Precedence relies on layers, not order. Recommend a single global import. `cssChunking: 'strict'` (webpack) is available if needed ([cssChunking](https://nextjs.org/docs/app/api-reference/config/next-config-js/cssChunking)). |
| **Container `inline-size` containment** collapses shrink-to-fit roots | Medium / Low | Declare containers only on components with parent-defined width, and document it. |
| **Ecosystem churn.** Panda v2 is 15 days old, StyleX 0.x, React Router now 8.x, Next.js 16.4, Vite 8. | Medium / Low | The plain-CSS contract is immune. Only the docs recipes need updating. |

---

## 7. Implementation checklist

1. `@nizivo/tokens`: DTCG JSON source synced from Figma (the Figma Variables REST API is reportedly Enterprise-only, so on Starter/Pro plans use a plugin or MCP export; this is **UNVERIFIED here**, see the token-pipeline report). The generator emits:
   - `tokens.css` (layered, leaves and aliases rule)
   - `brands/*.css`
   - `tailwind.css`
   - `tokens.d.ts` (a typed name union for public hooks)
   - `motion.js` (springs plus `linear()`)
   - `tokens.legacy.css` (optional dual-block strategy)
2. `@nizivo/ui` CSS source: one `src/<component>/<component>.css` per component, following section 4.4. A shared `src/styles/base.css` (`nz.base`) holds `.nz-focus-ring`, `.nz-visually-hidden` and `@property` registrations.
3. The build script (Lightning CSS) emits `dist/css/*.css`, `dist/css/core.css` and a concatenated `dist/styles.css` (core first, then components in manifest order), plus `dist/css/manifest.json`.
4. Every component passes through `className` and `style` on its root, and exposes `className`/`style` per part via `slotProps`. The exact API belongs to the component-API report.
5. A canonical data-state adapter maps primitive vendor attributes to Nizivo attributes.
6. Docs recipes for the five frameworks, plus Tailwind and non-Tailwind variants.
7. CI: stylelint, `@eslint/css` `use-baseline`, size-limit, and the Playwright matrix in section 4.9.

---

## 8. Open decisions for the team

1. **Browser floor.** Recommended: Chrome/Edge ≥ 123, Firefox ≥ 128, Safari/iOS ≥ 17.5. This is set by `light-dark()` and is slightly above Tailwind v4's Safari 16.4 floor. Alternative: Tailwind's floor plus `tokens.legacy.css`.
2. **Breakpoints:** proposed 48rem and 80rem. Needs design sign-off.
3. **Attribute naming.** Namespaced `data-nz-theme` (recommended) versus a generic `data-theme` for zero-config next-themes interop.
4. **Whether to ship `reset.css`** at all, or recommend modern-normalize.
5. **Confirm the Figma `spring(a, b, c, d)` parameter order** with the designer.
6. **Dark-mode elevation and the focus-ring redesign** (accessibility).

---

## 9. Baseline status of modern CSS features (as of 2026-10-14)

**Source:** `web-features` npm package **v3.42.0**, published 2026-10-09 (the dataset behind Baseline, MDN and webstatus.dev; [npm](https://www.npmjs.com/package/web-features), [repo](https://github.com/web-platform-dx/web-features)). Each feature's `status.baseline`, `baseline_low_date`, `baseline_high_date` and `support` were read directly.
- "Widely (computed)" means low date + 30 months, the Baseline definition ([web-features baseline docs](https://github.com/web-platform-dx/web-features/blob/main/docs/baseline.md)).
- Current stable versions in that dataset: Chrome 155 (2026-10-06), Edge 154, Firefox 157 (2026-09-29), Safari 27 (2026-09-14).

### 9.1 Features the task asked about

| Feature | Baseline status | Newly since | Widely since (actual or computed) | Min. versions (Chrome / Edge / Firefox / Safari / iOS) | Nizivo usage |
|---|---|---|---|---|---|
| `@layer` (cascade layers) | **Widely** | 2022-03-14 | 2024-09-14 | 99 / 99 / 97 / 15.4 / 15.4 | **Core** |
| `light-dark()` | **Newly** | 2024-05-13 | 2026-11-13 (computed) | 123 / 123 / 120 / 17.5 / 17.5 | **Core** (sets the floor) |
| `color-mix()` | **Widely** | 2023-05-09 | 2025-11-09 | 111 / 111 / 113 / 16.2 / 16.2 | **Core** (state tints, alpha) |
| `oklch()` / `oklab()` | **Widely** | 2023-05-09 | 2025-11-09 | 111 / 111 / 113 / 15.4 / 15.4 | OK (primitives stay hex to match Figma exactly) |
| Relative color syntax | Newly | 2024-09-16 | 2027-03-16 (computed) | 125 / 125 / 128 / 18 / 18 | Avoid in core (above floor). Use `color-mix()`. |
| `:has()` | **Widely** | 2023-12-19 | 2026-06-19 | 105 / 105 / 121 / 15.4 / 15.4 | OK |
| Container size queries | **Widely** | 2023-02-14 | 2025-08-14 | 105 / 105 / 110 / 16 / 16 | **Core** (component responsiveness) |
| Container style queries | Newly | 2026-05-19 | 2028-11-19 (computed) | 111 / 111 / 151 / 18 / 18 | Progressive enhancement only |
| `@starting-style` | Newly | 2024-08-06 | 2027-02-06 (computed) | 117 / 117 / 129 / 17.5 / 17.5 | Use (enter animations; degrades to no animation) |
| `transition-behavior: allow-discrete` | Newly | 2024-08-06 | 2027-02-06 (computed) | 117 / 117 / 129 / 17.4 / 17.4 | Use. Note: *transitioning `display`* (web-features "display animation") is **not Baseline** (Chrome 117, Safari 18, no Firefox), and `overlay` is Chromium-only. |
| `popover` attribute | Newly | 2025-01-27 | 2027-07-27 (computed) | 116 / 116 / 125 / 17 / **18.3** | Behavior layer (top layer). The iOS 18.3 requirement is above our floor, so a fallback is needed. |
| Anchor positioning | **Not Baseline as a whole.** Core is Newly. | Core keys: 2026-01-13 | ~2028-07-13 (computed, core) | Core: 125 / 125 / 147 / 26 / 26. `position-visibility: anchor-valid/anchor-visible`: Safari 27 only. | Progressive enhancement. JS positioning in primitives. (web.dev: Firefox 147 made it "Baseline Newly available", [Jan 2026](https://web.dev/blog/web-platform-01-2026).) |
| `@property` (registered custom properties) | Newly | 2024-07-09 | 2027-01-09 (computed) | 85 / 85 / 128 / 16.4 / 16.4 | Selective (animatable vars only) |
| `linear()` easing | **Widely** | 2023-12-11 | 2026-06-11 | 113 / 113 / 112 / 17.2 / 17.2 | **Core** (springs) |
| `field-sizing` | Newly | 2026-06-16 | 2028-12-16 (computed) | 123 / 123 / 152 / 26.2 / 26.2 | Progressive enhancement (auto-grow textarea) |
| View transitions (same-document) | Newly | 2025-10-14 | 2028-04-14 (computed) | 111 / 111 / 144 / 18 / 18 | Opt-in progressive enhancement (tabs, segmented control) |
| `view-transition-class` | Newly | 2025-10-14 | 2028-04-14 (computed) | 125 / 125 / 144 / 18.2 / 18.2 | Opt-in |
| Active view transition (`:active-view-transition`) | Newly | 2026-01-13 | 2028-07-13 (computed) | 125 / 125 / 147 / 18.2 / 18.2 | Opt-in |
| Cross-document view transitions | **Not Baseline** | n/a | n/a | 126 / 126 / no / 18.2 / 18.2 | App concern, not library |
| Element-scoped view transitions | Not Baseline | n/a | n/a | 147 / 147 / no / no / no | No |
| `@scope` | Newly | 2026-03-24 | 2028-09-24 (computed) | 143 / 143 / 146 / 26.4 / 26.4 | Not in core (above floor). Revisit about 2028. |
| CSS nesting | **Widely** | 2023-12-11 | 2026-06-11 | 120 / 120 / 117 / 17.2 / 17.2 | Author with it. Lightning CSS keeps or flattens it per targets. |
| `prefers-reduced-motion` | **Widely** | 2020-01-15 | 2022-07-15 | 74 / 79 / 63 / 10.1 / 10.3 | **Core** |

### 9.2 Other features relevant to the Figma file

| Feature | Status | Newly | Widely | Versions (C / E / F / S / iOS) | Usage |
|---|---|---|---|---|---|
| `:focus-visible` | Widely | 2022-03-14 | 2024-09-14 | 86 / 86 / 85 / 15.4 / 15.4 | Core |
| `:where()` / `:is()` | Widely | 2021-01-21 | 2023-07-21 | 88 / 88 / 82 / 14 / 14 | Core |
| `:user-valid` / `:user-invalid` | Widely | 2023-11-02 | 2026-05-02 | 119 / 119 / 88 / 16.5 / 16.5 | Form validation styling |
| Media query range syntax | Widely | 2023-03-27 | 2025-09-27 | 104 / 104 / 102 / 16.4 / 16.4 | Core |
| `@custom-media` | **No browser support** | n/a | n/a | none | Build-time only (Lightning CSS `drafts.customMedia`) |
| `color-scheme` | Widely | 2022-02-03 | 2024-08-03 | 98 / 98 / 96 / 13 / 13 | Core |
| `forced-colors` | Widely | 2022-09-12 | 2025-03-12 | 89 / 79 / 89 / 16 / 16 | Core (high contrast) |
| `prefers-contrast` | Widely | 2022-05-31 | 2024-11-30 | 96 / 96 / 101 / 14.1 / 14.5 | Optional |
| `backdrop-filter` (glass) | Newly | 2024-09-16 | 2027-03-16 (computed) | 76 / 79 / 103 / 18 / 18 | Use inside `@supports`, with a solid fallback. Figma "Liquid Glass" has no CSS equivalent. |
| `prefers-reduced-transparency` | Not Baseline | n/a | n/a | 119 / 119 / no / no / no | Progressive enhancement (opaque glass fallback) |
| `subgrid` | Widely | 2023-09-15 | 2026-03-15 | 117 / 117 / 71 / 16 / 16 | OK (card/plan grids) |
| `text-wrap: balance` | Newly | 2024-05-13 | 2026-11-13 (computed) | 114 / 114 / 121 / 17.5 / 17.5 | OK (headings) |
| `text-wrap: pretty` | Not Baseline | n/a | n/a | 117 / 117 / no / 26 / 26 | Progressive enhancement |
| `sibling-index()` / `sibling-count()` | Newly | 2026-08-18 | 2029-02-18 (computed) | 138 / 138 / 154 / 26.2 / 26.2 | Progressive enhancement for `stagger/item`, with an inline `--i` fallback |
| `contrast-color()` | Newly | 2026-04-10 | 2028-10-10 (computed) | 147 / 147 / 146 / 26 / 26 | Progressive enhancement (user-supplied brand colors) |
| `progress()` | Newly | 2026-09-01 | 2029-03-01 (computed) | 138 / 138 / 155 / 26 / 26 | No (not needed) |
| `alpha()` relative colors | Newly | 2026-09-14 | 2029-03-14 (computed) | 151 / 151 / 155 / 27 / 27 | No |
| `:open` | Newly | 2026-05-11 | 2028-11-11 (computed) | 133 / 133 / 136 / 26.5 / 26.5 | No (use `data-open`) |
| Invoker commands (`commandfor`) | Newly | 2025-12-12 | 2028-06-12 (computed) | 135 / 135 / 144 / 26.2 / 26.2 | Behavior layer, later |
| Interest invokers | Not Baseline | n/a | n/a | 142 / 142 / no / no / no | No |
| Customizable `<select>` (`appearance: base-select`) | Not Baseline | n/a | n/a | 135 / 135 / no / 27 / 27 | Future swap-in for Select |
| `<dialog closedby>` | Not Baseline | n/a | n/a | 134 / 134 / 141 / no / no | No |
| `popover="hint"` | Not Baseline | n/a | n/a | 151 / 151 / 153 / no / no | No |
| Scroll-driven animations | Not Baseline | n/a | n/a | 115 / 115 / no / 26 / 26 | Lab-only progressive enhancement |
| `if()` | Not Baseline | n/a | n/a | 137 / 137 / no / no / no | No |
| `calc-size()` / `interpolate-size` | Not Baseline | n/a | n/a | 129 / 129 / no / no / no | No (accordion height via grid-rows trick) |
| `text-box` (trim) | Not Baseline | n/a | n/a | 133 / 133 / no / 18.2 / 18.2 | Progressive enhancement |
| `content-visibility` | Newly | 2025-09-15 | 2028-03-15 (computed) | 108 / 108 / 130 / 26 / 26 | Optional (long order lists) |
| `scrollbar-gutter` | Newly | 2024-12-11 | 2027-06-11 (computed) | 94 / 94 / 97 / 18.2 / 18.2 | Modal scroll-lock |
| `inert` | Widely | 2023-04-11 | 2025-10-11 | 102 / 102 / 112 / 15.5 / 15.5 | Behavior layer |
| `<dialog>` | Widely | 2022-03-14 | 2024-09-14 | 37 / 79 / 98 / 15.4 / 15.4 | Behavior layer (Modal) |
| Small/large/dynamic viewport units | Widely | 2022-12-05 | 2025-06-05 | 108 / 108 / 101 / 15.4 / 15.4 | Core |

Tooling to keep this honest: browserslist accepts `baseline widely available` and `baseline 2024`-style queries ([web.dev](https://web.dev/articles/use-baseline-with-browserslist)), and `@eslint/css` `use-baseline` flags non-Baseline CSS outside `@supports` ([@eslint/css](https://npmjs.com/package/@eslint/css)).

---

## 10. Sources

Primary sources fetched or queried on 2026-10-14.
- web-features v3.42.0 dataset: https://www.npmjs.com/package/web-features · https://github.com/web-platform-dx/web-features · https://github.com/web-platform-dx/web-features/blob/main/docs/baseline.md
- web.dev: https://web.dev/baseline/2026 · https://web.dev/blog/web-platform-01-2026 · https://web.dev/blog/web-platform-09-2026 · https://web.dev/articles/use-baseline-with-browserslist
- MDN `light-dark()`: https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
- Tailwind CSS: https://tailwindcss.com/docs/theme · https://tailwindcss.com/docs/preflight · https://tailwindcss.com/docs/adding-custom-styles · https://tailwindcss.com/docs/compatibility · https://github.com/tailwindlabs/tailwindcss/releases
- Next.js: https://nextjs.org/docs/app/getting-started/css · https://nextjs.org/docs/app/api-reference/config/next-config-js/cssChunking · https://nextjs.org/blog
- React `<style>`: https://react.dev/reference/react-dom/components/style
- Astro styling: https://docs.astro.build/en/guides/styling/
- React Router styling: https://reactrouter.com/explanation/styling
- TanStack Start CSS: https://tanstack.com/start/latest/docs/framework/react/guide/css-styling
- Lightning CSS: https://lightningcss.dev/transpilation.html
- Panda CSS: https://panda-css.com/docs/guides/component-library · https://panda-css.com/blog/panda-css-v2
- StyleX: https://stylexjs.com/docs/api/configuration/babel-plugin/ · https://stylexjs.com/docs/learn/installation/ · https://github.com/imsus/normal-ui/pull/10
- vanilla-extract: https://vanilla-extract.style/documentation/integrations/rollup/ · https://vanilla-extract.style/documentation/integrations/next/
- Pigment CSS: https://github.com/mui/pigment-css · https://mui.com/blog/2026-and-beyond/
- wyw-in-js / Linaria: https://wyw-in-js.dev/bundlers/nextjs
- styled-components: https://github.com/styled-components/styled-components/releases · https://x.com/mxstbr/status/1908201327811059926 · https://opencollective.com/styled-components/updates/thank-you
- Emotion RSC discussion: https://github.com/emotion-js/emotion/discussions/3119
- Mantine styles: https://mantine.dev/styles/mantine-styles
- Base UI styling: https://base-ui.com/react/handbook/styling
- React Spectrum S2 styling: https://react-spectrum.adobe.com/styling
- Motion (CSS springs): https://motion.dev/docs/ai-generate-css-springs-and-easings-llm · https://motion.dev/docs/studio-generate-css
- Josh Comeau, `linear()`: https://joshwcomeau.com/animation/linear-timing-function
- Figma easing help: https://help.figma.com/hc/en-us/articles/41414048690839-Adjust-an-animation-s-easing
- @eslint/css: https://npmjs.com/package/@eslint/css
- npm registry (versions and dates): `https://registry.npmjs.org/<package>` for every package listed in section 2.
