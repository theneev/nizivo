# Week 20 results (v0.2 week 11, the shell)

Recorded on 2026-10-23 (ARCHITECTURE.md §21.2 "Week 20 status", §23.3 M49, §23.4 D-ck to D-cm).
The shell on the maintainer's answers to the design questions (M49): the rail from 640 px, expanded
from 1280 px, the token widths 264 / 72 px, a "More" sheet below 640 px, and a real search input.
Built in one lane, without parallel builders. Every number below comes from a command run on the
maintainer's Mac.

## What was built

| Part                           | Subpath            | Kind   | Notes                                                                                                                                              |
| ------------------------------ | ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar                        | `./sidebar`        | server | `Root` (a `<nav>`), `Header` (the store's mark, name and domain), `Content`, `Footer`; `layout/sidebar` wide, a size container for the rail (D-cl) |
| TopBar                         | `./top-bar`        | server | `title` or `start`, `search`, `actions`; the title is text, not a heading (D-ck)                                                                   |
| MobileTopBar                   | `./mobile-top-bar` | server | `mark` or `leading`, `title`, `actions` (D-ck)                                                                                                     |
| MobileTabBar, MobileTabBarMore | `./mobile-tab-bar` | split  | Links in a `<nav>` and a list; More's bottom Drawer; the bottom-inset island (D-cm)                                                                |
| AppShell                       | `./app-shell`      | server | Places the four, shows each at its widths with CSS, owns `<main>` and a skip link (D-ck)                                                           |

Also changed:

- **NavItem** folds to the rail inside a rail-narrow Sidebar (`@container nz-sidebar`), not under any
  `data-collapsed` ancestor. Its collapsed example is now a collapsed Sidebar. In the rail a hovered
  or focused item shows its label beside it (sidebar.css).
- **StickyBar and the toast region** no longer add the safe area a second time above the tab bar
  (`:root[data-nz-bottom-bar]`).
- The internal glyph `ellipsis` (THIRD_PARTY_NOTICES lists thirteen Lucide glyphs). Vocabulary:
  `data-expanded` (Sidebar) and `data-current` (MobileTabBarMore); `data-collapsed` now means the
  Sidebar's `collapsed`.
- The Next fixture's `/dashboard` is in the shell (`app/dashboard/layout.jsx`).
- The static-or-interactive guide's table lists all 67 components (40 server, 7 split, 20 client).

## Sizes

gzip, size-limit (`packages/react/SIZES.md`); new entries at measured + 10 %:

| Entry                                  | Measured |   Limit |
| -------------------------------------- | -------: | ------: |
| `./sidebar`                            |  1,132 B | 1.3 KiB |
| `./top-bar`                            |    846 B |   1 KiB |
| `./mobile-top-bar`                     |    840 B |   1 KiB |
| `./mobile-tab-bar` (the Drawer inside) | 33,328 B |  36 KiB |
| `./app-shell`                          |    462 B | 0.5 KiB |
| own: `mobile-tab-bar-inset.client`     |    370 B | 0.4 KiB |
| own: `mobile-tab-bar-more.client`      |    612 B | 0.7 KiB |
| `css/sidebar.css`                      |  1,107 B | 1.2 KiB |
| `css/top-bar.css`                      |    452 B | 0.5 KiB |
| `css/mobile-top-bar.css`               |    536 B | 0.6 KiB |
| `css/mobile-tab-bar.css`               |    987 B | 1.1 KiB |
| `css/app-shell.css`                    |    610 B | 0.7 KiB |

`css/nav-item.css` is 1,004 B under its 1.1 KiB limit (set last week, not moved). The rail's
hover label first went into it and measured 1,150 B; it belongs to the Sidebar and moved to
sidebar.css.

**Aggregates, reset to measured + 10 % at this push (M50, M51):** `styles.css` 24,088 B → 26 KiB
(was 25); `css/base.css` 1,242 B → 1.4 KiB (was 1.3); the root barrel `@nizivo/react` 110,527 B →
119 KiB (was 117). No other existing limit moved.

## Lanes (the maintainer's Mac)

All 25 release lanes on the final code (`node packages/tooling/release/lanes.ts`):

| Lane                                                                                            | Result                                                                                                      |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| browser, browser-react-19.2, browser-tooltip-hooks                                              | pass                                                                                                        |
| browser-firefox                                                                                 | failed in 3 of 8 runs on CountUp's "root box" case ("no <data>"), then fixed in the spec (below)            |
| overlay-chromium, overlay-webkit, overlay-react-19.2, overlay-tooltip-hooks-chromium, -webkit   | pass                                                                                                        |
| overlay-firefox                                                                                 | the known Tooltip "enters through data-entering" flake in 2 of 3 runs; overlay-tooltip-hooks-firefox passed |
| test-react-19.2, test-tooltip-hooks                                                             | pass                                                                                                        |
| charts-chromium, charts-webkit, charts-firefox, fixture-charts, visual-charts                   | pass                                                                                                        |
| fixture-next (three modes), fixture-vite, fixture-vite-ssr, fixture-react-router, fixture-astro | pass                                                                                                        |
| react-hooks (non-blocking)                                                                      | pass                                                                                                        |
| visual (3,156 shots)                                                                            | 252 new; the 40 changed are NavItem's collapsed example, now a collapsed Sidebar; no other baseline moved   |

- **The Next fixture's `/dashboard` in the shell:** axe finds nothing in light, dark, forced colours and
  reduced motion; the load's CLS is 0.0000; the client modules are exactly the expected ones (the
  SearchField, the IconButtons' tooltip, the MobileTabBar's inset island and More's Drawer, plus the
  page's own); page JavaScript 247,543 B gzip (Turbopack), 250,214 B (webpack), 247,291 B (webpack with
  optimizePackageImports). The chart's keyboard check now tabs up to 40 stops to get past the shell.
- **The shell's specs** (`app-shell.spec.tsx`, 7 cases; the NavItem rail, 2) pass in Chromium,
  WebKit and Firefox.
- **CountUp in Firefox:** `mount()` waited a fixed 30 ms for `createRoot`'s first commit, which under
  the full lane's load sometimes landed later. It now polls for it; 12 full Firefox runs passed after
  it. In one of them a rail measurement ran before the Sidebar was laid out, so the rail tests wait for
  its 72 px width too.
- **The visual harness** no longer hovers a control that is off-screen at rest (AppShell's skip link);
  its focus shots still record it.
- **Two fixes from the renders:** at 960 px the TopBar's search took the title's width (the title now
  keeps its own, up to half the bar), and in forced colours the store mark gets a 1 px edge.

## For the maintainer

1. **The rail's labels** show on hover and focus in CSS, not in a Tooltip (D-cl): no client code, but
   no Escape to hide one while it shows (WCAG 1.4.13's "dismissible"). Say if you want the Tooltip
   instead (about 15 KB on every page with a Sidebar).
2. **AppShell is server only**, and the More sheet lives in `MobileTabBarMore` (D-cm), not in
   AppShell as §12 planned.
3. **Edge's own password reveal button** beside PasswordInput's toggle (week 19, item 2) is still
   open.
4. **Next:** W21, the patterns as docs examples, the locale catalogue and the chart-draw specimen.

## Unverified

- Screen readers: the two "Primary" navigation landmarks (only one is shown at a time), the rail's
  labels, More's sheet.
- Real iOS: the safe area under the tab bar (`viewport-fit=cover`), and the inset as the browser's
  toolbars show and hide.
- The rail's hover labels with a real mouse at the rail's edge (scripted in the specs).
