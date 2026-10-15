# Astro fixture: results

The Astro 7.3 fixture with React islands (ARCHITECTURE.md §11.1, §18.1, §21.1 exit criterion 2), first run in week 5 (2026-10-15). It installs the **packed** `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons` the way `fixtures/next` does, and runs the same shared spec (`fixtures/runner/spec.ts`), axe and the theme-flash check, on `astro build` (static output) + `astro preview`.

**Verdict: all 12 pages pass, with 0 console messages (so no hydration warning), 0 axe WCAG 2.2 A/AA violations and no build warnings. The four pages with no client directive load no script at all. No theme flash in any case, and the negative control is caught.** Every §11.1 claim about Astro that the fixture can check holds; with no CSS target set, Astro 7.3.8 keeps every `light-dark()`.

## Setup

|                   |                                                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Astro             | 7.3.8, `@astrojs/react` 7.0.1, static output (the default; no adapter is installed), `astro build` then `astro preview --ignore-lock`                                                         |
| React / React DOM | 19.3.0                                                                                                                                                                                        |
| Engine            | react-aria-components 1.22.1, resolved from `@nizivo/react`'s caret range                                                                                                                     |
| Browser           | Playwright 1.64.0, Chromium 156, headless                                                                                                                                                     |
| Library           | the three packages from **`pnpm pack` tarballs**, unpacked to `.packed/` (gitignored) and installed as `file:` folders by `fixtures/runner/pack.ts --fixture astro`, with the markers planted |
| CSS               | `src/layouts/Base.astro` imports `tokens.css`, `css/base.css` and every `css/<name>.css` once, with the `.css` extension, then the app's `app.css`                                            |
| Theme             | `<html lang="en" data-nz-theme="system">`, then in `<head>` an inline stored-choice script and `<script is:inline set:html={themeScript} />`                                                  |

The folder is its own pnpm workspace root, excluded from the monorepo (`'!fixtures/astro'`), for the reasons in `fixtures/next/RESULTS.md` ("Setup"). `ignoredOptionalDependencies: [sharp]` keeps out `sharp` and its LGPL `libvips` (the fixture uses no image service). The other licence outside the runtime allowlist is MPL-2.0 for Lightning CSS, which §19.3 allows for build tooling. No dependency has an install script.

**Running under a coding agent.** Astro 7 detects coding agents (`am-i-vibing`) and then starts `astro dev` and `astro preview` **in the background** with a lock file, so a plain `astro preview` would outlive the runner. `--ignore-lock` keeps it in the foreground, for a person and an agent alike, and the runner stops its process group. `astro build` does not change behaviour, and Astro writes no agent file (nothing like Next's `AGENTS.md`). `ASTRO_TELEMETRY_DISABLED=1` keeps the run offline (`@astrojs/telemetry` is installed).

## Pages

Islands are `.jsx` components in `src/components/`; a page renders one with a client directive or, for server-only output, with none.

| Page             | What it renders                                                                                                                     | Directive        | Spec reused from Next |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------- |
| `/`              | a list of links                                                                                                                     | none             | —                     |
| `/button-only`   | three `Button`s from the `@nizivo/react` barrel                                                                                     | **none**         | `/button-only`        |
| `/t0-barrel`     | every week 2 T0 component from the barrel (the Next showcase)                                                                       | **none**         | `/t0-barrel`          |
| `/tab-nav`       | `TabNav` with plain links (static output cannot read the query, so no navigation step)                                              | **none**         | slots only            |
| `/icons-server`  | `Calendar`, `Bell`, `Search` from the `@nizivo/icons` barrel, used directly in the `.astro` page                                    | **none**         | `/icons-server`       |
| `/alert-dismiss` | a dismissible `Alert`: the whole Alert is the island, since its server shell cannot wrap a client leaf across the `.astro` boundary | `client:load`    | `/alert-dismiss`      |
| `/overlays`      | `Select`, `Dialog` and `Tooltip` composed inside one island                                                                         | `client:load`    | `/namespace`          |
| `/forms`         | the Next forms page's form as one island                                                                                            | `client:load`    | `/forms`              |
| `/menu`          | `Menu.Root defaultOpen` with a `Button` trigger                                                                                     | `client:load`    | `/menu`               |
| `/tabs`          | `Tabs` below a 150vh spacer                                                                                                         | `client:visible` | `/tabs`               |
| `/icons-client`  | the same three icons inside an island                                                                                               | `client:load`    | `/icons-client`       |
| `/two-islands`   | two islands, each a `Field` around an `Input` with generated ids                                                                    | `client:load` ×2 | new: `islandIds`      |

## Checks

The same as the Next fixture (`fixtures/next/RESULTS.md`, "Checks"), on Astro's server HTML, plus axe and the theme check below. Where Astro differs:

- **Hydrated** means every `astro-island` has lost its `ssr` attribute and React has attached a fiber to its first element. A `client:visible` island is scrolled into view first (an island is `display: contents`, so the runner scrolls to its first element).
- **No script on server-only pages.** On a page that renders no client component, the page must load no script at all (`serverOnlyNoScript`), not just no `@nizivo` marker.
- **Chunks** are the module scripts in the HTML, each island's `component-url` and `renderer-url`, every script Chromium loaded, and their static imports, followed transitively.
- **Island ids** (`/two-islands`): every id on the page is unique and every IDREF resolves.
- **Native submit** runs with JavaScript off, as in Next: the island's server HTML is a working GET form.
- The right-build check reads a build id that `astro build` writes into a `<meta>` from `NZ_BUILD_ID`.

## Results

| Page             | JS chunks | gzip -9 bytes | Client modules (markers) | Notes                                                                                   |
| ---------------- | --------- | ------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `/`              | 0         | 0             | 0                        |                                                                                         |
| `/button-only`   | 0         | 0             | 0                        | **zero JavaScript**                                                                     |
| `/t0-barrel`     | 0         | 0             | 0                        | **zero JavaScript**, 21 names through the barrel                                        |
| `/tab-nav`       | 0         | 0             | 0                        | **zero JavaScript**                                                                     |
| `/icons-server`  | 0         | 0             | 0                        | **zero JavaScript**, no icon module                                                     |
| `/alert-dismiss` | 8         | 71,953        | 1                        | only `alert/alert-dismiss.client`                                                       |
| `/overlays`      | 14        | 142,597       | 10                       |                                                                                         |
| `/forms`         | 13        | 78,273        | 7                        |                                                                                         |
| `/menu`          | 13        | 127,921       | 6                        |                                                                                         |
| `/tabs`          | 11        | 106,080       | 4                        | hydrates after the runner scrolls it into view                                          |
| `/icons-client`  | 6         | 70,757        | 0                        | exactly the three icons and `_internal/icon`                                            |
| `/two-islands`   | 10        | 74,227        | 2                        | `field/field-scope.client` and `input/input.client`; the two islands share their chunks |

The per-page detail is in `results/static.json`. Every island page carries React, React DOM and Astro's island runtime once, however many islands it has: `/icons-client` (three small icons) loads 70,757 bytes, about the Vite app shell's 69,907.

What the fixture confirms from §11.1:

- **Server-only usage ships zero JavaScript.** A React component rendered from `.astro` with no `client:*` directive is HTML only: the four server-only pages load no script at all, barrel imports included.
- **Compose compound components inside one island.** Checked once outside the fixture (a scratch page, not committed): `<Select.Root client:load>` with its parts as `.astro` children does not build. The parts render outside their Root's context and React Aria throws "ListBoxItem cannot be rendered outside a collection" during prerendering. Inside one `.jsx` island the same markup works (`/overlays`).
- **Per-island `useId` prefixes are handled by `@astrojs/react` 7.** Now checked at runtime as well as in its dist: the two islands on `/two-islands` render ids under the prefixes `r2` and `r3` (`_r2R_0_-control`, `_r3R_0_-control`), no id repeats, and every IDREF resolves.
- **`<script is:inline set:html={themeScript} />`** puts the script inline in `<head>`, unchanged.
- **Hydration:** `client:load` and `client:visible` islands hydrate with 0 console messages, so production React reports no hydration error; a `defaultOpen` Menu opens once its island hydrates, with no popup in the server HTML.
- **CSS:** the layout's imports become one render-blocking `<link>` in `<head>` on every page, server-only pages included, and **all 68 `light-dark()` values are kept with no CSS target set** (unlike a plain Vite 8 build; see `fixtures/vite/RESULTS.md`). The theme check counts them on every run.

### No theme flash

`runner/theme.ts` on `/`, the same five cases as the Vite fixture (`fixtures/vite/RESULTS.md`, "No theme flash"): OS dark with `data-nz-theme="system"`, a stored dark choice, a server-sent `data-nz-theme="dark"`, light, and the late-script negative control. **Every case passes** (all 90 frames dark from first paint at about 16 ms in the three dark cases, light in the light case, light frames then dark in the negative control), and nested scopes and inverse surfaces resolve.

### axe

axe-core 4.14.0 on every page after its islands hydrate (on `/menu`, once the `defaultOpen` menu has mounted), WCAG 2.0–2.2 A and AA, in light: **0 violations on all 12 pages.** The overlays island spaces its bare Dialog and Tooltip triggers in a `Stack`, as in the other two fixtures (see `fixtures/vite/RESULTS.md`, "axe").

**After the week 5 review** (same day): axe also runs with every interaction-opened popup open (the Select listbox, the Dialog, the Tooltip; once its fade has finished) and, on a `defaultOpen` page, again once the overlay has closed, so the page under a modal (the closed Menu trigger included) is checked too; both block. It runs once more with the OS in dark mode (`data-nz-theme="system"` switches in place; the run waits for the colour transitions) and records `axeDark` per page: reported, never a failure (exit criterion 4). **0 violations in every state, light and dark, on every page.** A build that prints any warning or error line now fails the run (it was only recorded), and the run writes its results to a temporary folder unless given `--record`, so a lane run leaves the tree clean. The deliberate breaks that prove both are in `fixtures/vite/RESULTS.md`, "axe".

## How to rerun

From the repo root (Node 24, pnpm through corepack; Chromium for Playwright as in `fixtures/next/RESULTS.md`):

```sh
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 install
# Build the monorepo, pack and mark the three tarballs, install this fixture, build, preview and check:
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 --filter @nizivo/fixture-runner run fixture:astro
```

`--skip-pack` and `--skip-install` reuse `.packed/` and `node_modules/`. Port 3419 must be free. With `--record` the run writes the committed `results/static.json` (otherwise a temporary copy, whose path it prints) and it exits 1 when any check fails. Like `fixture:next` and `fixture:vite`, it is a separate lane, not part of `pnpm check`. `astro build` writes `.astro/` (generated types) and `dist/`, both gitignored.

## Not covered yet

- `output: 'server'` (on-demand rendering needs an adapter, which is not installed), `astro dev`, and `client:idle` / `client:only`.
- Props to `client:*` islands must be serialisable (no functions): Astro's own rule, not exercised here.
- Only Chromium; axe blocks in light and reports dark; forced colours and reduced motion are not run.
