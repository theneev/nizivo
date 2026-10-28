# @nizivo/tokens

## 0.4.0

### Minor Changes

- 9981305: **Breaking (`tokens.json` and its types):** `tokens.json` is format 2. The provenance `figma` is now
  `design` (`TokenProvenance` is `'design' | 'code-owned' | 'override' | 'proposal'`), and each
  token's `figma` field (`name`, `variableId`, `styleId`) is now `design`, with `name` only. Code that
  compares `provenance` with `'figma'` or reads `token.figma` changes to `'design'` and
  `token.design.name`. The CSS variables, the `.` entry's references and every value are unchanged.

## 0.3.0

No changes in this release.

## 0.2.1

### Patch Changes

- 79d72f3: Dark mode is no longer a preview. Design reviewed the rendered dark versions of Figma pages 02, 04,
  06 and 07 and approved them, so the dark values follow the same compatibility rules as light. No
  token value changes.

## 0.2.0

### Minor Changes

- 001e1b4: BREAKING: `--nz-text-accent` is removed, as its deprecation said, together with `textAccent` in the `.` entry, `color.text.accent` in `tokens.json` and `contract.json`, and `--color-nz-text-accent` in `tailwind.css`. Use `--nz-text-brand` for accent-coloured text on page surfaces and `--nz-text-inverse-accent` on `bg/inverse`. No Nizivo component reads it.

### Patch Changes

- a5b048a: Text and Heading `tone="accent"` now paint `--nz-text-brand`, Figma's `text/brand`: the same green/700 in Light, and green/300 (#79b993) instead of lime/300 in Dark. `--nz-text-accent` is deprecated because Figma will not add `text/accent` (accent text on `bg/inverse` uses `--nz-text-inverse-accent`), and it is removed in 0.2.0.

## 0.1.0

### Minor Changes

- 044c0b6: 0.1.0: foundations, forms and core overlays, the first release.

  - `@nizivo/tokens`: `tokens.css` with `light-dark()` themes, the accessibility overrides and the contrast gate; `custom-media.css`, the Tailwind theme and `contract.json`; `tokens.json` (every token's literal value per theme and mode) and the typed `var()` references of the `.` entry.
  - `@nizivo/react`: Button and the server-safe text, layout, display and feedback components; the Field system and the native form controls (Input, Textarea, NativeSelect, Checkbox, RadioGroup, Switch), SegmentedControl and IconButton; ThemeScript, which restores the saved theme (`localStorage` `nz-theme`) and sets `data-nz-platform` before first paint; Select, Dialog, Tooltip, Menu and Tabs on React Aria (a bare `Dialog.Close` is an IconButton, so Dialog's stylesheets include `css/icon-button.css`; a bare `Dialog.Trigger` or `Tooltip.Trigger` is at least 24 x 24 px; `Tabs.Root` takes `dir` for a strip whose direction differs from its locale's), and the server-safe TabNav. Input, Textarea, NativeSelect and the Select trigger use 16 px text under a coarse pointer, so iOS Safari does not zoom into them. One stylesheet per component, compiled by Lightning CSS, with the generated accessibility floor in `base.css`, or everything in one import through `@nizivo/react/styles.css` (tokens included).
  - `@nizivo/icons`: every Lucide icon at the Nizivo stroke plus the Instagram brand glyph, one server-safe module per icon.
