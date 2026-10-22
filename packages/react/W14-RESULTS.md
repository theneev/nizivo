# Week 14 results (v0.2 week 5, Toast and Banner)

Recorded on 2026-10-22 (ARCHITECTURE.md §21.2 "Week 14 status", §23.3 M44, §23.4 D-bp to D-bt).
The task was §21.2's last Overlays item, Toast with its announcer (gate O-06), and the Feedback row's
Banner, built on the maintainer's Mac in one session. Every number below comes from a command run on
the final tree there.

## What was built

| Part   | Subpath    | Exports                            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------ | ---------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toast  | `./toast`  | `toast()`, `Toaster`, `announce()` | Tier `own` behind a `ToastEngine` (D-bp). A module-level queue (`src/toast/store.ts`, no React) read through `useSyncExternalStore`; React Aria's `useToastRegion` and `useToast` only add the region's landmark, pausing on hover and focus, where focus goes as a focused toast leaves, and each toast's non-modal alertdialog role (`_engines/react-aria/toast.client.tsx`). The region is a `<section popover="manual">` portalled to `<body>`, in the top layer while a toast shows; the announcer is two visually hidden live regions. Both are marked top layer. |
| Banner | `./banner` | `Banner`, `BannerDismiss`          | Server shell shaped like Alert; `BannerDismiss` (a tertiary `md` IconButton) is its one client leaf. `tone` `brand` (Figma's Promo) or `warning`; `title`, description as `children`, `media` (72 px) or `icon` (24 px), `action`, `dismiss`. No live role by default.                                                                                                                                                                                                                                                                                                  |

**Toast behaviour** (§12.6):

- A toast with an action, or a critical one, stays until dismissed; any other leaves after `timeout`
  (5 s). The clock runs only while the toast is shown and a Toaster is mounted, and stops while the
  pointer or focus is on the stack and while the page is hidden. Pauses are a set of reasons, so the
  page becoming visible does not restart a clock the pointer is holding.
- Three toasts show at once, newest last (`limit`); an older one waits, its clock stopped.
- Each toast is spoken once through the announcer: message, then description; `assertive` when
  critical, else `polite`. The toasts are not live (React Aria's `contentProps`, `role="alert"`, is
  not used), so nothing is read twice. `announce(message, politeness)` speaks through the same
  regions.
- F8 moves focus to the stack and, pressed in it, back to where it was; Escape on a toast dismisses
  it and goes no further (a Dialog under it stays open); Escape on the stack itself returns focus
  (D-br).
- `--nz-toast-inset` on `<html>` holds the stack's height above the viewport's bottom edge while
  toasts show; `base.css` already added it to `scroll-padding-block-end` (WCAG 2.4.11, O-13).
- Colours: Figma's `bg/inverse`, `text/inverse` and `text/inverse-accent` are meant for the page's
  scheme, while the toast's Button and IconButton need the opposite scheme for their hover and focus.
  Each toast carries `data-nz-scheme="inverse"`, and the three page-scheme colours are registered
  `<color>` properties set on the region, so they compute there and each toast inherits the colour
  (D-bs). Light page: a dark toast with a lime action; dark page: a white toast with a green one.

**Shared changes this week:**

- **A fix to the overlay family: focus return inside a Dialog (O-12).** Week 13's O-12 case failed on
  the Mac in Chromium and WebKit (it passed in the cloud on Linux): with focus on one control of a
  Dialog, a Menu or Select opened with the pointer, then closed by Escape or an outside press, sent
  focus to that other control, or to the Dialog's first control, instead of its own trigger. React
  Aria records the element focused before the press reaches the trigger; and after an outside press
  the Dialog's FocusScope moves focus to its first control as the popup's content leaves, before any
  restore. `ReturnFocus` now puts the trigger before React Aria's choice when it intercepts the
  engine's restore, and the outside-press completion marks the popups it closes so `ReturnFocus`
  returns focus to the trigger even though focus is no longer on `<body>` (`patch` changeset).
- **Next.js 16.4.0 → 16.4.2** in the docs site and the Next fixture: `next build` began refusing to
  build on 2026-10-22 over two advisories for 16.0.0–16.4.0, GHSA-2464-fhr4-w9xw (critical: remote
  code execution in image optimisation with SVG) and GHSA-p3m5-59mp-jv5r (high: denial of service
  through Server Actions), confirmed against the npm advisory database. 16.4.2 was published on
  2026-10-15, past the 3-day release age. Only `next` and `@next/*` moved in either lockfile. No
  published package depends on Next.
- **`pnpm gate`** resolves commit names (`HEAD`, `main~1`) in the repository it runs in; it used to
  read them in its reused worktree, which named that worktree's own commits.
- **`nz gen`**: a tier `own` component may name an `engine`, checked as an engine-tier seam without
  `parts` (`COMPONENT-JSON.md`, a new `gen.test.ts` case).
- Two internal glyphs, `circle-check` (Lucide's own) and `info` (also Feather-derived), with their
  notices in `THIRD_PARTY_NOTICES`.
- The docs site shows an example as source only when it calls `toast(` (it needs a client component of
  the app), and a component route imports its examples only when one is live (D-bt).
- The visual harness crops the toast stack as it crops an open popup.

## Figma mapping

| Part   | Figma (file BIzJFf1wm8KP0YG2AVI1tP, read only)                   | Mapping                                                                                                                                                                                     |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toast  | Toast set `7275:15071` (Tone = Success, Critical, Neutral)       | `tone` `success` / `critical` / `neutral`; 12 / 12 / 12 / 16 padding, 12 gap, `radius/lg`, Elevation/3, Label/M message, Label/M Strong action in `text/inverse-accent`, the close at 16 px |
| Banner | Banner set `7275:15120` (Tone = Promo, Warning); ghost `756:913` | `tone` `brand` / `warning`; 16 / 24 padding, 20 gap, `radius/xl`, Heading/H4 over Body/M, the render at 72 px, the warning glyph at 24                                                      |

## Deviations from Figma and the plan (kept on purpose)

- **Toast height:** 56 px, not Figma's 44: the action is a real `sm` Button and the close an `sm`
  IconButton, each a 32 px target with hover and focus (§12.6 planned this as a design ask).
- **Toast tone icon:** 20 px (`size/icon-md`); Figma draws 18, which has no token.
- **Toast tone icon colours** resolve in the toast's inverse scheme: `icon/success` on the dark toast
  is the dark theme's green/300, not Figma's green/500 (figma/07 §7 measured that pairing failing in
  dark mode).
- **Toast exit:** a toast leaves at once; it enters with a fade and Figma's 4 px rise (`@starting-style`),
  only the fade under Reduced motion.
- **No "peek"** (§12.6: collapse the stack to one pill when focus lands under it): scroll-padding
  already keeps a focused control above the stack; the peek is left for a later week (D-bp).
- **Banner tone name:** `brand` for Figma's "Promo" (Q25, D-bq).
- **Banner dismiss:** a 40 px IconButton with a 20 px glyph (Figma: a bare 18 px icon).
- **Banner layout below about 36rem:** the action wraps under the text and the dismiss stays at the
  row's end; Figma draws only the desktop row.

## Sizes

gzip, size-limit, React Aria inside, all locales (`packages/react/SIZES.md`):

| Entry                                        |     Measured |                                                Limit |
| -------------------------------------------- | -----------: | ---------------------------------------------------: |
| `@nizivo/react/toast`                        |     14,754 B | 16 KiB (new: measured + 10 %; §17.2's ceiling 20 KB) |
| own code: `toast/toaster.client`             |      2,007 B |                                              2.2 KiB |
| own code: `_engines/react-aria/toast.client` |        325 B |                                              0.4 KiB |
| `css/toast.css`                              |        891 B |                                                1 KiB |
| `@nizivo/react/banner`                       |      1,314 B |                                              1.5 KiB |
| own code: `banner/banner-dismiss.client`     |        395 B |                                              0.5 KiB |
| `css/banner.css`                             |        658 B |                                              0.8 KiB |
| **the root barrel `@nizivo/react`**          | **99,901 B** |                        **107 KiB (93 → 107 by M44)** |

The barrel grew 93,203 → 99,598 B with Toast (React Aria's toast and landmark hooks and their
strings in 36 locales, the store, the Toaster) and 99,901 B with Banner. M44 raised its limit to
measured + 10 % of the Toast build. Toast is not in the dashboard set, which stays at 85 KiB.

## Lanes (the maintainer's Mac)

All 14 release lanes on the final tree (`node packages/tooling/release/lanes.ts`):

| Lane                                                                   | Result                                                                                              |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| browser (Chromium)                                                     | 269 passed                                                                                          |
| browser-firefox                                                        | 241 passed, 28 skipped                                                                              |
| overlay-chromium                                                       | 189 passed, 10 skipped (199; week 13: 190)                                                          |
| overlay-webkit                                                         | 181 passed, 18 skipped                                                                              |
| overlay-firefox                                                        | 181 passed, 18 skipped                                                                              |
| charts (Chromium, WebKit, Firefox)                                     | 96 passed each                                                                                      |
| fixture-charts, fixture-next (four modes), fixture-vite, fixture-astro | pass                                                                                                |
| visual (react)                                                         | no differences (1,984 shots with Toast and Banner)                                                  |
| visual-charts                                                          | failed once on the known `area-chart/rtl` flake (forced-dark this time); two reruns: no differences |

WebKit's browser lane, run by hand: the 7 known macOS Tab-order failures, nothing else.

- Overlay conformance: `test/overlay/toast.spec.tsx`, 9 cases (the region and toast semantics, the
  announcer, F8 / Tab / Escape, actions and `limit`, O-06, O-07, O-13, O-14), pass in Chromium,
  WebKit and Firefox.
- Browser lane: `test/browser/banner.spec.tsx`, 4 cases (hydration, dismiss, Figma's row, wrapping,
  media), pass in all three.
- Node: `test/unit/toast-store.test.ts`, 7 cases (timeouts, the persist rule, pause reasons, no clock
  without a Toaster, in-place updates and `onClose`, what is spoken, `announce()`).
- Visual: 48 Toast and 28 Banner baselines; no existing baseline moved.

## Known flake (new)

- `toast/stack--focus-8-toast-action--*` and `stack--focus-9-toast-close--*`: about one run in four,
  30 pixels on the rounded corners of the two upper toasts differ by more than ±2 in one mode. The
  rendering does not change: the corners' anti-aliasing in the top layer varies between runs. Not
  re-recorded; listed in CLAUDE.md's known flakes.

## Not built (left for later)

- O-15 (Activity hide and show on React 19.2 and 19.3) needs the React 19.2 / 19.3 matrix, which is
  not built yet; it is part of the v0.2 exit.
- The toast "peek" (above), swipe to dismiss, a promise ("loading") toast, Info and Warning tones
  (component-inventory lists them as asks), and the outlet into a consumer's native modal `<dialog>`
  (gated by O-08 at v1.0).
- The Banner on the Next fixture's `/dashboard` (the 08 overview's row); the rest of 08 (PageHeader,
  Recent orders, Goals) is still ahead.

## For the maintainer

**Items 1 to 3 are answered by M45** (2026-10-23, ARCHITECTURE.md §23.3): (1) the design asks go to Dayitava as figma-handoff §1.6, and the code stays as built until then; (2) the flake stays listed, and the lane does not tolerate it; (3) the React 19.2 / 19.3 matrix and O-15 come next, before the shell.

1. **Design asks for Dayitava:** the Toast at 56 px with real buttons (Figma 44); Info and Warning
   toast tones; the Banner's narrow layout and its tone name (Q25: `brand` for "Promo"); a Toast
   enter and exit spec (the code fades and rises in, and leaves at once).
2. **The new Toast flake** above: keep it listed, or should the lane tolerate corner pixels?
3. **O-15** waits for the React 19.2 / 19.3 matrix; build that matrix next, or the shell first?
