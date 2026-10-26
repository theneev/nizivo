---
'@nizivo/react': minor
---

BulkActionBar (`@nizivo/react/bulk-action-bar`): the bar over a selectable table, with how many rows
are selected and the actions. A server part: inside TableSelection, its island writes the count ("2
selected", announced politely) as the selection changes, and the actions work before hydration
through the rows' form. `labels.selected` (catalogue key `bulkActionBar`) and `locale` set the
count.
