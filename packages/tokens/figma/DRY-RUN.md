# Week 1 token dry run: TokensBrücke export → normalizer → Terrazzo 2.8.0

Date: 2026-10-14. Input: the real export in `figma/raw/**` (TokensBrücke CLI 3.18.0 from the
read-only `use_figma` snapshot of the Grove UI Library file; see `scripts/figma/PULL-AGENT.md`).
Toolchain: `@terrazzo/cli` and `@terrazzo/plugin-css` 2.8.0, Node 24.

This is a dry run (plan §21.1, W1). It stops before the real `tokens.css`: no `light-dark()`
transform, no a11y overrides, no proposals, no Tailwind or contract plugin. Those are week 2.

**Week 2 (2026-10-14): the real build replaced the dry run;** `../BUILD.md` describes it. The
sections below stay as the week 1 record of the export and the normalizer. "Emitted CSS names" is
kept current, and the open items say which week 2 closed.

**Grove → Nizivo rename (2026-10-14, after week 2).** The design file's collections are now
`Nizivo Primitives`, `Nizivo Color`, `Nizivo Space`, `Nizivo Motion` and `Nizivo Responsive`, its
text and effect styles are `Nizivo/…`, and every WEB code syntax reads `var(--nz-…)`
(`codesyntax-rewrite.plan.md`). The file title is still "Grove UI Library" until the maintainer
renames it. The committed `figma/raw/**` export predates the rename and keeps the Grove names. The
next export carries the Nizivo names; the normalizer accepts both prefixes, so that changes nothing
in `src/figma-owned` (the both-prefix test is byte-exact). The one change it brings is the new
`elevation.0` token (open item 9). The `Grove …` raw files must be gone first, because one
collection under both prefixes is a normalizer error: `raw.ts` clears the folder on the engineer
path, and on the web-upload path engineering deletes them in the same pull request
(`tokensbruecke.settings.md`, step 5 of the upload).

## Reproduce

Run from `packages/tokens`:

| Step      | Command                                                            | Result                                                                                   |
| --------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Normalize | `pnpm tokens:normalize`                                            | 11 files in `src/figma-owned/`, 298 tokens (200 distinct ids)                            |
| Invariant | `pnpm tokens:normalize:check`                                      | `src/figma-owned matches normalize(figma/raw): 11 files`                                 |
| Validate  | `pnpm tokens:check` (`tz check -c build/terrazzo.config.ts`)       | `No errors`, recommended lint rules on                                                   |
| Build     | `NZ_TOKENS_OUT_DIR=<dir> pnpm tokens:build` (W1: `tokens:dry-run`) | `200 tokens built`, one `tokens.css` (21.7 KB, unminified) in W1                         |
| Tests     | `pnpm test`                                                        | 23 tests: golden, both prefixes, id identity, determinism, `--check`, the Terrazzo build |

In week 1 the dry-run CSS went to `node_modules/.cache/tokens-dry-run/`. Since week 2 the build
writes `dist/` (published) unless `NZ_TOKENS_OUT_DIR` is set.

## Verdict

- **The real export validates once normalized.** `tz check` passes on the resolver (3 sets of
  modes: theme light/dark, motion default/reduced, viewport mobile/tablet/desktop) with
  Terrazzo's recommended rules.
- **The raw export does not validate as it is.** `tz check` on each raw file, with the same rules:

| Raw file                        | Result               | Why                                                          |
| ------------------------------- | -------------------- | ------------------------------------------------------------ |
| `Effect-styles.tokens.json`     | fails (22 errors)    | `core/valid-color`: 8-digit hex (`#1013110a`) with `alpha`   |
| `Typography-styles.tokens.json` | fails (108 errors)   | `lineHeight: "104%"` and `letterSpacing: "-3%"` are strings  |
| `Grove Color/{Light,Dark}`      | fails                | `{Grove Primitives.neutral.50}` cannot resolve on its own    |
| the other 7                     | passes with warnings | `core/consistent-naming`: ids start with `Grove Space.` etc. |

It also passes things it should not: durations, scales and grid columns all arrive as
`dimension` in px (`duration/fast` = 140px, `scale/press` = 0.98px), and Terrazzo cannot know.

- **S3a's partial-permutation recipe works on real data.** Every scoped block holds only its own
  modifier's tokens (asserted in `test/terrazzo.test.ts`):
  `[data-nz-theme="dark"]` 58 semantic colours, no primitives; reduced motion 20 motion tokens, in
  both `@media (prefers-reduced-motion: reduce)` and `[data-nz-motion="reduce"]`; `--nz-sm` and
  `--nz-lg` 9 viewport tokens each (`layout.viewport` excluded). No permutation repeats the
  defaults, so the base-id collision never happens.
- **`tz format` is a no-op on the normalized files** for values and key order. It does change the
  layout (one array item per line, momoa printer), which `oxfmt --check` rejects. So the
  normalizer writes the final form itself, and `tz format` is a check, not a pipeline step.

## What the normalizer does (`scripts/normalize.ts`, `scripts/normalize/**`)

| Raw (TokensBrücke)                       | `src/figma-owned/`                                         | Token ids                                                       |
| ---------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| `Grove\|Nizivo Primitives`               | `primitives.tokens.json`                                   | `color.p.green.700`                                             |
| `… Color` Light / Dark                   | `color/light.tokens.json`, `color/dark.tokens.json`        | `color.bg.surface`, `color.text.primary`                        |
| `… Space`                                | `foundation.tokens.json`                                   | `space.4`, `radius.md`, `border-width.focus`, `size.control-md` |
| `… Motion` Default / Reduced             | `motion/default.tokens.json`, `motion/reduced.tokens.json` | `duration.fast`, `easing.spring`, `scale.press`                 |
| `… Responsive` Mobile / Tablet / Desktop | `viewport/{mobile,tablet,desktop}.tokens.json`             | `grid.columns`, `layout.sidebar`, `type.h1`                     |
| `Typography-styles.Grove\|Nizivo.*`      | `typography.tokens.json`                                   | `font.label.m`, `font.body.m-strong`                            |
| `Effect-styles.Grove\|Nizivo.*`          | `effects.tokens.json`                                      | `elevation.1`, `focus.ring`, `surface.inner-highlight`          |

- **Allowlist.** Collections `Grove *` / `Nizivo *` and style groups `Grove` / `Nizivo`; both map to
  `nz`. Anything else is skipped and listed in the run summary. An allowlisted collection with no
  mapping, or one collection exported under both prefixes, is an error.
- **Identity.** Every variable token carries `$extensions["dev.nizivo.figma"]` =
  `{ variableId, collectionId, name, scopes }`; text styles carry `{ styleId, name,
  letterSpacingPercent }`. A variable id must sit at the same path in every mode, and every mode
  must hold the same ids. `figmaIds()` maps id → token id for the override and drift checks.
  The collection display name, `codeSyntax` and `createdAt` are **not** copied, so the
  Grove → Nizivo rename changes nothing in `src/figma-owned` (the both-prefix test is byte-exact).
- **FLOAT by group.** Figma FLOATs have no unit. `space`, `radius`, `size`, `distance`, `magnetic`,
  `grid` (except columns), `layout`, `type`, `section` → `dimension` rem (px ÷ 16).
  `border-width` → `dimension` px. `duration`, `stagger` → `duration` ms. `scale`, `tilt`,
  `grid.columns` → `number`. A group with no rule is an error, so a new Figma group needs a
  reviewed mapping.
- **Easings.** `cubic-bezier(a, b, c, d)` → `cubicBezier [a, b, c, d]`; `linear` → `[0, 0, 1, 1]`;
  `spring(m, k, c, v)` → `cubicBezier [0.3, 0, 0, 1]` (r7 §7.2's stand-in) plus
  `$extensions["dev.nizivo.spring"] = { mass, stiffness, damping, velocity }` (order assumed, §13.1).
- **Colours.** sRGB objects kept as exported; `hex` cut to 6 digits (DTCG keeps alpha in `alpha`).
  Aliases are rewritten through the same collection map: `{Grove Primitives.neutral.50}` →
  `{color.p.neutral.50}`.
- **Text styles.** `fontFamily` (string, as in Figma), `fontSize` rem, `fontWeight`,
  `lineHeight` = percent ÷ 100, `letterSpacing` = percent × font size, in rem, with the percent kept
  in the extension (rounded to 4 places: Label/L's float32 `-0.20000000298023224%` becomes `-0.2`).
  `fontStyle: normal`, `textDecoration: NONE`, `textCase: ORIGINAL` and zero paragraph spacing or
  indent are dropped; any other value is an error until DTCG or our CSS has a place for it.
- **Effects.** `shadow` arrays with px geometry; `inset` only when true. `Elevation/1 Card` →
  `elevation.1` (a leading number names the step, matching plan §7.2's `--nz-elevation-1`).
- **Determinism.** Group keys are sorted numeric-aware (JavaScript then lists integer keys first:
  `space.0 … 24`, then `0-5`, `1-5`); token keys are always `$type, $value, $description,
  $extensions`; the files are printed in oxfmt's JSON layout. Key order or file order in the export
  does not change a byte (tested with a shuffled export).
- **`--check`.** Byte-compares every expected file and fails on missing, changed or extra `*.json`
  files under `src/figma-owned`.

## Emitted CSS names (Terrazzo 2.8.0, `variableName` from plan §7.3)

- Colours: `--nz-p-green-700` (primitives), `--nz-bg-surface`, `--nz-text-primary`,
  `--nz-border-focus`, `--nz-icon-brand`, `--nz-chart-cat-1`. No `--nz-color-*`.
- Foundation: `--nz-space-4`, `--nz-space-0-5`, `--nz-radius-md`, `--nz-border-width-focus` (px),
  `--nz-size-control-md`, `--nz-size-touch-min`.
- Motion: `--nz-duration-fast` (140ms), `--nz-easing-standard`, `--nz-easing-spring`,
  `--nz-distance-lift`, `--nz-scale-press`, `--nz-tilt-max-deg`, `--nz-stagger-item`,
  `--nz-magnetic-pull`.
- Responsive: `--nz-grid-columns`, `--nz-grid-gutter`, `--nz-layout-sidebar`,
  `--nz-layout-content-max`, `--nz-type-h1`, `--nz-section-gap`.
- Effects: `--nz-elevation-1` … `--nz-elevation-4`, `--nz-focus-ring`, `--nz-focus-ring-critical`,
  `--nz-surface-inner-highlight`.

**Typography from text styles** (the open question of plan §7.1 and §7.6). Each text style emits a
shorthand plus five sub-values; for `Nizivo/Label/M`, as built since week 2 (week 1 emitted the family
as `"Geist"` and the fifth sub-value as `--nz-font-label-m-letter-spacing: 0rem`):

```text
--nz-font-label-m: var(--nz-font-label-m-font-weight) var(--nz-font-label-m-font-size)/var(--nz-font-label-m-line-height) var(--nz-font-label-m-font-family);
--nz-font-label-m-font-family: var(--nz-font-family-sans);
--nz-font-label-m-font-size: 0.875rem;
--nz-font-label-m-font-weight: 500;
--nz-font-label-m-line-height: 1.4;
--nz-tracking-label-m: 0em;
```

The 18 shorthands: `--nz-font-display-l`, `-display-m`, `-heading-h1` … `-h4`, `-body-l`, `-body-m`,
`-body-m-strong`, `-label-l`, `-label-m`, `-label-m-strong`, `-numeric-display`, `-numeric-kpi`,
`-numeric-l`, `-numeric-m`, `-mono-m`, `-mono-m-strong`. Week 2 adds the proposals `--nz-font-body-s`
and `--nz-font-label-s`, and a `--nz-tracking-<style>` for each of the 20.

| Plan name                                                 | Emitted                                          | Verdict                                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--nz-font-label-m` (a `font` shorthand)                  | `--nz-font-label-m`                              | **matches** (its value is var() references, not literals)                                                                                                                           |
| `--nz-font-body-s`, `--nz-font-label-s` (12 px proposals) | `--nz-font-body-s`, `--nz-font-label-s`          | **match** (W2: built from the proposals at `font.body.s` / `font.label.s` in `src/code-owned/proposals.tokens.json`). Figma styles `Body/S` and `Label/S` normalize to the same ids |
| `--nz-tracking-label-m`                                   | `--nz-tracking-label-m` (em)                     | **matches since W2.** W1 emitted `--nz-font-label-m-letter-spacing` in rem; W2 renames it through `subValueVariableName` and emits `em` from `letterSpacingPercent`                 |
| `--nz-font-family-sans`, `--nz-font-family-mono`          | `--nz-font-family-sans`, `--nz-font-family-mono` | **match since W2:** code-owned in `src/code-owned/foundation.tokens.json`; every style's family sub-value points at one of them                                                     |

## Problems and open items

1. `Surface/Glass` arrives as `$type: "blur"` (24 px background blur, no DTCG type) and is
   skipped; its drop shadow was already lost by TokensBrücke, and `Surface/Liquid Glass` is not
   exported at all. Week 2 decides on a code-owned backdrop token. **Still open after week 2.**
2. TokensBrücke exports no style id for effect styles, so effect tokens are identified by name only.
   Text styles have `styleId`.
3. ~~`--nz-easing-spring` is `cubic-bezier(0.3, 0, 0, 1)` until the week 2 transform emits the spring
   generator's `linear()`.~~ **Closed in week 2:** `src/code-owned/motion-derived.tokens.json`
   (generated) carries the `linear()` easings and their durations. Reduced easings print as `linear`.
4. ~~Shorthand families are the literal `"Geist"`; letter spacing is in rem.~~ **Closed in week 2:**
   families are `var(--nz-font-family-sans|mono)` and tracking is `--nz-tracking-<style>` in `em`.
5. `--nz-radius-full` becomes `62.4375rem` (999 px ÷ 16). `--nz-tilt-max-deg` is a unitless `6`.
6. Descriptions are copied verbatim, so `&quot;Other&quot;` from Figma reaches the token JSON. Since
   week 2 `tokens.css` carries no description comments.
7. ~~The `[data-nz-theme="dark"]` block; `@media (--nz-sm)` / `(--nz-lg)` placeholders.~~ **Closed in
   week 2:** colours are `light-dark()` on `:root`; the media queries are substituted from the
   code-owned breakpoints, and `custom-media.css` publishes them.
8. ~~The raw files are not `oxfmt`-clean.~~ **Closed:** `packages/tokens/figma/raw/**` is in
   `.oxfmtrc.json` `ignorePatterns`.
9. `Elevation/0 Flat` had no effects, and TokensBrücke 3.18.0 crashes on an empty effect style
   (plugin and CLI), so `scripts/figma/raw.ts` leaves such styles out of the CLI input. Since
   2026-10-14 the style holds one invisible DROP_SHADOW (alpha 0, offset 0, radius 0, spread 0), so
   the next export should not crash on it and will carry `elevation.0` (`--nz-elevation-0`).
   Code-owned tokens define only `elevation.button`, so nothing collides. Checked in a scratch run:
   the committed snapshot with the Nizivo names and that shadow, through the 3.18.0 CLI and the
   normalizer, leaves nothing out and differs from `src/figma-owned` only by `elevation.0` in
   `effects.tokens.json`. `test/normalize.test.ts` covers the normalizer step of the same case
   (the CLI's layer added to the renamed export). Keep the empty-effects filter in `raw.ts` until a
   fresh export proves it unnecessary. When the token lands:
   - `test/normalize.test.ts` expects elevation keys `1`–`4` and 7 effect tokens;
   - ~~`elevation()` in `build/css.ts` puts the `--nz-elevation-ring` layer on every
     `elevation.<n>`, so `--nz-elevation-0` would draw a 1 px ring in dark (white at 8 %).~~
     **Decided 2026-10-14:** an elevation whose every layer has alpha 0 takes no ring and no
     highlight, so the token builds as `--nz-elevation-0: 0 0 0 0 transparent`
     (`test/elevation.test.ts`; `BUILD.md`, flat elevations);
   - the `tokens.css`, `tailwind.css` (`--shadow-nz-0`) and `contract.json` goldens gain the
     token.
