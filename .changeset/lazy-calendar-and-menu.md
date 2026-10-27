---
'@nizivo/react': patch
---

DateRangePicker and CommandMenu (both unstable) load their React Aria parts on the first open, in a
chunk of their own: a page ships the picker's trigger and presets without the calendar (the
`./unstable/date-range-picker` entry drops from 61 to 37 KB gzip), and the menu's trigger and Dialog
without the search (`./unstable/command-menu` from 57 to 34 KB). A placeholder holds each part's
place while it loads, and on a first open with no presets the calendar takes focus when it arrives.
