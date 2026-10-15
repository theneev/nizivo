---
'@nizivo/icons': minor
'@nizivo/react': minor
'@nizivo/tokens': minor
---

0.1.0: foundations, forms and core overlays, the first release.

- `@nizivo/tokens`: `tokens.css` with `light-dark()` themes, the accessibility overrides and the contrast gate; `custom-media.css`, the Tailwind theme and `contract.json`; `tokens.json` (every token's literal value per theme and mode) and the typed `var()` references of the `.` entry.
- `@nizivo/react`: Button and the server-safe text, layout, display and feedback components; the Field system and the native form controls (Input, Textarea, NativeSelect, Checkbox, RadioGroup, Switch), SegmentedControl and IconButton; ThemeScript, which restores the saved theme (`localStorage` `nz-theme`) and sets `data-nz-platform` before first paint; Select, Dialog, Tooltip, Menu and Tabs on React Aria (a bare `Dialog.Close` is an IconButton, so Dialog's stylesheets include `css/icon-button.css`), and the server-safe TabNav. One stylesheet per component, compiled by Lightning CSS, with the generated accessibility floor in `base.css`, or everything in one import through `@nizivo/react/styles.css` (tokens included).
- `@nizivo/icons`: every Lucide icon at the Nizivo stroke plus the Instagram brand glyph, one server-safe module per icon.
