---
'@nizivo/react': patch
---

Select's trigger no longer names ids that are not on the page in its server HTML, which is what a
page shows before hydration and without JavaScript. Outside a Field, or in a Field with no
description or error, its `aria-describedby` named React Aria's own description and error ids,
which Nizivo never renders; it now carries only the Field's ids and the trigger's own
`aria-describedby`. With an `aria-label` and an `id` of its own (a Field's, or one passed to
`Select.Trigger`), its `aria-labelledby` named React Aria's generated id for the trigger, and now
names the trigger's real id.
