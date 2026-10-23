# Week 20 results (v0.2 week 11, the shell)

Recorded on 2026-10-23 (ARCHITECTURE.md §21.2 "Week 20 status", §23.3 M49 and M52 to M54, §23.4 D-ck
to D-cm).
The shell on the maintainer's answers to the design questions (M49): the rail from 640 px, expanded
from 1280 px, the token widths 264 / 72 px, a "More" sheet below 640 px, and a real search input.
Built in one lane, without parallel builders. Every number below comes from a command run on the
maintainer's Mac.

## What was built

| Part                           | Subpath            | Kind   | Notes                                                                                                                       |
| ------------------------------ | ------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Sidebar, SidebarItem           | `./sidebar`        | split  | `Root` (a `<nav>`), `Header`, `Content`, `Footer` on the server; `SidebarItem`, NavItem with the rail's Tooltip (D-cl, M52) |
| TopBar                         | `./top-bar`        | server | `title` or `start`, `search`, `actions`; the title is text, not a heading (D-ck)                                            |
| MobileTopBar                   | `./mobile-top-bar` | server | `mark` or `leading`, `title`, `actions` (D-ck)                                                                              |
| MobileTabBar, MobileTabBarMore | `./mobile-tab-bar` | split  | Links in a `<nav>` and a list; More's bottom Drawer; the bottom-inset island (D-cm)                                         |
| AppShell                       | `./app-shell`      | server | Places the four, shows each at its widths with CSS, owns `<main>` and a skip link (D-ck)                                    |

Also changed:

- **NavItem** folds to the rail inside a rail-narrow Sidebar (`@container nz-sidebar`), not under any
  `data-collapsed` ancestor. Its collapsed example is now a collapsed Sidebar of `SidebarItem`s.
- **The rail's labels are a Tooltip** (M52, "keep tooltip, because accessibility is important"):
  `SidebarItem` opens it only while its item is in the rail, on keyboard focus at once and on hover
  after the delay; Escape closes it; the link is not described by it (it repeats the name). The CSS
  labels I first built are gone.
- **StickyBar and the toast region** no longer add the safe area a second time above the tab bar
  (`:root[data-nz-bottom-bar]`).
- The internal glyph `ellipsis` (THIRD_PARTY_NOTICES lists thirteen Lucide glyphs). Vocabulary:
  `data-expanded` (Sidebar) and `data-current` (MobileTabBarMore); `data-collapsed` now means the
  Sidebar's `collapsed`.
- The Next fixture's `/dashboard` is in the shell (`app/dashboard/layout.jsx`).
- The static-or-interactive guide's table lists all 67 components (39 server, 8 split, 20 client).

## Sizes

gzip, size-limit (`packages/react/SIZES.md`); new entries at measured + 10 %:

| Entry                                  | Measured |   Limit |
| -------------------------------------- | -------: | ------: |
| `./sidebar` (the Tooltip chain inside) | 17,315 B |  19 KiB |
| `./top-bar`                            |    846 B |   1 KiB |
| `./mobile-top-bar`                     |    840 B |   1 KiB |
| `./mobile-tab-bar` (the Drawer inside) | 33,328 B |  36 KiB |
| `./app-shell`                          |    462 B | 0.5 KiB |
| own: `mobile-tab-bar-inset.client`     |    370 B | 0.4 KiB |
| own: `mobile-tab-bar-more.client`      |    612 B | 0.7 KiB |
| `css/sidebar.css`                      |    928 B |   1 KiB |
| own: `sidebar-item.client`             |    565 B | 0.7 KiB |
| `css/top-bar.css`                      |    452 B | 0.5 KiB |
| `css/mobile-top-bar.css`               |    536 B | 0.6 KiB |
| `css/mobile-tab-bar.css`               |    987 B | 1.1 KiB |
| `css/app-shell.css`                    |    610 B | 0.7 KiB |

`./sidebar` is mostly the Tooltip chain, which a page shares with any IconButton's tooltip; its own
leaf is 565 B. `css/nav-item.css` is 1,004 B under its 1.1 KiB limit (set last week, not moved).

**Aggregates, reset to measured + 10 % at this push (M50, M51):** `styles.css` 23,949 B → 26 KiB
(was 25); `css/base.css` 1,250 B → 1.4 KiB (was 1.3); the root barrel `@nizivo/react` 110,822 B →
120 KiB (was 117). No other existing limit moved.

## Lanes (the maintainer's Mac)

All 25 release lanes on the final code (`node packages/tooling/release/lanes.ts`):

| Lane                                                                                            | Result                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| browser, browser-react-19.2, browser-tooltip-hooks                                              | pass                                                                                                                                             |
| browser-firefox                                                                                 | failed in 3 of 8 runs on CountUp's "root box" case ("no <data>"), then fixed in the spec (below)                                                 |
| overlay-chromium, overlay-webkit, overlay-react-19.2, overlay-tooltip-hooks-chromium, -webkit   | pass                                                                                                                                             |
| overlay-firefox                                                                                 | the known Tooltip "enters through data-entering" flake in 2 of 3 runs; overlay-tooltip-hooks-firefox passed                                      |
| test-react-19.2, test-tooltip-hooks                                                             | pass                                                                                                                                             |
| charts-chromium, charts-webkit, charts-firefox, fixture-charts, visual-charts                   | pass                                                                                                                                             |
| fixture-next (three modes), fixture-vite, fixture-vite-ssr, fixture-react-router, fixture-astro | pass                                                                                                                                             |
| react-hooks (non-blocking)                                                                      | pass                                                                                                                                             |
| visual (3,228 shots)                                                                            | new shots for the five parts; NavItem's collapsed example now a Sidebar of SidebarItems (its tooltip in the rail shots); no other baseline moved |

- **The Next fixture's `/dashboard` in the shell:** axe finds nothing in light, dark, forced colours and
  reduced motion; the load's CLS is 0.0000; the client modules are exactly the expected ones (the
  SidebarItems' and IconButtons' Tooltip, the SearchField, the MobileTabBar's inset island and More's Drawer, plus the
  page's own); page JavaScript 247,997 B gzip (Turbopack), 250,660 B (webpack), 247,755 B (webpack with optimizePackageImports); SidebarItem's Tooltip added 454 B under Turbopack, since the TopBar's IconButtons already ship the Tooltip chain. The page without any Nizivo client module (`/button-only`) is 174,744 B, Next.js and React alone. The chart's keyboard check now tabs up to 40 stops to get past the shell.
- **The shell's specs** (`app-shell.spec.tsx`, 10 cases with SidebarItem's Tooltip; the NavItem rail, 1) pass in Chromium,
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

1. **Answered the same day:** the rail's labels are a Tooltip (M52, built: `SidebarItem`); no
   exception for Edge's own reveal button (M53); the AI components come after v0.3 (M54, §21.4a).
2. **AppShell is server only**, and the More sheet lives in `MobileTabBarMore` (D-cm), not in
   AppShell as §12 planned.
3. **Next:** W21, the patterns as docs examples, the locale catalogue and the chart-draw specimen.

## Unverified

- Screen readers: the two "Primary" navigation landmarks (only one is shown at a time), the rail's
  Tooltips, More's sheet.
- Real iOS: the safe area under the tab bar (`viewport-fit=cover`), and the inset as the browser's
  toolbars show and hide.
