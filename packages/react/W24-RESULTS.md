# Week 24 results (v0.3 week 2: Accordion, PageIndicator, BulkActionBar)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 24 status", §8.3 rule 2, §23.4 D-cy to
D-da). The next three of v0.3's new components, in the order M65 set, all server parts with no
client JavaScript of their own, built on the existing tokens for Dayitava to review from the
renders. Accordion has a Figma component, Accordion Item 7370:88, which the first build missed; it
now follows it ("Figma cross-check" below). PageIndicator follows Figma's media pager frames.
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

## Figma cross-check (2026-10-27)

The maintainer asked for every page of the Figma file to be checked for the six new components.
All 22 Nizivo pages were read again (read-only):

| Component       | In Figma                                                              | Now                                                                                                                                                                                  |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QuantityStepper | Number Stepper 7367:377 (02 Actions & Forms)                          | Follows it (D-cv): 40 x 40 buttons, Label/M, 136 px at md, "Decrease quantity" / "Increase quantity"                                                                                 |
| Accordion       | Accordion Item 7370:88 (11 Data Display)                              | Follows it (D-cy): 52 px trigger, no inline padding, no top line, no hover fill                                                                                                      |
| Combobox        | No component; Select Menu 7356:406 and Select Option 7356:401         | Already follows them (M36), in Input's box                                                                                                                                           |
| NumberField     | None                                                                  | Its step buttons take the Number Stepper's shape (the maintainer, 2026-10-27)                                                                                                        |
| PageIndicator   | Only the storefront's Pager frames 7275:20313, 7275:20962, 7275:21014 | Unchanged, with D-cz's deltas: a longer current dot, border/strong for the others (Figma: border/default, 1.2:1), the bg/code chip over media (Figma: white at 80 %, 1.08:1 in dark) |
| BulkActionBar   | None (Table Row 7371:89 has the Selected state it sits over)          | Unchanged                                                                                                                                                                            |

Figma's Accordion Item description asks for a `<button>` in a heading and a `duration/base` height
animation; the build keeps `<summary>` and no animation (D-cy), as the maintainer confirmed on 2026-10-27 ("keep
details"). 148 baselines re-recorded, and 32 of NumberField's for its step buttons (the two
components' examples in four modes); the two browser specs pass in Chromium, Firefox and WebKit
(QuantityStepper's padding-press case now presses the box's border, as the box has no padding).

Sizes after: `css/quantity-stepper.css` 611 B (0.6 KiB limit, 3 B left), `css/accordion.css` 530 B,
`./locales/en-US` 739 B, own `quantity-stepper.client` 1,307 B, `styles.css` 25,274 B. No limit moved.

## Unverified

- Screen readers: the BulkActionBar count's announcement and the visually hidden page position
  were checked in the accessibility tree, not heard.
- Firefox 129 at the floor (exclusive accordions are not grouped there); the floor lane did not run
  Accordion's behaviour.
