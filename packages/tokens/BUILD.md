# The token build: sources → Terrazzo 2.8.0 → dist/

Date: 2026-10-14 (week 2). This replaces the week 1 dry run (`figma/DRY-RUN.md`, kept as the record
of the export and the names Terrazzo emits). Plan: ARCHITECTURE.md §7, §13.1, §15.

## Commands

Run from `packages/tokens`:

| Command                 | What it does                                                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build`            | tsdown (a placeholder `dist/index.js`), then `tz build` (which writes the real `.` entry), then the a11y gate (`scripts/a11y.ts`)                                                |
| `pnpm tokens:build`     | `tz build -c build/terrazzo.config.ts` only; `NZ_TOKENS_OUT_DIR=<dir>` moves the output                                                                                          |
| `pnpm tokens:check`     | `tz check`: the resolver and every source validate                                                                                                                               |
| `pnpm tokens:normalize` | `figma/raw/**` → `src/figma-owned/**` (`:check` is the invariant; unchanged from week 1)                                                                                         |
| `pnpm tokens:spring`    | Figma `spring()` easings → `src/code-owned/motion-derived.tokens.json` (`:check` compares)                                                                                       |
| `pnpm tokens:contrast`  | builds, then rewrites `CONTRAST.md` from the built `tokens.css`                                                                                                                  |
| `pnpm test`             | goldens, the D1 rule, the floor guard, the matrix, the override checks, the spring invariant, `tokens.json` and the js-refs entry against `tokens.css` and a consumer type check |
| `pnpm test -u`          | rewrites `test/golden/*.golden` after an intended change; review the diff                                                                                                        |

`NZ_TOKEN_PREFIX=acme` rebuilds every variable and custom media name with another prefix (§7.3).
Published packages always use `nz`.

## Sources and resolution order

`src/nizivo.resolver.json` (DTCG 2025.10). Within a set or context, later sources win; the a11y
overrides are always the last source of their theme context (§15.4).

| Set or context   | Sources, in order                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `primitives`     | `figma-owned/primitives`                                                                                        |
| `foundation`     | `figma-owned/foundation`, `typography`, `effects`, `code-owned/foundation`, `code-owned/proposals`              |
| `theme.light`    | `figma-owned/color/light`, `code-owned/color/light`, `code-owned/proposals/color/light`, `a11y/light.overrides` |
| `theme.dark`     | `figma-owned/color/dark`, `code-owned/color/dark`, `code-owned/proposals/color/dark`, `a11y/dark.overrides`     |
| `motion.default` | `figma-owned/motion/default`, `code-owned/motion-derived` (generated), `code-owned/proposals/motion/default`    |
| `motion.reduced` | `figma-owned/motion/reduced`, `code-owned/motion/reduced`, `code-owned/proposals/motion/reduced`                |
| `viewport.*`     | `figma-owned/viewport/{mobile,tablet,desktop}`                                                                  |

`src/code-owned/**` follows the §7.6 placement rule:

- **Code-owned by nature** (no metadata): `foundation.tokens.json` (breakpoints `sm` 40rem and `lg`
  80rem with `app.nizivo.status: "provisional"`, z-index, `font.family.sans/mono`, `scheme.inverse`,
  `elevation.button`, `focus.halo`), `color/{light,dark}` (`elevation.ring`,
  `elevation.highlight`), `motion/reduced` (the spring durations at 120 ms) and the generated
  `motion-derived.tokens.json`.
- **Proposals** (`app.nizivo.proposal`: `figmaVariable` or `figmaStyle`, `reason`, `wcag`,
  `approvedBy`, `expires`): `proposals.tokens.json` holds the mode-independent ones; a proposal with
  a value per mode sits in `proposals/color/{light,dark}` or `proposals/motion/{default,reduced}`,
  with the same metadata in each. A file with nothing left in it stays as `{}`, so the resolver keeps
  its place in the order.
- **Overrides** (`app.nizivo.override`: `figmaVariableId`, `figmaVariable`, `figmaValueAtOverride`,
  `kind`, `reason`, `wcag`, `issue`, `approvedBy`, `expires`): `a11y/{light,dark}.overrides.tokens.json`.
  `kind` is `contrast`, `ladder` (Option A text ladder, the dark surface and border ladder) or
  `pairing` (dark `icon/critical` follows `text/critical`; Figma's red/500 passes 3:1 on its own).
- `a11y/contrast-pairs.json` lists the pairs the matrix checks; it is not a token source.

**The 2026-10-18 sync** (the first export under the Nizivo names): Figma adopted all 14 overrides
and 18 of the 19 proposals with the same values (the four primitives, `Body/S`, `Label/S`,
`bg/scrim`, `bg/accent-hover`, `bg/critical-hover`, `text/on-critical`, `icon/info`,
`border/control(-hover)`, `chart/warning`, `chart/critical`, `duration/fade`, `duration/pulse`,
`scale/enter`), so they were deleted; the override files and the motion proposal files are `{}`.
`text.accent` stayed a proposal (Figma added `text/inverse-accent` with the modes swapped instead)
until M42 (2026-10-20, item 14) removed it before 0.2.0: `--nz-text-accent` is no longer emitted,
its replacements are `--nz-text-brand` on page surfaces and `--nz-text-inverse-accent` on
`bg/inverse`, and the colour proposal files are `{}` too, so no proposal is left.
Figma now owns `duration/spin` (800 ms, 0 in Reduced: the spinner stops, decision M34), so the
code-owned `duration.spin` (1000 ms, kept turning in Reduced) is gone, and Figma deleted
`border-width/strong` (M33), so `--nz-border-width-strong` is no longer emitted.

## Outputs (`dist/`, exported from `package.json`)

| File                     | Content                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tokens.css`             | the layer statement, then `@layer nz.tokens`: `:root`, theme scopes, reduced motion, `width >= 40rem`, `>= 80rem`                                            |
| `custom-media.css`       | `@custom-media --nz-sm (width >= 40rem)` and `--nz-lg (width >= 80rem)` (provisional)                                                                        |
| `tailwind.css`           | `@theme inline`: `--color-nz-*`, `--radius-nz-*`, `--shadow-nz-*`, `--ease-nz-*` → semantic variables; literal `--breakpoint-nz-*`                           |
| `contract.json`          | prefix, layers, custom media, and every declared variable with its token id, type, `public` and sub-value part                                               |
| `tokens.json`            | every token's literal value per context, with provenance, alias and Figma identity (week 4; the shape is in `TOKENS-JSON.md`)                                |
| `index.js`, `index.d.ts` | the `.` entry: typed `var()` references per token group, `typography` parts, `breakpoints`, `springs` and the `tokens.json` types (week 4; `TOKENS-JSON.md`) |

`tokens.css`, built by `@terrazzo/plugin-css` with `build/css.ts`:

- **Theme:** one declaration per semantic colour, `light-dark(<light>, <dark>)` when the two differ
  (the dark value comes from the resolver captured by a pre plugin). Never `@property`, never a
  `[data-nz-theme]` colour block. `light-dark(` appears only inside `--nz-*` declarations
  (Deviations D1; asserted). `:root` sets no `color-scheme` (opt-in light); `[data-nz-theme]`
  `light`, `dark` and `system` set `color-scheme` and `--nz-scheme-inverse`;
  `[data-nz-scheme="inverse"]` takes `color-scheme: var(--nz-scheme-inverse)`.
- **Shadow layers:** Figma paints an effect list bottom-up (its last effect on top, as with fills);
  CSS `box-shadow` paints its first layer on top. The normalizer reverses every effect style's
  layers once, so `src/figma-owned/effects.tokens.json` and every output are in CSS order. Figma's
  Focus/Ring shows why: it lists the 8 px halo, the 4 px `border/focus` ring and the 2 px
  `bg/surface` gap, and only the reversed order keeps the gap visible. A layer colour bound to a
  variable is exported as an alias string (`{Nizivo Color.border.focus}`); the normalizer keeps it
  as a DTCG alias (`{color.border.focus}`) and the CSS prints `var(--nz-border-focus)`, so the ring
  follows the theme. `tokens.json` resolves it per theme.
- **Elevation 1–4:** a `0 0 0 1px var(--nz-elevation-ring)` layer (levels 3–4 also the inset
  `--nz-elevation-highlight`), then Figma's layers with each colour as `light-dark(<Figma>, black at
  min(0.6, 6 × alpha))` (gap report C §2.3; one colour when the two are equal).
- **Flat elevations:** an `elevation.<n>` whose every layer has alpha 0 paints nothing in either
  theme, so it takes no ring and no highlight: only Figma's layers, or `0 0 0 0 transparent` when
  it has none. The rule reads the layers, not the level. Figma's `Elevation/0 Flat` (one invisible
  drop shadow since 2026-10-14) arrived with the 2026-10-18 export and builds as
  `--nz-elevation-0: 0 0 0 0 transparent`; `test/elevation.test.ts` builds `src/` with the flat
  shape and checks that the goldens differ only by that token.
- **Typography:** `--nz-font-<style>` is the shorthand of its `var()` sub-values; `-font-family`
  is `var(--nz-font-family-sans|mono)`; letter spacing is renamed by `subValueVariableName` to
  `--nz-tracking-<style>` in `em` (Figma's percent ÷ 100). `--nz-font-family-sans` is
  `var(--font-geist-sans, "Geist"), ui-sans-serif, system-ui, sans-serif`; mono is the same shape
  with `--font-geist-mono`, `ui-monospace, "SFMono-Regular", "Menlo", "Consolas", monospace`.
- **Spring:** `--nz-easing-spring(-soft)` is the generator's `linear()` and
  `--nz-duration-spring(-soft)` its settle time (493 / 702 ms), equal to
  `@nizivo/tooling/spring/spring.golden.json`. Reduced mode: `linear` and 120 ms.
- **Scoped blocks:** reduced motion (`@media (prefers-reduced-motion: reduce)` and
  `[data-nz-motion="reduce"]`, 26 tokens each) and the two viewport media queries (9 each) use
  `only: { modifiers, sets: [] }`, so they hold only their own modifier's tokens.
- Translucent colours print as `rgb(r g b / a)`, `[0, 0, 1, 1]` easings as `linear`; Figma
  descriptions are not copied into the CSS. `--nz-css-version` carries the package version.

Sizes on 2026-10-14: `tokens.css` 22.6 KB (3.9 KB gzip), 334 declared names; `tailwind.css` 4.5 KB.

2026-10-18 sync: `tokens.css` 23.7 KB (4.0 KB gzip), 344 declared names; `tailwind.css` 4.9 KB;
`tokens.json` 109.0 KB (10.8 KB gzip, 246 tokens); `index.js` 13.6 KB (2.4 KB gzip).

Week 4 (2026-10-15): `tokens.json` 99.8 KB (8.9 KB gzip, 237 tokens); `index.js` 13.2 KB (2.4 KB gzip);
`index.d.ts` 49.6 KB (types only).

## The a11y gate (`scripts/a11y.ts`, `build/a11y.ts`)

Runs in `pnpm build` after `tz build`, and in the tests. It fails on:

1. **Contrast:** any pair in `contrast-pairs.json` below its threshold in light or dark, computed
   from the built `tokens.css` (WCAG 2.2 relative luminance, ported from
   `docs/research/phase2/scripts/contrast`). Text 4.5:1 at every size, 12 px included; non-text and
   focus 3:1; decorative and disabled rows are reported only. 82 checked pairs pass today.
2. **Drift:** an override's `figmaVariableId` no longer holds `figmaValueAtOverride` in Figma.
3. **Redundancy:** Figma now has an override's value; a `contrast` override whose Figma value passes
   every pair it touches; a proposal whose `figmaVariable` or `figmaStyle` Figma now defines.
4. **Expiry:** an override or proposal past `expires` (a warning 14 days before).
5. Missing or malformed metadata.

`CONTRAST.md` is the human-readable golden of the matrix, with the override and proposal tables
(the source for the Deviations page); `pnpm test` fails when it is stale.

## Goldens

`test/golden/<file>.golden` pins every `dist/` file byte for byte (`--nz-css-version` is masked).
The `.golden` extension keeps oxfmt from reformatting them.
