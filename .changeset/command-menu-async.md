---
'@nizivo/react': minor
---

The unstable CommandMenu takes results from a server, caps its groups and says how many rows show.
`filter="none"` on `CommandMenu.Popup` shows every item as given, `query`, `defaultQuery` and
`onQueryChange` make the search text yours to fetch with, and `loading` on `CommandMenu.List` marks
the list busy and shows "Searching…" while it has no rows. `limit` on `CommandMenu.Group` shows at
most that many of its matching rows, and the arrow keys skip the rest; a group with no matching row
is left out with its heading. Once the typing stops, a polite live region says "Results: {count}"
or "No results". Two strings join `enUS.commandMenu`: `loading` and `results`.
