# Week 5 results

Recorded on 2026-10-15 at week 5 integration (ARCHITECTURE.md §21.1 W5: the Vite and Astro fixtures on the packed packages, `size-limit` at measured + 10% and the seam cost, the Deviations page, in-repo visual regression, the local release script (M14), and the carried items: the floor-lane page for every v0.1 component's CSS, forced-colours screenshots of every v0.1 control, axe and no-theme-flash in the fixtures, READMEs for the published packages). Every number below comes from a command run on the integrated tree on this machine (macOS 27.0.1, arm64, Node 24.16.0, pnpm 12.11.2); the command is named with each number. The figures are those of the tree as committed after the week 5 review (section "Week 5 review" at the end); the work is committed locally, and nothing is pushed, tagged or published.

## The gate and the lanes

What runs where (D-ak): `pnpm check` is the per-change gate and must pass on any machine; `pnpm check:full` adds the slow lanes, the same list the release script runs (`node packages/tooling/release/lanes.ts --list`). The floor lanes stay manual.

| Command                                                                              | Result                                                 | Time      |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------ | --------- |
| `pnpm check`, from clean (\*), `TURBO_FORCE=true`                                    | exit 0; 58 docs pages pass the smoke test              | **160 s** |
| `node packages/tooling/release/lanes.ts` (the `check:full` lanes)                    | exit 0, all 7 lanes pass                               | 284 s     |
| `pnpm check:full` with `TURBO_FORCE=true`, after the last plan and docs edits        | exit 0: the gate, then all 7 lanes                     | 452 s     |
| `pnpm release` (dry run, full gate and lanes)                                        | every step passes; exit 1 on 3 honest blockers (below) | 449 s     |
| `pnpm release` on the committed, reviewed tree                                       | every step passes, tree left clean; 2 blockers (below) | 532 s     |
| `node fixtures/runner/next.ts --skip-pack --skip-install --variants turbopack --dev` | `turbopack: pass`, `dev: pass`                         | 96 s      |
| `pnpm floor` on Firefox 129, Chromium, WebKit (week 5 pages)                         | 269 of 269 per scheme on each engine (265 before)      | 4 s       |
| `pnpm floor --ios-sim` (week 5 pages)                                                | 269 of 269 per scheme (265 before the review)          | 24 s      |
| `pnpm test:visual`, three runs in a row, then once after a clean rebuild             | exit 0 each, "no visual differences" (864 shots)       | 43–44 s   |

(\*) Clean: `.turbo`, every package `dist`, `apps/docs/{.next,out,.generated,.source}`, the generated docs routes and `packages/icons/src`'s generated files deleted first. An earlier `TURBO_FORCE=true pnpm check` without the deletion took 157 s.

The lanes, from the `lanes.ts` table:

| Lane               | Result                                                       | Seconds |
| ------------------ | ------------------------------------------------------------ | ------: |
| `browser`          | 67 tests in 6 files pass (Chromium)                          |     3.7 |
| `overlay-chromium` | 82 passed, 7 skipped                                         |    13.7 |
| `overlay-webkit`   | 77 passed, 12 skipped                                        |    12.9 |
| `fixture-next`     | Turbopack, webpack, webpack + `optimizePackageImports`: pass |   155.1 |
| `fixture-vite`     | pass                                                         |    29.1 |
| `fixture-astro`    | pass                                                         |    25.3 |
| `visual`           | 864 shots, no visual differences                             |    43.6 |

In the release dry run on the committed, reviewed tree every lane passed again; `visual` ran 1,496 shots in 74.9 s (1,493 identical, 3 within the tolerance, no visual differences), the overlay counts were unchanged, and the three fixtures passed with their results written outside the tree.

Overlay conformance in Firefox is in no list: `NZ_BROWSER=firefox pnpm test:overlay` fails to launch Playwright's Firefox on this machine (re-tried in week 5), so a lane for it would block every release. The release script's list dropped it and dropped `size`, which now runs inside `pnpm check`.

Unit tests inside the gate: `@nizivo/react` 605 in 44 files, `@nizivo/tokens` 89 in 8, `@nizivo/icons` 35 in 4, `@nizivo/tooling` 166 passed and 1 skipped in 12 after the review (the size bookkeeping tests and the release tests among them).

After the review, `pnpm check` from clean with `TURBO_FORCE=true` passed again on the reviewed tree in 301 s, with the machine under other load. Two earlier attempts failed on vitest's 5 s default timeout in the `nz api` and `nz gen` tests, which spawn several node processes each (5.7 to 8 s under that load, up to 47 s with another project's browser tests running beside the gate, 3.3 s otherwise); the tooling tests now run with a 120 s timeout. The timeout guards against a hang; what the tests assert is unchanged.

## Fixtures

All three install the packed tarballs as `file:` folders and run the shared spec (`fixtures/runner/spec.ts`), axe-core 4.14.0 (WCAG 2.0–2.2 A and AA tags) and the theme-flash probe (`fixtures/runner/theme.ts`). axe runs on every page at first render, with each interaction-opened popup open and after a server-open overlay closes (all blocking), and once more with the OS in dark mode (`axeDark`, reported, not blocking: exit criterion 4). Any build warning fails a run. The runners write their results to a temporary folder unless given `--record`; the committed results files (`fixtures/*/results/`) were recorded with `--record` on the reviewed tree:

| Fixture and mode                         | Pages | Failures | axe violations (light, open, closed, dark) | Console messages | Build warnings | `light-dark()` kept |
| ---------------------------------------- | ----: | -------: | -----------------------------------------: | ---------------: | -------------: | ------------------: |
| Next 16.4.0, Turbopack                   |    23 |        0 |                                          0 |                0 |              0 |             68 / 68 |
| Next, webpack                            |    23 |        0 |                                          0 |                0 |              0 |             68 / 68 |
| Next, webpack + `optimizePackageImports` |    23 |        0 |                                          0 |                0 |              0 |             68 / 68 |
| Next, `next dev`                         |    23 |        0 |                                          0 |                0 |              0 |             68 / 68 |
| Vite 8.3.4, build + preview              |    12 |        0 |                                          0 |                0 |              0 |             68 / 68 |
| Astro 7.3.8, static build + preview      |    12 |        0 |                                          0 |                0 |              0 |             68 / 68 |

- **No theme flash, in every build.** Each case records 90 frames from the first one. `osDark`, `stored` and `static` are dark on 90 of 90 frames and `light` is light on 90 of 90; the negative control (`late`, a theme set by a script at the end of `<body>`) has 5 light frames before it turns dark, so the probe can tell a flash from none. Nested scopes paint their own theme in every build (luminance: dark scope 0.071, light inside dark 0.967, inverse inside dark 0.967, inverse 0.071).
- **Vite needs `build.cssTarget`.** Measured by the fixtures builder: a plain Vite 8.3.4 build keeps 0 of the 68 `light-dark()` values, a `browserslist` does not change that, and `cssTarget` at the floor keeps all 68. Astro 7.3.8 keeps 68 with no setting. The Vite docs page now has the step.
- **Gzip bytes of client JavaScript per page** (`js.gzip` in the committed results). Vite: the shell `/` 69,906; Button through the barrel 71,400 and through the subpath 71,402; Select through the barrel 136,482; `/overlays` 143,045; Tabs 105,434. Astro: the five server-only pages 0; island pages from 70,757 (`/icons-client`) to 142,597 (`/overlays`). Next Turbopack: server-only pages 174,639 (Next's runtime, no `@nizivo` module); `/namespace` 251,707. The barrel and subpath Button pages differ by a few bytes from run to run; only the gap matters.
- The fixtures builder's findings (Astro per-island ids `r2` and `r3`, the `.astro`-children build failure, Astro's agent detection and `--ignore-lock`, Vite tree-shaking the barrel completely, no `MODULE_LEVEL_DIRECTIVE` warning) are in `fixtures/vite/RESULTS.md` and `fixtures/astro/RESULTS.md`, and folded into §11.1.

## Size budgets and seam cost

`pnpm size` (size-limit 14.2.0, gzip) runs **118 checks** in about 1 s and passes; `node packages/tooling/size/measure.ts` reports no entry whose measurement differs from `budgets.json` after the clean rebuild. Method, budgets and the seam tables: `packages/react/SIZES.md` (D-ah). Selected entries (size-limit's figure, 32 B below raw `esbuild | gzip`):

| Entry                                    | Measured (B) | Budget  | §17 reference                     |
| ---------------------------------------- | -----------: | ------- | --------------------------------- |
| `@nizivo/react/tooltip`                  |       16,327 | 16 KiB  | 14.3 / 16 (React Aria alone, r3)  |
| `@nizivo/react/dialog`                   |       31,445 | 31 KiB  | 28.1 / 31                         |
| `@nizivo/react/tabs`                     |       33,577 | 35 KiB  | 31.9 / 35                         |
| `@nizivo/react/menu`                     |       56,623 | 57 KiB  | 51.3 / 57                         |
| `@nizivo/react/select`                   |       62,404 | 66 KiB  | 59.5 / 66                         |
| Dashboard set                            |       76,153 | 75 KiB  | 69.0 / 75                         |
| `{ Button }` from the barrel             |        1,381 | 1.5 KiB | ≤ 1 KB per server-safe part (SPA) |
| `@nizivo/react/field`                    |        3,136 | 3.4 KiB | ≤ 2.5 KB (target)                 |
| Seam K6 helpers                          |          757 | 0.9 KiB | est. ≤ 0.5 KB                     |
| Seam K7 helpers                          |          678 | 0.8 KiB | est. ~0.4 KB                      |
| `@nizivo/tokens/tokens.css`              |        3,879 | 4.2 KiB | first build + 10%                 |
| `@nizivo/icons` one icon from the barrel |          473 | 0.6 KiB | ≈ 0.26 KB per icon                |

The React Aria part of each engine subpath is at or under r3 (Select 57.5 KiB, Dialog 28.1, Tooltip 13.7, Menu 50.7, Tabs 31.1). Seam cost (`node packages/tooling/size/seam/seam.ts --write`, rerun at integration): Nizivo's own code beside React Aria is 5,548 (Tabs) to 14,628 (Menu) minified bytes per component, 28,528 for all five together (esbuild's metafile, not gzip); over a hand-written React Aria layer with the same parts that is +1.6 KB (Tabs, Tooltip) to +4.5 KB (Menu), +6.5 KB for all five (the budgets builder's reading in SIZES.md).

The four stylesheets changed at integration and in the review stay inside their budgets (`node packages/tooling/size/measure.ts`, re-measured with `--write` after the review): `button.css` 1,007 B (was 988; budget 1.1 KiB), `menu.css` 1,030 B (was 1,008; budget 1.2 KiB), `dialog.css` 770 B (0.9 KiB) and `tooltip.css` 550 B (0.6 KiB); every stylesheet stays under the 2 KB leaf target. No budget sits above a §17.1 limit: the engine subpaths and the dashboard set are gated at the plan's limits (the table above), not at measured + 10%.

## Visual regression

`packages/react/scripts/visual/run.ts` (D-ai), as reviewed: 74 examples of 37 components, in light, dark, forced colours and forced colours with a dark OS, at rest, hovered, pressed, focused by keyboard, and open: **1,496 baselines**, 4,624 KiB, 748 of them in forced colours. The harness keeps the root at 16 px, so every rem renders at the size Nizivo ships. A shot differs when more than 3 pixels move by more than ±2 in a channel; `--update` re-records exactly what a compare would fail. The baselines were recorded fresh after the review fixes; repeated compares on the reviewed tree report "no visual differences" (1,493 identical and 3 within the tolerance in the last one), and the lane passes again inside the release dry run below.

At integration, before the review, the lane had 864 baselines in light, dark and forced colours; `--update` then rewrote 39 of them, all expected: 30 open-Menu shots (rows 36 px instead of 48, F1; the forced-colours ones also show the Menu fix below) and 9 Button shots (the link row without its underline).

The design sign-off set (exit criterion 11) is generated by `pnpm test:visual --review`: 43 light renders of Button, Input, Select and Dialog at `packages/react/test/visual/.review/index.html` (gitignored). The forced-colours shots (exit criterion 14) are the `*--forced.png` and `*--forced-dark.png` files under `packages/react/test/visual/baselines/`.

## Floor lane

`fixtures/floor-lane/gen-w5.ts` renders every v0.1 component from the built `dist` into three committed pages; `pnpm floor:check` (in `pnpm check`) fails when they are stale. On the integrated tree, Firefox 129.0, Chromium 156.0.8078.4, WebKit 27.2 and Mobile Safari 17.5 (iOS 17.5 Simulator, `Version/17.5`) each pass **269 of 269 checks per OS scheme** after the review (`w5-components` 201, `w5-paint` 29, `w5-grid` 39; 265 at integration, before the link-Button specimens). The committed results keep each check's observed value. No new degradation: D1 to D4 stand. The builder's one failing cell, F1, passes after the integration fix. A negative control without the component CSS fails on Chromium: 233 of 269 checks per scheme fail. The Simulator device was created and deleted by the run (`xcrun simctl list devices | grep nz-floor` is empty). The runner now formats the results files it writes, as the fixture runner does; the first release dry run had stopped at `oxfmt --check` on them.

## Release script

`pnpm release` (D-aj) on the integrated tree, dry run: preflight, the version plan (0.0.0 → 0.1.0 for all three from the pending changeset), the full gate, the 7 lanes, pack and `check:release` (tokens 10 files, react 252, icons 3,768; allowlist with `README.md` required, publint strict, attw, directive guard), the shipped-runtime licence gate (ok for all three), `npm view` (all absent), then `npm publish --dry-run` in the order tokens, icons, react, each printing "Publishing to https://registry.npmjs.org/ with tag next and public access (dry-run)". It exits 1 on three blockers, all expected here: the working tree is not clean, nobody is logged in to npm, and the package folders differ from HEAD (the uncommitted week 5 work). No `npm login`, no real publish, no tag and no push happened.

After the review, on the committed tree, the same dry run (532 s) passed every step again and left the working tree clean; it exits 1 on the two blockers expected before a release: HEAD is ahead of `origin/main` by the week 5 commits (nothing is pushed), and nobody is logged in to npm.

## Found and fixed at integration

- **F1, Menu rows:** `.nz-menu-item`, `.nz-menu-checkbox-item` and `.nz-menu-radio-item` set `box-sizing: border-box`, so rows are Figma's 36 px with or without a page reset (§8.1). Found by the floor lane on all four engines; the visual baselines had recorded 48 px rows.
- **Menu in forced colours:** a checked row that was hovered or keyboard-focused painted the hover token under `HighlightText`, so its label nearly disappeared, and the keyboard ring around a checked row was `HighlightText` on Canvas, invisible. The forced-colours rule now also matches `[data-checked][data-highlighted]`, and the ring is `CanvasText`, as Select's is. Found by the visual lane; the overlay spec's forced-colours case had asserted the invisible colour and now asserts `CanvasText` (it passes in Chromium).
- **Button as a link:** `button.css` sets `text-decoration: none`, so `render={<a />}` drops the browser's underline without a page reset.
- **Floor results formatting:** `fixtures/floor-lane/run.ts` runs oxfmt on the results it writes.

## Week 5 review

Three reviewers (fixtures and accessibility; visual and floor; release, build and plan) filed 21 findings against the integrated tree. 19 were fixed before the week 5 commits (two of them in part), 2 are deferred with a reason, none was rejected. Fixed:

- **Theme snippet on the Next page (FX-1):** it used the key `theme`, had no `data-nz-theme` on `<html>` and froze the OS scheme once through `matchMedia`, unlike what the fixture checks. It is now the fixture's pattern: `data-nz-theme="system"`, a stored-choice-only `<head>` script with the key `nz-theme`, then `ThemeScript`. The docs site's `next-themes` variant is labelled as not fixture-checked.
- **Build warnings fail a fixture run (FX-2)** in all three runners; before, they were recorded and ignored, so a `MODULE_LEVEL_DIRECTIVE` warning after a Vite bump would have passed.
- **axe in more states (FX-3, FX-4):** with each interaction-opened popup open (Select, Dialog, Tooltip) and after a server-open overlay closes (both blocking), and once per page with the OS dark (`axeDark`, reported). 0 violations in every state, light and dark, in all three fixtures.
- **Docs claims (FX-5, FX-6, R3-4):** two Astro island bullets (compound parts as `.astro` children, context across islands) say the fixture does not check them; the Vite page no longer names a byte gap that drifts, and `fixtures/vite/RESULTS.md` matches the committed results; the `@nizivo/react` README gives the Vite `build.cssTarget` step.
- **The visual harness's root font (V1):** `body-m` sat on `<html>`, so every rem rendered at 87.5% (a 35 px Button, 32 px Menu rows). It now sits on the stage and the root stays at 16 px.
- **The visual compare tolerance (V2):** pixelmatch's YIQ 0.1 let a one-step `bg-brand` or `border-default` change and a 1 px radius change through, and `--update` used the same threshold. The compare is now exact to ±2 per channel with 3 stray pixels per shot; all three probes fail, and `--update` re-records exactly what a compare fails. YIQ and anti-aliasing tolerance are opt-in flags.
- **Reset independence (V3, V4, F2):** `.nz-button` sets `box-sizing: border-box` (a link Button was 42 px and its `fullWidth` overflowed by the padding and border), as do `.nz-menu-popup` (exactly its trigger's width), `.nz-tooltip-popup` (320 px at the cap, not 344) and `.nz-dialog-popup`. A Dialog popup that holds focus itself shows no browser ring. The floor lane gained link-Button specimens, asserts the outer boxes and derives text heights from the type tokens.
- **Forced colours, every state (V5, in part):** a forced-dark mode (forced colours with a dark OS) and a pressed state for every enabled control that opens no popup; the Button example shows `accent`, `lg` and an enabled `critical`. 1,496 baselines in all, 748 in forced colours.
- **Floor results (F3):** each engine's committed results keep every check's observed value.
- **Release (R3-1, R3-3):** the fixture runners write results to a temporary folder unless given `--record`, and the release script blocks when the gate or a lane changes a file, so the documented procedure can run twice; a version already on the registry with other bytes than the checked tarball stops a real run before anything is published or tagged (`RELEASING.md` step 7).
- **Size (R3-2, R3-5, R3-6):** no budget sits above its §17.1 limit (`PLAN_LIMITS_KIB`); `menu.css` was re-measured after the integration fix (1.2 KiB); the `component.json` `budget` fields are gone, and §5 says where size entries come from.

Deferred, with reasons, in ARCHITECTURE §21.1's week 5 block:

- **F1, iOS zoom on text fields:** Input, Textarea, NativeSelect and Select use 14 px Body/M with no coarse-pointer rule, and iOS Safari zooms into a focused field under 16 px. 16 px under a coarse pointer, or a Deviations entry, is a design decision; the floor check follows it.
- **R3-7, the npm 2FA mode:** the preflight's `auth-and-writes` check and the typed one-time password need one logged-in `npm profile get --json` on the publishing account before the first real publish. An empty one-time-password answer lets npm prompt itself if the shape differs.
- **In part:** the pressed state of popup items and a forced-colours hover cue on Select and Menu rows stay with the accessibility owner (V5); a `Dialog.Close` flush with the popup edge has its ring clipped by the content's `overflow: clip`, which the W6 `Dialog.Close`-as-IconButton work covers (V4).

Also found while fixing: after keyboard use, pressing a Tooltip trigger with no pointer move first leaves an unpositioned tooltip in `data-exiting` (React Aria 1.22.1); the visual lane moves the pointer first, and the case is a W6 item.

## Not verified

- **Firefox** in the browser and overlay lanes, and in the fixtures: Playwright's Firefox does not launch here. Firefox 129 covers CSS only, through the floor lane.
- **macOS Safari 17.5:** not tested; the Simulator covers iOS Safari 17.5. Playwright's WebKit 27.2 is a current engine.
- **The visual baselines on any other environment:** they hold for darwin-arm64 with Chromium 156.0.8078.4; the runner refuses to compare elsewhere. Linux baselines in a pinned image are not recorded.
- **Reviews:** the design owner has not seen the 43-render sign-off set (exit criterion 11) and the accessibility owner has not reviewed the 748 forced-colours shots (exit criterion 14). The forced-colours Menu fix was checked by eye on the new renders and by the overlay spec's computed style, not by the accessibility owner. A hovered, unselected Select or Menu row shows no hover cue in forced colours; whether that is acceptable is theirs to say.
- **The solid-outline check of exit criterion 14** for every T0 control: the browser and overlay lanes assert it for inputs, Menu items, tabs and TabNav links only.
- **The real `--publish` path:** `npm whoami` while logged in, the 2FA shape, a publish with a one-time password and the registry afterwards were exercised only with the release tests' stubs. Whether npm also sets `latest` on a first publish with `--tag next` is unknown until the first release.
- **Fixtures:** axe blocks in light and reports dark; forced colours and reduced motion are not run; the Vite dev server, Vite SSR, Astro `output: 'server'`, `astro dev`, `client:idle`, `client:only` and the serialisable-props rule are not run.
- **The `--dev` Next pass** ran outside the lanes (the lane runs three modes); its committed `results/dev.json` is from that run.
