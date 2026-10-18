# Week 9 results

Recorded on 2026-10-18 (ARCHITECTURE.md §21.1 "Week 9 status"). Week 9 built the maintainer's decisions of 2026-10-17 and 2026-10-18 (§23.3 M31–M36) and the token work of NIZ-105 and NIZ-108: five builders worked in one tree (A: the token normalizer and the Figma sync; B: the Select list; C: Button and IconButton pending, `IconButtonStatic`; D: `FieldStatic`, Switch, Separator, Textarea and the chart tones; E: the static-or-interactive docs), and the integration regenerated once and ran every lane. Every number below comes from a command run on this machine (macOS 27.0.1, arm64, Node 24.16.0, pnpm 12.11.2), named with it; a figure that only a builder measured says so. Three reviewers then filed 22 findings ("Week 9 review" below), and the week landed as 17 commits on top of 565dc06, each passing its own `pnpm check`; the tokens builder's three commits were rebuilt into that chain (9b3c903 kept; the sync 6efb8d3 is now c04e503 and its docs commit 9e95d7c is now 6da4150), because alone the sync left `main` red. Nothing is pushed, tagged or published.

## The decisions

- **M31, the static exports (D-aa, NIZ-13):** "add the static exports, but also, in the docs, mention in what scenarios should a static vs normal component be used (not just for this components). with proper real life example as well. because most of the people now use AI to do the work, and for other AI agents, this level of description would be helpful."
- **M32, exit criterion 14:** "mine counts"; forced colours NIZ-28 "keep", NIZ-29 "keep", NIZ-30 "keep outline color, as in the image", NIZ-31 "Confirm, whatever we have (in the image) looks good", NIZ-32 "no hover cue", NIZ-33 "whatever we have for hover, we can use that right?"; NIZ-5 "exit 14 forced-colours: signed off"; NIZ-78 all 7 items signed off. No code change.
- **M33, `border-width/strong` (NIZ-106):** "A".
- **M34, `duration/spin` (NIZ-107):** "B".
- **M35, Separator's default (NIZ-112):** "A".
- **M36, Figma's component changes (NIZ-109):** "1. follow figma 2. keep tint, for label, follow figma 3. follow figma 4. follow figma".

## What changed

- **Tokens (builder A, committed).** The normalizer keeps a variable-bound effect colour as an alias (`{color.border.focus}`), printed as `var(--nz-border-focus)`, and reverses every effect style's layers into CSS paint order. The 2026-10-18 sync deleted all 14 a11y overrides and 18 of 19 proposals (Figma now defines them with the same values; `text.accent` remains), removed `--nz-border-width-strong` (M33), made `--nz-duration-spin` Figma's 800 ms with 0 ms under Reduced (M34), and took Figma's chart colours (M36 #1). Details: `packages/tokens/BUILD.md`, ARCHITECTURE.md §7.6 "The 2026-10-18 sync".
- **`IconButtonStatic` (M31, builder C).** `src/icon-button/icon-button-static.tsx` holds the element builder, `warnUnnamed` and `IconButtonStatic`, and imports no client module; `icon-button.tsx` and `icon-button.client.tsx` import the builder from it (the old import cycle is gone). `aria-label` is required; `label`, `tooltip` and `shortcut` are typed `never`.
- **`FieldStatic` (M31, builder D).** `src/field/field-static.tsx` holds the Field types, the anatomy and `FieldStatic`; Field's function child and a directly placed NativeSelect render through the same `staticField`, so their HTML is identical. The child must be a function and gets a second `field` argument (ids, `labelledBy`, `describedBy`); `messages` and `validateOn` are typed `never`; an element child from plain JavaScript throws "FieldStatic: children must be a function; put an element in a Field" (review A11Y-6). Input and Textarea now read the `aria-invalid` the child spreads on them, as NativeSelect does, so they show their invalid look (review A11Y-2). The integration put the literal `data-slot` and class back on the root object (as week 8's `field.tsx` had) so `nz api` finds the root.
- **Button and IconButton pending (M34, builder C).** Button renders `<span class="nz-button-pending-label" data-slot="button-pending-label" aria-hidden="true">` ("Loading…", `labels.pending`) after the label while pending; `button.css` shows it only under `prefers-reduced-motion: reduce` and `[data-nz-motion='reduce']`, after a CSS middle dot. In a button that cannot grow (`fullWidth`, a narrow parent) the text takes only the room the label leaves, shortening to an ellipsis and then to nothing before the label wraps; `labels.pending: ''` renders no text, and a pending Button with no label shows no separator (review A11Y-1, A11Y-7). Both spinners read `--nz-duration-spin`, so they stop upright under Reduced. IconButton shows no text (a maintainer decision, below).
- **Select (M36 #2 and #3, builder B):** radius/md, Elevation/4, `sideOffset` 4, rows touch, Label/M rows with 8 / 12 px padding, the selected row Label/M Strong in text/primary on the kept brand-subtle tint with the check, Label/S group labels in text/secondary, 4 px around a divider.
- **Textarea (M36 #4), Switch (M33), Separator (M35), chart tones (builder D):** Textarea 12 px padding and a 112 px minimum (new hook `--nz-textarea-min-block-size`); the Switch invalid ring 1 px; `decorative` defaults to `true`; Meter, ProgressBar and ProgressRing read `--nz-chart-success` and `--nz-chart-neutral`.
- **Tooling (integration).** `nz api` treats a `<Name>Static` export as its base's twin: its slots are recorded as rendered by `<Name>`, and both roots are `kebab(<Name>)` (`packages/tooling/api/react.ts`; rule in `API-JSON.md`; a new test in `test/api.test.ts` fails without it with "ChipStatic renders data-slot "chip" as its root; §8.2 names it "chip-static"" and "data-slot "chip" is rendered by ChipStatic and Chip").
- **Docs.** A new guide, "Static or interactive: choosing a component" (builder E), a "Static or interactive" section on all 37 component pages, which `llms-full.txt` now carries (`app/llms-full.txt/route.ts` appends each notes file's processed Markdown after Import; before, none of the 37 sections reached it); pages updated for Select, Textarea, Separator, Switch, Button and IconButton pending, Field and IconButton bundle notes; a Week 9 section on Deviations; the Deviations generator accepts zero overrides; three recorded builder choices updated where Figma now decides (ProgressBar tones, Textarea, Select).

## Regeneration

One pass: `nz gen` (5 files: `design/component-map.json`, `src/button/index.ts`, `src/field/index.ts`, `src/icon-button/index.ts`, `src/index.ts`), `TURBO_FORCE=true pnpm build`, `nz api` (16 files: `contracts/api/css/{button,meter,progress-bar,progress-ring,select,switch,textarea}.json`, `contracts/api/react/{alert,button,dialog,field,icon-button,index,select,separator,textarea}.json`; `react/field.json` once more after the slot fix), `node fixtures/floor-lane/gen-w5.ts` (up to date: no page change), `node packages/tooling/size/measure.ts --write` (never `--rebase`), and `pnpm tokens:contrast` (CONTRAST.md, after adding `bg-brand-subtle` to the `text-primary` pair: the selected Select label is text/primary on the tint now; 15.29 light, 15.68 dark). `pnpm gen:check` then passes (`nz api --check`: up to date, 78 files). After the review fixes: `nz gen` (up to date), `nz api` (`contracts/api/css/button.json`, `react/{alert,button,icon-button}.json`: the JSDoc and the narrow-button rules), `pnpm tokens:contrast` (76 checked pairs: 5 new pairs for the tokens no component uses yet, review R2-4) and `measure.ts --write` again.

## Size

`pnpm size` passes. Every entry whose `measured` moved (gzip, size-limit), week 8 → week 9:

| Entry                                 | Week 8 | Week 9 | Budget              |
| ------------------------------------- | -----: | -----: | ------------------- |
| `@nizivo/react` (`.`)                 | 86,198 | 86,523 | 93 KiB              |
| `./button`                            |  1,232 |  1,275 | 1.4 KiB             |
| `{ Button }` from the barrel          |  1,232 |  1,277 | 1.4 KiB             |
| `./checkbox`                          |  2,071 |  2,065 | 2.3 KiB             |
| `./field`                             |  3,463 |  3,604 | **3.4 → 3.9 KiB**   |
| `./icon-button`                       | 17,299 | 17,368 | 19 KiB              |
| `./input`                             |  1,817 |  1,833 | 2 KiB               |
| `./segmented-control`                 |  2,371 |  2,368 | 2.6 KiB             |
| `./select`                            | 63,259 | 63,254 | 66 KiB (§17.1)      |
| `./switch`                            |  1,735 |  1,730 | 1.9 KiB             |
| `./textarea`                          |  1,355 |  1,364 | 1.5 KiB             |
| dashboard set (§17.1)                 | 77,378 | 77,362 | 76 KiB (462 B left) |
| `{ Select }` from the barrel          | 63,189 | 63,170 | 68 KiB              |
| `own: field/field-scope.client`       |  1,490 |  1,496 | 1.6 KiB             |
| `own: icon-button/icon-button.client` |    349 |    353 | 0.4 KiB             |
| `own: input/input.client`             |    692 |    721 | 0.8 KiB             |
| `own: textarea/textarea.client`       |    316 |    350 | 0.4 KiB             |
| `css/button.css`                      |  1,007 |  1,164 | **1.1 → 1.3 KiB**   |
| `css/meter.css`                       |    663 |    657 | 0.8 KiB             |
| `css/progress-bar.css`                |    807 |    800 | 0.9 KiB             |
| `css/progress-ring.css`               |    519 |    509 | 0.6 KiB             |
| `css/select.css`                      |  1,244 |  1,237 | 1.4 KiB             |
| `css/switch.css`                      |    884 |    883 | 1 KiB               |
| `css/textarea.css`                    |    725 |    751 | 0.8 KiB             |
| `styles.css`                          | 14,942 | 15,173 | 16 KiB              |
| `@nizivo/tokens` (JS)                 |  2,309 |  2,377 | 2.5 KiB             |
| `@nizivo/tokens/contract.json`        |  3,247 |  3,316 | 3.5 KiB             |
| `@nizivo/tokens/tailwind.css`         |    764 |    817 | 0.9 KiB             |
| `@nizivo/tokens/tokens.css`           |  3,879 |  3,957 | 4.2 KiB             |
| `@nizivo/tokens/tokens.json`          |  8,887 | 10,399 | **9.6 → 12 KiB**    |

- **Three own-code budgets raised, measured + 10% rounded up by `limitKiB()`** (to 0.1 KiB below 10 KiB, to 1 KiB from 10 KiB; §17.3; none is a §17.1 entry), in their own labelled size commit before the changes that need them: `./field` 3,604 B × 1.1 = 3,964 B → 3.9 KiB (the `FieldStatic` export, its types and its child check; 3,463 B, 18 B under 3.4 KiB, in week 8); `css/button.css` 1,164 B × 1.1 = 1,280 B → 1.3 KiB (the Reduced-motion pending text, then the review's rules that let it give way in a button that cannot grow); `@nizivo/tokens/tokens.json` 10,399 B × 1.1 = 11,439 B → 12 KiB. The integration first recorded 11.2 KiB for tokens.json, below the rule, which the next `--rebase` would have moved to 12 (review R2-2).
- **What grew `tokens.json`** (review R2-3): 9 more tokens, the 3-layer focus rings, the per-theme alias resolutions, and mostly Figma's variable descriptions, which the sync now carries: 15 → 45 descriptions, 1,528 → 3,549 characters (in the golden). Stripping every description from today's `dist/tokens.json` takes it from 10,432 to 8,521 B (node gzip -9), so about 1.9 KB is description text. Whether the published `tokens.json` should carry descriptions, or only `index.d.ts`'s JSDoc, is a maintainer question (below).
- No §17.1 limit moved and none is exceeded: Tooltip 16,372 B (12 B under 16 KiB, unchanged), Dialog 32,127 B (32 KiB, unchanged), Tabs 33,683 B, Menu 56,711 B, Select 63,254 B, the dashboard set 77,362 B (462 B under 76 KiB).
- Tight, reported: Tooltip 12 B; `own: alert/alert-dismiss.client` 15 B (unchanged); the dashboard set 462 B.
- `IconButtonStatic` alone has no size entry; builder C measured it at 1,418 B gzip through `./icon-button` (1,420 B through the barrel) with esbuild, not re-run here.

## Visual regression

`node scripts/visual/run.ts` (compare, ±2 per channel) on the integrated tree: 1,564 shots of 78 examples × 4 modes; 1,280 identical, 135 within the tolerance, 149 problems: 113 changed and 36 new. Each group was opened before and after (baseline, render, diff), light, dark and forced:

- **Button (8):** the pending "Publishing" example now reads "Publishing · Loading…", because the lane runs with reduced motion (M34): `basic--rest--*` in 4 modes and `basic--focus-6-button--*` (151 × 64 → 231 × 64). Intended.
- **Select (28), every open-popup shot:** radius 12 px, Elevation/4, rows touching, Label/M rows, the selected row bold in text/primary on the tint with the check, the Label/S group label, 4 px around the divider; forced colours keep M32's looks (Highlight row with the inset ring, no hover cue). Matches Figma 7356:401/402/404/406. Intended.
- **Textarea (52) and Tabs `manual--*` (8, which hold a Textarea):** 12 px padding, the 112 px minimum (`states--rest` 444 × 361 → 444 × 496). Matches Figma 7367:316. Intended.
- **Switch `field--*` light and dark (8):** the invalid ring 1.5 → 1 px (M33); forced modes unchanged. Intended.
- **Meter, ProgressBar, ProgressRing `basic--rest--dark` (3):** the brand fill green-400 → green-300 (`chart-primary` dark, M36 #1). In dark, `chart-primary` and `chart-success` are now the same green-300, so a brand and a success fill look alike there (Figma's values; the tone is not colour-only in any of them: each has a label and a value). Intended.
- **IconButton `states--*` (6), 5 to 10 px each:** anti-aliasing only, deterministic over two runs. In the hover crops, the many 1/255 pixels along the tooltip's shadow edge come from the elevation-3 drop-shadow layers swapping order in the sync (the ±1 rounding the tokens builder predicted; review R2-5). Unexplained: up to 16/255 in 5 to 7 pixels of the pressed button's "B" glyph (for example `#A0BBAD` → `#90B09F`) in the light and dark hover crops, and the forced-crop column next to the pending button (whose spinner now has a 0 ms duration under reduced motion). No drawn change; accepted.
- **New (36):** `icon-button/static--*` (28) and `field/static--*` (8), the two new examples; they match `IconButton tooltip={false}` and the zero-JS Field.
- **Within the tolerance (135):** elevation's layer swap (Dialog, Menu, Tooltip, light; ≤ 2 per channel) and SegmentedControl in dark.

Nothing outside those groups moved. `--update` wrote 36 new and 113 changed baselines (0 removed; 1,564 files); then two full compares: 1,421 identical and 143 within the tolerance, then 1,429 and 135; no problems in either. After the review fixes, two more full compares: 1,426 identical and 138 within the tolerance in each, no problems (the narrow-button rules and the Input and Textarea `aria-invalid` change move no example's pixels).

## Floor lane

Week 2, 3 and 5's commands on the built packages, Firefox 129.0 from Mozilla's release archive (week 7's download), plus `--touch` (Chromium and WebKit) and `--ios-sim`. The pages changed for M36 (Textarea: `padding` and `minimum` checks, absolute `rows` and `field-sizing` expectations; Select: `row-gap` 0, `item-selected-text` text/primary, new `item-selected-weight` and `separator-margin`, `popup-edge` radius/md and Elevation/4) and for the layer order (the elevation probe in `halo-inverse.js` compares a shadow's layers as a set):

| Run (both OS schemes; per scheme)  | `w3-controls` | `w5-components` | `w5-paint` | `w5-grid` |
| ---------------------------------- | ------------: | --------------: | ---------: | --------: |
| Firefox 129.0                      |         22/22 |         223/223 |      29/29 |     39/39 |
| Chromium 156.0.8078.4              |         22/22 |         223/223 |      29/29 |     39/39 |
| WebKit 27.2                        |         22/22 |         223/223 |      29/29 |     39/39 |
| Chromium 156.0.8078.4, `--touch`   |         22/22 |         223/223 |      29/29 |     39/39 |
| WebKit 27.2, `--touch`             |         22/22 |         223/223 |      29/29 |     39/39 |
| Mobile Safari 17.5 (iOS 17.5 Sim.) |         22/22 |         223/223 |      29/29 |     39/39 |

- Week 8: `w3-controls` 20 and `w5-components` 219 per scheme. The first w5 run, before the Select checks were updated, failed exactly the 4 checks that M36 changes (row gap, selected text, group label colour, popup radius), on every engine.
- The week 2 mechanism pages on the synced `tokens.css` (`--pages nesting,halo-inverse,overlay-entry,paint.html-none,paint.html-dark`, recorded in `results/w2-real-tokens`): every page's summary equals week 2's on all four engines, and Firefox 129.0 fails the same 166 D1 cells and no other. Before the probe change, `halo-inverse` failed 48 cells per scheme on every engine: the right theme's shadow, in the new layer order.
- The Textarea's 112 px minimum holds without `field-sizing` (Firefox 129, WebKit 27.2, Mobile Safari 17.5).
- Three Simulator devices were created and deleted; `xcrun simctl list devices | grep -c nz-floor` printed 0.
- Not re-run after the review fixes: those change only `.nz-button-pending-label` and the label it follows (no floor page renders a pending Button), and the React side of Input and Textarea (the floor pages are static HTML); `floor:check` shows the generated page unchanged.

## Fixtures

Recorded with `--record` on a fresh build and pack each, once by the integration and again after the review fixes (the numbers here): `node fixtures/runner/next.ts --dev --record`, `node fixtures/runner/vite.ts --record` (the first attempt died during the package install with `setTypeOfService EINVAL`, a transient socket error; the retry passed), `node fixtures/runner/astro.ts --record`. Next (four modes, 25 pages: the two new ones below), Vite (12 pages) and Astro (12 pages) pass: 0 failures, 0 console messages, 0 build warnings, 0 axe violations, no theme flash. **Every existing page's set of client modules (planted markers) is the same as week 8's, in every mode.**

The static twins, gzip -9 of every chunk the page loads minus `/button-only` (174,639 B Turbopack, 171,889 B webpack and webpack + OPI, 818,350 B `next dev`):

| Page                                          | Turbopack | webpack | webpack + OPI | `next dev` | W7 "D-aa" (copy of the repo) |
| --------------------------------------------- | --------: | ------: | ------------: | ---------: | ---------------------------- |
| `/icon-button-static` (new)                   |         0 |       0 |             0 |          0 | 0 in all three modes         |
| `/field-static` (new)                         |         0 |       0 |             0 |          0 | 0 in all three modes         |
| `/icon-button` (`IconButton tooltip={false}`) |   +20,802 |       0 |             0 |    +62,742 | +20,805 / 0 / +62,124        |
| `/field-zero-js` (`Field`, zero-JS paths)     |    +3,364 |       0 |             0 |     +8,551 | +3,035 / 0 / +7,800          |

- Both new pages ship no `@nizivo` client marker in any mode; their spec entries allow none.
- Other pages move by −143 to +456 B against week 8 (`/icon-button` and `/icon-button-tooltip` +456 B under `next dev`, where the builder now sits in its own module). `/barrel-select` under plain webpack still shows the 16 known leaked modules (S2c), as in week 8.
- Against week 8, Vite: `/barrel-select` −258 B, `/overlays` −256, `/forms` +138, `/button-only` +59, `/t0-barrel` +58; Astro: `/overlays` −257, `/forms` +206, `/two-islands` +114. The byte tables in `fixtures/vite/RESULTS.md` and `fixtures/astro/RESULTS.md` are re-synced with the recorded JSON.

## Lanes

Run one after another (`NZ_BROWSER=<engine> pnpm test:overlay`, then `pnpm test:browser`), last after the review fixes:

- **Overlay conformance:** Chromium 128 passed and 7 skipped; WebKit 122 passed and 13 skipped; Firefox 122 passed and 13 skipped (week 8: 127, 121 and 121).
- **Browser lane:** Chromium 150 of 150 (week 8: 138; plus `button.spec.tsx`, whose narrow-button, empty-text and `prefers-reduced-motion` cases came with the review); Firefox 130 passed and 20 skipped; WebKit 122 passed, 20 skipped and 8 failed: the 7 known Tab failures on macOS (IconButton 2, SegmentedControl 3, Tabs and TabNav 2; W6-RESULTS.md "Lanes") and Tabs "styles", which read the indicator mid-transition (alpha 0.243) and passed when `tabs.spec.tsx` ran again alone (2 known failures).
- **Node suites:** `@nizivo/react` 46 files, 687 tests; `@nizivo/tooling` 12 files, 175 tests (the new twin test; one skips until the packages are built); `@nizivo/tokens` 8 files, 92 tests; `@nizivo/icons` 4 files, 35 tests.

## Gate

`TURBO_FORCE=true pnpm check` from clean passes (164 s for the integration's run): install (frozen lockfile), typecheck, lint, `gen:check`, the node suites, build, `check:a11y` (76 pairs after the review, 0 overrides, 1 proposal), `size`, `floor:check`, `test:dist`, `check:release` and `docs:check` (the smoke: all checks on 59 pages; 37 "Static or interactive" sections in `llms-full.txt`). Two earlier runs failed and were fixed: `oxfmt --check` on this file, then the docs smoke's "deviations: 0 override rows", which required at least one override; `apps/docs/scripts/smoke.ts` now expects exactly as many rows as the override files hold, and with none, the page's "None." note.

After the review fixes the same command passed again from clean, and each of the 17 commits passed its own `pnpm check` in a detached worktree started at 565dc06 (`gate-commits.sh`, every step of the root `check` script per commit). The last commit's tree equals the integrated tree.

## Week 9 review

Three reviewers (accessibility behaviour; tokens, visuals and size; API, DX, docs and plan), 22 findings. 21 fixed, 1 left to the maintainer.

| Id     | Finding                                                                                                                                                                       | Outcome                                                                                                                                                                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A11Y-1 | Under Reduced motion a pending Button that cannot grow (`fullWidth` at 288 px, a 160 px parent) squeezed its label onto more lines than the button's height (67 px in 48 px). | Fixed: the pending text has a 0 basis and grows up to its own width, so it shortens to an ellipsis and then to nothing first; its gap moves inside it. Browser cases at 288 and 160 px in three engines; the old CSS fails them. The free-width jump stays a maintainer question. |
| A11Y-2 | FieldStatic around Input or Textarea: `aria-invalid="true"` on the control, but no invalid look.                                                                              | Fixed: Input and Textarea take `invalid ?? aria-invalid`, as NativeSelect; SSR test for both, and an explicit `invalid={false}` still wins.                                                                                                                                       |
| A11Y-3 | "Loading…" is visible English text that only translates per instance; §16.4 promised global labels.                                                                           | Fixed in docs: the Button page says translation is per instance and shows an app wrapper; §16.4 records that global labels are not built and why this string raises their priority.                                                                                               |
| A11Y-4 | The 1 px inset invalid ring on the Switch track has almost no contrast against the track.                                                                                     | Left to the maintainer (M33 chose the 1 px ring); options above.                                                                                                                                                                                                                  |
| A11Y-5 | No test drove `prefers-reduced-motion` itself.                                                                                                                                | Fixed: a Chromium CDP case with the built tokens.                                                                                                                                                                                                                                 |
| A11Y-6 | An element child of FieldStatic crashed with "control is not a function"; the guide described it wrongly.                                                                     | Fixed: a clear error, an SSR test, and the guide's wording.                                                                                                                                                                                                                       |
| A11Y-7 | `labels.pending: ''` left a lone "·"; a label-less pending Button showed a leading one.                                                                                       | Fixed: no span for an empty text; no separator after an empty label.                                                                                                                                                                                                              |
| R2-1   | 9e95d7c (the tokens builder's last commit, before the rebuild) left `main` red (size, docs build) and the Switch ring unset; the proposed commit order kept it red.           | Fixed: the chain was rebuilt from 565dc06 with the size raise, the zero-override docs fix and the Switch ring ahead of the sync; every commit passes.                                                                                                                             |
| R2-2   | The 11.2 KiB `tokens.json` limit is not what `limitKiB()` gives.                                                                                                              | Fixed: 12 KiB, and the record says why.                                                                                                                                                                                                                                           |
| R2-3   | The `tokens.json` growth is mostly Figma's descriptions.                                                                                                                      | Recorded, with a maintainer question.                                                                                                                                                                                                                                             |
| R2-4   | New colour tokens had no contrast pairs.                                                                                                                                      | Fixed: 5 pairs (10 checks) for `text-inverse-accent`, `text-on-accent` on `bg-accent-pressed`, `text-code`, `text-code-muted` and `text-on-dark`; all pass.                                                                                                                       |
| R2-5   | The IconButton anti-aliasing cause was misattributed.                                                                                                                         | Fixed in "Visual regression" above.                                                                                                                                                                                                                                               |
| R2-6   | §12's `chart/secondary` dark figure (1.59:1) was stale.                                                                                                                       | Fixed: 2.84:1 light, 2.88:1 dark.                                                                                                                                                                                                                                                 |
| R3-01  | The guide's no-JS claims did not say they need subpath imports; FIELD-CONTRACT.md said the root barrel was safe.                                                              | Fixed in both.                                                                                                                                                                                                                                                                    |
| R3-02  | IconButtonStatic's JSDoc suggested it for static toolbars.                                                                                                                    | Fixed: only where visible text names the action; the `tooltip` prop says the same; contracts regenerated.                                                                                                                                                                         |
| R3-03  | The plan's "only the publish steps remain" left out exit criteria 8 and 10.                                                                                                   | Fixed in §1 and §21.1.                                                                                                                                                                                                                                                            |
| R3-04  | FIELD-CONTRACT.md still deferred the `/field-static` measurement.                                                                                                             | Fixed: it cites the recorded 0 B.                                                                                                                                                                                                                                                 |
| R3-05  | Two new snippets (Button "Pending", Separator) were sibling JSX roots.                                                                                                        | Fixed: fragments.                                                                                                                                                                                                                                                                 |
| R3-06  | "aria-label (or aria-labelledby)" read as if either were enough.                                                                                                              | Fixed in the guide, the JSDoc and the contract.                                                                                                                                                                                                                                   |
| R3-07  | "renders its full HTML on the server" overclaimed for closed popups.                                                                                                          | Fixed.                                                                                                                                                                                                                                                                            |
| R3-08  | AlertDismiss's public description carried an internal to-do.                                                                                                                  | Fixed: moved to a code comment; `alert.json` regenerated.                                                                                                                                                                                                                         |
| R3-09  | §8.2 dated M31 by its build day.                                                                                                                                              | Fixed: decided 2026-10-17, built 2026-10-18.                                                                                                                                                                                                                                      |

## Maintainer decisions (open)

- **IconButton pending under Reduced motion (M34) does not fully meet Figma's rule** ("Spinner and skeleton loops stop; a text label shows"): the stopped glyph and `aria-disabled` are the whole cue. Options: (a) accept, with the docs' rule to show progress in words next to it or use a Button (built; on the Deviations page; recommended); (b) the pending text in the tooltip (weak: tooltips close on press, and `IconButtonStatic` has none); (c) widen the button to show text (breaks the square control).
- **Button pending text:** built as the label kept plus "· Loading…" after it (Figma's Button: "keep the label"; the Spinner: "a “Loading…” label is shown"); at free width the button widens by the text when `pending` toggles ("Publishing" 102.8 → 211.3 px, review A11Y-1). Where it cannot grow, the text now gives way (built in the review). Translation is per instance through `labels.pending` (no global labels in 0.1.0, §16.4; review A11Y-3). The alternative, visually replacing the label, keeps the width but drops "keep the label" and puts visible text outside the accessible name. Recommended: keep. Figma's Button asks for `aria-busy`; `aria-disabled` is kept as the plan has it.
- **`text/accent`, the one proposal left** (expires 2027-01-31): keep it for 0.1.0 and ask design for `text/accent` (recommended), or move the Toast action to `text/inverse-accent` and keep a separate accent for Heading and Text.
- **Select:** the selected label is text/primary (Figma) on the kept tint; the 16 px check column is reserved on every row; Figma's "min 240" width is not adopted. Each is a one-line change if the maintainer wants otherwise.
- **`--nz-textarea-min-block-size`,** a new public hook (default 7rem): keep (recommended; without it a one-line composer is impossible) or make 112 px fixed.
- **Field's function child** receives the second `field` argument at runtime (it shares `FieldStatic`'s render) but its type is unchanged; recommended: leave the type for 0.1.0.
- **The Switch's invalid ring (review A11Y-4):** M33's 1 px `border/critical` ring is drawn inset, on the off track itself: 1.22:1 light and 1.00:1 dark against the track (`border-control`), 4.33 and 4.01 against the page surface. Inside a Field the error text and its icon carry the state; a bare Switch with `aria-invalid` and no message has only the ring, told by hue. Options: keep (as decided), an outset 1 px ring that borders the page, or a critical-tinted track; each changes the Switch baselines.
- **Descriptions in `tokens.json` (review R2-3):** about 1.9 KB gzip of the 10,399 B is Figma's variable descriptions. Keep them in the runtime JSON (useful to tools and agents reading it), or ship them only in `index.d.ts`'s JSDoc and bring `tokens.json` back near 8.5 KB.

## Not verified

- **Real screen readers** on the new behaviour: Button's pending text is `aria-hidden` (the name stays the label, the state is `aria-disabled`), and `FieldStatic`'s wiring; checked only by DOM and SSR tests.
- **macOS Safari 17.5**, and the pending text on Firefox 129 and Mobile Safari 17.5 (the floor pages have no pending Button).
- **The media-query branch in WebKit and Firefox:** since the review, a Chromium case emulates `prefers-reduced-motion: reduce` over CDP with the built tokens (no override) and checks a 0 s spin, no running animation and the shown text; the other engines drive `[data-nz-motion='reduce']`.
- **`IconButtonStatic`'s own size** (builder C's esbuild figure only).
- **Select's trigger "open" look and Sm radius** from Figma (not in M36).
- **The out-of-scope Figma cards** (NIZ-113 to NIZ-120): Figma's token values were taken where the sync carried them (`--nz-bg-accent-pressed`, `--nz-focus-ring*` now 3 layers that follow the theme, `--nz-focus-ring-raised`), but no component was changed: Button accent pressed still uses `bg-accent-hover` (NIZ-116), and components still draw `--nz-focus-halo` at 28 % / 6 px against Figma's 16 % / 8 px (NIZ-113). Unused `chart-secondary` is 2.84:1 light and 2.88:1 dark on `chart/track` (builder A).

## Follow-ups (not done, not decided)

- A size entry for `{ IconButtonStatic }` from `./icon-button`, so the twin's own cost is gated.
- `contrast-pairs.json`: the `icon-secondary` and `icon-success` pairs still check `chart-track`, which only the old progress fills needed (harmless extra checks). The pairs added for unused tokens should name their component once one uses them.
- A `border-critical` on `border-control` pair, or a documented exemption, once A11Y-4 is decided.
- `apps/docs/lib/deviations.ts` still throws when no proposal is left; one remains (`text/accent`), so it bites when that is decided.
- `AlertDismiss` and `Dialog.Close` could import `iconButtonElement` from the leaf-free `icon-button-static.tsx` instead of writing the markup out (builder C's estimate: about 280 B on Dialog, which has no headroom under 32 KiB).
- Figma's Button Pending hides the trailing icon; the code still renders it.
- The WebKit keyboard-focus failures in `icon-button.spec.tsx` (2, the known Tab-to-button behaviour of WebKit on macOS, as at HEAD).
- Figma canonical ids in `component.json` for Separator (7370:95) and Textarea (7367:316) wait for NIZ-118.
- The Select trigger's `State=Open` look (border/focus and Focus/Ring while open) and its Sm radius (Figma radius/md, code radius/sm), in Select and NativeSelect.
