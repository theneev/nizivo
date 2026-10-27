---
'@nizivo/react': minor
---

`@nizivo/react/hotkeys`: keyboard shortcuts in one page-wide registry (`registerHotkey`, `useHotkey`,
`useHotkeys`), written as Kbd takes them (`"mod+k"`) and matched by tinykeys. Never during an IME
composition, not while typing unless `allowInInputs`, and a single printable key warns in
development (WCAG 2.1.4).
