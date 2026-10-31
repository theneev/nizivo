---
'@nizivo/react': patch
---

`Table.Container` is now the containing block of what sits in it, so a visually hidden header (a
`.nz-visually-hidden` span) in a column past the screen's edge scrolls with the table instead of
widening the whole page. On a phone the page no longer zooms out to fit a wide table (GitHub #1).
Nothing visible changes; an app that carried `.nz-table-container { position: relative }` as an
override can drop it.
