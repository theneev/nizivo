# Week 27 results (v0.3 week 5: the unstable DateRangePicker)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 27 status", §16.3, §23.3 M71, §23.4 D-dg).
It follows Figma's Date Range Picker 746:267 (`docs/figma/15-v03-weeks-3-6.md`). Every number below
comes from a command run on the maintainer's Mac.

## What was built

- **DateRangePicker (D-dg)**, `@nizivo/react/unstable/date-range-picker`, the first component under
  `src/unstable/`. A trigger in Select's look with a calendar glyph opens the Popover with Figma's
  three areas: the presets (Today, Yesterday, Last 7 days, Last 30 days, This quarter, Year to
  date), one month of React Aria's RangeCalendar and a footer with the chosen range, Cancel and
  Apply. Nothing applies until Apply; Cancel, Escape and an outside press keep the old range.
  Values are ISO plain dates, "today" counts in the required `timeZone`, and the form gets the ISO
  interval `start/end`. Changeset: `.changeset/date-range-picker.md`.
- **Why unstable:** design has not drawn the unavailable day or a comparison period; Figma does
  answer two of §16.3's questions (Apply and Cancel; one month).
- **Strings:** 11 in the en-US catalogue (`dateRangePicker`); `./locales/en-US` 0.8 → 1 KiB (M71).
- **Dependencies:** `@internationalized/date` (React Aria's own version) is now a direct dependency;
  only the engine adapter imports it.
- **Tooling for `unstable/`:** the docs catalog, example generator, routes, API loader and smoke;
  the visual lane (unstable folders, open shots for a component that composes the Popover, and
  `Date` fixed at 8 October 2026, Figma's today, while the picker's examples are mounted); the
  built-styles test leaves unstable sheets out of `styles.css` as `styles.ts` does; the five app
  fixtures' lockfiles take the new dependency.
- **Docs:** the DateRangePicker page; 77 rows in the Static or interactive guide.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`). New entries start at measured + 10 %.

| Entry                               |  Before |    After | Limit                |
| ----------------------------------- | ------: | -------: | -------------------- |
| `./unstable/date-range-picker`      |       — | 62,501 B | 68 KiB               |
| own: `date-range-picker.client`     |       — |  2,372 B | 2.5 KiB              |
| own: `_engines/…/date-range-picker` |       — |    762 B | 0.9 KiB              |
| `css/date-range-picker.css`         |       — |  1,214 B | 1.3 KiB              |
| `./locales/en-US`                   |   739 B |    873 B | 1 KiB (was 0.8, M71) |
| `css/base.css`                      | 1,307 B |  1,333 B | 1.4 KiB              |

The subpath includes the Popover (36,054 B) and React Aria's calendar; the plan's lazy calendar (a
24 KB chunk, §16.3) waits until the picker leaves `unstable/` (M71). The unstable sheet is not in
`styles.css`.

## Lanes (the maintainer's Mac)

All 25 release lanes on the week's code. The first run failed six: the five app fixtures, whose
frozen lockfiles did not have the packed package's new `@internationalized/date` (refreshed offline,
one line each), and the react visual lane, where a page-wide Playwright clock pinned for the picker's
today made Toast's stack and Combobox's hover shots unsteady (three clean runs without it); the
date is now fixed only while the picker's examples are mounted. The rerun passed every lane.
Visual regression: react 3,740 shots (3,585 identical, 155 within the tolerance), with the 92 new
baselines; charts 204 (196 and 8). No existing baseline moved.

- The picker's browser spec: 7 of 7 in Chromium, Firefox and WebKit.
- The docs smoke: 138 pages, axe clean in light and in dark at 375 px.

## For the maintainer

1. **Lazy calendar (M71):** shipped eager; the lazy chunk is the first job before the picker
   leaves `unstable/`.
2. **For Dayitava:** the open renders are the new baselines (`date-range-picker/*--open-*`). Two
   differences from Figma: the weekday names follow the locale (en-US starts on Sunday and reads
   "Sun"; Figma draws "Mo … Su"), and the today dot is not drawn in forced colours.
3. **Design:** the unavailable day and a comparison period are still to be drawn.

## Unverified

- Screen readers: React Aria's calendar announcements were not heard.
- The narrow layout (presets as a row under 30rem) is not in a visual baseline; the lane's page is
  wide enough for Figma's side-by-side layout.
- Touch: the days were pressed with a mouse and the keyboard only.
