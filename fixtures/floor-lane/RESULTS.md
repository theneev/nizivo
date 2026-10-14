# Browser floor lane: results

Status: run on 2026-10-14 on macOS 27.0.1 (arm64), Node 24.16.0. This is the W1 floor lane from ARCHITECTURE.md §21.1 (exit criterion 6): the S1 nesting matrix, the halo/inverse probe and the `@starting-style` overlay entry, run on the floor browsers.

## Verdict

- **Firefox 129.0 passes every check of the plan's mechanism**: `light-dark()` inside unregistered custom properties, read through `var()`, in nested `[data-nz-theme]` scopes, an unthemed root under OS dark, `system`, `[data-nz-scheme="inverse"]`, `color-mix()` (focus halo) and `box-shadow` (elevation). The `@starting-style` overlay entry also passes in every shape tested.
- **Degradation D1 (Firefox 129 to 131):** `light-dark()` written **directly** on a non-inherited property with literal colours (`background-color: light-dark(#fff, #181b19)`, the same inside `color-mix()`, or a `box-shadow` colour) resolves against the colour scheme of whichever element first used that rule, not its own. Painted pixels match the wrong computed value, so this is a rendering bug, not a `getComputedStyle` artefact. This is Firefox bug [1914735](https://bugzilla.mozilla.org/show_bug.cgi?id=1914735) ("Track color-scheme dependencies for non-inherited rule cache"), fixed in Firefox 132. Reproduced on 129.0 and 131.0; gone on 132.0 and 157.0. Nizivo's planned CSS does not take this shape (see D1 below).
- **Degradation D2 (all Firefox versions tested, 129 to 157):** an exit transition that ends in `display: none` is instant. `display` is not animatable in Firefox ([1834877](https://bugzilla.mozilla.org/show_bug.cgi?id=1834877) is still open). Entry is unaffected. Hiding with `visibility` instead of `display` fades in every browser tested.
- **D3 (expected, matches §12.4 gate 1):** the `overlay` property is missing in Firefox 129 to 157 and WebKit 27.2, so native popover and dialog exits are instant there.
- **Safari 17.5: not tested.** No Safari 17.5 is available on this machine. Playwright WebKit 27.2 is a current engine and is reported only as a comparison, never as Safari 17.5. Zero-cost routes are listed below.

## Week 2: real `tokens.css` (2026-10-14)

The same pages rerun on the built `@nizivo/tokens` instead of the §7.5 sample: `packages/tokens/dist/tokens.css` (Terrazzo 2.8.0, 334 custom properties, 22,624 bytes) served under the name `plan-tokens.css` with `--tokens`. It carries the real theme scopes, `light-dark()` colours, elevation, focus halo, spring `linear()` easing and reduced-motion blocks. Every `--nz-*` name the pages read exists in it. Results are in `results/w2-real-tokens/`; the week 1 files in `results/` are unchanged.

```sh
node fixtures/floor-lane/run.ts --firefox <Firefox 129.0.app> --tokens packages/tokens/dist/tokens.css --results fixtures/floor-lane/results/w2-real-tokens
```

Each cell is passing checks over all checks, both OS schemes together.

| Page                                   | Firefox 129.0 | Chromium 156.0.8078.4 | WebKit 27.2 (not Safari 17.5) |
| -------------------------------------- | ------------- | --------------------- | ----------------------------- |
| S1 nesting matrix                      | 274/324       | 324/324               | 324/324                       |
| Halo, elevation and inverse probe      | 746/790       | 790/790               | 790/790                       |
| Overlay entry                          | 38/38         | 38/38                 | 38/38                         |
| Painted, `<html>` unthemed             | 194/224       | 224/224               | 224/224                       |
| Painted, `<html data-nz-theme="dark">` | 182/224       | 224/224               | 224/224                       |

- **Firefox 129.0 passes every token-path check on the real tokens.** All 166 failing cells are the D1 probes that write `light-dark()` directly on the property (`direct-d1`, `direct-d1-l2`, `direct-d1-normal`, `shadow-direct`, `bg-direct`, `bg-mix-direct`). They fail by design, as in week 1: the same 166 cells, page by page, as the run on the plan sample. The runner therefore exits 1 for Firefox 129, as before.
- **Chromium 156 and WebKit 27.2: 0 failures.**
- No result moved between the plan sample and the real file, so the week 1 verdict, D1 to D3 and the Safari 17.5 gap below all stand for the shipped `tokens.css`.

## Browsers

| Browser  | Exact version                  | Source                                                                                                                                                  | Driven by                                           | Role                                                                                |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Firefox  | 129.0 (BuildID 20240801122119) | Mozilla release archive, `Firefox 129.0.dmg`, SHA-256 `4b86e9de2b26339b30342a1ef3be1e3914d70921f81fd67bc9c63595823051f1` (matches Mozilla's SHA256SUMS) | WebDriver BiDi over Node's `WebSocket`, headless    | **Floor**                                                                           |
| Firefox  | 131.0 (BuildID 20240923135042) | Mozilla release archive, SHA-256 `cd243b44…ccb2` (matches SHA256SUMS)                                                                                   | WebDriver BiDi, headless                            | Bisects D1                                                                          |
| Firefox  | 132.0 (BuildID 20241021175835) | Mozilla release archive, SHA-256 `5924171c…9704` (matches SHA256SUMS)                                                                                   | WebDriver BiDi, headless                            | Bisects D1                                                                          |
| Firefox  | 157.0 (BuildID 20261002115412) | Playwright 1.64.0 cache (`firefox-1555`, `Nightly.app`)                                                                                                 | WebDriver BiDi (not Playwright's Juggler), headless | Current Firefox (Playwright's patched build reporting 157.0, not a Mozilla release) |
| Chromium | 156.0.8078.4                   | Playwright 1.64.0 cache (revision 1248)                                                                                                                 | Playwright, emulated `prefers-color-scheme`         | Comparison                                                                          |
| WebKit   | 27.2                           | Playwright 1.64.0 cache (`webkit-2370`)                                                                                                                 | Playwright, emulated `prefers-color-scheme`         | Comparison only: **not Safari 17.5**                                                |
| Safari   | 17.5                           | none available                                                                                                                                          | —                                                   | **Not tested**                                                                      |

Every page ran twice per browser, once with the OS colour scheme light and once dark. Each page records `matchMedia('(prefers-color-scheme: dark)')`, and the runner refuses a result whose scheme differs from the one requested, so the emulation is checked on every row. Firefox's scheme is set with the profile prefs `layout.css.prefers-color-scheme.content-override` and `ui.systemUsesDarkTheme`. Reduced motion was off in every run.

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

| Check                                                                                         | Firefox 129.0                                                             | Firefox 131/132/157 | Chromium 156                        | WebKit 27.2 | Plan claim                               | Matches?                        |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------- | ----------------------------------- | ----------- | ---------------------------------------- | ------------------------------- |
| `transition-behavior: allow-discrete` parses                                                  | true                                                                      | true                | true                                | true        | §1 floor, D7                             | Yes                             |
| `--nz-easing-spring` `linear()` string parses                                                 | true                                                                      | true                | true                                | true        | §13.1 (verified only in Chromium/WebKit) | **Now verified on Firefox 129** |
| Native `popover` entering from `display: none` (opacity from 0, scale from 0.96, runs to 1/1) | pass                                                                      | pass                | pass                                | pass        | §13.2 rule 4                             | Yes                             |
| Native modal `dialog` entering from `display: none`                                           | pass                                                                      | pass                | pass                                | pass        | §13.2 rule 4                             | Yes                             |
| `[data-open]` toggle from `display: none` (the shipped vocabulary)                            | pass                                                                      | pass                | pass                                | pass        | §13.2 rule 4, §8.3                       | Yes                             |
| `@starting-style` nested inside the style rule                                                | pass                                                                      | pass                | pass                                | pass        | none                                     | —                               |
| Node inserted already open (portal mount)                                                     | pass                                                                      | pass                | pass                                | pass        | §12.2 engine overlays                    | Yes                             |
| Exit of `[data-open]` to `display: none` (info)                                               | **instant**: `display` is `none` right after close, no opacity transition | same (also 157)     | fades, `display` held until the end | fades       | §13.2 rule 4 "enter and exit"            | **No for exit (D2)**            |
| Exit of native popover / dialog (info)                                                        | instant                                                                   | instant             | fades                               | instant     | §12.4 gate 1                             | As the plan expects             |
| `overlay` property supported (info)                                                           | false                                                                     | false               | true                                | false       | §12.4 gate 1                             | Gate still closed               |
| Exit that hides with `visibility` instead of `display` (info)                                 | fades (`visible` right after close, `hidden` after)                       | fades               | fades                               | fades       | none                                     | Workaround for D2               |

`:popover-open` and `[open]` appear only in this fixture, because a native overlay enters from `display: none` through them. They are not shipped vocabulary (§8.3 rule 2).

## Degradations and what they mean for the plan

**D1. Firefox 129–131: direct `light-dark()` with literal colours on non-inherited properties.**

- **Not hit by Nizivo's CSS.** `tokens.css` declares `light-dark()` only in custom properties, and components read them through `var()`; §8.4 already bans `light-dark(` outside `packages/tokens`. Every token-path cell passes on 129.
- **Hit by consumer CSS** that writes `light-dark(#…, #…)` directly on `background`, `border` or `box-shadow` inside nested `data-nz-theme` scopes. The §7.9 recipe 1 sets custom properties, so it is safe as written; the docs should say to keep that form and not paste `light-dark()` onto properties.
- The bug report's own test case shows the same failure for system colours (`Canvas`, borders) in non-inherited properties. This lane did not measure system colours; the plan uses them only under `forced-colors: active`.
- **Deviations page entry (proposed):** "Firefox 129–131: `light-dark()` with literal colours written directly on a non-inherited property can take the wrong scheme in nested scopes (Firefox bug 1914735, fixed in 132). Nizivo's tokens are unaffected; write theme colours as custom properties."

**D2. Firefox (129 through 157): exit to `display: none` is instant.** Entry works everywhere. §13.2 rule 4 promises "CSS-first enter **and exit**" for CSS-only components; in Firefox the exit half only works if the component hides with `visibility` (with `allow-discrete`) or stays mounted, not with `display: none`. Engine-managed overlays are unaffected, because they keep the node mounted through `data-exiting` (§12.2).

**D3. No `overlay` property in Firefox 129–157 or WebKit 27.2.** Native popover and dialog exits are instant there. This is §12.4 gate 1, already recorded as a reason not to swap to native overlays.

**Plan gap (not a browser bug).** An inverse surface inside another inverse surface does not flip back: the inner one keeps the outer one's scheme in every engine, because `--nz-scheme-inverse` is inherited unchanged. §7.4 does not say which behaviour is intended (for example, a Tooltip opened inside a `tone="inverse"` Card).

## Safari 17.5: not tested

This Mac runs macOS 27.0.1 with Safari 27, and Playwright's WebKit 27.2 is a current engine, so neither can stand in for the floor. The pages are built for a manual run: they measure themselves, show PASS or FAIL in large type, and, when served by `run.ts --serve` and opened from its index, post their JSON to `results/manual/<browser>-<page>-<scheme>.json` (for example `ios-safari-17.5-nesting-dark.json`). The painted page needs a person to compare each square with its label.

Zero-cost routes, checked 2026-10-14:

1. **iOS 17.5 Simulator on this Mac (local, free; the most direct route).** Xcode 27.0 is installed, and Apple's support table lists Xcode 27 simulator support as "iOS 17 or later" ([developer.apple.com/support/xcode](https://developer.apple.com/support/xcode/)). Apple's Safari 17.5 release notes say "Safari 17.5 is available for iOS 17.5, iPadOS 17.5, visionOS 1.2, macOS Sonoma, macOS Monterey, and macOS Ventura", released May 13, 2024, build 19618.2.12 ([release notes](https://developer.apple.com/documentation/safari-release-notes/safari-17_5-release-notes)). The simulator runtime is several GB and installs into the system's CoreSimulator storage, so it was not done here. Steps (Xcode's own CLI; not run on this machine):
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
