---
'@nizivo/react': patch
---

Menu, Select, Popover, Tooltip, Dialog and Drawer close when a hidden `<Activity>` hides them, as Next's `cacheComponents` hides a route: `onOpenChange(false, { reason: 'hidden' })` fires, an uncontrolled overlay closes itself, and it is closed when the route is shown again. Before, the page could stay scroll-locked and the overlay reopened on return; on React 19.2 the popup also stayed on screen. A Toaster inside a hidden route hides its stack until the route is back.
