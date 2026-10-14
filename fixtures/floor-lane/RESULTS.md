# Browser floor lane: results

Status: run on 2026-10-14 on macOS 27.0.1 (arm64), Node 24.16.0; Mobile Safari 17.5 added on 2026-10-15 (iOS 17.5 Simulator, see Week 4 below). This is the W1 floor lane from ARCHITECTURE.md §21.1 (exit criterion 6): the S1 nesting matrix, the halo/inverse probe and the `@starting-style` overlay entry, run on the floor browsers.

## Verdict

- **Firefox 129.0 passes every check of the plan's mechanism**: `light-dark()` inside unregistered custom properties, read through `var()`, in nested `[data-nz-theme]` scopes, an unthemed root under OS dark, `system`, `[data-nz-scheme="inverse"]`, `color-mix()` (focus halo) and `box-shadow` (elevation). The `@starting-style` overlay entry also passes in every shape tested.
- **Degradation D1 (Firefox 129 to 131):** `light-dark()` written **directly** on a non-inherited property with literal colours (`background-color: light-dark(#fff, #181b19)`, the same inside `color-mix()`, or a `box-shadow` colour) resolves against the colour scheme of whichever element first used that rule, not its own. Painted pixels match the wrong computed value, so this is a rendering bug, not a `getComputedStyle` artefact. This is Firefox bug [1914735](https://bugzilla.mozilla.org/show_bug.cgi?id=1914735) ("Track color-scheme dependencies for non-inherited rule cache"), fixed in Firefox 132. Reproduced on 129.0 and 131.0; gone on 132.0 and 157.0. Nizivo's planned CSS does not take this shape (see D1 below).
- **Degradation D2 (all Firefox versions tested, 129 to 157):** an exit transition that ends in `display: none` is instant. `display` is not animatable in Firefox ([1834877](https://bugzilla.mozilla.org/show_bug.cgi?id=1834877) is still open). Entry is unaffected. Hiding with `visibility` instead of `display` fades in every browser tested.
- **D3 (expected, matches §12.4 gate 1):** the `overlay` property is missing in Firefox 129 to 157, WebKit 27.2 and Mobile Safari 17.5, so native popover and dialog exits are instant there.
- **Mobile Safari 17.5 (iOS 17.5 Simulator) passes every check**, on the §7.5 sample, on the built `tokens.css` and on the week 3 controls: 0 failures: 3,240 passing checks and 188 informational cells over both OS schemes, painted pixels included. User agent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`.
- **Degradation D4 (Mobile Safari 17.5, iOS 17.5 Simulator):** the same symptom as D2. An exit transition that ends in `display: none` is instant: `transition-behavior: allow-discrete` parses, yet right after closing `display` is already `none` and no opacity transition exists. Entry with `@starting-style` works. Hiding with `visibility` fades. WebKit 27.2 and Chromium 156 fade, so WebKit fixed this after 17.5 (the version was not bisected). (Numbered D4 because D3 was already taken.)
- **macOS Safari 17.5 is still not tested.** The Simulator runs iOS Safari; Playwright WebKit 27.2 stays a comparison only. Routes for the macOS half are listed below.

## Week 2: real `tokens.css` (2026-10-14)

The same pages rerun on the built `@nizivo/tokens` instead of the §7.5 sample: `packages/tokens/dist/tokens.css` (Terrazzo 2.8.0, 334 custom properties, 22,624 bytes) served under the name `plan-tokens.css` with `--tokens`. It carries the real theme scopes, `light-dark()` colours, elevation, focus halo, spring `linear()` easing and reduced-motion blocks. Every `--nz-*` name the pages read exists in it. Results are in `results/w2-real-tokens/`; the week 1 files in `results/` are unchanged.

```sh
node fixtures/floor-lane/run.ts --firefox <Firefox 129.0.app> --tokens packages/tokens/dist/tokens.css --results fixtures/floor-lane/results/w2-real-tokens
```

Each cell is passing checks over all checks, both OS schemes together.

| Page                                   | Firefox 129.0 | Chromium 156.0.8078.4 | WebKit 27.2 (not Safari 17.5) | Mobile Safari 17.5 (iOS Simulator) |
| -------------------------------------- | ------------- | --------------------- | ----------------------------- | ---------------------------------- |
| S1 nesting matrix                      | 274/324       | 324/324               | 324/324                       | 324/324                            |
| Halo, elevation and inverse probe      | 746/790       | 790/790               | 790/790                       | 790/790                            |
| Overlay entry                          | 38/38         | 38/38                 | 38/38                         | 38/38                              |
| Painted, `<html>` unthemed             | 194/224       | 224/224               | 224/224                       | 224/224                            |
| Painted, `<html data-nz-theme="dark">` | 182/224       | 224/224               | 224/224                       | 224/224                            |

- **Firefox 129.0 passes every token-path check on the real tokens.** All 166 failing cells are the D1 probes that write `light-dark()` directly on the property (`direct-d1`, `direct-d1-l2`, `direct-d1-normal`, `shadow-direct`, `bg-direct`, `bg-mix-direct`). They fail by design, as in week 1: the same 166 cells, page by page, as the run on the plan sample. The runner therefore exits 1 for Firefox 129, as before.
- **Chromium 156, WebKit 27.2 and Mobile Safari 17.5: 0 failures.** The Mobile Safari column was added on 2026-10-15 (`run.ts --ios-sim`, see Week 4).
- No result moved between the plan sample and the real file, so the week 1 verdict and D1 to D4 all stand for the shipped `tokens.css`.

## Week 3: controls on the shipped CSS (2026-10-14)

A new page, `pages/w3-controls.html` (`w3-controls.js`), renders the week 3 controls' server HTML (from `renderToStaticMarkup`) under the real `tokens.css` and the built `packages/react/dist/css` stylesheets, which `run.ts --react-css` serves under `react-css/`. It reads computed style for the CSS features week 3 ships near the floor. Results are in `results/w3-controls/`.

```sh
node fixtures/floor-lane/run.ts --firefox <Firefox 129.0.app> --tokens packages/tokens/dist/tokens.css --react-css packages/react/dist/css --pages w3-controls --results fixtures/floor-lane/results/w3-controls
```

| Check (both OS schemes)                                                                                                                                   | Firefox 129.0                                                                                    | Chromium 156.0.8078.4           | WebKit 27.2 (not Safari 17.5)   | Mobile Safari 17.5 (iOS Simulator)                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| All 10 stylesheets load                                                                                                                                   | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| Checkbox: `appearance: none`, `:checked` and `:indeterminate` paint the brand fill, the dash shows and the check hides                                    | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| `1lh`: the 20 px box is centred on the label's first line                                                                                                 | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| `:is([data-disabled], :has(> input:disabled))`: a fieldset-disabled Checkbox and Input dim                                                                | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| Switch: the thumb moves 16 px with `translate`; `:dir(rtl)` flips it to -16 px; the on track is the brand                                                 | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| Radio: the checked ring is the brand                                                                                                                      | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| SegmentedControl: `:has(> input:checked)` paints the thumb, `:has(> input:disabled)` dims an item, `min-inline-size: fit-content` keeps every label whole | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| nz.base nested-input rule, `:is(:has(> input:focus-visible), [data-focus-visible])`: an item marked `data-focus-visible` gets the solid outline           | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| NativeSelect: `:has(> option[value='']:checked)` greys the placeholder                                                                                    | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| Textarea: `rows` sets the height (rows 6 is 4 lines taller than rows 2)                                                                                   | pass                                                                                             | pass                            | pass                            | pass                                                                               |
| Textarea: `field-sizing`                                                                                                                                  | not supported: the `@supports` block is skipped and an 8-line value keeps the rows height (pass) | supported: grows 6 lines (pass) | supported: grows 6 lines (pass) | not supported: the `@supports` block is skipped and the rows height is kept (pass) |
| **Total**                                                                                                                                                 | **20/20 + 20/20**                                                                                | **20/20 + 20/20**               | **20/20 + 20/20**               | **20/20 + 20/20**                                                                  |

- **Firefox 129.0 and Mobile Safari 17.5 pass every week 3 check.** Their only difference is the expected one: no `field-sizing`, so Textarea keeps its `rows` height and the user resizes it. Mobile Safari 17.5 was added on 2026-10-15 (`run.ts --ios-sim`, see Week 4); `CSS.supports('selector(:has(> input))')` is true there.
- The page's own stylesheet sets `transition-duration: 0s` on the controls, so a state change can be read at once.
- **Negative control:** the same page without `--react-css` fails 18 of 20 checks in Chromium (36 FAIL lines over both schemes), so the checks read the shipped CSS. The same held by accident in Mobile Safari 17.5: a first `--ios-sim` run without `--react-css` failed 17 of 20 per scheme (not kept).
- Not covered here: keyboard-driven `:focus-visible` (a driver-free page cannot press keys; the browser lane in `packages/react/test/browser` covers it in Chromium and WebKit) and forced colours.

## Week 4: Mobile Safari 17.5 on the iOS 17.5 Simulator (2026-10-15)

The iOS 17.5 Simulator runtime (17.5, build 21F79) is installed under Xcode 27.0, so the floor's iOS half now runs on this Mac at no cost. `run.ts --ios-sim` drives it with Xcode's `xcrun simctl` only, with no new dependency:

1. It creates a throwaway device (`xcrun simctl create nz-floor-17.5 "iPhone 15" com.apple.CoreSimulator.SimRuntime.iOS-17-5`) and waits for it to boot (`simctl bootstatus -b`).
2. For each OS scheme it sets the device appearance (`xcrun simctl ui <udid> appearance light|dark`).
3. It opens each page with `xcrun simctl openurl <udid> http://127.0.0.1:<port>/<page>?report&calibrate&nz=<nonce>`. The Simulator shares the host's loopback, so the runner's own page server answers. The page measures itself, as in every other browser, and POSTs its JSON to `/result` with its query. The runner matches the `nz` nonce, so a stale tab can never be counted.
4. For the painted page it takes `xcrun simctl io <udid> screenshot` (the whole 1179 × 2556 device screen, sRGB PNG). The page adds an 8 × 8 px `rgb(0 255 0)` square at the top-left corner with `?calibrate`, clear of the probe rows, and reports its position. The runner finds that square to place the viewport in the screenshot, then samples every probe as before. On the iPhone 15 the viewport starts 177 device px (59 pt, the status bar) from the top, at `devicePixelRatio` 3.
5. It writes `mobile-safari-<Version>.json` in the same shape as the other engines. The version comes from the posted `navigator.userAgent` (`Version/17.5 Mobile/15E148 Safari/604.1`). At the end, and on Ctrl-C, it shuts the device down and deletes it.

```sh
pnpm build   # or: turbo run build --filter=@nizivo/react...  (tokens.css and packages/react/dist/css)
W1=nesting,halo-inverse,overlay-entry,paint.html-none,paint.html-dark
node fixtures/floor-lane/run.ts --ios-sim --pages $W1                                    # results/
node fixtures/floor-lane/run.ts --ios-sim --pages $W1 --tokens packages/tokens/dist/tokens.css --results fixtures/floor-lane/results/w2-real-tokens
node fixtures/floor-lane/run.ts --ios-sim --pages w3-controls --tokens packages/tokens/dist/tokens.css --react-css packages/react/dist/css --results fixtures/floor-lane/results/w3-controls
```

`--ios-runtime <id>` and `--ios-device-type <name>` pick another runtime or device. All three runs exited 0 and left no device behind.

| Probe group (both OS schemes)                                                                                                                                                         | §7.5 sample (`results/`) | Built `tokens.css` (`results/w2-real-tokens/`) | Plan claim                    | Matches?                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------- | ----------------------------- | ------------------------ |
| S1 nesting matrix: token path, unset and `normal` roots, direct `light-dark()`                                                                                                        | 324/324                  | 324/324                                        | §7.4 bullets 1–2              | Yes (no D1)              |
| Halo, elevation, inverse; `color-mix()` and `box-shadow` over `light-dark()`                                                                                                          | 790/790                  | 790/790                                        | §7.4, §7.5                    | Yes                      |
| Inverse inside inverse (info)                                                                                                                                                         | stays inverse            | stays inverse                                  | plan is silent                | Same gap as every engine |
| Painted, `<html>` unthemed and dark (computed and screenshot pixels)                                                                                                                  | 448/448                  | 448/448                                        | §7.4                          | Yes                      |
| Overlay entry: `allow-discrete` parses, `linear()` spring parses, entry from `display: none` (popover, modal dialog, `[data-open]`, nested `@starting-style`, inserted open), control | 38/38                    | 38/38                                          | §13.2 rule 4, §13.1           | Yes                      |
| Exit of `[data-open]` to `display: none` (info)                                                                                                                                       | instant                  | instant                                        | §13.2 rule 4 "enter and exit" | **No for exit (D4)**     |
| Exit of native popover / dialog (info); `overlay` property                                                                                                                            | instant; false           | instant; false                                 | §12.4 gate 1                  | As the plan expects (D3) |
| Exit that hides with `visibility` (info)                                                                                                                                              | fades                    | fades                                          | none                          | Workaround for D2 and D4 |
| Week 3 controls on the shipped CSS (`results/w3-controls/`)                                                                                                                           | —                        | 40/40                                          | week 3 rows above             | Yes                      |

- Every page saw the requested OS scheme (`matchMedia`) and `prefers-reduced-motion: no-preference`; reduced motion is off by default in a new device and `simctl` has no switch for it, so none was needed. Animation frames ran normally (20 and 21 frames in 300 ms).
- `CSS.supports` reported true for `light-dark()` alone, in `color-mix()` and in `box-shadow`, for `@starting-style`, the popover API and `:popover-open`; false for `field-sizing` and `overlay`.
- Every info cell other than the `[data-open]` and nested `@starting-style` exits has the same value as WebKit 27.2, in both OS schemes and on both token files.
- Negative control: the painted checks observed both colours (128 red and 96 blue cells across the run on the built tokens), so a misplaced viewport would have failed them. The Chromium and WebKit lanes were rerun after the runner change (`--results` to a scratch folder) and still pass every check.
- **Not automated:** keyboard-driven `:focus-visible`, as in every other engine (a driver-free page cannot press keys), and forced colours (iOS has no forced-colours mode). Everything else in the lane runs unattended.

## Week 4 integration rerun on the final tree (2026-10-15)

At week 4 integration the lane ran again on the integrated tree (`packages/tokens/dist/tokens.css` and `packages/react/dist/css` built from it, with Menu, Tabs, TabNav and the Select popup change), into scratch folders, and each result was compared with the committed file cell by cell (every page's summary and every non-passing cell):

```sh
W1=nesting,halo-inverse,overlay-entry,paint.html-none,paint.html-dark
node fixtures/floor-lane/run.ts --firefox <Firefox 129.0.app> --pages $W1 --tokens packages/tokens/dist/tokens.css --results <scratch>/ff-w2
node fixtures/floor-lane/run.ts --firefox <Firefox 129.0.app> --pages w3-controls --tokens packages/tokens/dist/tokens.css --react-css packages/react/dist/css --results <scratch>/ff-w3
node fixtures/floor-lane/run.ts --ios-sim --pages $W1 --tokens packages/tokens/dist/tokens.css --results <scratch>/ios-w2
node fixtures/floor-lane/run.ts --ios-sim --pages w3-controls --tokens packages/tokens/dist/tokens.css --react-css packages/react/dist/css --results <scratch>/ios-w3
```

| Run (both OS schemes)                     | Firefox 129.0                          | Mobile Safari 17.5 (iOS 17.5 Simulator) | Chromium 156 and WebKit 27.2 |
| ----------------------------------------- | -------------------------------------- | --------------------------------------- | ---------------------------- |
| Built `tokens.css`, the five week 1 pages | 1,434 pass, 166 fail (all D1), 94 info | 1,600 pass, 0 fail, 94 info             | 0 failures                   |
| `w3-controls` on the shipped CSS          | 40/40                                  | 40/40                                   | 40/40 each                   |

**Every page's summary and every non-passing cell is identical to the committed `results/w2-real-tokens/` and `results/w3-controls/` files**, so those files stand for the week 4 tree and were not rewritten. The Firefox runner exits 1 by design (the D1 probes); the other three runs exited 0 and the Simulator runs left no device behind. The floor pages do not render Menu, Tabs or TabNav; their CSS uses nothing the `w3-controls` page does not already cover except `overflow: auto hidden` on the Tabs strip and `display: contents` on Dialog's nested-portal container, both accepted by the Lightning CSS floor guard; no floor page exercises them.

## Browsers

| Browser        | Exact version                                                     | Source                                                                                                                                                  | Driven by                                                             | Role                                                                                |
| -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Firefox        | 129.0 (BuildID 20240801122119)                                    | Mozilla release archive, `Firefox 129.0.dmg`, SHA-256 `4b86e9de2b26339b30342a1ef3be1e3914d70921f81fd67bc9c63595823051f1` (matches Mozilla's SHA256SUMS) | WebDriver BiDi over Node's `WebSocket`, headless                      | **Floor**                                                                           |
| Firefox        | 131.0 (BuildID 20240923135042)                                    | Mozilla release archive, SHA-256 `cd243b44…ccb2` (matches SHA256SUMS)                                                                                   | WebDriver BiDi, headless                                              | Bisects D1                                                                          |
| Firefox        | 132.0 (BuildID 20241021175835)                                    | Mozilla release archive, SHA-256 `5924171c…9704` (matches SHA256SUMS)                                                                                   | WebDriver BiDi, headless                                              | Bisects D1                                                                          |
| Firefox        | 157.0 (BuildID 20261002115412)                                    | Playwright 1.64.0 cache (`firefox-1555`, `Nightly.app`)                                                                                                 | WebDriver BiDi (not Playwright's Juggler), headless                   | Current Firefox (Playwright's patched build reporting 157.0, not a Mozilla release) |
| Chromium       | 156.0.8078.4                                                      | Playwright 1.64.0 cache (revision 1248)                                                                                                                 | Playwright, emulated `prefers-color-scheme`                           | Comparison                                                                          |
| WebKit         | 27.2                                                              | Playwright 1.64.0 cache (`webkit-2370`)                                                                                                                 | Playwright, emulated `prefers-color-scheme`                           | Comparison only: **not Safari 17.5**                                                |
| Mobile Safari  | 17.5 (`Version/17.5 Mobile/15E148 Safari/604.1`, WebKit 605.1.15) | Xcode 27.0 iOS 17.5 Simulator runtime, build 21F79, device type iPhone 15                                                                               | `xcrun simctl openurl`, page POSTs its result, `simctl io screenshot` | **Floor (iOS half)**, added 2026-10-15                                              |
| Safari (macOS) | 17.5                                                              | none available                                                                                                                                          | —                                                                     | **Not tested**                                                                      |

Every page ran twice per browser, once with the OS colour scheme light and once dark. Each page records `matchMedia('(prefers-color-scheme: dark)')`, and the runner refuses a result whose scheme differs from the one requested, so the emulation is checked on every row. Firefox's scheme is set with the profile prefs `layout.css.prefers-color-scheme.content-override` and `ui.systemUsesDarkTheme`; the Simulator's with `xcrun simctl ui <udid> appearance`. Reduced motion was off in every run.

## Results per check and browser

Counts are passing cells over all cells, both OS schemes together. "Token path" means `light-dark()` declared in a custom property and read through `var()`, which is the shape `tokens.css` uses. "Direct" means `light-dark()` written on the property itself. Raw values for every failing and informational cell are in `results/<browser>-<version>.json`.

### S1 nesting matrix (`pages/nesting.html`)

Port of `spikes/s1-lightningcss/matrix.mjs` and `matrix-varinside.mjs`, native rows only: 2 token forms (literal and `var()` inside) × root `color-scheme` (`light dark`, unset, `normal`) × `<html data-theme>` (none, dark, light) × 9 probes (dark → light → dark nesting, and a `normal` scope).

| Check                                                            | Firefox 129.0    | Firefox 131.0    | Firefox 132.0 | Firefox 157.0 | Chromium 156 | WebKit 27.2 | Plan claim                     | Matches?           |
| ---------------------------------------------------------------- | ---------------- | ---------------- | ------------- | ------------- | ------------ | ----------- | ------------------------------ | ------------------ |
| Token path, all scopes                                           | 180/180 pass     | 180/180          | 180/180       | 180/180       | 180/180      | 180/180     | §7.4 bullet 1 (nesting free)   | Yes                |
| Unset or `normal` root under OS dark resolves light (token path) | 40/40 pass       | 40/40            | 40/40         | 40/40         | 40/40        | 40/40       | §7.4 bullet 2 (opt-in default) | Yes                |
| Direct `background-color: light-dark()`                          | **94/144, fail** | **94/144, fail** | 144/144       | 144/144       | 144/144      | 144/144     | S1 `.direct` probes            | No on 129–131 (D1) |

Firefox 129 direct failures, observed vs expected: with `<html>` unthemed or light, `direct-d1` (inside `[data-theme=dark]`) reads L instead of D; with `<html data-theme=dark>`, `direct-d1-l2` and `direct-d1-normal` read D instead of L. Each direct probe takes the scheme of the first probe styled by the same rule (the root one). The `var()` probes next to them are correct in every cell.

### Halo, elevation and inverse probe (`pages/halo-inverse.html`)

Port of `scripts/probe/probe.mjs`, run on the §7.5 token shapes (`pages/plan-tokens.css`): 12 scope groups (unthemed root, light, dark, system, dark → light, light → system, and an inverse surface in each) × `<html data-nz-theme>` none, light, dark, system. Each probe is compared with a same-engine reference element styled with the literal light or dark value, because computed colours can serialise differently per engine (here all three report the halo as `oklab(… / 0.28)`, with different rounding).

| Check                                                                                  | Firefox 129.0                        | Firefox 131.0   | Firefox 132.0 | Firefox 157.0 | Chromium 156 | WebKit 27.2 | Plan claim                                  | Matches?                        |
| -------------------------------------------------------------------------------------- | ------------------------------------ | --------------- | ------------- | ------------- | ------------ | ----------- | ------------------------------------------- | ------------------------------- |
| `--nz-bg-surface`, `--nz-text-primary`, `--nz-border-focus`, `--nz-bg-scrim` per scope | pass (all 384)                       | pass            | pass          | pass          | pass         | pass        | §7.4 bullets 1–2                            | Yes                             |
| `--nz-focus-halo` (`color-mix()` over a `light-dark()` token) per scope                | 96/96 pass                           | 96/96           | 96/96         | 96/96         | 96/96        | 96/96       | §7.5 note: UNVERIFIED in Firefox            | **Now verified on Firefox 129** |
| `--nz-elevation-1` (`light-dark()` inside `box-shadow`) per scope                      | 96/96 pass                           | 96/96           | 96/96         | 96/96         | 96/96        | 96/96       | §7.5 note: UNVERIFIED in Firefox            | **Now verified on Firefox 129** |
| Inverse surfaces (`data-nz-scheme="inverse"`) flip every token                         | 288/288 pass                         | 288/288         | 288/288       | 288/288       | 288/288      | 288/288     | §7.4 bullet 4                               | Yes                             |
| Inverse inside `data-nz-theme="system"` under OS dark resolves light                   | pass                                 | pass            | pass          | pass          | pass         | pass        | §7.5 `@media` flip of `--nz-scheme-inverse` | Yes                             |
| `color-mix(in oklab, light-dark(var(…), var(…)) 28%, transparent)` written directly    | 96/96 pass                           | 96/96           | 96/96         | 96/96         | 96/96        | 96/96       | none (control)                              | —                               |
| `box-shadow: 0 1px 2px 0 light-dark(rgb(…), rgb(…))` written directly                  | **52/96, fail**                      | **52/96, fail** | 96/96         | 96/96         | 96/96        | 96/96       | none (control)                              | D1 on 129–131                   |
| `CSS.supports` for `light-dark()` alone, inside `color-mix()`, inside `box-shadow`     | true ×3                              | true ×3         | true ×3       | true ×3       | true ×3      | true ×3     | floor features                              | Yes                             |
| Inverse inside inverse (info)                                                          | stays inverse (L under a dark theme) | same            | same          | same          | same         | same        | **plan is silent**                          | Gap, see below                  |

### Painted check (`pages/paint.html`)

The computed checks above could in principle be a `getComputedStyle` bug, so this page uses a static layout (nothing toggled after load) with red for light and blue for dark, and the runner samples the centre pixel of each square from a screenshot. 7 scope rows × `<html>` unthemed and dark × 2 OS schemes = 28 cells per probe.

| Probe                                                                 | Firefox 129.0 computed / painted | Firefox 131.0     | Firefox 132.0, 157.0, Chromium 156, WebKit 27.2 |
| --------------------------------------------------------------------- | -------------------------------- | ----------------- | ----------------------------------------------- |
| `background-color: var(--paint)` (token path)                         | 28/28 / 28/28                    | same              | all pass                                        |
| `box-shadow: inset … var(--paint)` (token path)                       | 28/28 / 28/28                    | same              | all pass                                        |
| `light-dark(var(--light), var(--dark))` written directly              | 28/28 / 28/28                    | same              | all pass                                        |
| `light-dark(rgb(…), rgb(…))` as an **inline style**                   | 28/28 / 28/28                    | same              | all pass                                        |
| `color: light-dark(rgb(…), rgb(…))` (inherited property)              | 28/28 / 28/28                    | same              | all pass                                        |
| `background-color: light-dark(rgb(…), rgb(…))` in a stylesheet rule   | **16/28 / 16/28**                | **16/28 / 16/28** | all pass                                        |
| the same inside `color-mix(in srgb, … 100%, transparent)`             | **16/28 / 16/28**                | **16/28 / 16/28** | all pass                                        |
| `box-shadow: inset … light-dark(rgb(…), rgb(…))` in a stylesheet rule | **16/28 / 16/28**                | **16/28 / 16/28** | all pass                                        |

Painted always equals computed, so D1 is what users see. The rows that pass on 129 pin the trigger down: a stylesheet rule whose `light-dark()` has only literal colours, on a non-inherited property. Any `var()` in the declaration, an inline style, or an inherited property avoids it, which is consistent with the bug's fix ("Track color-scheme dependencies for non-inherited rule cache").

### Overlay entry (`pages/overlay-entry.html`)

The §13.3 motion on the plan tokens: `opacity` on `--nz-duration-fade`, `scale` from `--nz-scale-enter` on the `--nz-duration-spring` / `--nz-easing-spring` pair, plus `display … allow-discrete` and `overlay … allow-discrete`. The decisive entry evidence is synchronous: right after opening, a `CSSTransition` on `opacity` and `scale` exists only if `@starting-style` supplied a before-change style. A control without `@starting-style` must show no transition, and does in every browser. Animation frames ran normally headless (19 frames in 300 ms everywhere).

| Check                                                                                         | Firefox 129.0                                                             | Firefox 131/132/157 | Chromium 156                        | WebKit 27.2 | Plan claim                               | Matches?                        | Mobile Safari 17.5 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------- | ----------------------------------- | ----------- | ---------------------------------------- | ------------------------------- | ------------------ |
| `transition-behavior: allow-discrete` parses                                                  | true                                                                      | true                | true                                | true        | §1 floor, D7                             | Yes                             | true               |
| `--nz-easing-spring` `linear()` string parses                                                 | true                                                                      | true                | true                                | true        | §13.1 (verified only in Chromium/WebKit) | **Now verified on Firefox 129** | true               |
| Native `popover` entering from `display: none` (opacity from 0, scale from 0.96, runs to 1/1) | pass                                                                      | pass                | pass                                | pass        | §13.2 rule 4                             | Yes                             | pass               |
| Native modal `dialog` entering from `display: none`                                           | pass                                                                      | pass                | pass                                | pass        | §13.2 rule 4                             | Yes                             | pass               |
| `[data-open]` toggle from `display: none` (the shipped vocabulary)                            | pass                                                                      | pass                | pass                                | pass        | §13.2 rule 4, §8.3                       | Yes                             | pass               |
| `@starting-style` nested inside the style rule                                                | pass                                                                      | pass                | pass                                | pass        | none                                     | —                               | pass               |
| Node inserted already open (portal mount)                                                     | pass                                                                      | pass                | pass                                | pass        | §12.2 engine overlays                    | Yes                             | pass               |
| Exit of `[data-open]` to `display: none` (info)                                               | **instant**: `display` is `none` right after close, no opacity transition | same (also 157)     | fades, `display` held until the end | fades       | §13.2 rule 4 "enter and exit"            | **No for exit (D2)**            | **instant (D4)**   |
| Exit of native popover / dialog (info)                                                        | instant                                                                   | instant             | fades                               | instant     | §12.4 gate 1                             | As the plan expects             | instant            |
| `overlay` property supported (info)                                                           | false                                                                     | false               | true                                | false       | §12.4 gate 1                             | Gate still closed               | false              |
| Exit that hides with `visibility` instead of `display` (info)                                 | fades (`visible` right after close, `hidden` after)                       | fades               | fades                               | fades       | none                                     | Workaround for D2               | fades              |

`:popover-open` and `[open]` appear only in this fixture, because a native overlay enters from `display: none` through them. They are not shipped vocabulary (§8.3 rule 2).

## Degradations and what they mean for the plan

**D1. Firefox 129–131: direct `light-dark()` with literal colours on non-inherited properties.**

- **Not hit by Nizivo's CSS.** `tokens.css` declares `light-dark()` only in custom properties, and components read them through `var()`; §8.4 already bans `light-dark(` outside `packages/tokens`. Every token-path cell passes on 129.
- **Hit by consumer CSS** that writes `light-dark(#…, #…)` directly on `background`, `border` or `box-shadow` inside nested `data-nz-theme` scopes. The §7.9 recipe 1 sets custom properties, so it is safe as written; the docs should say to keep that form and not paste `light-dark()` onto properties.
- The bug report's own test case shows the same failure for system colours (`Canvas`, borders) in non-inherited properties. This lane did not measure system colours; the plan uses them only under `forced-colors: active`.
- **Deviations page entry (proposed):** "Firefox 129–131: `light-dark()` with literal colours written directly on a non-inherited property can take the wrong scheme in nested scopes (Firefox bug 1914735, fixed in 132). Nizivo's tokens are unaffected; write theme colours as custom properties."

**D2. Firefox (129 through 157): exit to `display: none` is instant.** Entry works everywhere. §13.2 rule 4 promises "CSS-first enter **and exit**" for CSS-only components; in Firefox the exit half only works if the component hides with `visibility` (with `allow-discrete`) or stays mounted, not with `display: none`. Engine-managed overlays are unaffected, because they keep the node mounted through `data-exiting` (§12.2).

**D3. No `overlay` property in Firefox 129–157, WebKit 27.2 or Mobile Safari 17.5.** Native popover and dialog exits are instant there. This is §12.4 gate 1, already recorded as a reason not to swap to native overlays.

**D4. Mobile Safari 17.5 (iOS 17.5 Simulator): exit to `display: none` is instant.** The same symptom and the same consequence as D2: `transition-behavior: allow-discrete` parses, but `display` does not transition, so a `[data-open]` exit (plain or with nested `@starting-style`) reaches `display: none` at once with no opacity transition. WebKit 27.2 and Chromium 156 fade. Entry passes everywhere, and hiding with `visibility` fades on 17.5, so the D2 workaround covers both. Engine-managed overlays keep the node mounted through `data-exiting` (§12.2) and are unaffected.

**Plan gap (not a browser bug).** An inverse surface inside another inverse surface does not flip back: the inner one keeps the outer one's scheme in every engine, because `--nz-scheme-inverse` is inherited unchanged. §7.4 does not say which behaviour is intended (for example, a Tooltip opened inside a `tone="inverse"` Card).

## macOS Safari 17.5: not tested

Mobile Safari 17.5 now runs on the iOS 17.5 Simulator (route 1 below, automated as `run.ts --ios-sim`, see Week 4). That covers the iOS half of the floor ("Safari/iOS 17.5"), not macOS Safari 17.5. This Mac runs macOS 27.0.1 with Safari 27, and Playwright's WebKit 27.2 is a current engine, so neither can stand in for macOS Safari 17.5. The pages are built for a manual run: they measure themselves, show PASS or FAIL in large type, and, when served by `run.ts --serve` and opened from its index, post their JSON to `results/manual/<browser>-<page>-<scheme>.json` (for example `ios-safari-17.5-nesting-dark.json`). The painted page needs a person to compare each square with its label.

Zero-cost routes, checked 2026-10-14:

1. **iOS 17.5 Simulator on this Mac (local, free). Done on 2026-10-15: the runtime is installed and `run.ts --ios-sim` automates every step below.** Xcode 27.0 is installed, and Apple's support table lists Xcode 27 simulator support as "iOS 17 or later" ([developer.apple.com/support/xcode](https://developer.apple.com/support/xcode/)). Apple's Safari 17.5 release notes say "Safari 17.5 is available for iOS 17.5, iPadOS 17.5, visionOS 1.2, macOS Sonoma, macOS Monterey, and macOS Ventura", released May 13, 2024, build 19618.2.12 ([release notes](https://developer.apple.com/documentation/safari-release-notes/safari-17_5-release-notes)). The simulator runtime is several GB and installs into the system's CoreSimulator storage, so it was not done here. Steps (Xcode's own CLI; not run on this machine):
   ```sh
   xcodebuild -downloadPlatform iOS -buildVersion 17.5 -exportPath ~/Downloads/ios-17.5   # downloads the runtime image
   xcrun simctl runtime add ~/Downloads/ios-17.5/<runtime>.dmg                          # installs it
   xcrun simctl create nz-floor "iPhone 15" com.apple.CoreSimulator.SimRuntime.iOS-17-5
   xcrun simctl boot nz-floor
   node fixtures/floor-lane/run.ts --serve --port 8129                                  # in another terminal
   xcrun simctl openurl nz-floor "http://127.0.0.1:8129/"                               # tap each link
   xcrun simctl ui nz-floor appearance dark                                             # then repeat for dark
   ```
   The posted user agent must read `Version/17.5 … Safari`; record the result as "iOS Safari 17.5 (Simulator)". This covers the iOS half of the floor (the plan's floor is "Safari/iOS 17.5"), not macOS Safari 17.5.
2. **macOS Sonoma 14.5 virtual machine on this Apple-silicon Mac (local, free).** Apple's security-releases list shows macOS Sonoma 14.5 and Safari 17.5 both released on 13 May 2024 ([support.apple.com/en-us/100100](https://support.apple.com/en-us/100100)), and the release notes above list Safari 17.5 for macOS Sonoma. A free Virtualization.framework host such as UTM (Apache-2.0, [github.com/utmapp/UTM](https://github.com/utmapp/UTM/blob/main/LICENSE)) can install a 14.5 restore image, as long as the guest is kept from updating. UNVERIFIED here: the exact 14.5 restore-image download, and the macOS licence terms for virtual machines. Run `run.ts --serve --host 0.0.0.0` on the host and open the index from the guest.
3. **BrowserStack open-source programme.** The page offers "lifetime access to test your open source project on 3500+ browsers and devices", "Live, Automate and Percy" and "5 users and 5 parallels"; the application asks for a project URL ([browserstack.com/open-source](https://www.browserstack.com/open-source)). The page states no eligibility rules, so whether a company-backed Apache-2.0 project qualifies is still **UNVERIFIED**, as the plan says, and so is whether Safari 17.5 is in their browser list. Launch-era coverage (2018) mentions a public repo, an open-source licence and a BrowserStack logo in the README ([BrowserStack press release](https://www.browserstack.com/press/browserstack-announces-its-open-source-program-to-drive-community-innovation), [DevOps.com](https://devops.com/browserstack-announces-its-open-source-program-to-drive-community-innovation/)). Apply once `theneev/nizivo` is public.
4. **TestingBot open source.** Explicit criteria: a public GitHub, GitLab or Bitbucket repo, an OSI licence, active maintenance, and "Not a commercial or closed-source product"; "Apply anyway, we review every request". It offers "older and current browser versions" and real iOS devices, with no Safari version list ([testingbot.com/open-source](https://testingbot.com/open-source.md)). A company-backed project is not ruled out in writing.
5. **Sauce Labs Open Sauce.** The announcement offers free accounts to "any OSS project", self-serve with a repo URL, on condition that test results are public ([Sauce Labs blog](https://saucelabs.com/resources/blog/announcing-open-sauce-free-unlimited-testing-for-open-source-projects)). The post is old and third-party pages disagree on whether the plan still exists: UNVERIFIED.
6. **LambdaTest.** Its open-source page now redirects to testmuai.com, which returned 404 on 2026-10-14: could not be checked.
7. **Not a route: GitHub-hosted macOS runners.** The `macos-14` arm64 image ships Safari 26.6 ([runner-images readme](https://raw.githubusercontent.com/actions/runner-images/main/images/macos/macos-14-arm64-Readme.md), image 20260831), not 17.5.
8. **An Apple device still on iOS 17.5 or macOS 14.5**, if someone has one: open the served index over the LAN (`--host 0.0.0.0`).

## How to rerun

1. Get Firefox 129.0 (never into `/Applications`):
   ```sh
   D=/tmp/nz-floor && mkdir -p $D && cd $D
   curl -o firefox-129.0.dmg "https://archive.mozilla.org/pub/firefox/releases/129.0/mac/en-US/Firefox%20129.0.dmg"
   shasum -a 256 firefox-129.0.dmg   # 4b86e9de2b26339b30342a1ef3be1e3914d70921f81fd67bc9c63595823051f1
   hdiutil attach -nobrowse -readonly -mountpoint $D/mnt firefox-129.0.dmg
   cp -R $D/mnt/Firefox.app $D/ && hdiutil detach $D/mnt
   ```
   On Linux CI, use `https://archive.mozilla.org/pub/firefox/releases/129.0/linux-x86_64/en-US/` and pass the `firefox` binary.
2. Chromium and WebKit come from Playwright 1.64.0, a devDependency of this fixture (`@nizivo/fixture-floor-lane`). If they are not cached: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 --filter @nizivo/fixture-floor-lane exec playwright install chromium webkit` (not needed for this run: both were already cached).
3. Run everything (Firefox 129, Chromium, WebKit; both OS schemes):
   ```sh
   node fixtures/floor-lane/run.ts --firefox /tmp/nz-floor/Firefox.app
   ```
   - `--engines firefox` (or `chromium,webkit`) narrows the run; `NZ_FLOOR_FIREFOX` can replace `--firefox`.
   - `--tokens packages/tokens/dist/tokens.css` serves the generated tokens in place of `pages/plan-tokens.css` (build `@nizivo/tokens` first).
   - `--results <dir>` writes the results there instead of `results/`; the week 2 run used `results/w2-real-tokens`. Each result records the tokens file it was run on.
   - `--raw <dir>` writes every check; the committed `results/*.json` keep summaries, failures and notes only. They also leave out timing-only meta (`animationFramesIn300ms`, 19 or 20 from run to run), so a rerun differs only in `runAt`; the week 1 files predate this and still carry it.
   - `--serve [--port 8129] [--host 0.0.0.0]` only serves the pages, for a manual run in a browser no script can drive.
   - `--ios-sim` runs Mobile Safari on a throwaway iOS 17.5 Simulator device instead (Week 4); it needs Xcode and the iOS 17.5 runtime, nothing from npm.
   - The exit code is 1 when any check fails, so Firefox 129 and 131 exit 1 today because of D1.
4. How Firefox is driven: the runner writes a fresh profile with the prefs above and starts `firefox --headless --no-remote --profile <tmp> --remote-debugging-port=0`, then talks WebDriver BiDi over Node's built-in `WebSocket`, with no npm package and no geckodriver. It sets `HOME` and `CFFIXED_USER_HOME` to a temporary folder: on macOS, Firefox reads and writes `~/Library/Application Support/Firefox` even with `--profile` and hangs at startup when it cannot. That is also why spike S1d's Playwright Firefox never launched in a sandboxed session: launched plainly, it fails here too ("Failed to launch the browser process"), and with the same two variables passed through `firefox.launch({ env })` it starts (checked with Firefox 157.0). Its build was driven over BiDi in this lane so that every Firefox ran through the same code path.

## Files

- `pages/index.html`: links to every page (with `?report` for manual runs).
- `pages/plan-tokens.css`: the §7.5 sample declarations the checks read, with the canonical `@layer` line.
- `pages/harness.js`: shared result recording, the on-page report and the JSON hand-off.
- `pages/nesting.{html,js}`, `pages/halo-inverse.{html,js}`, `pages/overlay-entry.{html,js}`, `pages/paint.{html,js}`: the checks.
- `run.ts`, `png.ts`, `tsconfig.json`: the runner (Node 24 type stripping) and a dependency-free PNG reader for the painted check.
- `results/<browser>-<version>.json`: the week 1 runs on `pages/plan-tokens.css`.
- `results/w2-real-tokens/<browser>-<version>.json`: the week 2 runs on the built `tokens.css`.
- `results/w3-controls/<browser>-<version>.json`: the week 3 controls on the built `tokens.css` and `packages/react/dist/css`.
- `mobile-safari-17.5.json` in each of the three result folders: the iOS 17.5 Simulator runs (2026-10-15).
