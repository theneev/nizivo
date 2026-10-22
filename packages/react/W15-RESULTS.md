# Week 15 results (v0.2 week 6, the React matrix and O-15)

Recorded on 2026-10-23 (ARCHITECTURE.md §21.2 "Week 15 status", §23.3 M45 and M46, §23.4 D-bu to
D-bw). M45 put the React 19.2 / 19.3 matrix and O-15 before the app shell, which still waits on
design (Q3, Q4, Q35). Built on the maintainer's Mac in one session; every number below comes from a
command run on the final tree there.

## What was built

| Part             | Where                                                      | Notes                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The React matrix | `test/react-matrix.ts`, `test/react-matrix.setup.ts`       | `NZ_REACT=19.2` runs the node suite, the browser lane and overlay conformance on React 19.2.9 (the catalog's `react-19.2` and `react-dom-19.2`, npm aliases) instead of the workspace's 19.3.0 (D-bu). Three new release lanes: `test-react-19.2`, `browser-react-19.2`, `overlay-react-19.2`, Chromium. Each lane checks its own React line and hydrates a React Aria button on it. |
| O-15, Activity   | `src/_engines/react-aria/open-state.client.tsx`, six Roots | Menu, Select, Popover, Tooltip, Dialog and Drawer close when a hidden `<Activity>` hides them: `onOpenChange(false, { reason: 'hidden' })`, an uncontrolled one closes itself, and it is closed on return (D-bv). React Aria now always gets a controlled `isOpen`.                                                                                                                  |
| The Toaster      | `src/toast/toaster.client.tsx`                             | A Toaster inside a hidden route hides its stack and shows it again on return (D-bw). The plan still says to mount it in the root layout, outside the routes.                                                                                                                                                                                                                         |
| Docs             | `apps/docs/content/docs/getting-started/next.mdx`          | "Routes kept by `cacheComponents`": what closes, the `'hidden'` reason, the Toaster's place, and React 19.2's difference.                                                                                                                                                                                                                                                            |

**How the matrix reaches React 19.2.** Vite aliases every `react` and `react-dom` import, the
engine's inside `node_modules` included, to the 19.2 packages; `dedupe` resolves those from
`packages/react`. pnpm links react-dom 19.2.9's `react` peer to the workspace's 19.3.0 (a scoped
pnpm override did not change it), and react-dom refuses another React's version, so the alias has to
reach inside `node_modules`: the browser lanes' dependency optimiser applies it, and in the node lane,
where `node_modules` load natively, a Node resolve hook (`registerHooks`) does the same. 19.2 has its
own Vite cache (`node_modules/.vite-react-19.2`) and vitest module cache. Turbo's strict environment
mode keeps `NZ_REACT` out of every turbo task, so `pnpm check` always runs 19.3.

## What O-15 found

The plan marked React 19.2's behaviour UNVERIFIED (§12.2 "Activity"; gap report C §1.5 row 7). On
the Mac, in Chromium:

- **React 19.2.9 does not hide a portal under a hidden Activity; 19.3.0 does.** An open Menu's popup,
  portaled to `<body>`, stayed visible on 19.2 after its route was hidden.
- **The planned close was not enough.** On both lines the close commits while the route is hidden
  (`data-open` goes), but React Aria keeps a closing popup mounted until an effect sees its exit
  animation end, and a hidden tree runs no effects. On 19.3 the leftover is hidden with the route; on
  19.2 it stayed on screen until the route came back. The first O-15 run on 19.2 failed 9 of 10 cases.
- **The fix:** the close also remounts the engine's root (a `key`); a remounted engine starts closed
  and renders nothing, so the popup leaves on both lines. Select remounts only its popup, because its
  uncontrolled value lives in the engine's root.
- **What 19.2 still does:** a controlled overlay that the app keeps open on `'hidden'` stays on screen
  until its route is back (19.3 hides it). The docs say to close it on `'hidden'`; an O-15 case
  records the difference on each line.

`test/overlay/activity.spec.tsx`, 10 cases: Menu, Select, Popover, Tooltip, an uncontrolled Dialog
and an uncontrolled Drawer (each: the popup is not visible, `<html>` is not locked, nothing is inert,
the other route's button takes focus, `'hidden'` was reported, closed on return); a controlled Dialog
whose app closes it; a controlled Dialog the app keeps open (hidden on 19.3, visible on 19.2, back on
return); a `defaultOpen` Dialog under Strict Mode stays open; a Toaster on a hidden route. With the
close switched off, 7 of the 10 fail on 19.3.

## Sizes

gzip, size-limit, React Aria inside, all locales (`packages/react/SIZES.md`). Every overlay subpath
carries the hook:

| Entry                                             |  Week 14 |   Week 15 | Change |                       Limit |
| ------------------------------------------------- | -------: | --------: | -----: | --------------------------: |
| `@nizivo/react/tooltip`                           | 16,372 B |  16,529 B | +157 B | **18 KiB (16 → 18 by M46)** |
| `@nizivo/react/dialog`                            | 32,460 B |  32,622 B | +162 B |     32 KiB (146 B under it) |
| `@nizivo/react/drawer`                            | 32,538 B |  32,703 B | +165 B |                      35 KiB |
| `@nizivo/react/popover`                           | 35,865 B |  36,008 B | +143 B |                      39 KiB |
| `@nizivo/react/menu`                              | 56,999 B |  57,165 B | +166 B |                      57 KiB |
| `@nizivo/react/select`                            | 63,537 B |  63,728 B | +191 B |                      66 KiB |
| `@nizivo/react/icon-button`                       | 17,369 B |  17,528 B | +159 B |                      19 KiB |
| the dashboard set                                 | 78,623 B |  78,886 B | +263 B |                      85 KiB |
| the root barrel `@nizivo/react`                   | 99,897 B | 100,198 B | +301 B |                     107 KiB |
| own code: `_engines/react-aria/open-state.client` |        — |     341 B |    new |   0.4 KiB (measured + 10 %) |

Tooltip had 12 B of headroom since week 7; M46 raised its limit to measured + 10 %. Dialog is the
next entry close to its limit: 146 B.

## Lanes (the maintainer's Mac)

All 17 release lanes on the final tree (`node packages/tooling/release/lanes.ts`):

| Lane                                                                   | Result                                                                                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| browser (Chromium)                                                     | 270 passed (week 14: 269; the matrix check is new)                                           |
| browser-firefox                                                        | 242 passed, 28 skipped                                                                       |
| overlay-chromium                                                       | 200 passed, 10 skipped (210; O-15's 10 cases and the matrix check are new)                   |
| overlay-webkit                                                         | 192 passed, 18 skipped                                                                       |
| overlay-firefox                                                        | 192 passed, 18 skipped                                                                       |
| **test-react-19.2** (new)                                              | 878 passed, the node suite on React 19.2.9                                                   |
| **browser-react-19.2** (new)                                           | 270 passed                                                                                   |
| **overlay-react-19.2** (new)                                           | 200 passed, 10 skipped                                                                       |
| charts (Chromium, WebKit, Firefox)                                     | 96 passed each                                                                               |
| fixture-charts, fixture-next (four modes), fixture-vite, fixture-astro | pass                                                                                         |
| visual (react)                                                         | no differences (1,984 shots); `popover/open` and `drawer/sheet`, open at mount, did not move |
| visual-charts                                                          | failed once on the known `area-chart/rtl` dark flake; two reruns: no differences             |

## For the maintainer

1. **Dialog has 146 B left under its 32 KiB limit** (M17). The next change to anything the Dialog
   entry bundles (the overlay family's shared code included) goes over; expect a size question then.
2. **`pnpm audit` reports 27 advisories, none in a published package's runtime:** `axios` under
   `tokens-bruecke` (the Figma token export: 24 of them, 10 high), `braces` (1, high, through the
   react, charts and stylelint-config dev tooling), and `@vitest/browser` and `@vitest/ui` 5.0.4 (moderate; fixed in
   5.0.5). None is React: no advisory names react or react-dom 19.3.0, though React 19.3.1 and 19.2.9
   were published together on 2026-10-14. Updating the dev tools is a separate change; say if you
   want it next.
3. **What next:** the shell still waits on Q3, Q4 and Q35. Without those answers the next v0.2 items
   are the rest of the 08 overview (PageHeader, the Banner on `/dashboard`, Recent orders, Goals), the
   second Tooltip adapter, and the Vite SSR and React Router 8 fixtures.

## Unverified

- `cacheComponents` in a real Next app: the Next fixture does not turn it on, so O-15 runs with
  `<Activity>` in the overlay lanes, not through Next's router.
- O-15 on React 19.2 in WebKit and Firefox: the matrix runs 19.2 in Chromium only (D-bu).
- Screen readers under Activity hide and show.
