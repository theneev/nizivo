---
'@nizivo/react': minor
---

Labels sit in the middle of their box. In Chromium, Geist's letters sat about 0.055em above the
middle of every centred control (0.77 px at 14 px). Labels now take
`text-box: trim-both cap alphabetic` with `padding-block: calc((1lh - 1cap) / 2)` inside
`@supports (text-box: …)`: each box keeps its height and only the letters move (Chromium 133+,
Safari 18.2+; other browsers are unchanged). Badge, Kbd, Breadcrumb, Pagination's pages,
AvatarGroup's overflow, Table's sort button and RankedList's action now wrap their text in a new
slot (`badge-label`, `kbd-label`, `breadcrumb-text`, `pagination-page-text`,
`avatar-group-more-text`, `table-sort-text`, `ranked-list-action-text`); CSS that targets these
parts' text as a direct child of the part needs the new span. The unstable AiBadge, SuggestionChip,
Tag, ToolCallCard, InlineAssist, Comment, Citation and LivePulse do the same. ToolCallCard's steps
sit 6 px under its header and its actions 16 px under the steps, and a BentoTile narrower than
360 px keeps its caption 16 px in and padded 16.
