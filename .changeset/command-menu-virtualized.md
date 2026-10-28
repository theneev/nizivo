---
'@nizivo/react': minor
---

The unstable CommandMenu renders long lists in part: `virtualized` on `CommandMenu.List` keeps only
the rows in view in the page, in a fixed 20rem box, while the arrow keys, the search and the spoken
count still cover every row; the virtualizer loads in a chunk of its own, only for a virtualized
list. A row with `href` now renders an `<a>`, as React Aria's MenuItem expects (it warned in
development), so it opens in a new tab like any link; in forced colours its text takes the system's
link colour, as Menu's link rows do.
