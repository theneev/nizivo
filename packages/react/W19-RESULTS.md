# Week 19 results (v0.2 week 10, the forms set)

Recorded on 2026-10-23 (ARCHITECTURE.md §21.2 "Week 19 status", §23.3 M49 to M51, §23.4 D-cg to
D-cj). The maintainer asked to complete v0.2 and to be told what is blocked; they answered the
shell's design questions themselves (M49), so only the dark sign-off, the drift check's Figma token,
the hooks Tooltip adapter's two green weeks and the release stay outside code. Three builders worked
in parallel on separate worktrees; their work was integrated, checked in all three engines, sized
and gated here. Every number below comes from a command run on the maintainer's Mac.

## What was built

| Part                            | Subpath            | Kind   | Notes                                                                                                                        |
| ------------------------------- | ------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Split                           | `./split`          | server | `Split.Root` / `Main` / `Aside`: a 360 or 232 px aside that stacks below 60 % of the row, with no breakpoint (D-cj)          |
| StickyBar                       | `./sticky-bar`     | server | Summary and actions stuck to the viewport's bottom, above the safe area and the shell's bottom inset (D-cj)                  |
| Form, SubmitButton, FormMessage | `./form`           | split  | Errors by Field name into FieldScope, focus on the first invalid control or an error summary, `useFormStatus` pending (D-ch) |
| PasswordInput                   | `./password-input` | client | An `aria-pressed` toggle under a constant label; back to `type="password"` on submit (D-ch)                                  |
| FileUpload                      | `./file-upload`    | client | A native file input with a drop target on the DOM's drag events, behind `FileUploadEngine`; the app owns uploading (D-cg)    |
| NavItem                         | `./nav-item`       | server | The sidebar link: `aria-current`, `icon`, `count`, the collapsed rail from the future Sidebar's `data-collapsed` (D-ci)      |
| SearchField                     | `./search-field`   | client | `<search>` + `type="search"`, zero-JS filtering in `<form method="get">`, a clear button, Escape clears (D-ci)               |
| ChipGroup                       | `./chip-group`     | client | Native radios or checkboxes, a swatch slot, unavailable chips with a strike (D-ci)                                           |
| ChoiceCardGroup, ChoiceCard     | `./choice-card`    | client | Real radios in cards, invalid through the Field (D-ci)                                                                       |

Vocabulary: `data-aside` (Split) and `data-drag-over` (FileUpload). Internal glyphs `eye`, `eye-off`
and `search` (THIRD_PARTY_NOTICES lists twelve Lucide glyphs). The static-or-interactive guide's
table now lists all 62 components (36 server, 6 split, 20 client).

## Corrections during integration

- **FileUpload's drop target.** As built on React Aria's `useDrop` it measured 27,659 B and added
  21.5 KB to the root barrel: `useDrop` brings React Aria's drag-and-drop strings for every locale.
  Rewritten on the DOM's drag events behind the same engine contract: 5,608 B (D-cg).
- **WebKit and Firefox.** The builders ran Chromium only. In WebKit, a click does not focus a button
  and Tab skips buttons and radios: the Form, PasswordInput and FileUpload specs now press Tab and
  focus by script there, or submit from the keyboard. In Firefox, a click at a rounded corner falls
  outside the box, and heights differ in the fifth decimal: fixed in the specs. ChipGroup (2) and
  ChoiceCard (1) join CLAUDE.md's known WebKit Tab-order list, as SegmentedControl's cases did.
- **StickyBar's examples** draw the main action as a primary Button, and shared actions keep their
  labels on one line.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`); new entries at measured + 10 %:

| Entry                                              | Measured |   Limit |
| -------------------------------------------------- | -------: | ------: |
| `./split`                                          |    880 B |   1 KiB |
| `./sticky-bar`                                     |    799 B | 0.9 KiB |
| `./form`                                           |  2,750 B |   3 KiB |
| `./password-input`                                 |  2,580 B | 2.8 KiB |
| `./file-upload`                                    |  5,608 B | 6.1 KiB |
| `./nav-item`                                       |  1,221 B | 1.4 KiB |
| `./search-field`                                   |  3,333 B | 3.6 KiB |
| `./chip-group`                                     |  2,508 B | 2.7 KiB |
| `./choice-card`                                    |  2,289 B | 2.5 KiB |
| own: `field/field-scope.client` (the Form channel) |  1,523 B | 1.6 KiB |

**Aggregates, reset to measured + 10 % at this push (M50, M51):** `styles.css` 22,523 B → 25 KiB
(was 19); `css/base.css` 1,210 B → 1.3 KiB (was 1.1); the root barrel `@nizivo/react` 108,901 B →
117 KiB (was 107). No other existing limit moved.

## Lanes (the maintainer's Mac)

All 25 release lanes on the final code (`node packages/tooling/release/lanes.ts`): every one passed
except `visual-charts`, which failed once on the known `area-chart/rtl` dark flake and passed on the
rerun. The react visual lane has 776 new baselines (the nine components' examples, four modes) and
no existing baseline moved. The new browser specs pass in Chromium, WebKit (except the three known
Tab-order cases) and Firefox.

## For the maintainer

1. **The shell** (W20) is next, on M49's answers: AppShell, Sidebar, TopBar (with SearchField),
   MobileTopBar, MobileTabBar and the "More" sheet (Drawer `side="bottom"`).
2. **Edge's own password reveal button** may show beside PasswordInput's toggle: the
   `::-ms-reveal` rule that hides it fails the browser-floor CSS check. Say if you want an exception.
3. **Design asks** for Dayitava: figma-handoff §1.8.

## Unverified

- Screen readers: the Form error summary (focusing it while it holds `role="alert"` may announce
  twice) and PasswordInput's pressed state.
- Real OS drag and drop for FileUpload (scripted DataTransfer in the specs), and real Safari.
- `Form`'s `validateOn` is not inherited by Fields (not built).
