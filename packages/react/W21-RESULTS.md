# Week 21 results (v0.2 week 12, the last)

Recorded on 2026-10-24 (ARCHITECTURE.md §21.2 "Week 21 status", §23.4 D-cn to D-cq). The patterns,
the locale catalogue and the chart-draw specimen. The patterns workspace was set up first; then four
builders worked in parallel on separate worktrees (commerce, storefront, the dashboard templates,
strings and chart draw), and their work was integrated here. Every number below comes from a command
run on the maintainer's Mac.

## What was built

### Patterns (D-cn, D-co)

`patterns/` is now the private workspace package `@nizivo/patterns`, MIT. Each pattern is a folder
of `patterns/src/` with its example and, where it needs layout of its own, a stylesheet in
`@layer nz.patterns` (`nzp-*` classes). The docs have a Patterns section with one page per pattern.

| From Figma                  | Patterns                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 05 Commerce (10)            | Order summary, Product card, Variant picker, Product table, Order table, Discount card, Payment method, Shipment tracker, Plan card, Customer card |
| 10 Instagram Storefront (5) | Collection circles, Shoppable post (with the Post Badge), Product tag, Tagged product, Storefront bar                                              |
| 08 Overview Dashboard (8)   | The Products, Product detail, Orders (the order in a Drawer), Customers, Discounts, Analytics, Plan and billing, and Onboarding pages              |

Twelve of the 23 pages ship Nizivo client code (each page's table row in the Patterns index names it, and
the docs smoke holds each page to that list); the other eleven ship none.

Not built, with the reason: the storefront's shader hero (`@nizivo/lab`, after 1.0) and its
HotspotEditor (a heavy client editor); the Analytics funnel and heatmap (no component); a copy
button for discount codes (no CopyButton); card-brand logos (`@nizivo/icons` has only Instagram);
a Steps component (the shipment tracker is an `<ol>` in its own stylesheet); a bulk-action bar
(Figma draws none). Each page's Notes say where the pattern differs from Figma and why.

### Strings (D-cp)

- `@nizivo/react/i18n`: `formatLabel(template, values, locale)` with CLDR plural objects
  (`PluralLabel`); `values.count` selects the category.
- `@nizivo/react/locales/en-US`: `enUS`, every built-in string by component, 24 keys: alertDismiss,
  appShell, avatarGroup, bannerDismiss, breadcrumb, button, chipGroup, dialog, drawer, fileUpload,
  form, kpiTile, metric, mobileTabBar, mobileTabBarMore, pagination, passwordInput, popover,
  rankedList, searchField, sidebar, tableSelection, toaster, trendCard.
- AvatarGroup's `more` and `overflow` take a plural object as well as a string (the only labels with
  a `{count}`); the English defaults are unchanged. Changeset: `.changeset/locales.md`.
- Tests: `formatLabel` in en-US, pl and ar; the drift test (every `@default` and every fallback in
  code equals the catalogue, and every Labels type has an entry); the plural lint over every catalogue.
- Docs: the guide "Strings and locales", and a utility page for each new entry.

### Chart draw (D-cq)

`packages/charts/test/browser/chart-draw.spec.tsx`: AreaChart's reveal, BarChart's grow and
DonutChart's settle run 700 ms on `--nz-duration-chart-draw` with `easing/standard`, and under Reduced
motion (the media query or `data-nz-motion="reduce"`) run 0 s with the first frame equal to the drawn
end state. 12 of 12 in Chromium, Firefox and WebKit. The motion page has a Chart draw section.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`); new entries at measured + 10 %:

| Entry                    | Measured |   Limit |
| ------------------------ | -------: | ------: |
| `./i18n`                 |    208 B | 0.3 KiB |
| `./locales/en-US`        |    664 B | 0.8 KiB |
| `./avatar` (was 1,381 B) |  1,472 B | 1.5 KiB |

`./avatar` grew by `formatLabel`; 64 B of headroom is left under its limit, which did not move.

**Aggregates at this push (M50, M51):** `styles.css` 23,949 B and `css/base.css` 1,250 B are
unchanged (26 KiB and 1.4 KiB stay); the root barrel `@nizivo/react` 110,912 B (+90 B,
`formatLabel` through AvatarGroup), measured + 10 % is still 120 KiB. No limit moved.

## Lanes (the maintainer's Mac)

All 25 release lanes on the integrated code (`node packages/tooling/release/lanes.ts`) passed on the
first run, with no flake: the browser lanes, the overlay lanes in three engines, React 19.2 and the
hooks Tooltip adapter, the charts lanes in three engines and the charts-only fixture, the Next, Vite,
Vite SSR, React Router and Astro fixtures, the React Compiler rules (non-blocking), and visual
regression: react 3,228 shots (3,082 identical, 146 within the tolerance), charts 136 (132 and 4).
No baseline moved; the patterns are not in the visual lane (D-cn).

- **Docs smoke** on the integrated tree: 123 pages, axe clean in light and dark, every page reflows at
  375 px, and each pattern page loads only the client modules it lists.
- **Firefox and WebKit** (Playwright, the built docs): every pattern page loads with no console error
  and no sideways scroll; the plan card's Monthly/Yearly switch, the product tag's Popover and the
  orders page's Drawer open, and Escape returns focus to the control, in both. WebKit logged only
  Next's own prefetches cut short by the next navigation.
- **AvatarGroup** in WebKit: 7 passed, 1 skipped (the browser lanes run it in Chromium and Firefox).

## For the maintainer

1. **v0.2 code is complete.** Left before you publish 0.2.0: the Figma drift check (it needs your
   Figma token), the dark sign-off (Dayitava), and the hooks Tooltip adapter as the default (from
   about 2026-11-06, a decision: it needs `react-stately` in `dependencies`).
2. **A global `NizivoConfig.labels` route** is not built: today an app wraps a part once to pass its
   own strings. Build it, or keep per-instance labels?
3. **The §16.4 locale-determinism test** (a de-DE browser, no text change after hydration) does not
   exist yet. Build it in v0.3?
4. **Text on photos** (design): the storefront patterns use `bg/code` with `text/on-dark`, the only
   pair that stays dark and white in both modes, until design adds an on-media token family
   (figma/10 §8.3).
5. **Charts at 390 px**, found by the templates and also on the charts' own pages: DonutChart's legend
   names and values overlap below about 390 px, and AreaChart's x-axis labels collide. Not fixed this
   week.

## Unverified

- Screen readers on the patterns (the hidden status words of the tracker, the payment cards' spoken
  expiry, the collection circles' "new picks").
- The patterns' pages in forced colours and on real iOS.
