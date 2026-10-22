---
'@nizivo/react': patch
---

A Menu or Select opened with the pointer inside a Dialog, while focus was on another control of that Dialog, now returns focus to its own trigger when it closes, on Escape or on a press outside it. Before, focus went to the control that had it before the press, and after an outside press to the Dialog's first control.
