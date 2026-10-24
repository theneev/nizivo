# Week 22 results (v0.2 week 13, the answers to week 21)

Recorded on 2026-10-24 (ARCHITECTURE.md §21.2 "Week 22 status", §23.3 M55 to M58, §23.4 D-cr to
D-ct). The maintainer's answers to week 21's questions: global labels, the German-browser test, and
the charts at phone widths. Built by three builders in parallel on separate worktrees and integrated
here. Every number below comes from a command run on the maintainer's Mac.

## What was built

- **Global labels (M55, M58; D-cr).** `NizivoConfig` takes `labels`, typed `NizivoLabels` (the `enUS`
  catalogue's shape, so the two cannot drift). Every client part that renders a built-in string reads
  it: AlertDismiss, BannerDismiss, ChipGroup, `Dialog.Close`, `Drawer.Close`, FileUpload, Form,
  MobileTabBarMore, PasswordInput, `Popover.Close`, SearchField, SubmitButton and the Toaster. A
  part's own `labels` wins key by key; no provider means English. Server parts keep per-instance
  `labels`, and the Strings guide gives the wrap-once file for them. Changeset:
  `.changeset/global-labels.md`.
- **The German-browser test (M56; D-cs).** Every one of the 143 examples is rendered on the server
  and hydrated in a page whose browser language is de-DE; no text or name changes, nothing logs, and
  no German number, date or React Aria string appears anywhere in the page. Mutation checks: a
  NumberValue formatting with the browser's locale failed 9 examples; a missing `I18nProvider` failed
  6 open overlays. No component needed a fix.
- **Charts at phone widths (D-ct).** AreaChart and BarChart keep a readable plot and show every
  other x label when narrow; DonutChart stacks its legend under the ring, wraps names without
  overlap, steps its centre total down and hides the island's card when stacked (the centre and the
  legend still show the active slice; for the accessibility owner).

## Sizes

gzip, size-limit (`packages/react/SIZES.md`). No new entries.

| Entry                        |   Before |    After | Limit                  |
| ---------------------------- | -------: | -------: | ---------------------- |
| own: `alert-dismiss.client`  |    394 B |    423 B | 0.5 KiB (was 0.4, M58) |
| own: `submit-button.client`  |    180 B |    228 B | 0.3 KiB (was 0.2, M58) |
| own: `config.client`         |    197 B |    249 B | 0.3 KiB                |
| own: `banner-dismiss.client` |    395 B |    424 B | 0.5 KiB                |
| `./config`                   |    165 B |    175 B | 0.2 KiB                |
| `./dialog`                   | 32,627 B | 32,654 B | 32 KiB                 |
| `./form`                     |  2,750 B |  2,852 B | 3 KiB                  |
| `./toast`                    | 14,846 B | 14,911 B | 16 KiB                 |
| `@nizivo/charts/styles.css`  |  3,506 B |  3,740 B | 3.7 KiB                |

`./dialog` has 114 B left under its 32 KiB plan cap, and `@nizivo/charts/styles.css` 48 B under its
limit; the next change to either needs room. Every other client part that reads the provider grew by
20 to 110 B, inside its limit.

**Aggregates at this push (M50, M51):** `styles.css` 23,949 B and `css/base.css` 1,250 B are
unchanged; the root barrel is 111,063 B (+151 B), and measured + 10 % is still 120 KiB. Only the two
M58 limits moved.

## Lanes (the maintainer's Mac)

All 25 release lanes on the integrated code before M58: 24 passed, and overlay-firefox failed once on
the known Tooltip "enters through data-entering" case (CLAUDE.md), then passed alone. Visual
regression: react 3,228 shots (3,082 identical, 146 within the tolerance), charts 164 (160 and 4):
the 28 new narrow-width charts baselines, no existing baseline moved. After M58, the browser and
overlay lanes ran again: all passed except the same Firefox Tooltip case once, which passed alone.
That case failed in two of the four overlay-firefox runs this week, and passed every time it ran alone.

- The German-browser spec: Chromium and Firefox pass (145 de-DE cases each), and WebKit passes them
  too (its browser lane shows only the 10 known Tab-order failures).
- The global-labels specs pass 9 of 9 in Chromium, Firefox and WebKit.
- The charts specs pass 117 of 117 in each engine; `fixture-charts` passes in all three.

## For the maintainer

1. **v0.2 code is complete.** Before you publish 0.2.0: the Figma drift check (your Figma token), the
   dark sign-off (Dayitava), and the hooks Tooltip adapter as the default (from about 2026-11-06).
2. **For Dayitava:** the stacked DonutChart (under about 24rem wide) hides the hover and focus card
   (D-ct). Showing one there needs a small change to the chart's interaction island.
3. **Not fixed, found this week:** BarChart's last band label hangs past the chart's end edge by half
   its width at every width ("Oct 30" is clipped in a narrow box), and ar-EG y-axis labels are wider
   than the 2.75rem gutter.

## Unverified

- Screen readers with the stacked DonutChart (the centre and legend changes are announced as before
  in the browser's accessibility tree; no screen reader was run).
- The German-browser spec covers the examples, not apps: a consumer's own code can still format with
  the browser's locale.
