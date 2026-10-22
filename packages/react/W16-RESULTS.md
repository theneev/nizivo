# Week 16 results (v0.2 week 7, the rest of the 08 overview)

Recorded on 2026-10-23 (ARCHITECTURE.md §21.2 "Week 16 status", §23.4 D-bx to D-ca). The
maintainer asked to update the dev tools behind week 15's audit findings, then to continue; the
shell still waits on design (Q3, Q4, Q35), so the week built the parts of 08 that do not need it:
PageHeader, the Table parts, and the overview's Banner, Goals and Recent orders in the Next fixture.
Built on the maintainer's Mac, overnight, at the maintainer's request ("do the recommendations for
things that you can"); every number below comes from a command run on the final tree there.

## What was built

| Part         | Subpath                      | Exports                                                                               | Notes                                                                                                                                                                                                                                                                                                                                                    |
| ------------ | ---------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PageHeader   | `./page-header`              | `PageHeader`                                                                          | Server. A `<header>`: `title` (the page's one `<h1>`; `level={2}` keeps its look), `meta` beside it, `description` under it, `actions` at the row's end. Below `--nz-sm` the title takes Heading/H2's size and the actions start a row of their own (D-by).                                                                                              |
| Table        | `./table`                    | `Table` namespace; `TableContainer`, `TableRoot`, … `TableSortButton`, `TableRowLink` | Server, 0 KB of client JS, a native `<table>` (D-bz). Rows that link as a whole (`interactive` with a `RowLink`), sorting through the URL (`SortButton` with `href`; `aria-sort` on the `<th>`), `numeric` columns in tabular figures, a `selected` row, a visually hidden `Caption`. Cells keep to one line; a wide table scrolls inside its container. |
| The overview | `fixtures/next` `/dashboard` | —                                                                                     | 08's PageHeader (greeting, the range as a SegmentedControl, Export), the Banner dismissed by a Server Action (a cookie), Goals (Card + ProgressBar) and Recent orders (Card + Table) (D-ca).                                                                                                                                                             |

**Dev tools (D-bx):** Vitest 5.0.4 → 5.0.5 (GHSA-p458-7748-mcp3); axios under tokens-bruecke's
figma-api 0.27.2 → 0.34.0 through a scoped pnpm override (24 advisories). `pnpm audit`: 27 → 1.

**Vocabulary:** one additive local attribute, `data-numeric` (`Table.Head`, `Table.Cell`).

## Figma mapping

| Part       | Figma (file BIzJFf1wm8KP0YG2AVI1tP, read only)                                                          | Mapping                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PageHeader | no component; "Page header" frames in 08 (`7275:15337`, Pattern 1 `7275:15757`, Pattern 2 `7275:15860`) | title Heading/H1 (H2 on mobile), controls 16 apart, centred, at the row's end; Pattern 2's status Badge as `meta`                                                            |
| Table      | Order Row `7275:14091`, Product Row `7275:14040`; orphan headers `753:599`, `753:410`                   | 12 / 20 cell padding, `border/subtle` row lines, header `bg/subtle` Label/M, container radius 12 with a `border/subtle` stroke, hover `bg/hover`, selected `bg/brand-subtle` |

## Deviations from Figma and the plan (kept on purpose)

- **Row padding 12 / 20:** Order Row draws 14 (off the scale) and is 57 tall; Product Row 12 and 65
  (D-bz). A design ask: one row spec.
- **Header text:** Label/M in `text/secondary`; the orphan headers' properties were never read (G2).
- **Avatar to name gap 8** (Figma 10, off the scale).
- **No sticky header:** a header cannot stick to the page inside the container that scrolls the table
  sideways; §16.2's `--nz-table-sticky-offset` is not built.
- **PageHeader's breakpoint is the viewport's** (`--nz-sm`), not the header's own width (D-by).

## Sizes

gzip, size-limit (`packages/react/SIZES.md`); new entries at measured + 10 %:

| Entry                           |  Measured |                    Limit |
| ------------------------------- | --------: | -----------------------: |
| `@nizivo/react/page-header`     |     890 B |                    1 KiB |
| `css/page-header.css`           |     416 B |                  0.5 KiB |
| `@nizivo/react/table`           |   1,618 B |                  1.8 KiB |
| `css/table.css`                 |   1,011 B |                  1.1 KiB |
| the root barrel `@nizivo/react` | 100,888 B | 107 KiB (unchanged, M44) |

No existing limit moved.

## The Next fixture

All 32 pages pass under Turbopack, webpack, webpack + `optimizePackageImports` and `next dev`
(`fixtures/next/RESULTS.md`, "Week 16"). `/dashboard`: CLS 0.0000; 0 axe violations in light, dark,
forced colours and reduced motion; Nizivo client modules: the charts island, SegmentedControl (with
FieldScope) and BannerDismiss. `/dashboard-kpi` still ships exactly `/button-only`'s JavaScript.

## Lanes (the maintainer's Mac)

All 17 release lanes on the final tree (`node packages/tooling/release/lanes.ts`):

| Lane                                                                   | Result                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| browser (Chromium)                                                     | 278 passed (week 15: 270; the 8 Table and PageHeader cases are new)                        |
| browser-firefox                                                        | 250 passed, 28 skipped                                                                     |
| overlay-chromium                                                       | 200 passed, 10 skipped                                                                     |
| overlay-webkit, overlay-firefox                                        | 192 passed, 18 skipped each                                                                |
| test-react-19.2                                                        | 894 passed                                                                                 |
| browser-react-19.2                                                     | 278 passed                                                                                 |
| overlay-react-19.2                                                     | 200 passed, 10 skipped                                                                     |
| charts (Chromium, WebKit, Firefox)                                     | 96 passed each                                                                             |
| fixture-charts, fixture-next (four modes), fixture-vite, fixture-astro | pass                                                                                       |
| visual (react)                                                         | no differences (2,100 shots; 116 new for PageHeader and Table); no existing baseline moved |
| visual-charts                                                          | failed once on the known `area-chart/rtl` dark flake; two reruns: no differences           |

The Table and PageHeader browser cases also pass in WebKit and Firefox, run by hand (8 each).

## For the maintainer

1. **The first Vitest 5.0.5 run** of the browser and overlay lanes failed `overlay-webkit` and
   `charts-firefox` once each; their output was not kept. Five later runs of each, alone and in the
   full batch, passed; the cause is not established (a cold dependency cache after the upgrade is
   the likeliest).
2. **braces GHSA-vfj7-8cjw-p6xm (high)** has no fixed release; it is in the stylelint and size
   tooling, which glob only the repo's own patterns. It stays until braces ships a fix.
3. **Design asks for Dayitava:** one table row spec (Order Row 14 / 57 against Product Row 12 / 65),
   one Table Header (the two orphans), a header text style, Order Row's missing Selected state; a
   PageHeader component with a mobile variant.
4. **What next:** without the shell's answers, the selection island (`TableSelection`, §16.2) is the
   next v0.2 item; then the second Tooltip adapter and the Vite SSR and React Router 8 fixtures.

## Unverified

- figma-api's network path under axios 0.34.0 (it needs a Figma token; the repo's token export is
  offline).
- The Banner's Server Action dismiss is not clicked by the fixture runner; it renders, hydrates and
  passes axe.
- Real Safari and iOS for the stretched row link (Playwright's WebKit passes the hit tests).
