# Week 35 results (after 0.3.0: the lazy chunks)

Recorded on 2026-10-28 (ARCHITECTURE.md §21.3 "Week 35 status", §16.3, §23.3 M71, M72, M75, M76,
§23.4 D-dm). Every number below comes from a command run on the maintainer's Mac.

## What was built

- **The DateRangePicker's calendar and the CommandMenu's search load on the first open** (D-dm).
  Each leaf imports its `engine.ts` with `import()` behind `React.lazy` and `Suspense`; the built
  `dist/` keeps the `import()`, so the app's bundler makes the chunk. A placeholder holds the part's
  place while it loads. Changeset: `.changeset/lazy-calendar-and-menu.md` (patch).
- **Focus on a first open:** with no presets, the Popover chose its first focus before the calendar
  existed and landed in the footer; the calendar now takes it when it arrives, so a keyboard user
  starts in the calendar as before. The visual lane caught this (the empty picker's `open-key` shot).
- **Size tooling:** entries leave `import()` targets out; each lazy chunk is its own entry.
- **The docs:** the component pages no longer link into the Figma library (M76). Dayitava approved
  the v0.3 components (M75).

## Sizes

gzip, size-limit (`packages/react/SIZES.md`). Existing limits unchanged; new entries at measured + 10 %.

| Entry                              |   Before |    After | Limit               |
| ---------------------------------- | -------: | -------: | ------------------- |
| `./unstable/date-range-picker`     | 62,501 B | 38,410 B | 68 KiB (unchanged)  |
| lazy: the DateRangePicker calendar |        — | 39,816 B | 43 KiB (new)        |
| own: `date-range-picker.client`    |  2,372 B |  2,552 B | 2.5 KiB (8 B spare) |
| `./unstable/command-menu`          | 58,773 B | 35,184 B | 64 KiB (unchanged)  |
| lazy: the CommandMenu search       |        — | 44,989 B | 49 KiB (new)        |
| own: `command-menu.client`         |  1,526 B |  1,609 B | 1.7 KiB             |

A lazy chunk is measured with everything it imports, so it counts code the entry already loaded
(the Popover's, the Dialog's); what a first open downloads is less.

## Checks

- The DateRangePicker and CommandMenu browser specs: 16 of 16 in Chromium, Firefox and WebKit (the
  first-open reads now wait for the chunk).
- The picker's and the menu's visual shots: no baseline moved, after the focus fix.
- The docs smoke: 142 pages; no page loads React Aria's RangeCalendar at page load, the picker's
  included.

## For the maintainer

1. **Own-code headroom:** the picker's leaf has 8 B left under its 2.5 KiB limit.
2. **The live docs** still show the Figma links until the next `pnpm docs:deploy --deploy`.
3. **The Figma name in the prose:** 76 docs pages still say "Figma" and give node ids in plain
   text (no link, no file key). Say whether those go too.
