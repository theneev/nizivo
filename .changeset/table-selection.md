---
'@nizivo/react': minor
---

Add row selection to `Table` (`@nizivo/react/table`): `Table.SelectRow` and `Table.SelectAll` are native checkboxes rendered on the server, so a bulk action's form receives the selected ids before any JavaScript runs, and a checked row shows `bg/brand-subtle`. `Table.Selection`, the table's one client part, adds the select-all box's checked and mixed state, Shift-click ranges, Escape to clear and `onSelectionChange`. Add `Table.Container`'s `label`, which makes a wide table a named, focusable scroll region.
