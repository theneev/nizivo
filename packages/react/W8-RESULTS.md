# Week 8 results

Recorded on 2026-10-17 (ARCHITECTURE.md §21.1 "Week 8 status"). Week 8 built the maintainer's decisions of 2026-10-17 (§23.3 M28–M30) and diagnosed a test flake: four builders worked in one tree (the Alert dismiss, M28; the Field announcer, M29; the release's npm login, M30; the WebKit Tooltip flake), and the integration regenerated once and ran every lane. Every number below comes from a command run on this machine (macOS 27.0.1, arm64, Node 24.16.0, pnpm 12.11.2), named with it; a figure that only a builder measured says so. Nothing was committed, pushed, tagged or published by the integration (M22: "hold the publish"); the review fixed its findings and committed the week in area commits ("Week 8 review", below). Nothing is pushed, tagged or published.

## The decisions

- **M28, `AlertDismiss` (NIZ-14):** "yes keep the export and rebuild it on top of IconButton".
- **M29, D-q (NIZ-12):** "A + yes": keep Field's design as built, and allow a narrow §16.5 exception, a FieldScope-only announcer.
- **M30, the release's npm login:** the maintainer asked to scope the npm login to this project (`~/.config/nizivo/npmrc`; the global `~/.npmrc` holds an unrelated old token and is never read, written or relied on).
- Not decided: D-aa (NIZ-13, awaiting the maintainer's "later" or "add the static exports now"). Nothing was added for it; the IconButton and Field docs pages now state the Turbopack cost the fixture measures.

## M28: `AlertDismiss` is an IconButton

- **What changed.** With no `render`, `AlertDismiss` writes out the IconButton element's markup (`variant="tertiary"`, `size="sm"`, no tooltip): `<button data-slot="alert-dismiss" data-variant="tertiary" data-size="sm" type="button" aria-label="Dismiss" class="nz-alert-dismiss nz-icon-button nz-hit-target">`, with the glyph in IconButton's `nz-icon-button-icon` span. It follows `Dialog.Close` (week 6), which also writes the markup out and has no tooltip: importing `icon-button.tsx` would bring the IconButton's tooltip leaf and the Tooltip chain onto every Alert page (D-aa). The public API is unchanged (`onDismiss()` with no arguments, `labels.dismiss` and `aria-label` defaulting to "Dismiss", the close glyph, `children`, `render`, slot `alert-dismiss`, `--nz-alert-dismiss-fg`). Removed before 0.1.0: the `alert-dismiss-icon` slot and the `nz-alert-dismiss-icon` class. `alert.css` keeps only the slot placement: the 32 px button reaches 6 px into the block padding and 8 px into the inline padding, so the 16 px glyph sits where Figma draws it and the row keeps its first line (the leading icon's 20 px box, `--nz-size-icon-md`, which the block overhang is measured from). `component.json` `cssDeps` gains `icon-button`.
- **Tests (builder A, re-run at integration):** the SSR parity test (the default markup equals `<IconButton variant="tertiary" size="sm" tooltip={false}>` apart from the slot and class) and the existing graph tests ("Alert is server-safe"; "Alert is split": exactly one client module) pass in the node suite below; `test/browser/alert.spec.tsx` (6 cases: hydration, a click calls `onDismiss()` with no arguments, no tooltip and no `aria-describedby`, 32 × 32 px with a 16 × 16 px glyph, the glyph 16 px from the edge in LTR and RTL with either stylesheet order) passes inside the Chromium and Firefox browser lanes below. In WebKit, run on its own at integration: 6 of 6.
- **Floor lane:** `w5-components.js` now expects the dismiss at the control-sm probe (32 × 32 px), adds a 16 × 16 px glyph check (LTR and RTL) and measures the end distance from the glyph (section "Floor lane").
- **Visual lane:** the 16 `alert/dismissible--*` shots changed (section "Visual regression").

## M29: the Field announcer

- **What changed.** FieldScope renders one `<span class="nz-visually-hidden" aria-live="polite" aria-atomic="true">`, empty, as the last child of the Field root, in the server HTML. A validation request made while focus is in the Field (an `invalid` event at the control when it is the form's first invalid control, or a form `submit` heard on the document in the capture phase) arms it; the next error text that commits while focus is still inside is put in the region once: the native message even when unchanged, an `error` prop only when its text changes (a commit that empties the error keeps the request). It says nothing at first render and hydration, when the request moves focus, at a control that is not the form's first invalid one, while the user types (an input event disarms it), for a reply with the error's current text, or to repeat what it holds; it reads InlineError's message, not the mark, and empties after 7 s. The zero-JS path renders no region and its HTML is unchanged. The rules are in `src/field/FIELD-CONTRACT.md` "The announcer"; ARCHITECTURE.md §16.5 records it as the one exception.
- **Tests:** `test/ssr/field.test.tsx` (the region is the root's last child, empty, the only `aria-live` node, also without an error; no `role="alert"` or `role="status"`) in the node suite below; `test/browser/field-announcer.spec.tsx`, 14 cases, inside the browser lanes below (Chromium 14; Firefox 13 and 1 skipped, the Chromium-only accessibility-tree case). In WebKit, run on its own at integration: 13 passed and 1 skipped. Builder B's own figures, not re-run here: 10 consecutive runs (Chromium 9 of 10 and WebKit 10 of 10; the two others never started: "tester iframe did not become ready within 60000ms", and their reruns passed); mutation checks (never speaking fails 6 cases, speaking on every change fails 7, removing the typing reset, the `toFocus` dependency, the 7 s clear or the submit listener each fails 1).
- **Size:** `own: field/field-scope.client` 1,123 → 1,490 B (1,469 B at integration; the review's two fixes added 21 B), over its 1.3 KiB budget. The budget is raised to 1.6 KiB (measured + 10%, rounded up), a §17.3 raise of a non-§17.1 entry, in its own labelled size commit placed before the Field commit, as week 7 did for the Tabs adapter. `./field` 3,115 → 3,463 B, 18 B under its 3.4 KiB budget.

## M30: the release's npm login

- **What changed (builder C).** Every npm call of `packages/tooling/release/release.ts` (`whoami`, `profile get`, `view`, `publish`, `publish --dry-run`) goes through one wrapper that appends `--userconfig <file>` and sets the working folder to `io.npmCwd()`, a fresh `mkdtemp` folder. The file is `~/.config/nizivo/npmrc` (`os.homedir()`), or the absolute or `~/` path in `NIZIVO_NPM_USERCONFIG`; `~/.npmrc`, a relative path, a file inside the repo and a file directly in `~` are refused (the last two are builder C's additions, for the maintainer to keep or drop). The preflight checks the folder (not the repo or under it, not `~`, no `package.json` or `node_modules` in it or above it, no `.npmrc` in it) and the file before any npm call; a missing file blocks with `mkdir -p ~/.config/nizivo && cd ~/.config/nizivo && npm login --registry https://registry.npmjs.org/ --userconfig ~/.config/nizivo/npmrc` (the `mkdir -p` only when the folder is missing). The child environment drops `npm_config_*`, `npm_package_*` and `npm_lifecycle_*` variables in any case. `RELEASING.md` has a new section, "The npm login" (login, the manual check, logout, the home-folder gotcha), and `CONTRIBUTING.md` step 3 points there instead of `cd ~ && npm login`.
- **Why not `~`:** npm reads a project config, the `.npmrc` of the nearest folder at or above its working folder with a `package.json` or `node_modules`, else of the working folder itself, and skips it only when it is also the user config. From `~` that is `~/.npmrc`, which outranks `--userconfig`: the old token gets a 401 (builder C read this in npm 11.13.0's `@npmcli/config`).
- **Tests:** `packages/tooling/release/plan.test.ts` with a stubbed exec: every npm call ends with exactly one `--userconfig <file>` (dry run, real run, absolute and `~/` overrides); no npm working folder is the repo or `~` or under them; a missing file blocks with the exact command and runs no `whoami`; an unsafe folder or file runs no npm command at all; RELEASING.md carries the script's own login and logout commands and no `cd ~ && npm`. In the tooling suite below.
- **Live check (integration):** `pnpm release --skip-gate --skip-lanes < /dev/null` (13 s) printed `npm runs in: …/T/nz-npm-…`, `ok npm's working directory is neutral`, `ok npm whoami (~/.config/nizivo/npmrc): neevtechnologies` and `ok 2FA on (auth-and-writes)`; `npm view` found all three packages absent, and `npm publish --dry-run` passed for tokens, icons and react, in that order. Its only blockers were the uncommitted tree and the published packages differing from HEAD, both expected before the commits. The npm folder was empty afterwards; both temporary folders were deleted. The token file was never read, printed or written, and `~/.npmrc` was not touched.

## The WebKit Tooltip flake

- **Cause (builder D):** test isolation, not a product bug. The pointer case before "opens from the keyboard (focus) and Escape returns focus to the trigger" leaves the real mouse over its trigger; the next case mounts a new trigger in the same place, and about 150 ms in WebKit updates the hover state by itself (a trusted `pointerover` and `pointerenter`, no `pointermove`). React Aria 1.22.1 takes that as a hover start, and since its Escape handler (a capturing document listener that stops the event) does not clear the trigger's focus flag, the tooltip reopens. Under load the case's Escape landed before that update, so the popup was found open again. A real pointer that moves onto a trigger fires `pointermove` first, so in a page the reopen is an ordinary hover; a product-side fix would mean re-implementing `useTooltipTrigger`, far over Tooltip's 12 B of headroom.
- **Fix:** `test/overlay/tooltip.spec.tsx` only. Its `afterEach` moves the real pointer to an 8 px spot in the bottom-right corner (with a `data-testid`, so the locator stays on it while a closing popup leaves the DOM), then removes the spot; no sleep was added. Nothing under `src/` changed, so Tooltip's size is unchanged (16,372 B).
- **Proof (builder D's runs, not repeated here):** the unfixed spec failed 4 of 8 WebKit runs under load (10 busy loops, an isolated Vite cache), each on that case; the fixed spec passed 25 of 25 consecutive WebKit runs under the same load. At integration, unloaded: 20 of 20 consecutive WebKit runs of `test/overlay/tooltip.spec.tsx` (15 passed and 5 skipped each, 357 s), and the full WebKit overlay lane once.
- Builder D's infra note: every vitest config shares `node_modules/.vite/vitest/da39a3ee…/deps` (the cache key is the SHA-1 of an empty string), so lanes run in parallel on one machine can re-optimise each other's dependencies mid-run ("Importing a module script failed"). The integration ran every lane one after another.

## Regeneration

One pass after `TURBO_FORCE=true pnpm build`: `nz gen` (up to date), `nz api` (3 files: `contracts/api/css/alert.json`, `contracts/api/react/alert.json`, `contracts/api/react/field.json`, the last for the `error` prop's description only), `node fixtures/floor-lane/gen-w5.ts` (`w5-components.html` changed: the dismiss markup and one empty announcer span per FieldScope Field), and `node packages/tooling/size/measure.ts --write` (never `--rebase`). `packages/tooling/api/API-JSON.md`'s worked example is now the current `alert.json` pair.

## Size

`pnpm size` passes. Every entry whose `measured` moved (gzip, size-limit):

| Entry                             | Week 7 | Week 8 | Budget              |
| --------------------------------- | -----: | -----: | ------------------- |
| `@nizivo/react` (`.`)             | 85,879 | 86,198 | 93 KiB              |
| `./alert`                         |  1,244 |  1,282 | 1.4 KiB             |
| `./checkbox`                      |  2,068 |  2,071 | 2.3 KiB             |
| `./field`                         |  3,115 |  3,463 | 3.4 KiB (18 B left) |
| `./input`                         |  1,811 |  1,817 | 2 KiB               |
| `./segmented-control`             |  2,365 |  2,371 | 2.6 KiB             |
| `./switch`                        |  1,729 |  1,735 | 1.9 KiB             |
| `./textarea`                      |  1,349 |  1,355 | 1.5 KiB             |
| dashboard set (§17.1)             | 77,373 | 77,378 | 76 KiB (446 B left) |
| `{ Select }` from the barrel      | 63,185 | 63,189 | 68 KiB              |
| `own: alert/alert-dismiss.client` |    354 |    394 | 0.4 KiB (15 B left) |
| `own: field/field-scope.client`   |  1,123 |  1,490 | **1.3 → 1.6 KiB**   |
| `css/alert.css`                   |    734 |    636 | 0.8 KiB             |
| `styles.css`                      | 14,971 | 14,942 | 16 KiB              |

No §17.1 limit moved and none is exceeded: Tooltip 16,372 B (12 B under 16 KiB), Dialog 32,127 B (32 KiB), Tabs 33,683 B, Menu and Select unchanged. The one budget change is `own: field/field-scope.client` (above). Tight, reported: Tooltip 12 B, `./field` 18 B, `own: alert/alert-dismiss.client` 15 B. The figures are the committed tree's, after the review fixes ("Week 8 review" below).

## Visual regression

`node scripts/visual/run.ts` (compare, ±2 per channel) on the integrated tree first showed the 16 `alert/dismissible--*` shots and 40 rest shots of Field examples (checkbox, field, input, segmented-control, switch, textarea; 4 modes) changing. The 40 Field shots were a crop artefact: the harness unions every element's box, and the announcer's 1 px visually hidden box sits 1 px outside the Field (base.css `margin: -1px`). The harness (`test/visual/harness.tsx`, `crop()`) now leaves out elements inside `.nz-visually-hidden`, which paint nothing. With that, the Field shots are identical, and the 4 `skeleton/basic--rest--*` shots shrink by 1 px (665 → 664 px wide; the Skeleton example's visually hidden "Loading orders" span had widened them); aligned by that column they match their baselines pixel for pixel (worst difference 0).

The 16 Alert shots were opened before and after (rest, hover, focus and press in light, dark, forced and forced dark). As intended: the glyph moves to 16 px from the edge on the title's line; hover and press show IconButton's tertiary fill; focus shows IconButton's ring and halo around the 32 px box; in forced colours the box draws IconButton's `ButtonText` border at rest. State shots grow from 49 × 48 to 57 × 56 px; the rest shots go from 331 × 133 to 323 × 133 (the dismiss's layout box is now the 16 px glyph). For Dayitava's forced-colours review: that border sits about 5 px from the end of a long title and about 6 px under the alert's own border.

`--update --only alert,skeleton` changed 20 baselines (0 added, 0 removed); then two full compares: 1,528 shots, no visual differences in either (1,527 and 1,526 identical; the rest within the tolerance, Switch focus shots by 1 px).

## Floor lane

Week 5's commands on the three week 5 pages (`--pages w5-components,w5-paint,w5-grid --tokens packages/tokens/dist/tokens.css --react-css packages/react/dist/css --results fixtures/floor-lane/results/w5-components`), Firefox 129.0 from Mozilla's release archive (week 7's download), plus `--touch` and `--ios-sim`:

| Run (both OS schemes, per scheme)  | `w5-components` | `w5-paint` | `w5-grid` |
| ---------------------------------- | --------------: | ---------: | --------: |
| Firefox 129.0                      |         219/219 |      29/29 |     39/39 |
| Chromium 156.0.8078.4              |         219/219 |      29/29 |     39/39 |
| WebKit 27.2                        |         219/219 |      29/29 |     39/39 |
| Chromium 156.0.8078.4, `--touch`   |         219/219 |      29/29 |     39/39 |
| WebKit 27.2, `--touch`             |         219/219 |      29/29 |     39/39 |
| Mobile Safari 17.5 (iOS 17.5 Sim.) |         219/219 |      29/29 |     39/39 |

287 of 287 per scheme everywhere (285 in week 7, plus the two glyph checks). In every run the dismiss is 32 × 32 px, its glyph 16 × 16 px and 16 px from the inline-end edge in both directions. `xcrun simctl list devices | grep -c nz-floor` printed 0 afterwards. `w3-controls` has no Alert and was not rerun.

## Fixtures

Recorded with `--record` on a fresh build and pack each: `node fixtures/runner/next.ts --dev --record`, `node fixtures/runner/vite.ts --record`, `node fixtures/runner/astro.ts --record`. Next (Turbopack, webpack, webpack + `optimizePackageImports`, `next dev`; 23 pages), Vite (12 pages) and Astro (12 pages) pass: 0 failures, 0 console messages, 0 build warnings, 0 axe violations, no theme flash. No install step needed a retry. **Every page's set of client modules (planted markers) is the same as week 7's, in every mode.**

Client JavaScript (gzip -9 of every chunk a page loads), week 7 → week 8:

| Page                                    | Turbopack                     | webpack             | webpack + OPI       | `next dev`        |
| --------------------------------------- | ----------------------------- | ------------------- | ------------------- | ----------------- |
| `/t0`, `/t0-barrel` (Alert, no dismiss) | 174,639 → 174,639 (0 modules) | 171,888 → 171,888   | 171,883 → 171,883   | 818,350 → 818,350 |
| `/alert-dismiss`                        | 176,093 → 176,129 (+36)       | +33                 | +34                 | +282              |
| `/field-zero-js` (static Field)         | 177,674 → 178,016 (+342)      | 171,888 (0 modules) | 171,883 (0 modules) | +776              |
| `/forms`                                | +334                          | +339                | +330                | +756              |
| Select pages (FieldScope)               | +297                          | +318                | +318                | +771              |

- An Alert without a dismiss still ships no `@nizivo` client module in any mode (0 markers, bytes unchanged), and `/alert-dismiss` ships only `alert/alert-dismiss.client`.
- A static Field ships no client module under production webpack (bytes equal to `/button-only`). Under Turbopack and `next dev` it still ships FieldScope, as since week 3 (D-aa); that cost is now +3,377 B (Turbopack) and +8,576 B (`next dev`) over `/button-only`, the announcer's ~340 B included. Pages that render FieldScope grow by about 300 to 340 B.
- Vite: `/alert-dismiss` +41 B, `/forms` +343, `/overlays` +341, `/barrel-select` +344; the pages without the two changed modules move by −10 to −3 B (chunk naming). Astro: `/alert-dismiss` +42, `/forms` +331, `/overlays` +334, `/two-islands` +331; its server-only pages still load no script. The byte tables in `fixtures/vite/RESULTS.md` and `fixtures/astro/RESULTS.md` are re-synced with the recorded JSON.
- The `partsScanned` strings of the Alert pages now read `icon-button-icon` where they read `alert-dismiss-icon`.

## Lanes

Run one after another on the integrated tree (`NZ_BROWSER=<engine> pnpm test:overlay` and `pnpm test:browser`):

- **Overlay conformance:** Chromium 127 passed and 7 skipped; WebKit 121 passed and 13 skipped; Firefox 121 passed and 13 skipped (as in week 7).
- **Browser lane:** Chromium 135 of 135 (week 7: 115; plus `alert.spec.tsx`, 6, and `field-announcer.spec.tsx`, 14); Firefox 116 passed and 19 skipped; WebKit 109 passed, 19 skipped and the 7 known Tab failures on macOS (IconButton 2, SegmentedControl 3, Tabs and TabNav 2; W6-RESULTS.md "Lanes"), the new Alert and announcer specs passing.
- **Node suites:** `@nizivo/react` 45 files, 641 tests; `@nizivo/tooling` 12 files, 174 tests (`api.test.ts` green again after `nz api`).

## Gate

`TURBO_FORCE=true pnpm check` from clean passes in 159 s: install (frozen lockfile), typecheck, lint, `gen:check`, the node suites, build, `check:a11y`, `size`, `floor:check`, `test:dist`, `check:release` and `docs:check` (the smoke: all checks on 58 pages). `lint` and `docs:check` were run again after the last text edits and pass.

## Week 8 review

Two reviewers (accessibility behaviour; release, CSS and plan) filed 8 findings: 7 fixed; for the eighth (R2-3) the comment is fixed and the token change rejected with the reason.

- **A11Y-1 (fixed).** The announcer spoke a client Field's error while native validation was about to move focus elsewhere: `invalid` armed the region at any control holding focus, so with a plain input or a zero-JS Field as the form's first invalid control (which FieldScope does not handle), the region spoke and then the browser focused that earlier control. `onInvalid` now arms only at the form's first invalid control, the condition that already decides the focus move (`first`, computed once). Boundary, documented: a `reportValidity()` call on a control that is not the form's first invalid one is silent. New cases: "Enter in a client Field after a plain input / a zero-JS Field that is invalid: focus leaves, nothing is spoken"; both fail with the fix reverted (Chromium). In Firefox the native bubble of the earlier control took the next test's first click, so the case blurs the control at its end.
- **A11Y-2 (fixed).** An app that clears its errors when a submit starts never had the reply spoken: the clearing commit withdrew the request. A commit that empties the error now keeps it (typing still withdraws it). New case: "an app that clears its errors when a submit starts: each new reply is spoken" (`['Title is taken', '', 'Title is too long']`); it fails with the fix reverted. The lingering-request follow-up below now names this case too.
- **R2-1 (fixed):** the Field page said every Field around a Nizivo control renders the region; a NativeSelect placed directly in a Field takes the zero-JS path and renders none. The page now names both zero-JS cases.
- **R2-2 (fixed):** the Turbopack note's measured page has two zero-JS Fields (a function child and a direct NativeSelect), not one; the page says so, and that the cost is per module.
- **R2-3 (comment fixed; the token change rejected).** The dismiss's block overhang is measured from `--nz-size-icon-md` on purpose: that is the leading `.nz-alert-icon`'s 20 px box, which sets the first line. The title's own line is 19.6 px (0.875rem × 1.4) and `--nz-alert-title-font` can restyle it, so deriving the margin from the font token would put the two glyphs on different centre lines. The `alert.css` comment now states the coupling; the built CSS is unchanged.
- **R2-4 (fixed):** the hook rule's compound is now `.nz-alert > .nz-icon-button.nz-alert-dismiss` (same specificity and declarations), so `contracts/api/css/alert.json` reports `--nz-alert-dismiss-fg` on the `alert-dismiss` slot, not on IconButton's; `API-JSON.md`'s worked example follows.
- **R2-5 (fixed):** ARCHITECTURE.md's Dayitava list no longer doubles "including", and the two week 7 "Still open" bullets read as history ("Then still open … since settled").
- **R2-6 (fixed):** the week 5 "W6 needs" line's `cd ~ && npm profile get --json` is marked as superseded by M30.

After the fixes, on this machine: `own: field/field-scope.client` 1,490 B (1.6 KiB budget) and `./field` 3,463 B (18 B under 3.4 KiB); no other entry moved except the barrel (86,198 B) and `styles.css` (14,942 B). `field-announcer.spec.tsx` (17 cases) and `field.spec.tsx` pass in Chromium, WebKit and Firefox (the accessibility-tree case runs in Chromium only). Lanes, one after another: overlay Chromium 127 passed and 7 skipped, WebKit and Firefox 121 and 13; browser Chromium 138 of 138, Firefox 119 passed and 19 skipped, WebKit 112 passed, 19 skipped and the 7 known Tab failures. The three fixtures were re-recorded with `--record` (the tables above are the re-recorded figures; client-module sets unchanged). The floor lane was rerun on the three week 5 pages into a scratch folder (Firefox 129.0, Chromium, WebKit, both `--touch` passes and Mobile Safari 17.5): 287 of 287 per scheme, and its `w5-components` results equal the recorded ones. One WebKit `--touch` run first failed its dark pass with the stylesheets unapplied (button heights 24.59 px); its rerun passed every check, so this is recorded as a transient. Two visual compares: 1,526 identical and 2 within the tolerance, no differences.

## Not verified

- **Real screen readers** (NVDA, JAWS, VoiceOver on macOS and iOS, TalkBack): whether the announcer is spoken once, queued politely, and not doubled by an "invalid entry" state change on the focused control. The browser tests check the DOM, an in-page aria snapshot and, in Chromium only, the accessibility tree. Dayitava's manual pass (exit criterion 14, NIZ-78).
- **The forced-colours look of the Alert dismiss** (its `ButtonText` border at rest; see "Visual regression") and the tertiary hover fill over the tinted alert backgrounds: for Dayitava (NIZ-5) and the design owner.
- **A full `pnpm release` dry run** with the gate and the lanes: the uncommitted tree blocks its preflight, so only the short rehearsal above ran.
- **A dry run with the login file missing** runs only through the stubbed exec (hiding the real file was out of bounds).
- **The Tooltip flake fix under load** was proven by builder D's runs; the integration ran the WebKit overlay lane once, unloaded.
- **macOS Safari 17.5**, and the announcer and the dismiss on Firefox 129 and Safari 17.5 beyond the floor lane's CSS checks.
- **A Gecko engine under a coarse pointer** (unchanged from week 7).

## Follow-ups (not done, not decided)

- **The maintainer:** D-aa (NIZ-13); builder C's two extra refusals in the login-file rule (a file in the repo, a file directly in `~`); the announcer's documented boundary (a second Enter on an unchanged message within 7 s, or a reply equal to the shown error, is not re-announced).
- **Dayitava:** the Alert dismiss's forced-colours border and its spacing from the title; the tertiary hover fill on the tinted alerts; whether a reader meeting the message twice while the region holds it (up to 7 s) is acceptable.
- **Field:** a form library that moves focus into the control before the error commits gets neither reading (FIELD-CONTRACT.md "Outside the rule"); check react-hook-form's `shouldFocusError` when its recipe is written. After a same-text reply, or a submit whose clearing commit gets no error reply (the review's fix keeps the request through an empty commit), the armed state lingers until the next input event or text change. A `reportValidity()` call on a control that is not the form's first invalid one is silent (the review's fix arms `invalid` only at the first).
- **Alert:** optionally write `data-disabled` on a disabled default dismiss, for attribute parity with IconButton (CSS already covers `:disabled`).
- **React Aria:** a candidate upstream issue (Escape in `useTooltipTrigger` does not clear the focus flag); whether the week 6 O-03 Firefox flake has the same cause is a hypothesis.
- **Release:** each run leaves an empty `nz-npm-*` folder in `$TMPDIR` next to the `nz-publish-*` stage.
- **Size:** Tooltip 12 B, `./field` 18 B and the dismiss leaf 15 B of headroom.
