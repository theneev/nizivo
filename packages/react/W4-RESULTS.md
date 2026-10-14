# Week 4 results

Recorded on 2026-10-15 at week 4 integration (ARCHITECTURE.md §21.1 W3–4, second half: `@nizivo/icons`, `tokens.json` and the `.` entry of `@nizivo/tokens`, the React Aria overlay conformance for Tooltip, Dialog and Select, Menu, Tabs and TabNav, and the Safari 17.5 floor lane). Every number below comes from a command run on the integrated tree; the commands are given with each table. Gzip is Apple gzip 487.0.1 at its default level (`gzip -c <file> | wc -c`) unless a row says otherwise. Not packed: see the tarball section.

## What shipped

3 new subpaths in `@nizivo/react`, 37 in all, and a third package:

| Subpath or package         | `component.json` tier | Client modules a page can ship                                                                       |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `@nizivo/react/menu`       | engine                | `menu/menu.client`, `_engines/react-aria/{menu,overlay,popup,locale}.client`, `config/config.client` |
| `@nizivo/react/tabs`       | engine                | `tabs/tabs.client`, `_engines/react-aria/{tabs,locale}.client`, `config/config.client`               |
| `@nizivo/react/tab-nav`    | server                | none                                                                                                 |
| `@nizivo/icons`            | (no manifest)         | none from a Server Component; from client code, exactly the icons it imports plus the shared base    |
| `@nizivo/tokens` `.` entry | (no manifest)         | literals only: no imports, no calls, no side effects                                                 |

Overlay changes in the shipped components (ARCHITECTURE §23.4 D-af): Tab leaves the Select and Menu popups; Dialog focuses the first focusable element in its body (an alertdialog its Close); a Tooltip inside a Dialog is hoverable; focus returns to the trigger after a server-open popup closes; Select's popup enters on the spring pair with `--nz-scale-enter`, so its fade survives reduced motion.

## Stylesheet sizes

Bytes of the integration build's `dist/css`. The §17.2 target is ≤ 2 KB gzip per leaf file.

| File                          |   Raw |  Gzip |
| ----------------------------- | ----: | ----: |
| `css/menu.css` (new)          | 3,345 | 1,025 |
| `css/tabs.css` (new)          | 2,873 |   983 |
| `css/tab-nav.css` (new)       | 2,483 |   857 |
| `css/select.css` (changed)    | 2,499 |   852 |
| `css/base.css` (regenerated)  | 3,654 | 1,017 |
| `css/dialog.css` (unchanged)  | 2,110 |   749 |
| `css/tooltip.css` (unchanged) | 1,404 |   556 |

Every leaf file is under 2 KB gzip; the largest new one is `menu.css` at 1,025 bytes. The 37 stylesheets total 78,812 bytes raw and 11,034 bytes gzip concatenated (week 3: 34 files, 9,971). `select.css` grew by 36 bytes gzip: the spring entry, and the forced-colours ring colour and disabled rule from the review. Re-measured after the review fixes.

## Client JavaScript

"dist" is the unminified ESM file as published. "Own" is that one file minified alone (`esbuild <file> --minify --format=esm`, esbuild 0.28.2) and gzipped, so imports are not counted.

| Module                                      | dist raw | dist gzip | Own min+gz |
| ------------------------------------------- | -------: | --------: | ---------: |
| `menu/menu.client.js` (new)                 |    5,526 |     1,460 |      1,078 |
| `tabs/tabs.client.js` (new)                 |    1,951 |       604 |        519 |
| `tab-nav/tab-nav.js` (new, server)          |    1,449 |       523 |        418 |
| `_engines/react-aria/menu.client.js` (new)  |    7,953 |     2,551 |      1,816 |
| `_engines/react-aria/tabs.client.js` (new)  |    2,259 |       758 |        655 |
| `_engines/react-aria/popup.client.js` (new) |    3,865 |     1,685 |        841 |
| `_engines/react-aria/overlay.client.js`     |    2,114 |     1,002 |        544 |
| `_engines/react-aria/dialog.client.js`      |    4,646 |     1,595 |      1,162 |
| `_engines/react-aria/select.client.js`      |    4,824 |     1,573 |      1,301 |
| `dialog/dialog.client.js`                   |    4,729 |     1,609 |      1,129 |
| `select/select.client.js`                   |    3,645 |     1,076 |        914 |

`popup.client.js` holds the Tab-out and focus-return helpers that Menu, Select and Dialog share; Tooltip does not import it (see "Found and fixed at integration"). The react tarball is 251 files, 82,662 bytes packed.

**Subpaths bundled** (`esbuild dist/<name>/index.js --bundle --minify --format=esm`, `react` and `react-dom` external, gzip):

| Subpath   | With React Aria | React Aria external |
| --------- | --------------: | ------------------: |
| `menu`    |          56,640 |               5,517 |
| `tabs`    |          33,643 |               2,146 |
| `tab-nav` |           1,063 |               1,063 |
| `select`  |          62,330 |               4,152 |
| `dialog`  |          31,512 |               3,357 |
| `tooltip` |          16,360 |               2,909 |

**Seam cost beside the existing overlays** (one bundle of the named subpaths, React Aria included, react external): Select + Dialog + Tooltip 68,581 B; + Menu 73,420 (+4,839); + Tabs 71,350 (+2,769); + Menu + Tabs 76,060 (+7,479). Week 3's Tooltip alone was 16,365 B by the same method; it is 16,360 now. Menu and Tabs share most of React Aria with the overlays already on a page. `menu/component.json` records 55.1 KiB measured and a 61 KiB limit; `tabs/component.json` 31.8 and 35; `tab-nav` 0 and 0. `size-limit` is W5.

## `@nizivo/icons`

| Measure                                        | Value                                                                                   | Command                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Icons                                          | 1,879 Lucide (`lucide-static` 1.56.0) + 1 brand (Instagram, `simple-icons` 16.35.0)     | `packages/icons/manifest.json`                                  |
| Directional icons with `data-mirror="rtl"`     | 45                                                                                      | `packages/icons/mirror.json`                                    |
| Tarball                                        | 3,768 files; 305,566 bytes packed; 1,706,464 bytes of files                             | `pnpm pack`, `tar -tzf`, `tar -xzOf … \| wc -c`                 |
| One standalone icon module, gzip               | min 216, median 312, max 586 bytes (1,879 files, unminified, with its doc comment)      | `gzip -c dist/icons/*.js`                                       |
| One icon from the root barrel, minified bundle | 502 B gzip, the same as its subpath import (502 B)                                      | `test/bundle.test.ts` (rolldown through tsdown, React external) |
| Each further icon                              | 71 B gzip; 10 icons 1,137 B (the §17.2 budget is ≤ 2,600 B for 10, ≤ 260 B per icon)    | same                                                            |
| `check:release`                                | ok: tarball allowlist (3,768 files), publint (strict), attw (esm-only), directive guard | `pnpm check:release`                                            |

attw checks only the `.` entry: it shows the `./*` and `./brands/*` wildcards as "(wildcard)". The builder proved the wildcard types with a scratch consumer of the packed tarball under `moduleResolution` `bundler` and `node16` (not rerun at integration).

## `@nizivo/tokens`: `tokens.json` and the `.` entry

`dist/tokens.json` holds 237 tokens (3 modifiers: theme light/dark, motion default/reduced, viewport mobile/tablet/desktop). `dist/index.js` is 2,394 bytes gzip; each group is a named export. The tarball is 9 files, 32,964 bytes packed; `check:release` passes with no allowlist change. `test/js.test.ts` re-reads the built `tokens.css` with its own evaluator and checks every `tokens.json` value in every context (2,338 comparisons, 0 mismatches); `tokens.css`, `custom-media.css`, `tailwind.css` and `contract.json` match their unchanged goldens.

## Overlay conformance

`pnpm --filter @nizivo/react test:overlay` (Vitest browser mode, Playwright; `NZ_BROWSER=webkit` for WebKit). Not part of `pnpm check`.

| Engine                   | Passed | Skipped | Failed |
| ------------------------ | -----: | ------: | -----: |
| Chromium 156.0.8078.4    |     82 |       7 |      0 |
| WebKit 27.2 (Playwright) |     77 |      12 |      0 |

Per subject (Tooltip, Dialog, Select, Menu): closed renders no popup; opens by pointer and by every documented key; Escape closes and returns focus to the trigger; outside press where it applies; the one scroll lock, with `<html>` and `<body>` styles restored exactly (Tooltip never locks); portals to `<body>` and into `container`; sits in `--nz-z-overlay` and paints on top; vocabulary-only `data-*` and no `react-aria-*` class on every part; `data-entering` with a running transition, then `data-exiting` before unmount; reduced motion keeps every fade above 0 and at most 160 ms, with no travel; the spring pair on scale; a `defaultOpen` server render hydrates with zero warnings, then opens; **new at integration:** a `defaultOpen` popup returns focus to its trigger on Escape (Dialog, Select, Menu); Strict Mode: 10 cycles leave no lock and no inert node (O-10); forced colours keep the popup border and focus outline solid (Chromium only, through the DevTools protocol, by computed style). Nested: O-01, O-03, O-04, O-10, O-22. Menu cases: APG keys, Home and End, typeahead, disabled items, the focus ring at offset −2 px, Tab and Shift+Tab out, link items through `href` and `render`, checkbox and radio items, uncontrolled state across reopen, IconButton as trigger; **from the review:** the pointer never draws the keyboard ring on a Menu or Select row, a hovered checked row changes fill, a mixed menu lines up its shortcuts, a focused checked row keeps a system-colour ring and glyph in forced colours and a disabled row is GrayText (Chromium), and the open Select listbox holds only options, groups and a presentational separator. Skips are cases that do not apply to a subject (Tooltip's outside press, scale and the focus-return case) and, in WebKit, the forced-colours case.

**Negative control:** with `ReturnFocus` disabled, the new focus-return case fails for Dialog, Select and Menu (3 failed, 75 passed in Chromium).

`pnpm --filter @nizivo/react test:browser` (Chromium): 67 tests in 6 files pass, 10 of them the new Tabs and TabNav spec. The Tabs spec in WebKit (a scratch copy of the config): 8 of 10 pass; the two failures are the final step of each test that presses Tab onto a link, which WebKit on macOS skips by default (the same platform default week 3 hit with radios and buttons).

## Contrast matrix

`packages/tokens/CONTRAST.md` (`pnpm tokens:contrast`, `pnpm check:a11y`): **62 checked rows, 31 per theme, all pass**, with the same 14 overrides and 19 proposals. New cells (light / dark): `text-tertiary` on `bg-brand-subtle` 5.71 / 6.67 (a checked Menu item keeps its shortcut); reported only: `bg-hover` on `bg-surface-raised` 1.07 / 1.16 and `bg-brand-subtle` on `bg-surface-raised` 1.13 / 1.07 (the highlight and the checked fill are hints; the focus indicator is the generated outline), `text-disabled` on `bg-brand-subtle` 2.22 / 2.60. Use notes now name the Menu, Tabs and TabNav users of `text-brand`, `text-critical`, `icon-brand`, `icon-critical`, `bg-brand` and `border-strong`. No Figma colour failed.

## Next fixture

`node fixtures/runner/next.ts --dev` (full turbo build, pack of the three packages, frozen install, the three production builds and `next dev`; Next 16.4.0, React 19.3.0, react-aria-components 1.22.1, Chromium 156.0.8078.4): **23 of 23 pages pass in all four modes, 0 console messages, no build warnings.** Detail: `fixtures/next/RESULTS.md`.

- `/menu` (`Menu.Root defaultOpen`, a server Button as trigger): no popup in the server HTML; after hydration the menu is open with focus inside, 5 items, the checkbox item checked and the link item an `<a>`; Escape closes it and focus returns to the trigger; Enter reopens it with focus on the first item. It ships exactly 6 client modules: `menu/menu.client`, the react-aria `menu`, `overlay`, `popup` and `locale` adapters and `config/config.client`.
- `/tabs`: the server HTML has 3 tabs, the selected one, and only its panel, wired both ways; ArrowRight selects the next tab after hydration. 4 client modules (`tabs/tabs.client`, the react-aria `tabs` and `locale` adapters, `config/config.client`).
- `/tab-nav` (TabNav through `next/link`): no `@nizivo` client module; following a link moves the server-rendered `aria-current`.
- `/icons-server`: three icons from the barrel in a Server Component; **no icon module ships** in any mode.
- `/icons-client`: the same three icons in a client component; **exactly `icons/bell`, `icons/calendar`, `icons/search` and `_internal/icon` ship**, in all four modes (plain webpack included: `@nizivo/icons` has no client modules, so the S2c barrel leak does not apply). `pack.ts` plants 1,881 icon markers for this.
- The packed react package has 23 `'use client'` modules (week 3: 18); plain webpack's `/barrel-select` leak carries all 23, as expected.

## Docs (Turbopack static export)

From `pnpm docs:check` (`apps/docs/scripts/smoke.ts`): all JavaScript a page loads, and the Nizivo client markers found in it.

| Page                               | Scripts |      Raw |     Gzip | Nizivo client markers                  |
| ---------------------------------- | ------: | -------: | -------: | -------------------------------------- |
| `/docs/components/badge/` (server) |      14 | 673.9 KB | 215.1 KB | none                                   |
| `/docs/components/tooltip/`        |      16 | 725.2 KB | 234.1 KB | Tooltip                                |
| `/docs/components/icon-button/`    |      16 | 727.4 KB | 234.8 KB | Tooltip (through IconButton)           |
| `/docs/components/select/`         |      19 | 880.1 KB | 283.5 KB | Select                                 |
| `/docs/components/dialog/`         |      18 | 851.7 KB | 274.0 KB | Dialog                                 |
| `/docs/components/menu/`           |      19 | 860.0 KB | 277.3 KB | Menu, Tooltip (through IconButton)     |
| `/docs/components/tabs/`           |      17 | 797.6 KB | 254.5 KB | Tabs, Textarea, FieldScope             |
| `/docs/components/tab-nav/`        |      14 | 673.9 KB | 215.1 KB | none                                   |
| `/docs/icons/`                     |      14 | 676.8 KB | 216.1 KB | none (the search box is the docs' own) |
| `/docs/foundations/javascript/`    |      14 | 676.8 KB | 216.1 KB | none                                   |

The Icons page's HTML is 844,829 bytes (90,268 gzip): 1,879 server-rendered tiles, each drawing its glyph from `/icons.svg` (675,372 bytes, one `<symbol>` per icon, rendered at build time from the built package by `apps/docs/scripts/icons.ts`). The Deviations page lists 22 week 4 builder values (figma/13 §5), each checked against the file that ships it, and D1 to D4.

## Floor lane

Recorded in `fixtures/floor-lane/RESULTS.md`. Builder E's runs on HEAD's tokens: Mobile Safari 17.5 (iOS 17.5 Simulator, `Version/17.5 Mobile/15E148 Safari/604.1`) passes every check on the plan sample, the built `tokens.css` and the week 3 controls: 3,240 passing checks, 0 failures, 188 informational cells over both OS schemes, with D4 (an exit to `display: none` is instant) and D3 (no `overlay` property). Rerun at integration on the final tree:

| Run (both OS schemes)                     | Firefox 129.0                          | Mobile Safari 17.5          |
| ----------------------------------------- | -------------------------------------- | --------------------------- |
| Built `tokens.css`, the five week 1 pages | 1,434 pass, 166 fail (all D1), 94 info | 1,600 pass, 0 fail, 94 info |
| `w3-controls` on the shipped CSS          | 40/40                                  | 40/40                       |

Every page summary and every non-passing cell matches the committed result files exactly. Chromium 156 and WebKit 27.2, run alongside Firefox, have 0 failures.

## Found and fixed at integration

- **Focus lost after a server-open popup.** The Next fixture's `/menu` page found that Escape on a `defaultOpen` Menu left focus on `<body>`: React Aria returns focus to the element focused when the popup opened, and for a server-open popup that is `<body>`. §12.2 asks for the trigger. `ReturnFocus` (now in `_engines/react-aria/popup.client.tsx`) returns focus to the trigger when it would land on `<body>`, for Menu, Select and Dialog; it never moves focus that went somewhere. An overlay-lane case pins it (negative control above).
- **Tooltip pages +39 KB.** The first docs run of the integrated tree showed the Tooltip page at 272.3 KB gzip of JavaScript and IconButton at 273.1 KB (week 3: 233 and 234). The Tab-out helper had added a value import of React Aria's `PopoverContext` and `OverlayTriggerStateContext` to `overlay.client.tsx`, which Tooltip imports, and Turbopack then put React Aria's Popover and Dialog modules on every Tooltip page (esbuild tree-shook them, so the bundle table above did not show it). The modal-popup helpers moved to `popup.client.tsx`; Tooltip is back to 234.1 KB and IconButton to 234.8 KB. A node-lane test now fails if `overlay.client.tsx` imports anything but types from `react-aria-components`, or if the Tooltip adapter imports `popup.client`.
- **Docs build.** The Deviations page read a `- **Safari 17.5` line from `fixtures/floor-lane/RESULTS.md`, which the Safari lane had rewritten as two lines (Mobile Safari 17.5, macOS Safari 17.5); the page now shows both. The docs build's Turbo inputs gain `docs/figma/12-w3-forms.md` and `13-w4-menu-tabs.md`, which the Deviations page parses.

## Week 4 review

Three reviewers (accessibility and keyboard; design, CSS and icons; architecture, build and plan) filed 24 findings against the integrated tree. Fixed:

- **The pointer drew the keyboard ring** on Menu and Select rows in Chromium: React Aria moves DOM focus to the row under the pointer, and Chromium matched `:focus-visible` on that. A new `focusTarget` mode, `engine`, makes the generated floor follow React Aria's `data-focus-visible` only and turns the native ring off (`gen/COMPONENT-JSON.md`); Menu and Select items use it.
- **Forced colours:** `forced-color-adjust: none` is inherited, so a checked Menu row's inset ring and glyphs kept their token colours on Highlight (1.01:1 in dark). The `highlight` paint now sets `outline-color: CanvasText`; menu.css sets `HighlightText` for its inset ring and glyphs. Disabled Menu and Select rows are `GrayText` (they are divs with `aria-disabled`, which the browser does not grey).
- **The open Select listbox** failed axe `aria-required-children`: its separator had `role="separator"`. It is presentational now. The overlay lane checks the listbox's children; axe still runs only on closed popups in the docs smoke.
- **Menu:** a hovered checked row switches to the hover fill with the brand label (figma/13 §5 #3's alternative); a menu that mixes plain and checkable rows reserves the check column on plain rows, so shortcuts line up; `--nz-menu-border` joins the popup hooks.
- **Icons:** an empty or blank `label` no longer renders `role="img"` with an empty name; inline-in-text alignment (`vertical-align: -0.125em`) is documented rather than added to every icon.
- Tabs and TabNav set the label tracking tokens; the Icons page wraps long names at word boundaries and draws glyphs at 20 px; the floor lane deletes its Simulator device on SIGTERM, SIGHUP and errors too; the `OverlayEngine` interface lists what the family adds to React Aria (`completes`), and its `delegated` comment no longer claims Nizivo never moves focus; plan, inventory and comment wording (M13, M14, §14.2, the SVGO count, the attw comment, D-ag); one 0.1.0 changeset replaces the week 4 one.

Deferred, with reasons, in ARCHITECTURE §21.1's week 4 block: Tabs arrow keys follow NizivoConfig's locale, not a `dir` attribute (a maintainer decision; documented on the Tabs and Deviations pages); an overflow cue for a scrolling tab strip (outside the floor; listed on the Deviations page); real Lucide glyphs in the Menu and Tabs examples (the L6 lint bans icon imports in packages/react, and copied path data needs a Lucide notice there); Menu's inner spans stay class-only (reworded in D-ag).

## Tests

- **Full gate:** from a clean state (`.turbo`, every package `dist`, `apps/docs/.next`, `out`, `.generated`, `.source` and the generated routes deleted, and `packages/icons/src`'s generated icons deleted so the generator runs) with `TURBO_FORCE=true`, `pnpm check` exits 0 in **158 s** on this machine (Apple silicon, macOS 27.0.1, Node 24.16.0): frozen install, typecheck, lint, `gen:check` (`nz api --check`: 78 files up to date), tests, build, `check:a11y`, `test:dist` (4), `check:release` (tokens 9 files, react 251, icons 3,768; publint and attw on all three) and `docs:check` (58 pages). The first clean run failed in 14 s on one stale expectation in `packages/tokens/test/a11y.test.ts` (the negative control lists every background `text-tertiary` is checked on, and now names `bg-brand-subtle`); fixed, then the run above. The two time figures in this file and in ARCHITECTURE §21.1 were typed after that run; `pnpm docs:check` and `pnpm lint` were rerun afterwards.
- `pnpm test` (in the gate): `@nizivo/react` 605 tests in 44 files, `@nizivo/tokens` 89 in 8, `@nizivo/icons` 35 in 4, `@nizivo/tooling` 115 plus 1 skipped in 10 (after the review fixes; the gate rerun from clean on the final tree also took 158 s).
- New react tests: the overlay node lane (`test/overlay/overlay.test.tsx`: the `OverlayEngine` shape, engine-free contracts, server renders of all four overlays, and the guard that keeps `overlay.client.tsx` to type imports from the components barrel); `test/ssr/tabs.test.tsx` and `test/ssr/tab-nav.test.tsx`; `render-all.test.tsx` renders the Menu, Tabs and TabNav examples against the vocabulary; `t0.server.test.tsx` covers 26 server manifests (TabNav added).
- Browser lanes (not in `pnpm check`): overlay conformance and `test:browser` as above.

## Not verified

- **Firefox in the browser and overlay lanes:** Playwright's Firefox does not launch here; Firefox 129 covers CSS only, through the floor lane.
- **macOS Safari 17.5:** not tested; the Simulator covers iOS Safari 17.5 only. Playwright's WebKit 27.2 is a current engine.
- **Screen readers:** no VoiceOver or NVDA pass for Menu (checkbox and radio items, the critical tone, the visually hidden Dismiss buttons), Tabs (the count inside a tab's name, "Unfulfilled 12") or TabNav.
- **Forced colours:** the overlay lane asserts computed styles in Chromium; no screenshot is committed or reviewed (exit criterion 14).
- **Dark mode** of Menu, Tabs and TabNav was not rendered; the colours come from tokens and the matrix.
- **The icons barrel's build time** under Turbopack, webpack and `next dev` was not measured; only which modules ship.
- **Pixel identity of the icons** after SVGO is the builder's scratch Chromium comparison of all 1,880 icons; it is not a committed test. The RTL flip of a mirrored icon was not rendered under `dir="rtl"`.
- **`ReturnFocus` under Strict Mode** is covered only by the O-10 cycles (open by press); a Strict Mode `defaultOpen` page was not run.
- **Server HTML of a `defaultOpen` overlay** (Dialog, Tooltip and now Menu) names a popup that is not rendered until hydration (`aria-controls` or `aria-describedby`): one dangling IDREF before hydration. Pre-existing; recorded in the fixture results, not fixed.
- **Menu's uncontrolled checkbox state** is keyed by item text: two checkbox items with the same text in one Menu share state, and an item with non-string children and no `textValue` resets on reopen (documented in its JSDoc, not tested).
- **`next/link` inside `Menu.Item render`** was tested with a plain `<a>` in the overlay lane; the fixture covers `next/link` through TabNav only.
- **Bundle budgets:** no `size-limit` yet (W5).
