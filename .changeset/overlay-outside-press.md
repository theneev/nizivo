---
'@nizivo/react': patch
---

A Select, Menu or Dialog opened inside a Dialog now closes on a press outside it, as Escape already closed it; since 0.1.0 such a press did nothing. Presses inside the toast region and on a tooltip still dismiss nothing, and an alertdialog still never closes on an outside press.
