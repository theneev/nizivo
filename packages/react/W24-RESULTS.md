# Week 24 results (v0.3 week 2: Accordion, PageIndicator, BulkActionBar)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 24 status", §8.3 rule 2, §23.4 D-cy to
D-da). The next three of v0.3's new components, in the order M65 set, all server parts with no
client JavaScript of their own. None has a Figma component (PageIndicator follows Figma's media
pager frames), so each is built on the existing tokens for Dayitava to review from the renders.
Every number below comes from a command run on the maintainer's Mac.

## What was built

- **Accordion (D-cy).** Native `<details>` items with a `<summary>` trigger and a chevron, opening
  and closing with no script; `Accordion.Root name` makes them exclusive through `<details name>`.
  The stylelint vocabulary rule and the emitted-CSS check now allow `[open]` on Accordion's item
  alone (§8.3 rule 2 names the exception). Changeset: `.changeset/accordion.md`.
- **PageIndicator (D-cz).** A carousel's position as dots (the current one longer and in the brand
  colour) or a "2 / 9" chip; `tone="media"` over photos on the M57 stand-in colours. The visual is
  `aria-hidden` and a visually hidden "2 of 9" says the position. Changeset:
  `.changeset/page-indicator.md`.
- **BulkActionBar (D-da).** The bar over a selectable table: the count, then the actions. A server
  part of its own subpath; TableSelection's island writes its count ("2 selected", announced
  politely); `defaultCount` lets the server write the same count, so hydration changes nothing. Table selection's example now uses it. Changeset: `.changeset/bulk-action-bar.md`.
- **Docs:** three pages, the Strings guide's server parts, and 73 components in the Static or
  interactive guide.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`). New entries start at measured + 10 %.

| Entry                         |    Before |     After | Limit   |
| ----------------------------- | --------: | --------: | ------- |
| `@nizivo/react` (root barrel) | 133,103 B | 133,974 B | 143 KiB |
| `styles.css`                  |  24,705 B |  25,233 B | 26 KiB  |
| `css/base.css`                |   1,289 B |   1,296 B | 1.4 KiB |
| `./accordion`                 |         — |   1,312 B | 1.5 KiB |
| `./page-indicator`            |         — |   1,147 B | 1.3 KiB |
| `./bulk-action-bar`           |         — |     941 B | 1 KiB   |
| `./table-selection`           |   1,744 B |   1,859 B | 1.9 KiB |
| own: `table-selection.client` |     783 B |     896 B | 0.9 KiB |
| `./locales/en-US`             |     693 B |     736 B | 0.8 KiB |
| `css/accordion.css`           |         — |     589 B | 0.7 KiB |
| `css/page-indicator.css`      |         — |     564 B | 0.7 KiB |
| `css/bulk-action-bar.css`     |         — |     400 B | 0.5 KiB |

No limit moved. BulkActionBar is its own subpath because inside `./table-selection` it took that
subpath to 2,121 B (1.9 KiB limit) and its stylesheet to 416 B (0.2 KiB). The island has 25 B left under its limit, and §17.2's "≤ 2 KB for table selection with BulkActionBar" target is not met (1,859 B + 941 B). `styles.css` has 1.4 KB left under 26 KiB; `./dialog` is 107 B under its 32 KiB
plan cap.

## Lanes (the maintainer's Mac)

All 25 release lanes on the week's code. On the first run the four browser lanes (Chromium, Firefox, React 19.2, the hooks Tooltip adapter) failed one case each: the German-browser spec (D-cs) saw table selection's example change its text on hydration, the island writing "1 selected" over the hidden template. `defaultCount` fixed it (the server writes the same count); the four lanes then passed. Visual regression: react 3,576 shots (3,433 identical, 143 within the tolerance), with 88 new baselines and table-selection's 14 re-recorded; charts 164 (160 and 4).

- Accordion's browser spec: 4 of 4 in Chromium, Firefox and WebKit; table selection's 7 of 7 in
  each, the bar's count included.
- The docs smoke: 132 pages, axe clean in light and in dark at 375 px.

## For the maintainer

1. **§8.3 rule 2's exception (D-cy).** `[open]` is now allowed in CSS on Accordion's item, a native
   `<details>` no engine renders; everywhere else it still fails. Say if you would rather the item
   ship a client script that mirrors `data-open`.
2. **For Dayitava:** the renders of the six new components (weeks 1 and 2) are in the visual
   baselines; week 1's review page has the first three.
3. **Sizes with little room:** the table-selection island (25 B), `./dialog` (107 B under its plan cap).
   The next change to either needs a limit decision.

## Unverified

- Screen readers: the BulkActionBar count's announcement and the visually hidden page position
  were checked in the accessibility tree, not heard.
- Firefox 129 at the floor (exclusive accordions are not grouped there); the floor lane did not run
  Accordion's behaviour.
