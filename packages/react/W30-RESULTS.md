# Week 30 results (v0.3 week 8: the Base UI canary, first run)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 30 status", §9.4, §23.3 M65, §23.4 D-dk). In
progress: the canary runs and its findings are recorded; nothing is decided from them yet. Every
number below comes from a command run on the maintainer's Mac.

## What was built

- **A second overlay family** in `src/_engines/base-ui/`: Dialog and Select on Base UI 1.9.0, the
  same `DialogEngine` and `SelectEngine` the React Aria adapters implement, and the family's own
  OverlayEngine. Base UI is an exact devDependency of `@nizivo/react`; the folder is never built or
  shipped (`gen/adapter.ts`), and only `_engines/**` may import it (oxlint, the module-graph test).
- **`NZ_ADAPTER=base-ui`** swaps Dialog and Select together (`test/adapters.ts`). The overlay config
  then runs the dialog, select, select-field and nesting specs; nesting.spec skips its three cases
  that would mix families (a Tooltip or a Menu beside them).
- **Lane `overlay-base-ui-chromium`** (27 release lanes), non-blocking.
- **Harness, both families:** the functional `data-*` allowlist is the running family's, and the
  scroll-lock check accepts `<html>` or `<body>`. The default overlay lane still passes all 231 cases.

## First run

78 cases: **48 pass, 25 fail, 5 skip** (Chromium).

| Area                              | Result                                   | Cause                                                                                                                                                                                      |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dialog spec                       | 29 of 30 pass (1 skip, as on React Aria) | after three adapter fixes: Base UI's functional `data-base-ui-*` markers allowlisted, its `<body>` scroll lock, and the popup focused (not the first tabbable) when nothing in the body is |
| Nesting O-11                      | pass                                     |                                                                                                                                                                                            |
| Nesting O-01, Tab out, O-04, O-10 | fail                                     | O-01, Tab out and O-10 follow the Select's popup lifetime below; O-04 (Dialog on Dialog) is a nesting difference not yet analysed                                                          |
| Select and select-field           | 21 fail                                  | see below                                                                                                                                                                                  |

The Select's failures come from four differences:

1. **A closed popup stays in the DOM.** After its first open, Base UI keeps the Select's popup
   mounted and hidden (`hidden`, `opacity: 0`); the contract says a closed popup is gone, and most
   open/close cases check that.
2. **No native `<select>`.** Base UI's form control is a hidden `<input>`; the Field and form cases
   (required, name, reset, submit) read a native `<select>`.
3. **The trigger is `role="combobox"`** (React Aria's is a button with `aria-haspopup="listbox"`),
   so the naming and label-click cases differ.
4. **The raw value until the items mount.** Base UI's `Select.Value` shows labels only for items it
   has seen, or from an `items` prop; before the first open the trigger shows `a`, not "Alpha".

Also seen: Base UI reports a press or keyboard focus on neither trigger, so `data-pressed` and
`data-focus-visible` are never set on them (the CSS rings use `:focus-visible` and still show).
Base UI does report why a popup opened or closed, so `details.reason` is real on this family
(React Aria's is `'unknown'`).

## For the maintainer

1. **Each Select difference is a choice:** loosen the contract (a closed popup may stay mounted
   while hidden; the form control may be any hidden control), or complete the adapter (unmount on
   close through Base UI's `actionsRef.unmount`, label map from `items`). The plan's purpose for the
   canary (R4) is to surface exactly this; nothing is changed yet.
2. **Blocking or not:** the lane is non-blocking. Make it blocking once its failures are resolved
   or listed as expected.
3. **Next for the canary:** O-04, then the Select's popup lifetime.

## Unverified

- WebKit and Firefox: the canary runs in Chromium only.
- Base UI's own announcements with a screen reader.
