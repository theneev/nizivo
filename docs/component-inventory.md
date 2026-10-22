# Nizivo UI — Component Inventory

Status: Draft v0.1 · 2026-10-14
Scope: every component in the Figma file "Nizivo UI Library" (titled "Grove UI Library" until 2026-10-15), and every component its compositions imply, mapped to a Nizivo export, tier, RSC class and roadmap phase.

This is the bridge between Figma and the code backlog. It uses the package names, tiers, RSC labels, naming rules and phases of [ARCHITECTURE.md](ARCHITECTURE.md), whose [§9.5](ARCHITECTURE.md#95-per-component-tier-table-core) points here for the full mapping. The design-side backlog for the same components (every missing state, token request and hygiene task) is [figma-handoff.md](figma-handoff.md). The JSON block in [§6](#6-machine-readable-seed-designcomponent-mapjson) seeds `design/component-map.json`.

> **The import name changed.** We earlier said the import would be `import { Button } from "@nizivo/ui"`. The plan names the package `@nizivo/react`, so the import is `import { Button } from "@nizivo/react"` or, per component, `import { Button } from "@nizivo/react/button"` (ARCHITECTURE [§1](ARCHITECTURE.md#1-decisions-we-need-from-you), decision 2). Every table below uses the new name.

## Contents

1. [How to read this](#1-how-to-read-this)
2. [Summary](#2-summary)
3. [Inventory by area](#3-inventory-by-area)
4. [Components implied by compositions but not defined in Figma](#4-components-implied-by-compositions-but-not-defined-in-figma)
5. [Build order for v0.1](#5-build-order-for-v01)
6. [Machine-readable seed (`design/component-map.json`)](#6-machine-readable-seed-designcomponent-mapjson)
7. [Open points and differences from ARCHITECTURE.md](#7-open-points-and-differences-from-architecturemd)

---

## 1. How to read this

### 1.1 Columns

| Column | Meaning |
|---|---|
| Component | The public export in PascalCase. A domain composition shows as a `patterns/<name>` item. Figma's own name is quoted when it differs. |
| Figma set + node IDs | The on-canvas set, its ghost master, and any frames that carry the design. Flags are explained in §1.2. |
| Figma props → code props | Figma property key, with its `#id` suffix where the file has one, then the code prop. "→ CSS" means a pseudo-class or attribute, never a prop. "derived" means computed from data. "new:" lists props that have no Figma property. |
| Package / subpath | The import specifier. v0.1 subpaths are the fixed list in ARCHITECTURE [§5.2](ARCHITECTURE.md#52-exports-maps). Any other subpath is marked "(proposed)" until `nz gen` writes it into the exports map. `patterns/<name>` is a docs example in v0.2 that becomes a registry item in v0.3 (decision 5). |
| Tier | `T0`, `T1` or `T2`, exactly as in ARCHITECTURE §9.5. Combinations such as "T0 + T1 tooltip" mean one part is server-safe and one part is engine-backed. |
| Behavior | `native`, `engine` or `own` (the words for T0, T1 and T2), plus the primitive that does the work. |
| RSC | `server`, `client` or `split` (§1.3). |
| Missing design states | What Figma does not draw yet, named as in [figma-handoff.md §5.1](figma-handoff.md#51-how-to-name-variants-so-they-map-to-code): Hover, Pressed, Focus, Disabled, Read-only, Invalid, Pending, Loading, Empty, Error, Open, Selected, Current. Code builds these from tokens meanwhile and lists them on the docs "Deviations from Figma" page. |
| Phase | `v0.1`, `v0.2`, `v0.3`, `after 1.0`, `deferred`, `not in plan`, `out of scope` (ARCHITECTURE [§21](ARCHITECTURE.md#21-roadmap)). v0.1 rows carry their place on the ordered cut line: "cut 1" goes first, "never cut" never goes. Gates are named as in the plan, for example "gate O-06". |

Code props for components that ARCHITECTURE §10 does not sketch are **proposals**. Once code exists, the generated manifest `contracts/api/react/<name>.json` is the source of truth.

**Question references.** `Q a` to `Q j` are the design questions in ARCHITECTURE [§1](ARCHITECTURE.md#1-decisions-we-need-from-you), item 8. `Q1` to `Q36` are the questions in [figma-handoff.md §6](figma-handoff.md#6-questions-for-designers). The "Handoff ref" column of ARCHITECTURE §1 item 8 maps each lettered question to its handoff numbers.

### 1.2 Figma IDs and ghost flags

The file key is `BIzJFf1wm8KP0YG2AVI1tP`. To open a node, use `https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Nizivo-UI-Library?node-id=7275-11244` with the ID's `:` replaced by `-`. Ghost IDs sit on no page, so a link cannot land on them: select an instance that uses one and choose *Go to main component*. Variable collections and styles cited with a `Grove` prefix (`Grove Color`, `Grove/Label/M`) are named with `Nizivo` since 2026-10-14 (ARCHITECTURE §23.3, M10), and the maintainer renamed the file title to "Nizivo UI Library" (reported 2026-10-15, M16). Links use the `Nizivo-UI-Library` slug; the file key is unchanged, so old `Grove-UI-Library` links still open it.

**Why most rows have two IDs.** Most components exist twice. The set on the page (`7275:*`) is a copy. The master that the instances actually use (`744:*`, `745:*`, `755:*`, `772:*` and others) sits on no page: the Plugin API reports `parent: null, removed: false`. Edits to the visible set do not reach the 707 instances on page 08 or the 373 on page 10 ([figma-handoff.md §2.4](figma-handoff.md#24-ghost-and-duplicate-masters)). The component map therefore keys **both** IDs until design relinks the ghosts (critique [C25](research/00-critique.md), ARCHITECTURE [§20.2](ARCHITECTURE.md#202-component-map-instead-of-code-connect)). Relinking is not on the v0.1 critical path.

| Flag in the tables | Meaning | Evidence |
|---|---|---|
| ghost `X` — unverified identical | The instances use off-canvas master `X`. Nobody has diffed it against the on-canvas set, so "same API" is an assumption until a diff confirms it (critique G1). | figma-handoff §2.4 table A |
| ghost `X` — diffed identical | Property definitions, variant names, sizes, padding, radius and root fills and strokes were compared and match. | [figma/06](figma/06-navigation.md) §1; week 2: [figma/11](figma/11-w2-server-safe-components.md) §2 (every descendant compared) |
| ghost `X` — props identical | Only the property definitions were compared; children were not. | [figma/08](figma/08-overview-dashboard.md) §7.1 |
| ghost `X` — keys match | Property keys and variant counts match; children were not diffed. | [figma/10](figma/10-instagram-storefront.md) |
| ghost-only `X` | No master on any page. It cannot be edited or published until design promotes it (critique M-A). | figma-handoff §2.4 table B |
| ghost set not identified | Instances exist, but the reports did not resolve their master. | figma-handoff §2.4 table A |
| no ghost | The set has no off-canvas twin. | — |
| related `X` | Another Figma component this one opens or contains. | — |
| seen `X` | Variant IDs observed in compositions; they help find a ghost set. | — |
| key `abcd1234…` | The component key, where a report recorded it. | — |
| frames `X` | Not a component: doc panels, specimens, instances or composition frames that carry the design. | — |

### 1.3 Tier, behavior and RSC

| Tier | Behavior word | Meaning |
|---|---|---|
| T0 | native | Native HTML or server-rendered markup. 0 KB of client JS on a server-rendered page. |
| T1 | engine | React Aria (`react-aria-components` 1.22.1, `react-aria` 3.53.1) behind the per-component adapter. Only `src/_engines/**` imports it. |
| T2 | own | Our own code on platform APIs: Toast, file upload, table selection, motion hooks, the chart island. |

| RSC | Meaning |
|---|---|
| server | No directive and no state, effect or context hooks. Renders in a Server Component with zero client JS. |
| client | A `'use client'` leaf (`*.client.tsx`). Every client leaf still renders complete SSR HTML. |
| split | A server-safe shell plus a client leaf, for example IconButton (`tooltip={false}` runs no client code), Field (FieldScope) and RadioGroup (one client part). Week 3 fixture: a route still ships a leaf its server graph imports but does not render under Turbopack and `next dev`; production webpack drops it (ARCHITECTURE §9.5). |

**Deriving `component.json`'s `tier` field.** ARCHITECTURE §6 gives `component.json` a `tier` enum of `server | client | engine | own`. It folds two of these columns into one. Derive it from where the behaviour comes from (COMPONENT-JSON.md's rule), in this order: the component's own engine contract and adapter → `engine`; otherwise its own T2 machinery → `own`; otherwise, when a public export is itself client code (a native control in a `'use client'` leaf, or a part that is one) → `client`; otherwise `server`, which covers T0 and split components whose server-rendered root hands a secondary client leaf serialisable props. Examples: Select → `engine`; Toast and AreaChart → `own`; Input → `client`; Button → `server`. Week 3: IconButton (whose engine part is Tooltip's, behind a server shell), Field (a server shell around FieldScope), Alert (a server root with its dismiss leaf) and NativeSelect are `server`. RadioGroup is a server shell too, but its `Radio` export is a client part every group renders, so it is `client`; the "split" row above describes its shape, not its tier.

### 1.4 Names used in this file

The Figma page reports were written before the plan, so they use package names the plan does not publish (ARCHITECTURE §5.1). They map as follows. Apart from the import note at the top, this is the only place the old names appear.

| Name in the Figma reports | Where it lives in this plan |
|---|---|
| `@nizivo/ui` | `@nizivo/react`, one subpath per component (a few, such as `grid`, hold a small family; ARCHITECTURE §5.2) |
| `@nizivo/themes` | `@nizivo/tokens` (themes are `data-nz-theme` scopes) + `@nizivo/react/theme-script` |
| `@nizivo/motion` | token CSS and `@nizivo/react/motion` (`CountUp`, `usePointerFx`); the proposal is superseded (M41: `CountUp` ships at `@nizivo/react/motion` since week 12) |
| `@nizivo/dates` | `@nizivo/react/unstable/date-range-picker` |
| `@nizivo/dashboard` | core subpaths (KpiTile, TrendCard, RankedList, Metric) and `patterns/`; the proposal is superseded (M41: NumberValue, Metric, KpiTile, TrendCard and RankedList ship as `@nizivo/react` subpaths since week 12) |
| `@nizivo/commerce`, `@nizivo/social`, `@nizivo/templates` | `patterns/<name>`: docs example in v0.2, registry item in v0.3 |
| `@nizivo/social/brand-icons` | `@nizivo/icons/brands/<name>` |

Props follow ARCHITECTURE [§8.2](ARCHITECTURE.md#82-class-slot-and-naming-conventions): `render` for composition (never `asChild` or `as`), a constrained `level` on Heading, CardTitle and DialogTitle, `pending` (not `loading`), `invalid`, `tone`, booleans without an `is` prefix, and callbacks shaped `on<X>Change(value, details)`. State attributes come only from the vocabulary in [§8.3](ARCHITECTURE.md#83-the-state-vocabulary-one-list-engine-independent). Token names are `--nz-*` as in [§7.2](ARCHITECTURE.md#72-naming).

---

## 2. Summary

| Area | Rows | With an on-canvas set | Ghost-only master | Frames or styles only | v0.1 | v0.2 | v0.3 | Pattern (docs → registry) | Later or not planned |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Foundations | 9 | 0 | 3 | 6 | 8 | 0 | 0 | 0 | 1 |
| Actions & Forms | 13 | 10 | 2 | 1 | 11 | 1 | 1 | 0 | 0 |
| Data Viz | 10 | 8 | 2 | 0 | 2 | 6 | 2 | 0 | 0 |
| Dashboard Widgets | 6 | 4 | 2 | 0 | 2 | 3 | 0 | 1 | 0 |
| Commerce | 12 | 8 | 4 | 0 | 0 | 4 | 0 | 8 | 0 |
| Navigation | 8 | 4 | 4 | 0 | 2 | 4 | 1 | 1 | 0 |
| Feedback & Overlays | 7 | 6 | 1 | 0 | 4 | 3 | 0 | 0 | 0 |
| Layout / App shell | 5 | 2 | 2 | 1 | 1 | 4 | 0 | 0 | 0 |
| Storefront / Social | 6 | 5 | 1 | 0 | 0 | 0 | 0 | 6 | 0 |
| Lab | 12 | 0 | 0 | 12 | 1 | 3 | 1 | 0 | 7 |
| **Total (§3)** | **88** | **47** | **21** | **20** | **31** | **28** | **5** | **16** | **8** |
| Implied, §4.1 (parts excluded) | 40 | 0 | 0 | — | 6 | 12 | 9 | 11 | 2 |

"Rows" counts table rows; a row can hold a small family (for example `layout`). "Pattern" rows ship as docs examples in v0.2 and registry items in v0.3. §4.1 has 7 more rows that are parts of a §3 component (for example the Select listbox), so they are not counted twice.

**What stands out.**
- **The file's source of truth is split.** Every composition instance points at an off-canvas ghost: 707 on page 08 and 373 on page 10, and none use the on-canvas sets. Eleven pairs are diffed identical: Nav Item, Search Field, Tab and Segment, and since week 2 Badge, Delta, Progress Bar, Progress Ring, Alert, Empty State and Skeleton. The map keys both IDs, so engineering is not blocked ([figma-handoff.md §2.4](figma-handoff.md#24-ghost-and-duplicate-masters)).
- **The Card set is never used.** About 20 panels on page 08 are hand-drawn frames. Card is still the v0.1 surface, and the panels become Cards in code.
- **v0.1 is 37 components**, plus tokens, `ThemeScript` and the icon package: Text, Heading, Stack, Inline, Grid, GridItem, Container, Separator, Button, IconButton, Badge, Card, Delta, ProgressBar, ProgressRing, Meter, Skeleton, EmptyState, InlineError, Alert, Kbd, Image, Field, Fieldset, Input, Textarea, Checkbox, RadioGroup, Switch, SegmentedControl, Select, NativeSelect, Tooltip, Dialog, Menu, Tabs, TabNav. Field, Select, Dialog, Button and Tooltip are never cut.
- **Seven v0.1 components have no Figma component behind them:** Textarea, NativeSelect, InlineError, Meter and Kbd (§4.1), plus Field and Fieldset, whose anatomy exists only inside Input. Text, the layout family and Image come from styles and doc panels rather than component sets.
- **Not every Figma item becomes an export.** The logo, liquid glass, the hero, feature tile and profile card, Float and the hotspot editor have no place in the plan; the rows say why.

---

## 3. Inventory by area

### 3.1 Foundations

Page 01 Foundations `7275:11884` (section `7275:11885`). No component sets; the foundations are variables, styles and doc panels.

Evidence: [figma/01-foundations.md](figma/01-foundations.md), [figma/00-tokens-and-styles.md](figma/00-tokens-and-styles.md), ARCHITECTURE [§7](ARCHITECTURE.md#7-design-tokens-and-theming), [§8](ARCHITECTURE.md#8-styling-contract), [§14](ARCHITECTURE.md#14-charts-icons-media-fonts-and-opt-in-heavy-packages).

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **Design tokens (`tokens.css`, `tailwind.css`, `custom-media.css`, `tokens.json`, `contract.json`, JS refs)** | frames `7275:12007` `7275:12385` `7275:12479` `7275:12578` `7275:12608`; Doc panels Color, Typography, Space & Shape, Elevation, Grid; source is the `Nizivo *` collections and `Nizivo/*` styles (`Grove` before 2026-10-14); no component | `codeSyntax` `--grove-*` → `--nz-*` (rewritten in Figma on 2026-10-14; collections and styles renamed `Nizivo`) · Light/Dark → `light-dark()` once on `:root` · Desktop/Tablet/Mobile → `@media` at `--nz-sm` / `--nz-lg` · `Nizivo/Elevation/1`–`4` → `--nz-elevation-1`–`4`; `0 Flat` → `--nz-elevation-0` from the next export · week 2 ships `tokens.css`, `tailwind.css`, `custom-media.css` and `contract.json`; `tokens.json` and the JS refs are W3–4 | `@nizivo/tokens` | — | — (static CSS and JSON) | n/a | No breakpoints, z-index, scrim or dark elevation (code-owned meanwhile); `text/tertiary` and control borders fail AA (override file) | v0.1 |
| **Motion tokens and spring generator** | frames `7275:12649` `7275:12653` `7275:12689` `7275:12720`; Doc/Motion: durations, easings, principles; `Grove Motion` Default/Reduced | `duration/*`, `easing/*` → `--nz-duration-*`, `--nz-easing-*` · `spring(1, 260, 24, 0)` → `linear()` + `--nz-duration-spring` 493 ms (one generator) · Reduced → `prefers-reduced-motion` or `data-nz-motion="reduce"` | `@nizivo/tokens` (generator in `tooling/spring`) | — | — (CSS) | n/a | Duration chips clipped on canvas; a fade duration that survives Reduced; 160 ms hovers are off-token (the `spring()` order, Q h, was accepted on 2026-10-14) | v0.1 |
| **ThemeScript (+ `data-nz-theme` scopes)** | frames `7275:12304` `7275:11231`; explicit `Grove Color = Dark` mode on a subtree; logo on the green cover | Subtree variable mode → `data-nz-theme="light"` / `"dark"` / `"system"` on any element (no component) · persisted choice → `ThemeScript` (`nonce`) | `@nizivo/react/theme-script` | T0 | native: inline `<script>` before first paint; SHA-256 published per release. Week 3: shipped `data-nz-platform` (`ThemeScript`, `themeScript`); week 6 added the theme half: a stored `nz-theme` choice (`light`, `dark` or `system`) sets `data-nz-theme` on `<html>` before first paint (D-al) | server | No rendered dark page anywhere (dark ships as `preview`) | v0.1 |
| **Text, Heading** | frames `7275:12385`; 18 `Grove/*` text styles; no set | Text style `Grove/Label/M` … → `variant` (`label-m` …) · `text/*` colour → `tone` · Heading: constrained `level` (1–6) + `variant` + `tone` (Heading 5 and 6 look like H4) · no public hooks, because `--nz-text-*` is a token family (ARCHITECTURE §8.2) | `@nizivo/react/text` (Text), `@nizivo/react/heading` (Heading) | T0 | native: `<p>`, `<span>`, `<h1>`–`<h6>` | server | `tnum` is off in Numeric/* (description only); Display, H1 and KPI not bound to `type/*`; 12 px caption question (Q c) | v0.1 |
| **Icons (full Lucide set)** | ghost-only `738:*`; frames `7275:11886`; 74 masters `738:69`…`738:426`; the grid holds their instances | No properties → `size` (default 20), `strokeWidth` (default 1.92 on the 24 viewBox), `absoluteStrokeWidth`, `title`; directional icons get `data-mirror="rtl"` from `mirror.json` | `@nizivo/icons` (one module per icon, e.g. `Calendar`) | T0 | native: generated `<svg>` from `lucide-static` 1.56.0 + SVGO 4 | server | Restore the masters on an Icons page; 16 and 24 px not drawn; confirm the stroke scales with size. Week 4: built: 1,879 Lucide icons (`lucide-static` 1.56.0 through a lossless SVGO 4.1.0 pass), one module each at `@nizivo/icons/<name>` and in the root barrel; `size` defaults to `1em` (the slots size glyphs by `font-size`), the accessible name is `label` (not `title`), `absoluteStrokeWidth` uses `vector-effect`, 45 icons carry `data-mirror="rtl"`; the docs site has a searchable Icons page (ARCHITECTURE §14.2, §23.4 D-ad) | v0.1 · cut 5 |
| **Instagram brand glyph** | ghost-only `772:4302`; frames `7275:19797`; props never read (G2) | No properties → same props as every icon; usage rule in JSDoc ("only for Connect / Follow on Instagram links") | `@nizivo/icons/brands/instagram` | T0 | native: `<svg>` from `simple-icons` 16.35.0 (CC0) | server | Used as decoration in Sidebar and Post Badge, against its own rule. Week 4: built at `@nizivo/icons/brands/instagram` only (not in the root barrel), filled, no stroke props; the usage rule is in its JSDoc and the docs Icons page | v0.1 · cut 5 |
| **Logo (Brand/Logo)** | ghost-only `739:64`; key `227c72d8…`; frames `7275:11961` `7275:11231`; Grove demo lockup; no size variants | No properties → not a library component | Not shipped: docs-site asset only | — | — | n/a | A Nizivo mark and wordmark (Q14) | not in plan |
| **Focus ring and hit target (the a11y floor)** | frames `7275:12561`; `border/focus` 2 px + `Grove/Focus/Ring`; Button description "Min hit area 44px via padding on touch" | Effect style → `nz.base` outline (`--nz-border-width-focus` solid `--nz-border-focus`, offset 2 px); halo `--nz-focus-halo` is decoration only · `.nz-hit-target` (44 px on a coarse pointer) · opt-outs `data-focus-inset`, `data-hit-inset` | `@nizivo/react/css/base.css` (layer `nz.base`) | — | — (CSS) | n/a | Focus state is missing on most sets; the halo alone is 1.45:1 and not mode-aware | v0.1 |
| **Image** | frames `7275:12726`; Asset library: 6 renders, 8 product photos, 4 portraits; no set | Image fill → `src`; new: `alt`, `width`, `height` (all required), `ratio` (`1/1`, `4/5`, `3/2`, `16/9`; emitted as `data-ratio`), `priority`; framework images through `render={<NextImage/>}` | `@nizivo/react/image` | T0 | native: `<img>`, no inline `style` | server | Ratio and radius rules (renders r0, photos r16); image licences (Q28): no Figma raster ships without an `ASSETS.md` entry | v0.1 · cut 4 |

**Decisions and why**

- **No ThemeProvider or theme component.** A themed subtree is `data-nz-theme` on any element, and `ThemeScript` restores the saved choice before first paint. Why: Server Components cannot read context, and native `light-dark()` nests correctly (spike S1, ARCHITECTURE §7.4).
- **No `<Icon>` wrapper or icon registry in core.** Icons are `ReactNode` slots filled from `@nizivo/icons`. Why: a string registry needs client context, so it cannot feed server-safe parts (critique C15, C16), and a slot lets any icon set plug in (seam K8).
- **Stroke 1.92 on the 24 viewBox.** Why: it draws 1.6 px at 20 px and 1.28 px at 16 px, as Figma does; `strokeWidth={1.6}` would draw 1.33 px (critique S1).
- **The focus ring and hit target are CSS in `nz.base`, not components.** Why: they then survive any component re-skin (ARCHITECTURE §8.5), and the halo alone is 1.45:1, so the 2 px outline carries the indicator (critique S3).
- **The logo is not shipped.** Why: "Grove" is demo branding, and CI fails on the string `grove` in any shipped file (critique G21).
- **Image requires `width`, `height` and `alt`, and writes no inline style.** Why: no layout shift, and it renders under the strict CSP profile (ARCHITECTURE §14.3, §19.3).

### 3.2 Actions & Forms

Page 02 Actions & Forms `7275:11238` (section `7275:11239`): 10 sets plus 3 ghost-only components.

Evidence: [figma/02-actions-forms.md](figma/02-actions-forms.md), [figma-handoff.md §5.2](figma-handoff.md#52-what-engineering-needs-first-v01), ARCHITECTURE [§10](ARCHITECTURE.md#10-component-api-conventions-with-code), [§16](ARCHITECTURE.md#16-forms-data-tables-dates-i18n-and-rtl).

Also in this area, with no Figma component (see [§4.1](#41-ui-components)): Textarea; NativeSelect; InlineError; Form, SubmitButton, FormMessage; PasswordInput; Combobox; NumberField; QuantityStepper.

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **Button** | `7275:11244` (27 of 75 variants); ghost `744:263` — unverified identical; seen `744:70` `744:105` `744:175` `744:210` `744:77` `744:112` `744:217` | `Variant` → `variant` (`primary` / `secondary` / `tertiary` / `critical` / `accent`; code default `secondary`) · `Size` → `size` (`sm` / `md` / `lg`) · `State` → CSS (`:hover`, `:active`, `:focus-visible`, `:disabled`) · `Leading icon#744:28` → `leadingIcon` · `Trailing icon#744:56` → `trailingIcon` · `Label#744:0` → children · new: `pending`, `fullWidth`, `render` | `@nizivo/react/button` | T0 | native: `<button>`; links through `render` | server | Pending; Focus on every variant (outline, not halo); Sm/Lg for Tertiary, Critical, Accent; Accent Pressed and Focus | v0.1 · never cut |
| **IconButton** | `7275:11357`; ghost set not identified | `Variant` → `variant` (default `secondary`) · `State` → CSS · nested Icon swap → `icon` slot · new: `label` (required; becomes `aria-label` and the tooltip text), `tooltip` (default on; `false` stays server-safe), `size` · week 3 shipped: `pressed` (toggle, `aria-pressed`), `pending`, `shortcut` (renders `Kbd` in the tooltip), `tooltip={{ side, align, delay }}`; the button is named by its tooltip text, not described by it | `@nizivo/react/icon-button` | T0 + T1 tooltip | native `<button>` + engine Tooltip (RAC `TooltipTrigger`) | split | Pressed, Focus, Disabled, Selected (toggle); Sm 32 and Lg 48; a Critical variant; the icon as an INSTANCE_SWAP property | v0.1 |
| **Badge** | `7275:11374`; ghost `744:315` — diffed identical (week 2); seen `744:293` `744:296` `744:299` `744:302` `744:305` `744:308` | `Tone` → `tone` (`neutral` / `success` / `warning` / `critical` / `info` / `brand`) · `Dot#744:91` → `dot` · `Label#744:84` → children | `@nizivo/react/badge` | T0 | native: `<span>`; the dot is `aria-hidden` | server | Sizes; an icon slot; whether solid is an emphasis axis (Brand is the only solid tone); Info dot on `icon/info` | v0.1 |
| **Field, Fieldset** | related `7275:11397`; no set: the anatomy lives inside the Input set | `Label#745:0` → `label` · `Help text#745:14` → `description` · `Show help#745:21` → presence of `description` · `State=Error` → `error` (sets `data-invalid`) · `State=Disabled` → `disabled` · new: `required`, `readOnly`, `name`, `validateOn` (`submit` / `blur`), `messages`, `ids`, function child (zero-JS mode), `group` (week 3: the label has no `for`; SegmentedControl) | `@nizivo/react/field` (Field, `useFieldControl`) · `@nizivo/react/fieldset` (Fieldset; week 3, one subpath each, D-h) | T0 shell + `FieldScope` leaf | native `<label>` and ARIA wiring; `FieldScope` client leaf (1.0 KB min+gz measured in week 3, not ~0.5) owns context, native validation messages and the whole anatomy | split | Label, description and error anatomy on every control; an error icon (colour-only today, WCAG 1.4.1); required marker (Q30); group legend | v0.1 · never cut |
| **Input** | `7275:11397`; ghost `745:187` — unverified identical; seen `745:159` | `State` → CSS (`:hover`, `:focus-within`, `:placeholder-shown`) + `invalid` + `disabled` · `Value#745:7` (dead property) → `value` / `defaultValue` · `Leading icon#745:28` → `leadingIcon` · label and help → `Field` · new: `prefix`, `suffix`, `trailingIcon`, `type` (`text` / `email` / `search` / `password` / `number` / `tel` / `url`), `size` (`sm` / `md` / `lg`; week 3) | `@nizivo/react/input` | T0 | native `<input>` in a thin client leaf that reads `FieldScope` | client | Invalid at rest (without the halo); Read-only; sizes; prefix, suffix and trailing slots; connect `Value#745:7` | v0.1 |
| **Select** | `7275:11438`; ghost `745:222` — unverified identical; related `746:204`; seen `745:188`; the listbox popup is not drawn | `State` → `open` / `defaultOpen` / `onOpenChange` (`data-open`) + `disabled` · `Value#745:35` → `Select.Value` (`placeholder` when empty, `data-placeholder`) · `Leading icon#745:39` → `Select.Trigger` `leadingIcon` · new: `value` / `defaultValue` / `onValueChange(value, details)`, `name`, `required`, `invalid`, `size`; parts Root, Trigger, Value, Popup, Item, Group, GroupLabel, Separator | `@nizivo/react/select` | T1 | engine: RAC `Select` + `Popover` + `ListBox` | client | Hover; Focus distinct from Open; Invalid; Placeholder; the listbox popup with highlighted, selected and disabled options; Input's disabled border | v0.1 · never cut |
| **Checkbox** | `7275:11456`; ghost `745:284` — unverified identical | `Checked` → `checked` / `defaultChecked` (`true` / `false` / `'indeterminate'`), `onCheckedChange` · `State=Disabled` → `disabled` · `Label#745:43` → children | `@nizivo/react/checkbox` | T0 | native `<input type="checkbox">` (`:checked`, `:indeterminate`) in a client leaf; hit target on the wrapping `<label>` | client | Hover, Focus, Invalid; a description line; group anatomy; box border on `border/control` (1.57:1 today) | v0.1 |
| **RadioGroup, Radio** | `7275:11479`; ghost set not identified | `Selected` → checked through the group's `value` / `defaultValue` / `onValueChange` · `State=Disabled` → `disabled` · `Label#745:50` → children of `Radio` | `@nizivo/react/radio-group` | T0 | native `<fieldset>` + `<legend>` + radios (native arrow keys); week 3: the shell is a server-rendered Fieldset and one client part passes the group's name and value | client | Hover, Focus, Invalid; group anatomy; the Selected + Disabled dot is 1.15:1 (invisible) | v0.1 |
| **Switch** | `7275:11494`; ghost `745:286` — unverified identical | `On` → `checked` / `defaultChecked` / `onCheckedChange` · `State=Disabled` → `disabled` · `Label#745:55` → children · new: `pending` | `@nizivo/react/switch` | T0 | native `<input type="checkbox" role="switch">` in a client leaf | client | Hover, Focus, Invalid, Pending ("apply instantly"); off track on `border/control` instead of mode-blind primitives | v0.1 |
| **Menu** | `7275:11516` (Menu Item); ghost set `746:203` (identified in week 4 and diffed identical, figma/13 §2); related `746:204`; `746:204` is the ghost-only Dropdown Menu | Item `State` → `data-highlighted` (CSS) / `data-checked` (checkbox and radio items) / `tone="critical"` · `Label#746:0` → children · `Shortcut#746:5` → `shortcut` (renders `Kbd`) · link items: `Item` `href`, or `render={<Link/>}` (an `<a>` through the engine's link mode; account and row-action menus) · parts Root, Trigger, Popup, Item, Group, GroupLabel, Separator, CheckboxItem, RadioGroup, RadioItem, SubmenuTrigger | `@nizivo/react/menu` | T1 | engine: RAC `MenuTrigger` + `Popover` + `Menu` + `SubmenuTrigger` | client | Dropdown Menu as a real set; item State split (highlighted × checked × critical × disabled); Disabled; checkbox and radio items; submenu. Week 4: built without `SubmenuTrigger` (React Aria's is alpha, Figma draws no submenu and §12.5 stages O-02 at v0.2; the maintainer decides whether it returns to v0.1). `CheckboxItem` is standalone (no CheckboxGroup part); checkbox and radio items have their own slots (`menu-checkbox-item`, `menu-radio-item`); the check sits at the end and the shortcut stays visible (figma/13 §5) | v0.1 · cut 1 |
| **Tooltip** | ghost-only `746:262`; standalone COMPONENT | Compound, parts Root, Trigger, Popup (canonical; adopted 2026-10-14 as a builder default, ARCHITECTURE §23.4 D-d; the maintainer confirmed it on 2026-10-14: "works") · `Label#746:10` → `Tooltip.Popup` children · `Tooltip.Root`: `open` / `defaultOpen` / `onOpenChange`, `delay` (400 ms), `disabled` · `Tooltip.Trigger`: any focusable element through `render` (a server `Button` works) · `Tooltip.Popup`: `side` (logical: `top` / `bottom` / `start` / `end`; the resolved physical side is `data-side`), `align`, `sideOffset`, `container` · week 3, with IconButton's tooltip wiring: a `content` convenience prop, and shortcut text → `shortcut` (renders `Kbd`) (both shipped in week 3) | `@nizivo/react/tooltip` | T1 (hooks adapter from v0.2) | engine: RAC `TooltipTrigger` + `Tooltip` (14.3 KB), with `react-aria` `useFocusable` on the trigger; second adapter on `react-aria` `useTooltipTrigger` + `useTooltip` (7.2 KB) from v0.2 | client | Promote to a set on page 02; right, bottom and left placements; a shortcut boolean; a max-width wrap rule | v0.1 · never cut |
| **FileUpload** | `7275:11548` (Upload); ghost set not identified | `State`: Drag over → a new component-local attribute (not yet in `vocabulary.json`), Uploading → `data-pending` + `ProgressBar` · copy not exposed → `labels` · new: `accept`, `multiple`, `maxSize`, `disabled` | `@nizivo/react/file-upload` (proposed) | T2 | own: native `<input type="file">` + drop target on `react-aria` `useDrop` (inside `_engines/react-aria`, behind an engine contract) | client | Invalid (rejected file), Complete, Disabled, Focus; a file list with cancel, retry and remove; use Progress Bar; no 18 px jump | v0.2 |
| **DateRangePicker, RangeCalendar** | ghost-only `746:267` | No properties → `value` / `defaultValue` (`{ start, end }` ISO plain-date strings), `onValueChange`, `presets`, `timeZone` (required), `locale`, `minValue` / `maxValue` | `@nizivo/react/unstable/date-range-picker` | T1, calendar lazy | engine: RAC `DialogTrigger` + `Popover` + `RangeCalendar` (no `DateInput`); `@internationalized/date` 3.12.4 inside | split | A Day cell with today, outside month, unavailable, range start/end, in range, hover, focus, disabled; one or two months; Apply/Cancel or instant | v0.3 · unstable |

**Decisions and why**

- **Button defaults to `secondary`, not Figma's Primary.** Why: the designer's rule is "One primary per view. Secondary for everything else" (critique C26).
- **Figma `State` axes become CSS and ARIA, never props.** Why: hover, focus and press belong to the element; a prop would drift from the real state (figma-handoff §5.1).
- **Field is a server-safe shell, and every control is a thin client leaf.** Why: a control must read `FieldScope`, yet its SSR HTML stays complete and works before hydration (ARCHITECTURE §16.1, which overrides r3's "Input is server"). Week 3: NativeSelect is the exception, `server` as §9.5 says; inside a Field it is wired through the zero-JS function child.
- **Select is engine-backed, with NativeSelect beside it.** Why: Figma's Select is a popover trigger with icons and groups that a native `<select>` cannot style in every browser; NativeSelect covers zero-JS forms (r3 §9).
- **Tooltip is never cut.** Why: IconButton's guidance is "Always paired with a tooltip that names the action".
- **FileUpload is our own code on a native input.** Why: the input is the accessible path, and RAC `DropZone` + `FileTrigger` measured 35.5 KB (r3 §3.1).
- **DateRangePicker ships under `unstable/` in v0.3.** Why: Figma has no Day cell states, and the public value is an ISO string, so internals can change in a patch (ARCHITECTURE §16.3).

### 3.3 Data Viz

Page 03 Data Visualization `7275:13284` (section `7275:13285`): 8 sets plus 2 ghost-only charts.

Evidence: [figma/03-data-viz.md](figma/03-data-viz.md), [research/r6-heavy-modules.md](research/r6-heavy-modules.md) §2, ARCHITECTURE [§14](ARCHITECTURE.md#14-charts-icons-media-fonts-and-opt-in-heavy-packages).

Also in this area, with no Figma component (see [§4.1](#41-ui-components)): Meter; ChartFrame; Compact 7-day bar card, Goals list, ring grid.

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **Legend** | `7275:13291` (Chart Legend Item); ghost `747:286` — unverified identical; seen `747:243` `747:247` | `Mark` → `mark` (`line` / `dashed` / `dot`; `square` and `area` added for bars and heatmap) · `Label#747:0` → children · swatch colour → series colour (data, not a variant) | `@nizivo/charts` | T0 | native: `<ul>` / `<li>`, swatch `aria-hidden` | server | Square and Area marks; a toggle variant at least 24 px tall; one dash pattern (4,3 vs 5,4); Donut legend reuses it | v0.2 |
| **ChartTooltip** | `7275:13303` (0 instances); ghost `747:287` — unverified identical; seen `747:254` `747:260`; key `d09b8a68…`; Area and Bar hover use the ghost | `Series` → number of rows (derived from the series) | `@nizivo/charts` | T2 | own: drawn by the `ChartInteraction` island; card `aria-hidden`, values go to the chart's polite live region | client | Negative delta; 3 series; flipped placement; relink Area and Bar hover from `747:287` | v0.2 |
| **Sparkline** | `7275:13323`; ghost `747:288` — unverified identical; seen `747:273` `747:277` | `Trend` → derived from `data` (Down draws `--nz-chart-neutral`: "down is not bad") · reaches core only through `KpiTile chart={…}` | `@nizivo/charts` | T0 | native: server SVG (`d3-shape`), no island | server | A Flat state; document "Down uses `chart/neutral`" | v0.2 |
| **AreaChart** | `7275:13336`; ghost `747:351` — unverified identical; seen `747:289` `747:310` | `State` Hover → `ChartInteraction` island (crosshair, tooltip, roving index, live region) · new: `data`, `x`, `y`, `compare`, `title`, `summary`, `locale`, `format`, `xScale` / `yScale` (`ScaleLike`), `status`, `xDirection` | `@nizivo/charts` | T0 + T2 island | native server SVG (`d3-shape`, `d3-array`, domain niced first) + own `ChartInteraction` island (~0.6 KB) | split | Keyboard focus on a point; loading, empty, error (one shared chart status frame); a token for the 120 ms area delay; dark render | v0.2 |
| **BarChart** | `7275:13387`; ghost `747:424` — unverified identical | `State` Hover → island; the hovered bar keeps `--nz-chart-primary`, siblings dim by opacity (not `chart/secondary`) | `@nizivo/charts` | T0 + T2 island | native SVG `<rect>` bars + own `ChartInteraction` island | split | Focus; a niced y-domain (the top bar exceeds the 300 tick); tooltip must not cover the bar; negative, stacked, grouped | v0.2 |
| **DonutChart** | `7275:13455`; ghost `751:314` — unverified identical | `State` Hover → island; centre label swaps on hover; at most 3 categories + "Other" | `@nizivo/charts` | T0 + T2 island | native server SVG arcs + own `ChartInteraction` island (the item mode, built in week 12, M41: one tab stop, arrows over the slices in data order, Home/End, the ChartTooltip card) | split | Focus; one dim opacity (0.35 vs 0.45, Q22); surface-coloured gaps; empty and minimum-segment rules | v0.2 |
| **ProgressBar** | `7275:13526`; ghost `751:367` — diffed identical (week 2); seen `751:349` `751:355` `751:361` | `Tone` → `tone` (`brand` / `success` / `warning` / `critical` / `neutral`) · new: `value`, `max`, `label`, `showValue`, `valueText`, `indeterminate` · `render` composes the wrapper; the native `<progress>` takes none (ARCHITECTURE §8.2) | `@nizivo/react/progress-bar` | T0 | native: `<progress>` | server | Fills on `chart/warning` and `chart/critical` (they use `text/*` today; code ships interim proposals aliasing `icon/warning` and `chart/negative`); Success and Neutral (code paints them `icon/success` and `icon/secondary`, because `chart/neutral` is 1.36:1 on the track; ARCHITECTURE §23.4 D-i, figma-handoff §1.5); indeterminate; sizes | v0.1 |
| **ProgressRing** | `7275:13545`; ghost `751:388` — diffed identical (week 2); seen `751:368` `751:373` `751:378` `751:383` | `Value` 25/50/75/100 → numeric `value` (+ `max`) · new: `tone`, `size` (`sm` / `md` / `lg`: 48 / 72 / 96 px), the centre as `children` (default: the percentage), `meter` (a boolean that sets `role="meter"`; a `role` prop would trip `jsx-a11y` rules in every consumer's lint) | `@nizivo/react/progress-ring` | T0 | native: SVG with `role="progressbar"` (or `role="meter"`); its forced-colours rules live in `progress-ring.css` (ARCHITECTURE §8.5 exception) | server | A Tone axis; sizes; a centre slot; cap style | v0.1 · cut 3 |
| **Funnel (Figma "Funnel Chart")** | ghost-only `751:319`; key `6de76da4…`; frames `7275:13521` | No properties → `steps` (`{ id, label, value }`), `basis`, `rate`, `format` | `@nizivo/charts` | T0 | native: HTML/CSS bars in an `<ol>` | server | Promote to a set; hover; a minimum bar width | v0.3 |
| **Heatmap** | ghost-only `751:393`; key `ef6b2dd7…`; frames `7275:13571` | No properties → `data`, `rows`, `cols`, `steps` (5) | `@nizivo/charts` | T0 | native: `<table>` with cell values | server | Solid `chart/seq-1..5` tokens (the opacity ramp breaks in dark); hover and tooltip | v0.3 |

**Decisions and why**

- **ProgressBar, ProgressRing and Meter live in core, not in charts.** Why: they need no d3 and appear in Upload, Discount, Goals and the setup guide (critique C13).
- **Charts are server SVG with one ~0.6 KB island.** Why: our AreaChart measured 3.2 KB against 107.7 KB for Recharts, whose SSR emits no SVG (r6 §2).
- **Core reaches charts only through slots** (`KpiTile chart={<Sparkline/>}`). Why: either package works without the other (ARCHITECTURE §14.1, seam K8).
- **The map keys ChartTooltip's ghost `747:287`.** Why: the on-canvas set has 0 instances; Area and Bar hover use the ghost (figma/03 §5).
- **Funnel and Heatmap wait for v0.3.** Why: both are ghost-only, and Heatmap needs solid `chart/seq-1..5` colours because its opacity ramp fails in dark.

### 3.4 Dashboard Widgets

Page 04 Dashboard Widgets `7275:13737` (section `7275:13738`): 4 sets plus 2 ghost-only widgets.

Evidence: [figma/04-dashboard-widgets.md](figma/04-dashboard-widgets.md), ARCHITECTURE §10.5, §10.7 and [§16.5](ARCHITECTURE.md#165-loading-empty-and-error-contract).

Also in this area, with no Figma component (see [§4.1](#41-ui-components)): Metric, NumberValue; CountUp.

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **Card** | `7275:13757` (never used; ~20 raw panels on 08); no ghost | `Style` → `tone` (`surface` / `subtle` / `inverse`; `inverse` emits `data-nz-scheme="inverse"`) · `Title#752:4` → `Card.Title` (`level` 2–6) · `Show action#752:8` → presence of `Card.Action` · Slot → `Card.Body` · new: `padding` (`sm` / `md`, default `md`, always emitted as `data-padding`), `elevation` (`0` / `1`, default 0; `1` emits `data-elevation`), `render`; parts Root, Header, Title, Description, Action, Body, Footer · Subtle and Inverse draw no border, as in Figma (a transparent 1 px border keeps the box) | `@nizivo/react/card` | T0 | native: `<div>` + heading | server | Rename Style to Tone; the action as a slot (not a bare 20 px icon); rest elevation (Q j); hover and focus for clickable cards; `border/inverse` | v0.1 |
| **Delta** | `7275:13743`; ghost `752:269` — diffed identical (week 2); seen `752:255` `752:260` `752:265` | `Trend` → derived from the sign of `value` · `Value#752:0` → `value` (a number) + `format` / `locale` · new: `comparison` (visually hidden phrase, e.g. "vs last week") | `@nizivo/react/delta` | T0 | native: `<span>` + `.nz-visually-hidden` phrase | server | A plain appearance for tinted backgrounds (the pill is 1.00:1 on brand-subtle); digits in a Numeric style; size sm | v0.1 |
| **KpiTile** | `7275:13780`; ghost `752:380` — unverified identical | `Tone` → `tone` (`surface` / `brand` / `accent`, decoupled from the trend; Q j) · `Trend` → derived from `delta` · `Label#752:12` → `label` · `Value#752:17` → `value` + `format` / `locale` · nested Sparkline → `chart` slot · nested Delta → `delta` + `comparison` · new: `status`, `pending`, `empty`, `error`, `labels` | `@nizivo/react/kpi-tile` (proposed) | T0 | native: `role="group"` + `aria-labelledby` | server | Flat trend; Loading, Empty, Error; hover and focus when clickable; a comparison-text property; build it from Card | v0.2 |
| **TrendCard (Figma "Revenue Card")** | ghost-only `752:385`; frames `7275:13818`; no properties | No properties → `label`, `value`, `delta`, `actions` slot (period `Select` or `SegmentedControl`), `chart` slot (`<AreaChart/>`), `legend`, `status`; "Revenue card" becomes a docs example | `@nizivo/react/trend-card` (proposed) | T0 | native; islands arrive through slots | server | Promote to a set with properties; Loading, Empty, Error; a narrow layout | v0.2 |
| **RankedList** | ghost-only `752:444`; frames `7275:13824`; no properties | No properties → `items` (`{ id, label, value, href }`), `limit`, `format`, `action` (a link), `status`; bars → `Meter` relative to the leader | `@nizivo/react/ranked-list` (proposed) | T0 | native: `<ol>` + `<meter>` | server | Promote to a set; Loading, Empty; "View all" as a link; the leader bar overflows its track (332 > 330) | v0.2 |
| **InsightCard** | `7275:13829`; ghost `752:531` — unverified identical; CTA uses ghost Button `744:105` / `744:210` | `Tone` Brand/Accent/Inverse → Card `tone="inverse"` or the `--nz-card-bg` hook · `Title#752:22` → `Card.Title` · render → `Image` · CTA → `Button` in `Card.Footer` | `patterns/insight-card` (not a core export) | T0 | native: a Card composition | server | Description, dismiss, media aspect; dark Brand equals Accent (both green/950) | docs v0.2 → registry v0.3 |

**Decisions and why**

- **Card is the one surface.** Why: the widgets re-implement it with different padding, radius and shadow, and page 08 draws about 20 panels by hand (critique C35, M-B 3).
- **KpiTile's tint is decoupled from its trend.** Why: Figma ties Tinted to Up and Down, so a falling metric could never sit in a tinted row (figma/04 §4.3; Q j).
- **Every data widget takes `status`, `pending` and `empty` / `error` slots.** Why: the Suspense fallback is the same component, so streaming causes no layout shift (ARCHITECTURE §16.5).
- **"Revenue Card" becomes the generic TrendCard.** Why: a headline, a period control and a comparison chart fit any metric; Revenue is one docs example.
- **Week 12 (M41, 2026-10-20): built.** NumberValue (`./number-value`), Metric (`./metric`), KpiTile (`./kpi-tile`, `tone` `surface` / `brand` / `accent`, no shadow at rest, Card's surface), TrendCard (`./trend-card`), RankedList (`./ranked-list`, SVG bars rather than `<meter>`) and CountUp (`./motion`), all in `@nizivo/react`; charts go in through element slots only. The rows above keep the pre-build proposals; the as-built API is in `contracts/api/react/` and `packages/react/W12-RESULTS.md`.
- **InsightCard is a pattern, not an export.** Why: it is Card + Image + Button with one governance rule ("never more than one per screen"), and patterns churn most while the design is in progress (critique C12).

### 3.5 Commerce

Page 05 Commerce `7275:13983` (section `7275:13984`): 8 sets plus 2 ghost-only compositions.

Evidence: [figma/05-commerce.md](figma/05-commerce.md), [research/r8-extensibility-distribution.md](research/r8-extensibility-distribution.md), [research/r4-build-release.md](research/r4-build-release.md) §6.1, ARCHITECTURE [§1](ARCHITECTURE.md#1-decisions-we-need-from-you) decision 5.

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **ProductCard** | `7275:13989`; ghost set not identified; its Badges are ghosts `744:293` / `744:296` / `744:302` | `Status` Active/Draft/Sold out → two domain props, a publication state and `availability`; never `status` (reserved for data lifecycle) | `patterns/product-card` (Card, Image, Badge, NumberValue) | T0 | native: `<article>` + stretched heading link (`data-interactive`) | server | Low stock; hover and focus; image missing; skeleton; compare-at price; long-name truncation | docs v0.2 → registry v0.3 |
| **ChipGroup (Figma "Variant Option") + `variant-picker` pattern** | `7275:14018`; ghost `753:405` — unverified identical; frames `7275:19004`; filter chips on 08 mobile | `Type` Colour/Size → presence of a swatch slot (`leading`) · `State` → native `:checked` / `:disabled` with a constant border width · option → `value` | `@nizivo/react/chip-group` (proposed) + `patterns/variant-picker` | T0 | native radios (single) or checkboxes (multiple) inside labels, in a client leaf | client | Hover, Focus; out of stock keeps its colour with a strike-through; no size jump on select (90×40 → 92×42); swatch colour is data | v0.2 · pattern docs v0.2 → registry v0.3 |
| **Table parts + TableSelection (Figma "Product Row") + `product-table` pattern** | `7275:14040`; ghost `753:476` — unverified identical | `State` → CSS `:hover` / `data-selected` (never `aria-selected` in a `<table>`) · hand-drawn checkbox → `Checkbox` · "More" icon → `IconButton` + `Menu` | `@nizivo/react/table` (**server parts built in week 16**; the selection island not yet) + `patterns/product-table` | T0 + T2 island | native `<table>` + own form-based selection island (tri-state header) | split | Focus, Disabled; an indeterminate header checkbox; a bulk-action bar; a Status property; the real Checkbox | v0.2 · BulkActionBar v0.3 · pattern docs v0.2 → registry v0.3 |
| **`order-table` pattern (Figma "Order Row")** | `7275:14091`; ghost `753:644` — unverified identical; seen `753:606` | `State` Hover → CSS `:hover`; the row link is a stretched link in the Order # cell (`data-interactive`) · payment and fulfilment badges → `paymentStatus` / `fulfillmentStatus` mapped to Badge `tone` | `@nizivo/react/table` (**built in week 16**; the pattern is the Next fixture's Recent orders) + `patterns/order-table` | T0 | native `<table>` | server | Selected; Focus; an Avatar component; dates from `Intl` with an explicit `timeZone` | Table v0.2 · pattern docs v0.2 → registry v0.3 |
| **Table header (Figma "Table Header" + "Order Table Header")** | ghost-only `753:410` `753:599`; near-duplicates; props never read (G2) | Unknown (G2) → `Table` header parts + sort button (`data-sort` `ascending` / `descending`, `aria-sort`; `render={<Link/>}` for URL sort) | `@nizivo/react/table` | T0 | native `<thead>` / `<th>` | server | Merge the two into one Table Header; sort states; sticky header | v0.2 |
| **`discount-card` pattern** | `7275:14130`; ghost `754:615` — unverified identical | `Status` Active/Scheduled/Expired → a domain-named prop (never `status`) driving Badge `tone` · usage track → `Meter` · code chip → a copy button (client leaf) | `patterns/discount-card` | T0 + T2 leaf | native Card + `<meter>`; own copy leaf (clipboard + polite "Copied") | split | Disabled or draft; unlimited uses; copy feedback; start and end dates; Expired via disabled tokens, not 0.70 opacity | docs v0.2 → registry v0.3 |
| **ChoiceCard (Figma "Payment Method") + `payment-method` pattern** | `7275:14174`; ghost `754:644` — unverified identical | `State` → native `:checked` (constant border) · `Show default#754:2` → a "Default" `Badge` inside the option (composition, no prop) · fake radio → a real radio input | `@nizivo/react/choice-card` (proposed) + `patterns/payment-method` | T0 | native label-wrapped radio, in a client leaf | client | Hover, Focus, Disabled, Invalid (expired or declined); an "Add payment method" row; no size jump (73 → 74 px); a card-brand slot | v0.2 · pattern docs v0.2 → registry v0.3 |
| **`shipment-tracker` pattern** | `7275:14195`; ghost set not identified | `Step` Packed/Shipped/Delivered → data (`events`) mapped to steps; the current step gets `aria-current="step"` | `patterns/shipment-tracker` (no `Steps` primitive in the plan) | T0 | native `<ol>` | server | Ordered as the current step; exception states; a vertical mobile layout; a visible upcoming node (1.04:1) | docs v0.2 → registry v0.3 |
| **`plan-card` pattern** | `7275:14284`; ghost `754:892` — unverified identical | `Tier` Basic/Grow/Scale → content (title, price, features); Grow → `featured` | `patterns/plan-card` (Card, Badge, Button, NumberValue) | T0 | native `<article>` + feature `<ul>` | server | Current plan; billing-interval toggle; excluded features; dark behaviour of the featured `bg/inverse` card | docs v0.2 → registry v0.3 |
| **`customer-card` pattern** | ghost-only `754:530`; frames `7275:14124`; props partly read (G2) | `Name`, `Email` (TEXT) → content; stats → a `<dl>` | `patterns/customer-card` (Card, Avatar, Badge) | T0 | native `<article>` + `<dl>` | server | Contact actions; promote it or keep it as a recipe | docs v0.2 → registry v0.3 |
| **`order-summary` pattern** | ghost-only `754:897`; frames `7275:14350`; also nested in Drawer `756:1001`; props never read (G2) | Unknown (G2) → a line-item list + a totals `<dl>` with tabular numerals | `patterns/order-summary` | T0 | native list + `<dl>` | server | Discount, tax-inclusive, empty and cart-edit states; unit price | docs v0.2 → registry v0.3 |
| **`order-list` pattern (Figma "Order List Item")** | ghost-only `764:3483`; frames `7275:18791`; 8 instances | `Customer#764:1`, `Meta#764:2`, `Total#764:3` → order data; the Badge tone is not a property | `patterns/order-list`; `DataView` swaps it with the table | T0 | native list of links | server | Hover, pressed, selected; an Avatar component; meta text 4.31:1 | docs v0.2 → registry v0.3 · DataView v0.3 |

**Decisions and why**

- **No commerce npm package.** Why: each npm package needs its own interactive 2FA trusted-publisher setup, and registry items suit thin compositions that consumers own (critique C12; r4 §6.1).
- **Core takes the reusable primitives out of these sets:** Table parts and selection, ChipGroup, ChoiceCard, Meter, Badge tones. Why: page 05 redraws checkboxes, radios and meters by hand; real primitives fix contrast and hit targets once.
- **Domain states never use `status`.** Why: `status` is reserved for the data lifecycle (`ready` / `loading` / `empty` / `error`; ARCHITECTURE §16.5).
- **Selection never changes border width.** Why: that causes the 90×40 → 92×42 and 73 → 74 px jumps measured on page 05.
- **Registry items depend on decision 5.** If the answer is "no", these stay copyable docs examples.

### 3.6 Navigation

Page 06 Navigation `7275:14694` (section `7275:14695`): 5 sets (all page copies) plus 5 ghost-only components.

Evidence: [figma/06-navigation.md](figma/06-navigation.md), ARCHITECTURE [§9.5](ARCHITECTURE.md#95-per-component-tier-table-core), [§17](ARCHITECTURE.md#17-performance-budgets-measured).

Also in this area, with no Figma component (see [§4.1](#41-ui-components)): Kbd; Text link ("View all"); Hotkeys (`registerHotkey`); NavList, ListGroup; Account menu, notifications popover, row-actions menu.

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **NavItem** | `7275:14700` (page copy, 0 instances); ghost `755:658` — diffed identical; seen `755:619` `755:627` `755:635` `755:643` `755:648` `755:653` | `State` → CSS `:hover` / `current` (`aria-current="page"`) · `Collapsed` → read from Sidebar `data-collapsed` (not a prop) · `Label#755:0` → children · `Show count#755:7` + `Count#755:14` → `count` (absent = hidden) · `Icon#755:21` → `icon` slot · new: `render` (router link), `href` | `@nizivo/react/nav-item` (proposed) | T0 | native `<a aria-current="page">` through `render` | server | Focus, Pressed, Disabled; a count in the rail; a fixed 40 px height; a visible light hover (`bg/hover` = `bg/canvas`) | v0.2 |
| **SearchField** | `7275:14764` (0 instances); ghost `755:888` — diffed identical; seen `755:874` | `State` → CSS `:focus-within` · placeholder, value and shortcut are hard-coded → `placeholder`, `defaultValue`, `shortcut` (renders `Kbd`) · new: `name` | `@nizivo/react/search-field` (proposed) | T0 | native `<search>` + `<input type="search">` in a client leaf; zero-JS filtering with `<form method="get">` | client | Hover, Filled, Disabled, Loading, Clear, Invalid; height 40 (42 today); input or command trigger (Q24) | v0.2 |
| **Tabs, TabNav** | `7275:14781` (0 instances); ghost `755:961` — diffed identical; seen `755:958`; frames `7275:14791`; tab-list example frame | `State` → CSS `:hover` / `data-selected` (Tabs) or `aria-current="page"` (TabNav) · `Label#755:29` → children · parts: Tabs Root, List, Tab, Panel; TabNav Root, Link | `@nizivo/react/tabs` | T1 / T0 (links) | engine: RAC `Tabs` + `TabList` + `Tab` + `TabPanel` / native links for TabNav (0 KB) | client / server | A TabList component; Focus, Disabled; icon and count slots; no width jump when the label turns bold. Week 4: built as two subpaths, `@nizivo/react/tabs` (Tabs, engine) and `@nizivo/react/tab-nav` (TabNav, server, 0 KB), so no `component.json` schema change was needed (ARCHITECTURE §23.4 D-ac); automatic activation by default, `activationMode="manual"` available; only the selected panel renders (`keepMounted` keeps one); icon, count and disabled ship, no vertical orientation or sizes | v0.1 · cut 2 |
| **SegmentedControl** | `7275:14797` (Segment, 0 instances); ghost `755:982` — diffed identical; seen `755:978`; frames `7275:14802` `7275:18903`; track example frames | `State` → native `:checked` through the group's `value` / `defaultValue` / `onValueChange` · `Label#755:33` → children of each item · new: `size`, `disabled`, `fullWidth`, `name`, `required`, `invalid` (week 3; native radios, no engine; inside a Field, the Field takes `group`) | `@nizivo/react/segmented-control` | T0 | native radio group styled as segments, in a client leaf | client | A track component; Hover, Focus, Disabled; sizes; the dark thumb equals the track (1.00:1) | v0.1 · cut 4 |
| **`store-switcher` pattern** | ghost-only `755:663`; frames `7275:14727` `7275:14734` | `Store#755:28` → the store name (content) | `patterns/store-switcher` (Menu + Avatar); not a core component | T1 | engine through Menu (RAC `MenuTrigger`) | client | The open store list; hover, focus; a collapsed (rail) variant; a logo option; domain as a property | docs v0.2 → registry v0.3 |
| **CommandMenu** | ghost-only `755:889`; frames `7275:14776`; no properties | No properties → `open` / `onOpenChange`, groups and items as children, `shortcut` (`mod+k` through `registerHotkey`) | `@nizivo/react/unstable/command-menu` (proposed) + `@nizivo/react/hotkeys` | T1, lazy | engine: RAC `Autocomplete` + `SearchField` + `Menu` in a `Modal`; loads on first ⌘K (+4.7 KB) | client | Group headings; empty, loading, error; match highlighting; mobile full-screen; scrim | v0.3 · unstable |
| **Breadcrumb** | ghost-only `755:998`; frames `7275:14813` | `Level 1#755:36`, `Level 2#755:37` → `Breadcrumb.Item` (`render={<Link/>}`) · `Current#755:38` → the last item with `aria-current="page"` · any depth | `@nizivo/react/breadcrumb` (proposed) | T0 | native `<nav>` + `<ol>` | server | Hover and focus on links; overflow collapse; a compact mobile back-link | v0.2 |
| **Pagination** | ghost-only `755:1007`; frames `7275:14815`; no properties | No properties → `page`, `totalPages`, links through `render={<Link/>}` (URL-driven), summary text through `labels` | `@nizivo/react/pagination` (proposed) | T0 | native links in a `<nav>` | server | Disabled prev/next at the bounds; hover, focus; a compact variant; one selected style (Q23); 36 px buttons → 32 or 40 | v0.2 |

**Decisions and why**

- **The live masters are the off-canvas `755:*` sets; the on-canvas copies have 0 instances.** Why the map keys both: nothing breaks while design relinks (critique C25, ARCHITECTURE §20.2).
- **Tabs and SegmentedControl differ by meaning, not looks.** Why: the designer wrote "Underline tabs switch views; the segmented control switches ranges", so Tabs are WAI-ARIA tabs (or TabNav links) and segments are a radio group.
- **TabNav ships beside Tabs.** Why: URL-backed tabs are links (0 KB, server-safe), while RAC Tabs costs 31.9 KB (ARCHITECTURE §17.1, risk R11).
- **NavItem, Breadcrumb and Pagination take `render={<Link/>}`.** Why: a router provider would force `'use client'` onto server-safe parts (critique C16).
- **Week 12 (M41, a builder choice under "full speed"): Breadcrumb, Pagination and Avatar are built** in `@nizivo/react` (`./breadcrumb`, `./pagination`, `./avatar`, with AvatarGroup), server only. Breadcrumb items take `render`; Pagination takes `getHref` and `renderLink` (link mode only); nothing collapses in 0.2. The as-built API is in `contracts/api/react/` and `packages/react/W12-RESULTS.md`.
- **CommandMenu is lazy and `unstable/`.** Why: Figma gives it no properties or states, and `cmdk` is stale (critique G18).

### 3.7 Feedback & Overlays

Page 07 Feedback & Overlays `7275:15065` (section `7275:15066`): 6 sets plus the ghost-only Drawer.

Evidence: [figma/07-feedback-overlays.md](figma/07-feedback-overlays.md), ARCHITECTURE [§12](ARCHITECTURE.md#12-overlays-layering-and-focus), [§13](ARCHITECTURE.md#13-motion).

Also in this area, with no Figma component (see [§4.1](#41-ui-components)): Popover; LiveAnnouncer.

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **Toast (`toast()`, `Toaster`)** | `7275:15071`; ghost set not identified; seen `756:820`; the seen variant is Tone=Success, on page 09 | `Tone` → `tone` (`success` / `critical` / `neutral`; `info` per ARCHITECTURE §12.6; `warning` proposed) · message → `toast(message, options)` · action text → `action` (a real `Button`, tertiary, sm) · close icon → `IconButton` | `@nizivo/react/toast` (**built in week 14**: `toast()`, `Toaster`, `announce()`; ARCHITECTURE D-bp) | T2 | own: module store (`useSyncExternalStore`) + `react-aria` `useToastRegion` / `useToast` (inside `_engines/react-aria`, behind `ToastEngine`) + `<section popover="manual">` | client | Info and Warning tones; enter and exit; stacking; a promise (loading) toast; max width with wrapping; persistence rule (Q i) | v0.2 · gate O-06 |
| **Alert** | `7275:15091`; ghost `756:868` — diffed identical (week 2); seen `756:825` `756:836` `756:846` `756:857` | `Tone` → `tone` (`info` / `success` / `warning` / `critical`) · title, description → slots · close icon → a dismiss control (week 2: `AlertDismiss`, a client leaf in the `dismiss` slot; week 3: its `children` default to the inlined `close` glyph; week 8, M28: `AlertDismiss` keeps its export and its API and renders an IconButton, tertiary, `sm`, with no tooltip, ARCHITECTURE §9.5) · tone icon → `icon` slot, no default · new: `action` slot | `@nizivo/react/alert` (Alert, AlertDismiss) | T0 + dismiss leaf | native (static; no live role on page load) + a dismiss client leaf | split | Info icon on `icon/info`; wrapping text (it clips today); close as an Icon Button; an action slot; a non-dismissible version | v0.1 · cut 3 |
| **Banner** | `7275:15120`; ghost `756:913` — unverified identical | `Tone` Promo/Warning → `tone` (`brand` / `warning`; rename, Q25) · render → `media` slot · Button → `action` slot · close icon → a dismiss `IconButton` | `@nizivo/react/banner` (**built in week 14**: `Banner`, `BannerDismiss`; ARCHITECTURE D-bq) | T0 + dismiss leaf | native region + a dismiss client leaf (same shape as Alert) | split | A mobile or stacked layout; close as an Icon Button; wrapping text; a real media slot (Live Render raster today) | v0.2 |
| **Dialog (Figma "Modal")** | `7275:15139`; ghost set not identified | `Type` Default/Destructive → `role="dialog"` / `"alertdialog"` on `Dialog.Popup` · close icon → `Dialog.Close` (`IconButton`) · new: `size` (`sm` / `md` / `lg`; `md` = Figma's only Modal width, 480 px; `sm` 400 and `lg` 640 provisional), `backdrop`; parts Root, Trigger, Popup, Title (`level`), Description, Body, Footer, Close | `@nizivo/react/dialog` | T1 | engine: RAC `DialogTrigger` + `ModalOverlay` + `Modal` + `Dialog`; a real `.nz-dialog-backdrop` element (root modal only) | client | Scrim; close as an Icon Button; sizes; a scrolling body; a mobile layout; a pending confirm; the nested-modal rule (Q19) | v0.1 · never cut |
| **Drawer / Sheet** | ghost-only `756:1001`; frames `7275:15163` `7275:16096` `7275:16092`; instances on 07 and 08; scrim RECT `7275:16092` | `Title#756:0` → `Drawer.Title` · new: `side` (`start` / `end` / `top` / `bottom`), `size`, `modal` (non-modal pushes the layout at wide widths); same parts as Dialog | `@nizivo/react/drawer` (**built in week 13**: `side` `start` / `end` / `bottom`, plus a `Header` part; no `top`, `size` or `modal` yet, ARCHITECTURE D-bl) | T1 | engine: RAC `ModalOverlay` + `Modal` (RAC `Sheet` is new in 1.22 and treated as preview); the Dialog's adapter, re-exported | client | A set with side, size and modal axes; open and close motion; a scrim token (`bg/inverse` at 0.32 turns white in dark); non-modal push (Q32) | v0.2 |
| **EmptyState** | `7275:15168`; ghost `756:1149` — diffed identical (week 2); seen `756:1124` `756:1134` | `Context` Orders/Search → content (docs recipes, not a prop) · render → `media` slot · Button → `actions` slot · title → `title` (`level`) | `@nizivo/react/empty-state` | T0 | native | server | Sizes; a no-results variant; the container vanishes in dark (`bg/subtle` = `bg/surface`) | v0.1 |
| **Skeleton** | `7275:15181`; ghost `756:1169` — diffed identical (week 2); seen `756:1154` (Line), `756:1158` (KPI, the variant the page 09 specimen uses), `756:1162` (Row) | `Shape` Line/KPI/Row → `shape` (`line` / `block` / `circle`, default `line`; emitted as `data-shape`); the KPI and Row layouts become each component's `status="loading"` rendering | `@nizivo/react/skeleton` | T0 | native (CSS only; blocks `aria-hidden`) | server | An animation spec, pulse or shimmer (Q31); radius on the scale (6 today) | v0.1 |

**Decisions and why**

- **Toast is our own code in the top layer, gated by test O-06.** Why: a toast action must stay reachable while a modal is open; React Aria exempts `[data-react-aria-top-layer]` from `inert` (ARCHITECTURE §12.1).
- **Toasts with an action, and critical toasts, persist until dismissed.** Why: "gone in 5 s" fails WCAG 2.2.1 for Undo and Retry (Q i).
- **The backdrop is a real element.** Why: a future native `<dialog>` adapter renders the same element, so re-skins keep working (decision D8-backdrop).
- **Alert has no live role by default.** Why: an alert present on page load must not interrupt screen-reader users; injected alerts opt in.
- **Skeleton shapes become each component's loading state.** Why: a separate KPI or Row skeleton drifts from the real layout (critique G20).

### 3.8 Layout / App shell

Pages 01 (Grid doc), 06 (Sidebar, Top Bar) and 08 Overview Dashboard `7275:15335` (sections `7275:15336`, `7275:15756`, `7275:18740`).

Evidence: [figma/08-overview-dashboard.md](figma/08-overview-dashboard.md) §6–§8, [figma/06-navigation.md](figma/06-navigation.md), ARCHITECTURE §7.6 and decision D10 in [§23](ARCHITECTURE.md#23-decision-log).

Also in this area, with no Figma component (see [§4.1](#41-ui-components)): AppShell; PageHeader; Split; StickyBar; Avatar; Indicator dot / count on an icon; Table container, toolbar, footer; BulkActionBar; DataView; Setup guide checklist.

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **Stack, Inline, Grid, GridItem, Container, Separator** | frames `7275:12608`; Grid doc (12/8/4 columns, gutters, margins); `Grove Responsive` variables; no set | Responsive variables → `--nz-grid-columns` / `-gutter` / `-margin`, `--nz-layout-content-max`, `--nz-section-gap` · `GridItem` `span` (+ `spanSm`, `spanLg`; `data-span`, `data-span-sm`, `data-span-lg`) · `gap` takes token keys only (`data-gap`) · Grid has no public hooks, because `--nz-grid-*` is a token family | `@nizivo/react/stack`, `/inline`, `/grid` (Grid, GridItem), `/container`, `/separator` | T0 | native: CSS grid and flex; `<hr>` | server | Rail-to-expanded breakpoint (Q a; `lg` 80rem is provisional); the content-max formula; a divider style (1 px rectangles today) | v0.1 |
| **Sidebar** | `7275:14732` (page copy, 0 instances); ghost `755:869` — unverified identical; the live set was never fingerprinted | `Expanded` → `collapsed` (inverted; `data-collapsed`) · below `sm` (640 px) → not rendered; `MobileTabBar` takes over (designer rule `7275:18744`) | `@nizivo/react/sidebar` (proposed) | T0 | native `<nav aria-label>` | server | A collapse toggle; group labels; widths 248/76 vs tokens 264/72 (Q b); rail labels all say "Orders"; an off-canvas sidebar on tablet portrait is an open question (Q35) | v0.2 |
| **TopBar** | ghost-only `755:1031`; frames `7275:14821`; 13 direct instances | `Title#755:39` → `title` (the page `<h1>`) or a `Breadcrumb` · search, bell and avatar → slots | `@nizivo/react/top-bar` (proposed) | T0 | native `<header>` | server | A mobile layout with a menu button; a breadcrumb-left option; centred search; a real Avatar and Icon Button; the unread dot is colour-only | v0.2 |
| **MobileTopBar** | ghost-only `764:3397`; frames `7275:18746` `7275:18888` `7275:18980` | `Title#764:0` → `title` · store mark → `leading` slot (square `Avatar`) · search, bell → `actions` (`IconButton`s) | `@nizivo/react/top-bar` (proposed) | T0 | native `<header>` | server | Promote to a set; back-button and account variants; an unread dot; search and bell as Icon Buttons (bare 20 px icons today) | v0.2 |
| **MobileTabBar** | `7275:18747` (0 instances); ghost `764:3482` — props identical; seen `7275:18748` `7275:18769` `764:3408` `764:3445`; seen = canonical variants `7275:18748`, `7275:18769` and ghost variants `764:3408`, `764:3445` | `Active` Home/Orders → `aria-current="page"` on the current item (an open set, from the route) · items → `MobileTabBar.Item` (`render={<Link/>}`, `icon`, label) · "More" → a `Drawer side="bottom"` rendered by AppShell (its contents: Q35) | `@nizivo/react/mobile-tab-bar` (proposed) | T0 | native `<nav>` + links (not a `tablist`) | server | All 5 Current values; a badge; pressed and focus; the "More" sheet; a long-label rule; safe-area padding as a token | v0.2 |

**Decisions and why**

- **Only 640 px is a stable breakpoint; `lg` (80rem) is provisional.** Why: "Below 640px the sidebar becomes a five-tab bar" is the only threshold a designer wrote (critique C11).
- **Below 640 px the MobileTabBar replaces the Sidebar.** Why: the designer wrote "Below 640px the sidebar becomes a five-tab bar" (`7275:18744`), and page 08 draws no off-canvas sidebar; the remaining destinations go in the "More" sheet (Q35).
- **Sidebar and the shell are core, not registry items.** Why: the "More" sheet's focus trapping and the rail tooltips carry accessibility fixes that consumer copies would freeze (the exception in critique C12).
- **MobileTabBar is links with `aria-current`, not a tablist.** Why: its items are page destinations.
- **Shell work needs design answers at the start of v0.2:** the `lg` threshold, the sidebar widths and the "More" sheet contents (Q a and Q b; handoff Q3, Q4, Q35).

### 3.9 Storefront / Social

Page 10 Instagram Storefront `7275:19790` (section `7275:19791`): 5 sets plus 2 ghost-only items and 15 screens.

Evidence: [figma/10-instagram-storefront.md](figma/10-instagram-storefront.md), ARCHITECTURE §14.3.

Also in this area, with no Figma component (see [§4.1](#41-ui-components)): PageIndicator; Image hotspot stage; Post viewer; Profile header, collections rail, post grid; Checkout pieces (collapsible summary, express pay, delivery form, shipping radios, promo row); Media gallery with an upload tile; Accordion; Carousel, rating stars, copy button, on-media floating buttons, Stagger/Reveal, Parallax/Spotlight; Hotspot editor (tag a post).

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **`collection-circle` pattern** | `7275:19802`; ghost `772:4320` — keys match | `State` New/Seen → `seen` · `Label#772:0` → children | `patterns/collection-circle` | T0 | native link | server | Focus, hover, pressed, skeleton; a size variant; no size jump (82 vs 80 px); the seen ring (1.18:1) is the only signal | docs v0.2 → registry v0.3 |
| **`shoppable-post` pattern** | `7275:19815`; ghost `772:4373` — keys match | `Type` Photo/Carousel → derived from the media count · `State` Hover → CSS `:hover` / `:focus-within` · count and CTA copy → `tagCount` + plural `labels` | `patterns/shoppable-post` | T0 | native: one link per tile | server | Focus and touch parity for the hover-only Shop CTA; video; pressed; skeleton; on-media tokens (dark 1.12–3.43:1) | docs v0.2 → registry v0.3 |
| **`product-tag` pattern (hotspots)** | `7275:19846`; ghost `772:4390` — keys match | `State` Dot/Open → `open` / `defaultOpen` / `onOpenChange` · `Name#772:3`, `Price#772:6` → product data · position → 0–1 coordinates | `patterns/product-tag` (markers + core `Popover`) | T1 | engine through Popover (RAC `DialogTrigger` + `Popover`) | client | A 44 px hit area (the dot is 24); flip and collision placement; hover, focus, sold out; a reduced-motion pulse | docs v0.2 → registry v0.3 |
| **`tagged-product` pattern** | `7275:19862`; ghost `772:4414` — keys match | `State` Default/Added → a toggle `IconButton` with `aria-pressed` · `Name#772:9`, `Price#772:12`, `Variant#772:15` → product data | `patterns/tagged-product` | T0 | native `<button aria-pressed>` in a client leaf | split | A 44 px action (40 today); pending, sold out, disabled, skeleton; "Added" announced in text | docs v0.2 → registry v0.3 |
| **`storefront-bar` pattern** | `7275:19889`; ghost `772:4457` — keys match | `Platform` Desktop/Mobile → a container query (not a prop) · handle, placeholder, count → content and slots (`SearchField`, `IconButton` with a count) | `patterns/storefront-bar` (TopBar, SearchField, IconButton, Badge) | T0 | native `<header>` | server | Scrolled, search-open, count 0 and 99+; mobile search as an Icon Button | docs v0.2 → registry v0.3 |
| **Post Badge (docs example)** | ghost-only `772:4419`; frames `7275:19884` | `Label#772:18` → a count + plural label; no new component: `Badge tone="brand"` with a leading glyph | docs example on `Badge` | T0 | native `<span>` | server | The decorative Instagram glyph breaks the glyph's own rule; count + plural | docs v0.2 |

**Decisions and why**

- **Everything here is a pattern.** Why: these are domain compositions over core parts, and none can ship before the core it composes.
- **The map keys the `772:*` ghosts.** Why: 0 of 373 instances on page 10 use the on-canvas sets.
- **Components never fetch from or script Meta.** Why: Instagram media goes through an app-side proxy (ARCHITECTURE §14.3).
- **Design must add on-media tokens first.** Why: raw dark fills under mode-switching text drop to 1.08–3.43:1 in dark mode.

### 3.10 Lab

Page 09 3D, Shader & Motion Lab `7275:19608` (section `7275:19609`). No component sets; specimens and shader frames only.

Evidence: [figma/09-lab.md](figma/09-lab.md), [research/r6-heavy-modules.md](research/r6-heavy-modules.md) §4, ARCHITECTURE §13.3 and [§14](ARCHITECTURE.md#14-charts-icons-media-fonts-and-opt-in-heavy-packages).

Also in this area, with no Figma component (see [§4.1](#41-ui-components)): `usePointerFx` (Tilt, Magnetic).

| Component | Figma set + node IDs | Figma props → code props | Package / subpath | Tier | Behavior | RSC | Missing design states | Phase |
|---|---|---|---|---|---|---|---|---|
| **RaysBackdrop (shader)** | frames `7275:19610` `7279:81` `7279:1476`; SHADER fill; `7279:81` is a childless duplicate; `7279:1476` is the storefront hero | Shader uniforms (ground, ray1–3, speed, angle, intensity, width, grain) → props with token defaults; the GLSL source cannot be read | `@nizivo/lab` (independent 0.x) | T2 | own: WebGL2 `ShaderSurface` + server poster; static under reduced motion | split | Dark values; off-palette `#f5a63f`; the shader source | after 1.0, on request |
| **MeshGradientBackdrop (shader)** | frames `7275:19633` | Shader uniforms (color1–4, softness, speed, grain) → props with token defaults | `@nizivo/lab` | T2 | own: WebGL2 + server poster | split | Dark values; colours bound to tokens; the shader source | after 1.0, on request |
| **Surface `material="glass"`** | frames `7275:19634`; `Grove/Surface/Glass` effect style | Effect style → `material="glass"` (`backdrop-filter`; opaque under `@supports not`, forced colours, reduced transparency) | `@nizivo/react/surface` (proposed) | T0 | native CSS | server | Glass tokens (fill, border, blur) and dark values; text over dark backdrops is 2.47:1 | v0.3 |
| **Liquid glass** | effect style `Grove/Surface/Liquid Glass`; 0 consumers in the file | Effect style → none | Not shipped | — | — | n/a | — | deferred |
| **Hero section** | frames `7275:19610`; Rays hero: copy, actions, paper-fade scrim, floating renders | Frame → a composition (title, description, actions, `backdrop` slot) | Not in plan; candidate registry item | T0 | native; the backdrop is a lab island | server | Scrim token (text drops to 1.78:1 over the rays); radius 32 off-scale | not in plan |
| **Feature tile (3D render tile)** | frames `7275:19654` | Tone brand-subtle / accent-subtle / inverse → Card hook; render → `Image`; arrow pill → stretched link (`data-interactive`) | Not in plan; candidate registry item (Card + Image) | T0 | native link | server | Hover, focus, pressed; the 40 px arrow pill; render licences | not in plan |
| **Profile card (glass content)** | frames `7275:19634` | Portrait, name, role, stat chips → content | Not in plan; candidate registry item (Surface glass + Image) | T0 | native | server | Chip radius and padding on the scale; contrast over dark backdrops | not in plan |
| **Float (ambient loop)** | frames `7275:19622`; keyframes on the hero renders | Keyframes → none until `duration/ambient` and `easing/ambient` tokens exist | Not in plan | — | — | n/a | −10 px and 14 px vs `distance/float` 8; ambient tokens | deferred |
| **Toast enter/exit specimen** | seen `756:820`; frames `7275:19709` | Keyframes → Toast CSS: enter `--nz-duration-base` + `--nz-easing-enter` + `--nz-distance-reveal`; exit `--nz-duration-fade` + `--nz-easing-exit` | Toast CSS (`@nizivo/react/toast`, proposed) | — | — (CSS) | n/a | Enter travel 16 vs `distance/reveal` 12; the 2.68 s hold vs 5 s | v0.2 |
| **Chart draw specimen** | frames `7275:19717` | Path trim → `clip-path` keyframes `nz-chart-reveal` on `--nz-duration-chart-draw` (0 ms when reduced) | `@nizivo/charts` CSS | — | — (CSS) | n/a | Matches its tokens; nothing missing | v0.2 |
| **Card lift + press specimen** | seen `752:380`; frames `7275:19732`; drawn on a KPI Tile instance | Keyframes → interactive Card CSS (`data-interactive`): `--nz-distance-lift`, `--nz-scale-hover`, `--nz-scale-press` | Card CSS (`@nizivo/react/css/card.css`) | — | — (CSS) | n/a | Elevation change on lift; a press specimen; shown on a non-interactive tile | v0.2 |
| **Skeleton pulse specimen** | seen `756:1158` (Skeleton KPI, in ghost set `756:1169`); frames `7275:19743` | Keyframes → Skeleton CSS loop on code-owned `--nz-duration-pulse` (2000 ms per cycle); the loop stops (0 ms, not shortened) when reduced | Skeleton CSS (`@nizivo/react/css/skeleton.css`) | — | — (CSS) | n/a | 1000 ms half-cycle vs the claimed `duration/slower` 480; easing not a token | v0.1 |

**Decisions and why**

- **`@nizivo/lab` starts only after 1.0, and only when a consumer asks.** Why: the "3D" items are raster images, and the shader sources cannot be read from the file.
- **CSS glass is core (v0.3); liquid glass is not shipped.** Why: `backdrop-filter` has a clean opaque fallback, while SVG-displacement glass works only in Chromium (r6).
- **Motion specimens become component CSS on tokens.** Where a specimen disagrees with its token (toast travel 16 vs 12 px), the token wins and design is asked (figma-handoff §5.3). The Skeleton pulse is the exception: it uses code-owned `--nz-duration-pulse` (0 ms when reduced) until design adds `duration/pulse`, because binding it to `duration/slower` would pulse at about 3 Hz in Reduced (160 ms).

---

## 4. Components implied by compositions but not defined in Figma

These have no Figma component. Some are hand-built frames inside compositions (critique [§3.3](research/00-critique.md) M-B), some are implied by the UI but absent (M-C), and some are required by the plan. Seven rows (the Select listbox, Calendar Day cell, Tab list container, segmented control track, scrim, bottom sheet and section panel) are parts of a §3 component; they are listed so the gap is visible and are not counted twice. Node IDs are given where a report recorded them; rows with IDs also appear in the §6 seed.

### 4.1 UI components

| Component | Area | Evidence (Figma, critique) | Package / subpath | Tier · behavior | RSC | Phase | Why this home |
|---|---|---|---|---|---|---|---|
| **Textarea** | Actions & Forms | Implied on 02 (critique M-C); no set | `@nizivo/react/textarea` | T0 · native `<textarea>` + `field-sizing: content`, in a client leaf | client | v0.1 | Same Field wiring as Input; auto-grow with no JS, falling back to `rows` (ARCHITECTURE §16.1). Week 3: `field-sizing` sits behind `@supports` (Chrome 123 grows; Firefox 129 and Safari 17.5 keep `rows`); no character count yet |
| **NativeSelect** | Actions & Forms | Shares the Select trigger skin `7275:11438`; no set of its own | `@nizivo/react/native-select` | T0 · native `<select>`, plain-text options | server | v0.1 · cut 4 | Server-Component forms get a real select with zero JS; collapses into Select once customizable `<select>` is Baseline (§9.4) |
| **InlineError** | Actions & Forms | Input `State=Error` recolours the help text only (`7275:11397`); KpiTile needs an error line | `@nizivo/react/inline-error` | T0 · native text + error glyph | server | v0.1 | One error look (icon + text, never colour alone, WCAG 1.4.1) for Field and data widgets; takes an `action` slot (§16.5). Week 2: `icon` is required until the error-mark glyph (`circle-x`) is inlined with the Feather MIT notice (ARCHITECTURE §14.2). Week 3: inlined; `icon` is optional and defaults to it |
| **Select listbox and options** | Actions & Forms | Implied by Select; never drawn (M-B 11) | parts `Select.Popup`, `Select.Item`, `Select.Group` | T1 · engine RAC `ListBox` in `Popover` | client | v0.1 · never cut | Part of Select; option states use `data-highlighted`, `data-selected`, `data-disabled` |
| **Form, SubmitButton, FormMessage** | Actions & Forms | No Figma source | `@nizivo/react/form` (proposed) | T2 · own client leaves (`useFormStatus` → `pending`) | client | v0.2 | Errors by name, focus the first invalid control, optional summary; form libraries stay docs recipes (§16.1) |
| **PasswordInput** | Actions & Forms | Password toggle implied on 02 (M-C) | `@nizivo/react/password-input` (proposed) | T2 · own leaf (~0.4 KB), `aria-pressed` toggle | client | v0.2 | Reverts to `type="password"` on submit; constant label (§16.1) |
| **Combobox** | Actions & Forms | Search suggestions on 06 and 08 (M-C) | `@nizivo/react/combobox` (proposed) | T1 · engine RAC `ComboBox` (+9.8 KB) | client | v0.3 | Never hand-built; `<datalist>` cannot be styled (§16.1) |
| **NumberField** | Actions & Forms | Currency and percent entry implied by commerce forms | `@nizivo/react/number-field` (proposed) | T1 · engine RAC `NumberField` (+9.8 KB) | client | v0.3 | Native `type="number"` mishandles locale separators (§16.1) |
| **QuantityStepper** | Actions & Forms | Product page on 10 (M-B 35) | `@nizivo/react/quantity-stepper` (proposed) | T0 · native `type="number"` + own two-button leaf | client | v0.3 | Integers only; buttons `tabIndex={-1}`; arrows come from the native spinbutton (§16.1) |
| **Calendar Day cell** | Actions & Forms | Date Range Picker `746:267` draws plain frames (M-B 12) | part of `@nizivo/react/unstable/date-range-picker` | T1 · engine RAC calendar grid | client | v0.3 · unstable | Cell states map to `data-today`, `data-outside-month`, `data-unavailable`, `data-range-start`, `data-range-end`, `data-in-range` (§8.3) |
| **Meter** | Data Viz | Progress Bar `7275:13526` is used for "Plan storage" and "Low stock"; Discount usage track `7275:14130`; Ranked List bars | `@nizivo/react/meter` | T0 · native `<meter>` | server | v0.1 | Quotas and stock levels are measurements, not progress, so they get `<meter>` semantics (figma/03) |
| **ChartFrame** | Data Viz | Axis, grid, data table and chart status states are not drawn (M-B 41) | `@nizivo/charts` | T0 · native `<figure>` + caption + data table | server | v0.2 | Gives any renderer (ours, Recharts, ECharts) the same title, table, legend and status (seam K9) |
| **Compact 7-day bar card, Goals list, ring grid** | Data Viz | Hand-built "Sales" `7275:18915` on 08 mobile; Goals on the overview (M-B 21) | docs examples: TrendCard + BarChart; Card + ProgressBar / ProgressRing | T0 · native | server | docs v0.2 | Compositions of existing exports; no new API |
| **Metric, NumberValue** | Dashboard Widgets | Label/value/delta block `7275:13783` (KPI Tile) and `I7275:13818;752:387` (Revenue Card) | `@nizivo/react/metric` (proposed) | T0 · native `<data>`; `Intl` formatting once on the server | server | v0.2 | The same block is drawn twice with different gaps (16/8 vs 8/12); one export ends the drift |
| **CountUp** | Dashboard Widgets | `Grove/Numeric/*` style descriptions; `duration/count-up` 900 ms; no specimen (04, 09) | `@nizivo/react/motion` | T2 · own rAF hook; the server renders the final value | client | v0.2 | 0.50 KB measured (r6); a subpath, not a `motion` package (§13.4) |
| **Kbd** | Navigation | Detached frames `7275:14768`, `7275:14773`, `755:895`, `755:927`, `755:936`, `755:940`, `755:944`, `I755:1033;755:879` (M-B 6) | `@nizivo/react/kbd` | T0 · native `<kbd>`; `data-platform` per glyph, `data-nz-platform` from ThemeScript | server | v0.1 · cut 4 | Menu shortcuts, Tooltip, SearchField and CommandMenu all need it; ⌘K is Mac-only text today. Week 2: the frames are under `related` in `kbd/component.json`, which cannot store the instance-path id `I755:1033;755:879`; `data-platform` values come from `variants.platform`; the Apple spelling shows only once `ThemeScript` sets `data-nz-platform="apple"` (shipped in week 3); `keys` accepts `plus` and a bare `+` (`mod++`) |
| **Tab list container** | Navigation | Example frame `7275:14791` only (M-B 9) | part `Tabs.List` | T1 · engine RAC `TabList` | client | v0.1 · cut 2 | Part of Tabs; its frame id is already on the Tabs row |
| **Segmented control track** | Navigation | Example frames `7275:14802`, `7275:18903` (M-B 8) | root of SegmentedControl | T0 · native radio group | client | v0.1 · cut 4 | Part of SegmentedControl; its frame ids are already on that row |
| **Text link ("View all")** | Navigation | Plain 20 px text in card headers on 04 and 08 (M-B 4) | `.nz-text-link` utility (layer `nz.utilities`) | — · CSS class on an `<a>` or `render={<Link/>}` | — | v0.1 | A link needs no component: a class keeps it server-safe and router-neutral; hover, focus and visited come from CSS |
| **Hotkeys (`registerHotkey`)** | Navigation | ⌘K hint on the Search Field (06) | `@nizivo/react/hotkeys` | T2 · own registry on `tinykeys` 4.0.1 | client | v0.3 | IME-safe, ignores editable targets; ≤ 2 KB budget (§17.1) |
| **NavList, ListGroup** | Navigation | Settings sub-nav in 08 Pattern 7 `7275:16412`; grouped order list on 08 mobile (M-B 19) | docs examples on NavItem and plain lists (not in plan) | T0 · native `<nav>` + `<ul>` | server | docs v0.2 | A list of NavItems needs no new export until a second product asks |
| **Account menu, notifications popover, row-actions menu** | Navigation | Implied by Top Bar and table rows on 06 and 08 (M-C) | docs examples on Menu and Popover | T1 · engine through Menu or Popover | client | docs v0.2 | Compositions of existing parts; no new API |
| **Popover** | Feedback & Overlays | Account, notifications and store list on 06 and 08; Product Tag on 10 (M-C) | `@nizivo/react/popover` (**built in week 13**, no arrow: ARCHITECTURE D-bk) | T1 · engine RAC `DialogTrigger` + `Popover` + `Dialog` | client | v0.2 | Nested overlays portal into the parent's positioner (§12.1); 29.4 KB standalone, shared core with Select and Menu |
| **LiveAnnouncer** | Feedback & Overlays | Implied by Toast and Command Menu result counts | ships with Toast (`@nizivo/react/toast`, **built in week 14** as the Toaster's announcer and `announce()`) | T2 · own: two `aria-live` nodes, on the page from the Toaster's mount (client-only, D-bp) | client | v0.2 · gate O-06 | Announcements never come from the region turning visible, so nothing is read twice (§12.6) |
| **Scrim / backdrop** | Feedback & Overlays | Raw RECT `7275:16092` bound to `bg/inverse` at 0.32 (M-B 25) | `.nz-dialog-backdrop` element + `--nz-bg-scrim` (code-owned) | T1 · rendered by the Dialog adapter, root modal only | client | v0.1 · never cut | An element, not `::backdrop`, so a later native swap keeps the CSS contract (§10.4); the raw bind turns white in dark |
| **Bottom sheet, "More" sheet** | Feedback & Overlays | 08 mobile and the 10 merchant flow (M-B 32) | `Drawer side="bottom"` | T1 · engine RAC `Modal` | client | v0.2 | A side of Drawer, not a new component |
| **AppShell** | Layout / App shell | Compositions `7275:15337`, `7275:18792`, `7275:18887` (M-B 1) | `@nizivo/react/app-shell` (proposed) | T0 + T1 drawer · native landmarks; MobileTabBar + the "More" `Drawer side="bottom"` under 640 px (no Sidebar there) | split | v0.2 | Behaviour-heavy (the More sheet's focus trap), so core and not registry (critique C12); needs Q a and Q b at the start of v0.2 |
| **PageHeader** | Layout / App shell | "Page header" frames in all 08 patterns (M-B 2) | `@nizivo/react/page-header` (**built in week 16**) | T0 · native `<header>` + one `<h1>` | server | v0.2 | Title, meta and actions repeat on every page; one `<h1>` per page (08 shows two) |
| **Split** | Layout / App shell | Columns frames on 08: 744/360 and 232/864 (M-B 20) | `@nizivo/react/split` (proposed; week 2 ships no `layout` family subpath, ARCHITECTURE §23.4 D-h) | T0 · native CSS grid | server | v0.2 | Main + aside columns that collapse by container width, with no JS breakpoints |
| **StickyBar** | Layout / App shell | Sticky action bars `7275:20898`, `7275:21000`, `7275:21089`, `7275:21182` on 10; the 08 mobile save bar is not drawn (M-B 26) | `@nizivo/react/sticky-bar` (proposed) | T0 · native; `--nz-z-sticky`, `env(safe-area-inset-bottom)` | server | v0.2 | The hard-coded 28 px bottom inset becomes a safe-area rule; toasts sit above it |
| **Section panel** | Layout / App shell | About 20 raw panels on 08 (M-B 3) | `Card` (no new component) | T0 · native | server | v0.1 | Card is the one surface; a second Section API would split the hooks |
| **Avatar** | Layout / App shell | Raw image ellipses at 28/32/40/52/94 and the square store mark (M-B 5) | `@nizivo/react/avatar` (proposed) | T0 · native `<img>` with an initials fallback | server | v0.2 | Order rows, Top Bar, Customer Card and the store mark all need a fallback |
| **Indicator dot / count on an icon** | Layout / App shell | Bell and bag on 06 and 10 (M-B 7) | docs example: `Badge` on `IconButton` with visually hidden text (not in plan) | T0 · native | server | docs v0.2 | The dot is colour-only today; the count goes into the button's accessible name |
| **Table container, toolbar, footer** | Layout / App shell | Table frames `7275:15341`, `7275:15761` on 08 (M-B 14) | Table parts + `patterns/data-table` (TanStack Table v9) | T0 + T2 island · native `<table>` + selection island | split | Table v0.2 · registry v0.3 | TanStack's 12.9–17.0 KB stays in the app that chose it, never in our dependencies (§16.2) |
| **BulkActionBar** | Layout / App shell | Selected rows on 08 Pattern 1 with no bar drawn (M-B 15) | `@nizivo/react/table` (proposed) | T2 · own form-based island | split | v0.3 | Works with the form-based selection; ≤ 2 KB with TableSelection (§17.2) |
| **DataView** | Layout / App shell | Table ↔ list swap between desktop and mobile on 08 | `@nizivo/react/data-view` (proposed) | T0 · native; container query at `sm` | server | v0.3 | The only SSR-deterministic way to do 08's swap (§16.2) |
| **Setup guide checklist** | Layout / App shell | 08 Pattern 8 `7275:16478`; 10 merchant home (M-B 22) | `patterns/setup-guide` | T0 · native list + ProgressBar | server | docs v0.2 → registry v0.3 | Thin composition that will churn with onboarding copy |
| **PageIndicator** | Storefront / Social | Fraction chip `7275:21014`; dots `7275:20313` (M-B 28) | `@nizivo/react/page-indicator` (proposed) | T0 · native, `aria-hidden` visual | server | v0.3 | Listed for v0.3 in ARCHITECTURE §21.3; needs on-media tokens (1.08–1.49:1 in dark today) |
| **Image hotspot stage** | Storefront / Social | `7275:20923`, `7275:20284`, `7275:21392`, `7275:21709` (M-B 27) | `patterns/product-hotspots` (markers + Popover) | T1 · engine through Popover | client | docs v0.2 → registry v0.3 | 0–1 coordinates; the "In this post" list is the accessible path |
| **Post viewer** | Storefront / Social | `7275:20283`, `7275:20191`; mobile page `7275:20903` (M-B 31) | `patterns/post-viewer` (Dialog) | T1 · engine through Dialog | client | docs v0.2 → registry v0.3 | Dialog plus arrow keys; close and prev/next need 44 px |
| **Profile header, collections rail, post grid** | Storefront / Social | Profile ring `7275:20714` and screens on 10 (M-B 30, 31) | `patterns/` storefront items | T0 · native | server | docs v0.2 → registry v0.3 | Custom Follow and Share frames become Buttons; the rail is a list with scroll-snap |
| **Checkout pieces (collapsible summary, express pay, delivery form, shipping radios, promo row)** | Storefront / Social | 10 checkout screens (M-B 36) | `patterns/` from Field, RadioGroup, ChoiceCard, Accordion | T0 · native | split | docs v0.2 → registry v0.3 | Thin compositions of core form parts |
| **Media gallery with an upload tile** | Storefront / Social | 08 Pattern 2 `7275:15860` | `patterns/media-gallery` (FileUpload + Image) | T2 · own through FileUpload | client | docs v0.2 → registry v0.3 | Composition of FileUpload and Image |
| **Accordion** | Storefront / Social | Collapsible order summary on the 10 checkout (M-B 36) | `@nizivo/react/accordion` (proposed) | T0 · native `<details name>` | server | v0.3 | Exclusive accordions with zero JS (r3 §9) |
| **Carousel, rating stars, copy button, on-media floating buttons, Stagger/Reveal, Parallax/Spotlight** | Storefront / Social | 10, 05, 09 (M-B 28, 29, 37, 40) | Not in plan | — | — | not in plan | No consumer yet; the copy button lives inside `discount-card`; on-media buttons wait for on-media tokens; no specimens for the motion effects |
| **Hotspot editor (tag a post)** | Storefront / Social | `7275:21384`; mobile `7275:21709`, `7275:21714` (M-B 33) | Out of scope | — | — | out of scope | Explicitly deferred in ARCHITECTURE §21.5 |
| **`usePointerFx` (Tilt, Magnetic)** | Lab | Tokens `tilt/max-deg` and `magnetic/pull` only; no specimen (09) | `@nizivo/react/motion` | T2 · own pointer hook; fine pointer only; 0 when reduced | client | v0.3 | 0.48 KB measured (r6); needs a design specimen before it ships |

### 4.2 Code-only exports in v0.1

These have no Figma source by design. They are in the v0.1 scope (ARCHITECTURE §21.1, "Foundations").

| Export | Package / subpath | RSC | Why |
|---|---|---|---|
| `NizivoConfig` (`locale`, `labels`, `portalContainer`) | `@nizivo/react/config` | client | Optional. There is no required provider, because Server Components cannot read context (critique C16). |
| `formatLabel`, `dirOf` | `@nizivo/react/i18n` | server | Plurals through `Intl.PluralRules` in about 0.2 KB; no MessageFormat dependency (§16.4). |
| `renderElement`, `mergeProps`, `stateAttrs` | `@nizivo/react/contracts` | server | Lets a consumer replace a component and keep Nizivo's CSS (customisation level E4, §4.1 L5). |
| Variant maps such as `ButtonVariantMap` | `@nizivo/react/augment` | types only | Type-safe variant additions through `declare module` (§8.6). |
| `styles.css`, `css/base.css`, `css/<name>.css`, `css/manifest.json`, `reset.css` | `@nizivo/react` | static CSS | Import everything, or tokens + base + per-component files; never both (§5.2). |

### 4.3 Page templates

The 12 page compositions on page 08 and the screens on page 10 are not components. They become docs examples in v0.2 and registry items in v0.3, built only from public exports ([figma/08](figma/08-overview-dashboard.md) §12.5).

| Template | Figma frames | Recipe | Phase |
|---|---|---|---|
| `overview-dashboard` | `7275:15337` (desktop), `7275:18792` (tablet), `7275:18887` (mobile) | PageHeader (greeting, SegmentedControl, Export) → Banner → KpiTile grid → Split (TrendCard · RankedList + Goals or InsightCard) → Card (orders as Table, or `order-list` on narrow containers) | docs v0.2 → registry v0.3 |
| `resource-index-table` | `7275:15757` (Pattern 1), `7275:15971` (Pattern 3) | PageHeader → KpiTile grid → Card (toolbar: Tabs + SearchField + filters; Table with selection; footer: range text + Pagination) | docs v0.2 → registry v0.3 |
| `resource-index-with-drawer` | `7275:15971` (Pattern 3) | the table above + a URL-addressable Drawer (bottom sheet below 640 px) | docs v0.2 → registry v0.3 |
| `resource-detail-form` | `7275:15860` (Pattern 2) | Breadcrumb → PageHeader → Split (form Cards · aside); mobile save bar not designed | docs v0.2 → registry v0.3 |
| `card-grid-index` | `7275:16097` (Pattern 4), `7275:16204` (Pattern 5) | PageHeader → Alert → KpiTile grid → Tabs → Grid of cards | docs v0.2 → registry v0.3 |
| `analytics-report` | `7275:16296` (Pattern 6) | PageHeader → KpiTile grid → Grid of chart Cards (spans must snap to 12 columns) | docs v0.2 → registry v0.3 |
| `settings-with-subnav` | `7275:16412` (Pattern 7) | PageHeader → Split (NavItem list · Cards); sub-nav fallback below 640 px not designed | docs v0.2 → registry v0.3 |
| `onboarding-home` | `7275:16478` (Pattern 8) | PageHeader → Split (`setup-guide` + EmptyState · InsightCard + `plan-card`) | docs v0.2 → registry v0.3 |
| Storefront screens | 8 shopper and 5 merchant screens on page 10 | `storefront-bar`, `collection-circle`, `shoppable-post`, `product-hotspots`, `post-viewer`, checkout pieces | docs v0.2 → registry v0.3 |

---

## 5. Build order for v0.1

Build bottom-up. Each layer is a contract the next one reads (ARCHITECTURE [§4.1](ARCHITECTURE.md#4-layered-architecture-and-swap-seams)), so a component built early on an unfinished contract gets built twice. The engine adapters go first because they carry the most unknowns; week 1 compiles them before anything depends on them (§21.1).

### 5.1 Design inputs that gate rows (week 0)

| Input | Rows it gates | Default until answered |
|---|---|---|
| `spring()` parameter order and the Reduced fade duration (Q h; handoff Q1, Q34) | every overlay entrance and exit; Switch knob | Order **accepted 2026-10-14** by the maintainer: (mass, stiffness, damping, velocity). Reduced fades: 120 ms until Q34 is answered |
| Text ladder Option A (Q e) | every text colour; the contrast matrix | Option A ships through the time-boxed override file |
| `bg/scrim`, `bg/accent-hover`, `text/on-critical`, `border/control`, `border/control-hover`, `chart/warning`, `chart/critical` (Q f; handoff ask #4) | Dialog; Button Accent and Critical; every control border; ProgressBar warning and critical | code-owned proposals with expiry dates (all seven shipped in week 2, among the 19 proposals, all expiring 2027-01-31) |
| Button default variant (Q11) | Button | `secondary` |
| Missing states (Q g) | most v0.1 rows | built from tokens; listed on the deviations page |
| Sign-off on light renders of Button, Input, Select and Dialog | v0.1 exit criterion 11 | none: this gates the release |

### 5.2 Dependency graph

```
 W1  ┌─ @nizivo/tokens ─── TokensBrücke export → normalize → Terrazzo 2.8.0 → tokens.css · contract.json
     ├─ contracts/ ─────── layers.css · vocabulary.json ──► stateAttrs() types · stylelint allowlist
     ├─ nz gen (minimal) ─ barrels · engine.ts · exports map · design/component-map.json
     └─ adapter skeletons compiled against RAC 1.22.1: Select · Dialog · Tooltip
                               │
 W2      css/base.css (nz.base: focus outline · .nz-hit-target · forced colours)
         @nizivo/react/contracts · _internal (cx, glyphs) · ThemeScript · i18n · config · augment
           ├─► Text, Heading ──► layout (Stack · Inline · Grid · GridItem · Container · Separator)
           ├─► Button
           ├─► Badge · Delta · Kbd · Image · Skeleton · ProgressBar · ProgressRing · Meter · InlineError
           └─► Card (Heading levels) ──► EmptyState
                               │
 W3–4    Field, Fieldset (FieldScope · useFieldControl · InlineError)
           └─► Input · Textarea · Checkbox · RadioGroup · Switch · SegmentedControl · NativeSelect
         EngineLocale + overlay mechanics (portal container · data-entering/exiting · --nz-z-overlay)
           ├─► Tooltip ──► IconButton (default tooltip) ──► Alert (dismiss)
           ├─► Dialog (Button · IconButton · Heading · --nz-bg-scrim)
           ├─► Select (Field + overlay mechanics; test O-01 = Select inside Dialog)
           ├─► Menu (Kbd for shortcuts) ............................................ cut 1
           └─► Tabs / TabNav ...................................................... cut 2
         @nizivo/icons generator (independent: core never imports it) ................. cut 5
                               │
 W5      Next 16.4 (Turbopack and webpack), Vite 8, Astro 7.3 fixtures on the packed packages
         size-limit at measured + 10% · deviations page · in-repo visual regression · local release script (M14)
 W6      hardening · design sign-off · publish 0.1.0 on `next`        (+ 2 weeks buffer)
```

### 5.3 The order, with reasons

| # | Build | Needs first | Why it sits here | Week | Cut line |
|---:|---|---|---|---|---|
| 1 | `@nizivo/tokens` (`tokens.css`, `contract.json`) | a real TokensBrücke export | Every CSS file reads `--nz-*`, and stylelint checks each name against `contract.json`. | W1–W2 | — |
| 2 | `contracts/` + minimal `nz gen` | — | The vocabulary types `stateAttrs()`. Generated barrels guarantee the RSC-safe export shape that spike S2 verified. | W1 | — |
| 3 | Adapter skeletons for Select, Dialog, Tooltip | RAC 1.22.1 types | The riskiest code; compiling it first exposes engine surprises while there is still time. | W1 | — |
| 4 | `css/base.css` | tokens; `"interactive"` lists in `component.json` | The a11y floor must exist before any interactive part ships. | W2 | — |
| 5 | `@nizivo/react/contracts`, `_internal` glyphs | the vocabulary | `render` merging and state attributes are used by every component; glyphs give Button its spinner and Select its chevron. | W2 | — |
| 6 | ThemeScript, i18n, config, augment | tokens | Fixtures need theme and locale wiring from the first page. | W2 | — |
| 7 | Text, Heading | typography tokens | Card, Dialog and EmptyState titles use the constrained `level`. | W2 | — |
| 8 | Layout family | space and grid tokens | Docs and fixtures lay out every page with it. | W2 | — |
| 9 | Button | contracts, glyphs, base.css | Dialog triggers and footers, Alert actions and EmptyState actions render it. | W2 | never cut |
| 10 | Badge, Delta, Kbd, Image, Skeleton, ProgressBar, ProgressRing, Meter, InlineError | tokens, contracts | Server leaves; parallel work while the engine lands. | W2 | ProgressRing 3; Kbd, Image 4 |
| 11 | Card, EmptyState | Text/Heading | Compound server parts; Card is the surface for every v0.2 widget. | W2 | — |
| 12 | Field, Fieldset | `useId`, FieldScope, InlineError | Every control reads it, and it owns the single error channel. | W3 | never cut |
| 13 | Input, Textarea, Checkbox, RadioGroup, Switch, SegmentedControl, NativeSelect | Field | Thin client leaves over native elements. | W3 | SegmentedControl, NativeSelect 4 |
| 14 | Tooltip | EngineLocale, overlay mechanics | IconButton requires it by design rule. | W3 | never cut |
| 15 | IconButton | Button, Tooltip | Dialog close and Alert dismiss are IconButtons, not bare icons. | W3 | — |
| 16 | Alert | IconButton | Its dismiss control is an IconButton. Week 2 shipped Alert early, with its own `AlertDismiss` client leaf in place of the IconButton; week 8 rebuilt `AlertDismiss` as an IconButton (tertiary, `sm`, no tooltip) and kept its export (M28). | W3 (built W2; M28 in W8) | 3 |
| 17 | Dialog | Button, IconButton, Heading, `--nz-bg-scrim` | Exit gate; it hosts the Select and Tooltip overlay tests (O-01, O-03). | W3–4 | never cut |
| 18 | Select | Field, overlay mechanics, glyphs | Exit gate; proves the adapter seam end to end. | W4 | never cut |
| 19 | Menu | overlay mechanics, Kbd | Cut first: no v0.1 exit criterion depends on it. | W4 | 1 |
| 20 | Tabs, TabNav | the engine (Tabs only) | TabNav (0 KB) can ship even if Tabs slips. | W4 | 2 |
| 21 | `@nizivo/icons` | `lucide-static` 1.56.0 | Independent of core; docs can fall back to `lucide-react` with `strokeWidth={1.92}`. | W3–4 | 5 |

---

## 6. Machine-readable seed (`design/component-map.json`)

Copy this block into `design/component-map.json`. When `component.json` files exist, `nz gen` regenerates the file and carries these Figma IDs forward (ARCHITECTURE §6, §20.2). The block is plain JSON: no comments, no trailing commas. Since week 1, `nz gen` writes `design/component-map.json` from the `component.json` files of every built component, so for those this block is a record; its week 2 entries match what week 2 shipped (one subpath per component, ARCHITECTURE §23.4 D-h). Week 3: Field ships at `./field` (Field, `useFieldControl`) and Fieldset at `./fieldset`; the generated `design/component-map.json` is the record for every built component. Week 4: Tabs ships at `./tabs` (Tabs) and TabNav at `./tab-nav` (TabNav), two entries below (D-ac); Menu's ghost set is `746:203`; the icons' accessible-name prop is `label`, not `title`.

Field rules:
- `figma.canonical` is the on-canvas set; `figma.ghosts` is the master the instances use; `figma.ghostDiff` uses the flags of §1.2. `738:*` stands for the 74 icon masters (`738:69` … `738:426`).
- `figma.frames` has no field in `component.json`, whose Figma ids are `canonical`, `ghosts`, `variantsSeen` and `related` only. A built component records its frames under `related`. An instance-path id such as Kbd's `I755:1033;755:879` does not match the id pattern and cannot be stored there.
- `props` maps a Figma property key to a code prop, or gives a hint: `css:` (a pseudo-class or attribute), `derived:` (computed from data), `slot:` (presence of a slot), `part:` (a compound part), `island:`, `content`, or `TODO` (not read yet, critique G2).
- `tier`, `behavior` and `rsc` follow §1.3. Derive `component.json`'s `tier` with the rule in §1.3.
- `status` is the plan status today (`planned`, `deferred`, `not-planned`, `out-of-scope`). Once code exists, `nz gen` replaces it with `component.json`'s `status` (`stable` or `unstable`).
- `export.package` is `registry` for `patterns/` items and `docs` for docs-only examples.
- Implied components with no Figma node at all (Textarea, Popover and others) join the map when design draws them.

```json
{
  "version": 1,
  "about": "Seed for design/component-map.json, from docs/component-inventory.md (Draft v0.1, 2026-10-14). Figma node ids to Nizivo exports. nz gen regenerates this file from component.json files once code exists.",
  "figmaFile": {"key": "BIzJFf1wm8KP0YG2AVI1tP", "name": "Nizivo UI Library", "nodeUrl": "https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Nizivo-UI-Library?node-id={id, with : replaced by -}"},
  "enums": {
    "ghostDiff": ["identical", "props-identical", "keys-match", "unverified", "ghost-only", "unknown", "none", null],
    "tier": ["T0", "T1", "T2", "combinations joined by +", null],
    "behavior": ["native", "engine", "own", "combinations joined by +", null],
    "rsc": ["server", "client", "split", null],
    "release": ["v0.1", "v0.2", "v0.3", "after-1.0", null],
    "cut": ["never", 1, 2, 3, 4, 5, null],
    "status": ["planned", "deferred", "not-planned", "out-of-scope"]
  },
  "components": [
    {
      "name": "tokens", "area": "Foundations",
      "export": {"package": "@nizivo/tokens", "subpath": ".", "names": ["tokens.css", "tailwind.css", "custom-media.css", "tokens.json", "contract.json"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:12007", "7275:12385", "7275:12479", "7275:12578", "7275:12608"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "motion-tokens", "area": "Foundations",
      "export": {"package": "@nizivo/tokens", "subpath": "./tokens.css", "names": ["--nz-duration-*", "--nz-easing-*"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:12649", "7275:12653", "7275:12689", "7275:12720"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "theme-script", "area": "Foundations",
      "export": {"package": "@nizivo/react", "subpath": "./theme-script", "names": ["ThemeScript", "themeScript"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:12304", "7275:11231"], "key": null, "ghostDiff": null},
      "props": {"(variable mode Grove Color)": "data-nz-theme"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "text", "area": "Foundations",
      "export": {"package": "@nizivo/react", "subpath": "./text", "names": ["Text"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:12385"], "key": null, "ghostDiff": null},
      "props": {"(text style Grove/<Group>/<Name>)": "variant", "(fill text/*)": "tone"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "heading", "area": "Foundations",
      "export": {"package": "@nizivo/react", "subpath": "./heading", "names": ["Heading"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:12385"], "key": null, "ghostDiff": null},
      "props": {"(text style Grove/Heading/<Name>)": "variant", "(fill text/*)": "tone"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "icons", "area": "Foundations",
      "export": {"package": "@nizivo/icons", "subpath": ".", "names": ["<IconName>"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": ["738:*"], "variantsSeen": [], "related": [], "frames": ["7275:11886"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"(none)": "size, strokeWidth, absoluteStrokeWidth, title"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": 5, "status": "planned"
    },
    {
      "name": "brand-instagram", "area": "Foundations",
      "export": {"package": "@nizivo/icons", "subpath": "./brands/instagram", "names": ["Instagram"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": [], "ghosts": ["772:4302"], "variantsSeen": [], "related": [], "frames": ["7275:19797"], "key": null, "ghostDiff": "ghost-only"},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": 5, "status": "planned"
    },
    {
      "name": "logo", "area": "Foundations",
      "export": {"package": null, "subpath": null, "names": []},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": ["739:64"], "variantsSeen": [], "related": [], "frames": ["7275:11961", "7275:11231"], "key": "227c72d8c8dba6a70eff3997868daa2aad862c44", "ghostDiff": "ghost-only"},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": null, "cut": null, "status": "not-planned"
    },
    {
      "name": "a11y-floor", "area": "Foundations",
      "export": {"package": "@nizivo/react", "subpath": "./css/base.css", "names": ["base.css"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:12561"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "image", "area": "Foundations",
      "export": {"package": "@nizivo/react", "subpath": "./image", "names": ["Image"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:12726"], "key": null, "ghostDiff": null},
      "props": {"(image fill)": "src"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": 4, "status": "planned"
    },
    {
      "name": "button", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./button", "names": ["Button"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11244"], "ghosts": ["744:263"], "variantsSeen": ["744:70", "744:105", "744:175", "744:210", "744:77", "744:112", "744:217"], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Variant": "variant", "Size": "size", "State": "css:hover,active,focus-visible,disabled", "Leading icon#744:28": "leadingIcon", "Trailing icon#744:56": "trailingIcon", "Label#744:0": "children"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": "never", "status": "planned"
    },
    {
      "name": "icon-button", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./icon-button", "names": ["IconButton"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11357"], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unknown"},
      "props": {"Variant": "variant", "State": "css:hover", "(nested Icon instance)": "icon"},
      "tier": "T0+T1", "behavior": "native+engine", "rsc": "split", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "badge", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./badge", "names": ["Badge"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11374"], "ghosts": ["744:315"], "variantsSeen": ["744:293", "744:296", "744:299", "744:302", "744:305", "744:308"], "related": [], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"Tone": "tone", "Dot#744:91": "dot", "Label#744:84": "children"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "field", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./field", "names": ["Field", "useFieldControl"]},
      "figma": {"page": "02 Actions & Forms", "canonical": [], "ghosts": [], "variantsSeen": [], "related": ["7275:11397"], "frames": [], "key": null, "ghostDiff": null},
      "props": {"Label#745:0": "label", "Help text#745:14": "description", "Show help#745:21": "slot:description", "State=Error": "error", "State=Disabled": "disabled"},
      "tier": "T0", "behavior": "native", "rsc": "split", "release": "v0.1", "cut": "never", "status": "planned"
    },
    {
      "name": "input", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./input", "names": ["Input"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11397"], "ghosts": ["745:187"], "variantsSeen": ["745:159"], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"State": "css:hover,focus-within,placeholder-shown + invalid + disabled", "Value#745:7": "value", "Leading icon#745:28": "leadingIcon", "Label#745:0": "Field.label", "Help text#745:14": "Field.description", "Show help#745:21": "Field.description"},
      "tier": "T0", "behavior": "native", "rsc": "client", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "select", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./select", "names": ["Select", "SelectRoot", "SelectTrigger", "SelectValue", "SelectPopup", "SelectItem", "SelectGroup", "SelectGroupLabel", "SelectSeparator"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11438"], "ghosts": ["745:222"], "variantsSeen": ["745:188"], "related": ["746:204"], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"State": "open + disabled", "Value#745:35": "part:Select.Value", "Leading icon#745:39": "Select.Trigger.leadingIcon"},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.1", "cut": "never", "status": "planned"
    },
    {
      "name": "checkbox", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./checkbox", "names": ["Checkbox"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11456"], "ghosts": ["745:284"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Checked": "checked", "State": "disabled", "Label#745:43": "children"},
      "tier": "T0", "behavior": "native", "rsc": "client", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "radio-group", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./radio-group", "names": ["RadioGroup", "Radio"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11479"], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unknown"},
      "props": {"Selected": "RadioGroup.value", "State": "disabled", "Label#745:50": "children"},
      "tier": "T0", "behavior": "native", "rsc": "client", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "switch", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./switch", "names": ["Switch"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11494"], "ghosts": ["745:286"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"On": "checked", "State": "disabled", "Label#745:55": "children"},
      "tier": "T0", "behavior": "native", "rsc": "client", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "menu", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./menu", "names": ["Menu"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11516"], "ghosts": ["746:203"], "variantsSeen": [], "related": ["746:204"], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"State": "data-highlighted / data-checked / tone", "Label#746:0": "children", "Shortcut#746:5": "shortcut"},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.1", "cut": 1, "status": "planned"
    },
    {
      "name": "tooltip", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./tooltip", "names": ["Tooltip", "TooltipRoot", "TooltipTrigger", "TooltipPopup"]},
      "figma": {"page": "02 Actions & Forms", "canonical": [], "ghosts": ["746:262"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "ghost-only"},
      "props": {"Label#746:10": "part:Tooltip.Popup children"},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.1", "cut": "never", "status": "planned"
    },
    {
      "name": "file-upload", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./file-upload", "names": ["FileUpload"]},
      "figma": {"page": "02 Actions & Forms", "canonical": ["7275:11548"], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unknown"},
      "props": {"State=Drag over": "TODO: component-local attribute", "State=Uploading": "data-pending"},
      "tier": "T2", "behavior": "own", "rsc": "client", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "date-range-picker", "area": "Actions & Forms",
      "export": {"package": "@nizivo/react", "subpath": "./unstable/date-range-picker", "names": ["DateRangePicker", "RangeCalendar"]},
      "figma": {"page": "02 Actions & Forms", "canonical": [], "ghosts": ["746:267"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "ghost-only"},
      "props": {"(none)": "value, onValueChange, presets, timeZone"},
      "tier": "T1", "behavior": "engine", "rsc": "split", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "chart-legend", "area": "Data Viz",
      "export": {"package": "@nizivo/charts", "subpath": ".", "names": ["Legend"]},
      "figma": {"page": "03 Data Visualization", "canonical": ["7275:13291"], "ghosts": ["747:286"], "variantsSeen": ["747:243", "747:247"], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Mark": "mark", "Label#747:0": "children"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "chart-tooltip", "area": "Data Viz",
      "export": {"package": "@nizivo/charts", "subpath": ".", "names": ["ChartTooltip"]},
      "figma": {"page": "03 Data Visualization", "canonical": ["7275:13303"], "ghosts": ["747:287"], "variantsSeen": ["747:254", "747:260"], "related": [], "frames": [], "key": "d09b8a686df1c78c4deaab3816a1b2d3eafbdecf", "ghostDiff": "unverified"},
      "props": {"Series": "derived:series.length"},
      "tier": "T2", "behavior": "own", "rsc": "client", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "sparkline", "area": "Data Viz",
      "export": {"package": "@nizivo/charts", "subpath": ".", "names": ["Sparkline"]},
      "figma": {"page": "03 Data Visualization", "canonical": ["7275:13323"], "ghosts": ["747:288"], "variantsSeen": ["747:273", "747:277"], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Trend": "derived:data"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "area-chart", "area": "Data Viz",
      "export": {"package": "@nizivo/charts", "subpath": ".", "names": ["AreaChart"]},
      "figma": {"page": "03 Data Visualization", "canonical": ["7275:13336"], "ghosts": ["747:351"], "variantsSeen": ["747:289", "747:310"], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"State": "island:ChartInteraction"},
      "tier": "T0+T2", "behavior": "native+own", "rsc": "split", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "bar-chart", "area": "Data Viz",
      "export": {"package": "@nizivo/charts", "subpath": ".", "names": ["BarChart"]},
      "figma": {"page": "03 Data Visualization", "canonical": ["7275:13387"], "ghosts": ["747:424"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"State": "island:ChartInteraction"},
      "tier": "T0+T2", "behavior": "native+own", "rsc": "split", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "donut-chart", "area": "Data Viz",
      "export": {"package": "@nizivo/charts", "subpath": ".", "names": ["DonutChart"]},
      "figma": {"page": "03 Data Visualization", "canonical": ["7275:13455"], "ghosts": ["751:314"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"State": "island:ChartInteraction"},
      "tier": "T0+T2", "behavior": "native+own", "rsc": "split", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "progress-bar", "area": "Data Viz",
      "export": {"package": "@nizivo/react", "subpath": "./progress-bar", "names": ["ProgressBar"]},
      "figma": {"page": "03 Data Visualization", "canonical": ["7275:13526"], "ghosts": ["751:367"], "variantsSeen": ["751:349", "751:355", "751:361"], "related": [], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"Tone": "tone"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "progress-ring", "area": "Data Viz",
      "export": {"package": "@nizivo/react", "subpath": "./progress-ring", "names": ["ProgressRing"]},
      "figma": {"page": "03 Data Visualization", "canonical": ["7275:13545"], "ghosts": ["751:388"], "variantsSeen": ["751:368", "751:373", "751:378", "751:383"], "related": [], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"Value": "value"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": 3, "status": "planned"
    },
    {
      "name": "funnel", "area": "Data Viz",
      "export": {"package": "@nizivo/charts", "subpath": ".", "names": ["Funnel"]},
      "figma": {"page": "03 Data Visualization", "canonical": [], "ghosts": ["751:319"], "variantsSeen": [], "related": [], "frames": ["7275:13521"], "key": "6de76da41db20a96c0c3be745da0d759ae1ae70a", "ghostDiff": "ghost-only"},
      "props": {"(none)": "steps"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "heatmap", "area": "Data Viz",
      "export": {"package": "@nizivo/charts", "subpath": ".", "names": ["Heatmap"]},
      "figma": {"page": "03 Data Visualization", "canonical": [], "ghosts": ["751:393"], "variantsSeen": [], "related": [], "frames": ["7275:13571"], "key": "ef6b2dd78a53b01a8bb6f09f28116371794f6321", "ghostDiff": "ghost-only"},
      "props": {"(none)": "data, rows, cols"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "card", "area": "Dashboard Widgets",
      "export": {"package": "@nizivo/react", "subpath": "./card", "names": ["Card", "CardRoot", "CardHeader", "CardTitle", "CardDescription", "CardAction", "CardBody", "CardFooter"]},
      "figma": {"page": "04 Dashboard Widgets", "canonical": ["7275:13757"], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "none"},
      "props": {"Style": "tone", "Title#752:4": "part:Card.Title", "Show action#752:8": "slot:Card.Action", "(Slot frame)": "part:Card.Body"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "delta", "area": "Dashboard Widgets",
      "export": {"package": "@nizivo/react", "subpath": "./delta", "names": ["Delta"]},
      "figma": {"page": "04 Dashboard Widgets", "canonical": ["7275:13743"], "ghosts": ["752:269"], "variantsSeen": ["752:255", "752:260", "752:265"], "related": [], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"Trend": "derived:sign(value)", "Value#752:0": "value"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "kpi-tile", "area": "Dashboard Widgets",
      "export": {"package": "@nizivo/react", "subpath": "./kpi-tile", "names": ["KpiTile"]},
      "figma": {"page": "04 Dashboard Widgets", "canonical": ["7275:13780"], "ghosts": ["752:380"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Tone": "tone", "Trend": "derived:delta", "Label#752:12": "label", "Value#752:17": "value", "(nested Sparkline)": "slot:chart", "(nested Delta)": "delta"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "trend-card", "area": "Dashboard Widgets",
      "export": {"package": "@nizivo/react", "subpath": "./trend-card", "names": ["TrendCard"]},
      "figma": {"page": "04 Dashboard Widgets", "canonical": [], "ghosts": ["752:385"], "variantsSeen": [], "related": [], "frames": ["7275:13818"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"(none)": "label, value, delta, actions, chart, legend, status"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "ranked-list", "area": "Dashboard Widgets",
      "export": {"package": "@nizivo/react", "subpath": "./ranked-list", "names": ["RankedList"]},
      "figma": {"page": "04 Dashboard Widgets", "canonical": [], "ghosts": ["752:444"], "variantsSeen": [], "related": [], "frames": ["7275:13824"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"(none)": "items, limit, format, action, status"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "insight-card", "area": "Dashboard Widgets",
      "export": {"package": "registry", "subpath": "insight-card", "names": ["insight-card"]},
      "figma": {"page": "04 Dashboard Widgets", "canonical": ["7275:13829"], "ghosts": ["752:531"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Tone": "Card.tone / --nz-card-bg", "Title#752:22": "part:Card.Title"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "product-card", "area": "Commerce",
      "export": {"package": "registry", "subpath": "product-card", "names": ["product-card"]},
      "figma": {"page": "05 Commerce", "canonical": ["7275:13989"], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unknown"},
      "props": {"Status": "availability + publication (domain props)"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "chip-group", "area": "Commerce",
      "export": {"package": "@nizivo/react", "subpath": "./chip-group", "names": ["ChipGroup", "Chip"]},
      "figma": {"page": "05 Commerce", "canonical": ["7275:14018"], "ghosts": ["753:405"], "variantsSeen": [], "related": [], "frames": ["7275:19004"], "key": null, "ghostDiff": "unverified"},
      "props": {"Type": "slot:leading", "State": "css:checked,disabled"},
      "tier": "T0", "behavior": "native", "rsc": "client", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "table", "area": "Commerce",
      "export": {"package": "@nizivo/react", "subpath": "./table", "names": ["Table", "TableSelection"]},
      "figma": {"page": "05 Commerce", "canonical": ["7275:14040"], "ghosts": ["753:476"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"State": "css:hover / data-selected"},
      "tier": "T0+T2", "behavior": "native+own", "rsc": "split", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "order-table", "area": "Commerce",
      "export": {"package": "registry", "subpath": "order-table", "names": ["order-table"]},
      "figma": {"page": "05 Commerce", "canonical": ["7275:14091"], "ghosts": ["753:644"], "variantsSeen": ["753:606"], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"State": "css:hover"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "table-header", "area": "Commerce",
      "export": {"package": "@nizivo/react", "subpath": "./table", "names": ["Table"]},
      "figma": {"page": "05 Commerce", "canonical": [], "ghosts": ["753:410", "753:599"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "ghost-only"},
      "props": {"(not read)": "TODO"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "discount-card", "area": "Commerce",
      "export": {"package": "registry", "subpath": "discount-card", "names": ["discount-card"]},
      "figma": {"page": "05 Commerce", "canonical": ["7275:14130"], "ghosts": ["754:615"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Status": "domain prop (not status)"},
      "tier": "T0+T2", "behavior": "native+own", "rsc": "split", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "choice-card", "area": "Commerce",
      "export": {"package": "@nizivo/react", "subpath": "./choice-card", "names": ["ChoiceCard"]},
      "figma": {"page": "05 Commerce", "canonical": ["7275:14174"], "ghosts": ["754:644"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"State": "css:checked", "Show default#754:2": "content:Badge"},
      "tier": "T0", "behavior": "native", "rsc": "client", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "shipment-tracker", "area": "Commerce",
      "export": {"package": "registry", "subpath": "shipment-tracker", "names": ["shipment-tracker"]},
      "figma": {"page": "05 Commerce", "canonical": ["7275:14195"], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unknown"},
      "props": {"Step": "derived:events"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "plan-card", "area": "Commerce",
      "export": {"package": "registry", "subpath": "plan-card", "names": ["plan-card"]},
      "figma": {"page": "05 Commerce", "canonical": ["7275:14284"], "ghosts": ["754:892"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Tier": "content; Grow → featured"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "customer-card", "area": "Commerce",
      "export": {"package": "registry", "subpath": "customer-card", "names": ["customer-card"]},
      "figma": {"page": "05 Commerce", "canonical": [], "ghosts": ["754:530"], "variantsSeen": [], "related": [], "frames": ["7275:14124"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"Name": "content", "Email": "content"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "order-summary", "area": "Commerce",
      "export": {"package": "registry", "subpath": "order-summary", "names": ["order-summary"]},
      "figma": {"page": "05 Commerce", "canonical": [], "ghosts": ["754:897"], "variantsSeen": [], "related": [], "frames": ["7275:14350"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"(not read)": "TODO"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "order-list", "area": "Commerce",
      "export": {"package": "registry", "subpath": "order-list", "names": ["order-list"]},
      "figma": {"page": "08 Overview Dashboard", "canonical": [], "ghosts": ["764:3483"], "variantsSeen": [], "related": [], "frames": ["7275:18791"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"Customer#764:1": "content", "Meta#764:2": "content", "Total#764:3": "content"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "nav-item", "area": "Navigation",
      "export": {"package": "@nizivo/react", "subpath": "./nav-item", "names": ["NavItem"]},
      "figma": {"page": "06 Navigation", "canonical": ["7275:14700"], "ghosts": ["755:658"], "variantsSeen": ["755:619", "755:627", "755:635", "755:643", "755:648", "755:653"], "related": [], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"State": "css:hover / current", "Collapsed": "derived:Sidebar data-collapsed", "Label#755:0": "children", "Show count#755:7": "count", "Count#755:14": "count", "Icon#755:21": "icon"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "search-field", "area": "Navigation",
      "export": {"package": "@nizivo/react", "subpath": "./search-field", "names": ["SearchField"]},
      "figma": {"page": "06 Navigation", "canonical": ["7275:14764"], "ghosts": ["755:888"], "variantsSeen": ["755:874"], "related": [], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"State": "css:focus-within"},
      "tier": "T0", "behavior": "native", "rsc": "client", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "tabs", "area": "Navigation",
      "export": {"package": "@nizivo/react", "subpath": "./tabs", "names": ["Tabs"]},
      "figma": {"page": "06 Navigation", "canonical": ["7275:14781"], "ghosts": ["755:961"], "variantsSeen": ["755:952", "755:958"], "related": ["7275:14791", "7275:14777"], "frames": ["7275:14791"], "key": null, "ghostDiff": "identical"},
      "props": {"State": "css:hover / data-selected", "Label#755:29": "children"},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.1", "cut": 2, "status": "planned", "notes": "Shipped in week 4 on its own subpath (D-ac); the generated design/component-map.json is the current record"
    },
    {
      "name": "tab-nav", "area": "Navigation",
      "export": {"package": "@nizivo/react", "subpath": "./tab-nav", "names": ["TabNav"]},
      "figma": {"page": "06 Navigation", "canonical": [], "ghosts": [], "variantsSeen": [], "related": ["7275:14781"], "frames": ["7275:14791"], "key": null, "ghostDiff": null},
      "props": {"State": "css:hover / aria-current"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": 2, "status": "planned", "notes": "Links styled as the Tab set (no Figma component of its own; figma/06 §7.1). Shipped in week 4 on its own subpath, server-safe with 0 KB of client JavaScript (D-ac)"
    },
    {
      "name": "segmented-control", "area": "Navigation",
      "export": {"package": "@nizivo/react", "subpath": "./segmented-control", "names": ["SegmentedControl"]},
      "figma": {"page": "06 Navigation", "canonical": ["7275:14797"], "ghosts": ["755:982"], "variantsSeen": ["755:978"], "related": [], "frames": ["7275:14802", "7275:18903"], "key": null, "ghostDiff": "identical"},
      "props": {"State": "css:checked", "Label#755:33": "children"},
      "tier": "T0", "behavior": "native", "rsc": "client", "release": "v0.1", "cut": 4, "status": "planned"
    },
    {
      "name": "store-switcher", "area": "Navigation",
      "export": {"package": "registry", "subpath": "store-switcher", "names": ["store-switcher"]},
      "figma": {"page": "06 Navigation", "canonical": [], "ghosts": ["755:663"], "variantsSeen": [], "related": [], "frames": ["7275:14727", "7275:14734"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"Store#755:28": "content"},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "command-menu", "area": "Navigation",
      "export": {"package": "@nizivo/react", "subpath": "./unstable/command-menu", "names": ["CommandMenu"]},
      "figma": {"page": "06 Navigation", "canonical": [], "ghosts": ["755:889"], "variantsSeen": [], "related": [], "frames": ["7275:14776"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"(none)": "open, onOpenChange, shortcut"},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "breadcrumb", "area": "Navigation",
      "export": {"package": "@nizivo/react", "subpath": "./breadcrumb", "names": ["Breadcrumb"]},
      "figma": {"page": "06 Navigation", "canonical": [], "ghosts": ["755:998"], "variantsSeen": [], "related": [], "frames": ["7275:14813"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"Level 1#755:36": "part:Breadcrumb.Item", "Level 2#755:37": "part:Breadcrumb.Item", "Current#755:38": "part:Breadcrumb.Item[aria-current]"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "pagination", "area": "Navigation",
      "export": {"package": "@nizivo/react", "subpath": "./pagination", "names": ["Pagination"]},
      "figma": {"page": "06 Navigation", "canonical": [], "ghosts": ["755:1007"], "variantsSeen": [], "related": [], "frames": ["7275:14815"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"(none)": "page, totalPages, render, labels"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "toast", "area": "Feedback & Overlays",
      "export": {"package": "@nizivo/react", "subpath": "./toast", "names": ["toast", "Toaster"]},
      "figma": {"page": "07 Feedback & Overlays", "canonical": ["7275:15071"], "ghosts": [], "variantsSeen": ["756:820"], "related": [], "frames": [], "key": null, "ghostDiff": "unknown"},
      "props": {"Tone": "tone", "(message text)": "toast(message)", "(action text)": "action", "(close icon)": "IconButton"},
      "tier": "T2", "behavior": "own", "rsc": "client", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "alert", "area": "Feedback & Overlays",
      "export": {"package": "@nizivo/react", "subpath": "./alert", "names": ["Alert", "AlertDismiss"]},
      "figma": {"page": "07 Feedback & Overlays", "canonical": ["7275:15091"], "ghosts": ["756:868"], "variantsSeen": ["756:825", "756:836", "756:846", "756:857"], "related": [], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"Tone": "tone", "(close icon)": "slot:dismiss"},
      "tier": "T0", "behavior": "native", "rsc": "split", "release": "v0.1", "cut": 3, "status": "planned"
    },
    {
      "name": "banner", "area": "Feedback & Overlays",
      "export": {"package": "@nizivo/react", "subpath": "./banner", "names": ["Banner"]},
      "figma": {"page": "07 Feedback & Overlays", "canonical": ["7275:15120"], "ghosts": ["756:913"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Tone": "tone", "(render)": "slot:media", "(Button)": "slot:action"},
      "tier": "T0", "behavior": "native", "rsc": "split", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "dialog", "area": "Feedback & Overlays",
      "export": {"package": "@nizivo/react", "subpath": "./dialog", "names": ["Dialog"]},
      "figma": {"page": "07 Feedback & Overlays", "canonical": ["7275:15139"], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unknown"},
      "props": {"Type": "Dialog.Popup.role", "(close icon)": "part:Dialog.Close"},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.1", "cut": "never", "status": "planned"
    },
    {
      "name": "drawer", "area": "Feedback & Overlays",
      "export": {"package": "@nizivo/react", "subpath": "./drawer", "names": ["Drawer"]},
      "figma": {"page": "07 Feedback & Overlays", "canonical": [], "ghosts": ["756:1001"], "variantsSeen": [], "related": [], "frames": ["7275:15163", "7275:16096", "7275:16092"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"Title#756:0": "part:Drawer.Title"},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "empty-state", "area": "Feedback & Overlays",
      "export": {"package": "@nizivo/react", "subpath": "./empty-state", "names": ["EmptyState"]},
      "figma": {"page": "07 Feedback & Overlays", "canonical": ["7275:15168"], "ghosts": ["756:1149"], "variantsSeen": ["756:1124", "756:1134"], "related": [], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"Context": "content", "(render)": "slot:media", "(Button)": "slot:actions"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "skeleton", "area": "Feedback & Overlays",
      "export": {"package": "@nizivo/react", "subpath": "./skeleton", "names": ["Skeleton"]},
      "figma": {"page": "07 Feedback & Overlays", "canonical": ["7275:15181"], "ghosts": ["756:1169"], "variantsSeen": ["756:1154", "756:1158", "756:1162"], "related": [], "frames": [], "key": null, "ghostDiff": "identical"},
      "props": {"Shape": "shape"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "stack", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./stack", "names": ["Stack"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": null},
      "props": {"(auto-layout gap)": "gap"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "inline", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./inline", "names": ["Inline"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": null},
      "props": {"(auto-layout gap)": "gap"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "grid", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./grid", "names": ["Grid", "GridItem"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:12608", "7275:12612"], "key": null, "ghostDiff": null},
      "props": {"(grid/*, section/gap variables)": "tokens"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "container", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./container", "names": ["Container"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": null},
      "props": {"(layout/content-max, grid/margin variables)": "tokens"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "separator", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./separator", "names": ["Separator"]},
      "figma": {"page": "01 Foundations", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "sidebar", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./sidebar", "names": ["Sidebar"]},
      "figma": {"page": "06 Navigation", "canonical": ["7275:14732"], "ghosts": ["755:869"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "unverified"},
      "props": {"Expanded": "collapsed (inverted)"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "top-bar", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./top-bar", "names": ["TopBar"]},
      "figma": {"page": "06 Navigation", "canonical": [], "ghosts": ["755:1031"], "variantsSeen": [], "related": [], "frames": ["7275:14821"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"Title#755:39": "title"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "mobile-top-bar", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./top-bar", "names": ["MobileTopBar"]},
      "figma": {"page": "08 Overview Dashboard", "canonical": [], "ghosts": ["764:3397"], "variantsSeen": [], "related": [], "frames": ["7275:18746", "7275:18888", "7275:18980"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"Title#764:0": "title"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "mobile-tab-bar", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./mobile-tab-bar", "names": ["MobileTabBar"]},
      "figma": {"page": "08 Overview Dashboard", "canonical": ["7275:18747"], "ghosts": ["764:3482"], "variantsSeen": ["7275:18748", "7275:18769", "764:3408", "764:3445"], "related": [], "frames": [], "key": null, "ghostDiff": "props-identical"},
      "props": {"Active": "derived:route (aria-current)"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "collection-circle", "area": "Storefront / Social",
      "export": {"package": "registry", "subpath": "collection-circle", "names": ["collection-circle"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": ["7275:19802"], "ghosts": ["772:4320"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "keys-match"},
      "props": {"State": "seen", "Label#772:0": "children"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "shoppable-post", "area": "Storefront / Social",
      "export": {"package": "registry", "subpath": "shoppable-post", "names": ["shoppable-post"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": ["7275:19815"], "ghosts": ["772:4373"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "keys-match"},
      "props": {"Type": "derived:media.length", "State": "css:hover,focus-within"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "product-tag", "area": "Storefront / Social",
      "export": {"package": "registry", "subpath": "product-tag", "names": ["product-tag"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": ["7275:19846"], "ghosts": ["772:4390"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "keys-match"},
      "props": {"State": "open", "Name#772:3": "content", "Price#772:6": "content"},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "tagged-product", "area": "Storefront / Social",
      "export": {"package": "registry", "subpath": "tagged-product", "names": ["tagged-product"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": ["7275:19862"], "ghosts": ["772:4414"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "keys-match"},
      "props": {"State": "aria-pressed", "Name#772:9": "content", "Price#772:12": "content", "Variant#772:15": "content"},
      "tier": "T0", "behavior": "native", "rsc": "split", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "storefront-bar", "area": "Storefront / Social",
      "export": {"package": "registry", "subpath": "storefront-bar", "names": ["storefront-bar"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": ["7275:19889"], "ghosts": ["772:4457"], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": "keys-match"},
      "props": {"Platform": "css:container query"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "post-badge", "area": "Storefront / Social",
      "export": {"package": "docs", "subpath": "badge", "names": []},
      "figma": {"page": "10 Instagram Storefront", "canonical": [], "ghosts": ["772:4419"], "variantsSeen": [], "related": [], "frames": ["7275:19884"], "key": null, "ghostDiff": "ghost-only"},
      "props": {"Label#772:18": "content (count + plural)"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "rays-backdrop", "area": "Lab",
      "export": {"package": "@nizivo/lab", "subpath": null, "names": ["RaysBackdrop"]},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:19610", "7279:81", "7279:1476"], "key": null, "ghostDiff": null},
      "props": {"(shader uniforms)": "props"},
      "tier": "T2", "behavior": "own", "rsc": "split", "release": "after-1.0", "cut": null, "status": "deferred"
    },
    {
      "name": "mesh-gradient-backdrop", "area": "Lab",
      "export": {"package": "@nizivo/lab", "subpath": null, "names": ["MeshGradientBackdrop"]},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:19633"], "key": null, "ghostDiff": null},
      "props": {"(shader uniforms)": "props"},
      "tier": "T2", "behavior": "own", "rsc": "split", "release": "after-1.0", "cut": null, "status": "deferred"
    },
    {
      "name": "surface-glass", "area": "Lab",
      "export": {"package": "@nizivo/react", "subpath": "./surface", "names": ["Surface"]},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:19634"], "key": null, "ghostDiff": null},
      "props": {"(effect style Grove/Surface/Glass)": "material"},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "liquid-glass", "area": "Lab",
      "export": {"package": null, "subpath": null, "names": []},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": [], "key": null, "ghostDiff": null},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": null, "cut": null, "status": "deferred"
    },
    {
      "name": "hero-section", "area": "Lab",
      "export": {"package": null, "subpath": null, "names": []},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:19610"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": null, "cut": null, "status": "not-planned"
    },
    {
      "name": "feature-tile", "area": "Lab",
      "export": {"package": null, "subpath": null, "names": []},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:19654"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": null, "cut": null, "status": "not-planned"
    },
    {
      "name": "profile-card", "area": "Lab",
      "export": {"package": null, "subpath": null, "names": []},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:19634"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": null, "cut": null, "status": "not-planned"
    },
    {
      "name": "float", "area": "Lab",
      "export": {"package": null, "subpath": null, "names": []},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:19622"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": null, "cut": null, "status": "deferred"
    },
    {
      "name": "toast-motion", "area": "Lab",
      "export": {"package": "@nizivo/react", "subpath": "./toast", "names": ["Toaster"]},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": ["756:820"], "related": [], "frames": ["7275:19709"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "chart-draw", "area": "Lab",
      "export": {"package": "@nizivo/charts", "subpath": "./styles.css", "names": ["styles.css"]},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:19717"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "card-lift", "area": "Lab",
      "export": {"package": "@nizivo/react", "subpath": "./css/card.css", "names": ["card.css"]},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": ["752:380"], "related": [], "frames": ["7275:19732"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "skeleton-pulse", "area": "Lab",
      "export": {"package": "@nizivo/react", "subpath": "./css/skeleton.css", "names": ["skeleton.css"]},
      "figma": {"page": "09 3D, Shader & Motion Lab", "canonical": [], "ghosts": [], "variantsSeen": ["756:1158"], "related": [], "frames": ["7275:19743"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": null, "behavior": null, "rsc": null, "release": "v0.1", "cut": null, "status": "planned"
    },
    {
      "name": "kbd", "area": "Navigation",
      "export": {"package": "@nizivo/react", "subpath": "./kbd", "names": ["Kbd"]},
      "figma": {"page": "06 Navigation", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:14768", "7275:14773", "755:895", "755:927", "755:936", "755:940", "755:944", "I755:1033;755:879"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.1", "cut": 4, "status": "planned"
    },
    {
      "name": "app-shell", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./app-shell", "names": ["AppShell"]},
      "figma": {"page": "08 Overview Dashboard", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:15337", "7275:18792", "7275:18887"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0+T1", "behavior": "native+engine", "rsc": "split", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "sticky-bar", "area": "Layout / App shell",
      "export": {"package": "@nizivo/react", "subpath": "./sticky-bar", "names": ["StickyBar"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:20898", "7275:21000", "7275:21089", "7275:21182"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "data-table", "area": "Layout / App shell",
      "export": {"package": "registry", "subpath": "data-table", "names": ["data-table"]},
      "figma": {"page": "08 Overview Dashboard", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:15341", "7275:15761"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0+T2", "behavior": "native+own", "rsc": "split", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "metric", "area": "Dashboard Widgets",
      "export": {"package": "@nizivo/react", "subpath": "./metric", "names": ["Metric", "NumberValue"]},
      "figma": {"page": "04 Dashboard Widgets", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:13783", "I7275:13818;752:387"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.2", "cut": null, "status": "planned"
    },
    {
      "name": "page-indicator", "area": "Storefront / Social",
      "export": {"package": "@nizivo/react", "subpath": "./page-indicator", "names": ["PageIndicator"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:21014", "7275:20313"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "product-hotspots", "area": "Storefront / Social",
      "export": {"package": "registry", "subpath": "product-hotspots", "names": ["product-hotspots"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:20923", "7275:20284", "7275:21392", "7275:21709"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "post-viewer", "area": "Storefront / Social",
      "export": {"package": "registry", "subpath": "post-viewer", "names": ["post-viewer"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:20283", "7275:20191", "7275:20903"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T1", "behavior": "engine", "rsc": "client", "release": "v0.3", "cut": null, "status": "planned"
    },
    {
      "name": "profile-header", "area": "Storefront / Social",
      "export": {"package": "registry", "subpath": "profile-header", "names": ["profile-header"]},
      "figma": {"page": "10 Instagram Storefront", "canonical": [], "ghosts": [], "variantsSeen": [], "related": [], "frames": ["7275:20714"], "key": null, "ghostDiff": null},
      "props": {},
      "tier": "T0", "behavior": "native", "rsc": "server", "release": "v0.3", "cut": null, "status": "planned"
    }
  ]
}
```

---

## 7. Open points and differences from ARCHITECTURE.md

1. **Select's ghost ID (resolved).** `745:188` is a variant inside the ghost set `745:222` ([figma/04](figma/04-dashboard-widgets.md) §2, [figma/08](figma/08-overview-dashboard.md) §5). The ARCHITECTURE §6 `component.json` sample now records the set under `ghosts` and the variant under `variantsSeen`, as this inventory does.
2. **Subpaths after v0.1 are proposals.** ARCHITECTURE §5.2 fixes only the v0.1 list plus `table`, `motion`, `hotkeys` and `unstable/date-range-picker`. Every other subpath here is marked "(proposed)". Adding one is a minor change; renaming one after release is breaking. Week 2 replaced the family subpaths `text` (Text, Heading), `layout` and `progress` with one subpath per component (ARCHITECTURE §23.4 D-h); regrouping them is free until 0.1.0 and breaking after it.
3. **Components the plan does not name.** InsightCard, the store switcher, Steps (inside `shipment-tracker`), Money and Price (use `NumberValue` currency formats), the copy button, NavList, ListGroup, the indicator dot, the hero section, the feature tile and the profile card. Each row proposes a home with a reason. Confirm or reject them in one ADR.
4. **Banner's tier (resolved).** ARCHITECTURE §9.5 and §21.2 now treat Banner like Alert: T0 + dismiss leaf, `split`, v0.2, under "Feedback".
5. **FileUpload's drag-over state** needs a component-local attribute in `contracts/vocabulary.json`; none of the current names fits. Add it in the FileUpload PR (v0.2).
6. **The Card lift.** The page 09 specimen lifts a card on hover through `data-interactive`, which ARCHITECTURE §8.3 lists. The v0.1 Card sketch (§10.5) does not style it, so this inventory places the lift in v0.2 with clickable KpiTiles.
7. **The component count.** The Figma cover says 62 components. The file actually holds about 47 sets, about 21 non-icon ghost-only components, the Instagram glyph and 74 icons (critique G6). Design should update the cover.
8. **UNVERIFIED:** that every pair marked "unverified identical" really is identical (critique G1); week 2 diffed seven of them (Badge, Delta, ProgressBar, ProgressRing, Alert, EmptyState, Skeleton) and found each identical apart from text widths of 1 px or less ([figma/11](figma/11-w2-server-safe-components.md) §2). Still unverified: the properties of Order Summary, both Table Headers, Brand/Logo and the Instagram glyph (G2); the live Sidebar `755:869`, which was never fingerprinted.
9. **Code props that changed when built (week 2).** ProgressRing takes a `meter` boolean instead of a `role` prop. Card `padding` and `elevation`, Skeleton `shape`, the layout `gap` and `span` and Image `ratio` emit the eight presentational attributes of ARCHITECTURE §23.4 D-j. Inner `data-slot` elements of single-root components are for CSS only and take no `render` (ARCHITECTURE §8.2, D-b). The generated manifests in `contracts/api/react/` become the source of truth once they exist.
