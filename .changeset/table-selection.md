---
'@nizivo/react': minor
---

Add `@nizivo/react/table-selection`, row selection for `Table`: `TableSelectRow` and `TableSelectAll` are native checkboxes rendered on the server, so a bulk action's form receives the selected ids before any JavaScript runs, and a checked row shows `bg/brand-subtle`. `TableSelection`, its one client part, adds the select-all box's checked and mixed state, Shift-click ranges, Escape to clear and `onSelectionChange`. A page that imports only `@nizivo/react/table` loads no client module. Add `Table.Container`'s `label`, which makes a wide table a named, focusable scroll region.
