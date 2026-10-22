# Week 17 results (v0.2 week 8, server-rendering fixtures)

Recorded on 2026-10-23 (ARCHITECTURE.md §21.2 "Week 17 status", §23.4 D-cb). Built overnight, after
week 16, at the maintainer's request ("continue building till morning … do the recommendations for
things that you can"). Every number below comes from a command run on the maintainer's Mac.

## The selection island: built, not committed

Table's form-based selection (§16.2) is built and tested: `Table.Selection` (the one client part:
the select-all's checked and mixed state, checking every row from it, Shift-click ranges, Escape to
clear, `onSelectionChange`), `Table.SelectAll` and `Table.SelectRow` (native checkboxes rendered on
the server with Checkbox's look, so a form receives the selected ids before any JavaScript runs; a
checked row shows `bg/brand-subtle` through CSS), and `Table.Container`'s `label` (a named,
focusable scroll region, as gap report A sketches it). 897 node tests and 13 browser cases pass in
Chromium, WebKit and Firefox.

It is **not committed**, because `@nizivo/react/table` measures **2,513 B** with it, over the 1.8 KiB
(1,843 B) limit week 16 set at measured + 10 %. It is in `git stash` ("w17: Table.Selection island

- Container label …") and in a patch file. **A decision for the maintainer**, measured:

| Option                                                              | `./table` |                       New entry | Limits moved                              |
| ------------------------------------------------------------------- | --------: | ------------------------------: | ----------------------------------------- |
| (a) everything in `./table`, as §16.2 sketches it                   |   2,513 B |                               — | `./table` 1.8 → 2.7 KiB (measured + 10 %) |
| (b) the island and both checkbox parts in a new `./table-selection` |   1,661 B | about 1.5 KB at measured + 10 % | none                                      |

Under React Server Components a server-only page that uses `./table` ships 0 B of it either way; the
difference is what a Vite single-page app pays when it imports the `Table` namespace. Island only in
a new subpath (the checkboxes staying in `./table`) does not fit: `./table` measures 1,894 B.

## What was built

| Part                   | Where                                                | Notes                                                                                                                                                           |
| ---------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite SSR fixture       | `fixtures/vite-ssr`, lane `fixture-vite-ssr`         | fixtures/vite's pages, `vite build` and `vite build --ssr`, `renderToString` behind `node:http`, no `ssr.noExternal`: 19 `@nizivo/*` imports stay external      |
| React Router 8 fixture | `fixtures/react-router`, lane `fixture-react-router` | React Router 8.5.0 framework mode on Vite 8.3.4, CSS through `links` with `?url`, `@react-router/node`'s request listener; 20 `@nizivo/*` imports stay external |
| Docs                   | `getting-started/react-router.mdx`, `vite.mdx`       | the React Router setup and Vite's server rendering, from the fixtures                                                                                           |

## Results

- **Vite SSR, all 8 pages pass:** both builds print no warning; every page hydrates with 0 console
  messages; axe clean in light, dark, forced colours and reduced motion; the Next fixture's
  interactions pass after hydration (`fixtures/vite-ssr/RESULTS.md`).
- **React Router, all 8 routes pass**, the same checks, and each route ships only the client modules
  of what it renders (`fixtures/react-router/RESULTS.md`): `/button-only` and `/t0-barrel` import from
  the barrel and ship no Nizivo client module.
- **Negative controls** (not recorded): a heading rendering "server" on the server and "client" in
  the browser fails the page with one console message, in both fixtures.

## Lanes (the maintainer's Mac)

All 19 release lanes pass on the final tree (`node packages/tooling/release/lanes.ts`), the two new
fixtures included, with no flake this run:

| Lane                                                      | Result                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| browser (Chromium) / browser-firefox                      | 278 passed / 250 passed, 28 skipped                                      |
| overlay-chromium / -webkit / -firefox                     | 200 passed, 10 skipped / 192 passed, 18 skipped / 192 passed, 18 skipped |
| test-react-19.2 / browser-react-19.2 / overlay-react-19.2 | 894 / 278 / 200 passed (10 skipped)                                      |
| charts (Chromium, WebKit, Firefox)                        | 96 passed each                                                           |
| fixture-charts, fixture-next, fixture-vite, fixture-astro | pass                                                                     |
| **fixture-vite-ssr**, **fixture-react-router** (new)      | pass (17.5 s, 18.3 s)                                                    |
| visual (react) / visual-charts                            | no differences (2,100 / 136 shots)                                       |

## For the maintainer

1. **The `./table` limit** (above): (a) or (b).
2. **A supply-chain exception** in the React Router fixture only: `trustPolicyExclude: semver@6.3.1`
   (D-cb). Say if you want it reviewed differently.
3. **`react-router build` ran `npm install isbot` on its own** with the default server entry; the
   fixture now writes its own entries. Nothing was installed (the install failed and its edit to the
   fixture's `package.json` was reverted).
4. **The second Tooltip adapter** (a v0.2 exit criterion) is next once you are around: it needs
   `nz gen` to accept `adapter` and a decision on its file layout.

## Unverified

- React Router's RSC mode, SPA mode, prerendering and its dev server; Vite SSR streaming.
- Real Safari and Firefox for both fixtures (they run in Chromium, as fixtures/vite does).
