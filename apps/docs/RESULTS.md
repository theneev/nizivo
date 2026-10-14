# Docs site: measured results

The Fumadocs skeleton of ARCHITECTURE.md §18.2, built as a static export in `apps/docs/out`. Every number below comes from a command run on 2026-10-14, after the review fixes, on an Apple M4 (10 cores, 24 GB), macOS 27.0.1, Node 24.16.0 and pnpm 12.11.2. Nothing is hosted: there is no GitHub Pages configuration and no workflow file while GitHub Actions is off.

## Versions

| Package                       | Version                                       |
| ----------------------------- | --------------------------------------------- |
| next                          | 16.4.0 (Turbopack)                            |
| fumadocs-core and fumadocs-ui | 16.17.2                                       |
| fumadocs-mdx                  | 15.4.7                                        |
| react and react-dom           | 19.3.0                                        |
| tailwindcss                   | 4.3.3 (Fumadocs UI's styles)                  |
| geist                         | 1.7.2 (self-hosted through `next/font/local`) |
| typescript                    | 7.0.2                                         |
| playwright                    | 1.64.0 (Chromium 156.0.8078.4)                |
| axe-core                      | 4.14.0                                        |

## Pages

`next build` lists 46 routes and counts 47 static pages ("Generating static pages using 9 workers (47/47)"). `out/` holds 45 HTML files:

- 42 content pages: the home page and 41 docs pages (introduction, 4 getting started, 8 foundations, the components overview, 23 component pages, 3 utility entries and Deviations);
- the 404 page, written three times by Next (`404.html`, `404/index.html`, `_not-found/index.html`).

The other routes are files: `api/search.json` (the static search index), `llms.txt` and `llms-full.txt`.

## Output size

`out/`: 304 files, 15,707,059 bytes (15.71 MB). gzip is Node's default level 6, as a static host would serve it.

| Kind                                                          | Files |     Raw |     gzip |
| ------------------------------------------------------------- | ----: | ------: | -------: |
| RSC payloads (`*.txt` that Next fetches on client navigation) |   213 | 7.23 MB | 1,284 kB |
| HTML                                                          |    45 | 6.02 MB |   831 kB |
| JavaScript                                                    |    39 | 1.42 MB |   469 kB |
| Search index (`api/search.json`)                              |     1 | 0.65 MB |   129 kB |
| CSS                                                           |     2 | 0.15 MB |    26 kB |
| Fonts (Geist Sans and Mono, woff2)                            |     2 | 0.14 MB |   141 kB |
| `llms.txt`, `llms-full.txt`                                   |     2 | 0.10 MB |    26 kB |

The largest page is Select: 293,469 bytes of HTML (31,838 gzip). The smallest is the 404 page: 9,740 bytes (2,613 gzip).

## JavaScript per page

Counted by `scripts/smoke.ts` from each page's HTML: the `<script src>` tags plus the chunks its RSC payload names. Two things are left out: the `noModule` polyfill (112,594 bytes, 39,473 gzip), which modern browsers skip, and Next's prefetches of other routes, which belong to those routes. KiB is 1,024 bytes.

| Page                                         | Scripts |       Raw |      gzip | Nizivo client module             |
| -------------------------------------------- | ------: | --------: | --------: | -------------------------------- |
| Home (`/`)                                   |      12 | 624.8 KiB | 199.0 KiB | none                             |
| Introduction, foundations, guides            |      14 | 675.8 KiB | 215.7 KiB | none                             |
| Badge (and every server-only component page) |      14 | 673.9 KiB | 215.1 KiB | none                             |
| Alert                                        |      14 | 675.8 KiB | 215.9 KiB | the dismiss leaf only            |
| Tooltip                                      |      15 | 723.0 KiB | 232.7 KiB | Tooltip only                     |
| Dialog                                       |      16 | 852.0 KiB | 273.2 KiB | Dialog only                      |
| Select                                       |      17 | 880.6 KiB | 282.9 KiB | Select only, React Aria included |

What every page loads is Next, React and Fumadocs, plus, on docs pages, the small client helper that makes the mobile drawer modal (`components/drawer-focus.tsx`; with the skip link and the search focus fix the review fixes added about 0.6 KiB gzip to a docs page). A Nizivo client module loads only on a page whose examples render it, and only its own; the smoke test fails otherwise. The search engine and the index load only when a reader first opens search.

The 404 page is plain server markup on purpose. Next puts the root not-found tree into every page's RSC payload, so a version wrapped in Fumadocs' `HomeLayout` added its client code to every docs page: before the review fixes, Badge went from 214.5 to 223.7 KiB gzip and Select from 282.3 to 291.5.

## Build time

| What                                                                                                                                                                                   | Time                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Cold docs build, `pnpm --filter @nizivo/docs build` after deleting `.next`, `out`, `.source`, `.generated` and the generated routes, offline (below), two runs before the review fixes | 5.27 s and 5.49 s                   |
| Of which Turbopack compile / static generation of 47 pages                                                                                                                             | 3.3 s / 0.75 s                      |
| `@nizivo/docs#build` inside the clean `pnpm check` (Turbo run summary)                                                                                                                 | 5.71 s; a cache hit in `docs:check` |
| `pnpm --filter @nizivo/docs smoke` alone                                                                                                                                               | 85.4 s                              |
| Full `pnpm check` from a clean state, `docs:check` included                                                                                                                            | **102 s**, exit 0                   |

The clean state deleted every `.turbo` folder (the local Turbo cache included), every `dist`, `apps/docs/.next`, `out`, `.generated`, `.source`, `app/docs/(generated)` and `tsconfig.tsbuildinfo` before the run.

## Smoke test and axe

`pnpm docs:check` builds the site (a cache hit after `pnpm build`), serves `out/` with `scripts/serve.ts` (which behaves like GitHub Pages: `/a/` serves `a/index.html`, `/a` redirects, an unknown path gets `404.html` with status 404) and runs `scripts/smoke.ts` in Playwright Chromium. Result: **69 checks passed, 0 failed.**

- All 42 content pages answer HTTP 200, log no console error or warning (React reports hydration failures there), throw no page error, hydrate, and make no request outside the local server.
- **axe-core 4.14.0** with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`: **0 violations of any impact** on all 42 pages in light at 1280 px (blocking) and in dark at 375 px (reported, not blocking while dark is a preview, §18.1).
- axe's `best-practice` rules, reported only: 69 findings, all in Fumadocs' own chrome or one example: unnamed code-block regions (`landmark-unique`), the table-of-contents title outside a landmark (`region`), the h3 card titles on the components overview (`heading-order`), and Container's example, which renders a `<main>` inside the page.
- **Reflow at 375 px** (WCAG 1.4.10): on every page, no table, code block, preview or image is cut off without a scroller that holds it. Every generated table sits in a focusable, named scroller (`components/table.tsx`), because Fumadocs' layout clips horizontal overflow.
- No raw Markdown (a backtick) shows outside code on any page.
- The 404 page answers an unknown path with status 404, hydrates, logs nothing but the document's own 404, and has 0 axe violations in light.
- `llms.txt`, `llms-full.txt` and `api/search.json` answer 200 with `text/plain` and `application/json` and a body.
- Client modules per page, as in the table above.
- Theme: the switch (Light, Dark and System) sets both the `dark` class (Fumadocs) and `data-nz-theme` (Nizivo); the page background and a live Select trigger change to the dark token values. No flash: the theme is on `<html>` before `<body>` exists, for the OS preference and a stored choice (4 cases).
- Nesting: light and dark swatches keep their own scheme on light and dark pages, and a `tone="inverse"` Card flips, so `light-dark()` reached the browser unlowered.
- Tailwind: `bg-nz-bg-surface` follows a nested dark scope, and `nz-sm:grid-cols-2` gives 2 columns at 1280 px and 1 at 375 px.
- Select, Tooltip and Dialog work after hydration with the keys their pages document (pointer, arrows, Enter, Escape, typeahead, focus return, focus containment).
- Forced colours (Chromium emulation): the open Select's focused, selected option is readable (HighlightText on Highlight, 19:1).
- Skip link: the first Tab focuses "Skip to content" on the home and a docs page; Enter moves focus to the page, and the next Tab stays inside it.
- Mobile drawer at 375 px: opening it moves focus in and makes the page behind inert; Escape closes it and returns focus to its button.
- Search: opened from the keyboard, Escape returns focus to the search button. Offline, "Select" ranks the Select page first and Enter opens it.
- Deviations page: 14 override rows, 19 proposal rows, D-i, D1 and D2, and 8 builder-chosen values, each with the value its stylesheet ships.

## Offline build

The cold builds above (before the review fixes, which added no dependency and no fetch) ran under macOS `sandbox-exec` with the profile `(deny network-outbound)` plus `(allow network-outbound (remote ip "localhost:*"))`, with `HTTP_PROXY` and `HTTPS_PROXY` set to `http://127.0.0.1:9` and `NEXT_TELEMETRY_DISABLED=1` (which `scripts/next.ts` sets anyway). Under the same profile, Node's `fetch` to an external host fails with `EPERM` and to `127.0.0.1` succeeds, and `curl https://registry.npmjs.org/` fails to connect. Both builds exited 0 and their logs show no network error. The proxy variables alone prove little, because Node's `fetch` ignores them; the sandbox is the evidence. At run time the smoke test aborts every request that leaves the local server, and no page made one.

## Turbo inputs

`turbo run build --filter=@nizivo/docs --dry=json` gave `@nizivo/docs#build` a new hash after a one-line edit to each of: `packages/react/src/select/select.example.tsx`, `contracts/api/react/select.json`, `contracts/api/css/select.json`, `packages/tokens/src/code-owned/a11y/dark.overrides.tokens.json`, `packages/tokens/build/css.ts` and `docs/ARCHITECTURE.md`. An edit to `scripts/smoke.ts` leaves it unchanged, and restoring each file restores the hash. The built `@nizivo/tokens` files are not inputs: they are gitignored, so on a fresh clone they would be missing when the first hash is taken, and `dependsOn: ["^build"]` already puts the tokens build's hash into this one (rechecked after the review fixes with `packages/tokens/build/css.ts`). The task's outputs are `out/**`.

## Not verified

- **Other browsers.** Every smoke and axe check ran in Chromium 156 only: not Firefox (the 129 floor or current), not WebKit, not Safari (the 17.5 floor or current). A one-off WebKit probe of the mobile drawer saw focus move in, the page go inert and Escape close it, but Tab from the first link did not reach the drawer's buttons; it was not pursued.
- **Forced colours and reduced motion.** The smoke test checks forced colours only on the open Select. Reduced motion was checked once by a probe (the Fumadocs drawer and dialogs drop their animations), not in the smoke test.
- **Hosting.** No GitHub Pages deploy and no DNS `CNAME`; `scripts/serve.ts` imitates Pages locally.
- **Screen readers** and real-device performance (no LCP or INP measured).
- **Hook descriptions.** The hooks table renders a description from a `/** … */` comment, but no stylesheet has one yet.
- **Keyboard rows** for Home, End, PageUp and PageDown, and typeahead inside the open Select list, are traced to react-aria 3.53.1 source but not asserted.
- The Vite and Astro getting-started pages are drafts until their W5 fixtures.
- **Byte-reproducible builds.** Next writes a random build id into every HTML file and RSC payload, so two builds of the same tree differ in most files; with the id normalised they were identical in review.
- Lightning CSS prints two warnings about `::highlight(fd-search)` in Fumadocs UI's own Tailwind classes during the build; they are harmless and upstream.
