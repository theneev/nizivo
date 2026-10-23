# Week 18 results (v0.2 week 9, the maintainer's answers)

Recorded on 2026-10-23 (ARCHITECTURE.md §21.2 "Week 18 status", §23.3 M47 and M48, §23.4 D-cc to
D-cf). Built in a session with the maintainer: the six answers to weeks 16 and 17 (M47), then the
client-app questions (M48). Every number below comes from a command run on the maintainer's Mac.

## What was built

| Part                      | Where                                                                                  | Notes                                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Row selection             | `@nizivo/react/table-selection` (`TableSelection`, `TableSelectAll`, `TableSelectRow`) | Native checkboxes rendered on the server that submit with their form before any JavaScript runs; one client island adds select-all (checked and mixed), Shift-click ranges, Escape and `onSelectionChange`. Its own subpath (M48, D-cf): with it inside `./table`, webpack builds shipped the island to every page that imported `./table` |
| React Compiler lane       | `packages/tooling/react-hooks-lint`, lane `react-hooks`                                | ESLint 10.13.0 with only `eslint-plugin-react-hooks` 7.1.1 `recommended-latest` on 38 client leaves and adapters, typescript-eslint 8.72.0 on the `typescript6` catalog; non-blocking (`blocking: false`, D-cd)                                                                                                                            |
| Second Tooltip adapter    | `src/_engines/react-aria/tooltip.hooks.client.tsx`, `"adapter": "hooks"`               | React Aria's hooks with Nizivo's own DOM; tested through `NZ_ADAPTER=hooks` by five lanes; not shipped until it has passed for two weeks (D-cc)                                                                                                                                                                                            |
| Pagination `onPageChange` | `@nizivo/react/pagination`                                                             | Buttons for client state with no URL, beside link mode; server-safe still (M48)                                                                                                                                                                                                                                                            |
| Client-app docs           | every server and split component page; the static-or-interactive guide                 | "In a client app": every component is an ordinary React component there; live client paging and sorting demos (M48)                                                                                                                                                                                                                        |
| Design asks               | figma-handoff §1.7                                                                     | Each value code chose, with the existing component it came from (M47 (6))                                                                                                                                                                                                                                                                  |

`nz gen`: `"adapter"` is accepted and checked (a second adapter must export every engine member);
a client part in a server component's namespace is an error (D-cf).

## Two corrections

- **`./table` and the zero-JS claim.** The week 17 report said a server-only page ships 0 B of the
  selection island with it inside `./table`. That held under Turbopack only: webpack and webpack with
  `optimizePackageImports` shipped `table-selection.client` to the Next fixture's `/dashboard`, which
  uses Table and selects nothing, because the subpath's index re-exported it. The maintainer chose
  the split (M48). `/dashboard` now passes in all three modes.
- **The hooks adapter's size.** §9.4 expected 7.2 KB against 14.3 KB. Measured (esbuild, minified,
  gzip, React external, every dependency bundled): `./tooltip` is 15,052 B on the hooks adapter and
  16,775 B on the components adapter, 10 % less. React Aria's Tooltip component is a thin layer over
  the same hooks. The first version measured 19,277 B: react-aria's `Overlay` brought FocusScope
  (about 9 KB minified) that a tooltip never uses; a plain portal on the family's PortalProvider
  replaced it.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`); new entries at measured + 10 %:

| Entry                           |  Measured |                                                             Limit |
| ------------------------------- | --------: | ----------------------------------------------------------------: |
| `@nizivo/react/table`           |   1,661 B | 1.8 KiB (as in week 16; M47 had raised it to 2.7, M48 undid that) |
| `@nizivo/react/table-selection` |   1,743 B |                                                     1.9 KiB (new) |
| own: `table-selection.client`   |     783 B |                                                     0.9 KiB (new) |
| `css/table-selection.css`       |     122 B |                                                     0.2 KiB (new) |
| `@nizivo/react/pagination`      |   1,990 B |                                                 2 KiB (unchanged) |
| the root barrel `@nizivo/react` | 101,614 B |                                          107 KiB (unchanged, M44) |

No existing limit moved.

## Lanes (the maintainer's Mac)

All 25 release lanes on the final code (`node packages/tooling/release/lanes.ts`, run twice):

| Lane                                                                                           | Result                                                                                                    |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| browser, browser-firefox                                                                       | pass                                                                                                      |
| overlay-chromium, overlay-webkit                                                               | pass                                                                                                      |
| overlay-firefox                                                                                | pass, except one Tooltip case once (below)                                                                |
| test-react-19.2, browser-react-19.2, overlay-react-19.2                                        | pass                                                                                                      |
| test-tooltip-hooks (898 tests), browser-tooltip-hooks (285)                                    | pass                                                                                                      |
| overlay-tooltip-hooks-chromium (201), -webkit (193), -firefox (193)                            | pass, except the same Tooltip case in Firefox                                                             |
| charts-chromium, charts-webkit, charts-firefox, fixture-charts                                 | pass                                                                                                      |
| fixture-next (four modes), fixture-vite, fixture-vite-ssr, fixture-react-router, fixture-astro | pass                                                                                                      |
| react-hooks (non-blocking)                                                                     | pass, 0 problems in 38 files                                                                              |
| visual (2,128 shots)                                                                           | no differences; 28 new for the selection example, moved from `table/` to `table-selection/` byte for byte |
| visual-charts                                                                                  | failed once on the known `area-chart/rtl` dark and forced flake; the next run passed                      |

**A new Firefox flake, on both adapters:** Tooltip's "enters through data-entering with a running
transition" found no running opacity transition. In full lane runs it failed 1 of 3 on the default
adapter and 2 of 3 on the hooks adapter; run alone, 3 of 3 pass on each. It looks like timing under
load (the check reads the popup's animations while it enters); not investigated further.

## For the maintainer

1. **The hooks Tooltip adapter** becomes the default after two green weeks (§9.4). Shipping it
   moves `react-stately` (`^3.51.0`, the version react-aria already depends on) from
   `devDependencies` to `dependencies`: your call when the time comes.
2. **The lockfile:** adding `@babel/core` (through eslint-plugin-react-hooks) resolves next's and
   styled-jsx's optional `@babel/core` peer for the docs app. No version changed.
3. **`pnpm audit`:** still 1 finding (braces, no fixed release).

## Unverified

- The hooks adapter in real Safari and on iOS (Playwright's WebKit passes).
- Client paging and sorting with a screen reader (the browser tests check the roles, `aria-current`,
  `aria-sort` and disabled states).
