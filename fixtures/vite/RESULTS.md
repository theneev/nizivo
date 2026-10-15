# Vite fixture: results

The Vite 8 single-page app fixture (ARCHITECTURE.md §11.1, §18.1, §21.1 exit criterion 2), first run in week 5 (2026-10-15). It installs the **packed** `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons` the way `fixtures/next` does, and runs the same shared spec (`fixtures/runner/spec.ts`), axe and the theme-flash check, on `vite build` + `vite preview`.

**Verdict: all 12 pages pass, with 0 console messages, 0 axe WCAG 2.2 A/AA violations and no build warnings. No theme flash in any case, and the negative control is caught.** Two setup facts differ from the plan and the draft docs page: Vite 8's default CSS target lowers every `light-dark()` (fixed with `build.cssTarget`), and Vite 8.3.4 printed no `MODULE_LEVEL_DIRECTIVE` warning.

## Setup

|                   |                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite              | 8.3.4 (Rolldown), `@vitejs/plugin-react` 6.1.2, `vite build` then `vite preview` (production; the dev server is not checked)                                                                        |
| React / React DOM | 19.3.0, `createRoot` under `<StrictMode>`                                                                                                                                                           |
| Engine            | react-aria-components 1.22.1, resolved from `@nizivo/react`'s caret range                                                                                                                           |
| Browser           | Playwright 1.64.0, Chromium 156, headless                                                                                                                                                           |
| Library           | the three packages from **`pnpm pack` tarballs**, unpacked to `.packed/` (gitignored) and installed as `file:` folders by `fixtures/runner/pack.ts --fixture vite`, with the markers planted        |
| CSS               | `src/main.jsx` imports `@nizivo/tokens/tokens.css`, `@nizivo/react/css/base.css` and every `css/<name>.css` once, through the exports maps, then the app's own `app.css` (body background and text) |
| Theme             | `<html lang="en" data-nz-theme="system">` in `index.html`, then `themeScript` in `<head>` (it applies a stored `nz-theme` choice; week 6)                                                           |

The folder is its own pnpm workspace root, excluded from the monorepo (`'!fixtures/vite'`), for the reasons in `fixtures/next/RESULTS.md` ("Setup"): the `@nizivo/tokens` override needs a workspace root, and the committed lockfile stays valid across library builds. Its `pnpm-workspace.yaml` carries the root's supply-chain keys with `allowBuilds: {}`; no dependency has an install script (Vite 8 lists esbuild only as an optional peer).

**The app.** One `index.html`, one entry (`src/main.jsx`) and one `React.lazy` chunk per page, chosen from `location.pathname`; `vite preview` serves `index.html` for every path. The entry imports nothing from `@nizivo`, so each page's chunk shows what Rolldown kept from that page's imports.

**`themeScript` in `index.html`.** The plan says to paste it. The fixture injects it instead with a five-line plugin (`transformIndexHtml` in `vite.config.js`), from the installed `@nizivo/react/theme-script`, so the copy cannot drift from the package and its CSP hash. Pasting works too; it is the same string.

## Pages

| Page              | What it renders                                                                                   | Imports                             | Spec reused from Next |
| ----------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------- |
| `/`               | the app shell: a list of links, no `@nizivo` module (the byte baseline)                           | none                                | —                     |
| `/button-only`    | three `Button`s                                                                                   | root barrel `@nizivo/react`         | `/button-only`        |
| `/button-subpath` | the same three `Button`s                                                                          | `@nizivo/react/button`              | `/button-subpath`     |
| `/t0-barrel`      | every week 2 T0 component (`src/t0-showcase.jsx`, the Next showcase)                              | root barrel                         | `/t0-barrel`          |
| `/alert-dismiss`  | a dismissible `Alert` with `role="alert"`                                                         | `@nizivo/react/{alert,heading}`     | `/alert-dismiss`      |
| `/overlays`       | `Select.Root`, `Dialog.Root`, `Tooltip.Root` with their parts, in a `Stack`                       | namespace imports from the subpaths | `/namespace`          |
| `/barrel-select`  | `Select` alone                                                                                    | root barrel                         | `/barrel-select`      |
| `/forms`          | the Next forms page: a `Field` around every control, a `Fieldset`, a `RadioGroup`, a GET `<form>` | subpaths                            | `/forms`              |
| `/menu`           | `Menu.Root defaultOpen` with a `Button` trigger through `render`                                  | `@nizivo/react/{button,menu}`       | `/menu`               |
| `/tabs`           | `Tabs.Root` with three tabs and three panels                                                      | `@nizivo/react/tabs`                | `/tabs`               |
| `/tab-nav`        | `TabNav` with plain `href` links, the current one from `location.search`                          | `@nizivo/react/tab-nav`             | `/tab-nav`            |
| `/icons`          | `Calendar`, `Bell`, `Search label="Search"`                                                       | root barrel `@nizivo/icons`         | `/icons-client`       |

## Checks

The same as the Next fixture (`fixtures/next/RESULTS.md`, "Checks"): console messages, interactions, vocabulary scans, IDREFs, the planted-marker grep and the icon-module check, plus axe and the theme check below. Where a single-page app differs:

- **"Server HTML" means the first client render.** `index.html` is an empty shell, so the checks that read the HTML before any interaction (the Tabs panel wiring, the Field wiring, the Menu's dangling IDREF record) read the DOM right after the page first renders (`initialHtml: 'rendered'`). The Menu check does not require the popup to be absent there: a client render may mount it in its first commit.
- **Native submit runs with JavaScript on.** A single-page app renders nothing without JavaScript, so the forms check fills the hydrated form and submits it with no handler in the way: the browser sends `name`, `unit`, `terms`, `range`, `billing` and `shipping` in the query string, and the SPA fallback serves the next page.
- **"No client module" measures tree-shaking.** Every page is client code here. A page's chunks are the module scripts in the HTML, every script Chromium loaded, and their static imports, followed transitively (`importClosure` in `spec.ts`; a dynamic `import()` counts only once the page loaded it). A marker in them means Rolldown kept that `'use client'` module. The right-build check looks for this build's entry chunk name in the served HTML.

## Results

| Page              | JS chunks | gzip -9 bytes | Client modules (markers) | Notes                                                                    |
| ----------------- | --------- | ------------- | ------------------------ | ------------------------------------------------------------------------ |
| `/`               | 2         | 69,921        | 0                        | the shell: React DOM, the router, the lazy-chunk map                     |
| `/button-only`    | 5         | 71,435        | 0                        | **the barrel costs nothing**: within a few bytes of the subpath page     |
| `/button-subpath` | 5         | 71,437        | 0                        |                                                                          |
| `/t0-barrel`      | 11        | 76,981        | 0                        | 21 names through the barrel, no client module                            |
| `/alert-dismiss`  | 6         | 71,949        | 1                        | only `alert/alert-dismiss.client`                                        |
| `/overlays`       | 14        | 146,422       | 11                       | Select, Dialog, Tooltip and their adapters                               |
| `/barrel-select`  | 12        | 139,605       | 7                        | only what Select reaches, through the barrel (no Dialog, Tooltip, Menu…) |
| `/forms`          | 11        | 78,283        | 7                        |                                                                          |
| `/menu`           | 10        | 127,728       | 6                        |                                                                          |
| `/tabs`           | 7         | 105,451       | 4                        |                                                                          |
| `/tab-nav`        | 4         | 70,941        | 0                        | TabNav is server-safe                                                    |
| `/icons`          | 2         | 70,277        | 0                        | exactly `icons/bell`, `icons/calendar`, `icons/search`, `_internal/icon` |

Bytes are every chunk the page loads, the shell included; subtract `/` for the page's own cost (for example Select alone through the barrel: 66.6 KB gzip, its React Aria engine included; the Tabs page 35.5 KB; Button 1.5 KB). The per-page detail is in `results/build.json`.

- **Vite tree-shakes the barrel completely.** `@nizivo/react` declares `sideEffects: ["**/*.css"]`, and Rolldown drops every module a page does not use, planted marker statements included: the barrel and subpath Button pages are the same size within a few bytes, the 21-name T0 barrel page ships no client module, and `/barrel-select` ships only Select's closure. There is no webpack-style barrel leak.
- **Icons:** the `@nizivo/icons` barrel (1,880 re-exports) tree-shakes to the three imported icons and the shared base.
- **Build:** under a second for the whole app, and no warning at all. In particular no `MODULE_LEVEL_DIRECTIVE` warning for the 23 `'use client'` directives (the plan and the draft docs page say Rolldown "may" print them; Vite 8.3.4 does not).

### `light-dark()` and the CSS target (a setup step the docs lack)

Vite 8 minifies CSS with Lightning CSS for its default target, `'baseline-widely-available'`. That target predates `light-dark()`, so **a plain Vite 8 build lowers all 68 `light-dark()` values** (all of them in `tokens.css`) to Lightning CSS's `--lightningcss-light`/`-dark` fallbacks: 0 kept, measured on this fixture. That breaks nested `data-nz-theme` scopes and inverse surfaces, as the Turbopack note in §11.1 describes for Next.

- **A `browserslist` in `package.json` does not help** (measured: still 0 kept). Vite reads only its own option.
- **`build.cssTarget: ['chrome123', 'edge123', 'firefox129', 'safari17.5', 'ios17.5']`** (Nizivo's floor) keeps all 68. `vite.config.js` sets it, and the theme check counts them on every run (`lightDark` in the results).

### No theme flash

`runner/theme.ts`, on `/`, in fresh contexts. An init script records every frame from the first one (a `requestAnimationFrame` callback runs right before the browser paints): `<html>`'s `data-nz-theme` and computed `color-scheme`, and `<body>`'s computed background, 90 frames (about 1.5 s); the paint-timing entries are recorded beside them, and a final screenshot pixel cross-checks the last frame.

| Case                                                                                        | Expected                | Result                                                                                |
| ------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| `osDark`: OS dark, `data-nz-theme="system"`, nothing stored                                 | every frame dark        | pass: 90 of 90 dark from the first frame (first paint 12 ms), pixel `rgb(16, 19, 17)` |
| `stored`: OS light, a stored `dark`, applied by the inline `<head>` script                  | every frame dark        | pass: 90 of 90 dark, `data-nz-theme="dark"` already in the first frame                |
| `static`: OS light, the server sends `data-nz-theme="dark"` (HTML rewritten)                | every frame dark        | pass                                                                                  |
| `light`: OS light, nothing stored                                                           | every frame light       | pass: the probe tells the schemes apart (`rgb(246, 247, 244)`)                        |
| `late` (negative control): OS light, a script at the end of `<body>` sets dark 300 ms later | light frames, then dark | **caught**: the first frames are light, the last dark                                 |

The CSS is a render-blocking `<link>` in `<head>` in the production build, so the first frame already has the tokens. **Nested scopes** on the light page resolve: a `data-nz-theme="dark"` scope is dark, a light scope inside it light, an inverse surface inside the dark scope light, and one on the page dark.

No flash comes from `data-nz-theme` on `<html>` (`system` needs no script at all) and, for a stored choice, from `themeScript` in `<head>` (week 6: it applies `localStorage` `nz-theme` before first paint; until then the fixture carried its own stored-choice script).

### axe

axe-core 4.14.0 (the catalog pin, injected as source) runs on every page after it renders and before any interaction (on `/menu`, once the `defaultOpen` menu has mounted), with the WCAG 2.0–2.2 A and AA tags, in light. **0 violations on all 12 pages.**

**After the week 5 review** (same day): axe also runs with every interaction-opened popup open (the Select listbox, the Dialog, the Tooltip; once its fade has finished) and, on a `defaultOpen` page, again once the overlay has closed, so the page under a modal (the closed Menu trigger included) is checked too; both block. It runs once more with the OS in dark mode (`data-nz-theme="system"` switches in place; the run waits for the colour transitions) and records `axeDark` per page: reported, never a failure (exit criterion 4). **0 violations in every state, light and dark, on every page.** A build that prints any warning or error line now fails the run (it was only recorded), and the run writes its results to a temporary folder unless given `--record`, so a lane run leaves the tree clean. Two deliberate breaks, made and restored: a dark-only low-contrast `h1` is reported in `axeDark` on every page, and a light-only one is caught on `/menu` after the menu closes (`axeClosed`), which the load-time run could not see. A probe plugin that prints a `MODULE_LEVEL_DIRECTIVE`-style warning now fails the run.

**Week 6** (recorded with `--record` on a fresh pack): axe also runs on every page's first render in Chromium's emulated forced colours (`axeForcedColors`) and with reduced motion (`axeReducedMotion`), both blocking: **0 violations in both**. For the forced-colours run only, each element without an inline text fill gets `-webkit-text-fill-color` equal to its computed colour, then the fills are removed: Chromium reports the unforced author colour for the text fill and axe reads it, so before the workaround an inverse Card body was flagged at 1.07:1 although it paints in `CanvasText` (a scratch control showed a real opt-out failure is still caught). The `stored` theme case now tests `ThemeScript`'s theme half: the fixture's own stored-choice script is gone. **The dev server** (`vite`, not preview; `devThemeFlash` in `results/build.json`): with a dark theme (OS dark, a stored choice or the attribute) 3 frames paint before any stylesheet exists (`color-scheme: normal`, a transparent body), because the dev server injects the CSS from JavaScript. They are reported, not failed; every styled frame is right, light has none, the late control is caught and 68 of 68 `light-dark()` values are kept. A production build has none.

The first run found one: `target-size` (WCAG 2.2 2.5.8) on `/overlays`. A bare `<Dialog.Trigger>` or `<Tooltip.Trigger>` (no `render`) is an unstyled native button, 21 px tall, and the two sat side by side with no spacing. The page now lays them out in a `Stack` (`gap="4"`), which meets the spacing exception; the Next fixture's `/namespace` and `/flat` had the same layout and the same fix. The library question (should a bare trigger have a minimum target size, or should docs always compose a `Button`?) is open for the design and accessibility owners.

## How to rerun

From the repo root (Node 24, pnpm through corepack; Chromium for Playwright as in `fixtures/next/RESULTS.md`):

```sh
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 install
# Build the monorepo, pack and mark the three tarballs, install this fixture, build, preview and check:
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 --filter @nizivo/fixture-runner run fixture:vite
```

`--skip-pack` and `--skip-install` reuse `.packed/` and `node_modules/`. Port 3418 must be free. With `--record` the run writes the committed `results/build.json` (otherwise a temporary copy, whose path it prints) and it exits 1 when any check fails. It is not part of `pnpm check` (neither is `fixture:next`): it builds the whole monorepo and launches a browser, so it runs as its own lane (§18.1 "Framework fixtures": path-filtered PRs and nightly once Actions is back). The whole run takes about 20 s after the pack.

After a change to the dependencies of `@nizivo/react` or of this fixture, refresh the lockfile once with `corepack pnpm@12.11.2 install` in this folder (after packing) and commit it.

## Not covered yet

- Vite SSR (a v0.2 fixture). The dev server is checked for theme frames since week 6 (above), not with the full spec.
- Only Chromium; Firefox and WebKit belong to the `main` and nightly lanes.
- axe blocks in light, forced colours and reduced motion (week 6) and reports dark; the forced-colours and reduced-motion runs cover first render only, not interaction-opened popups.
