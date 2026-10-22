---
'@nizivo/react': minor
---

Popover (`./popover`) and Drawer (`./drawer`), client parts on React Aria in the overlay family. Popover is a dialog anchored to its trigger (`side`, `align`, `sideOffset`; Title, Description and a default close IconButton in the corner); Escape or a press outside closes it and focus returns to the trigger. Drawer is a modal panel at an edge, `side="start" | "end" | "bottom"` (the bottom sheet), with Header, Title, Description, Body (the only scroller), Footer and a default close IconButton; it locks page scroll, keeps focus inside, returns it on close (`returnFocus`, as Dialog's), and only fades under reduced motion. Both nest with Dialog, Select, Menu and Tooltip: an overlay opened inside one paints above it, and Escape and an outside press close only the topmost.
