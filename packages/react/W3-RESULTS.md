# Week 3 results

Recorded on 2026-10-14 at week 3 integration (ARCHITECTURE.md §21.1 W3–4, first half: the Field system and form controls, NativeSelect, IconButton). Every number below comes from a command run on the integrated tree; the commands are given with each table. Not packed: `files` is `dist` and `THIRD_PARTY_NOTICES`.

## What shipped

11 new subpaths, 34 in all: `field` (Field, `useFieldControl`), `fieldset`, `input`, `textarea`, `native-select`, `checkbox`, `radio-group` (RadioGroup, Radio), `switch`, `segmented-control`, `icon-button` and `theme-script`. Tooltip gained `content` and `shortcut`. `InlineError`'s `icon` and `AlertDismiss`'s `children` are optional, with the inlined `circle-x` and `close` glyphs as defaults.

| Subpath                                                        | `component.json` tier | Client modules a page can ship                                                   |
| -------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| `field`                                                        | server                | `field/field-scope.client` (only for a non-function child)                       |
| `fieldset`                                                     | server                | none                                                                             |
| `native-select`                                                | server                | none                                                                             |
| `icon-button`                                                  | server (split)        | `icon-button/icon-button.client` and the Tooltip chain, with the default tooltip |
| `theme-script`                                                 | server                | none                                                                             |
| `input`, `textarea`, `checkbox`, `switch`, `segmented-control` | client                | their own leaf plus `field/field-scope.client`                                   |
| `radio-group`                                                  | client                | `radio-group/radio-group.client` only (the shell is a server Fieldset)           |

## Stylesheet sizes

Bytes of the integration build's `dist/css`. Raw is `wc -c`; gzip is `gzip -c <file> | wc -c` (Apple gzip 487.0.1, default level). The §17.2 target is ≤ 2 KB gzip per leaf file.

| File                        |   Raw |  Gzip |
| --------------------------- | ----: | ----: |
| `css/base.css`              | 2,980 |   908 |
| `css/checkbox.css`          | 2,829 |   866 |
| `css/field.css`             |   772 |   341 |
| `css/fieldset.css`          |   950 |   378 |
| `css/icon-button.css`       | 4,737 | 1,027 |
| `css/input.css`             | 2,728 |   829 |
| `css/native-select.css`     | 3,337 |   937 |
| `css/radio-group.css`       | 2,408 |   848 |
| `css/segmented-control.css` | 3,657 | 1,016 |
| `css/switch.css`            | 2,876 |   905 |
| `css/textarea.css`          | 2,262 |   718 |
| `css/tooltip.css` (changed) | 1,404 |   556 |
| `css/alert.css`             | 2,336 |   746 |
| `css/badge.css`             | 1,719 |   527 |
| `css/button.css`            | 4,168 | 1,013 |
| `css/card.css`              | 1,611 |   603 |
| `css/container.css`         |   316 |   198 |
| `css/delta.css`             | 1,135 |   466 |
| `css/dialog.css`            | 2,110 |   749 |
| `css/empty-state.css`       | 1,076 |   493 |
| `css/grid.css`              | 3,486 |   543 |
| `css/heading.css`           | 2,030 |   410 |
| `css/image.css`             |   450 |   250 |
| `css/inline-error.css`      |   585 |   289 |
| `css/inline.css`            | 1,155 |   285 |
| `css/kbd.css`               |   819 |   386 |
| `css/meter.css`             | 2,447 |   678 |
| `css/progress-bar.css`      | 2,708 |   837 |
| `css/progress-ring.css`     | 1,586 |   545 |
| `css/select.css`            | 2,341 |   816 |
| `css/separator.css`         |   484 |   276 |
| `css/skeleton.css`          |   854 |   377 |
| `css/stack.css`             | 1,109 |   280 |
| `css/text.css`              | 3,814 |   598 |

Every leaf file is under the 2 KB gzip target; the largest is `icon-button.css` at 1,027 bytes. The 34 stylesheets total 69,279 bytes raw and 9,971 bytes gzip when concatenated (after the review fixes). `base.css` grew from 2,170 / 759 (week 2) with the new focus, `touch-action` and forced-colours rules. `textarea.css` includes the `@supports (field-sizing: content)` block and the ten `[rows]` rules (718 bytes gzip).

## Client JavaScript per new client leaf

Measured from `dist` after the review fixes (2026-10-15). "dist" is the unminified ESM file as published. "Own" is that one file minified alone (`esbuild <file> --minify --format=esm`, esbuild 0.28.2) and piped into `gzip -c` (no file name in the header), so imports are not counted. The same figures are the `budget` in each `component.json`. "Bundled" is the file bundled with everything it imports from the package, minified, with `react`, `react-dom` and the React Aria packages external: the most a page pays for that leaf when nothing else is shared. Gzip as above.

| Client module                                   | dist raw | dist gzip | Own min+gz | Bundled min | Bundled min+gz |
| ----------------------------------------------- | -------: | --------: | ---------: | ----------: | -------------: |
| `field/field-scope.client.js`                   |    4,142 |     1,572 |      1,033 |       6,875 |          2,741 |
| `input/input.client.js`                         |    2,546 |       904 |        726 |       4,658 |          1,795 |
| `textarea/textarea.client.js`                   |      895 |       456 |        349 |       3,289 |          1,333 |
| `checkbox/checkbox.client.js`                   |    2,960 |     1,112 |        778 |       5,538 |          2,200 |
| `switch/switch.client.js`                       |    2,001 |       858 |        585 |       4,284 |          1,708 |
| `radio-group/radio-group.client.js`             |    2,375 |       985 |        643 |       3,374 |          1,429 |
| `segmented-control/segmented-control.client.js` |    5,271 |     1,858 |      1,206 |       6,080 |          2,249 |
| `icon-button/icon-button.client.js`             |    1,440 |       722 |        383 |       9,061 |          3,560 |

- "Bundled" counts the shared code again for every leaf: FieldScope, the Field anatomy helpers in `field.js`, InlineError, the glyphs, `mergeProps` and `renderElement`. A page with several controls pays it once. IconButton's bundled figure leaves out React Aria; with it, the subpath bundles to 17,451 B min+gz, 1.1 KB over Tooltip alone (16,365 B by the same method, react external).
- §16.1 targets ~0.5 KB for FieldScope and ~0.3 KB per control; §17.2 caps an own input leaf at 1 KB. FieldScope's own code is 1.0 KB (it owns native validation and renders the whole anatomy), and SegmentedControl's is 1.2 KB, over the cap (recorded as ARCHITECTURE.md §23.4 D-ab); the others are 0.3 to 0.8 KB.
- Server modules (no client JS under RSC), dist raw / gzip: `field/field.js` 5,423 / 1,850, `fieldset/fieldset.js` 2,234 / 773, `native-select/native-select.js` 2,098 / 796, `icon-button/icon-button.js` 2,965 / 1,217, `radio-group/radio-group.js` 1,278 / 634, `theme-script/theme-script.js` 2,013 / 1,104. The inline script `themeScript` is 257 bytes (a unit test pins it).

### Docs pages (Turbopack static export)

From `pnpm docs:check` (apps/docs/scripts/smoke.ts): all JavaScript a page loads, and the Nizivo client markers found in it.

| Page                                    | Scripts |      Raw |     Gzip | Nizivo client markers        |
| --------------------------------------- | ------: | -------: | -------: | ---------------------------- |
| `/docs/components/badge/` (server only) |      14 | 673.9 KB | 215.1 KB | none                         |
| `/docs/components/field/`               |      15 | 682.4 KB | 218.3 KB | FieldScope, Input            |
| `/docs/components/native-select/`       |      14 | 680.8 KB | 217.5 KB | FieldScope                   |
| `/docs/components/input/`               |      15 | 682.4 KB | 218.3 KB | FieldScope, Input            |
| `/docs/components/radio-group/`         |      14 | 677.5 KB | 216.5 KB | RadioGroup                   |
| `/docs/components/segmented-control/`   |      15 | 683.8 KB | 218.8 KB | FieldScope, SegmentedControl |
| `/docs/components/icon-button/`         |      15 | 727.2 KB | 234.2 KB | Tooltip (through IconButton) |

The Field page now shows a client Input (and the Fieldset page client Checkboxes). The NativeSelect page renders no client component, yet ships FieldScope: Turbopack ships a client module the page's server graph imports even when nothing renders it (see the fixture below).

## Contrast matrix

`packages/tokens/CONTRAST.md` (`pnpm tokens:contrast`): **62 checked pairs, 31 per theme, all pass** (per theme: 13 text, 17 non-text and 1 focus), with the same **14 overrides and 19 proposals**, all expiring 2027-01-31. 5 rows per theme are reported only (3 decorative, 2 disabled).

Added in week 3, for every background the new controls paint on:

- `bg-brand` on the six surfaces and `bg-brand-subtle` (checked Checkbox fill, Radio ring, Switch on track): light 7.41 to 8.50, dark 4.12 to 5.73.
- `bg-surface` (the Switch thumb) on `border-control` (the off track) and `bg-brand` (the on track): light 3.55 and 8.50, dark 4.02 and 5.32.
- `border-control` also on `bg-brand-subtle` (a box in a selected row): light 3.13, dark 3.91. Its use note now names the Switch off track and the SegmentedControl ring.
- `border-brand` also on `bg-brand-subtle` (the pressed IconButton edge): light 5.60, dark 5.16.
- Reported only: `text-disabled` on `bg-disabled` (light 2.20, dark 2.07) and `bg-surface` on `bg-disabled` and `bg-brand-muted` (the disabled thumb: light 1.14 and 1.28, dark 1.29 and 1.25).

The lowest new checked ratio is dark `bg-brand` on `bg-hover` and `bg-muted`, 4.12. No Figma colour failed, so no new override or proposal was needed.

## Next fixture

`pnpm --filter @nizivo/fixture-runner run fixture:next --dev` (full turbo build, pack, frozen install, then the three production builds and `next dev`): **18 of 18 pages pass in all four modes, 0 console messages, no build warnings** (Next 16.4.0, React 19.3.0, react-aria-components 1.22.1, Chromium 156.0.8078.4). Detail: `fixtures/next/RESULTS.md` and `fixtures/next/results/*.json`.

- `/forms`: the server HTML wires every Field (label `for`, description in `aria-describedby`, the group Field's label is the radiogroup's `aria-labelledby`, no dangling IDREF); after hydration an empty required Input stops the submit with its message inline, `aria-invalid="true"` and focus; **with JavaScript off** the form submits `name`, `unit`, `terms`, `range`, `billing` and `shipping` natively. It ships exactly the seven rendered leaves.
- `/native-select`: no `@nizivo` client module in any build.
- `/icon-button-tooltip`: the tooltip shows on Tab with the label, the button is not described by it, Escape closes it.
- **Imported, not rendered:** `/field-zero-js` (a function child) and `/icon-button` (`tooltip={false}`) run no client code, but Turbopack and `next dev` ship the leaf the shell imports (FieldScope; the IconButton tooltip chain, six modules). Production webpack, with or without `optimizePackageImports`, ships none.

## Floor lane

`node fixtures/floor-lane/run.ts --firefox <Firefox 129.0.app> --tokens packages/tokens/dist/tokens.css --react-css packages/react/dist/css --pages w3-controls --results fixtures/floor-lane/results/w3-controls` (and `--engines chromium,webkit`): the new `w3-controls` page passes **20 of 20 checks in both OS schemes on Firefox 129.0, Chromium 156.0.8078.4 and WebKit 27.2**. It covers `field-sizing` behind `@supports` (Firefox 129 skips it and keeps `rows`), `:has()` inside `:is()`, `1lh`, `:dir(rtl)` with `translate`, `appearance: none` inputs painted by `:checked` and `:indeterminate`, `min-inline-size: fit-content`, and the nested-input focus rule. Without `--react-css` the same page fails 18 of 20 (negative control). Detail: `fixtures/floor-lane/RESULTS.md`.

## Tests

- **Full gate:** from a clean state (`.turbo`, every `dist`, `apps/docs/.next`, `out` and `.generated` deleted) with `TURBO_FORCE=true`, `pnpm check` exits 0 in 142 s on this machine (Apple silicon, macOS 27.0.1, Node 24.16.0): frozen install, typecheck, lint, `gen:check` (`nz api --check`: 72 files up to date), tests, build, `check:a11y`, `test:dist` (4), `check:release` (publint and attw on both tarballs) and `docs:check` (53 pages).
- `pnpm test`: `@nizivo/react` 546 tests in 41 files, `@nizivo/tokens` 70, `@nizivo/tooling` 112 plus 1 skipped under Turbo (113 when run directly).
- `pnpm --filter @nizivo/react test:browser` (Vitest browser mode, Playwright Chromium; not part of `pnpm check`): 55 tests in 5 files, passing from a cold Vite cache. The text controls, toggles and field specs also pass in WebKit (39 tests, a scratch config); the IconButton and SegmentedControl specs pass in WebKit except the four that start with Tab, which WebKit on macOS does not move to radios or buttons by default.
- `t0.server.test.tsx` now checks every `tier: "server"` manifest (25 entries: the 19 week 2 components, Button, Field, Fieldset, NativeSelect, IconButton and ThemeScript), renders every `*Example` export under the react-server build with client leaves replaced by client references, and checks that every prop crossing into a leaf serialises.

## Review fixes (2026-10-15)

The week 3 review (23 findings) was fixed or recorded before the commits:

- **FieldScope** focuses the first invalid control in a layout effect after the message renders, so `aria-invalid` and the error id are on the control when focus lands (browser test records them at `focusin`). A submit from inside the already-focused first invalid control still announces nothing new; that needs a §16.5 exception and is open (D-q).
- **SegmentedControl** marks `data-focus-visible` on the DOM instead of through state: re-rendering a focused radio made Chromium give every radio of an unchecked group its own Tab stop (browser test, which fails with the old code). `reason` is `'input'`, `value` takes `null`; invalid paints a critical ring; the track hugs its items in a stretching parent; a selected disabled item takes the subtle ring.
- **Switch** in forced colours: the on thumb is `HighlightText`, the disabled-on thumb `Canvas`.
- **NativeSelect** placed directly in a Field is wired with no client code (an internal mark; Next fixture `/field-zero-js`, no dangling IDREF), and takes the focus halo; a disabled placeholder keeps the disabled colour.
- **Tokens:** `--nz-focus-halo-critical` (code-owned) replaces the hand-made mix in Input and Textarea.
- **IconButton** announces `shortcut` through `aria-keyshortcuts`.
- **nz api** finds a root rendered through a same-file builder or inside a wrapper, so IconButton's and SegmentedControl.Root's roots are parts.
- **Docs:** the Field and Fieldset examples use Input, NativeSelect and Checkbox; the ThemeScript CSP hash is published and pinned by a test.
- The full gate passes from clean (`TURBO_FORCE=true pnpm check`, 128 s; react 551 tests, tooling 113 + 1 skipped); the browser lane passes 57 tests in Chromium; the Next fixture passes 18 of 18 pages in all four modes.

## Not verified

- **Safari 17.5:** not tested. Playwright's WebKit 27.2 is a current engine.
- **Firefox:** the browser lane does not launch Playwright's Firefox here ("Could not find profile folder"); Firefox 129 covers CSS only, through the floor lane, with no keyboard.
- **Screen readers:** no VoiceOver or NVDA pass for the inline errors, the switch role, a mixed checkbox, the radiogroup's required and invalid states, the segmented control's group name or the pressed IconButton.
- **Forced colours:** the generated `nz.base` rules exist for every new state indicator, and builders checked them under Chromium's emulation in scratch runs; no screenshot is committed or reviewed (exit criterion 14).
- **Bundle budgets:** no `size-limit` yet (W5); the numbers above are the baseline.
- **CSP nonce:** `ThemeScript` takes `nonce`, but no fixture page sends a CSP header.
- **Real devices:** `navigator.userAgentData.platform` values for iPadOS Chrome and Linux on Arm were checked only with stand-in navigator objects.
