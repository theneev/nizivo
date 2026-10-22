---
'@nizivo/react': minor
---

Toast (`./toast`): `toast(message, options)` shows a short message bottom-centre, `tone` neutral, success or critical, with an optional `description` and one `action`; `toast.dismiss(id?)` removes one or all. Render one `<Toaster />` in the root layout. A toast with an action, or a critical one, stays until dismissed; any other leaves after 5 s, its time stopped while the pointer or focus is on the stack and while the page is hidden. Each toast is spoken once through the Toaster's announcer (assertive when critical), and `announce(message, politeness)` speaks through it too. The stack is in the top layer above every overlay and stays reachable over a modal Dialog: F8 moves focus to it and back, Escape dismisses the focused toast, and its height keeps focused controls from scrolling under it (`--nz-toast-inset`).
