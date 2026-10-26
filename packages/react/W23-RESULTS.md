# Week 23 results (v0.3 week 1: QuantityStepper, NumberField, Combobox)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 23 status", §23.3 M65 and M66, §23.4 D-cv to
D-cx). The first three of v0.3's new components, in the order M65 set. None has a Figma component,
so each is built on the existing tokens (Input's box, Select's popup and rows) as a builder default,
for Dayitava to review from the renders. Every number below comes from a command run on the
maintainer's Mac.

## What was built

- **QuantityStepper (D-cv).** A native number input for whole quantities in Input's box, between a
  minus and a plus button. Tab reaches only the input and its arrow keys step it; the buttons are
  for the pointer, stay out of the tab order, keep focus where it was, fire the native `input` and
  `change` events and are disabled at the ends of the range. Changeset: `.changeset/quantity-stepper.md`.
- **NumberField (D-cw).** A number in the reader's locale, a price, a percent or a unit, on React
  Aria's NumberField: formatted on the server, parsed on commit, clamped and snapped; a hidden input
  carries the plain number. Optional step buttons, named by React Aria with the field's label
  ("Increase Price"). Changeset: `.changeset/number-field.md`.
- **Combobox (D-cx).** A text input that suggests items as the reader types, on React Aria's
  ComboBox, in the overlay family. Input's box around the input and an optional Trigger; Select's
  popup and rows. Filtering, the active item under a focused input, Enter, Escape, custom values,
  forms. It passes the family's overlay conformance suite and the Activity case on React 19.3 and
  19.2. Changeset: `.changeset/combobox.md`.
- **The overlay conformance suite** gained a `ring` slot (the element that draws a trigger's focus
  ring, when it is not the trigger: Combobox's box), and a pressed trigger may keep focus.
- **Docs:** three pages; the Strings guide lists the new engine-owned strings; the Static or
  interactive guide's table has 70 components.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`). New entries start at measured + 10 %.

| Entry                                 |    Before |     After | Limit                  |
| ------------------------------------- | --------: | --------: | ---------------------- |
| `@nizivo/react` (root barrel)         | 111,063 B | 133,103 B | 143 KiB (was 120, M66) |
| `styles.css`                          |  23,949 B |  24,705 B | 26 KiB                 |
| `css/base.css`                        |   1,250 B |   1,289 B | 1.4 KiB                |
| `./quantity-stepper`                  |         — |   2,678 B | 2.9 KiB                |
| own: `quantity-stepper.client`        |         — |   1,303 B | 1.4 KiB                |
| `./number-field`                      |         — |  28,926 B | 32 KiB                 |
| own: `number-field.client`            |         — |     957 B | 1.1 KiB                |
| own: `_engines/…/number-field.client` |         — |     712 B | 0.8 KiB                |
| `./combobox`                          |         — |  66,814 B | 72 KiB                 |
| own: `combobox.client`                |         — |   1,159 B | 1.3 KiB                |
| own: `_engines/…/combobox.client`     |         — |   1,614 B | 1.7 KiB                |
| `css/quantity-stepper.css`            |         — |     535 B | 0.6 KiB                |
| `css/number-field.css`                |         — |     491 B | 0.6 KiB                |
| `css/combobox.css`                    |         — |   1,047 B | 1.2 KiB                |

NumberField added 10.4 KB to the root barrel and Combobox 10.8 KB, each inside §17's +11 KB. The
barrel passed its 120 KiB limit with Combobox and reset to measured + 10 % (M66). QuantityStepper's
own leaf is 1,303 B, over §17's ≤ 1 KB target for an input leaf (PasswordInput's is 1,116 B).
`@nizivo/charts/styles.css` is 3,783 B against 3.7 KiB, 5 B under its limit (the 0.2.1 axis fix).

## Lanes (the maintainer's Mac)

All 25 release lanes on the week's code. On the first run two failed and were fixed in the commits:
`overlay-react-19.2` (Combobox's Activity case: React 19.2 shows a portal under a hidden Activity,
so the list now remounts its popup when hidden, as the family's other popups do) and the
non-blocking `react-hooks` lane (a click handler built in render). The six affected lanes then all
passed. Visual regression: react 3,488 shots (3,343 identical, 145 within the tolerance), with the 260
new baselines; charts 164 (160 and 4). No existing baseline moved.

- QuantityStepper's browser spec: 10 of 10 in Chromium, Firefox and WebKit.
- NumberField's browser spec: 7 of 7 in each engine, de-DE parsing included.
- Combobox's overlay spec: 20 in Chromium, 19 in Firefox and WebKit (the forced-colours case is
  Chromium-only); the Activity case in all three.
- The docs smoke: 129 pages, axe clean in light and in dark at 375 px.

## For the maintainer

1. **For Dayitava:** the three components have no Figma component. Their renders (light, dark,
   forced colours, at rest, hovered, pressed, focused, and Combobox open) are the 260 new baselines;
   a review page like the dark one can collect the verdicts.
2. **Found, not fixed:** Select's trigger carries React Aria's description and error slot ids in
   `aria-describedby`, which point at nothing (NumberField and Combobox drop them). A patch can do
   the same for Select.
3. **Next (M65's order):** Accordion, BulkActionBar and PageIndicator; the hooks Tooltip adapter
   becomes the default from 2026-11-06 if both adapters are still green.

## Unverified

- Screen readers: Combobox's announcements (the count of options, the active option) are React
  Aria's and were not heard with a screen reader; the accessibility tree was checked in the specs.
- Touch: the step buttons and the Combobox Trigger were pressed with a mouse in the specs, not on a
  touch screen.
