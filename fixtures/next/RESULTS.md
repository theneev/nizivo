# Next.js fixture: results

The S2 spike rebuilt on the real, generated `@nizivo/react` barrels (ARCHITECTURE.md §9.2, §11.1, §18.1, §21.1 exit criterion 2). Run on 2026-10-14.

**Verdict: all three production builds pass** (Turbopack, webpack, webpack + `optimizePackageImports`), and so does an informational `next dev` pass.

## Setup

|                   |                                                                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js           | 16.4.0, App Router, pages are Server Components (`.jsx`, no `'use client'`)                                                                                                   |
| React / React DOM | 19.3.0                                                                                                                                                                        |
| Engine            | react-aria-components 1.22.1, resolved from `@nizivo/react`'s caret range                                                                                                     |
| Browser           | Playwright 1.64.0, Chromium 156.0.8078.4, headless                                                                                                                            |
| Library           | `@nizivo/react` and `@nizivo/tokens` from **`pnpm pack` tarballs**, unpacked to `.packed/{react,tokens}` (gitignored) and installed as `file:` folders, never workspace links |
| CSS               | `@nizivo/react/css/{button,dialog,select,tooltip}.css` through the exports map, imported in `app/layout.jsx`. No `tokens.css` yet (W2)                                        |

This folder is **its own pnpm workspace root** and is excluded from the monorepo (`'!fixtures/next'` in the root `pnpm-workspace.yaml`):

- `pnpm pack` writes `@nizivo/tokens: 0.0.0` into the react tarball's dependencies. That version is not on the registry, so `pnpm-workspace.yaml` here overrides it to `file:.packed/tokens`. Overrides only work at a workspace root.
- The packed folders are gitignored and change with every build, so the monorepo's `install --frozen-lockfile` must never depend on them.
- **Lockfile.** `fixtures/runner/pack.ts` unpacks each tarball's `package/` folder, so the fixture installs exactly the published files. pnpm copies a `file:` folder into its virtual store (it is not a link) and records it with no integrity hash, so the committed `pnpm-lock.yaml` stays valid across library builds and the runner installs with `--frozen-lockfile`. A frozen install re-copies a folder whose files changed (checked by appending a line to `.packed/react/dist/index.js`). The lockfile changes only when a dependency of `@nizivo/react` or of the fixture changes. With it, `pnpm licenses list --prod` and dependency review see the fixture's tree.
- **Licences.** `next` lists `sharp` as optional (for `next/image`, which the fixture does not use). sharp pulls in `@img/sharp-libvips-*`, which is LGPL-3.0-or-later and outside the §19.3 allowlist, so `ignoredOptionalDependencies: [sharp]` keeps it out. The only licence left outside the runtime allowlist is `caniuse-lite` (CC-BY-4.0), which §19.3 expects here.
- The supply-chain settings match the root (`minimumReleaseAge: 4320`, `allowBuilds: {}`, `trustPolicy: no-downgrade`, `blockExoticSubdeps: true`); the install passes them with no exclusions.
- `agentRules: false` in `next.config.mjs` stops `next dev` from writing an `AGENTS.md` here when it detects a coding agent.

The runner lives in the monorepo workspace as `@nizivo/fixture-runner` (`fixtures/runner/`), so it has its own Playwright and `@types/node`, is typechecked by `pnpm typecheck`, and can grow into the shared fixture spec for Vite and Astro (W5).

## Pages

| Page              | What it renders                                                                                                               | Imports                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `/button-only`    | (a) server-only: three `Button`s                                                                                              | root barrel `@nizivo/react`                                            |
| `/button-subpath` | (a) server-only: two `Button`s                                                                                                | `@nizivo/react/button`                                                 |
| `/namespace`      | (b) `Select.Root`, `Dialog.Root`, `Tooltip.Root` with all their parts                                                         | namespace imports from `@nizivo/react/{select,dialog,tooltip}`         |
| `/flat`           | (c) the same parts                                                                                                            | flat imports (`SelectRoot`, `DialogTrigger`, …) from the same subpaths |
| `/render-prop`    | (d) server `<Button>` elements passed into `Dialog.Trigger`, `Dialog.Close` and `Tooltip.Trigger` `render` (an `alertdialog`) | subpaths                                                               |
| `/barrel-select`  | one client part only: `Select`                                                                                                | root barrel `@nizivo/react`                                            |

## Checks (per page, per build)

1. **Console:** every console `error` and `warning` and every uncaught page error is recorded. Any one fails the page. React reports hydration failures this way.
2. **Hydrated:** React has attached a fiber to the page's `<h1>`.
3. **Interactive after hydration:**
   - **Select:** open the trigger, pick "Last 7 days" in the listbox. The trigger text changes from "Last 30 days", and the hidden native `<select name="period">` holds `7d`.
   - **Dialog:** the trigger carries `data-slot="dialog-trigger"`, also when it is a composed `Button`. Open it, check the title is not empty, close with the `Close` part, and check that focus returns to the trigger. Open again and close with Escape.
   - **Tooltip:** the trigger carries `data-slot="tooltip-trigger"`. Hover shows `role="tooltip"` with the right text, and the trigger's `aria-describedby` must point at it. Moving away hides it. Keyboard focus (Shift+Tab, Tab) shows it, and Escape hides it.
4. **Parts stay inside the vocabulary** (§8.3 rule 3, §9.6 case 3), after hydration and again while each overlay is open, so the client-only parts (`select-popup`, `select-list`, `select-item`, `dialog-positioner`, `dialog-backdrop`, `dialog-popup`, `dialog-content`, `tooltip-popup`, …) are covered too. Every `[data-slot]` element may carry only `data-*` names from `contracts/vocabulary.json` or the adapter's `dom-allowlist.json`, and no class matching `react-aria`. Each result records the slots it scanned.
5. **Planted markers.** `fixtures/runner/pack.ts` appends one statement to each of the 9 `'use client'` modules in the unpacked react package, for example `select/select.client.js` and `_engines/react-aria/select.client.js`. The statement pushes a unique string such as `nzfm[select/select.client]` onto a global. The page's client chunks are every `<script src>`, every `static/chunks/*.js` named in the flight payload, and every script Chromium loaded during the visit. They are fetched and grepped for those strings.
   - **Positive control:** the leaf of every rendered component must be present.
   - **(i)** A server-only page must contain **no** marker, under every build.
   - **(ii)** A page may contain only markers of client modules that its rendered leaves import, computed from the installed dist's import graph. For `/barrel-select` the allowed set is the Select leaf, its adapter, `overlay.client`, `locale.client` and `config.client`. The plain webpack build is the one documented exception (spike S2c), and only for barrel pages that render a client part. Its leak is recorded, not failed.
6. **Right build:** the HTML must carry the variant's own `BUILD_ID`. The runner also refuses to start when the port already answers, and it stops Next's whole process group afterwards.

## Results

| Build                                                              | Command                               | Result                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Turbopack                                                          | `next build` + `next start`           | **pass**: 0 console messages on all 6 pages; every interaction ok, composed triggers included; no part outside the vocabulary, overlays open; (i) 0 markers on both server-only pages; (ii) `/barrel-select` has only Select's 5 allowed markers                                                                                                 |
| webpack                                                            | `next build --webpack` + `next start` | **pass**: 0 console messages; every interaction ok; no part outside the vocabulary; (i) 0 markers on both server-only pages; (ii) **leak reproduced**: `/barrel-select` also ships `dialog/dialog.client`, `tooltip/tooltip.client`, `_engines/react-aria/dialog.client` and `_engines/react-aria/tooltip.client`, all 9 client modules in total |
| webpack + `experimental.optimizePackageImports: ['@nizivo/react']` | same, `NZ_VARIANT=webpack-opi`        | **pass**: 0 console messages; every interaction ok; no part outside the vocabulary; (i) 0 markers; (ii) **no leak**: `/barrel-select` has only Select's 5 allowed markers                                                                                                                                                                        |
| `next dev` (Turbopack), informational                              | `next dev`                            | **pass**: 0 console messages in development React, which also reports attribute-level hydration mismatches. Marker checks are off for dev chunks                                                                                                                                                                                                 |

The per-page detail is in `results/<variant>.json`: console messages, interaction outcomes, chunk counts, markers found, missing and unexpected.

What this confirms on the generated barrels:

- **S2b holds:** namespace (`Select.Root`) and flat (`SelectRoot`) imports both prerender from Server Components and hydrate in both bundlers. The namespace objects are built in the directive-free `*.parts.js`.
- **V3 holds:** a server `<Button>` element works as a client part's `render`. RSC renders that Button on the server, so the client part receives a host `<button data-slot="button" data-size="md">`. `renderElement` lets the part's presentational attributes (`data-slot`, `data-variant`, `data-size`, `data-tone`, `data-full-width`) win over the element's, so `/render-prop`'s triggers and close button carry `dialog-trigger`, `tooltip-trigger` and `dialog-close` in every build.
- **No part leaks engine attributes**, including the client-only popup parts: the scans cover `select-popup`, `select-list`, `select-item`, `dialog-positioner`, `dialog-backdrop`, `dialog-popup`, `dialog-content`, `dialog-title`, `dialog-description`, `dialog-footer`, `dialog-close` and `tooltip-popup`. The fixture pages have no Select group or separator.
- **S2c holds on the real package.** Server-safe Button pages ship no `@nizivo` client module, through the barrel or the subpath, in every build. Plain webpack leaks every client module reachable through the barrel into a page that renders one client part. `optimizePackageImports` removes the leak, and Turbopack never leaks. Subpath imports never leak in any build.
- The `./css/*.css` exports entries resolve in both bundlers.

### Negative controls

- **Hydration capture:** a throwaway page whose client component rendered `typeof window` text (removed afterwards) was run through the same spec under `next dev`. It failed with `pageerror: Hydration failed because the server rendered text didn't match the client…`.
- **Marker grep:** the plain webpack leak above is detected, and the positive control finds every rendered leaf's marker in every build.
- **Stale server:** during development a leftover `next-server` answered for every variant and produced identical results. That is why the port check and the `BUILD_ID` check exist; the results above come from runs with both in place.
- **Composed trigger slot:** before `renderElement` gave the part's presentational attributes precedence, `/render-prop` failed the trigger-slot check in every build (`data-slot="button"`), although the in-tree SSR test already passed. A unit test now hands `renderElement` a pre-rendered host element the way RSC does.
- **Stale webpack cache:** a rerun that reused `.next/<variant>` passed Turbopack but failed both webpack builds, whose client chunks still held the previous `@nizivo/react` code. webpack's persistent cache treats a `node_modules` package as unchanged while its name and version are (`0.0.0` every time). The runner now deletes `.next/<variant>` before each build; the results above come from clean builds.

### Notes

- **Tooltip hover and modality.** React Aria opens a tooltip on hover only when the global interaction modality is already `pointer`. Playwright's `hover()` fires `pointerenter` on the trigger before any `pointermove`, so a hover as the very first pointer event (or right after a key press) does not open it. A real mouse always moves across the page first. The spec therefore moves the mouse onto the page before hovering. This is engine behaviour, not a Nizivo defect. A conformance test should still pin it, because a hooks adapter (v0.2) has to match it.
- **Focus return** after Dialog close happens on the frame after unmount, so the spec waits for it (up to 2 s) rather than reading `document.activeElement` at once.

## How to rerun

From the repo root (Node 24, pnpm through corepack):

```sh
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 install
# Chromium for Playwright 1.64.0, if it is not cached yet:
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 --filter @nizivo/fixture-runner exec playwright install chromium
# Build the monorepo, pack and mark the tarballs, install this fixture, then build and check all three variants:
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 --filter @nizivo/fixture-runner run fixture:next
```

Options, passed after `fixture:next`:

- `--dev` adds the `next dev` pass.
- `--variants turbopack,webpack` runs a subset.
- `--skip-pack` and `--skip-install` reuse `.packed/` and `node_modules/`.

After a change to the dependencies of `@nizivo/react` or of this fixture, refresh the lockfile once with `corepack pnpm@12.11.2 install` in this folder (after packing) and commit it.

To pack only: `run pack:fixture` (`--no-build` skips the turbo build).

The runner exits 1 when any production build fails a check, and it writes `results/<variant>.json` either way. Port 3417 must be free. Each variant builds into `.next/<variant>`.

## Not covered yet

- The rest of the shared spec in §18.1 is still to come: axe, no theme flash (`ThemeScript` does not exist yet), `next@canary`, the CSP nonce, and `cacheComponents` / `<Activity>` closing with reason `'hidden'`.
- Only Chromium was run here. Firefox and WebKit belong to the `main` and nightly lanes.
- Bundle sizes were not measured; the marker check is the zero-JS assertion.
- The markers are planted at pack time, so the package under test is the real `pnpm pack` output plus one appended statement per client module. The published tarball has no markers.
- No page opens an overlay on the server (`defaultOpen`). React Aria renders no popup during SSR, so a server-open trigger's `aria-controls` / `aria-describedby` dangle until hydration; that hydration path is not exercised here yet.
